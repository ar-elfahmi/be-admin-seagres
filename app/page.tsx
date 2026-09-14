import { getDb, ordersView, publicUser } from "../lib/store";
import { currentUser } from "../lib/session";
import AuthScreen from "./components/auth-screen";
import Storefront from "./components/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) return <AuthScreen />;

  const db = getDb();
  const pUser = publicUser(user);
  if (!pUser) return <AuthScreen />;

  return (
    <Storefront
      user={pUser}
      initialLots={db.lots}
      initialOrders={ordersView(db)}
      prices={db.prices}
    />
  );
}
