import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, Package, QrCode } from "lucide-react";
import { getProductDetail, findSubProductByBarcode } from "@/lib/queries";
import SeagresLogo from "@/app/components/seagres-logo";
import TraceCard from "@/app/components/trace-card";
import { currentUser } from "@/lib/session";
import { toPublicUser } from "@/lib/rows";
import { MarketHeader, MarketFooter } from "@/app/components/market-navigation";

interface PageProps {
  params: Promise<{ barcode: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { barcode } = await params;
  const sub = await findSubProductByBarcode(barcode);
  if (!sub) return { title: "Penerimaan tidak ditemukan · SeaGres" };
  return {
    title: `${sub.name || sub.fishermanName} — Kartu Telusur ${sub.barcode} · SeaGres`,
    description: `Telusur ${sub.name || sub.fishermanName} dari ${sub.fishermanName}. ${sub.quantity.toFixed(1)} kg, barcode ${sub.barcode}.`,
  };
}

const money = new Intl.NumberFormat("id-ID");

function stageLabel(stage: string | null, kind: string): string {
  if (stage === "estimasi_tangkap") return "Estimasi tangkap";
  if (stage === "diambil_pengepul") return "Diambil pengepul";
  if (stage === "simpan_gudang") return "Disimpan di gudang";
  if (stage === "olah") return "Olah";
  if (stage === "kemas") return "Kemas";
  if (stage === "siap_jual") return "Siap jual";
  if (stage === "jual") return "Jual";
  if (kind === "tambah_produk") return "Tambah produk";
  if (kind === "terima_nelayan") return "Terima dari nelayan";
  if (kind === "jual") return "Jual";
  return kind;
}

export default async function TraceBarcodePage({ params }: PageProps) {
  const { barcode } = await params;
  const sub = await findSubProductByBarcode(barcode);
  if (!sub) notFound();
  const detail = await getProductDetail(sub.productId);
  if (!detail) notFound();
  const traceUrl = `/trace/${sub.barcode}`;
  const user = await currentUser();
  const buyer = user?.accountType === "customer" ? toPublicUser(user) : null;
  const events = detail.history
    .filter((event) => event.subProductId === sub.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return (
    <main className={buyer ? "sg-app" : "lot-page"}>
      {buyer ? <MarketHeader user={buyer} /> : <header className="lot-topbar">
        <Link href={`/produk/${detail.id}`} className="brand">
          <SeagresLogo size={36} showText />
        </Link>
        <span className="lot-topbar-note">
          <QrCode aria-hidden="true" /> Kartu telusur penerimaan
        </span>
      </header>}

      <div className={buyer ? "sg-workspace buyer-source-trace" : undefined}>

      <nav className="crumb-row" aria-label="Breadcrumb">
        <Link
          href={`/produk/${detail.id}`}
          className="trace-back-link"
          aria-label={`Kembali ke produk ${detail.name}`}
        >
          <ArrowLeft aria-hidden="true" />
          <span>Kembali</span>
        </Link>
        <Link href={`/produk/${detail.id}`}>{detail.name}</Link>
        <span className="sep" aria-hidden="true">›</span>
        <span className="cur">{sub.name || sub.fishermanName}</span>
      </nav>

      <article className="lot-card trace-source-card anim">
        <div className="lot-body">
          {detail.deletedAt ? <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-[#1e5aa8]">Produk diarsipkan dan tidak ditawarkan di katalog. QR ini tetap menampilkan riwayat penerimaan, proses, dan bukti.</p> : null}
          <div className="lot-head">
            <div>
              <span className="verified">
                <BadgeCheck aria-hidden="true" /> Keterlacakan per penerimaan
              </span>
              <h1>{sub.name || sub.fishermanName}</h1>
              <p>
                {sub.barcode} · Nelayan {sub.fishermanName} · Bagian dari{" "}
                <Link href={`/produk/${detail.id}`}>{detail.name}</Link>
              </p>
            </div>
            <div className="lot-price-wrap">
              <span className="lot-price">
                {sub.price > 0 ? <>Rp{money.format(sub.price)}<small>/kg</small></> : "Harga belum dicatat"}
              </span>
              <span className="lot-stock">
                <Package aria-hidden="true" /> {sub.quantity.toFixed(1)} {sub.unit}
              </span>
            </div>
          </div>

          <section className="sub-products">
            <h2 className="lot-steps-title">Detail penerimaan</h2>
            <ul className="trace-fishermen">
              <li>
                <Package aria-hidden="true" />
                <span>
                  <strong>{sub.fishermanName}</strong>
                  <small>
                    Diterima {new Date(sub.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                  </small>
                  <small>
                    {sub.grade ? `Grade ${sub.grade} · ` : ""}
                    {sub.quality.cleanHandling ? "✓ Bersih" : "⚠ Perlu cek"} · {sub.quality.packaging}
                    {sub.quality.temperature ? ` · ${sub.quality.temperature}` : ""}
                    {sub.quality.dispatch ? ` · ${sub.quality.dispatch}` : ""}
                  </small>
                  <small>
                    {sub.geoLat !== null && sub.geoLng !== null ? (
                      <><MapPin aria-hidden="true" /> {sub.geoLat.toFixed(4)}, {sub.geoLng.toFixed(4)}</>
                    ) : (
                      "Lokasi tidak diisi"
                    )}
                  </small>
                </span>
              </li>
            </ul>
          </section>

          <section className="trace-history">
            <h2 className="lot-steps-title">
              <QrCode aria-hidden="true" /> Riwayat telusur
            </h2>
            {events.length ? (
              <ol className="trace-steps">
                {events.map((event) => (
                  <li key={event.id}>
                    <b>{stageLabel(event.stage, event.kind)}</b>
                    <span>
                      {new Date(event.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                      {" · oleh "}
                      {event.actor}
                      {event.note ? ` · ${event.note}` : ""}
                      {event.quantityDelta !== 0
                        ? ` · Δ ${event.quantityDelta > 0 ? "+" : ""}${event.quantityDelta.toFixed(1)} kg`
                        : ""}
                    </span>
                    {event.points.length ? (
                      <ul>
                        {event.points.map((point) => (
                          <li key={point.id}>
                            <MapPin aria-hidden="true" /> {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                            {point.label ? ` — ${point.label}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {event.documents.length ? (
                      <ul>
                        {event.documents.map((doc) => (
                          <li key={doc.id}>
                            <a href={doc.url} target="_blank" rel="noreferrer">{doc.filename}</a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Belum ada event tercatat untuk penerimaan ini.</p>
            )}
          </section>

          <TraceCard barcode={sub.barcode} productName={sub.name || sub.fishermanName} url={traceUrl} downloadable={!!buyer} />
        </div>
      </article>

      <p className="lot-foot-note">
        Kartu telusur ini khusus untuk satu penerimaan (produk + nelayan + waktu). QR membuka data asal yang dicatat pengepul, bukan persetujuan verifikator.
      </p>
      {buyer ? <MarketFooter /> : null}
      </div>
    </main>
  );
}
