import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, QrCode, Scale } from "lucide-react";
import { currentUser } from "../../lib/session";
import { toPublicUser } from "../../lib/rows";
import { MarketHeader, MarketFooter, LogoutButton } from "../components/market-navigation";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "customer") redirect("/dashboard");
  return <main className="sg-app"><MarketHeader user={toPublicUser(user)!} /><div className="sg-workspace">
    <div className="sg-page-heading"><div><h1>Profil saya</h1><p>Identitas dan akses akun pembeli SeaGres.</p></div></div>
    <div className="profile-grid">
      <section className="sg-panel account-profile"><span className="profile-monogram">{user.initials}</span><h2>{user.name}</h2><p>{user.email}</p><dl><div><dt>Akses akun</dt><dd>Pembeli</dd></div><div><dt>Peran</dt><dd>{user.role}</dd></div><div><dt>Usaha / kelompok</dt><dd>{user.organization || "Belum diisi"}</dd></div><div><dt>Lokasi umum</dt><dd>{user.location || "Belum diisi"}</dd></div></dl><LogoutButton /></section>
      <section className="sg-panel verification-profile"><h2><BadgeCheck size={21} />Status profil</h2><span className="sg-status">{user.verified ? "Terverifikasi" : "Belum terverifikasi"}</span><p>{user.verificationBasis || "Belum ada catatan verifikasi pada profil ini."}</p><div className="sg-notice">Akun pembeli dapat menelusuri katalog, melihat kartu produk, dan melihat keterlacakan sumbernya. Pengelolaan produk dan sumber nelayan tetap milik akun pengepul. Preorder dan verifikator masih dalam pengembangan.</div><nav className="buyer-profile-links" aria-label="Aktivitas pembeli"><Link href="/dashboard#katalog"><QrCode size={20} />Katalog & kartu telusur</Link><Link href="/dashboard#harga"><Scale size={20} />Harga pesisir</Link></nav></section>
    </div><MarketFooter />
  </div></main>;
}
