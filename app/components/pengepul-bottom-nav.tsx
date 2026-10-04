"use client";

import { useRouter } from "next/navigation";
import { Home, LayoutGrid, Plus, ShoppingCart, UserRound } from "lucide-react";

interface PengepulBottomNavProps {
  newOrders?: number;
  onHome?: () => void;
  onSummary?: () => void;
  onAdd?: () => void;
  onOrders?: () => void;
  onAccount?: () => void;
}

export default function PengepulBottomNav({
  newOrders = 0,
  onHome,
  onSummary,
  onAdd,
  onOrders,
  onAccount,
}: PengepulBottomNavProps) {
  const router = useRouter();

  const goDashboard = () => router.push("/dashboard");

  return (
    <nav className="bottom-nav" aria-label="Navigasi seluler pengepul">
      <button className="active" type="button" onClick={onHome ?? goDashboard}>
        <Home />
        <span>Beranda</span>
      </button>
      <button type="button" onClick={onSummary ?? goDashboard}>
        <LayoutGrid />
        <span>Ringkasan</span>
      </button>
      <button className="bottom-sell" type="button" onClick={onAdd ?? goDashboard} aria-label="Tambah produk">
        <Plus />
        <span>Tambah</span>
      </button>
      <button type="button" onClick={onOrders ?? goDashboard}>
        <ShoppingCart />
        <span>Pesanan</span>
        {newOrders > 0 ? <i>{newOrders}</i> : null}
      </button>
      <button type="button" onClick={onAccount ?? goDashboard}>
        <UserRound />
        <span>Akun</span>
      </button>
    </nav>
  );
}
