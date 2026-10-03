export type AccountType = "pengepul" | "customer";

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  accountType: AccountType;
  role: string;
  organization: string;
  location: string;
  verified: boolean;
  verificationBasis: string;
  groupNumber: string;
  pwSalt: string;
  pwHash: string;
  token?: string;
}

export type PublicUser = Omit<User, "pwSalt" | "pwHash" | "token">;

export interface Price {
  name: string;
  price: number;
  source: string;
  image: string;
}

export interface LotQuality {
  cleanHandling: boolean;
  packaging: string;
  temperature: string;
  dispatch: string;
}

/**
 * Lot legacy dipertahankan untuk back-compat /lot/[id] dan alur pre-order
 * yang masih hidup. Katalog publik baru memakai Product.
 */
export interface Lot {
  id: string;
  name: string;
  type: string;
  price: number;
  coret: number | null;
  weight: number;
  seller: string;
  location: string;
  time: string;
  createdAt: string;
  size: string;
  image: string;
  rating: number;
  sold: number;
  promo: string | null;
  quality?: LotQuality;
}

export interface Order {
  id: string;
  lotId: string;
  buyerUserId: string;
  buyer: string;
  quantity: number;
  status: "Baru" | "Diterima" | "Ditolak" | string;
  createdAt: string;
}

export interface OrderView extends Order {
  product: string;
  seller: string;
}

export interface IssueReport {
  id: string;
  reporterUserId: string;
  reporter: string;
  lotId: string | null;
  category: string;
  description: string;
  status: "Baru" | "Ditinjau" | "Selesai";
  createdAt: string;
}

/**
 * Produk agregasi pengepul: 1 nama barang dikumpulkan dari banyak nelayan.
 * Kuantitas tersedia diturunkan dari jumlah sub_products (lihat
 * lib/queries#aggregateQuantity) — tidak ada kolom weight.
 */
export interface Product {
  id: string;
  name: string;
  type: "Bandeng" | "Udang" | "Kerang" | "Olahan";
  price: number;
  coret: number | null;
  size: string;
  image: string;
  promo: string | null;
  pengepulId: string;
  organization: string;
  location: string;
  barcode: string;
  createdAt: string;
}

export interface SubProduct {
  id: string;
  productId: string;
  fishermanName: string;
  quantity: number;
  unit: string;
  geoLat: number | null;
  geoLng: number | null;
  createdAt: string;
}

export type HistoryKind = "tambah_produk" | "terima_nelayan" | "jual";

export interface HistoryPoint {
  id: string;
  historyId: string;
  lat: number;
  lng: number;
  label: string | null;
  createdAt: string;
}

export type DocumentKind = "foto" | "dokumen";

export interface HistoryDocument {
  id: string;
  historyId: string;
  url: string;
  filename: string;
  mime: string;
  kind: DocumentKind;
  createdAt: string;
}

export interface ProductHistory {
  id: string;
  productId: string;
  subProductId: string | null;
  actorId: string;
  actor: string;
  kind: HistoryKind;
  note: string | null;
  quantityDelta: number;
  createdAt: string;
  points: HistoryPoint[];
  documents: HistoryDocument[];
}

/**
 * Detail produk: agregat dengan sub-products dan history (untuk katalog &
 * dashboard). Available = aggregateQuantity(subProducts) — di sini bukan
 * field, melainkan accessor di server.
 */
export interface ProductDetail extends Product {
  subProducts: SubProduct[];
  history: ProductHistory[];
  available: number;
}

export interface Database {
  users: User[];
  prices: Price[];
  lots: Lot[];
  orders: Order[];
  reports: IssueReport[];
}

export interface RegisterInput {
  name?: string;
  role?: string;
  accountType?: AccountType;
  organization?: string;
  location?: string;
  email?: string;
  password?: string;
}