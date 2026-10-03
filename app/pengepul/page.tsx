import { redirect } from "next/navigation";
import { listOrderViews, listProductDetailsByPengepul } from "../../lib/queries";
import { toPublicUser } from "../../lib/rows";
import { currentUser } from "../../lib/session";
import PengepulDashboard from "../components/pengepul-dashboard";

export const dynamic = "force-dynamic";

export default async function PengepulPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "pengepul") redirect("/");

  const pUser = toPublicUser(user);
  if (!pUser) redirect("/");

  const [products, orders] = await Promise.all([
    listProductDetailsByPengepul(user.id),
    listOrderViews(),
  ]);

  return <PengepulDashboard user={pUser} products={products} orders={orders} />;
}