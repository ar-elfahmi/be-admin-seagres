import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Package, QrCode, Truck } from "lucide-react";
import { getProductDetail } from "../../../lib/queries";
import SeagresLogo from "../../components/seagres-logo";
import TraceCard from "../../components/trace-card";
import BuyerProductDetail from "../../components/buyer-product-detail";
import { currentUser } from "../../../lib/session";
import { toPublicUser } from "../../../lib/rows";
const money = new Intl.NumberFormat("id-ID");

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);
  return {
    title: detail ? `${detail.name} — Kartu Telusur ${detail.barcode} · SeaGres` : "Produk tidak ditemukan · SeaGres",
    description: detail
      ? `Telusur ${detail.name} dari ${detail.organization}, ${detail.location}. ${detail.subProducts.length} sumber nelayan, ${detail.available.toFixed(1)} kg tersedia.`
      : undefined,
  };
}

function historyKindLabel(kind: string): string {
  if (kind === "tambah_produk") return "Tambah produk";
  if (kind === "terima_nelayan") return "Terima dari nelayan";
  if (kind === "jual") return "Jual";
  return kind;
}

export default async function ProdukPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();

  const user = await currentUser();
  if (user?.accountType === "customer") {
    return <BuyerProductDetail product={detail} user={toPublicUser(user)!} />;
  }

  const traceUrl = `/produk/${detail.id}`;

  return (
    <main className="lot-page">
      <header className="lot-topbar">
        <Link href="/" className="brand">
          <SeagresLogo size={32} />
        </Link>
        <span className="lot-topbar-note">
          <QrCode aria-hidden="true" /> Kartu telusur produk
        </span>
      </header>

      <article className="lot-card anim">
        <div className="lot-hero">
          <Image src={detail.image} alt={detail.name} fill sizes="(max-width: 880px) 100vw, 880px" unoptimized />
        </div>
        <div className="lot-body">
          {detail.deletedAt ? <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-[#1e5aa8]">Produk diarsipkan. Riwayat sumber dan QR tetap tersedia; stok tercatat tidak sedang ditawarkan di katalog.</p> : null}
          <div className="lot-head">
            <div>
              <span className="verified">
                <BadgeCheck aria-hidden="true" /> Agregasi sumber tercatat
              </span>
              <h1>{detail.name}</h1>
              <p>{detail.barcode} · {detail.type} · {detail.size}</p>
            </div>
            <div className="lot-price-wrap">
              <span className="lot-price">Rp{money.format(detail.price)}<small>/kg</small></span>
              <span className="lot-stock">Stok {detail.available.toFixed(1)} kg</span>
            </div>
          </div>

          <div className="lot-seller">
            <Truck aria-hidden="true" />
            <p>
              <strong>{detail.organization}</strong>
              <span>Pengepul · {detail.location}. Produk dicatat melalui SeaGres oleh {detail.organization}.</span>
            </p>
            <span className="lot-loc"><MapPin aria-hidden="true" /> {detail.location}</span>
          </div>

          <section className="sub-products">
            <h2 className="lot-steps-title">Sumber nelayan</h2>
            {detail.subProducts.length ? (
              <ul className="trace-fishermen">
                {detail.subProducts.map((sub) => (
                  <li key={sub.id}>
                    <Package aria-hidden="true" />
                    <span>
                      <strong>{sub.name || sub.fishermanName}</strong>
                      <small>
                        {sub.fishermanName} · {sub.quantity.toFixed(1)} {sub.unit} · Rp
                        {new Intl.NumberFormat("id-ID").format(sub.price)}/kg
                      </small>
                      <small>
                        {sub.quality.cleanHandling ? "Bersih" : "Perlu cek"} · {sub.quality.packaging}
                        {sub.quality.temperature ? ` · ${sub.quality.temperature}` : ""}
                        {sub.quality.dispatch ? ` · ${sub.quality.dispatch}` : ""}
                      </small>
                      <small>
                        {sub.geoLat !== null && sub.geoLng !== null
                          ? `${sub.geoLat.toFixed(4)}, ${sub.geoLng.toFixed(4)}`
                          : "lokasi umum"}
                      </small>
                    </span>
                    <Link href={`/trace/${sub.barcode}`} className="link-button">
                      <QrCode aria-hidden="true" /> Kartu telusur
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Belum ada data sub-produk.</p>
            )}
          </section>

          <section className="trace-history">
            <h2 className="lot-steps-title">Riwayat telusur</h2>
            {detail.history.length ? (
              <ol className="trace-steps">
                {detail.history.map((event) => (
                  <li key={event.id}>
                    <b>{historyKindLabel(event.kind)}</b>
                    <span>
                      {new Date(event.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                      {" · "}
                      oleh {event.actor}
                      {event.note ? ` · ${event.note}` : ""}
                      {event.quantityDelta !== 0 ? ` · Δ ${event.quantityDelta > 0 ? "+" : ""}${event.quantityDelta.toFixed(1)} kg` : ""}
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
              <p>Belum ada event tercatat.</p>
            )}
          </section>

          <TraceCard barcode={detail.barcode} productName={detail.name} url={traceUrl} />
        </div>
      </article>

      <p className="lot-foot-note">
        Halaman ini adalah kartu telusur produk SeaGres. Titik koordinat hanya ditampilkan untuk nelayan yang opt-in.
      </p>
    </main>
  );
}
