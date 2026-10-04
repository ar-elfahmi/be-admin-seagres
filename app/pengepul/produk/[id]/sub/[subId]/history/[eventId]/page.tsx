import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  MapPin,
  Package,
  Store,
  UserRound,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { getProductDetail } from "@/lib/queries";
import SeagresLogo from "@/app/components/seagres-logo";
import PengepulBottomNav from "@/app/components/pengepul-bottom-nav";
import { HISTORY_STAGE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; subId: string; eventId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, eventId } = await params;
  const detail = await getProductDetail(id);
  if (!detail) return { title: "Event tidak ditemukan · SeaGres" };
  const event = detail.history.find((row) => row.id === eventId);
  if (!event) return { title: "Event tidak ditemukan · SeaGres" };
  return {
    title: `${event.stage ? HISTORY_STAGE_LABELS[event.stage] : event.kind} · SeaGres`,
  };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

export default async function PengepulEventPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.accountType !== "pengepul") redirect("/");
  const { id, subId, eventId } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();
  if (detail.pengepulId !== user.id) {
    return (
      <main className="lot-page">
        <p className="lot-foot-note">
          Event ini bukan milikmu. <Link href="/dashboard">Kembali ke dashboard</Link>.
        </p>
      </main>
    );
  }
  const sub = detail.subProducts.find((row) => row.id === subId);
  if (!sub) notFound();
  const event = detail.history.find((row) => row.id === eventId);
  if (!event || event.subProductId !== sub.id) notFound();

  return (
    <main className="lot-page pengepul-shell">
      <header className="lot-topbar">
        <Link href="/dashboard" className="brand">
          <SeagresLogo size={32} />
        </Link>
        <span className="lot-topbar-note">
          <Store aria-hidden="true" /> Detail event
        </span>
        <Link href={`/pengepul/produk/${detail.id}/sub/${sub.id}`} className="link-button">
          ← Kembali ke {sub.fishermanName}
        </Link>
      </header>

      <nav className="crumb-row" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep" aria-hidden="true">›</span>
        <Link href={`/pengepul/produk/${detail.id}`}>{detail.name}</Link>
        <span className="sep" aria-hidden="true">›</span>
        <Link href={`/pengepul/produk/${detail.id}/sub/${sub.id}`}>{sub.fishermanName}</Link>
        <span className="sep" aria-hidden="true">›</span>
        <span className="cur">{event.stage ? HISTORY_STAGE_LABELS[event.stage] : event.kind}</span>
      </nav>

      <article className="lot-card anim">
        <div className="lot-body">
          <div className="lot-head">
            <div>
              <span className="verified">
                <UserRound aria-hidden="true" /> {sub.fishermanName} —{" "}
                <Link href={`/pengepul/produk/${detail.id}`}>{detail.name}</Link>
              </span>
              <h1>{event.stage ? HISTORY_STAGE_LABELS[event.stage] : event.kind}</h1>
              <p>
                {formatDateTime(event.createdAt)} · oleh {event.actor}
              </p>
            </div>
            {event.quantityDelta !== 0 ? (
              <div className="lot-price-wrap">
                <span className="lot-price">
                  {event.quantityDelta > 0 ? "+" : ""}
                  {event.quantityDelta.toFixed(1)}
                  <small>kg</small>
                </span>
                <span className="lot-stock">Perubahan kuantitas</span>
              </div>
            ) : null}
          </div>

          {event.note ? (
            <p>
              <Package aria-hidden="true" /> {event.note}
            </p>
          ) : null}

          <section>
            <h2 className="lot-steps-title">Bukti geotag ({event.points.length})</h2>
            {event.points.length ? (
              <ul className="trace-fishermen">
                {event.points.map((point) => (
                  <li key={point.id}>
                    <MapPin aria-hidden="true" />
                    <span>
                      <strong>
                        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                      </strong>
                      {point.label ? <small>{point.label}</small> : null}
                      <small>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=15/${point.lat}/${point.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                        >
                          Buka di peta <ArrowUpRight aria-hidden="true" />
                        </a>
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Tidak ada bukti geotag.</p>
            )}
          </section>

          <section>
            <h2 className="lot-steps-title">
              <FileText aria-hidden="true" /> Dokumen pendukung ({event.documents.length})
            </h2>
            {event.documents.length ? (
              <ul className="trace-fishermen">
                {event.documents.map((doc) => (
                  <li key={doc.id}>
                    <FileText aria-hidden="true" />
                    <span>
                      <strong>{doc.filename}</strong>
                      <small>
                        {doc.kind === "foto" ? "Foto" : "Dokumen"} · {doc.mime}
                      </small>
                      {isImage(doc.mime) ? (
                        <small>
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            <img
                              src={doc.url}
                              alt={doc.filename}
                              style={{ maxWidth: 200, borderRadius: 8, marginTop: 6 }}
                            />
                          </a>
                        </small>
                      ) : (
                        <small>
                          <a href={doc.url} target="_blank" rel="noreferrer" className="link-button">
                            Buka berkas <ArrowUpRight aria-hidden="true" />
                          </a>
                        </small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Tidak ada dokumen pendukung.</p>
            )}
          </section>
        </div>
      </article>

      <PengepulBottomNav />
    </main>
  );
}
