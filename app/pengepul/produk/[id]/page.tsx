import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BadgeCheck,
  FileText,
  MapPin,
  Package,
  Scale,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { getProductDetail } from "@/lib/queries";
import SeagresLogo from "@/app/components/seagres-logo";
import TraceCard from "@/app/components/trace-card";
import TerimaButton from "./terima-button";
import { HISTORY_STAGE_LABELS, type ProductDetail, type ProductHistory } from "@/lib/types";

function isLocalAsset(src: string): boolean {
  return src.startsWith("/products/") || src.startsWith("/uploads/");
}

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) return { title: "Produk tidak ditemukan · SeaGres" };
  return {
    title: `${detail.name} · Kelola sumber · SeaGres`,
    description: `Kelola sub-produk dan history untuk ${detail.name} di ${detail.organization}.`,
  };
}

const money = new Intl.NumberFormat("id-ID");

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function groupByFisherman(detail: ProductDetail) {
  const map = new Map<string, { subs: typeof detail.subProducts; events: ProductHistory[] }>();
  for (const sub of detail.subProducts) {
    const key = sub.fishermanName.trim() || "(tanpa nama)";
    const entry = map.get(key) ?? { subs: [], events: [] };
    entry.subs.push(sub);
    map.set(key, entry);
  }
  for (const event of detail.history) {
    const sub = event.subProductId ? detail.subProducts.find((row) => row.id === event.subProductId) : undefined;
    const key = (sub?.fishermanName ?? "").trim() || "(tanpa nama)";
    const entry = map.get(key) ?? { subs: [], events: [] };
    entry.events.push(event);
    map.set(key, entry);
  }
  return [...map.entries()].sort((a, b) => {
    const totalA = a[1].subs.reduce((sum, sub) => sum + sub.quantity, 0);
    const totalB = b[1].subs.reduce((sum, sub) => sum + sub.quantity, 0);
    return totalB - totalA;
  });
}

export default async function PengepulProdukPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "pengepul") redirect("/");
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();
  if (detail.pengepulId !== user.id) {
    return (
      <main className="lot-page">
        <p className="lot-foot-note">
          Produk ini bukan milikmu. <Link href="/dashboard">Kembali ke dashboard</Link>.
        </p>
      </main>
    );
  }
  const groups = groupByFisherman(detail);

  return (
    <main className="lot-page">
      <header className="lot-topbar">
        <Link href="/dashboard" className="brand">
          <SeagresLogo size={32} />
        </Link>
        <span className="lot-topbar-note">
          <Store aria-hidden="true" /> Kelola sub-produk
        </span>
        <Link href="/dashboard" className="link-button">
          ← Kembali ke dashboard
        </Link>
      </header>

      <nav className="crumb-row" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep" aria-hidden="true">›</span>
        <span className="cur">{detail.name}</span>
      </nav>

      <article className="lot-card anim">
        <div className="lot-hero">
          <Image
            src={detail.image}
            alt={detail.name}
            fill
            sizes="(max-width: 880px) 100vw, 880px"
            unoptimized={!isLocalAsset(detail.image)}
          />
        </div>
        <div className="lot-body">
          <div className="lot-head">
            <div>
              <span className="verified">
                <BadgeCheck aria-hidden="true" /> Agregasi terverifikasi
              </span>
              <h1>{detail.name}</h1>
              <p>
                {detail.barcode} · {detail.type} · {detail.size} · {detail.location}
              </p>
            </div>
            <div className="lot-price-wrap">
              <span className="lot-price">
                Rp{money.format(detail.price)}
                <small>/kg</small>
              </span>
              <span className="lot-stock">
                <Scale aria-hidden="true" /> {detail.available.toFixed(1)} kg total
              </span>
              <TerimaButton productId={detail.id} productName={detail.name} productType={detail.type} productSize={detail.size} />
            </div>
          </div>

          <section className="sub-products">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="lot-steps-title">
                <Package aria-hidden="true" /> Sumber nelayan ({groups.length} nelayan · {detail.subProducts.length} penerimaan)
              </h2>
            </div>
            {groups.length ? (
              <div className="fisherman-groups">
                {groups.map(([name, group]) => {
                  const total = group.subs.reduce((sum, sub) => sum + sub.quantity, 0);
                  return (
                    <article key={name} className="fisherman-group">
                      <header className="fisherman-group-head">
                        <span className="fisherman-avatar">
                          <UserRound aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{name}</strong>
                          <small>
                            {group.subs.length} penerimaan · {total.toFixed(1)} kg tersedia
                          </small>
                        </span>
                      </header>
                      <ol className="receipt-list">
                        {group.subs.map((sub, index) => {
                          const creation = detail.history
                            .filter((event) => event.subProductId === sub.id && event.kind !== "jual")
                            .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];
                          return (
                            <li key={sub.id} className="receipt-card">
                              <header>
                                <strong>Penerimaan {String(index + 1).padStart(2, "0")}</strong>
                                <small>{formatDateTime(creation?.createdAt ?? sub.createdAt)}</small>
                              </header>
                              <dl>
                                <div><dt>Jumlah</dt><dd>{sub.quantity.toFixed(1)} {sub.unit}</dd></div>
                                <div><dt>Harga</dt><dd>Rp{money.format(sub.price)}/kg · min. {sub.minOrderKg.toFixed(1)} kg</dd></div>
                                <div>
                                  <dt>Kualitas</dt>
                                  <dd>
                                    {sub.grade ? `Grade ${sub.grade} · ` : ""}
                                    {sub.quality.cleanHandling ? "✓ Bersih" : "⚠ Perlu cek"} · {sub.quality.packaging}
                                    {sub.quality.temperature ? ` · ${sub.quality.temperature}` : ""}
                                    {sub.quality.dispatch ? ` · ${sub.quality.dispatch}` : ""}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Lokasi</dt>
                                  <dd>
                                    {sub.geoLat !== null && sub.geoLng !== null ? (
                                      <><MapPin aria-hidden="true" /> {sub.geoLat.toFixed(4)}, {sub.geoLng.toFixed(4)}</>
                                    ) : (
                                      "Lokasi tidak diisi"
                                    )}
                                  </dd>
                                </div>
                                {creation?.note ? <div><dt>Catatan</dt><dd>{creation.note}</dd></div> : null}
                              </dl>
                              {creation && creation.documents.length ? (
                                <div className="receipt-docs">
                                  <span><FileText aria-hidden="true" /> Bukti ({creation.documents.length})</span>
                                  <ul>
                                    {creation.documents.map((doc) => (
                                      <li key={doc.id}>
                                        <a href={doc.url} target="_blank" rel="noreferrer">{doc.filename}</a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p>Belum ada sumber nelayan. Tekan Terima untuk mencatat penerimaan pertama.</p>
            )}
          </section>

          <section className="trace-history">
            <h2 className="lot-steps-title">
              <Star aria-hidden="true" /> Riwayat agregat ({detail.history.length})
            </h2>
            {detail.history.length ? (
              <ol className="trace-steps">
                {detail.history.map((event) => (
                  <li key={event.id}>
                    <b>{event.stage ? HISTORY_STAGE_LABELS[event.stage] : event.kind}</b>
                    <span>
                      {formatDateTime(event.createdAt)} · oleh {event.actor}
                      {event.note ? ` · ${event.note}` : ""}
                      {event.quantityDelta !== 0
                        ? ` · Δ ${event.quantityDelta > 0 ? "+" : ""}${event.quantityDelta.toFixed(1)} kg`
                        : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Belum ada event tercatat.</p>
            )}
          </section>

          <TraceCard barcode={detail.barcode} productName={detail.name} url={`/produk/${detail.id}`} />
        </div>
      </article>

      <p className="lot-foot-note">
        Halaman kelola pengepul SeaGres. Sub-route publik untuk pelacakan tetap di{" "}
        <Link href={`/produk/${detail.id}`}>/produk/{detail.id}</Link>.
      </p>
    </main>
  );
}
