"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LogOut,
  MapPin,
  Package,
  Plus,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  addProductHistory,
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
  SubProduct,
} from "../../lib/types";
import SeagresLogo from "./seagres-logo";
import TraceCard from "./trace-card";

interface PengepulDashboardProps {
  user: PublicUser;
  products: ProductDetail[];
  orders: OrderView[];
}

const money = new Intl.NumberFormat("id-ID");

const FILTERS = ["Semua", "Bandeng", "Udang", "Kerang", "Olahan"];
const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  tambah_produk: "Tambah produk",
  terima_nelayan: "Terima dari nelayan",
  jual: "Jual",
};

function isLocalAsset(src: string): boolean {
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
  fishermanName: string;
  quantity: string;
  geoLat: string;
  geoLng: string;
  files: File[];
}

function newFishermanRow(): FishermanRowState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    fishermanName: "",
    quantity: "0",
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
      data.set(`fishermanName[${index}]`, row.fishermanName);
      data.set(`subQuantity[${index}]`, row.quantity);
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
                Nama nelayan
                <input
                  type="text"
                  value={row.fishermanName}
                  onChange={(event) => updateRow(row.id, { fishermanName: event.target.value })}
                  placeholder="ex: Pak Hasan"
                  required
                />
              </label>
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

interface FishermanControlProps {
  productId: string;
  sub: SubProduct;
}

function FishermanControl({ productId, sub }: FishermanControlProps) {
  const [mode, setMode] = useState<HistoryKind | null>(null);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    setBusy(true);
    try {
      const res = await updateProductQuantity(productId, sub.id, mode, Number(amount));
      if (res?.error) window.alert(res.error);
    } finally {
      setBusy(false);
      setMode(null);
    }
  }

  return (
    <div className="fisherman-control">
      <span>
        <strong>{sub.fishermanName}</strong> · {sub.quantity.toFixed(1)} kg
        {sub.geoLat !== null && sub.geoLng !== null ? (
          <small><MapPin /> {sub.geoLat.toFixed(4)}, {sub.geoLng.toFixed(4)}</small>
        ) : null}
      </span>
      {mode ? (
        <form onSubmit={apply}>
          <input
            type="number"
            min="0.5"
            step="0.1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <button type="submit" className="accept" disabled={busy}>
            {mode === "terima_nelayan" ? "Tambah" : "Kurangi"}
          </button>
          <button type="button" onClick={() => setMode(null)}>
            Batal
          </button>
        </form>
      ) : (
        <span>
          <button type="button" onClick={() => setMode("terima_nelayan")}>
            <Plus /> Terima
          </button>
          <button type="button" onClick={() => setMode("jual")}>
            <Truck /> Jual
          </button>
        </span>
      )}
    </div>
  );
}

function ProductRow({ product, onChanged }: { product: ProductDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function del() {
    if (busy) return;
    if (!window.confirm(`Hapus produk ${product.name}? Riwayat dan sub-produk ikut terhapus.`)) return;
    setBusy(true);
    try {
      const res = await deleteProductAction(product.id);
      if (res?.error) window.alert(res.error);
      else onChanged();
    } finally {
      setBusy(false);
    }
  }

  const traceUrl = typeof window === "undefined" ? `/produk/${product.id}` : `${window.location.origin}/produk/${product.id}`;

  return (
    <article className="product-row">
      <header>
        <span className="product-thumb">
          <Image src={product.image} alt={product.name} fill sizes="80px" unoptimized={!isLocalAsset(product.image)} />
        </span>
        <div className="product-summary">
          <strong>{product.name}</strong>
          <span><BadgeCheck /> {product.type} · {product.size}</span>
          <span><MapPin /> {product.location}</span>
          <span>
            <Scale /> Tersedia {product.available.toFixed(1)} kg ·{" "}
            Rp{money.format(product.price)}
            {product.coret ? <s>Rp{money.format(product.coret)}</s> : null} /kg
          </span>
          <small className="barcode-chip">{product.barcode}</small>
        </div>
        <div className="product-actions">
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? "Ringkas" : "Kelola"} <ChevronDown />
          </button>
          <button type="button" onClick={del} disabled={busy} className="reject">
            <Trash2 /> Hapus
          </button>
        </div>
      </header>
      {open ? (
        <div className="product-detail">
          <section className="fishermen-list">
            <h3>Sub-produk per nelayan</h3>
            {product.subProducts.length ? (
              product.subProducts.map((sub) => (
                <FishermanControl key={sub.id} productId={product.id} sub={sub} />
              ))
            ) : (
              <p className="empty-state inline">Belum ada sub-produk.</p>
            )}
          </section>
          <section className="history-list">
            <h3>Riwayat event</h3>
            {product.history.length ? (
              product.history.map((event) => (
                <div key={event.id} className="history-row">
                  <span>
                    <strong>{HISTORY_KIND_LABELS[event.kind]}</strong>
                    <small>{new Date(event.createdAt).toLocaleString("id-ID")}</small>
                  </span>
                  {event.note ? <p>{event.note}</p> : null}
                  {event.points.length ? (
                    <ul>
                      {event.points.map((point) => (
                        <li key={point.id}>
                          <MapPin /> {point.lat.toFixed(4)}, {point.lng.toFixed(4)}{" "}
                          {point.label ? <em>{point.label}</em> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {event.documents.length ? (
                    <ul>
                      {event.documents.map((doc) => (
                        <li key={doc.id}>
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            <FileText /> {doc.filename}
                          </a>
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
                </div>
              ))
            ) : (
              <p className="empty-state inline">Belum ada event.</p>
            )}
          </section>
          <TraceCard barcode={product.barcode} productName={product.name} url={traceUrl} />
        </div>
      ) : null}
    </article>
  );
}

export default function PengepulDashboard({ user, products, orders }: PengepulDashboardProps) {
  const [list, setList] = useState<ProductDetail[]>(products);
  const [filter, setFilter] = useState("Semua");
  const [modal, setModal] = useState<"create" | "profile" | "orders" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError?: boolean } | null>(null);
  const router = useRouter();

  const filtered = list.filter((product) => filter === "Semua" || product.type === filter);
  const newOrders = orders.filter((order) => order.status === "Baru").length;
  const totalStock = list.reduce((sum, product) => sum + product.available, 0);

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
    router.refresh();
  }

  return (
    <main className="app-shell pengepul-shell" id="top">
      <header className="tokopedia-header">
        <div className="top-strip">
          <div className="top-strip-inner">
            <span><Truck aria-hidden="true" /> Dashboard pengepul · agregasi & telusur per nelayan</span>
          </div>
        </div>
        <div className="main-header">
          <div className="main-header-inner">
            <a className="brand" href="#top" aria-label="SeaGres, kembali ke atas">
              <SeagresLogo size={32} />
            </a>
            <span className="role-pill">Pengepul</span>
            <button type="button" className="avatar" onClick={() => setModal("profile")} aria-label={`Profil ${user.name}`}>
              {user.initials}
            </button>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="hero-grid">
          <div className="hero-side anim anim2">
            <div className="side-card summary-card compact">
              <div className="summary-stats">
                <span><Package aria-hidden="true" /><strong>{list.length}</strong>produk</span>
                <span><Scale aria-hidden="true" /><strong>{totalStock.toFixed(1)}</strong>kg total</span>
                <span><ShoppingCart aria-hidden="true" /><strong>{newOrders}</strong>pesanan</span>
              </div>
              <button type="button" onClick={() => setModal("orders")}>
                Buka pesanan <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="operations-grid anim anim3">
          <article className="supply-panel">
            <div className="ops-heading">
              <div><ClipboardCheck aria-hidden="true" /><h2>Produk agregasi aktif</h2></div>
              <button className="primary-button" type="button" onClick={() => setModal("create")}>
                <Plus /> Tambah produk
              </button>
            </div>
            <p className="hint">
              <ShieldCheck aria-hidden="true" /> Setiap produk memiliki barcode yang bisa dicetak menjadi kartu
              telusur QR untuk setiap titik distribusi.
            </p>
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
            <div className="product-list">
              {filtered.length ? (
                filtered.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onChanged={() => router.refresh()}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Package />
                  <h3>Belum ada produk</h3>
                  <p>Tambahkan produk agregasi pertama untuk pengepulanmu.</p>
                </div>
              )}
            </div>
          </article>
        </section>

        <footer className="market-footer">
          <div>
            <SeagresLogo size={36} />
            <p>Pengepul pesisir Gresik — dari banyak nelayan, satu jejak telusur.</p>
          </div>
          <div>
            <b>Akun</b>
            <button type="button" onClick={() => setModal("profile")}>Profil {user.name}</button>
            <button type="button" onClick={doLogout}><LogOut /> Keluar</button>
          </div>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        <a className="active" href="#top"><Store /><span>Beranda</span></a>
        <Link href="/"><UserRound /><span>Katalog</span></Link>
        <button type="button" onClick={doLogout}><LogOut /><span>Keluar</span></button>
      </nav>

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
            <p className="hint">Penjualan dari katalog dilakukan via pre-order terhadap lot legacy. Notifikasi pesanan di luar konteks pengepul.</p>
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
            <span className="verified"><BadgeCheck /> {user.verified ? "Terverifikasi" : "Menunggu verifikasi"}</span>
            <dl>
              <div><dt>Peran</dt><dd>{user.role}</dd></div>
              <div><dt>Dasar verifikasi</dt><dd>{user.verificationBasis}</dd></div>
              <div><dt>Nomor kelompok</dt><dd>{user.groupNumber}</dd></div>
            </dl>
            <button type="button" className="logout-button" onClick={doLogout} disabled={busy}>
              <LogOut /> {busy ? "Keluar…" : "Keluar dari akun"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}