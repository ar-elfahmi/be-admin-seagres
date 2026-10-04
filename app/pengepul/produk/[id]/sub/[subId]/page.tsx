import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowUpRight,
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
import AddEventForm from "@/app/components/forms/add-event-form";
import PengepulBottomNav from "@/app/components/pengepul-bottom-nav";
import { HISTORY_STAGE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; subId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, subId } = await params;
  const detail = await getProductDetail(id);
  if (!detail) return { title: "Sub-produk tidak ditemukan · SeaGres" };
  const sub = detail.subProducts.find((row) => row.id === subId);
  if (!sub) return { title: "Sub-produk tidak ditemukan · SeaGres" };
  return {
    title: `${sub.fishermanName} — ${detail.name} · SeaGres`,
    description: `Detail sub-produk ${sub.fishermanName} untuk ${detail.name}.`,
  };
}

const money = new Intl.NumberFormat("id-ID");

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

export default async function PengepulSubProductPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "pengepul") redirect("/");
  const { id, subId } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();
  if (detail.pengepulId !== user.id) {
    return (
      <main className="lot-page">
        <p className="lot-foot-note">
          Sub-produk ini bukan milikmu. <Link href="/dashboard">Kembali ke dashboard</Link>.
        </p>
      </main>
    );
  }
  const sub = detail.subProducts.find((row) => row.id === subId);
  if (!sub) notFound();

  const subHistory = detail.history.filter((event) => event.subProductId === sub.id);

  return (
    <main className="lot-page pengepul-shell">
      <header className="lot-topbar">
        <Link href="/dashboard" className="brand">
          <SeagresLogo size={32} />
        </Link>
        <span className="lot-topbar-note">
          <Store aria-hidden="true" /> Detail sub-produk
        </span>
        <Link href={`/pengepul/produk/${detail.id}`} className="link-button">
          ← Kembali ke {detail.name}
        </Link>
      </header>

      <nav className="crumb-row" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep" aria-hidden="true">›</span>
        <Link href={`/pengepul/produk/${detail.id}`}>{detail.name}</Link>
        <span className="sep" aria-hidden="true">›</span>
        <span className="cur">{sub.fishermanName}</span>
      </nav>

      <article className="lot-card anim">
        <div className="lot-body">
          <div className="lot-head">
            <div>
              <span className="verified">
                <BadgeCheck aria-hidden="true" /> Sumber tercatat
              </span>
              <h1>
                <UserRound aria-hidden="true" /> {sub.fishermanName}
              </h1>
              <p>
                Produk: <Link href={`/pengepul/produk/${detail.id}`}>{detail.name}</Link> · {detail.type} · {detail.size}
              </p>
            </div>
            <div className="lot-price-wrap">
              <span className="lot-price">Rp{money.format(sub.price)}<small>/kg</small></span>
              <span className="lot-stock">
                <Scale aria-hidden="true" /> {sub.quantity.toFixed(1)} kg tersedia
              </span>
            </div>
          </div>

          <section className="sub-products">
            <h2 className="lot-steps-title">Informasi sub-produk</h2>
            <ul className="trace-fishermen">
              <li>
                <Package aria-hidden="true" />
                <span>
                  <strong>b) Total quantity</strong>
                  <small>{sub.quantity.toFixed(1)} {sub.unit}</small>
                </span>
              </li>
              <li>
                <Package aria-hidden="true" />
                <span>
                  <strong>c) Price per minimum beli</strong>
                  <small>
                    Rp{money.format(sub.price)}/kg · minimum {sub.minOrderKg.toFixed(1)} kg
                  </small>
                </span>
              </li>
              <li>
                <Package aria-hidden="true" />
                <span>
                  <strong>d) Quality (grade)</strong>
                  <small>
                    Grade {sub.grade ?? "—"} · {sub.quality.cleanHandling ? "✓ Bersih" : "⚠ Perlu cek"}
                  </small>
                  <small>
                    Kemasan: {sub.quality.packaging}
                    {sub.quality.temperature ? ` · Suhu: ${sub.quality.temperature}` : ""}
                    {sub.quality.dispatch ? ` · Pengiriman: ${sub.quality.dispatch}` : ""}
                  </small>
                </span>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <span>
                  <strong>Lokasi</strong>
                  <small>
                    {sub.geoLat !== null && sub.geoLng !== null
                      ? `${sub.geoLat.toFixed(4)}, ${sub.geoLng.toFixed(4)}`
                      : "Lokasi tidak diisi"}
                  </small>
                </span>
              </li>
            </ul>
          </section>

          <section className="trace-history">
            <h2 className="lot-steps-title">
              <Star aria-hidden="true" /> e) History produk ({subHistory.length})
            </h2>
            {subHistory.length ? (
              <ol className="trace-steps">
                {subHistory.map((event) => (
                  <li key={event.id}>
                    <b>{event.stage ? HISTORY_STAGE_LABELS[event.stage] : event.kind}</b>
                    <span>
                      {formatDateTime(event.createdAt)} · oleh {event.actor}
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
                            <FileText aria-hidden="true" />{" "}
                            <a href={doc.url} target="_blank" rel="noreferrer">
                              {doc.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Link
                      href={`/pengepul/produk/${detail.id}/sub/${sub.id}/history/${event.id}`}
                      className="link-button"
                    >
                      Lihat detail event <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Belum ada event untuk sub-produk ini.</p>
            )}
          </section>

          <section>
            <h2 className="lot-steps-title">Catat event baru</h2>
            {detail.deletedAt ? <p className="archive-note">Produk diarsipkan. Riwayat hanya dapat dibaca. <Link href="/dashboard">Pulihkan di dashboard</Link> untuk mencatat proses baru.</p> : <AddEventForm productId={detail.id} subProductId={sub.id} actorName={user.name} productLabel={`${detail.name} — ${sub.fishermanName}`} />}
          </section>
        </div>
      </article>

      <PengepulBottomNav />
    </main>
  );
}
