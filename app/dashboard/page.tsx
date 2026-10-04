import { redirect } from "next/navigation";
import { listBuyerCatalogProducts, listSellerOrderViews, listPrices, listProductDetailsByPengepul, listRecentActivity } from "../../lib/queries";
import { priceDay, priceMonths } from "../../lib/price-periods";
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
    const [products, orders, activity] = await Promise.all([
      listProductDetailsByPengepul(user.id),
      listSellerOrderViews(user.organization),
      listRecentActivity(user.id, 8),
    ]);
    return <PengepulDashboard user={pUser} products={products} orders={orders} activity={activity} />;
  }


  const [initialProducts, prices] = await Promise.all([
    listBuyerCatalogProducts(),
    listPrices(),
  ]);
  return (
    <Storefront
      user={pUser}
      initialProducts={initialProducts}
      prices={prices}
      dateRange={{ min: priceMonths(new Date())[0].key, max: priceDay(new Date())! }}
    />
  );
}
