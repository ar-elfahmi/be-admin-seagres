"use client";

import Image from "next/image";
import { Printer, QrCode } from "lucide-react";
import * as QRCodeLibrary from "qrcode";
import { useEffect, useState, type FormEvent } from "react";

interface TraceCardProps {
  barcode: string;
  productName: string;
  url: string;
}

export default function TraceCard({ barcode, productName, url }: TraceCardProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // QR scanner di HP butuh origin absolut; URL relatif akan gagal.
        const absolute = new URL(url, window.location.origin).toString();
        const data = await QRCodeLibrary.toDataURL(absolute, {
          width: 220,
          margin: 1,
          color: { dark: "#1e5aa8", light: "#ffffff" },
        });
        if (!cancelled) setQrUrl(data);
      } catch {
        if (!cancelled) setQrUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  function print(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      window.print();
    } finally {
      window.setTimeout(() => setBusy(false), 800);
    }
  }

  return (
    <form className="trace-card" onSubmit={print}>
      <span className="trace-card-head">
        <QrCode aria-hidden="true" /> Kartu telusur produk
      </span>
      <span className="trace-card-qr">
        {qrUrl ? (
          <Image src={qrUrl} alt={`QR kartu telusur ${productName}`} width={140} height={140} unoptimized />
        ) : (
          <span>Menyiapkan QR…</span>
        )}
      </span>
      <span className="trace-card-name">{productName}</span>
      <span className="trace-card-code">{barcode}</span>
      <button type="submit" className="primary-button" disabled={busy}>
        <Printer /> {busy ? "Mencetak…" : "Cetak label"}
      </button>
    </form>
  );
}