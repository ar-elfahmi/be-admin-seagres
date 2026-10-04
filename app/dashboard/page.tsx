import { redirect } from "next/navigation";
import { listCatalogProducts, listOrderViews, listPrices, listProductDetailsByPengepul } from "../../lib/queries";
import { toPublicUser } from "../../lib/rows";
import { currentUser } from "../../lib/session";
import PengepulDashboard from "../components/pengepul-dashboard";
import Storefront from "../components/storefront";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const pUser = toPublicUser(user);
  if (!pUser) redirect("/");

  if (user.accountType === "pengepul") {
    const [products, orders] = await Promise.all([
      listProductDetailsByPengepul(user.id),
      listOrderViews(),
    ]);
    return <PengepulDashboard user={pUser} products={products} orders={orders} />;
  }

  const [initialProducts, initialOrders, prices] = await Promise.all([
    listCatalogProducts(),
    listOrderViews(),
    listPrices(),
  ]);
  return (
    <Storefront
      user={pUser}
      initialProducts={initialProducts}
      initialOrders={initialOrders}
      prices={prices}
    />
  );
}