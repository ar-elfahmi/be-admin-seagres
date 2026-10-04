import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  MapPin,
  Package,
  Plus,
  Scale,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { getProductDetail } from "@/lib/queries";
import SeagresLogo from "@/app/components/seagres-logo";
import AddFishermanForm from "@/app/components/forms/add-fisherman-form";
import { isLocalAsset } from "@/app/components/pengepul-dashboard";
import { HISTORY_STAGE_LABELS } from "@/lib/types";

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

export default async function PengepulProdukPage({ params, searchParams }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "pengepul") redirect("/");
  const { id } = await params;
  const { show } = await searchParams;
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
            </div>
          </div>

          <section className="sub-products">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="lot-steps-title">
                <Package aria-hidden="true" /> Sumber nelayan ({detail.subProducts.length})
              </h2>
              <span className="hint">Ketuk kartu untuk lihat detail & history.</span>
            </div>
            {detail.subProducts.length ? (
              <ul className="trace-fishermen">
                {detail.subProducts.map((sub) => {
                  const subHistory = detail.history.filter(
                    (event) => event.subProductId === sub.id
                  );
                  const lastStage = subHistory.find((event) => event.stage)?.stage ?? null;
                  return (
                    <li key={sub.id}>
                      <Package aria-hidden="true" />
                      <span>
                        <strong>{sub.name || sub.fishermanName}</strong>
                        <small>
                          <UserRound aria-hidden="true" /> {sub.fishermanName} · {sub.quantity.toFixed(1)} {sub.unit} · Rp
                          {money.format(sub.price)}/kg
                        </small>
                        <small>
                          Min. order {sub.minOrderKg.toFixed(1)} kg
                          {sub.grade ? ` · Grade ${sub.grade}` : ""}
                        </small>
                        <small>
                          {sub.quality.cleanHandling ? "✓ Bersih" : "⚠ Perlu cek"} · {sub.quality.packaging}
                          {sub.quality.temperature ? ` · ${sub.quality.temperature}` : ""}
                          {sub.quality.dispatch ? ` · ${sub.quality.dispatch}` : ""}
                        </small>
                        <small>
                          {sub.geoLat !== null && sub.geoLng !== null ? (
                            <>
                              <MapPin aria-hidden="true" /> {sub.geoLat.toFixed(4)}, {sub.geoLng.toFixed(4)}
                            </>
                          ) : (
                            "Lokasi tidak diisi"
                          )}
                          {lastStage ? ` · Stage: ${HISTORY_STAGE_LABELS[lastStage]}` : ""}
                          {subHistory.length ? ` · ${subHistory.length} event` : ""}
                        </small>
                      </span>
                      <Link href={`/pengepul/produk/${detail.id}/sub/${sub.id}`} className="link-button">
                        Detail <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Belum ada sumber nelayan. Tambahkan minimal satu untuk mulai.</p>
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

          <section>
            <h2 className="lot-steps-title">
              <Plus aria-hidden="true" /> Tambah sumber nelayan
            </h2>
            <AddFishermanForm productId={detail.id} />
            {show === "created" ? (
              <p className="hint" style={{ marginTop: 8 }}>
                Sumber baru tersimpan. Produk tetap di halaman ini; muat ulang daftar jika perlu.
              </p>
            ) : null}
          </section>
        </div>
      </article>

      <p className="lot-foot-note">
        Halaman kelola pengepul SeaGres. Sub-route publik untuk pelacakan tetap di{" "}
        <Link href={`/produk/${detail.id}`}>/produk/{detail.id}</Link>.
      </p>
    </main>
  );
}
