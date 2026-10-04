"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, Fish, MapPin, Package, QrCode, Scale, Search, Shell, Shrimp } from "lucide-react";
import type { CatalogProduct, Price, PublicUser } from "../../lib/types";
import { MarketHeader, MarketFooter } from "./market-navigation";
import { BuyerReport } from "./buyer-report";
import { filterCatalog } from "../../lib/buyer-catalog";
import PriceBoard from "./price-board";

const FILTERS = ["Semua", "Bandeng", "Udang", "Kerang", "Olahan"];
const money = new Intl.NumberFormat("id-ID");
const PAGE_SIZE = 6;
function CategoryIcon({ type }: { type: string }) {
  const Icon = type === "Bandeng" ? Fish : type === "Udang" ? Shrimp : type === "Kerang" ? Shell : type === "Olahan" ? Package : Scale;
  return <Icon size={20} aria-hidden="true" />;
}

export default function Storefront({ user, initialProducts: products, prices, dateRange }: {
  user: PublicUser; initialProducts: CatalogProduct[]; prices: Price[];
  dateRange: { min: string; max: string };
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [sort, setSort] = useState("terbaru");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sorted = filterCatalog(products, query, filter, sort);
  function search(value: string) { setQuery(value); setLimit(PAGE_SIZE); }
  function category(value: string) { setFilter(value); setLimit(PAGE_SIZE); }
  function browse(name = "") {
    search(name); category("Semua");
    document.getElementById("katalog")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return <main className="sg-app">
    <MarketHeader user={user} query={query} onSearch={search} />
    <div className="sg-market">
      <section className="price-hero" id="harga" aria-labelledby="hero-title">
        <div className="price-hero-story">
          <Image src="/brand/seagres-hero.png" alt="Nelayan dengan hasil tangkapan di pesisir" fill preload unoptimized sizes="(max-width: 760px) 100vw, 600px" />
          <div className="price-hero-shade" />
          <div className="price-hero-copy"><span className="hero-location"><MapPin size={16} /> Pesisir Gresik</span><h1 id="hero-title">Kenali harganya.<br />Temukan hasil lautnya.</h1><p>Harga referensi dari mitra lokal, untuk membantu kamu membandingkan sebelum memesan.</p><button className="sg-primary hero-browse" onClick={() => browse()}>Jelajahi katalog <ArrowRight size={19} /></button></div>
        </div>
        <PriceBoard prices={prices} dateRange={dateRange} />
      </section>

      <div className="market-benefits"><span><Scale size={20} /><span>Harga per grade & sumber</span></span><span><QrCode size={20} /><span>Riwayat produk dapat ditelusuri</span></span><span><Package size={20} /><span>Sub-produk per nelayan</span></span></div>

      <section className="sg-catalog" id="katalog" aria-labelledby="catalog-title">
        <div className="sg-page-heading"><div><h2 id="catalog-title">Katalog hasil pesisir</h2><p>Semua produk pengepul, dengan sumber nelayan dan harga per grade di detail produk.</p></div></div>
        <div className="catalog-toolbar">
          <div className="sg-categories" role="group" aria-label="Komoditas">{FILTERS.map((name) => <button key={name} className={filter === name ? "is-selected" : ""} aria-pressed={filter === name} onClick={() => category(name)}><CategoryIcon type={name} />{name}</button>)}</div>
          <div className="sg-sort"><label htmlFor="catalog-sort">Urutkan</label><select id="catalog-sort" value={sort} onChange={(e) => { setSort(e.target.value); setLimit(PAGE_SIZE); }}><option value="terbaru">Terbaru</option><option value="murah">Harga terendah</option><option value="stok">Stok terbanyak</option></select></div>
        </div>
        <div className="catalog-context" aria-live="polite"><span>{sorted.length} produk{query ? ` untuk “${query}”` : ""}</span>{query || filter !== "Semua" ? <button className="sg-text-button" onClick={() => { search(""); category("Semua"); }}>Hapus filter</button> : null}</div>
        <div className="sg-product-grid">{sorted.slice(0, limit).map((product) => <Link key={product.id} href={`/produk/${encodeURIComponent(product.id)}`} className="sg-product">
          <div className="sg-product-photo"><Image src={product.image || "/products/bandeng.png"} alt={product.name} fill unoptimized sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 280px" />{product.available <= 0 ? <span className="product-availability">Stok habis</span> : product.coret && product.coret > product.price && (product.minPrice === null || (product.minPrice === product.price && product.maxPrice === product.price)) ? <span className="product-discount">−{Math.round((1 - product.price / product.coret) * 100)}%</span> : null}</div>
          <div className="sg-product-info"><h3>{product.name}</h3><p className="sg-product-seller">{product.organization}</p><p className="sg-product-price">{product.minPrice !== product.maxPrice ? <span className="buyer-price-prefix">Mulai </span> : null}Rp{money.format(product.minPrice ?? product.price)}<small>/kg</small></p>{product.coret && product.coret > product.price && (product.minPrice === null || (product.minPrice === product.price && product.maxPrice === product.price)) ? <s>Rp{money.format(product.coret)}</s> : null}<span className="sg-product-location"><MapPin size={14} />{product.location}</span><div className="sg-product-bottom"><span><><QrCode size={15} /> Kartu telusur</></span><b>{money.format(product.available)} kg</b></div></div>
        </Link>)}</div>
        {!sorted.length ? <div className="sg-empty"><Search size={35} /><h3>Produk tidak ditemukan</h3><p>Ganti kata kunci atau hapus filter untuk melihat produk lain.</p><button className="sg-secondary" onClick={() => { search(""); category("Semua"); }}>Lihat semua produk</button></div> : null}
        {limit < sorted.length ? <button className="sg-secondary sg-load-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Muat lebih banyak <ChevronDown size={18} /><small>{sorted.length - Math.min(limit, sorted.length)} produk lainnya</small></button> : sorted.length ? <p className="catalog-end">Semua {sorted.length} produk sudah ditampilkan.</p> : null}
      </section>

      <div className="market-support"><p>Ada kendala data atau mutu produk?</p><BuyerReport /></div>
      <MarketFooter />
    </div>
  </main>;
}
