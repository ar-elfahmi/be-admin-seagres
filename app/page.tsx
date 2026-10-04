import { redirect } from "next/navigation";
import { currentUser } from "../lib/session";
import AuthScreen from "./components/auth-screen";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) return <AuthScreen />;
  redirect("/dashboard");
}