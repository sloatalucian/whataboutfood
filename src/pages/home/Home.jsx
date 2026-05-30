import { useApp } from "../context/AppContext";
import HomeOwner from "./HomeOwner";
import HomeClient from "./HomeClient";

export default function Home({ onLogout }) {
  const { state } = useApp();
  const { user } = state;
  if (user?.role === "owner" || user?.role === "superadmin")
    return <HomeOwner onLogout={onLogout} />;
  return <HomeClient />;
}
