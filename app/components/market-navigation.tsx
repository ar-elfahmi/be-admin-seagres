"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, Scale, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { logout } from "../actions";
import type { PublicUser } from "../../lib/types";
import SeagresLogo from "./seagres-logo";

export function MarketHeader({ user, query, onSearch }: {
  user: PublicUser; query?: string; onSearch?: (value: string) => void;
}) {
  const path = usePathname();
  const links = [{ href: "/dashboard", label: "Katalog", Icon: Home }, { href: "/dashboard#harga", label: "Harga pesisir", Icon: Scale }];
  return <>
    <header className="sg-header">
      <div className="sg-header-inner">
        <Link href="/dashboard" className="sg-brand" aria-label="SeaGres beranda">
          <SeagresLogo size={34} /><strong>SeaGres</strong>
        </Link>
        <nav className="sg-desktop-nav" aria-label="Navigasi utama">
          {links.map(({ href, label }) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
        </nav>
        {onSearch ? <form className="sg-search" onSubmit={(e) => { e.preventDefault(); document.getElementById("katalog")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
          <Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="header-search">Cari produk atau kelompok</label>
          <input id="header-search" value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Cari hasil pesisir" />
          <button type="submit" aria-label="Cari di katalog"><Search size={18} /></button>
        </form> : <span className="sg-header-spacer" />}
        <Link href="/profil" className="sg-account" aria-label={`Profil ${user.name}`}><span>{user.initials}</span><div><strong>{user.name}</strong><small>Pembeli</small></div></Link>
      </div>
    </header>
    <nav className="sg-mobile-nav" aria-label="Navigasi seluler">
      {links.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "page" : undefined}><Icon size={21} /><span>{label}</span></Link>)}
      <Link href="/profil" aria-current={path === "/profil" ? "page" : undefined}><UserRound size={21} /><span>Akun</span></Link>
    </nav>
  </>;
}

export function MarketFooter() {
  return <footer className="sg-footer" id="tentang">
    <div><Link href="/dashboard" className="sg-brand"><SeagresLogo size={30} /><strong>SeaGres</strong></Link><p>Mempertemukan hasil pesisir Gresik dengan pembeli lokal, melalui katalog produk dan informasi asal hasil laut.</p></div>
    <div><h2>Tentang SeaGres</h2><p>Katalog hasil pesisir dari berbagai pengepul, dengan sub-produk per nelayan, harga per grade, dan riwayat proses yang dilengkapi bukti.</p><small>Preorder dan role verifikator masih dalam pengembangan. Harga referensi bukan harga resmi pasar.</small></div>
    <nav aria-label="Tautan footer"><Link href="/dashboard#katalog">Katalog produk</Link><Link href="/dashboard#harga">Harga pesisir</Link><Link href="/profil">Profil pembeli</Link></nav>
  </footer>;
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <div><button className="sg-secondary" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try { await logout(); router.push("/"); router.refresh(); }
    catch { setError("Belum bisa keluar. Coba lagi."); }
    finally { setBusy(false); }
  }}><LogOut size={18} />{busy ? "Keluar…" : "Keluar dari akun"}</button>{error ? <p className="form-error" role="alert">{error}</p> : null}</div>;
}
