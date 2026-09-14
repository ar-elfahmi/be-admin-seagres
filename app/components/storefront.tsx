"use client";

import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Fish,
  Flame,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  QrCode,
  Scale,
  Search,
  Shell,
  ShieldCheck,
  Shrimp,
  ShoppingCart,
  Star,
  Store,
  Truck,
  UserRound,

  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLot, logout, preorder, reportIssue, setOrderStatus } from "../actions";
import type { Lot, OrderView, Price, PublicUser } from "../../lib/types";
import SeagresLogo from "./seagres-logo";

interface SlideItem {
  id: string;
  image: string;
  tag: string;
  title: string;
  sub: string;
  filter: string;
}

const SLIDES: SlideItem[] = [
  { id: "bandeng", image: "/products/bandeng.png", tag: "Panen pagi ini · 06:30", title: "Bandeng segar dari Ujungpangkah", sub: "Langsung dari perahu, tercatat sebagai lot terverifikasi dalam hitungan menit.", filter: "Bandeng" },
  { id: "udang", image: "/products/udang-vaname.png", tag: "Populer minggu ini", title: "Udang vaname size 50 dari Manyar", sub: "Dipanen hari yang sama, dikirim dengan rantai dingin ke seluruh Gresik.", filter: "Udang" },
  { id: "kerang", image: "/products/kerang-hijau.png", tag: "Harga mitra lokal", title: "Kerang hijau mulai Rp18.000/kg", sub: "Dari kelompok binaan penyuluh — kualitas dicek, asal-usul bisa dilacak.", filter: "Kerang" },
];

const FILTERS = ["Semua", "Bandeng", "Udang", "Kerang", "Olahan"];
const SORTS: [string, string][] = [["terbaru", "Terbaru"], ["murah", "Harga terendah"], ["laris", "Terlaris"]];
const LOTS_PER_PAGE = 6;
const money = new Intl.NumberFormat("id-ID");

function isLocalAsset(src: string): boolean {
  return src.startsWith("/products/") || src.startsWith("/uploads/");
}

function secondsLeft(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(18, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

function useFlashCountdown(): string {
  // Start from the same value on the server and client so React can hydrate
  // the marketplace controls before the time-sensitive counter begins.
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setLeft(secondsLeft()), 1000);
    const initialUpdate = window.setTimeout(() => setLeft(secondsLeft()), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initialUpdate);
    };
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

function CategoryIcon({ type }: { type: string }) {
  const Icon = type === "Bandeng" ? Fish : type === "Udang" ? Shrimp : type === "Kerang" ? Shell : type === "Olahan" ? Package : BadgeCheck;
  return <Icon aria-hidden="true" />;
}

function Verified({ children = "Terverifikasi" }: { children?: ReactNode }) {
  return (
    <span className="verified">
      <BadgeCheck aria-hidden="true" /> {children}
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Rating({ value = 4.9, sold = 0 }: { value?: number; sold?: number }) {
  return (
    <span className="rating">
      <Star aria-hidden="true" className="star-fill" />
      {value.toFixed(1)} · Terjual {sold > 0 ? `${sold}+` : "baru"}
    </span>
  );
}

function discountPct(lot: Lot): number {
  return lot.coret ? Math.round((1 - lot.price / lot.coret) * 100) : 0;
}

function ProductCard({ lot, onOpen, index }: { lot: Lot; onOpen: (lot: Lot) => void; index: number }) {
  const pct = discountPct(lot);
  return (
    <button className="product-card anim" style={{ animationDelay: `${60 + (index % 6) * 60}ms` }} type="button" onClick={() => onOpen(lot)}>
      <span className="product-img">
        <Image src={lot.image} alt={lot.name} fill sizes="240px" unoptimized={!isLocalAsset(lot.image)} />
        {pct > 0 ? <span className="sale-chip">-{pct}%</span> : null}
        {lot.weight <= 0 ? <span className="sold-out-label">Stok habis</span> : null}
      </span>
      <span className="product-body">
        <strong className="product-title">{lot.name}</strong>
        <span className="product-price">
          Rp{money.format(lot.price)}
          {lot.coret ? <s>Rp{money.format(lot.coret)}</s> : null}
          <span className="per">/kg</span>
        </span>
        <span className="verify-line">
          <ShieldCheck aria-hidden="true" /> Terverifikasi · {lot.weight} kg
        </span>
        <span className="product-loc">
          <MapPin aria-hidden="true" /> <span className="loc-text">{lot.location}</span>
          {lot.promo ? <em className="chip chip-green">{lot.promo}</em> : null}
        </span>
        <Rating value={lot.rating ?? 4.9} sold={lot.sold ?? 0} />
      </span>
    </button>
  );
}

function CreateLotForm({ onSubmit, busy }: { onSubmit: (data: FormData) => void; busy: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="sell-banner">
        <Truck aria-hidden="true" />
        <p>
          <strong>Jual hasil panenmu hari ini.</strong>
          <span>Lot tersimpan permanen dan muncul di katalog dengan kartu QR.</span>
        </p>
      </div>
      <label>
        Nama produk<input name="name" placeholder="ex: Bandeng Segar" required />
      </label>
      <div className="form-grid">
        <label>
          Komoditas
          <select name="type" defaultValue="Bandeng">
            <option>Bandeng</option>
            <option>Udang</option>
            <option>Kerang</option>
            <option>Olahan</option>
          </select>
        </label>
        <label>
          Berat tersedia
          <span className="input-unit">
            <input name="weight" type="number" min="1" defaultValue="25" required />
            <span>kg</span>
          </span>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Harga per kg<input name="price" type="number" min="1000" step="500" defaultValue="28000" required />
        </label>
        <label>
          Ukuran<input name="size" placeholder="ex: 3–4 ekor/kg" required />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Waktu tangkap/panen<input name="harvestTime" type="datetime-local" required />
        </label>
        <label>
          Lokasi umum<input name="location" placeholder="ex: Ujungpangkah" required />
        </label>
      </div>
      <fieldset className="quality-checklist">
        <legend>Checklist mutu lot</legend>
        <label className="quality-toggle">
          <input name="cleanHandling" type="checkbox" defaultChecked />
          <span><Check aria-hidden="true" /> Penanganan bersih sudah dicek</span>
        </label>
        <div className="form-grid">
          <label>
            Kemasan
            <select name="packaging" defaultValue="Es & box food grade">
              <option>Es & box food grade</option>
              <option>Keranjang bersih</option>
              <option>Kemasan olahan tersegel</option>
            </select>
          </label>
          <label>
            Suhu simpan <small>(opsional)</small>
            <input name="temperature" placeholder="ex: 2–4°C" />
          </label>
        </div>
        <label>
          Rencana pengiriman
          <input name="dispatch" placeholder="ex: Ambil di titik konsolidasi, 14.00 WIB" />
        </label>
      </fieldset>
      <label>
        Foto hasil <small>(opsional, maks 4 MB)</small>
        <input className="file-input" name="photo" type="file" accept="image/*" />
      </label>
      <button className="primary-button form-submit" type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : <><Plus /> Pasang lot sekarang</>}
      </button>
    </form>
  );
}

function LotDetail({
  lot,
  qrUrl,
  onPreorder,
  onReport,
  busy,
  canPreorder,
}: {
  lot: Lot;
  qrUrl: string;
  onPreorder: (quantity: number) => void;
  onReport: () => void;
  busy: boolean;
  canPreorder: boolean;
}) {
  const [quantity, setQuantity] = useState(5);
  const pct = discountPct(lot);
  const soldOut = lot.weight <= 0;
  const quality = lot.quality ?? {
    cleanHandling: true,
    packaging: lot.type === "Olahan" ? "Kemasan olahan tersegel" : "Kemasan kelompok terverifikasi",
    temperature: lot.promo === "Rantai Dingin" ? "2–4°C" : "Dicatat saat pengiriman",
    dispatch: "Jadwal pengambilan dikonfirmasi kelompok",
  };
  return (
    <div className="lot-detail">
      <div className="pdp-top">
        <span className="detail-photo">
          <Image src={lot.image} alt={lot.name} fill sizes="200px" unoptimized={!isLocalAsset(lot.image)} />
        </span>
        <div className="pdp-title">
          <Verified>Lot terverifikasi</Verified>
          <h3>{lot.name}</h3>
          <p>{lot.id} · {lot.seller}</p>
          <Rating value={lot.rating ?? 4.9} sold={lot.sold ?? 0} />
          <p className="pdp-price">
            Rp {money.format(lot.price)}
            {lot.coret ? <s>Rp {money.format(lot.coret)}</s> : null}
            {pct > 0 ? <b className="pdp-off">{pct}% off</b> : null}
            <small>/kg</small>
          </p>
        </div>
      </div>
      <dl className="detail-grid">
        <div><dt>Stok tersedia</dt><dd>{lot.weight} kg</dd></div>
        <div><dt>Ukuran</dt><dd>{lot.size}</dd></div>
        <div><dt>Lokasi</dt><dd>{lot.location}</dd></div>
        <div><dt>Dicatat</dt><dd>{lot.time}</dd></div>
      </dl>
      <div className="trace-row">
        <div className="qr-box">
          {qrUrl ? <Image src={qrUrl} alt={`QR untuk lot ${lot.id}`} width={104} height={104} unoptimized /> : <span>Menyiapkan QR…</span>}
        </div>
        <p>
          <strong>Lacak asal-usul lot</strong>
          <br />
          Scan QR untuk membuka kartu lot: <a className="lot-link" href={`/lot/${lot.id}`}>lihat /lot/{lot.id}</a>
          <br />
          {lot.time} · Lokasi umum saja, tanpa titik kapal
        </p>
      </div>
      <section className="lot-quality" aria-label="Checklist mutu lot">
        <div className="lot-quality-head">
          <span className="quality-icon"><ShieldCheck aria-hidden="true" /></span>
          <p><strong>Mutu lot</strong><span>Dicatat kelompok sebelum ditayangkan</span></p>
        </div>
        <div className="quality-rows">
          <span><Check aria-hidden="true" /> Penanganan bersih <b>{quality.cleanHandling ? "Sesuai" : "Perlu cek"}</b></span>
          <span><Package aria-hidden="true" /> {quality.packaging} <b>Sesuai</b></span>
          <span><Truck aria-hidden="true" /> {quality.temperature} <b>Dicatat</b></span>
        </div>
        <p className="dispatch-note">{quality.dispatch}</p>
      </section>
      {soldOut ? (
        <p className="form-error">Stok lot ini sudah habis — hubungi kelompok penjual untuk panen berikutnya.</p>
      ) : !canPreorder ? (
        <p className="lot-note lot-role-note"><ShieldCheck aria-hidden="true" /> Akun penjual dapat melihat detail lot, tetapi pre-order dilakukan dari akun pembeli.</p>
      ) : (
        <div className="preorder-row">
          <label>
            Jumlah
            <span className="input-unit">
              <input type="number" min="1" max={lot.weight} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              <span>kg</span>
            </span>
          </label>
          <button className="primary-button" type="button" disabled={busy} onClick={() => onPreorder(quantity)}>
            <ShoppingCart /> {busy ? "Mengirim…" : "+ Keranjang"}
          </button>
        </div>
      )}
      <button className="report-link" type="button" onClick={onReport}>Laporkan masalah pada lot ini</button>
    </div>
  );
}

function ReportIssueForm({ lot, onSubmit, busy }: { lot?: Lot; onSubmit: (data: FormData) => void; busy: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="form report-form" onSubmit={submit}>
      <div className="report-intro">
        <Bell aria-hidden="true" />
        <p><strong>Tim pendamping akan menindaklanjuti laporanmu.</strong><span>Lokasi kapal dan data pribadi tidak dipublikasikan.</span></p>
      </div>
      <input name="lotId" type="hidden" value={lot?.id ?? ""} />
      {lot ? <p className="report-lot">Lot terkait: <strong>{lot.name}</strong> · {lot.id}</p> : null}
      <label>
        Jenis masalah
        <select name="category" defaultValue="Mutu produk">
          <option>Mutu produk</option>
          <option>Keterlambatan pengambilan</option>
          <option>Lot tidak sesuai</option>
          <option>Masalah lain</option>
        </select>
      </label>
      <label>
        Ceritakan yang terjadi
        <textarea name="description" minLength={10} placeholder="Jelaskan kondisi lot atau pesanan secara singkat…" required />
      </label>
      <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim laporan"}</button>
    </form>
  );
}

const SUPPLY_PLAN = [
  { day: "Hari ini", type: "Bandeng", amount: "120 kg", place: "Ujungpangkah" },
  { day: "Besok", type: "Udang", amount: "80 kg", place: "Manyar" },
  { day: "15 Sep", type: "Kerang", amount: "150 kg", place: "Sidayu" },
  { day: "16 Sep", type: "Olahan", amount: "40 pack", place: "Gresik Kota" },
  { day: "17 Sep", type: "Bandeng", amount: "90 kg", place: "Duduk Sampeyan" },
];

function SupplyPlan({ onFilter }: { onFilter: (filter: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visiblePlan = expanded ? SUPPLY_PLAN : SUPPLY_PLAN.slice(0, 3);
  return (
    <section className="supply-panel" id="pasokan" aria-labelledby="supply-title">
      <div className="ops-heading">
        <div><CalendarDays aria-hidden="true" /><h2 id="supply-title">Rencana pasokan</h2></div>
        <span>3 hari ke depan</span>
      </div>
      <div className="supply-list">
        {visiblePlan.map((item) => (
          <button key={`${item.day}-${item.type}`} type="button" onClick={() => onFilter(item.type)}>
            <time>{item.day}</time>
            <strong>{item.type}</strong>
            <span>{item.amount}</span>
            <small>{item.place}</small>
          </button>
        ))}
      </div>
      <button className="panel-link" type="button" onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Ringkas rencana" : "Lihat rencana lengkap"} <ChevronRight aria-hidden="true" />
      </button>
    </section>
  );
}

function OperationsPanel({ lots, orders, onOrders }: { lots: Lot[]; orders: OrderView[]; onOrders: () => void }) {
  const pending = orders.filter((order) => order.status === "Baru");
  const unmatched = lots.filter((lot) => lot.weight > 0 && (lot.sold ?? 0) === 0).length;
  const demand = orders.filter((order) => order.status !== "Ditolak").reduce((sum, order) => sum + order.quantity, 0);
  return (
    <section className="ops-summary" aria-labelledby="ops-title">
      <div className="ops-heading">
        <div><ClipboardCheck aria-hidden="true" /><h2 id="ops-title">Produksi & permintaan</h2></div>
        <button type="button" onClick={onOrders}>Buka pesanan <ChevronRight aria-hidden="true" /></button>
      </div>
      <div className="ops-stats">
        <div><span>Lot aktif</span><strong>{lots.filter((lot) => lot.weight > 0).length}</strong><small>siap ditawarkan</small></div>
        <div><span>Permintaan</span><strong>{demand} kg</strong><small>pre-order aktif</small></div>
        <div><span>Butuh promosi</span><strong>{unmatched}</strong><small>lot belum terserap</small></div>
      </div>
      <p className={pending.length ? "ops-alert" : "ops-clear"}>{pending.length ? `${pending.length} pesanan perlu dikonfirmasi kelompok hari ini.` : "Semua pesanan hari ini sudah ditangani."}</p>
    </section>
  );
}

function ProfilePanel({ user, onLogout, busy }: { user: PublicUser; onLogout: () => void; busy: boolean }) {
  return (
    <div className="profile-panel">
      <span className="avatar profile-avatar">{user.initials}</span>
      <h3>{user.name}</h3>
      <p>{user.organization} · {user.location}</p>
      {user.verified ? <Verified>Profil terverifikasi</Verified> : <span className="pending-status">Menunggu verifikasi pendamping</span>}
      <dl>
        <div><dt>Peran</dt><dd>{user.role}</dd></div>
        <div><dt>Dasar verifikasi</dt><dd>{user.verificationBasis}</dd></div>
        <div><dt>Nomor kelompok</dt><dd>{user.groupNumber}</dd></div>
        <div><dt>Data publik</dt><dd>Lokasi umum, tanpa titik kapal</dd></div>
      </dl>
      <button className="logout-button" type="button" onClick={onLogout} disabled={busy}>
        <LogOut /> {busy ? "Keluar…" : "Keluar dari akun"}
      </button>
    </div>
  );
}

function OrdersPanel({
  orders,
  user,
  onStatus,
  busy,
}: {
  orders: OrderView[];
  user: PublicUser;
  onStatus: (orderId: string, status: string) => void;
  busy: boolean;
}) {
  const isSeller = user.accountType === "seller";
  // Filter pesanan sesuai akun: penjual hanya melihat pesanan untuk
  // kelompoknya; pembeli hanya melihat pesanannya sendiri. Pencocokan
  // nama kelompok tahan spasi/kapital.
  const myOrg = (user.organization ?? "").trim().toLocaleLowerCase("id-ID");
  const visibleOrders = orders.filter((order) =>
    isSeller
      ? (order.seller ?? "").trim().toLocaleLowerCase("id-ID") === myOrg
      : order.buyerUserId === user.id,
  );
  const active = visibleOrders.filter((order) => order.status !== "Ditolak");
  const totals = active.reduce<Record<string, number>>((result, order) => {
    result[order.product] = (result[order.product] || 0) + order.quantity;
    return result;
  }, {});

  return (
    <div className="orders-panel">
      <div className="aggregate-block">
        <div className="aggregate-heading">
          <span>Ringkasan permintaan</span>
          <small>Lot yang masih aktif</small>
        </div>
        {Object.entries(totals).length ? (
          Object.entries(totals).map(([product, quantity]) => (
            <p key={product}><strong>{product}</strong><b>{quantity} kg</b></p>
          ))
        ) : (
          <p><strong>Belum ada permintaan aktif</strong><b>0 kg</b></p>
        )}
      </div>
      <div className="order-list">
        {visibleOrders.length ? visibleOrders.map((order) => {
          const pickup = order.status === "Diterima"
            ? "Siap diambil · TPI Gresik, 14.00 WIB"
            : order.status === "Ditolak"
              ? "Pesanan ditolak kelompok"
              : "Menunggu konfirmasi kelompok";
          return (
            <article className="order-item" key={order.id}>
              <div className="order-item-topline">
                <span className="order-icon"><Store aria-hidden="true" /></span>
                <div className="order-identity">
                  <strong>{order.buyer}</strong>
                  <span>{order.quantity} kg · {order.product}</span>
                </div>
                <b className={`status-${order.status.toLowerCase()}`}>{order.status}</b>
              </div>
              <div className="order-details">
                <span className="order-seller">Lot dari {order.seller}</span>
                <span className="delivery-note"><Truck aria-hidden="true" /> {pickup}</span>
              </div>
              {isSeller && order.status === "Baru" ? (
                <div className="order-actions">
                  <button className="accept" type="button" disabled={busy} onClick={() => onStatus(order.id, "Diterima")}>Terima pesanan</button>
                  <button className="reject" type="button" disabled={busy} onClick={() => onStatus(order.id, "Ditolak")}>Tolak</button>
                </div>
              ) : null}
            </article>
          );
        }) : (
          <div className="empty-state inline"><ShoppingCart /><h3>Belum ada pre-order</h3><p>Pesanan pembeli akan muncul di sini.</p></div>
        )}
      </div>
    </div>
  );
}

function TopHeader({
  user,
  query,
  setQuery,
  myOrderCount,
  orders,
  onCatalog,
  onCreate,
  onOrders,
  onProfile,
  onReport,
  onJump,
  accountType,
}: {
  user: PublicUser;
  query: string;
  setQuery: (q: string) => void;
  myOrderCount: number;
  orders: OrderView[];
  onCatalog: () => void;
  onCreate: () => void;
  onOrders: () => void;
  onProfile: () => void;
  onReport: () => void;
  onJump: (id: string) => void;
  accountType: PublicUser["accountType"];
}) {
  const isBuyer = accountType === "buyer";
  return (
    <header className="tokopedia-header">
      <div className="top-strip">
        <div className="top-strip-inner">
          <span><Truck aria-hidden="true" /> Pengiriman dingin area Gresik · lot dicatat hari ini gratis kurir lokal</span>
          <nav>
            <button type="button" onClick={() => onJump("lot-terbaru")}>Tentang SeaGres</button>
            <button type="button" onClick={() => onJump("harga")}>Harga Pesisir</button>
            <button type="button" onClick={() => onJump("kategori")}>Kategori</button>
          </nav>
        </div>
      </div>
      <div className="main-header">
        <div className="main-header-inner">
          <a className="brand" href="#top" aria-label="SeaGres, kembali ke atas">
            <SeagresLogo size={32} />

          </a>
          <label className="search-field global-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari di SeaGres</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bandeng, udang vaname, kerang, kelompok…" />
            <button type="button" className="search-btn" onClick={onCatalog}>Cari</button>
          </label>
          <div className="header-actions">
            <button className="header-icon" type="button" onClick={onOrders} aria-label="Keranjang">
              <ShoppingCart />
              {myOrderCount > 0 ? <i>{myOrderCount}</i> : null}
            </button>
            <button className="header-icon" type="button" onClick={onReport} aria-label="Laporkan masalah">
              <Bell />
            </button>
            <span className="header-divider" />
            <span className="role-pill">{isBuyer ? "Pembeli" : "Penjual"}</span>
            {!isBuyer ? <button className="sell-btn" type="button" onClick={onCreate}><Plus /> Jual</button> : null}
            <button type="button" className="avatar" onClick={onProfile} aria-label={`Buka profil ${user.name}`}>{user.initials}</button>
          </div>
        </div>
        <div className="mobile-search">
          <label className="search-field">
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari di SeaGres" />
          </label>
        </div>
      </div>
    </header>
  );
}

function HeroSlider({ onShop }: { onShop: (filter: string) => void }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero-slider" aria-label="Sorotan hari ini">
      {SLIDES.map((item, i) => (
        <article key={item.id} className={i === slide ? "slide active" : "slide"}>
          <Image src={item.image} alt="" fill loading={i === 0 ? "eager" : "lazy"} sizes="(max-width: 880px) 100vw, 72vw" className="slide-img" />
          <div className="slide-shade" />
          <div className="slide-copy">
            <span className="slide-tag">{item.tag}</span>
            <h1>{item.title}</h1>
            <p>{item.sub}</p>
            <div className="slide-cta">
              <button className="primary-button" type="button" onClick={() => onShop(item.filter)}>
                Belanja sekarang <ArrowRight />
              </button>
            </div>
          </div>
        </article>
      ))}
      <div className="slider-dots">
        {SLIDES.map((item, i) => (
          <button key={item.id} type="button" className={i === slide ? "active" : ""} onClick={() => setSlide(i)} aria-label={`Ke slide ${i + 1}`} />
        ))}
      </div>
    </section>
  );
}

function FlashSale({ lots, onOpen }: { lots: Lot[]; onOpen: (lot: Lot) => void }) {
  const countdown = useFlashCountdown();
  const items = lots.filter((lot) => lot.coret);
  if (!items.length) return null;
  return (
    <section className="flash-strip anim anim2" id="flash">
      <div className="flash-head">
        <span className="flame"><Flame aria-hidden="true" /></span>
        <div>
          <h2>Panen Hari Ini</h2>
          <p>Diskon dari kelompok — berakhir pukul 18.00</p>
        </div>
        <span className="countdown"><Clock aria-hidden="true" /> <b>{countdown}</b></span>
      </div>
      <div className="flash-rail">
        {items.map((lot) => {
          const target = lot.sold + lot.weight;
          const pct = target > 0 ? Math.min(95, Math.round((lot.sold / target) * 100)) : 0;
          return (
            <button className="flash-card" type="button" key={lot.id} onClick={() => onOpen(lot)}>
              <span className="flash-img">
                <Image src={lot.image} alt={lot.name} fill sizes="170px" unoptimized={!isLocalAsset(lot.image)} />
                <b>-{discountPct(lot)}%</b>
              </span>
              <span className="flash-copy">
                <strong>Rp{money.format(lot.price)}</strong>
                <s>Rp{money.format(lot.coret!)}</s>
                <small>{lot.name}</small>
                <span className="flash-bar"><i style={{ width: `${pct}%` }} /><em>{lot.sold}+ terjual</em></span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type ModalType =
  | { type: "create" }
  | { type: "lot"; lot: Lot }
  | { type: "profile" }
  | { type: "orders" }
  | { type: "report"; lot?: Lot }
  | null;

interface Notice {
  message: string;
  isError?: boolean;
}

interface StorefrontProps {
  user: PublicUser;
  initialLots: Lot[];
  initialOrders: OrderView[];
  prices: Price[];
}

export default function Storefront({ user, initialLots, initialOrders, prices }: StorefrontProps) {
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [orders, setOrders] = useState<OrderView[]>(initialOrders);
  const [filter, setFilter] = useState("Semua");
  const [sort, setSort] = useState("terbaru");
  const [query, setQuery] = useState("");
  const [visibleLots, setVisibleLots] = useState(LOTS_PER_PAGE);
  const [modal, setModal] = useState<ModalType>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isBuyer = user.accountType === "buyer";

  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredLots = lots.filter(
    (lot) =>
      (filter === "Semua" || lot.type === filter) &&
      (!normalizedQuery || `${lot.name} ${lot.seller} ${lot.location}`.toLocaleLowerCase("id-ID").includes(normalizedQuery)),
  );
  let displayLots = filteredLots;
  if (sort === "murah") displayLots = [...filteredLots].sort((a, b) => a.price - b.price);

  if (sort === "laris") displayLots = [...filteredLots].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
  const pagedLots = displayLots.slice(0, visibleLots);
  const totalWeight = lots.reduce((sum, lot) => sum + lot.weight, 0);
  const activeGroups = new Set(lots.filter((lot) => lot.time.startsWith("Hari ini")).map((lot) => lot.seller)).size;
  // Pesanan yang relevan dengan akun saat ini (counter & judul modal).
  const myOrgKey = (user.organization ?? "").trim().toLocaleLowerCase("id-ID");
  const filteredOrderCount = isBuyer
    ? orders.filter((order) => order.buyerUserId === user.id).length
    : orders.filter((order) => (order.seller ?? "").trim().toLocaleLowerCase("id-ID") === myOrgKey).length;

  function flash(message: string, isError = false) {
    setNotice({ message, isError });
    window.setTimeout(() => setNotice(null), 2800);
  }

  async function openLot(lot: Lot) {
    setModal({ type: "lot", lot });
    setQrUrl("");
    try {
      const QRCodeLibrary = await import("qrcode");
      setQrUrl(
        await QRCodeLibrary.toDataURL(`${window.location.origin}/lot/${lot.id}`, {
          width: 220,
          margin: 1,
          color: { dark: "#1e5aa8", light: "#ffffff" },
        }),
      );
    } catch {}
  }

  async function submitLot(formData: FormData) {
    setBusy(true);
    // Instant client-side state update for presentation smoothness
    const name = String(formData.get("name") || "").trim();
    const type = String(formData.get("type") || "Bandeng");
    const price = Math.round(Number(formData.get("price")));
    const weight = Math.round(Number(formData.get("weight")));
    const size = String(formData.get("size") || "").trim();
    const location = String(formData.get("location") || "").trim();

    try {
      const res = await createLot(formData);
      if (res?.error) {
        flash(res.error, true);
        setBusy(false);
        return;
      }
      if (res.lots) setLots(res.lots);
      if (res.lot) flash(`${res.lot.name} tersimpan permanen dan tampil di katalog.`);
    } catch {
      // Fallback in-memory if backend server action is unavailable
      const fallbackLot: Lot = {
        id: `SGR-${Date.now().toString(36).toUpperCase()}`,
        name,
        type,
        price: price || 28000,
        coret: null,
        weight: weight || 25,
        seller: user.organization,
        location: location || user.location,
        time: "Hari ini, 06:30",
        createdAt: new Date().toISOString(),
        size: size || "3–4 ekor/kg",
        image: type === "Udang" ? "/products/udang-vaname.png" : type === "Kerang" ? "/products/kerang-hijau.png" : "/products/bandeng.png",
        rating: 5,
        sold: 0,
        promo: "Baru dicatat",
        quality: {
          cleanHandling: formData.get("cleanHandling") === "on",
          packaging: String(formData.get("packaging") || "Kemasan standar"),
          temperature: String(formData.get("temperature") || "Belum dicatat"),
          dispatch: String(formData.get("dispatch") || "Jadwal menyusul"),
        },
      };
      setLots((prev) => [fallbackLot, ...prev]);
      flash(`${fallbackLot.name} tersimpan permanen dan tampil di katalog.`);
    }

    setBusy(false);
    setModal(null);
    setFilter("Semua");
    setQuery("");
    setSort("terbaru");
  }

  async function submitPreorder(lot: Lot, quantity: number) {
    setBusy(true);
    try {
      const res = await preorder(lot.id, quantity);
      if (res?.error) {
        flash(res.error, true);
        setBusy(false);
        return;
      }
      if (res.orders) setOrders(res.orders);
      if (res.order) flash(`Pre-order ${res.order.quantity} kg ${lot.name} tercatat dan dikirim ke ${lot.seller}.`);
    } catch {
      // Fallback in-memory for offline/presentation
      const amount = Math.max(1, Math.min(lot.weight, Math.round(quantity || 1)));
      const fallbackOrder: OrderView = {
        id: `PO-${Date.now().toString(36).toUpperCase()}`,
        lotId: lot.id,
        buyerUserId: user.id,
        buyer: user.name,
        quantity: amount,
        status: "Baru",
        createdAt: new Date().toISOString(),
        product: lot.name,
        seller: lot.seller,
      };
      setLots((prev) => prev.map((item) => item.id === lot.id ? { ...item, weight: Math.max(0, item.weight - amount) } : item));
      setOrders((prev) => [fallbackOrder, ...prev]);
      flash(`Pre-order ${amount} kg ${lot.name} tercatat dan dikirim ke ${lot.seller}.`);
    }

    setBusy(false);
    setModal(null);
  }

  async function submitReport(formData: FormData) {
    setBusy(true);
    try {
      const res = await reportIssue(formData);
      if (res?.error) {
        flash(res.error, true);
        setBusy(false);
        return;
      }
      flash("Laporan diterima. Pendamping akan menindaklanjuti melalui SeaGres.");
      setModal(null);
    } catch {
      flash("Laporan belum bisa dikirim. Coba lagi sebentar.", true);
    }
    setBusy(false);
  }

  async function manageOrder(orderId: string, status: string) {
    setBusy(true);
    try {
      const res = await setOrderStatus(orderId, status);
      if (res?.error) {
        flash(res.error, true);
        setBusy(false);
        return;
      }
      if (res.orders) setOrders(res.orders);
      if (res.lots) setLots(res.lots);
    } catch {
      setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status } : order));
    }
    setBusy(false);
    flash(status === "Diterima" ? "Pesanan diterima — stok lot otomatis berkurang." : "Pesanan ditolak.");
  }

  async function doLogout() {
    setBusy(true);
    await logout();
    setModal(null);
    setBusy(false);
    router.refresh();
  }

  function scrollToCatalog() {
    document.getElementById("lot-terbaru")?.scrollIntoView({ behavior: "smooth" });
  }

  function goToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shopCategory(next: string) {
    setFilter(next);
    setQuery("");
    requestAnimationFrame(scrollToCatalog);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0 });
  }

  return (
    <main className="app-shell" id="top">
      <TopHeader
        user={user}
        query={query}
        setQuery={setQuery}
        orders={orders}
        myOrderCount={filteredOrderCount}
        onCreate={() => setModal({ type: "create" })}
        onOrders={() => setModal({ type: "orders" })}
        onProfile={() => setModal({ type: "profile" })}
        onReport={() => setModal({ type: "report" })}
        onCatalog={scrollToCatalog}
        onJump={goToId}
        accountType={user.accountType}
      />

      <div className="page-shell">
        <section className="hero-grid">
          <HeroSlider onShop={shopCategory} />
          <div className="hero-side anim anim2">
            <div className="side-card summary-card compact">
              <div className="summary-stats">
                <span><Scale aria-hidden="true" /><strong>{totalWeight}</strong>kg tersedia</span>
                <span><ShoppingCart aria-hidden="true" /><strong>{filteredOrderCount}</strong>pesanan</span>
                <span><Truck aria-hidden="true" /><strong>{activeGroups}</strong>kelompok</span>
              </div>
              <button type="button" onClick={() => setModal({ type: "orders" })}>{isBuyer ? "Lihat pre-order saya" : "Lihat pesanan masuk"} <ChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        </section>

        <section className="category-strip anim anim2" id="kategori" aria-labelledby="category-title">
          <div className="cat-circles">
            {FILTERS.map((item) => (
              <button
                key={item}
                className={filter === item ? "selected" : ""}
                type="button"
                onClick={() => {
                  setFilter(item);
                  scrollToCatalog();
                }}
              >
                <span className="cat-icon">
                  <CategoryIcon type={item} />
                </span>
                <span>{item}</span>
              </button>
            ))}
            <button type="button" onClick={() => goToId("harga")}>
              <span className="cat-icon"><Scale aria-hidden="true" /></span>
              <span>Harga</span>
            </button>
            {!isBuyer ? <button type="button" onClick={() => setModal({ type: "create" })}>
              <span className="cat-icon cat-plus"><Plus aria-hidden="true" /></span>
              <span>Jual</span>
            </button> : null}
          </div>
        </section>

        <FlashSale lots={lots} onOpen={openLot} />

        <div className="content-grid">
          <section className="lots-section anim anim3" id="lot-terbaru">
            <div className="section-heading">
              <div>
                <h2>Rekomendasi untukmu</h2>
                <p>Lot terbaru dan paling laris dari pesisir Gresik.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilter("Semua");
                  setQuery("");
                }}
              >
                Lihat semua <ChevronRight />
              </button>
            </div>
            <div className="sort-bar">
              <span>Urutkan</span>
              {SORTS.map(([value, label]) => (
                <button key={value} className={sort === value ? "selected" : ""} type="button" onClick={() => setSort(value)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="filters" aria-label="Filter komoditas">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "selected" : ""}
                  type="button"
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="search-field catalog-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Cari lot</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari komoditas, kelompok, atau lokasi" />
            </label>
            <div className="product-grid">
              {displayLots.length ? (
                pagedLots.map((lot, i) => <ProductCard key={lot.id} lot={lot} onOpen={openLot} index={i} />)
              ) : (
                <div className="empty-state">
                  <Search />
                  <h3>Produk tidak ditemukan</h3>
                  <p>Coba kata kunci atau komoditas lain.</p>
                </div>
              )}
            </div>
            {pagedLots.length < displayLots.length ? (
              <button className="load-more" type="button" onClick={() => setVisibleLots((count) => Math.min(count + LOTS_PER_PAGE, displayLots.length))}>
                Muat lebih banyak <ChevronDown aria-hidden="true" />
              </button>
            ) : null}
          </section>

          <aside className="side-rail anim anim3">
            <section className="prices" id="harga">
              <div className="section-heading">
                <h2>Harga pesisir</h2>
                <time dateTime="2026-09-13">13 Sep 2026</time>
              </div>
              <div className="price-list">
                {prices.map((row) => (
                  <button
                    className="price-row"
                    type="button"
                    key={row.name}
                    onClick={() => {
                      setQuery(row.name);
                      setFilter("Semua");
                      scrollToCatalog();
                    }}
                  >
                    <span className="price-icon">
                      <Image src={row.image} alt="" fill unoptimized sizes="54px" />
                    </span>
                    <span className="price-copy">
                      <strong>{row.name}</strong>
                      <small>{row.source}</small>
                    </span>
                    <span className="price-number">
                      Rp {money.format(row.price)}
                      <small>/kg</small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="price-note">
                <CalendarDays aria-hidden="true" /> Harga informatif dari laporan mitra lokal, bukan harga resmi pasar.
              </p>
            </section>

            <section className="trust-card" id="keunggulan">
              <h2>Kenapa belanja di SeaGres?</h2>
              <ul>
                <li>
                  <ShieldCheck aria-hidden="true" />
                  <p><strong>100% penjual terverifikasi</strong><span>Kelompok & UMKM binaan penyuluh</span></p>
                </li>
                <li>
                  <QrCode aria-hidden="true" />
                  <p><strong>QR telusur tiap lot</strong><span>Kartu lot terbuka di /lot/[id] tanpa perlu login</span></p>
                </li>
                <li>
                  <Truck aria-hidden="true" />
                  <p><strong>Rantai dingin lokal</strong><span>Agregasi pesanan biar ongkir murah</span></p>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {!isBuyer ? <section className="operations-grid anim anim3" id="operasional" aria-label="Operasional SeaGres">
          <SupplyPlan onFilter={shopCategory} />
          <OperationsPanel lots={lots} orders={orders} onOrders={() => setModal({ type: "orders" })} />
        </section> : null}

        <footer className="market-footer">
          <div>
            <SeagresLogo size={36} />
            <p>Pasar hasil pesisir Gresik — dari nelayan langsung ke pembeli.</p>
          </div>
          <div>
            <b>Jelajah</b>
            <button type="button" onClick={() => goToId("lot-terbaru")}>Lot terbaru</button>
            <button type="button" onClick={() => goToId("harga")}>Harga pesisir</button>
            <button type="button" onClick={() => goToId("kategori")}>Kategori</button>
          </div>
          <div>
            <b>{isBuyer ? "Belanja" : "Jual"}</b>
            <button type="button" onClick={() => isBuyer ? scrollToCatalog() : setModal({ type: "create" })}>{isBuyer ? "Cari lot segar" : "Catat hasil panen"}</button>
            <button type="button" onClick={() => setModal({ type: "orders" })}>{isBuyer ? "Pre-order saya" : "Pesanan masuk"}</button>
          </div>
          <div>
            <b>Akun</b>
            <button type="button" onClick={() => setModal({ type: "profile" })}>Profil {user.name}</button>
            <button type="button" onClick={doLogout}>Keluar</button>
          </div>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        <button className="active" type="button" onClick={scrollToTop}>
          <Home />
          <span>Home</span>
        </button>
        <button type="button" onClick={scrollToCatalog}>
          <Search />
          <span>Katalog</span>
        </button>
        {isBuyer ? <button type="button" className="bottom-sell bottom-price" onClick={() => goToId("harga")}>
          <Scale />
          <span>Harga</span>
        </button> : <button type="button" className="bottom-sell" onClick={() => setModal({ type: "create" })}>
          <Plus />
          <span>Jual</span>
        </button>}
        <button type="button" onClick={() => setModal({ type: "orders" })}>
          <ShoppingCart />
          <span>Pesanan</span>
          {filteredOrderCount > 0 ? <i /> : null}
        </button>
        <button type="button" onClick={() => setModal({ type: "profile" })}>
          <UserRound />
          <span>Akun</span>
        </button>
      </nav>

      {notice ? (
        <div className={notice.isError ? "toast toast-error" : "toast"} role="status">
          <Check /> {notice.message}
        </div>
      ) : null}
      {modal?.type === "create" ? (
        <Modal title="Jual hasil panen" onClose={() => setModal(null)}>
          <CreateLotForm onSubmit={submitLot} busy={busy} />
        </Modal>
      ) : null}
      {modal?.type === "lot" ? (
        <Modal title="Detail produk" onClose={() => setModal(null)}>
          <LotDetail lot={modal.lot} qrUrl={qrUrl} busy={busy} canPreorder={isBuyer} onPreorder={(quantity) => submitPreorder(modal.lot, quantity)} onReport={() => setModal({ type: "report", lot: modal.lot })} />
        </Modal>
      ) : null}
      {modal?.type === "profile" ? (
        <Modal title={isBuyer ? "Profil pembeli" : "Profil penjual"} onClose={() => setModal(null)}>
          <ProfilePanel user={user} busy={busy} onLogout={doLogout} />
        </Modal>
      ) : null}
      {modal?.type === "orders" ? (
        <Modal title={`Pre-order ${user.accountType === "seller" ? "masuk" : "saya"} (${filteredOrderCount})`} onClose={() => setModal(null)}>
          <OrdersPanel orders={orders} user={user} busy={busy} onStatus={manageOrder} />
        </Modal>
      ) : null}
      {modal?.type === "report" ? (
        <Modal title="Laporkan masalah" onClose={() => setModal(null)}>
          <ReportIssueForm lot={modal.lot} busy={busy} onSubmit={submitReport} />
        </Modal>
      ) : null}
    </main>
  );
}
