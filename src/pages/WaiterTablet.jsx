import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { useTable } from "../context/TableContext";
import { useApp } from "../context/AppContext";
import { WaiterOrderCard } from "../components/WaiterOrderCard";
import { WaiterOrders } from "./WaiterOrders";
import { WaiterMap } from "./WaiterMap";
import { WaiterReservations } from "./WaiterReservations";
import { WaiterIstoric } from "./WaiterIstoric";

export function WaiterTablet({
  restaurant,
  restaurantId: restaurantIdProp,
  onBack,
  waiterName,
  waiterId,
}) {
  const { tableStates, markPaid, freeTable, reload } = useTable();
  const { dispatch, showToast } = useApp();
  const [tab, setTab] = useState("orders");
  const [deleteModal, setDeleteModal] = useState(false); // false | "confirm" | "password"
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMapFloor, setActiveMapFloor] = useState(0);
  const [displayReservations, setDisplayReservations] = useState([]);
  // Cheie de refresh: cand creste, reincarca rezervarile (dupa adaugare telefonica)
  const [reservationsRefreshKey, setReservationsRefreshKey] = useState(0);
  const [suggestionModal, setSuggestionModal] = useState(null);
  const [waiterCalls, setWaiterCalls] = useState([]);

  const restaurantId = restaurantIdProp || restaurant?.id;
  const [mapZoom, setMapZoom] = useState(60);
  const [cancellingOrders, setCancellingOrders] = useState({}); // { orderId: { items: [...], note: "" } }
  const [dbFloors, setDbFloors] = useState([]);
  const [mapDate, setMapDate] = useState(() => {
    // Folosim data locala (Romania) nu UTC
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [mapTime, setMapTime] = useState("");
  const [mapReservedTables, setMapReservedTables] = useState([]);
  const [mapHistorySessions, setMapHistorySessions] = useState([]); // { table_label, status }
  const [restProgram, setRestProgram] = useState({});

  // ── Încarcă floors + program din Supabase pentru harta mese ──
  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("program")
      .eq("id", restaurantId)
      .single()
      .then(({ data }) => setRestProgram(data?.program || {}));
    const loadFloors = async () => {
      const { data: floorsData } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("floor_order");
      if (!floorsData || floorsData.length === 0) return;
      const floorsWithData = await Promise.all(
        floorsData.map(async (fl) => {
          const { data: tables } = await supabase
            .from("tables")
            .select("*")
            .eq("floor_id", fl.id);
          const { data: elements } = await supabase
            .from("floor_elements")
            .select("*")
            .eq("floor_id", fl.id);
          return { ...fl, tables: tables || [], elements: elements || [] };
        }),
      );
      setDbFloors(floorsWithData);
    };
    loadFloors();
  }, [restaurantId]);
  const [istoricDate, setIstoricDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [istoricOrders, setIstoricOrders] = useState([]);
  const [istoricLoading, setIstoricLoading] = useState(false);

  // ── Încarcă rezervările + sesiunile istorice pentru harta mese ──
  useEffect(() => {
    if (!restaurantId || !mapDate) return;
    const loadMapData = async () => {
      // Daca nu e selectata o ora, gasim cel mai apropiat slot
      const now = new Date();
      const ch = now.getHours();
      const cm = now.getMinutes();
      let filterHour, filterMin;
      if (cm < 30) {
        filterHour = ch;
        filterMin = 0;
      } else {
        filterHour = ch;
        filterMin = 30;
      }
      const currentSlot = `${String(filterHour).padStart(2, "0")}:${String(filterMin).padStart(2, "0")}`;
      const filterTime = mapTime || currentSlot;

      // Query 1: Rezervari — ora exacta selectata
      const { data: rezData } = await supabase
        .from("reservations")
        .select("table_label")
        .eq("restaurant_id", restaurantId)
        .eq("date", mapDate)
        .eq("time", filterTime)
        .in("status", ["pending", "confirmed"]);
      setMapReservedTables(
        (rezData || []).map((r) => r.table_label).filter(Boolean),
      );

      // Query 2: Sesiuni istorice via RPC - timezone Romania gestionat in Postgres
      const { data: sessData } = await supabase.rpc("get_sessions_at_time", {
        p_restaurant_id: restaurantId,
        p_date: mapDate,
        p_time: filterTime,
      });
      if (sessData)
        setMapHistorySessions(sessData.filter((s) => s.table_label));
    };
    loadMapData();
  }, [restaurantId, mapDate, mapTime]);

  // ── Încarcă comenzile din Supabase ──
  const loadOrders = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      // Comenzile pending (nerevendicate) + comenzile proprii
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "cooking", "ready", "paying"])
        .or(`waiter_id.is.null,waiter_id.eq.${waiterId}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {}
    setLoading(false);
  };

  // ── Încarcă istoricul comenzilor ──
  const loadIstoric = async (date) => {
    if (!restaurantId || !waiterId) return;
    setIstoricLoading(true);
    try {
      // Calculam offset-ul local dinamic (Romania: +02:00 iarna, +03:00 vara)
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      const tz = `${sign}${hh}:${mm}`;
      const startOfDay = `${date}T00:00:00${tz}`;
      const endOfDay = `${date}T23:59:59${tz}`;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("waiter_id", waiterId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setIstoricOrders(data || []);
    } catch (err) {}
    setIstoricLoading(false);
  };

  useEffect(() => {
    if (tab === "istoric") loadIstoric(istoricDate);
  }, [tab, istoricDate, restaurantId]);

  // ── Încarcă rezervările din Supabase ──
  useEffect(() => {
    if (!restaurantId) return;
    const loadReservations = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (data) {
        // Incarcam ratingul clientului din profiles
        const userIds = [
          ...new Set(data.filter((r) => r.user_id).map((r) => r.user_id)),
        ];
        let ratingsMap = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, rating, no_shows, total_visits")
            .in("id", userIds);
          (profiles || []).forEach((p) => {
            ratingsMap[p.id] = p;
          });
        }
        setDisplayReservations(
          data.map((r) => ({
            ...r,
            clientRating: ratingsMap[r.user_id]?.rating ?? 5.0,
            clientNoShows: ratingsMap[r.user_id]?.no_shows ?? 0,
            clientVisits: ratingsMap[r.user_id]?.total_visits ?? 0,
          })),
        );
      }
    };
    loadReservations();

    // Polling la fiecare 10 secunde pentru rezervări noi
    const interval = setInterval(loadReservations, 10000);
    return () => clearInterval(interval);
  }, [restaurantId, reservationsRefreshKey]);

  // ── Realtime — ascultă comenzi noi ──
  useEffect(() => {
    loadOrders();
    if (!restaurantId) return;

    const channel = supabase
      .channel(`orders_${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Afisam doar comenzile nerevendicate (waiter_id null)
            if (
              payload.new.waiter_id === null ||
              payload.new.waiter_id === waiterId
            ) {
              setOrders((prev) => {
                const exists = prev.find((o) => o.id === payload.new.id);
                if (exists) return prev;
                return [...prev, payload.new];
              });
              showToast("🆕 Comandă nouă!");
            }
          }
          if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev
                .map((o) => (o.id === payload.new.id ? payload.new : o))
                .filter(
                  (o) =>
                    ["pending", "cooking", "ready", "paying"].includes(
                      o.status,
                    ) &&
                    (o.waiter_id === null || o.waiter_id === waiterId),
                ),
            );
          }
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${waiterId}`,
        },
        (payload) => {
          if (payload.new?.type === "waiter_call") {
            const msg = payload.new.message || "🔔 Masă cheamă ospătarul";
            setWaiterCalls((prev) => [
              ...prev,
              { id: payload.new.id, message: msg },
            ]);
            showToast(`🔔 ${msg}`);
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  // ── Acceptă comanda ──
  // Inițializează anularea pentru o comandă
  const initCancellation = (order) => {
    setCancellingOrders((prev) => ({
      ...prev,
      [order.id]: { items: [...(order.items || [])], note: "" },
    }));
  };

  // Anulează un produs din comandă
  const cancelItem = (orderId, itemName, itemQty) => {
    setCancellingOrders((prev) => {
      const current = prev[orderId];
      if (!current) return prev;
      // Găsim și eliminăm primul item cu același name+qty
      let removed = false;
      const newItems = current.items.filter((item) => {
        if (!removed && item.name === itemName && item.qty === itemQty) {
          removed = true;
          return false;
        }
        return true;
      });
      return { ...prev, [orderId]: { ...current, items: newItems } };
    });
  };

  // Confirmă comanda cu produsele rămase
  const acceptOrderWithItems = async (orderId, originalOrder) => {
    const cancelling = cancellingOrders[orderId];
    if (!cancelling) return acceptOrder(orderId);

    const remainingItems = cancelling.items;
    const cancelledItems = (originalOrder.items || []).filter(
      (item, i) =>
        !remainingItems.find((r) => r.name === item.name && r.qty === item.qty),
    );
    const newTotal = remainingItems.reduce(
      (s, i) => s + (i.price || 0) * (i.qty || 1),
      0,
    );

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cooking",
          items: remainingItems.map((i) => ({ ...i, is_new: false })),
          total: newTotal,
          cancelled_items: cancelledItems,
          cancellation_notes: cancelling.note || null,
          waiter_id: waiterId || null,
          waiter_name: waiterName || null,
          has_new_items: false,
        })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "cooking",
                items: remainingItems,
                total: newTotal,
              }
            : o,
        ),
      );
      setCancellingOrders((prev) => {
        const n = { ...prev };
        delete n[orderId];
        return n;
      });

      // Notificare client dacă s-au anulat produse
      if (cancelledItems.length > 0 && originalOrder.user_id) {
        const cancelledNames = cancelledItems.map((i) => i.name).join(", ");
        const message = cancelling.note
          ? `${cancelledNames} nu ${cancelledItems.length === 1 ? "a putut fi adăugat" : "au putut fi adăugate"}. Motiv: ${cancelling.note}`
          : `${cancelledNames} nu ${cancelledItems.length === 1 ? "a putut fi adăugat" : "au putut fi adăugate"} la comandă.`;
        await supabase.from("notifications").insert({
          user_id: originalOrder.user_id,
          restaurant_id: restaurantId,
          type: "item_cancelled",
          message,
          is_read: false,
        });
      }

      showToast("✅ Comanda acceptată!");
    } catch (err) {
      showToast("❌ Eroare la acceptare.");
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cooking",
          waiter_id: waiterId || null,
          waiter_name: waiterName || null,
          accepted_at: new Date().toISOString(),
          has_new_items: false,
          items: (orders.find((o) => o.id === orderId)?.items || []).map(
            (i) => ({ ...i, is_new: false }),
          ),
        })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "cooking",
                has_new_items: false,
                waiter_name: waiterName,
                items: (o.items || []).map((i) => ({ ...i, is_new: false })),
              }
            : o,
        ),
      );

      // Notificare client
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: Date.now(),
          type: "order_accepted",
          message: "Comanda ta a fost preluată!",
          details: `Ospătarul ${waiterName || "nostru"} se ocupă de comanda ta.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });
      showToast("✅ Comandă acceptată!");
    } catch (err) {
      showToast("❌ Eroare la acceptare.");
    }
  };

  // ── Marchează gata ──
  const markReady = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "ready",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "ready" } : o)),
      );

      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: Date.now(),
          type: "order_ready",
          message: "Comanda ta este gata! 🍽️",
          details: "Ospătarul vine cu comanda la masa ta.",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });
      showToast("🍽️ Comandă gata!");
    } catch (err) {
      showToast("❌ Eroare.");
    }
  };

  // ── Închide comandă ──
  const closeOrder = async (orderId) => {
    try {
      await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      showToast("❌ Eroare.");
    }
  };

  // ── Confirmă plata ──
  // Confirmă plata pentru toate comenzile din sesiunea mesei
  const confirmPayment = async (groupedOrder) => {
    try {
      const orderIds = groupedOrder._orderIds || [groupedOrder.id];
      const tableLabel = groupedOrder.table_label;
      const sessionId = groupedOrder.table_session_id;

      // Marchează TOATE comenzile sesiunii ca plătite
      const { error } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("id", orderIds);
      if (error) throw error;

      setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));

      // Eliberează masa după table_session_id (cel mai precis)
      if (sessionId) {
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("table_session_id", sessionId);
        await freeTable(tableLabel);
      } else if (tableLabel) {
        await freeTable(tableLabel);
      }

      showToast("💳 Plată confirmată! Masa eliberată.");
    } catch (err) {
      showToast("❌ Eroare la confirmare plată.");
    }
  };

  const confirmReservation = async (resId) => {
    try {
      const reservation = displayReservations.find((r) => r.id === resId);
      const { error } = await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", resId);
      if (error) throw error;
      setDisplayReservations((prev) =>
        prev.map((r) => (r.id === resId ? { ...r, status: "confirmed" } : r)),
      );

      // Marchează masa ca rezervată (galben) în table_sessions
      if (reservation?.table_label && restaurantId) {
        // Închide sesiuni existente pe masa asta
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", reservation.table_label)
          .in("status", ["occupied", "paid", "reserved"]);
        // Inserează sesiune nouă ca rezervată
        await supabase.from("table_sessions").insert({
          restaurant_id: restaurantId,
          table_label: reservation.table_label,
          status: "reserved",
          started_at: new Date().toISOString(),
        });
      }

      // Notificare client
      if (reservation?.user_id) {
        // Formatam data frumos in romana: "2026-06-21" -> "sâmbătă, 21 iun."
        const ZILE = [
          "duminică",
          "luni",
          "marți",
          "miercuri",
          "joi",
          "vineri",
          "sâmbătă",
        ];
        const LUNI = [
          "ian.",
          "feb.",
          "mar.",
          "apr.",
          "mai",
          "iun.",
          "iul.",
          "aug.",
          "sep.",
          "oct.",
          "noi.",
          "dec.",
        ];
        let dataText = reservation.date || "";
        if (reservation.date) {
          const d = new Date(reservation.date + "T00:00:00");
          if (!isNaN(d)) {
            dataText = `${ZILE[d.getDay()]}, ${d.getDate()} ${LUNI[d.getMonth()]}`;
          }
        }
        const oraText = (reservation.time || "").slice(0, 5); // "19:00:00" -> "19:00"
        const restName = restaurant?.name || "restaurant";
        const persText = reservation.persons
          ? ` · ${reservation.persons} ${reservation.persons === 1 ? "persoană" : "persoane"}`
          : "";
        const message = `Rezervarea ta la ${restName} a fost confirmată pentru ${dataText}${oraText ? `, ora ${oraText}` : ""}${persText}.`;

        await supabase.from("notifications").insert({
          user_id: reservation.user_id,
          restaurant_id: restaurantId,
          type: "reservation_confirmed",
          message,
          is_read: false,
        });
      }
      reload(); // Actualizează instant culoarea mesei
      showToast("✅ Rezervare confirmată! Masa marcată ca rezervată.");
    } catch (err) {
      showToast("❌ Eroare la confirmare.");
    }
  };

  const refuseReservation = (resId) => {
    // Deschide modalul de sugestie în loc să refuze direct
    setSuggestionModal({ reservationId: resId, text: "" });
  };

  const sendRefusalWithSuggestion = async (resId, suggestionText) => {
    try {
      const reservation = displayReservations.find((r) => r.id === resId);
      const { error } = await supabase
        .from("reservations")
        .update({
          status: "rejected",
          suggestion: suggestionText || null,
        })
        .eq("id", resId);
      if (error) throw error;
      setDisplayReservations((prev) => prev.filter((r) => r.id !== resId));
      setSuggestionModal(null);
      // Notificare client
      if (reservation?.user_id) {
        // Verificam daca refuzul e din cauza istoricului de prezenta
        const isRatingRefusal = reservation?.clientRating < 3;
        const message = isRatingRefusal
          ? "Rezervarea ta a fost refuzată din cauza istoricului de prezență. Dacă doriți să rezervați cu adevărat, vă rugăm să contactați restaurantul și după aceea mai rezervați încă o dată în aplicație."
          : suggestionText
            ? `Rezervarea ta a fost refuzată. Sugestie: ${suggestionText}`
            : "Rezervarea ta a fost refuzată.";
        await supabase.from("notifications").insert({
          user_id: reservation.user_id,
          restaurant_id: restaurantId,
          type: "reservation_rejected",
          message,
          is_read: false,
        });
      }
      showToast("❌ Rezervare refuzată.");
    } catch (err) {
      showToast("❌ Eroare.");
    }
  };

  // No-show: verifica rezervarile confirmate care au trecut de 30 min
  const [noShowModal, setNoShowModal] = useState(null);
  const checkedNoShows = useRef(new Set());

  useEffect(() => {
    const checkNoShows = () => {
      const now = new Date();
      const confirmed = displayReservations.filter(
        (r) => r.status === "confirmed",
      );
      for (const res of confirmed) {
        if (!res.user_id || !res.date || !res.time) continue;
        if (checkedNoShows.current.has(res.id)) continue;
        const resDateTime = new Date(`${res.date}T${res.time}:00`);
        const diffMin = (now - resDateTime) / 60000;
        if (diffMin >= 15 && diffMin < 120) {
          checkedNoShows.current.add(res.id);
          setNoShowModal(res);
          break;
        }
      }
    };
    const interval = setInterval(checkNoShows, 60000);
    checkNoShows();
    return () => clearInterval(interval);
  }, [displayReservations]);

  const markNoShow = async (res) => {
    try {
      // 1. Scade ratingul clientului
      const { error: e1 } = await supabase.rpc("decrement_client_rating", {
        user_id_input: res.user_id,
      });
      if (e1) {
        console.error("decrement_client_rating:", e1);
      }

      // 2. Marcheaza rezervarea ca no_show
      const { error: e2 } = await supabase
        .from("reservations")
        .update({ status: "no_show" })
        .eq("id", res.id);
      if (e2) {
        console.error("reservations update:", e2);
      }

      // 3. Elibereaza masa din table_sessions
      if (res.table_label && restaurantId) {
        const { error: e3 } = await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", res.table_label)
          .eq("status", "reserved");
        if (e3) {
          console.error("table_sessions update:", e3);
        }
      }

      // 4. Notifica clientul
      if (res.user_id) {
        const { error: e4 } = await supabase.from("notifications").insert({
          user_id: res.user_id,
          restaurant_id: restaurantId,
          type: "no_show",
          message: `Rezervarea ta la ${res.date} ora ${res.time} nu mai este valabilă deoarece nu te-ai prezentat. Scorul tău de prezență a scăzut.`,
          is_read: false,
        });
        if (e4) {
          console.error("notifications insert:", e4);
        }
      }

      setDisplayReservations((prev) => prev.filter((r) => r.id !== res.id));
      setNoShowModal(null);
      showToast("No-show marcat. Masa eliberată.");
    } catch (err) {
      console.error("markNoShow error:", err);
      showToast("Eroare la marcarea no-show.");
    }
  };

  const markPresent = async (res) => {
    try {
      const { error: e1 } = await supabase.rpc("increment_client_rating", {
        user_id_input: res.user_id,
      });
      if (e1) {
        console.error("increment_client_rating:", e1);
      }

      const { error: e2 } = await supabase
        .from("reservations")
        .update({ status: "completed" })
        .eq("id", res.id);
      if (e2) {
        console.error("reservations update:", e2);
      }

      setDisplayReservations((prev) => prev.filter((r) => r.id !== res.id));
      setNoShowModal(null);
      showToast("Prezenta confirmata!");
    } catch (err) {
      console.error("markPresent error:", err);
      showToast("Eroare.");
    }
  };

  // Grupare comenzi paying per sesiune masă (table_session_id = cheie unică)
  const payingOrders = Object.values(
    orders
      .filter((o) => o.status === "paying")
      .reduce((groups, order) => {
        const key = order.table_session_id || order.table_label || order.id;
        if (!groups[key]) {
          groups[key] = {
            ...order,
            _orderIds: [order.id],
            items: [...(order.items || [])],
            total: Number(order.total || 0),
          };
        } else {
          groups[key]._orderIds.push(order.id);
          (order.items || []).forEach((newItem) => {
            const existing = groups[key].items.find(
              (i) => i.name === newItem.name,
            );
            if (existing) {
              existing.qty = (existing.qty || 1) + (newItem.qty || 1);
            } else {
              groups[key].items.push({ ...newItem });
            }
          });
          groups[key].total += Number(order.total || 0);
        }
        return groups;
      }, {}),
  );
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.has_new_items === true,
  );
  const cookingOrders = orders.filter((o) => o.status === "cooking");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const pendingRes = displayReservations.filter(
    (r) => !r.status || r.status === "pending",
  );
  const confirmedRes = displayReservations.filter(
    (r) => r.status === "confirmed",
  );

  // Folosim dbFloors (date reale din DB) - acelasi sistem ca LiveTablesModal
  const FLOORS = dbFloors.length > 0 ? dbFloors : [];
  const allTables = FLOORS.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.label] || tableStates[t.label] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.label] === "occupied",
  ).length;

  // Stergere cont ospatar
  const handleDeleteWaiter = async () => {
    setDeleteLoading(true);
    try {
      // 1. Verificam parola
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", waiterId)
        .single();

      if (!profileData) {
        showToast("❌ Cont inexistent.");
        setDeleteLoading(false);
        return;
      }

      // 2. Verificam parola prin email din profiles
      const { data: emailData } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", waiterId)
        .single();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailData?.email || "",
        password: deletePassword,
      });
      if (authError) {
        showToast("❌ Parolă incorectă.");
        setDeleteLoading(false);
        return;
      }

      // 3. Anonimizam comenzile
      await supabase
        .from("orders")
        .update({ waiter_id: null, waiter_name: "Ospătar șters" })
        .eq("waiter_id", waiterId);

      // 4. Stergem notificarile
      await supabase.from("notifications").delete().eq("user_id", waiterId);

      // 5. Stergem profilul
      await supabase.from("profiles").delete().eq("id", waiterId);

      // 6. Logout
      await supabase.auth.signOut();
      onBack && onBack();
      showToast("✅ Contul a fost șters.");
    } catch (e) {
      showToast("❌ A apărut o eroare. Încearcă din nou.");
    }
    setDeleteLoading(false);
    setDeleteModal(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0a07",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: "#f0ebe3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Modal No-Show */}
      {noShowModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#1a1510",
              border: "1px solid #2a2218",
              borderRadius: 20,
              padding: 24,
              maxWidth: 340,
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "'Fraunces',serif",
                marginBottom: 8,
              }}
            >
              Verificare prezenta
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#c8a97e",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              A venit <b>{noShowModal.customer_name}</b> la rezervarea de la ora{" "}
              <b>{noShowModal.time}</b>?
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => markNoShow(noShowModal)}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: "rgba(192,57,43,.15)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Nu a venit
              </button>
              <button
                onClick={() => markPresent(noShowModal)}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: "rgba(74,110,74,.2)",
                  border: "1px solid rgba(74,110,74,.4)",
                  color: "#6b9e6b",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Da, a venit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div
        style={{
          padding: "40px 20px 16px",
          background: "linear-gradient(135deg,#1a1200,#0d0a07)",
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              🤵 {waiterName || "Ospătar"}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {restaurant?.name || "Restaurant"} •{" "}
              {new Date().toLocaleTimeString("ro-RO", {
                timeZone: "Europe/Bucharest",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Bucharest",
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                reload();
                loadOrders();
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "#1e1a14",
                border: "1px solid #2a2218",
                color: "#c8a97e",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              🔄
            </button>
            <button
              onClick={() => setDeleteModal("confirm")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(224,80,80,0.08)",
                border: "1px solid rgba(224,80,80,0.2)",
                color: "#e05050",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🗑️
            </button>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(192,57,43,.15)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Ieși
              </button>
            )}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            { label: "Libere", value: freeCount, color: "#4a6e4a" },
            { label: "Ocupate", value: occCount, color: "#c0622f" },
            {
              label: "Comenzi noi",
              value: pendingOrders.length,
              color: "#e07a47",
            },
            { label: "Rezervări", value: pendingRes.length, color: "#c8a97e" },
            {
              label: "Note plată",
              value: payingOrders.length,
              color: "#5b8dd9",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,.04)",
                borderRadius: 10,
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 20,
                  fontWeight: 900,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: "#6b6050",
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: "#161210",
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        {[
          {
            id: "orders",
            icon: "🍽️",
            label: "Comenzi",
            badge: pendingOrders.length + cookingOrders.length,
          },
          { id: "map", icon: "🗺️", label: "Harta mese" },
          {
            id: "reservations",
            icon: "📅",
            label: "Rezervări",
            badge: pendingRes.length,
          },
          { id: "istoric", icon: "🕐", label: "Istoric" },
        ].map((t) => (
          <div
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 8px",
              textAlign: "center",
              cursor: "pointer",
              position: "relative",
              borderBottom: `2px solid ${tab === t.id ? "#c0622f" : "transparent"}`,
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
            <div
              style={{
                fontSize: 9,
                color: tab === t.id ? "#c0622f" : "#6b6050",
                fontWeight: tab === t.id ? 700 : 400,
              }}
            >
              {t.label}
            </div>
            {t.badge > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: "calc(50% - 18px)",
                  width: 16,
                  height: 16,
                  background: "#c0622f",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.badge}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 24 }}
      >
        {/* ── COMENZI ── */}
        {tab === "orders" && (
          <WaiterOrders
            orders={orders}
            loading={loading}
            waiterCalls={waiterCalls}
            setWaiterCalls={setWaiterCalls}
            cancellingOrders={cancellingOrders}
            setCancellingOrders={setCancellingOrders}
            initCancellation={initCancellation}
            cancelItem={cancelItem}
            acceptOrder={acceptOrder}
            acceptOrderWithItems={acceptOrderWithItems}
            markReady={markReady}
            closeOrder={closeOrder}
            confirmPayment={confirmPayment}
            pendingOrders={pendingOrders}
            cookingOrders={cookingOrders}
            payingOrders={payingOrders}
            readyOrders={readyOrders}
            tab={tab}
          />
        )}

        {tab === "map" && (
          <WaiterMap
            tables={allTables}
            tableStates={tableStates}
            markPaid={markPaid}
            restaurantId={restaurantId}
            activeMapFloor={activeMapFloor}
            setActiveMapFloor={setActiveMapFloor}
            dbFloors={dbFloors}
            mapDate={mapDate}
            setMapDate={setMapDate}
            mapReservedTables={mapReservedTables}
            mapTime={mapTime}
            setMapTime={setMapTime}
            mapZoom={mapZoom}
            setMapZoom={setMapZoom}
            restProgram={restProgram}
            mapHistorySessions={mapHistorySessions}
            tab={tab}
          />
        )}

        {tab === "reservations" && (
          <WaiterReservations
            reservations={displayReservations}
            refuseReservation={refuseReservation}
            acceptReservation={confirmReservation}
            confirmReservation={confirmReservation}
            restaurantId={restaurantId}
            waiterId={waiterId}
            waiterName={waiterName}
            pendingRes={pendingRes}
            confirmedRes={confirmedRes}
            noShowModal={noShowModal}
            setNoShowModal={setNoShowModal}
            markNoShow={markNoShow}
            markPresent={markPresent}
            tab={tab}
            suggestionModal={suggestionModal}
            setSuggestionModal={setSuggestionModal}
            sendRefusalWithSuggestion={sendRefusalWithSuggestion}
            onReservationAdded={() => setReservationsRefreshKey((k) => k + 1)}
          />
        )}

        {tab === "istoric" && (
          <WaiterIstoric
            istoricOrders={istoricOrders}
            istoricDate={istoricDate}
            setIstoricDate={setIstoricDate}
            istoricLoading={istoricLoading}
            setTab={setTab}
            restaurantId={restaurantId}
            suggestionModal={suggestionModal}
            setSuggestionModal={setSuggestionModal}
            sendRefusalWithSuggestion={sendRefusalWithSuggestion}
            cookingOrders={cookingOrders}
            orders={orders}
            pendingOrders={pendingOrders}
            pendingRes={pendingRes}
            tab={tab}
          />
        )}
      </div>

      {/* Modal Șterge Cont Ospătar */}
      {deleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
          }}
          onClick={() => {
            setDeleteModal(false);
            setDeletePassword("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1510",
              borderRadius: 20,
              padding: "24px 20px 28px",
              width: "100%",
              maxWidth: 360,
            }}
          >
            {deleteModal === "confirm" && (
              <>
                <div
                  style={{
                    fontSize: 32,
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  ⚠️
                </div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Ștergi contul?
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#8a7a6a",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 1.5,
                  }}
                >
                  Această acțiune este ireversibilă. Comenzile tale vor fi
                  anonimizate.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setDeleteModal(false)}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #2a2218",
                      background: "transparent",
                      color: "#8a7a6a",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Anulează
                  </button>
                  <button
                    onClick={() => setDeleteModal("password")}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "none",
                      background: "rgba(224,80,80,0.15)",
                      color: "#e05050",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Continuă
                  </button>
                </div>
              </>
            )}

            {deleteModal === "password" && (
              <>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  🔒 Confirmă cu parola
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#8a7a6a",
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  Introdu parola contului pentru a confirma ștergerea.
                </div>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Parola ta"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#f0ebe3",
                    fontFamily: "inherit",
                    fontSize: 13,
                    outline: "none",
                    marginBottom: 16,
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setDeleteModal("confirm");
                      setDeletePassword("");
                    }}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #2a2218",
                      background: "transparent",
                      color: "#8a7a6a",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={handleDeleteWaiter}
                    disabled={deleteLoading || !deletePassword}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "none",
                      background: deletePassword
                        ? "rgba(224,80,80,0.8)"
                        : "#2a2218",
                      color: deletePassword ? "#fff" : "#6b6050",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: deletePassword ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    {deleteLoading ? "Se șterge..." : "🗑️ Șterge"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
