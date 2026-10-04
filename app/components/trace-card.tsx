"use client";

import Image from "next/image";
import { Download, Printer, QrCode } from "lucide-react";
import * as QRCodeLibrary from "qrcode";
import { useEffect, useState, type FormEvent } from "react";

interface TraceCardProps {
  barcode: string;
  productName: string;
  url: string;
  compact?: boolean;
  downloadable?: boolean;
}

export default function TraceCard({ barcode, productName, url, compact = false, downloadable = false }: TraceCardProps) {
  const [qr, setQr] = useState<{ target: string; compact: boolean; image: string; error: boolean } | null>(null);
  const current = qr?.target === url && qr.compact === compact ? qr : null;
  const qrUrl = current?.image || "";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const absolute = new URL(url, window.location.origin).toString();
        const data = await QRCodeLibrary.toDataURL(absolute, {
          width: compact ? 120 : 220,
          margin: 1,
          color: { dark: "#1e5aa8", light: "#ffffff" },
        });
        if (!cancelled) setQr({ target: url, compact, image: data, error: false });
      } catch {
        if (!cancelled) setQr({ target: url, compact, image: "", error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, compact]);

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
    <form className={compact ? "trace-card trace-card-compact" : "trace-card"} onSubmit={print}>
      <span className="trace-card-head">
        <QrCode aria-hidden="true" /> Kartu telusur
      </span>
      <span className="trace-card-qr">
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt={`QR kartu telusur ${productName}`}
            width={compact ? 120 : 140}
            height={compact ? 120 : 140}
            unoptimized
          />
        ) : (
          <span role="status">{current?.error ? "QR belum dapat dibuat. Muat ulang halaman untuk mencoba lagi." : "Menyiapkan QR…"}</span>
        )}
      </span>
      <span className="trace-card-name">{productName}</span>
      <span className="trace-card-code">{barcode}</span>
      <button type="submit" className="primary-button" disabled={busy || !qrUrl}>
        <Printer /> {busy ? "Mencetak…" : "Cetak label"}
      </button>
      {downloadable && qrUrl ? <a href={qrUrl} download={`${barcode}.png`} className="sg-secondary"><Download size={17} />Simpan QR</a> : null}
    </form>
  );
}
