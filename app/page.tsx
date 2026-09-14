import { listLots, listOrderViews, listPrices } from "../lib/queries";
import { toPublicUser } from "../lib/rows";
import { currentUser } from "../lib/session";
import AuthScreen from "./components/auth-screen";
import Storefront from "./components/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) return <AuthScreen />;

  const pUser = toPublicUser(user);
  if (!pUser) return <AuthScreen />;

  const [initialLots, initialOrders, prices] = await Promise.all([
    listLots(),
    listOrderViews(),
    listPrices(),
  ]);

  return (
    <Storefront
      user={pUser}
      initialLots={initialLots}
      initialOrders={initialOrders}
      prices={prices}
    />
  );
}
