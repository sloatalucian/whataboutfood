import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../supabase";

const AppContext = createContext(null);

const initialState = {
  screen: "home",
  user: null,
  selectedRest: null,
  cart: [],
  orderTableNum: null,
  tableSessionId: null,
  activeMenuCat: null,
  showPayment: false,
  paid: false,
  payMethod: null,
  reviewRestId: null,
  reviewSessionId: null,
  orders: [],
  reservations: {},
  resForm: {
    date: "",
    persons: 2,
    time: "",
    floorIdx: 0,
    tableId: null,
    done: false,
  },
  toast: null,
  adminFloors: [
    { id: 1, name: "Parter", tables: [], elements: [], type: "indoor" },
  ],
  adminFloorIdx: 0,
  selectedNode: null,
  // Coș persistent
  savedCart: null, // { restaurant_id, restaurant_name, table_label, items }
  // Notificări client
  notifications: [],
  unreadCount: 0,
  // Restaurante proprietar
  myRestaurants: [],
};

function reducer(state, { type, payload }) {
  switch (type) {
    case "NAVIGATE":
      return { ...state, screen: payload };
    case "SET_REST":
      return { ...state, selectedRest: payload, screen: "restaurant" };
    case "UPDATE_REST_RATING":
      return {
        ...state,
        selectedRest: state.selectedRest
          ? { ...state.selectedRest, rating: payload }
          : state.selectedRest,
      };
    case "SET_USER":
      return { ...state, user: payload };
    case "SET_TOAST":
      return { ...state, toast: payload };
    case "SET_MENU_CAT":
      return { ...state, activeMenuCat: payload };
    case "SET_PAYMENT":
      return { ...state, showPayment: payload };
    case "SET_PAID":
      return {
        ...state,
        paid: payload.paid,
        payMethod: payload.method,
        reviewRestId: payload.restaurantId || state.selectedRest?.id || null,
        reviewSessionId: payload.sessionId || null,
      };
    case "RESET_TABLE_SESSION":
      // Resetare completa dupa plata - pastreaza datele pentru review
      return { ...state, orderTableNum: null, tableSessionId: null, cart: [] };
    case "SET_ORDER_TABLE":
      return { ...state, orderTableNum: payload };
    case "SET_TABLE_SESSION":
      return { ...state, tableSessionId: payload };

    // ── Coș ──
    case "CART_ADD": {
      const ex = state.cart.find((i) => i.id === payload.id);
      return {
        ...state,
        cart: ex
          ? state.cart.map((i) =>
              i.id === payload.id ? { ...i, qty: i.qty + 1 } : i,
            )
          : [...state.cart, { ...payload, qty: 1 }],
      };
    }
    case "CART_REMOVE": {
      const ex = state.cart.find((i) => i.id === payload);
      return {
        ...state,
        cart:
          ex?.qty === 1
            ? state.cart.filter((i) => i.id !== payload)
            : state.cart.map((i) =>
                i.id === payload ? { ...i, qty: i.qty - 1 } : i,
              ),
      };
    }
    case "CART_CLEAR":
      return { ...state, cart: [] }; // păstrăm orderTableNum și tableSessionId pentru comenzi multiple
    case "SET_SAVED_CART":
      return { ...state, savedCart: payload };

    // ── Comenzi ──
    case "PLACE_ORDER":
      return { ...state, cart: [], orders: [...state.orders, payload] };
    case "ORDER_UPDATE":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === payload.id
            ? {
                ...o,
                status: payload.status,
                waiterId: payload.waiterId,
                waiterName: payload.waiterName,
              }
            : o,
        ),
      };
    case "ORDER_REMOVE":
      return { ...state, orders: state.orders.filter((o) => o.id !== payload) };

    // ── Notificări ──
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    case "SET_UNREAD":
      return { ...state, unreadCount: payload };
    case "MARK_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      };

    // ── Rezervări ──
    case "RES_FORM":
      return { ...state, resForm: { ...state.resForm, ...payload } };
    case "RES_CONFIRM": {
      const { restId, slot, tableId } = payload;
      return {
        ...state,
        reservations: {
          ...state.reservations,
          [restId]: {
            ...(state.reservations[restId] || {}),
            [slot]: [...(state.reservations[restId]?.[slot] || []), tableId],
          },
        },
        resForm: { ...state.resForm, done: true },
      };
    }
    case "RES_RESET":
      return {
        ...state,
        resForm: {
          date: "",
          persons: 2,
          time: "",
          floorIdx: 0,
          tableId: null,
          done: false,
        },
      };

    // ── Restaurante proprietar ──
    case "SET_MY_RESTAURANTS":
      return { ...state, myRestaurants: payload };
    case "ADD_MY_RESTAURANT":
      return { ...state, myRestaurants: [...state.myRestaurants, payload] };

    // ── Admin planșeu ──
    case "ADMIN_SET_FLOORS":
      return { ...state, adminFloors: payload };
    case "ADMIN_SET_FLOOR_IDX":
      return { ...state, adminFloorIdx: payload, selectedNode: null };
    case "ADMIN_SET_NODE":
      return { ...state, selectedNode: payload };
    case "ADMIN_ADD_FLOOR": {
      const newId = Math.max(...state.adminFloors.map((f) => f.id), 0) + 1;
      const newNum = state.adminFloors.filter(
        (f) => f.type !== "terrace",
      ).length;
      return {
        ...state,
        adminFloors: [
          ...state.adminFloors,
          {
            id: newId,
            name: `Etaj ${newNum}`,
            tables: [],
            elements: [],
            type: "indoor",
          },
        ],
        adminFloorIdx: state.adminFloors.length,
      };
    }
    case "ADMIN_ADD_TABLE": {
      const floor = state.adminFloors[state.adminFloorIdx];
      const tableNum = (floor.tables?.length || 0) + 1;
      const prefix = floor.type === "terrace" ? "E" : "T";
      const newTable = {
        id: `t_${Date.now()}`,
        label: `${prefix}${tableNum}`,
        seats: payload.seats,
        x: 20 + (tableNum % 5) * 60,
        y: 20 + Math.floor(tableNum / 5) * 70,
      };
      return {
        ...state,
        adminFloors: state.adminFloors.map((f, i) =>
          i === state.adminFloorIdx
            ? { ...f, tables: [...(f.tables || []), newTable] }
            : f,
        ),
      };
    }
    case "ADMIN_ADD_ELEMENT": {
      return {
        ...state,
        adminFloors: state.adminFloors.map((f, i) =>
          i === state.adminFloorIdx
            ? { ...f, elements: [...(f.elements || []), payload] }
            : f,
        ),
      };
    }
    case "ADMIN_MOVE_NODE": {
      const { nodeId, x, y } = payload;
      return {
        ...state,
        adminFloors: state.adminFloors.map((f, i) => {
          if (i !== state.adminFloorIdx) return f;
          return {
            ...f,
            tables: (f.tables || []).map((t) =>
              t.id === nodeId ? { ...t, x, y } : t,
            ),
            elements: (f.elements || []).map((e) =>
              e.id === nodeId ? { ...e, x, y } : e,
            ),
          };
        }),
      };
    }
    case "ADMIN_DELETE_NODE": {
      return {
        ...state,
        selectedNode: null,
        adminFloors: state.adminFloors.map((f, i) => {
          if (i !== state.adminFloorIdx) return f;
          return {
            ...f,
            tables: (f.tables || []).filter((t) => t.id !== payload),
            elements: (f.elements || []).filter((e) => e.id !== payload),
          };
        }),
      };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Încarcă coșul salvat la login ──
  useEffect(() => {
    const userId = state.user?.id;
    if (!userId) {
      dispatch({ type: "SET_SAVED_CART", payload: null });
      return;
    }
    supabase
      .from("cart_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].items?.length > 0) {
          dispatch({ type: "SET_SAVED_CART", payload: data[0] });
        }
      });
  }, [state.user?.id]);

  // ── Salvează coșul în Supabase când se modifică ──
  useEffect(() => {
    const userId = state.user?.id;
    const restId = state.selectedRest?.id;
    if (!userId || !restId) return;
    if (state.cart.length === 0) {
      // Șterge coșul salvat când e gol
      supabase
        .from("cart_sessions")
        .delete()
        .eq("user_id", userId)
        .then(() => {
          dispatch({ type: "SET_SAVED_CART", payload: null });
        });
      return;
    }
    // Upsert coșul curent
    supabase
      .from("cart_sessions")
      .upsert(
        {
          user_id: userId,
          restaurant_id: restId,
          restaurant_name: state.selectedRest?.name || "",
          table_label: state.orderTableNum || null,
          items: state.cart,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .then(() => {});
  }, [state.cart, state.orderTableNum]);

  const navigate = useCallback(
    (screen) => dispatch({ type: "NAVIGATE", payload: screen }),
    [],
  );
  const showToast = useCallback((msg) => {
    dispatch({ type: "SET_TOAST", payload: msg });
    setTimeout(() => dispatch({ type: "SET_TOAST", payload: null }), 3000);
  }, []);
  const isLocked = useCallback(
    (feature) => {
      const plan = state.user?.plan || "free";
      const locked = { orders: ["free"], multifloor: ["free"] };
      return locked[feature]?.includes(plan);
    },
    [state.user],
  );

  const cartTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);
  const placeOrderRef = useRef(null);
  const requestBillRef = useRef(null);
  const [payNoteShow, setPayNoteShow] = useState(false);
  const [payNoteActiveOrder, setPayNoteActiveOrder] = useState(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const waiterTimerRef = useRef(null);

  const callWaiter = useCallback(
    async (activeOrder) => {
      if (!activeOrder || waiterCooldown > 0) return;
      try {
        await supabase.from("notifications").insert({
          restaurant_id: activeOrder.restaurant_id,
          type: "waiter_call",
          message: `🔔 Masa ${activeOrder.table_label} cheamă ospătarul`,
          is_read: false,
        });
        setWaiterCalled(true);
        setWaiterCooldown(300);
        if (waiterTimerRef.current) clearInterval(waiterTimerRef.current);
        waiterTimerRef.current = setInterval(() => {
          setWaiterCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(waiterTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (e) {}
    },
    [waiterCooldown],
  );

  const cookingCount = state.orders.filter(
    (o) => o.status === "cooking",
  ).length;

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        navigate,
        showToast,
        isLocked,
        cartTotal,
        cartCount,
        cookingCount,
        placeOrderRef,
        requestBillRef,
        payNoteShow,
        setPayNoteShow,
        payNoteActiveOrder,
        setPayNoteActiveOrder,
        waiterCalled,
        waiterCooldown,
        callWaiter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
