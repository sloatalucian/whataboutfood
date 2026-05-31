import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";
import { fmt, ZILE, ORE } from "./utils";
import BarChart from "./components/BarChart";
import StatCard from "./components/StatCard";
import OspatarSection from "./sections/OspatarSection";
import OcupareSection from "./sections/OcupareSection";
import RatingSection from "./sections/RatingSection";
import NoShowSection from "./sections/NoShowSection";
import ProLockOverlay from "./sections/ProLockOverlay";

// fmt, ZILE, ORE imported from ./utils
// BarChart and StatCard imported from ./components
export default function StatisticiProprietar() {
  const { navigate, state, isLocked } = useApp();
  const { user } = state;
  const [period, setPeriod] = useState("saptamana");
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  // Lunile disponibile bazate pe plan
  const getAvailableMonths = () => {
    const plan = state.user?.plan || "free";
    const months = [];
    const today = new Date();
    // Business: ultimii 3 ani, Pro: ultimele 3 luni, Free: luna curenta
    const maxMonths = plan === "business" ? 36 : plan === "pro" ? 3 : 1;
    for (let i = 0; i < maxMonths; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("ro-RO", { month: "long", year: "numeric" }),
      });
    }
    return months;
  };
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [waiterStats, setWaiterStats] = useState([]);
  const [waiterLoading, setWaiterLoading] = useState(false);
  const [ratingStats, setRatingStats] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingPeriod, setRatingPeriod] = useState("luna");
  const [noShowStats, setNoShowStats] = useState(null);
  const [noShowLoading, setNoShowLoading] = useState(false);
  const [noShowPeriod, setNoShowPeriod] = useState("luna");
  const [occupancyData, setOccupancyData] = useState({});
  const [occupancyTables, setOccupancyTables] = useState([]);
  const [occupancyProgram, setOccupancyProgram] = useState(null);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancyWeek, setOccupancyWeek] = useState(1);
  const [occupancyMonth, setOccupancyMonth] = useState(new Date().getMonth());
  const [occupancyYear, setOccupancyYear] = useState(new Date().getFullYear());
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);
  const [todayStats, setTodayStats] = useState({
    orders: "—",
    reservations: "—",
    revenue: "—",
  });

  // Date reale
  const [monthStats, setMonthStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    reservations: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [heatmapMonth, setHeatmapMonth] = useState(new Date().getMonth());
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [heatmapWeek, setHeatmapWeek] = useState(0); // 0 = toata luna
  const [restaurantName, setRestaurantName] = useState("");

  // Încarcă lista restaurante
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMyRestaurants(data);
          setSelectedRestId(data[0].id);
          setRestaurantName(data[0].name);
        }
      });
  }, [user?.id]);

  // Statistici azi - se reincarca la schimbarea restaurantului
  useEffect(() => {
    if (!selectedRestId) return;
    const loadToday = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayStr = startOfDay.toISOString().split("T")[0];

      const [{ data: orders }, { count: resCount }] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .eq("restaurant_id", selectedRestId)
          .in("status", ["paid", "completed"])
          .gte("created_at", startOfDay.toISOString()),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", selectedRestId)
          .eq("date", todayStr)
          .eq("status", "confirmed"),
      ]);

      const revenue = (orders || []).reduce(
        (s, o) => s + Number(o.total || 0),
        0,
      );
      setTodayStats({
        orders: (orders || []).length,
        reservations: resCount || 0,
        revenue: `${revenue.toFixed(0)} lei`,
      });
    };
    loadToday();
  }, [selectedRestId]);

  useEffect(() => {
    if (!selectedRestId) return;
    loadStats();
  }, [
    selectedRestId,
    period,
    selectedYear,
    selectedMonth,
    heatmapMonth,
    heatmapYear,
    heatmapWeek,
  ]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const restId = selectedRestId;
      if (!restId) {
        setLoading(false);
        return;
      }

      // Interval de timp
      const now = new Date();
      // Offset timezone Romania (UTC+2 iarna, UTC+3 vara)
      const offsetMin = -now.getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const tzHH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(
        2,
        "0",
      );
      const tzMM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      const tz = `${sign}${tzHH}:${tzMM}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      let startDate;
      if (period === "zi") {
        startDate = `${todayStr}T00:00:00${tz}`;
      } else if (period === "saptamana") {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
        startDate = `${d7Str}T00:00:00${tz}`;
      } else {
        const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
        startDate = `${monthStr}T00:00:00${tz}`;
      }

      // Toate comenzile plătite din perioada selectată
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restId)
        .in("status", ["paid", "completed"])
        .gte("created_at", startDate)
        .order("created_at");

      const allOrders = orders || [];

      // ── Sumar ──
      const totalRevenue = allOrders.reduce(
        (s, o) => s + Number(o.total || 0),
        0,
      );
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Rezervări confirmate luna curentă
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00${tz}`;
      const { count: resCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restId)
        .eq("status", "confirmed")
        .gte("created_at", monthStart);

      setMonthStats({
        totalRevenue,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 10) / 10,
        reservations: resCount || 0,
      });

      // ── Grafic venituri ──
      if (period === "zi") {
        const hourly = {};
        ORE.forEach((h) => {
          hourly[h] = 0;
        });
        allOrders.forEach((o) => {
          const h = new Date(o.created_at)
            .toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Bucharest",
            })
            .substring(0, 5);
          const slot = ORE.find((s) => s <= h) || ORE[0];
          if (slot) hourly[slot] = (hourly[slot] || 0) + Number(o.total || 0);
        });
        setRevenueData(ORE.map((h) => ({ label: h, value: hourly[h] || 0 })));
      } else if (period === "saptamana") {
        const daily = {};
        ZILE.forEach((z) => {
          daily[z] = 0;
        });
        allOrders.forEach((o) => {
          const dayIdx = new Date(o.created_at).getDay();
          const dayName = ZILE[dayIdx === 0 ? 6 : dayIdx - 1];
          daily[dayName] = (daily[dayName] || 0) + Number(o.total || 0);
        });
        setRevenueData(ZILE.map((z) => ({ label: z, value: daily[z] || 0 })));
      } else {
        // Luna - pe săptămâni
        const weekly = [0, 0, 0, 0];
        allOrders.forEach((o) => {
          const day = new Date(o.created_at).getDate();
          const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
          weekly[weekIdx] += Number(o.total || 0);
        });
        setRevenueData([
          { label: "Săpt 1", value: weekly[0] },
          { label: "Săpt 2", value: weekly[1] },
          { label: "Săpt 3", value: weekly[2] },
          { label: "Săpt 4", value: weekly[3] },
        ]);
      }

      // ── Top produse ──
      const productMap = {};
      allOrders.forEach((o) => {
        // Deduplicam produsele - acelasi produs poate aparea de mai multe ori
        const seenItems = {};
        (o.items || []).forEach((item) => {
          const key = item.name;
          if (!seenItems[key]) seenItems[key] = { ...item, qty: item.qty || 1 };
          else seenItems[key].qty += item.qty || 1;
        });
        Object.values(seenItems).forEach((item) => {
          if (!productMap[item.name])
            productMap[item.name] = {
              name: item.name,
              emoji: item.emoji || "🍴",
              orders: 0,
              revenue: 0,
            };
          productMap[item.name].orders += item.qty;
          productMap[item.name].revenue += (item.price || 0) * item.qty;
        });
      });
      const products = Object.values(productMap)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8);
      const maxOrders = products[0]?.orders || 1;
      setTopProducts(
        products.map((p) => ({
          ...p,
          pct: Math.round((p.orders / maxOrders) * 100),
        })),
      );

      // ── Top categorii ──
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, name, emoji, menu_items(id, name)")
        .eq("restaurant_id", restId);

      if (cats) {
        const catMap = {};
        cats.forEach((c) => {
          const itemNames = (c.menu_items || []).map((i) => i.name);
          catMap[c.name] = {
            name: c.name,
            emoji: c.emoji || "🍽️",
            revenue: 0,
            orders: 0,
          };
          allOrders.forEach((o) => {
            (o.items || []).forEach((item) => {
              if (itemNames.includes(item.name)) {
                catMap[c.name].revenue += (item.price || 0) * (item.qty || 1);
                catMap[c.name].orders += item.qty || 1;
              }
            });
          });
        });
        const catList = Object.values(catMap)
          .filter((c) => c.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue);
        const totalCatRevenue = catList.reduce((s, c) => s + c.revenue, 1);
        setTopCategories(
          catList.slice(0, 6).map((c) => ({
            ...c,
            pct: Math.round((c.revenue / totalCatRevenue) * 100),
          })),
        );
      }

      // ── Heatmap ore aglomerate ──
      // Calculeaza intervalul bazat pe heatmapMonth/Year/Week
      const hmYear = heatmapYear;
      const hmMonth = heatmapMonth;
      const hmLastDay = new Date(hmYear, hmMonth + 1, 0).getDate();
      const weekStarts = [1, 8, 15, 22];
      const weekEnds = [7, 14, 21, hmLastDay];
      let hmStart, hmEnd;
      if (heatmapWeek === 0) {
        // Toata luna
        hmStart = new Date(hmYear, hmMonth, 1).toISOString();
        hmEnd = new Date(hmYear, hmMonth + 1, 0, 23, 59, 59).toISOString();
      } else {
        hmStart = new Date(
          hmYear,
          hmMonth,
          weekStarts[heatmapWeek - 1],
        ).toISOString();
        hmEnd = new Date(
          hmYear,
          hmMonth,
          weekEnds[heatmapWeek - 1],
          23,
          59,
          59,
        ).toISOString();
      }

      const { data: allMonthOrders } = await supabase
        .from("orders")
        .select("created_at")
        .eq("restaurant_id", restId)
        .in("status", ["paid", "completed"])
        .gte("created_at", hmStart)
        .lte("created_at", hmEnd);

      const heatGrid = ORE.map(() => ZILE.map(() => 0));
      (allMonthOrders || []).forEach((o) => {
        const d = new Date(o.created_at);
        const dayIdx = d.getDay();
        const zi = dayIdx === 0 ? 6 : dayIdx - 1;
        const h = d
          .toLocaleTimeString("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Bucharest",
          })
          .substring(0, 5);
        const oraIdx = ORE.findIndex(
          (slot) =>
            slot <= h &&
            (ORE[ORE.indexOf(slot) + 1] > h || !ORE[ORE.indexOf(slot) + 1]),
        );
        if (oraIdx >= 0 && zi >= 0) heatGrid[oraIdx][zi]++;
      });
      const maxHeat = Math.max(...heatGrid.flat(), 1);
      setHeatmapData(
        heatGrid.map((row) => row.map((v) => Math.round((v / maxHeat) * 100))),
      );
    } catch (err) {}
    setLoading(false);
  };

  const exportCSV = () => {
    setExportLoading(true);
    setTimeout(() => {
      const rows = [
        ["Produs", "Comenzi", "Venituri (lei)"],
        ...topProducts.map((p) => [p.name, p.orders, p.revenue.toFixed(2)]),
        [],
        ["TOTAL", monthStats.totalOrders, monthStats.totalRevenue.toFixed(2)],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WhataboutFood_${restaurantName}_${new Date().toLocaleDateString("ro-RO").replace(/\//g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportLoading(false);
    }, 400);
  };

  // ── Performanta per ospatar ──
  useEffect(() => {
    if (!selectedRestId || isLocked("stats_waiter")) return;

    const loadWaiterStats = async () => {
      setWaiterLoading(true);
      try {
        // Calculeaza startDate identic cu filtrul de perioada principal
        const now = new Date();
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const tzHH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(
          2,
          "0",
        );
        const tzMM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
        const tz = `${sign}${tzHH}:${tzMM}`;
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        let startDate;
        if (period === "zi") {
          startDate = `${todayStr}T00:00:00${tz}`;
        } else if (period === "saptamana") {
          const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
          startDate = `${d7Str}T00:00:00${tz}`;
        } else {
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          startDate = `${monthStr}T00:00:00${tz}`;
        }

        // Incarca comenzile platite cu waiter_id din perioada selectata
        // Folosim ISO string simplu fara timezone pentru compatibilitate Supabase
        const startDateISO = new Date(startDate).toISOString();

        const { data: allOrders, error } = await supabase
          .from("orders")
          .select(
            "id, waiter_id, waiter_name, total, accepted_at, completed_at",
          )
          .eq("restaurant_id", selectedRestId)
          .eq("status", "paid")
          .gte("created_at", startDateISO);

        if (error) {
          setWaiterStats([]);
          return;
        }

        // Filtram doar comenzile cu ospatar asignat
        const orders = (allOrders || []).filter((o) => o.waiter_id !== null);

        if (orders.length === 0) {
          setWaiterStats([]);
          return;
        }

        // Ia ID-urile unice ale ospatarilor
        const waiterIds = [...new Set(orders.map((o) => o.waiter_id))];

        // Ospătarii sunt în profiles cu role = waiter
        const { data: waiterProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", waiterIds)
          .eq("role", "waiter");

        const waiterNames = {};
        (waiterProfiles || []).forEach((w) => {
          waiterNames[w.id] = w.full_name || null;
        });

        const byWaiter = {};
        orders.forEach((o) => {
          const id = o.waiter_id;
          // Prioritate: profiles.full_name > orders.waiter_name > "Ospătar necunoscut"
          const name = waiterNames[id] || o.waiter_name || "Ospătar necunoscut";
          if (!byWaiter[id]) {
            byWaiter[id] = {
              id,
              name,
              orders: 0,
              revenue: 0,
              totalTime: 0,
              timedOrders: 0,
            };
          }
          byWaiter[id].orders += 1;
          byWaiter[id].revenue += Number(o.total || 0);
          if (o.accepted_at && o.completed_at) {
            const diff =
              (new Date(o.completed_at) - new Date(o.accepted_at)) / 60000;
            if (diff >= 0 && diff < 180) {
              byWaiter[id].totalTime += diff;
              byWaiter[id].timedOrders += 1;
            }
          }
        });

        const stats = Object.values(byWaiter)
          .map((w) => ({
            ...w,
            avgTime:
              w.timedOrders > 0
                ? Math.round(w.totalTime / w.timedOrders)
                : null,
            avgTimeSec:
              w.timedOrders > 0
                ? Math.round((w.totalTime / w.timedOrders) * 60)
                : null,
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setWaiterStats(stats);
      } catch (e) {
        setWaiterStats([]);
      } finally {
        setWaiterLoading(false);
      }
    };

    loadWaiterStats();
  }, [selectedRestId, period]);

  // ── No-show rezervari ──
  useEffect(() => {
    if (!selectedRestId || isLocked("stats_waiter")) return;

    const loadNoShow = async () => {
      setNoShowLoading(true);
      try {
        const now = new Date();

        // Calculeaza interval de date
        let startDate, endDate;
        if (noShowPeriod === "luna") {
          startDate = new Date(selectedYear, selectedMonth, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(selectedYear, selectedMonth + 1, 0)
            .toISOString()
            .split("T")[0];
        } else if (noShowPeriod === "zi") {
          const today = now.toISOString().split("T")[0];
          startDate = today;
          endDate = today;
        } else {
          // 7 zile
          const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = d7.toISOString().split("T")[0];
          endDate = now.toISOString().split("T")[0];
        }

        // Ia toate rezervarile din perioada (confirmate + no_show + completed)
        const { data: allRes, error } = await supabase
          .from("reservations")
          .select("id, status, date, customer_name")
          .eq("restaurant_id", selectedRestId)
          .gte("date", startDate)
          .lte("date", endDate)
          .in("status", ["confirmed", "no_show", "completed"]);

        if (error || !allRes) {
          setNoShowStats(null);
          return;
        }
        if (allRes.length === 0) {
          setNoShowStats({ empty: true });
          return;
        }

        const total = allRes.length;
        const noShows = allRes.filter((r) => r.status === "no_show");
        const noShowCount = noShows.length;
        const rate = total > 0 ? Math.round((noShowCount / total) * 100) : 0;

        // Ziua cu cele mai multe no-show
        const byDay = {};
        const ZILE = [
          "Duminică",
          "Luni",
          "Marți",
          "Miercuri",
          "Joi",
          "Vineri",
          "Sâmbătă",
        ];
        noShows.forEach((r) => {
          const d = new Date(r.date);
          const zi = ZILE[d.getDay()];
          byDay[zi] = (byDay[zi] || 0) + 1;
        });
        const worstDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

        setNoShowStats({
          empty: false,
          total,
          noShowCount,
          rate,
          worstDay: worstDay ? worstDay[0] : null,
          worstDayCount: worstDay ? worstDay[1] : 0,
          presentCount: total - noShowCount,
        });
      } catch (e) {
        setNoShowStats(null);
      } finally {
        setNoShowLoading(false);
      }
    };

    loadNoShow();
  }, [selectedRestId, noShowPeriod, selectedYear, selectedMonth]);

  // ── Rating clienti ──
  useEffect(() => {
    if (!selectedRestId || isLocked("stats_waiter")) return;

    const loadRating = async () => {
      setRatingLoading(true);
      try {
        // Calculeaza startDate bazat pe ratingPeriod
        const now = new Date();
        const startDateISO =
          ratingPeriod === "luna"
            ? new Date(selectedYear, selectedMonth, 1).toISOString()
            : ratingPeriod === "zi"
              ? new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                ).toISOString()
              : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const endDateISO =
          ratingPeriod === "luna"
            ? new Date(
                selectedYear,
                selectedMonth + 1,
                0,
                23,
                59,
                59,
              ).toISOString()
            : now.toISOString();

        const { data: reviews, error } = await supabase
          .from("restaurant_reviews")
          .select("id, rating, comment, created_at")
          .eq("restaurant_id", selectedRestId)
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO)
          .order("created_at", { ascending: false });

        if (error || !reviews) {
          setRatingStats(null);
          return;
        }

        if (reviews.length === 0) {
          setRatingStats({ empty: true });
          return;
        }

        // Calculeaza distributia
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });

        // Media
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

        // Evolutie per saptamana (pentru grafic)
        const byWeek = {};
        reviews.forEach((r) => {
          const d = new Date(r.created_at);
          const weekKey = `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, "0")}`;
          if (!byWeek[weekKey])
            byWeek[weekKey] = {
              sum: 0,
              count: 0,
              label: `Săpt. ${Math.ceil(d.getDate() / 7)}`,
            };
          byWeek[weekKey].sum += r.rating;
          byWeek[weekKey].count += 1;
        });
        const evolution = Object.values(byWeek).map((w) => ({
          label: w.label,
          avg: Math.round((w.sum / w.count) * 10) / 10,
          count: w.count,
        }));

        setRatingStats({
          avg: Math.round(avg * 10) / 10,
          total: reviews.length,
          distribution,
          recent: reviews.slice(0, 5),
          evolution,
          empty: false,
        });
      } catch (e) {
        setRatingStats(null);
      } finally {
        setRatingLoading(false);
      }
    };

    loadRating();
  }, [selectedRestId, ratingPeriod, selectedYear, selectedMonth]);

  // ── Rata ocupare mese (heatmap) ──
  useEffect(() => {
    if (!selectedRestId || isLocked("stats_waiter")) return;

    const loadOccupancy = async () => {
      setOccupancyLoading(true);
      try {
        // 1. Ia programul restaurantului
        const { data: restData } = await supabase
          .from("restaurants")
          .select("program")
          .eq("id", selectedRestId)
          .single();
        const program = restData?.program || {};
        setOccupancyProgram(program);

        // 2. Ia mesele restaurantului
        const { data: floors } = await supabase
          .from("floors")
          .select("id")
          .eq("restaurant_id", selectedRestId);
        const floorIds = (floors || []).map((f) => f.id);
        const { data: tables } = await supabase
          .from("tables")
          .select("id, label")
          .in("floor_id", floorIds);
        setOccupancyTables(tables || []);
        if (!tables || tables.length === 0) {
          setOccupancyData({});
          return;
        }

        // 3. Calculeaza saptamana selectata din luna/anul selectat
        const year = occupancyYear;
        const month = occupancyMonth;
        // Saptamanile din luna curenta (bazate pe calendar)
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        // Saptamana 1: zilele 1-7, 2: 8-14, 3: 15-21, 4: 22-sfarsit
        const weekStarts = [1, 8, 15, 22];
        const weekEnds = [7, 14, 21, lastDay.getDate()];
        const wStart = new Date(year, month, weekStarts[occupancyWeek - 1]);
        const wEnd = new Date(
          year,
          month,
          weekEnds[occupancyWeek - 1],
          23,
          59,
          59,
        );

        // 4. Ia sesiunile din saptamana selectata
        const { data: sessions } = await supabase
          .from("table_sessions")
          .select("table_label, started_at, closed_at, paid_at")
          .eq("restaurant_id", selectedRestId)
          .gte("started_at", wStart.toISOString())
          .lte("started_at", wEnd.toISOString());

        // 5. Construieste heatmap: { "Luni_10:00": pct }
        const ZILE_RO = [
          "Luni",
          "Marți",
          "Miercuri",
          "Joi",
          "Vineri",
          "Sâmbătă",
          "Duminică",
        ];
        const DAY_IDX = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

        // Genereaza orele din program - uniunea orelor deschise din toate zilele
        const parseH = (t) => parseInt(t) || 0;
        const parseEndH = (t) => (t === "00:00" ? 24 : parseInt(t) || 24);

        // Axa Y: toate cele 24 de ore
        const hours = Array.from(
          { length: 24 },
          (_, h) => `${String(h).padStart(2, "0")}:00`,
        );

        // Calculeaza ocuparea per zi/ora
        const heatmap = {};
        ZILE_RO.forEach((zi) => {
          heatmap[zi] = {};
          hours.forEach((h) => {
            heatmap[zi][h] = { occupied: 0, total: tables.length };
          });
        });

        (sessions || []).forEach((s) => {
          const start = new Date(s.started_at);
          const end = s.closed_at
            ? new Date(s.closed_at)
            : s.paid_at
              ? new Date(s.paid_at)
              : new Date(start.getTime() + 60 * 60000);
          const dayIdx = DAY_IDX[start.getDay()];
          const zi = ZILE_RO[dayIdx];
          if (!heatmap[zi]) return;
          // Marca fiecare ora ocupata de sesiune
          let cur = new Date(start);
          cur.setMinutes(0, 0, 0);
          while (cur < end) {
            const hKey = `${String(cur.getHours()).padStart(2, "0")}:00`;
            if (heatmap[zi][hKey] !== undefined) {
              heatmap[zi][hKey].occupied += 1;
            }
            cur.setHours(cur.getHours() + 1);
          }
        });

        setOccupancyData({ heatmap, hours, weekStart: wStart, weekEnd: wEnd });
      } catch (e) {
        setOccupancyData({});
      } finally {
        setOccupancyLoading(false);
      }
    };

    loadOccupancy();
  }, [selectedRestId, occupancyWeek, occupancyMonth, occupancyYear]);

  const totalPeriod = revenueData.reduce((s, d) => s + d.value, 0);
  const topDay =
    ZILE[
      revenueData.reduce(
        (maxI, d, i, arr) => (d.value > arr[maxI].value ? i : maxI),
        0,
      )
    ] || "—";

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 24px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate("home")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              📊 Statistici
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {restaurantName || "..."} •{" "}
              {new Date().toLocaleDateString("ro-RO", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
        {/* Selector restaurant - apare doar dacă are mai multe */}
        {myRestaurants.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedRestId || ""}
              onChange={(e) => {
                const r = myRestaurants.find((r) => r.id === e.target.value);
                setSelectedRestId(e.target.value);
                setRestaurantName(r?.name || "");
              }}
              style={{
                width: "100%",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 10,
                color: "#f0ebe3",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              {myRestaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportCSV}
            disabled={exportLoading}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 10,
              background: "rgba(74,110,74,.2)",
              border: "1px solid rgba(74,110,74,.4)",
              color: "#6b9e6b",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
              opacity: exportLoading ? 0.6 : 1,
            }}
          >
            {exportLoading ? "Se exportă..." : "📥 Export CSV"}
          </button>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 10,
              background: "rgba(91,141,217,.2)",
              border: "1px solid rgba(91,141,217,.4)",
              color: "#5b8dd9",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🖨️ Export PDF
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#6b6050",
              fontSize: 13,
            }}
          >
            Se încarcă statisticile...
          </div>
        ) : (
          <>
            {/* Sumar azi */}
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 10,
              }}
            >
              Astăzi
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                {
                  icon: "🍽️",
                  label: "Comenzi",
                  value: todayStats.orders,
                  color: "#c0622f",
                },
                {
                  icon: "📅",
                  label: "Rezervări",
                  value: todayStats.reservations,
                  color: "#c8a97e",
                },
                {
                  icon: "💰",
                  label: "Venituri",
                  value: todayStats.revenue,
                  color: "#6b9e6b",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 12,
                    padding: "12px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 18,
                      fontWeight: 900,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, color: "#6b6050", marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Sumar */}
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 12,
              }}
            >
              Sumar luna curentă
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon="💰"
                label="Venituri totale"
                value={fmt(monthStats.totalRevenue)}
                sub="luna curentă"
                color="#c8a97e"
              />
              <StatCard
                icon="🍽️"
                label="Total comenzi"
                value={monthStats.totalOrders}
                sub="plătite"
                color="#6b9e6b"
              />
              <StatCard
                icon="🧾"
                label="Valoare medie"
                value={`${monthStats.avgOrderValue} lei`}
                sub="per comandă"
                color="#c0622f"
              />
              <StatCard
                icon="📅"
                label="Rezervări"
                value={monthStats.reservations}
                sub="confirmate"
                color="#5b8dd9"
              />
            </div>

            {/* Grafic venituri */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Venituri
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "#1e1a14",
                    borderRadius: 10,
                    padding: 3,
                  }}
                >
                  {[
                    { key: "zi", label: "Azi" },
                    { key: "saptamana", label: "7 zile" },
                    { key: "luna", label: "Lună" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        cursor: "pointer",
                        background:
                          period === p.key ? "#c0622f" : "transparent",
                        border: "none",
                        color: period === p.key ? "#fff" : "#6b6050",
                        fontWeight: period === p.key ? 700 : 400,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector luna/an - vizibil cand period = luna */}
              {period === "luna" && (
                <div style={{ marginBottom: 12 }}>
                  <select
                    value={`${selectedYear}-${selectedMonth}`}
                    onChange={(e) => {
                      const [y, m] = e.target.value.split("-");
                      setSelectedYear(Number(y));
                      setSelectedMonth(Number(m));
                    }}
                    style={{
                      width: "100%",
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 10,
                      padding: "8px 12px",
                      color: "#f0ebe3",
                      fontFamily: "inherit",
                      fontSize: 13,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {getAvailableMonths().map((m) => (
                      <option
                        key={`${m.year}-${m.month}`}
                        value={`${m.year}-${m.month}`}
                      >
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {state.user?.plan === "pro" && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b6050",
                        marginTop: 6,
                        textAlign: "center",
                      }}
                    >
                      Plan Pro — istoricul ultimelor 3 luni
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#c8a97e",
                  }}
                >
                  {fmt(totalPeriod)}
                </span>
                <span style={{ fontSize: 12, color: "#6b6050", marginLeft: 8 }}>
                  {period === "zi"
                    ? "azi"
                    : period === "saptamana"
                      ? "această săptămână"
                      : "această lună"}
                </span>
              </div>
              {revenueData.length > 0 ? (
                <BarChart data={revenueData} color="#c0622f" height={140} />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "#6b6050",
                    fontSize: 12,
                  }}
                >
                  Nicio comandă în această perioadă
                </div>
              )}
            </div>

            {/* Top produse */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                🏆 Top Produse
              </div>
              {topProducts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "#6b6050",
                    fontSize: 12,
                  }}
                >
                  Nicio comandă înregistrată
                </div>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.name} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          flexShrink: 0,
                          background:
                            i === 0
                              ? "rgba(200,169,126,.3)"
                              : i === 1
                                ? "rgba(255,255,255,.08)"
                                : i === 2
                                  ? "rgba(192,98,47,.15)"
                                  : "rgba(255,255,255,.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Fraunces',serif",
                          fontSize: 11,
                          fontWeight: 900,
                          color:
                            i === 0
                              ? "#c8a97e"
                              : i === 1
                                ? "#aaa"
                                : i === 2
                                  ? "#c0622f"
                                  : "#6b6050",
                        }}
                      >
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f0ebe3",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#c8a97e",
                          }}
                        >
                          {p.orders} comenzi
                        </div>
                        <div style={{ fontSize: 10, color: "#6b6050" }}>
                          {fmt(p.revenue)}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 34,
                        height: 4,
                        background: "#2a2218",
                        borderRadius: 20,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 20,
                          width: `${p.pct}%`,
                          background:
                            i < 3
                              ? "linear-gradient(90deg,#c0622f,#e07a47)"
                              : "linear-gradient(90deg,#2a2218,#3a3228)",
                          transition: "width .5s ease",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Heatmap */}
            {heatmapData.length > 0 && (
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  🔥 Ore aglomerate
                </div>

                {/* Selector luna + an */}
                {(() => {
                  const available = getAvailableMonths();
                  const availableYears = [
                    ...new Set(available.map((m) => m.year)),
                  ].sort((a, b) => b - a);
                  const availableMonths = available.filter(
                    (m) => m.year === heatmapYear,
                  );
                  const LUNI = [
                    "Ianuarie",
                    "Februarie",
                    "Martie",
                    "Aprilie",
                    "Mai",
                    "Iunie",
                    "Iulie",
                    "August",
                    "Septembrie",
                    "Octombrie",
                    "Noiembrie",
                    "Decembrie",
                  ];
                  return (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <select
                        value={heatmapMonth}
                        onChange={(e) => {
                          setHeatmapMonth(Number(e.target.value));
                          setHeatmapWeek(0);
                        }}
                        style={{
                          flex: 2,
                          background: "#1e1a14",
                          border: "1px solid #2a2218",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#f0ebe3",
                          fontFamily: "inherit",
                          fontSize: 12,
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        {availableMonths.map((m) => (
                          <option key={m.month} value={m.month}>
                            {LUNI[m.month]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={heatmapYear}
                        onChange={(e) => {
                          setHeatmapYear(Number(e.target.value));
                          setHeatmapWeek(0);
                        }}
                        style={{
                          flex: 1,
                          background: "#1e1a14",
                          border: "1px solid #2a2218",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#f0ebe3",
                          fontFamily: "inherit",
                          fontSize: 12,
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Selector saptamana */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {[
                    { label: "Toată luna", value: 0 },
                    { label: "Săpt. 1", value: 1 },
                    { label: "Săpt. 2", value: 2 },
                    { label: "Săpt. 3", value: 3 },
                    { label: "Săpt. 4", value: 4 },
                  ].map((w) => (
                    <button
                      key={w.value}
                      onClick={() => setHeatmapWeek(w.value)}
                      style={{
                        flex: 1,
                        padding: "4px 0",
                        borderRadius: 20,
                        border: "none",
                        background:
                          heatmapWeek === w.value ? "#c0622f" : "#161210",
                        color: heatmapWeek === w.value ? "#fff" : "#6b6050",
                        fontSize: 10,
                        fontWeight: heatmapWeek === w.value ? 700 : 400,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                <div
                  style={{ fontSize: 11, color: "#6b6050", marginBottom: 14 }}
                >
                  Activitate per zi și oră
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px repeat(7,1fr)",
                    gap: 3,
                    marginBottom: 3,
                  }}
                >
                  <div />
                  {ZILE.map((z) => (
                    <div
                      key={z}
                      style={{
                        fontSize: 9,
                        color: "#6b6050",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {z}
                    </div>
                  ))}
                </div>
                {ORE.map((ora, oi) => (
                  <div
                    key={ora}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px repeat(7,1fr)",
                      gap: 3,
                      marginBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#6b6050",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {ora}
                    </div>
                    {(heatmapData[oi] || ZILE.map(() => 0)).map((pct, di) => {
                      const { bg, color } = heatColor(pct);
                      return (
                        <div
                          key={di}
                          style={{
                            background: bg,
                            borderRadius: 5,
                            padding: "6px 2px",
                            textAlign: "center",
                            fontSize: 8,
                            color,
                            fontWeight: 700,
                          }}
                        >
                          {pct > 0 ? `${pct}%` : "—"}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Top categorii */}
            {topCategories.length > 0 && (
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  🍽️ Venituri pe categorie
                </div>
                {topCategories.map((cat, i) => {
                  const colors = [
                    "#c0622f",
                    "#e07a47",
                    "#c8a97e",
                    "#6b9e6b",
                    "#5b8dd9",
                    "#8b6a8a",
                  ];
                  return (
                    <div key={cat.name} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#f0ebe3",
                            fontWeight: 600,
                          }}
                        >
                          {cat.emoji} {cat.name}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: colors[i],
                              fontWeight: 700,
                            }}
                          >
                            {cat.pct}%
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#6b6050",
                              marginLeft: 6,
                            }}
                          >
                            {fmt(cat.revenue)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#2a2218",
                          borderRadius: 20,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 20,
                            width: `${cat.pct}%`,
                            background: colors[i],
                            transition: "width .5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Insights */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                💡 Insights
              </div>
              {[
                {
                  icon: "📈",
                  text: `Cea mai activă zi: ${topDay}`,
                  sub: "În perioada selectată",
                  color: "#6b9e6b",
                },
                {
                  icon: "🧾",
                  text: `Valoare medie comandă: ${monthStats.avgOrderValue} lei`,
                  sub: "Luna curentă",
                  color: "#c8a97e",
                },
                {
                  icon: "📅",
                  text: `Rezervări confirmate: ${monthStats.reservations}`,
                  sub: "Luna curentă",
                  color: "#5b8dd9",
                },
                {
                  icon: "💰",
                  text: `Total venituri: ${fmt(monthStats.totalRevenue)}`,
                  sub: "Luna curentă, comenzi plătite",
                  color: "#c0622f",
                },
              ].map((ins) => (
                <div
                  key={ins.text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #1e1a14",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {ins.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: ins.color,
                        marginBottom: 2,
                      }}
                    >
                      {ins.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {ins.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── PERFORMANTA PER OSPATAR (Pro) ── */}
            {!isLocked("stats_waiter") && (
              <OspatarSection
                period={period}
                waiterStats={waiterStats}
                waiterLoading={waiterLoading}
                setPeriod={setPeriod}
              />
            )}

            {/* ── RATA OCUPARE MESE (Pro) ── */}
            {!isLocked("stats_waiter") && (
              <OcupareSection
                occupancyData={occupancyData}
                occupancyTables={occupancyTables}
                occupancyProgram={occupancyProgram}
                occupancyLoading={occupancyLoading}
                occupancyWeek={occupancyWeek}
                occupancyMonth={occupancyMonth}
                occupancyYear={occupancyYear}
                setOccupancyWeek={setOccupancyWeek}
                setOccupancyMonth={setOccupancyMonth}
                setOccupancyYear={setOccupancyYear}
              />
            )}

            {/* ── RATING CLIENTI (Pro) ── */}
            {!isLocked("stats_waiter") && (
              <RatingSection
                ratingStats={ratingStats}
                ratingLoading={ratingLoading}
                ratingPeriod={ratingPeriod}
                setRatingPeriod={setRatingPeriod}
              />
            )}

            {/* ── NO-SHOW REZERVARI (Pro) ── */}
            {!isLocked("stats_waiter") && (
              <NoShowSection
                noShowStats={noShowStats}
                noShowLoading={noShowLoading}
                noShowPeriod={noShowPeriod}
                setNoShowPeriod={setNoShowPeriod}
              />
            )}

            {/* ── PRO LOCK OVERLAY ── */}
            {isLocked("stats_waiter") && <ProLockOverlay navigate={navigate} />}
          </>
        )}
      </div>
    </div>
  );
}
