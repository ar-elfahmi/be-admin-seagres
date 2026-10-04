"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  Ellipsis,
  Eye,
  ListOrdered,
  LogOut,
  MapPin,
  Minus,
  Package,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  addSubProductAction,
  createProduct,
  deleteProductAction,
  logout,
  updateProductQuantity,
} from "../actions";
import type {
  HistoryKind,
  OrderView,
  ProductDetail,
  PublicUser,
} from "../../lib/types";
import type { RecentActivity } from "../../lib/queries";
import SeagresLogo from "./seagres-logo";
import AddFishermanForm from "./forms/add-fisherman-form";

interface PengepulDashboardProps {
  user: PublicUser;
  products: ProductDetail[];
  orders: OrderView[];
  activity: RecentActivity[];
}
const money = new Intl.NumberFormat("id-ID");

const FILTERS = ["Semua", "Bandeng", "Udang", "Kerang", "Olahan"] as const;
const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  tambah_produk: "Tambah produk",
  terima_nelayan: "Terima dari nelayan",
  jual: "Jual",
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}
type TrendCategory = "Semua" | "Bandeng" | "Udang" | "Kerang" | "Olahan";
const TREND_TICKS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 31];
const TREND_LABELS: Record<number, string> = {
  1: "1 Okt", 6: "6 Okt", 12: "12 Okt", 18: "18 Okt", 24: "24 Okt", 31: "31 Okt",
};
const TREND_SERIES: Record<TrendCategory, number[]> = {
  Semua: [120, 132, 101, 134, 90, 230, 210, 182, 233, 211, 192, 250],
  Bandeng: [40, 52, 31, 64, 30, 80, 70, 52, 73, 61, 62, 90],
  Udang: [30, 40, 25, 35, 25, 60, 55, 45, 60, 55, 50, 70],
  Kerang: [25, 22, 25, 20, 20, 45, 40, 45, 50, 45, 40, 50],
  Olahan: [25, 18, 20, 15, 15, 45, 45, 40, 50, 50, 40, 40],
};
const TOP_PRODUCTS = [
  { name: "Bandeng segar 3–4 ekor", qty: 142, growth: 18, type: "Bandeng" },
  { name: "Udang vaname size 50", qty: 96, growth: 12, type: "Udang" },
  { name: "Kerang hijau bersih", qty: 78, growth: 6, type: "Kerang" },
  { name: "Olahan bandeng presto", qty: 54, growth: 24, type: "Olahan" },
  { name: "Udang windu size 40", qty: 41, growth: -3, type: "Udang" },
];

export function isLocalAsset(src: string): boolean {
  return src.startsWith("/products/") || src.startsWith("/uploads/");
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

interface FishermanRowState {
  id: string;
  name: string;
  fishermanName: string;
  quantity: string;
  price: string;
  qualityClean: boolean;
  qualityPackaging: string;
  qualityTemperature: string;
  qualityDispatch: string;
  geoLat: string;
  geoLng: string;
  files: File[];
}

function newFishermanRow(): FishermanRowState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: "",
    fishermanName: "",
    quantity: "0",
    price: "",
    qualityClean: true,
    qualityPackaging: "Es & box food grade",
    qualityTemperature: "",
    qualityDispatch: "",
    geoLat: "",
    geoLng: "",
    files: [],
  };
}

function CreateProductForm({ onSubmit, busy }: { onSubmit: (data: FormData) => void; busy: boolean }) {
  const [rows, setRows] = useState<FishermanRowState[]>([newFishermanRow()]);

  function updateRow(id: string, patch: Partial<FishermanRowState>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((current) => [...current, newFishermanRow()]);
  }
  function removeRow(id: string) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    rows.forEach((row, index) => {
      data.set(`subName[${index}]`, row.name);
      data.set(`fishermanName[${index}]`, row.fishermanName);
      data.set(`subQuantity[${index}]`, row.quantity);
      data.set(`subPrice[${index}]`, row.price);
      if (row.qualityClean) data.set(`qualityClean[${index}]`, "on");
      data.set(`qualityPackaging[${index}]`, row.qualityPackaging);
      data.set(`qualityTemperature[${index}]`, row.qualityTemperature);
      data.set(`qualityDispatch[${index}]`, row.qualityDispatch);
      data.set(`geoLat[${index}]`, row.geoLat);
      data.set(`geoLng[${index}]`, row.geoLng);
      row.files.forEach((file) => data.append(`documents[${index}]`, file));
    });
    onSubmit(data);
  }

  function captureGeolocation(rowId: string) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateRow(rowId, {
          geoLat: String(position.coords.latitude),
          geoLng: String(position.coords.longitude),
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="sell-banner">
        <Truck aria-hidden="true" />
        <p>
          <strong>Catat hasil tangkapan nelayanmu.</strong>
          <span>Satu produk bisa menggabungkan banyak nelayan; barcode otomatis dibuat untuk kartu telusur.</span>
        </p>
      </div>
      <label>
        Nama produk<input name="name" placeholder="ex: Bandeng Pagi" required />
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
          Ukuran<input name="size" placeholder="ex: 3–4 ekor/kg" required />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Harga per kg<input name="price" type="number" min="1000" step="500" defaultValue="28000" required />
        </label>
        <label>
          Harga coret <small>(opsional)</small>
          <input name="coret" type="number" min="1000" step="500" placeholder="ex: 32000" />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Lokasi umum<input name="location" placeholder="ex: Ujungpangkah" required />
        </label>
        <label>
          Catatan promo <small>(opsional)</small>
          <input name="promo" placeholder="ex: Rantai Dingin" />
        </label>
      </div>
      <label>
        Foto produk <small>(opsional, maks 4 MB)</small>
        <input className="file-input" name="photo" type="file" accept="image/*" />
      </label>

      <fieldset className="fishermen-block">
        <legend>Sumber Nelayan</legend>
        {rows.map((row, index) => (
          <div key={row.id} className="fisherman-row">
            <header>
              <strong>Nelayan #{index + 1}</strong>
              {rows.length > 1 ? (
                <button className="icon-button" type="button" onClick={() => removeRow(row.id)} aria-label="Hapus nelayan">
                  <X />
                </button>
              ) : null}
            </header>
            <div className="form-grid">
              <label>
                Nama produk
                <input
                  type="text"
                  value={row.name}
                  onChange={(event) => updateRow(row.id, { name: event.target.value })}
                  placeholder="ex: Bandeng segar"
                />
              </label>
              <label>
                Nama nelayan
                <input
                  type="text"
                  value={row.fishermanName}
                  onChange={(event) => updateRow(row.id, { fishermanName: event.target.value })}
                  placeholder="ex: Pak Hasan"
                  required
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Kuantitas (kg)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.id, { quantity: event.target.value })}
                  required
                />
              </label>
              <label>
                Harga dari nelayan (Rp/kg)
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={row.price}
                  onChange={(event) => updateRow(row.id, { price: event.target.value })}
                  placeholder="ex: 28000"
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  value={row.geoLat}
                  onChange={(event) => updateRow(row.id, { geoLat: event.target.value })}
                  placeholder="opsional"
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  value={row.geoLng}
                  onChange={(event) => updateRow(row.id, { geoLng: event.target.value })}
                  placeholder="opsional"
                />
              </label>
            </div>
            <fieldset className="quality-block">
              <legend>Mutu & penanganan</legend>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={row.qualityClean}
                  onChange={(event) => updateRow(row.id, { qualityClean: event.target.checked })}
                />
                Penanganan bersih (ikan tidak rusak, tanpa es kotor)
              </label>
              <div className="form-grid">
                <label>
                  Kemasan
                  <select
                    value={row.qualityPackaging}
                    onChange={(event) => updateRow(row.id, { qualityPackaging: event.target.value })}
                  >
                    <option>Es & box food grade</option>
                    <option>Keranjang bersih</option>
                    <option>Kemasan olahan tersegel</option>
                    <option>Standar pengepul</option>
                  </select>
                </label>
                <label>
                  Suhu penyimpanan
                  <input
                    type="text"
                    value={row.qualityTemperature}
                    onChange={(event) => updateRow(row.id, { qualityTemperature: event.target.value })}
                    placeholder="ex: 0–4 °C"
                  />
                </label>
              </div>
              <label>
                Metode pengiriman ke pembeli
                <input
                  type="text"
                  value={row.qualityDispatch}
                  onChange={(event) => updateRow(row.id, { qualityDispatch: event.target.value })}
                  placeholder="ex: Mobil box berpendingin"
                />
              </label>
            </fieldset>
            <button className="link-button" type="button" onClick={() => captureGeolocation(row.id)}>
              <MapPin /> Ambil titik lokasi dari browser
            </button>
            <label>
              Dokumen pendukung (foto / PDF)
              <input
                className="file-input"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  updateRow(row.id, { files: row.files.concat(files) } as Partial<FishermanRowState>);
                }}
              />
            </label>
            {row.files.length ? (
              <ul className="file-list">
                {row.files.map((file, i) => (
                  <li key={`${file.name}-${i}`}>
                    {file.name} <small>{(file.size / 1024).toFixed(1)} KB</small>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        <button className="link-button" type="button" onClick={addRow}>
          <Plus /> Tambah nelayan
        </button>
      </fieldset>

      <label>
        Catatan event <small>(opsional)</small>
        <textarea name="historyNote" placeholder="ex: Hasil tangkapan pagi ini, dua rantai tongkat" />
      </label>

      <button className="primary-button form-submit" type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : <><Plus /> Catat produk & sumber</>}
      </button>
    </form>
  );
}

function TrendChart({ series }: { series: number[] }) {
  const w = 720;
  const h = 200;
  const padL = 40;
  const padR = 16;
  const padT = 24;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxRaw = Math.max(...series, 1);
  const yStep = maxRaw > 200 ? 50 : maxRaw > 80 ? 25 : 10;
  const yMax = Math.ceil(maxRaw / yStep) * yStep;
  const stepX = innerW / Math.max(series.length - 1, 1);
  const points = series.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - (v / yMax) * innerH;
    return { x, y, value: v, tick: TREND_TICKS[i] };
  });
  const baselineY = padT + innerH;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);
  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${padL},${baselineY} ${linePoints} ${(padL + (series.length - 1) * stepX).toFixed(1)},${baselineY}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Tren penjualan 12 periode terakhir" className="trend-svg">
      <g className="trend-grid-y">
        {yTicks.map((tk) => {
          const y = padT + innerH - (tk / yMax) * innerH;
          return (
            <g key={`y-${tk}`}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} />
              <text x={padL - 6} y={y + 4} textAnchor="end">{tk}</text>
            </g>
          );
        })}
      </g>
      <polygon points={areaPoints} className="trend-area" />
      <polyline points={linePoints} className="trend-line" />
      <g className="trend-axis-x">
        {points.map((p) => {
          const label = TREND_LABELS[p.tick];
          if (!label) return null;
          const isCurrent = p.tick === TREND_TICKS[TREND_TICKS.length - 1];
          return (
            <text key={`xl-${p.tick}`} x={p.x} y={baselineY + 18} textAnchor="middle" className={isCurrent ? "is-current" : ""}>
              {label}
            </text>
          );
        })}
      </g>
      <g className="trend-points">
        {points.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={p.x} cy={p.y} r={3} className={i === points.length - 1 ? "trend-dot current" : "trend-dot"} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="trend-value">{p.value}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
interface ProductCardProps {
  product: ProductDetail;
  onDeleted: (id: string) => void;
  onSold: (products: ProductDetail[]) => void;
  onReceived: (detail: ProductDetail) => void;
}
function ProductCard({ product, onDeleted, onSold, onReceived }: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<0 | 1>(0);
  const [sellOpen, setSellOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [subId, setSubId] = useState(product.subProducts[0]?.id ?? "");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmStep(0);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setConfirmStep(0);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleDelete() {
    if (confirmStep === 0) {
      setConfirmStep(1);
      return;
    }
    setBusy(true);
    try {
      const res = await deleteProductAction(product.id);
      if (res?.error) {
        window.alert(res.error);
        return;
      }
      onDeleted(product.id);
    } finally {
      setBusy(false);
      setMenuOpen(false);
      setConfirmStep(0);
    }
  }

  async function handleSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const qty = Number(amount);
    if (!subId) {
      setError("Pilih sumber nelayan dulu.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Masukkan jumlah jual lebih dari 0 kg.");
      return;
    }
    const selected = product.subProducts.find((sub) => sub.id === subId);
    if (selected && qty > selected.quantity) {
      setError(`Stok ${selected.fishermanName} tinggal ${selected.quantity.toFixed(1)} kg.`);
      return;
    }
    setBusy(true);
    try {
      const res = await updateProductQuantity(product.id, subId, "jual", qty);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res.products) onSold(res.products);
      setSellOpen(false);
      setAmount("1");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="product-card-row">
      <div className="pcr-top">
        <span className="pcr-thumb">
          <Image src={product.image} alt={product.name} fill sizes="64px" unoptimized={!isLocalAsset(product.image)} />
        </span>
        <div className="pcr-info">
          <strong>{product.name}</strong>
          <small>
            {product.type} · {product.size} · {product.location}
          </small>
          <div className="pcr-meta">
            <span className="stock-chip">
              <Scale /> {product.available.toFixed(1)} kg
            </span>
            <span className="price-chip">Rp{money.format(product.price)}/kg</span>
          </div>
        </div>
        <div className="pcr-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-button pcr-kebab"
            aria-label={`Opsi ${product.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirmStep(0);
            }}
          >
            <Ellipsis />
          </button>
          {menuOpen ? (
            <div className="pcr-menu-pop" role="menu">
              {confirmStep === 0 ? (
                <button type="button" role="menuitem" className="pcr-menu-danger" onClick={handleDelete}>
                  <Trash2 /> Hapus produk
                </button>
              ) : (
                <>
                  <p className="pcr-menu-warn">
                    Hapus “{product.name}”? Stok {product.available.toFixed(1)} kg ikut hilang permanen.
                  </p>
                  <button type="button" role="menuitem" className="pcr-menu-danger solid" onClick={handleDelete} disabled={busy}>
                    <Trash2 /> {busy ? "Menghapus…" : "Ya, hapus permanen"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="pcr-menu-cancel"
                    onClick={() => setConfirmStep(0)}
                    disabled={busy}
                  >
                    Batal
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pcr-actions">
        <button
          type="button"
          onClick={() => setReceiveOpen(true)}
          className="primary-mini"
          aria-label={`Terima hasil nelayan untuk ${product.name}`}
        >
          <Plus /> Terima
        </button>
        <button
          type="button"
          onClick={() => {
            setSubId(product.subProducts[0]?.id ?? "");
            setAmount("1");
            setError(null);
            setSellOpen(true);
          }}
          className="sell-mini"
          disabled={!product.subProducts.length}
          aria-label={`Jual ${product.name}`}
          title={product.subProducts.length ? undefined : "Belum ada sumber nelayan"}
        >
          <Minus /> Jual
        </button>
        <Link
          href={`/pengepul/produk/${product.id}`}
          className="ghost"
          aria-label={`Lihat detail ${product.name}`}
        >
          <Eye /> Detail
        </Link>
      </div>

      {sellOpen ? (
        <Modal title={`Jual — ${product.name}`} onClose={() => setSellOpen(false)}>
          <form className="form" onSubmit={handleSell}>
            {error ? <div className="form-error">{error}</div> : null}
            <label>
              Sumber nelayan
              <select value={subId} onChange={(event) => setSubId(event.target.value)} required>
                {product.subProducts.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.fishermanName} · {sub.quantity.toFixed(1)} kg
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jumlah jual (kg)
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={product.subProducts.find((sub) => sub.id === subId)?.quantity.toFixed(1)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <button className="primary-button form-submit" type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : <><Minus /> Catat penjualan</>}
            </button>
          </form>
        </Modal>
      ) : null}
      {receiveOpen ? (
        <Modal title={`Terima — ${product.name}`} onClose={() => setReceiveOpen(false)}>
          <AddFishermanForm productId={product.id} lockedProductName={`${product.name} · ${product.type} · ${product.size}`} onSaved={(detail) => { onReceived(detail); setReceiveOpen(false); }} />
        </Modal>
      ) : null}
    </article>
  );
}

export default function PengepulDashboard({ user, products, orders, activity }: PengepulDashboardProps) {
  const [list, setList] = useState<ProductDetail[]>(products);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [trend, setTrend] = useState<TrendCategory>("Semua");

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | "profile" | "orders" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError?: boolean } | null>(null);
  const router = useRouter();

  const filtered = list.filter((product) => {
    if (filter !== "Semua" && product.type !== filter) return false;
    if (query.trim()) {
      const q = query.trim().toLocaleLowerCase("id-ID");
      return `${product.name} ${product.organization} ${product.location}`.toLocaleLowerCase("id-ID").includes(q);
    }
    return true;
  });
  const newOrders = orders.filter((order) => order.status === "Baru").length;
  const pendingOrders = orders.filter((order) => order.status === "Baru");
  const totalStock = list.reduce((sum, product) => sum + product.available, 0);
  const totalFishermen = list.reduce((sum, product) => sum + product.subProducts.length, 0);

  function flash(message: string, isError = false) {
    setNotice({ message, isError });
    window.setTimeout(() => setNotice(null), 2800);
  }

  async function submitCreate(formData: FormData) {
    setBusy(true);
    try {
      const res = await createProduct(formData);
      if (res?.error) {
        flash(res.error, true);
      } else {
        if (res.products) setList(res.products);
        if (res.product) flash(`${res.product.name} tersimpan permanen dan tampil di katalog.`);
        setModal(null);
      }
    } catch {
      flash("Produk belum bisa disimpan. Coba lagi sebentar.", true);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setBusy(true);
    await logout();
    setBusy(false);
    router.push("/");
  }

  return (
    <main className="app-shell pengepul-shell" id="top">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <a className="brand" href="#top" aria-label="SeaGres, kembali ke atas">
            <SeagresLogo size={32} />
          </a>
          <div className="dashboard-title">
            <h1>Dasbor pengepul</h1>
            <small>Agregasi & telusur per nelayan · {user.organization}</small>
          </div>
          <div className="dashboard-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk, lokasi, atau nelayan…"
              aria-label="Cari produk"
            />
          </div>
          <div className="dashboard-actions">
            <button type="button" onClick={() => setModal("orders")} className="header-pill">
              <ShoppingCart /> Pesanan {newOrders > 0 ? <i>{newOrders}</i> : null}
            </button>
            <button type="button" onClick={() => setModal("profile")} className="avatar" aria-label={`Profil ${user.name}`}>
              {user.initials}
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <section className="stat-strip">
          <div className="stat-card">
            <Package aria-hidden="true" />
            <span className="stat-label">Produk aktif</span>
            <strong>{list.length}</strong>
            <small>{filtered.length === list.length ? "Semua komoditas" : `Tampil ${filtered.length}`}</small>
          </div>
          <div className="stat-card">
            <Scale aria-hidden="true" />
            <span className="stat-label">Stok agregat</span>
            <strong>{totalStock.toFixed(1)}<small> kg</small></strong>
            <small>{totalFishermen} sumber nelayan</small>
          </div>
          <div className="stat-card">
            <ShoppingCart aria-hidden="true" />
            <span className="stat-label">Pesanan baru</span>
            <strong>{newOrders}</strong>
            <small>Butuh konfirmasi</small>
          </div>
          <div className="stat-card">
            <ShieldCheck aria-hidden="true" />
            <span className="stat-label">Status pengepul</span>
            <strong>{user.verified ? "Terverifikasi" : "Menunggu"}</strong>
            <small>{user.verificationBasis}</small>
          </div>
        </section>

        <section className="dashboard-grid dashboard-grid-rows">
          <article className="dash-card trend-card">
            <header className="dash-card-head">
              <h3><TrendingUp aria-hidden="true" /> Tren penjualan</h3>
              <span className="dash-card-sub">12 periode terakhir · mock</span>
            </header>
            <div className="trend-chips" role="tablist" aria-label="Pilih kategori tren">
              {(["Semua", "Bandeng", "Udang", "Kerang", "Olahan"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={trend === item}
                  className={trend === item ? "selected" : ""}
                  onClick={() => setTrend(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="trend-chart-wrap">
              <TrendChart series={TREND_SERIES[trend]} />
            </div>
            <footer className="trend-foot">
              <span>Total {money.format(TREND_SERIES[trend].reduce((a, b) => a + b, 0))} kg</span>
              <span className="trend-delta">+12% vs periode lalu</span>
            </footer>
          </article>

          <article className="dash-card top-card">
            <header className="dash-card-head">
              <h3><Star aria-hidden="true" /> Produk terlaris bulan ini</h3>
              <span className="dash-card-sub">Mock · 5 teratas</span>
            </header>
            <ul className="top-list">
              {TOP_PRODUCTS.map((item) => (
                <li key={item.name}>
                  <span className="top-name">{item.name}</span>
                  <span className="top-qty">{item.qty} kg</span>
                  <span className={item.growth >= 0 ? "top-growth up" : "top-growth down"}>
                    {item.growth >= 0 ? "+" : ""}{item.growth}%
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="dash-card activity-card">
            <header className="dash-card-head">
              <h3><Clock aria-hidden="true" /> Aktivitas terbaru</h3>
              <span className="dash-card-sub">Event & pesanan · real</span>
            </header>
            <ul className="activity-list">
              {activity.length ? (
                activity.slice(0, 5).map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <span className={`activity-dot dot-${item.kind}`} />
                    <span className="activity-body">
                      {item.kind === "event" ? (
                        <>
                          <strong>{item.actor}</strong> {HISTORY_KIND_LABELS[item.historyKind]} <em>{item.productName}</em>
                          {item.quantityDelta ? <> · {item.quantityDelta > 0 ? "+" : ""}{item.quantityDelta} kg</> : null}
                          {item.note ? <small> — {item.note}</small> : null}
                        </>
                      ) : (
                        <>
                          <strong>{item.buyer}</strong> pre-order <em>{item.product}</em> · {item.quantity} kg
                          <small> — status {item.status}</small>
                        </>
                      )}
                    </span>
                    <time>{formatRelative(item.createdAt)}</time>
                  </li>
                ))
              ) : (
                <li className="activity-empty">Belum ada aktivitas tercatat.</li>
              )}
            </ul>
          </article>

          <article className="dash-card orders-card">
            <header className="dash-card-head">
              <h3><ListOrdered aria-hidden="true" /> Pesanan perlu aksi</h3>
              <span className="dash-card-sub">{pendingOrders.length} pesanan · status Baru</span>
            </header>
            {pendingOrders.length ? (
              <ul className="orders-mini">
                {pendingOrders.slice(0, 3).map((order) => (
                  <li key={order.id}>
                    <span className="order-buyer">{order.buyer}</span>
                    <span className="order-product">{order.product}</span>
                    <span className="order-qty">{order.quantity} kg</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="activity-empty">Belum ada pesanan baru.</p>
            )}
            <button type="button" className="dash-card-link" onClick={() => setModal("orders")}>
              Buka semua pesanan <ChevronRight aria-hidden="true" />
            </button>
          </article>
        </section>


        <section className="action-bar">
          <div className="filter-chips" role="tablist" aria-label="Filter komoditas">
            {FILTERS.map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={filter === item}
                className={filter === item ? "selected" : ""}
                type="button"
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="primary-button add-product" type="button" onClick={() => setModal("create")}>
            <Plus /> Tambah produk
          </button>
        </section>

        <section className="product-grid">
          {filtered.length ? (
            filtered.map((product) => (
              <ProductCard key={product.id} product={product} onDeleted={(id) => setList((cur) => cur.filter((p) => p.id !== id))} onSold={(products) => setList(products)} onReceived={(detail) => setList((cur) => cur.map((p) => (p.id === detail.id ? detail : p)))} />
            ))
          ) : (
            <div className="empty-state large">
              <Package />
              <h3>{list.length ? "Tidak ada produk cocok" : "Belum ada produk"}</h3>
              <p>
                {list.length
                  ? "Coba ubah filter atau kata kunci pencarian."
                  : "Tambahkan produk agregasi pertama untuk pengepulanmu."}
              </p>
              {!list.length ? (
                <button className="primary-button" type="button" onClick={() => setModal("create")}>
                  <Plus /> Tambah produk
                </button>
              ) : null}
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <small>
            <SeagresLogo size={20} showText={false} /> SeaGres · Pengepul pesisir Gresik
          </small>
          <small>© 2026 · dari banyak nelayan, satu jejak telusur</small>
        </footer>
      </div>

      {notice ? (
        <div className={notice.isError ? "toast toast-error" : "toast"} role="status">
          <Check /> {notice.message}
        </div>
      ) : null}

      {modal === "create" ? (
        <Modal title="Catat produk & sumber nelayan" onClose={() => setModal(null)}>
          <CreateProductForm onSubmit={submitCreate} busy={busy} />
        </Modal>
      ) : null}

      {modal === "orders" ? (
        <Modal title={`Pesanan masuk (${newOrders})`} onClose={() => setModal(null)}>
          <div className="orders-panel">
            <p className="hint">Penjualan dari katalog dilakukan via pre-order terhadap lot legacy.</p>
            {orders.length ? (
              <ul className="order-list">
                {orders.map((order) => (
                  <li key={order.id} className="order-item">
                    <strong>{order.buyer}</strong>
                    <span>{order.quantity} kg · {order.product}</span>
                    <em>{order.status}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state inline">
                <ShoppingCart />
                <h3>Belum ada pesanan</h3>
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {modal === "profile" ? (
        <Modal title="Profil pengepul" onClose={() => setModal(null)}>
          <div className="profile-panel">
            <span className="avatar profile-avatar">{user.initials}</span>
            <h3>{user.name}</h3>
            <p>{user.organization} · {user.location}</p>
            <span className="verified">
              <BadgeCheck /> {user.verified ? "Terverifikasi" : "Menunggu verifikasi"}
            </span>
            <dl>
              <div><dt>Peran</dt><dd>{user.role}</dd></div>
              <div><dt>Dasar verifikasi</dt><dd>{user.verificationBasis}</dd></div>
              <div><dt>Nomor kelompok</dt><dd>{user.groupNumber}</dd></div>
            </dl>
            <Link className="link-button" href="/">Lihat katalog publik</Link>
            <button type="button" className="logout-button" onClick={doLogout} disabled={busy}>
              <LogOut /> {busy ? "Keluar…" : "Keluar dari akun"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}