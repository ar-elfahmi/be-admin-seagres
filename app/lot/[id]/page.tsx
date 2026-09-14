import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, QrCode, ShieldCheck } from "lucide-react";
import { getLot } from "../../../lib/queries";
import { currentUser } from "../../../lib/session";
import LotPreorder from "../../components/lot-preorder";
import SeagresLogo from "../../components/seagres-logo";

const money = new Intl.NumberFormat("id-ID");

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const lot = await getLot(id);
  return {
    title: lot ? `${lot.name} — Kartu Lot ${lot.id} · SeaGres` : "Lot tidak ditemukan · SeaGres",
    description: lot ? `Penelusuran hasil pesisir: ${lot.name} dari ${lot.seller}, ${lot.location}.` : undefined,
  };
}

export default async function LotPage({ params }: PageProps) {
  const { id } = await params;
  const lot = await getLot(id);
  if (!lot) notFound();

  let user = null;
  try {
    user = await currentUser();
  } catch {}

  const logged = new Date(lot.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const steps = [
    { title: "Tangkap / panen", desc: `${lot.time} · ${lot.location}` },
    { title: "Dicatat sebagai lot", desc: `${lot.id} dibuat ${logged} oleh ${lot.seller}` },
    { title: "Verifikasi kelompok", desc: `Dijamin ${lot.seller}, lokasi umum saja tanpa titik kapal` },
    { title: "Penjualan / pre-order", desc: lot.weight > 0 ? `Terbuka — sisa stok ${lot.weight} kg` : "Stok habis, sisa permintaan dialihkan ke panen berikutnya" },
  ];

  return (
    <main className="lot-page">
      <header className="lot-topbar">
        <Link href="/" className="brand">
          <SeagresLogo size={32} />
        </Link>
        <span className="lot-topbar-note">
          <QrCode aria-hidden="true" /> Kartu lot & penelusuran
        </span>
      </header>

      <article className="lot-card anim">
        <div className="lot-hero">
          <Image src={lot.image} alt={lot.name} fill sizes="(max-width: 880px) 100vw, 880px" unoptimized />
        </div>
        <div className="lot-body">
          <div className="lot-head">
            <div>
              <span className="verified">
                <BadgeCheck aria-hidden="true" /> Lot terverifikasi
              </span>
              <h1>{lot.name}</h1>
              <p>{lot.id} · {lot.type} · {lot.size}</p>
            </div>
            <div className="lot-price-wrap">
              <span className="lot-price">Rp{money.format(lot.price)}<small>/kg</small></span>
              <span className="lot-stock">Stok {lot.weight} kg</span>
            </div>
          </div>

          <div className="lot-seller">
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>{lot.seller}</strong>
              <span>{lot.location} · laporan dicatat melalui SeaGres. Nomor lot untuk konfirmasi saat serah terima.</span>
            </p>
            <span className="lot-loc"><MapPin aria-hidden="true" /> {lot.location}</span>
          </div>

          <h2 className="lot-steps-title">Riwayat penelusuran</h2>
          <ol className="trace-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <b>{step.title}</b>
                <span>{step.desc}</span>
              </li>
            ))}
          </ol>

          <LotPreorder lotId={lot.id} weight={lot.weight} loggedIn={!!user} accountType={user?.accountType ?? null} />
        </div>
      </article>

      <p className="lot-foot-note">
        Halaman ini dibuka dari QR pada kartu lot SeaGres. Data lokasi ditampilkan sebagai lokasi umum demi keamanan titik tangkap.
      </p>
    </main>
  );
}
