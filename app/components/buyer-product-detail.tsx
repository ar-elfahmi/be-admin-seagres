import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Package, QrCode, UserRound } from "lucide-react";
import type { ProductDetail, PublicUser, SubProduct } from "../../lib/types";
import { HISTORY_STAGE_LABELS } from "../../lib/types";
import { MarketHeader, MarketFooter } from "./market-navigation";
import { BuyerReport } from "./buyer-report";
import TraceCard from "./trace-card";

const money = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
export default function BuyerProductDetail({ product, user }: { product: ProductDetail; user: PublicUser }) {
  const sourcePrices = product.subProducts.filter((sub) => sub.quantity > 0 && sub.price > 0).map((sub) => sub.price);
  const minPrice = sourcePrices.length ? Math.min(...sourcePrices) : product.price;
  const maxPrice = sourcePrices.length ? Math.max(...sourcePrices) : product.price;
  const fishermen = new Map<string, SubProduct[]>();
  for (const sub of product.subProducts) {
    const name = sub.fishermanName || "Nama nelayan belum dicatat";
    fishermen.set(name, [...(fishermen.get(name) ?? []), sub]);
  }
  return <main className="sg-app">
    <MarketHeader user={user} />
    <div className="sg-workspace">
        <Link href="/dashboard#katalog" className="sg-back"><ArrowLeft size={17} />Kembali ke katalog</Link>
        {product.deletedAt ? <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-[#1e5aa8]">Produk ini diarsipkan oleh pengepul dan tidak ditawarkan di katalog. Riwayat sumber, bukti, dan QR tetap tersedia untuk penelusuran.</p> : null}
      <article className="buyer-product-detail">
        <div className="buyer-detail-photo"><Image src={product.image || "/products/bandeng.png"} alt={product.name} fill unoptimized preload sizes="(max-width: 760px) 100vw, 600px" /></div>
        <div className="sg-panel buyer-detail-copy">
          <span className="sg-status">{product.type}</span><h1>{product.name}</h1>
          <p className="sg-muted">{product.size || "Ukuran belum dicatat"}</p>
          <p className="buyer-detail-price">Rp{money.format(minPrice)}{maxPrice > minPrice ? ` – Rp${money.format(maxPrice)}` : ""}<small>/kg</small></p>
          <p className="sg-muted">{sourcePrices.length ? "Harga mengikuti sumber nelayan dan grade. Lihat rincian setiap sub-produk di bawah." : "Harga produk dicatat oleh pengepul; harga sumber yang tersedia belum dicatat."}</p>
          <div className="buyer-detail-stock"><Package size={18} /><span>{product.deletedAt ? `${money.format(product.available)} kg tercatat · diarsipkan` : product.available > 0 ? `${money.format(product.available)} kg tersedia` : "Stok belum tersedia"}</span></div>
          <div className="buyer-detail-seller"><h2>{product.organization}</h2><p><MapPin size={16} />{product.location || "Lokasi umum belum dicatat"}</p></div>
          <p className="sg-muted">Produk agregasi: hasil dari beberapa sumber nelayan dicatat dalam satu produk oleh pengepul.</p>
          <a href="#sumber-nelayan" className="sg-secondary"><QrCode size={18} />Lihat asal & mutu produk</a>
          <BuyerReport context={`Produk ${product.id} — ${product.name}`} />
        </div>
      </article>
      <div className="buyer-trace-grid">
        <div className="buyer-trace-content">
          <section className="sg-panel" id="sumber-nelayan"><div className="sg-section-heading"><div><h2>Sumber nelayan</h2><p>{product.subProducts.length} penerimaan · {fishermen.size} nama nelayan tercatat</p></div><QrCode size={22} /></div>
            {product.subProducts.length ? <div className="buyer-fisherman-groups">{[...fishermen].map(([name, subs]) => <section key={name}><div className="buyer-fisherman-heading"><UserRound size={18} /><h3>{name}</h3><span>{subs.length} penerimaan</span></div><ul className="buyer-source-list">{subs.map((sub) => <li key={sub.id}>
              <div><h3>{sub.name || sub.fishermanName}</h3><p className="sg-muted">{sub.fishermanName} · {money.format(sub.quantity)} {sub.unit}</p></div>
              <span className="sg-status">{sub.grade ? `Grade ${sub.grade}` : "Grade belum dicatat"}</span>
              <dl><div><dt>Harga sumber</dt><dd>{sub.price > 0 ? `Rp${money.format(sub.price)}/kg` : "Belum dicatat"}</dd></div><div><dt>Minimum pemesanan</dt><dd>{sub.minOrderKg} kg</dd></div><div><dt>Penanganan bersih</dt><dd>{sub.quality.cleanHandling ? "Sudah dicek" : "Belum dicek"}</dd></div><div><dt>Kemasan</dt><dd>{sub.quality.packaging || "Belum dicatat"}</dd></div><div><dt>Suhu penyimpanan</dt><dd>{sub.quality.temperature || "Belum dicatat"}</dd></div><div><dt>Pengiriman</dt><dd>{sub.quality.dispatch || "Belum dicatat"}</dd></div></dl>
              <Link href={`/trace/${encodeURIComponent(sub.barcode)}`} className="sg-text-button"><QrCode size={17} />Buka kartu telusur sumber</Link>
              <time className="sg-muted" dateTime={sub.createdAt}>{new Date(sub.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</time>
            </li>)}</ul></section>)}</div> : <p className="sg-muted">Pengepul belum mencatat sumber nelayan pada produk ini.</p>}
          </section>
          <section className="sg-panel"><h2>Riwayat produk</h2>
            {product.history.length ? <ol className="tracking-history">{product.history.map((event) => <li key={event.id}><span className="history-dot" /><div>
              <b>{event.stage ? HISTORY_STAGE_LABELS[event.stage] || event.stage : event.kind === "terima_nelayan" ? "Diterima dari nelayan" : event.kind === "jual" ? "Penjualan tercatat" : "Produk dicatat"}</b>
              <p>{event.actor}{event.note ? ` · ${event.note}` : ""}</p>
              {event.subProductId ? <p>Sumber: {product.subProducts.find((sub) => sub.id === event.subProductId)?.fishermanName || "Sub-produk sudah tidak tersedia"}</p> : null}
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</time>
              {event.points.length ? <details className="buyer-evidence"><summary>{event.points.length} bukti lokasi tercatat</summary><ul>{event.points.map((point) => <li key={point.id}><MapPin size={14} />{point.label || "Lokasi proses"} · {point.lat.toFixed(4)}, {point.lng.toFixed(4)}</li>)}</ul></details> : null}
              {event.documents.length ? <details className="buyer-evidence"><summary>{event.documents.length} dokumen pendukung</summary><ul>{event.documents.map((doc) => <li key={doc.id}><a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.filename}</a></li>)}</ul></details> : null}
            </div></li>)}</ol> : <p className="sg-muted">Belum ada riwayat produk tercatat.</p>}
          </section>
        </div>
        <aside className="buyer-trace-aside"><section className="sg-panel"><h2><QrCode size={21} />Kartu telusur produk</h2><p className="sg-muted">Pindai atau simpan QR untuk membuka data produk ini kembali.</p><TraceCard barcode={product.barcode} productName={product.name} url={`/produk/${product.id}`} downloadable /></section></aside>
      </div>
      <MarketFooter />
    </div>
  </main>;
}
