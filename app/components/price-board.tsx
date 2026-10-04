"use client";

import Image from "next/image";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import type { Price } from "../../lib/types";
import { priceDay, offsetPriceDay } from "../../lib/price-periods";

const money = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
export default function PriceBoard({ prices, dateRange }: {
  prices: Price[]; dateRange: { min: string; max: string };
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const rows = selectedDate ? prices.filter((price) => price.reportedAt && priceDay(new Date(price.reportedAt)) === selectedDate) : prices;
  const label = selectedDate ? new Date(selectedDate + "T12:00:00+07:00").toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }) : "Referensi terakhir";
  function step(amount: number) {
    if (!selectedDate) return;
    const next = offsetPriceDay(selectedDate, amount);
    if (next >= dateRange.min && next <= dateRange.max) setSelectedDate(next);
  }
  return <div className="price-hero-board">
    <div className="sg-section-heading"><div><h2>Harga pesisir</h2><p>Informasi harga mitra lokal · per kg</p></div><Scale size={25} /></div>
    <div className="price-date-filter">
      <label htmlFor="price-date"><CalendarDays size={16} />Tanggal laporan</label>
      <div className="price-date-controls">
        <button className="sg-icon-button" type="button" aria-label="Hari sebelumnya" disabled={!selectedDate || selectedDate <= dateRange.min} onClick={() => step(-1)}><ChevronLeft size={19} /></button>
        <input id="price-date" aria-label="Pilih tanggal harga pesisir" type="date" min={dateRange.min} max={dateRange.max} value={selectedDate} onChange={(event) => {
          const value = event.target.value;
          if (!value || (value >= dateRange.min && value <= dateRange.max)) setSelectedDate(value);
        }} />
        <button className="sg-icon-button" type="button" aria-label="Hari berikutnya" disabled={!selectedDate || selectedDate >= dateRange.max} onClick={() => step(1)}><ChevronRight size={19} /></button>
      </div>
      <div className="price-date-actions"><button type="button" className="sg-text-button" onClick={() => setSelectedDate(dateRange.max)}>Hari ini</button><button type="button" className="sg-text-button" aria-pressed={!selectedDate} onClick={() => setSelectedDate("")}>Referensi terakhir</button></div>
    </div>
    <div className="hero-prices" aria-live="polite" aria-atomic="true">
      <p className="price-results-label">{label}</p>
      {rows.length ? <ul className="price-information">{rows.map((price, index) => <li key={`${price.name}-${price.source}-${index}`} className="hero-price-row">
        <span className="hero-price-image">{price.image ? <Image src={price.image} alt="" fill unoptimized sizes="44px" /> : <Scale size={24} />}</span>
        <span><strong>{price.name}</strong><small>{price.source}</small><small>{price.reportedAt ? new Date(price.reportedAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }) : "Belum ada tanggal laporan"}</small></span>
        <b>Rp{money.format(price.price)}<small>/kg</small></b>
      </li>)}</ul> : <div className="price-no-data"><CalendarDays size={24} /><strong>Belum ada laporan pada {label}.</strong><p>Harga tidak diisi otomatis. Pilih tanggal lain atau lihat referensi terakhir yang tersedia.</p></div>}
    </div>
    <p className="hero-price-note">{selectedDate ? "Hanya laporan pada tanggal terpilih yang ditampilkan. " : "Harga tanpa tanggal tidak dianggap sebagai laporan hari ini. "}Harga dapat berubah saat ada laporan baru. Informasi ini bukan harga resmi pasar atau harga transaksi; ongkir belum termasuk.</p>
  </div>;
}
