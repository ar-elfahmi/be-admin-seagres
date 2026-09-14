"use client";

import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
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
  Sparkles,
  Star,
  Store,
  Truck,
  UserRound,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLot, logout, preorder, setOrderStatus } from "../actions";
import type { Lot, OrderView, Price, PublicUser } from "../../lib/types";

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
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const timer = window.setInterval(() => setLeft(secondsLeft()), 1000);
    return () => window.clearInterval(timer);
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
  busy,
}: {
  lot: Lot;
  qrUrl: string;
  onPreorder: (quantity: number) => void;
  busy: boolean;
}) {
  const [quantity, setQuantity] = useState(5);
  const pct = discountPct(lot);
  const soldOut = lot.weight <= 0;
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
      {soldOut ? (
        <p className="form-error">Stok lot ini sudah habis — hubungi kelompok penjual untuk panen berikutnya.</p>
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
    </div>
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
  const active = orders.filter((order) => order.status !== "Ditolak");
  const totals = active.reduce<Record<string, number>>((result, order) => {
    result[order.product] = (result[order.product] || 0) + order.quantity;
    return result;
  }, {});

  return (
    <div>
      <div className="aggregate-block">
        <span>Agregasi permintaan kelompok</span>
        {Object.entries(totals).length ? (
          Object.entries(totals).map(([product, quantity]) => (
            <p key={product}><strong>{product}</strong><b>{quantity} kg</b></p>
          ))
        ) : (
          <p><strong>Belum ada permintaan aktif</strong><b>0 kg</b></p>
        )}
      </div>
      <div className="order-list">
        {orders.length ? orders.map((order) => {
          const mine = order.seller === user.organization;
          return (
            <div key={order.id}>
              <Store />
              <p>
                <strong>{order.buyer}</strong>
                <span>{order.quantity} kg {order.product} · {order.seller}</span>
              </p>
              <span className="order-side">
                <b className={`status-${order.status.toLowerCase()}`}>{order.status}</b>
                {mine && order.status === "Baru" ? (
                  <span className="order-actions">
                    <button className="accept" type="button" disabled={busy} onClick={() => onStatus(order.id, "Diterima")}>Terima</button>
                    <button className="reject" type="button" disabled={busy} onClick={() => onStatus(order.id, "Ditolak")}>Tolak</button>
                  </span>
                ) : null}
              </span>
            </div>
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
  orders,
  onCatalog,
  onCreate,
  onOrders,
  onProfile,
  onJump,
}: {
  user: PublicUser;
  query: string;
  setQuery: (q: string) => void;
  orders: OrderView[];
  onCatalog: () => void;
  onCreate: () => void;
  onOrders: () => void;
  onProfile: () => void;
  onJump: (id: string) => void;
}) {
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
            <span className="brand-mark"><Waves /></span>
            <strong>sea<strong className="brand-green">gres</strong></strong>
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
              {orders.length > 0 ? <i>{orders.length}</i> : null}
            </button>
            <button className="header-icon" type="button" onClick={onOrders} aria-label="Notifikasi">
              <Bell />
            </button>
            <span className="header-divider" />
            <button className="sell-btn" type="button" onClick={onCreate}>
              <Plus /> Jual
            </button>
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

function HeroSlider({ onShop }: { onShop: (filter: string) => void; onSell: () => void }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(timer);
  }, [slide]);

  return (
    <section className="hero-slider" aria-label="Sorotan hari ini">
      {SLIDES.map((item, i) => (
        <article key={item.id} className={i === slide ? "slide active" : "slide"}>
          <Image src={item.image} alt="" fill sizes="(max-width: 880px) 100vw, 72vw" className="slide-img" />
          <div className="slide-shade" />
          <div className="slide-copy">
            <span className="slide-tag"><Sparkles aria-hidden="true" /> {item.tag}</span>
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
      <button className="slider-nav prev" type="button" onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)} aria-label="Slide sebelumnya"><ChevronLeft /></button>
      <button className="slider-nav next" type="button" onClick={() => setSlide((s) => (s + 1) % SLIDES.length)} aria-label="Slide berikutnya"><ChevronRight /></button>
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
  const [modal, setModal] = useState<ModalType>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredLots = lots.filter(
    (lot) =>
      (filter === "Semua" || lot.type === filter) &&
      (!normalizedQuery || `${lot.name} ${lot.seller} ${lot.location}`.toLocaleLowerCase("id-ID").includes(normalizedQuery)),
  );
  let displayLots = filteredLots;
  if (sort === "murah") displayLots = [...filteredLots].sort((a, b) => a.price - b.price);
  if (sort === "laris") displayLots = [...filteredLots].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
  const totalWeight = lots.reduce((sum, lot) => sum + lot.weight, 0);
  const activeGroups = new Set(lots.filter((lot) => lot.time.startsWith("Hari ini")).map((lot) => lot.seller)).size;

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
        onCatalog={scrollToCatalog}
        onCreate={() => setModal({ type: "create" })}
        onOrders={() => setModal({ type: "orders" })}
        onProfile={() => setModal({ type: "profile" })}
        onJump={goToId}
      />

      <div className="page-shell">
        <section className="hero-grid">
          <HeroSlider onShop={shopCategory} onSell={() => setModal({ type: "create" })} />
          <div className="hero-side anim anim2">
            <div className="side-card summary-card compact">
              <div className="summary-stats">
                <span><Scale aria-hidden="true" /><strong>{totalWeight}</strong>kg tersedia</span>
                <span><ShoppingCart aria-hidden="true" /><strong>{orders.length}</strong>pesanan</span>
                <span><Truck aria-hidden="true" /><strong>{activeGroups}</strong>kelompok</span>
              </div>
              <button type="button" onClick={() => setModal({ type: "orders" })}>Lihat pesanan <ChevronRight aria-hidden="true" /></button>
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
            <button type="button" onClick={() => setModal({ type: "create" })}>
              <span className="cat-icon cat-plus"><Plus aria-hidden="true" /></span>
              <span>Jual</span>
            </button>
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
                displayLots.map((lot, i) => <ProductCard key={lot.id} lot={lot} onOpen={openLot} index={i} />)
              ) : (
                <div className="empty-state">
                  <Search />
                  <h3>Produk tidak ditemukan</h3>
                  <p>Coba kata kunci atau komoditas lain.</p>
                </div>
              )}
            </div>
            {displayLots.length > 0 ? (
              <button className="load-more" type="button" onClick={scrollToTop}>
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

        <footer className="market-footer">
          <div>
            <strong>sea<strong className="brand-green">gres</strong></strong>
            <p>Pasar hasil pesisir Gresik — dari nelayan langsung ke pembeli.</p>
          </div>
          <div>
            <b>Jelajah</b>
            <button type="button" onClick={() => goToId("lot-terbaru")}>Lot terbaru</button>
            <button type="button" onClick={() => goToId("harga")}>Harga pesisir</button>
            <button type="button" onClick={() => goToId("kategori")}>Kategori</button>
          </div>
          <div>
            <b>Jual</b>
            <button type="button" onClick={() => setModal({ type: "create" })}>Catat hasil panen</button>
            <button type="button" onClick={() => setModal({ type: "orders" })}>Agregasi pesanan</button>
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
        <button type="button" className="bottom-sell" onClick={() => setModal({ type: "create" })}>
          <Plus />
          <span>Jual</span>
        </button>
        <button type="button" onClick={() => setModal({ type: "orders" })}>
          <ShoppingCart />
          <span>Pesanan</span>
          {orders.length > 0 ? <i /> : null}
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
          <LotDetail lot={modal.lot} qrUrl={qrUrl} busy={busy} onPreorder={(quantity) => submitPreorder(modal.lot, quantity)} />
        </Modal>
      ) : null}
      {modal?.type === "profile" ? (
        <Modal title="Profil penjual" onClose={() => setModal(null)}>
          <ProfilePanel user={user} busy={busy} onLogout={doLogout} />
        </Modal>
      ) : null}
      {modal?.type === "orders" ? (
        <Modal title={`Keranjang & pre-order (${orders.length})`} onClose={() => setModal(null)}>
          <OrdersPanel orders={orders} user={user} busy={busy} onStatus={manageOrder} />
        </Modal>
      ) : null}
    </main>
  );
}
