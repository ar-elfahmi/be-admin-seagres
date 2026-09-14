"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarDays, ShieldCheck, ShoppingCart } from "lucide-react";
import { preorder } from "../actions";

interface LotPreorderProps {
  lotId: string;
  weight: number;
  loggedIn: boolean;
  accountType: "seller" | "buyer" | null;
}

export default function LotPreorder({ lotId, weight, loggedIn, accountType }: LotPreorderProps) {
  const [quantity, setQuantity] = useState<number | string>(Math.min(5, weight));
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (weight <= 0) {
    return <p className="lot-note">Stok lot ini sudah habis. Lihat panen kelompok ini di katalog SeaGres.</p>;
  }

  if (!loggedIn) {
    return (
      <p className="lot-note">
        <Link href="/" className="lot-login-btn"><ShoppingCart /> Masuk untuk mengajukan pre-order lot ini</Link>
      </p>
    );
  }

  // Penjual hanya boleh mencatat lot; tombol pre-order hanya untuk pembeli agar
  // tidak ada pengiriman yang pasti ditolak server.
  if (accountType === "seller") {
    return (
      <p className="lot-note">
        <ShieldCheck aria-hidden="true" /> Akun penjual dapat memantau lot ini. Pre-order dilakukan dari akun pembeli.
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await preorder(lotId, quantity);
    setBusy(false);
    if (res?.error) {
      setError(res.error);
    } else if (res?.order) {
      setDone(`Pre-order ${res.order.quantity} kg tercatat. Penjual akan mengonfirmasi lewat SeaGres.`);
    }
  }

  return (
    <form className="lot-form" onSubmit={submit}>
      <label>
        Pre-order
        <span className="input-unit">
          <input
            type="number"
            min="1"
            max={weight}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <span>kg</span>
        </span>
      </label>
      <button className="primary-button glow" type="submit" disabled={busy}>
        {busy ? "Mengirim…" : <><CalendarDays /> Ajukan pre-order</>}
      </button>
      {done ? <p className="lot-ok">{done}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
