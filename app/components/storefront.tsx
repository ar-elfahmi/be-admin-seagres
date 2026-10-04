"use client";

import Image from "next/image";
import Link from "next/link";
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
import * as QRCodeLibrary from "qrcode";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logout, reportIssue, setOrderStatus } from "../actions";
import type {
  OrderView,
  Price,
  Product,
  ProductDetail,
  ProductHistory,
  PublicUser,
  SubProduct,
} from "../../lib/types";
import SeagresLogo from "./seagres-logo";
import TraceCard from "./trace-card";

interface SlideItem {
  id: string;
  image: string;
  tag: string;
  title: string;
  sub: string;
  filter: string;
}

const SLIDES: SlideItem[] = [
  { id: "bandeng", image: "/products/bandeng.png", tag: "Panen pagi ini · 06:30", title: "Bandeng segar dari Ujungpangkah", sub: "Langsung dari pengepul, tercatat sebagai produk agregasi dengan kartu QR.", filter: "Bandeng" },
  { id: "udang", image: "/products/udang-vaname.png", tag: "Populer minggu ini", title: "Udang vaname size 50 dari Manyar", sub: "Dikirim dengan rantai dingin ke seluruh Gresik.", filter: "Udang" },
  { id: "kerang", image: "/products/kerang-hijau.png", tag: "Harga mitra lokal", title: "Kerang hijau mulai Rp18.000/kg", sub: "Dari kelompok binaan penyuluh — kualitas dicek, asal-usul bisa dilacak.", filter: "Kerang" },
];

const FILTERS = ["Semua", "Bandeng", "Udang", "Kerang", "Olahan"];
const SORTS: [string, string][] = [["terbaru", "Terbaru"], ["murah", "Harga terendah"], ["laris", "Terlaris"]];
const PRODUCTS_PER_PAGE = 6;
const money = new Intl.NumberFormat("id-ID");

function isLocalAsset(src: string): boolean {
  return src.startsWith("/products/") || src.startsWith("/uploads/");
}

function useFlashCountdown(): string {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const update = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(18, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      setLeft(Math.floor((target.getTime() - now.getTime()) / 1000));
    };
    const timer = window.setInterval(update, 1000);
    update();
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

function discountPct(product: Product): number {
  return product.coret ? Math.round((1 - product.price / product.coret) * 100) : 0;
}

function ProductCard({ product, onOpen, index }: { product: ProductDetail; onOpen: (product: ProductDetail) => void; index: number }) {
  const pct = discountPct(product);
  const soldOut = product.available <= 0;
  return (
    <button className="product-card anim" style={{ animationDelay: `${60 + (index % 6) * 60}ms` }} type="button" onClick={() => onOpen(product)}>
      <span className="product-img">
        <Image src={product.image} alt={product.name} fill sizes="240px" unoptimized={!isLocalAsset(product.image)} />
        {pct > 0 ? <span className="sale-chip">-{pct}%</span> : null}
        {soldOut ? <span className="sold-out-label">Stok habis</span> : null}
      </span>
      <span className="product-body">
        <strong className="product-title">{product.name}</strong>
        <span className="product-price">
          Rp{money.format(product.price)}
          {product.coret ? <s>Rp{money.format(product.coret)}</s> : null}
          <span className="per">/kg</span>
        </span>
        <span className="verify-line">
          <ShieldCheck aria-hidden="true" /> Terverifikasi · {product.available.toFixed(1)} kg
        </span>
        <span className="product-loc">
          <MapPin aria-hidden="true" /> <span className="loc-text">{product.location}</span>
          {product.promo ? <em className="chip chip-green">{product.promo}</em> : null}
        </span>
        <Rating value={4.9} sold={0} />
      </span>
    </button>
  );
}

function ProductDetail({
  product,
  qrUrl,
  onClose,
}: {
  product: ProductDetail;
  qrUrl: string;
  onClose: () => void;
}) {
  const pct = discountPct(product);
  const soldOut = product.available <= 0;
  return (
    <div className="lot-detail">
      <div className="pdp-top">
        <span className="detail-photo">
          <Image src={product.image} alt={product.name} fill sizes="200px" unoptimized={!isLocalAsset(product.image)} />
        </span>
        <div className="pdp-title">
          <Verified>Produk terverifikasi</Verified>
          <h3>{product.name}</h3>
          <p>{product.barcode} · {product.organization}</p>
          <Rating value={4.9} sold={0} />
          <p className="pdp-price">
            Rp {money.format(product.price)}
            {product.coret ? <s>Rp {money.format(product.coret)}</s> : null}
            {pct > 0 ? <b className="pdp-off">{pct}% off</b> : null}
            <small>/kg</small>
          </p>
        </div>
      </div>
      <dl className="detail-grid">
        <div><dt>Stok tersedia</dt><dd>{product.available.toFixed(1)} kg</dd></div>
        <div><dt>Ukuran</dt><dd>{product.size}</dd></div>
        <div><dt>Lokasi</dt><dd>{product.location}</dd></div>
        <div><dt>Komoditas</dt><dd>{product.type}</dd></div>
      </dl>

      <section className="fishermen-detail">
        <h3>Sumber nelayan</h3>
        {product.subProducts.length ? (
          <ul>
            {product.subProducts.map((sub: SubProduct) => (
              <li key={sub.id}>
                <strong>{sub.name || sub.fishermanName}</strong>
                <span>
                  {sub.fishermanName} · {sub.quantity.toFixed(1)} kg · Rp{money.format(sub.price)}/kg
                </span>
                <span>
                  {sub.quality.cleanHandling ? "Bersih" : "Perlu cek"} · {sub.quality.packaging}
                  {sub.quality.temperature ? ` · ${sub.quality.temperature}` : ""}
                </span>
                <span>
                  {sub.geoLat !== null && sub.geoLng !== null
                    ? `${sub.geoLat.toFixed(4)}, ${sub.geoLng.toFixed(4)}`
                    : "lokasi umum"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada data sub-produk.</p>
        )}
      </section>

      <section className="history-detail">
        <h3>Riwayat event</h3>
        {product.history.length ? (
          <ol>
            {product.history.map((event: ProductHistory) => (
              <li key={event.id}>
                <strong>{event.kind === "tambah_produk" ? "Tambah produk" : event.kind === "terima_nelayan" ? "Terima dari nelayan" : "Jual"}</strong>
                <span>{new Date(event.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {event.actor}</span>
                {event.note ? <p>{event.note}</p> : null}
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
                {event.quantityDelta !== 0 ? (
                  <em className={event.quantityDelta > 0 ? "delta-up" : "delta-down"}>
                    {event.quantityDelta > 0 ? "+" : ""}
                    {event.quantityDelta.toFixed(1)} kg
                  </em>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p>Belum ada event tercatat.</p>
        )}
      </section>

      {soldOut ? (
        <p className="form-error">Stok produk ini sudah habis — hubungi pengepul untuk panen berikutnya.</p>
      ) : null}

      <div className="trace-row">
        <div className="qr-box">
          {qrUrl ? <Image src={qrUrl} alt={`QR untuk produk ${product.id}`} width={104} height={104} unoptimized /> : <span>Menyiapkan QR…</span>}
        </div>
        <p>
          <strong>Lacak asal-usul produk</strong>
          <br />
          Scan QR untuk membuka kartu telusur:{" "}
          <a className="lot-link" href={`/produk/${product.id}`}>lihat /produk/{product.id}</a>
          <br />
          Pengepul {product.organization} · {product.location}
        </p>
      </div>

      <TraceCard barcode={product.barcode} productName={product.name} url={`${typeof window === "undefined" ? "" : window.location.origin}/produk/${product.id}`} />

      <button className="report-link" type="button" onClick={onClose}>Tutup detail</button>
    </div>
  );
}

function ReportIssueForm({ product, onSubmit, busy }: { product?: ProductDetail; onSubmit: (data: FormData) => void; busy: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="form report-form" onSubmit={submit}>
      <div className="report-intro">
        <Bell aria-hidden="true" />
        <p><strong>Tim pendamping akan menindaklanjuti laporanmu.</strong><span>Lokasi titik dan data pribadi tidak dipublikasikan.</span></p>
      </div>
      <input name="lotId" type="hidden" value={product?.id ?? ""} />
      {product ? <p className="report-lot">Produk terkait: <strong>{product.name}</strong> · {product.barcode}</p> : null}
      <label>
        Jenis masalah
        <select name="category" defaultValue="Mutu produk">
          <option>Mutu produk</option>
          <option>Keterlambatan pengambilan</option>
          <option>Produk tidak sesuai</option>
          <option>Masalah lain</option>
        </select>
      </label>
      <label>
        Ceritakan yang terjadi
        <textarea name="description" minLength={10} placeholder="Jelaskan kondisi produk atau pesanan secara singkat…" required />
      </label>
      <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim laporan"}</button>
    </form>
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
  busy,
}: {
  orders: OrderView[];
  user: PublicUser;
  busy: boolean;
  onStatus: () => void;
}) {
  const isPengepul = user.accountType === "pengepul";
  const myOrgKey = (user.organization ?? "").trim().toLocaleLowerCase("id-ID");
  const visibleOrders = orders.filter((order) =>
    isPengepul
      ? (order.seller ?? "").trim().toLocaleLowerCase("id-ID") === myOrgKey
      : order.buyerUserId === user.id
  );
  return (
    <div className="orders-panel">
      <div className="aggregate-block">
        <div className="aggregate-heading">
          <span>Pre-order aktif</span>
          <small>Hubungi pengepul untuk konfirmasi.</small>
        </div>
      </div>
      <div className="order-list">
        {visibleOrders.length ? (
          visibleOrders.map((order) => (
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
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state inline"><ShoppingCart /><h3>Belum ada pre-order</h3><p>Pesanan akan muncul di sini.</p></div>
        )}
      </div>
      {busy ? null : null}
    </div>
  );
}

function TopHeader({
  user,
  query,
  setQuery,
  myOrderCount,
  onCatalog,
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
  onCatalog: () => void;
  onOrders: () => void;
  onProfile: () => void;
  onReport: () => void;
  onJump: (id: string) => void;
  accountType: PublicUser["accountType"];
}) {
  const isCustomer = accountType === "customer";
  return (
    <header className="tokopedia-header">
      <div className="top-strip">
        <div className="top-strip-inner">
          <span><Truck aria-hidden="true" /> Pengiriman dingin area Gresik · produk dicatat hari ini gratis kurir lokal</span>
          <nav>
            <button type="button" onClick={() => onJump("produk-terbaru")}>Tentang SeaGres</button>
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bandeng, udang vaname, kerang, pengepul…" />
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
            <span className="role-pill">{isCustomer ? "Pembeli" : "Pengepul"}</span>
            {!isCustomer ? <Link className="sell-btn" href="/dashboard"><Plus /> Dasbor</Link> : null}
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

function FlashSale({ products, onOpen }: { products: ProductDetail[]; onOpen: (product: ProductDetail) => void }) {
  const countdown = useFlashCountdown();
  const items = products.filter((product) => product.coret);
  if (!items.length) return null;
  return (
    <section className="flash-strip anim anim2" id="flash">
      <div className="flash-head">
        <span className="flame"><Clock aria-hidden="true" /></span>
        <div>
          <h2>Panen Hari Ini</h2>
          <p>Diskon dari pengepul — berakhir pukul 18.00</p>
        </div>
        <span className="countdown"><Clock aria-hidden="true" /> <b>{countdown}</b></span>
      </div>
      <div className="flash-rail">
        {items.map((product) => (
          <button className="flash-card" type="button" key={product.id} onClick={() => onOpen(product)}>
            <span className="flash-img">
              <Image src={product.image} alt={product.name} fill sizes="170px" unoptimized={!isLocalAsset(product.image)} />
              <b>-{discountPct(product)}%</b>
            </span>
            <span className="flash-copy">
              <strong>Rp{money.format(product.price)}</strong>
              <s>Rp{money.format(product.coret!)}</s>
              <small>{product.name}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

type ModalType =
  | { type: "product"; product: ProductDetail }
  | { type: "profile" }
  | { type: "orders" }
  | { type: "report"; product?: ProductDetail }
  | null;

interface Notice {
  message: string;
  isError?: boolean;
}

interface StorefrontProps {
  user: PublicUser;
  initialProducts: ProductDetail[];
  initialOrders: OrderView[];
  prices: Price[];
}

interface CollectorGroup {
  organization: string;
  products: ProductDetail[];
}

function groupByCollector(products: ProductDetail[]): CollectorGroup[] {
  const map = new Map<string, ProductDetail[]>();
  for (const product of products) {
    const list = map.get(product.organization) ?? [];
    list.push(product);
    map.set(product.organization, list);
  }
  return Array.from(map.entries()).map(([organization, items]) => ({ organization, products: items }));
}

export default function Storefront({ user, initialProducts, initialOrders, prices }: StorefrontProps) {
  const [products, setProducts] = useState<ProductDetail[]>(initialProducts);
  const [orders, setOrders] = useState<OrderView[]>(initialOrders);
  const [filter, setFilter] = useState("Semua");
  const [sort, setSort] = useState("terbaru");
  const [query, setQuery] = useState("");
  const [visibleProducts, setVisibleProducts] = useState(PRODUCTS_PER_PAGE);
  const [modal, setModal] = useState<ModalType>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isCustomer = user.accountType === "customer";

  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredProducts = products.filter(
    (product) =>
      (filter === "Semua" || product.type === filter) &&
      (!normalizedQuery || `${product.name} ${product.organization} ${product.location}`.toLocaleLowerCase("id-ID").includes(normalizedQuery))
  );
  let displayProducts = filteredProducts;
  if (sort === "murah") displayProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  if (sort === "laris") displayProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  const pagedProducts = displayProducts.slice(0, visibleProducts);
  const totalWeight = products.reduce((sum, product) => sum + product.available, 0);
  const activeGroups = new Set(products.map((product) => product.organization)).size;
  const filteredOrderCount = isCustomer
    ? orders.filter((order) => order.buyerUserId === user.id).length
    : orders.filter((order) => (order.seller ?? "").trim().toLocaleLowerCase("id-ID") === (user.organization ?? "").trim().toLocaleLowerCase("id-ID")).length;

  function flash(message: string, isError = false) {
    setNotice({ message, isError });
    window.setTimeout(() => setNotice(null), 2800);
  }

  async function openProduct(product: ProductDetail) {
    setModal({ type: "product", product });
    setQrUrl("");
    try {
      const data = await QRCodeLibrary.toDataURL(`${window.location.origin}/produk/${product.id}`, {
        width: 220,
        margin: 1,
        color: { dark: "#1e5aa8", light: "#ffffff" },
      });
      setQrUrl(data);
    } catch {
      setQrUrl("");
    }
  }

  async function submitReport(formData: FormData) {
    setBusy(true);
    try {
      const res = await reportIssue(formData);
      if (res?.error) flash(res.error, true);
      else {
        flash("Laporan diterima. Pendamping akan menindaklanjuti melalui SeaGres.");
        setModal(null);
      }
    } catch {
      flash("Laporan belum bisa dikirim. Coba lagi sebentar.", true);
    }
    setBusy(false);
  }

  async function manageOrder(orderId: string, status: string) {
    setBusy(true);
    try {
      const res = await setOrderStatus(orderId, status);
      if (res?.error) flash(res.error, true);
      else if (res.orders) setOrders(res.orders);
    } catch {
      flash("Status belum bisa diubah. Coba lagi.", true);
    }
    setBusy(false);
  }

  async function doLogout() {
    setBusy(true);
    await logout();
    setModal(null);
    setBusy(false);
    router.push("/");
  }

  function scrollToCatalog() {
    document.getElementById("produk-terbaru")?.scrollIntoView({ behavior: "smooth" });
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

  const collectorGroups = groupByCollector(pagedProducts);

  return (
    <main className="app-shell" id="top">
      <TopHeader
        user={user}
        query={query}
        setQuery={setQuery}
        myOrderCount={filteredOrderCount}
        onCatalog={scrollToCatalog}
        onOrders={() => setModal({ type: "orders" })}
        onProfile={() => setModal({ type: "profile" })}
        onReport={() => setModal({ type: "report" })}
        onJump={goToId}
        accountType={user.accountType}
      />

      <div className="page-shell">
        <section className="hero-grid">
          <HeroSlider onShop={shopCategory} />
          <div className="hero-side anim anim2">
            <div className="side-card summary-card compact">
              <div className="summary-stats">
                <span><Scale aria-hidden="true" /><strong>{totalWeight.toFixed(1)}</strong>kg tersedia</span>
                <span><ShoppingCart aria-hidden="true" /><strong>{filteredOrderCount}</strong>pesanan</span>
                <span><Truck aria-hidden="true" /><strong>{activeGroups}</strong>pengepul</span>
              </div>
              <button type="button" onClick={() => setModal({ type: "orders" })}>{isCustomer ? "Lihat pre-order saya" : "Lihat pesanan masuk"} <ChevronRight aria-hidden="true" /></button>
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
            {!isCustomer ? <button type="button" onClick={() => router.push("/dashboard")}>
              <span className="cat-icon cat-plus"><Plus aria-hidden="true" /></span>
              <span>Dasbor</span>
            </button> : null}
          </div>
        </section>

        <FlashSale products={products} onOpen={openProduct} />

        <div className="content-grid">
          <section className="lots-section anim anim3" id="produk-terbaru">
            <div className="section-heading">
              <div>
                <h2>Rekomendasi untukmu</h2>
                <p>Produk agregasi terbaru dari pengepul pesisir Gresik.</p>
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
              <span className="sr-only">Cari produk</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari komoditas, pengepul, atau lokasi" />
            </label>
            {displayProducts.length ? (
              <div className="collector-groups">
                {collectorGroups.map((group) => (
                  <article key={group.organization} className="collector-group">
                    <header>
                      <ShieldCheck aria-hidden="true" />
                      <h3>{group.organization}</h3>
                      <small>{group.products.length} produk</small>
                    </header>
                    <div className="product-grid">
                      {group.products.map((product, i) => (
                        <ProductCard key={product.id} product={product} onOpen={openProduct} index={i} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search />
                <h3>Produk tidak ditemukan</h3>
                <p>Coba kata kunci atau komoditas lain.</p>
              </div>
            )}
            {pagedProducts.length < displayProducts.length ? (
              <button className="load-more" type="button" onClick={() => setVisibleProducts((count) => Math.min(count + PRODUCTS_PER_PAGE, displayProducts.length))}>
                Muat lebih banyak <ChevronDown aria-hidden="true" />
              </button>
            ) : null}
          </section>

          <aside className="side-rail anim anim3">
            <section className="prices" id="harga">
              <div className="section-heading">
                <h2>Harga pesisir</h2>
                <time dateTime="2026-10-13">13 Okt 2026</time>
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
                  <p><strong>100% pengepul terverifikasi</strong><span>Kelompok & UMKM binaan penyuluh</span></p>
                </li>
                <li>
                  <QrCode aria-hidden="true" />
                  <p><strong>QR telusur tiap produk</strong><span>Kartu terbuka di /produk/[id] tanpa perlu login</span></p>
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
            <SeagresLogo size={36} />
            <p>Pasar hasil pesisir Gresik — dari pengepul langsung ke pembeli.</p>
          </div>
          <div>
            <b>Jelajah</b>
            <button type="button" onClick={() => goToId("produk-terbaru")}>Produk terbaru</button>
            <button type="button" onClick={() => goToId("harga")}>Harga pesisir</button>
            <button type="button" onClick={() => goToId("kategori")}>Kategori</button>
          </div>
          <div>
            <b>{isCustomer ? "Belanja" : "Dasbor"}</b>
            <button type="button" onClick={() => (isCustomer ? scrollToCatalog() : router.push("/dashboard"))}>{isCustomer ? "Cari produk segar" : "Buka dasbor pengepul"}</button>
            <button type="button" onClick={() => setModal({ type: "orders" })}>{isCustomer ? "Pre-order saya" : "Pesanan masuk"}</button>
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
        {isCustomer ? <button type="button" className="bottom-sell bottom-price" onClick={() => goToId("harga")}>
          <Scale />
          <span>Harga</span>
        </button> : <button type="button" className="bottom-sell" onClick={() => router.push("/dashboard")}>
          <Plus />
          <span>Dasbor</span>
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
      {modal?.type === "product" ? (
        <Modal title="Detail produk" onClose={() => setModal(null)}>
          <ProductDetail product={modal.product} qrUrl={qrUrl} onClose={() => setModal(null)} />
        </Modal>
      ) : null}
      {modal?.type === "profile" ? (
        <Modal title={isCustomer ? "Profil pembeli" : "Profil pengepul"} onClose={() => setModal(null)}>
          <ProfilePanel user={user} busy={busy} onLogout={doLogout} />
        </Modal>
      ) : null}
      {modal?.type === "orders" ? (
        <Modal title={`Pre-order ${isCustomer ? "saya" : "masuk"} (${filteredOrderCount})`} onClose={() => setModal(null)}>
          <OrdersPanel orders={orders} user={user} busy={busy} onStatus={() => undefined} />
        </Modal>
      ) : null}
      {modal?.type === "report" ? (
        <Modal title="Laporkan masalah" onClose={() => setModal(null)}>
          <ReportIssueForm product={modal.product} busy={busy} onSubmit={submitReport} />
        </Modal>
      ) : null}
    </main>
  );
}