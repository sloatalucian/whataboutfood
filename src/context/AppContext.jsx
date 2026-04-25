import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { supabase } from "../supabase";
import { TIME_SLOTS } from "../data/constants";

const genFakeRsvp = (floors) => {
  const r = {};
  TIME_SLOTS.forEach((slot) => {
    r[slot] = [];
    (floors || []).forEach((fl) =>
      (fl.tables || []).forEach((t) => {
        if (Math.random() < 0.28) r[slot].push(t.id);
      }),
    );
  });
  return r;
};

const INITIAL = {
  screen: "home",
  selectedRest: null,
  user: null,
  restaurants: [],
  loadingRests: true,
  reservations: {},
  resForm: {
    date: "",
    time: "",
    persons: 2,
    floorIdx: 0,
    tableId: null,
    done: false,
  },
  cart: [],
  orderTableNum: 1,
  orders: [],
  showPayment: false,
  paid: false,
  payMethod: null,
  activeMenuCat: null,
  adminFloors: [],
  adminFloorIdx: 0,
  selectedNode: null,
  toast: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.payload };
    case "SET_REST":
      return {
        ...state,
        selectedRest: action.payload,
        resForm: INITIAL.resForm,
        cart: [],
        showPayment: false,
        paid: false,
      };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_RESTAURANTS":
      return {
        ...state,
        restaurants: action.payload,
        loadingRests: false,
        reservations: Object.fromEntries(
          action.payload.map((r) => [r.id, genFakeRsvp(r.floors || [])]),
        ),
      };
    case "RES_FORM":
      return { ...state, resForm: { ...state.resForm, ...action.payload } };
    case "RES_CONFIRM": {
      const { restId, slot, tableId } = action.payload;
      return {
        ...state,
        reservations: {
          ...state.reservations,
          [restId]: {
            ...state.reservations[restId],
            [slot]: [...(state.reservations[restId]?.[slot] || []), tableId],
          },
        },
        resForm: { ...state.resForm, done: true },
      };
    }
    case "RES_RESET":
      return { ...state, resForm: INITIAL.resForm };
    case "CART_ADD": {
      const item = action.payload;
      const ex = state.cart.find((i) => i.id === item.id);
      return {
        ...state,
        cart: ex
          ? state.cart.map((i) =>
              i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
            )
          : [...state.cart, { ...item, qty: 1 }],
      };
    }
    case "CART_REMOVE": {
      const id = action.payload;
      const ex = state.cart.find((i) => i.id === id);
      return {
        ...state,
        cart:
          ex?.qty > 1
            ? state.cart.map((i) =>
                i.id === id ? { ...i, qty: i.qty - 1 } : i,
              )
            : state.cart.filter((i) => i.id !== id),
      };
    }
    case "CART_CLEAR":
      return { ...state, cart: [] };
    case "SET_ORDER_TABLE":
      return { ...state, orderTableNum: action.payload };
    case "SET_MENU_CAT":
      return { ...state, activeMenuCat: action.payload };
    case "PLACE_ORDER":
      return {
        ...state,
        orders: [...state.orders, action.payload],
        cart: [],
        showPayment: false,
      };
    case "ORDER_UPDATE":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? { ...o, ...action.payload } : o,
        ),
      };
    case "ORDER_REMOVE":
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.payload),
      };
    case "SET_PAYMENT":
      return { ...state, showPayment: action.payload };
    case "SET_PAID":
      return {
        ...state,
        paid: action.payload.paid,
        payMethod: action.payload.method,
      };
    case "ADMIN_SET_FLOORS":
      return { ...state, adminFloors: action.payload };
    case "ADMIN_SET_FLOOR_IDX":
      return { ...state, adminFloorIdx: action.payload, selectedNode: null };
    case "ADMIN_SET_NODE":
      return { ...state, selectedNode: action.payload };
    case "ADMIN_ADD_TABLE": {
      const { seats } = action.payload;
      const newId =
        Math.max(
          0,
          ...state.adminFloors.flatMap((f) => f.tables.map((t) => t.id)),
        ) + 1;
      const prefix = seats === 8 ? "G" : seats === 2 ? "B" : "T";
      return {
        ...state,
        adminFloors: state.adminFloors.map((fl, i) =>
          i !== state.adminFloorIdx
            ? fl
            : {
                ...fl,
                tables: [
                  ...fl.tables,
                  {
                    id: newId,
                    x: 50,
                    y: 50,
                    seats,
                    label: `${prefix}${newId}`,
                  },
                ],
              },
        ),
      };
    }
    case "ADMIN_MOVE_TABLE": {
      const { tableId, x, y } = action.payload;
      return {
        ...state,
        adminFloors: state.adminFloors.map((fl, i) =>
          i !== state.adminFloorIdx
            ? fl
            : {
                ...fl,
                tables: fl.tables.map((t) =>
                  t.id === tableId ? { ...t, x, y } : t,
                ),
              },
        ),
      };
    }
    case "ADMIN_DELETE_TABLE":
      return {
        ...state,
        adminFloors: state.adminFloors.map((fl, i) =>
          i !== state.adminFloorIdx
            ? fl
            : {
                ...fl,
                tables: fl.tables.filter((t) => t.id !== state.selectedNode),
              },
        ),
        selectedNode: null,
      };
    case "ADMIN_ADD_FLOOR": {
      const newId = Math.max(0, ...state.adminFloors.map((f) => f.id)) + 1;
      return {
        ...state,
        adminFloors: [
          ...state.adminFloors,
          { id: newId, name: `Etaj ${newId - 1}`, tables: [] },
        ],
        adminFloorIdx: state.adminFloors.length,
      };
    }
    case "TOAST":
      return { ...state, toast: action.payload };
    case "TOAST_CLEAR":
      return { ...state, toast: null };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // ── Încarcă restaurantele din Supabase ──
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const { data: rests, error } = await supabase
          .from("restaurants")
          .select("*")
          .order("created_at");

        if (error) throw error;

        // Încarcă etajele și mesele pentru fiecare restaurant
        const restsWithFloors = await Promise.all(
          rests.map(async (rest) => {
            const { data: floors } = await supabase
              .from("floors")
              .select("*, tables(*)")
              .eq("restaurant_id", rest.id)
              .order("floor_order");

            return { ...rest, floors: floors || [], tags: rest.tags || [] };
          }),
        );

        dispatch({ type: "SET_RESTAURANTS", payload: restsWithFloors });
      } catch (err) {
        console.error("Eroare la încărcarea restaurantelor:", err);
        // Fallback la date hardcodate dacă Supabase nu răspunde
        const { RESTAURANTS } = await import("../data/restaurants");
        dispatch({ type: "SET_RESTAURANTS", payload: RESTAURANTS });
      }
    };

    loadRestaurants();
  }, []);

  const showToast = useCallback((msg) => {
    dispatch({ type: "TOAST", payload: msg });
    setTimeout(() => dispatch({ type: "TOAST_CLEAR" }), 2500);
  }, []);

  const navigate = useCallback((screen) => {
    dispatch({ type: "SET_SCREEN", payload: screen });
  }, []);

  const cartTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);
  const cookingCount = state.orders.filter(
    (o) => o.status === "cooking",
  ).length;

  const isLocked = useCallback(
    (feature) => {
      if (!state.user) return false;
      const plan = state.user.plan || "free";
      if (plan === "pro" || plan === "business") return false;
      return !!{
        orders: true,
        waiter: true,
        editorAdvanced: true,
        multifloor: true,
      }[feature];
    },
    [state.user],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        showToast,
        navigate,
        cartTotal,
        cartCount,
        cookingCount,
        isLocked,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
