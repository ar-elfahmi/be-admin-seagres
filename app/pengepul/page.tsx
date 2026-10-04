import { redirect } from "next/navigation";
import { currentUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function PengepulPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  redirect("/dashboard");
}