import type {
  AccountType,
  Database,
  IssueReport,
  Lot,
  LotQuality,
  Order,
  OrderView,
  Price,
  PublicUser,
  User,
} from "./types";

/**
 * Data access layer di atas Supabase (pengganti db.json).
 * Kontrak penting: field number dari Postgres (numeric) datang sebagai string
 * lewat supabase-js, jadi semua row dinormalisasi kembali ke bentuk lib/types.
 */
export type LotRow = {
  id: string;
  name: string;
  type: string;
  price: string | number;
  coret: string | number | null;
  weight: string | number;
  seller: string;
  location: string;
  time: string;
  created_at: string;
  size: string;
  image: string;
  rating: string | number;
  sold: string | number;
  promo: string | null;
  quality: LotQuality | null;
};

export type OrderRow = {
  id: string;
  lot_id: string;
  buyer_user_id: string;
  buyer: string;
  quantity: string | number;
  status: string;
  created_at: string;
};

export type OrderViewRow = OrderRow & { product: string | null; seller: string | null };

export type UserRow = {
  id: string;
  name: string;
  initials: string;
  email: string;
  account_type: AccountType | null;
  role: string;
  organization: string;
  location: string;
  verified: boolean;
  verification_basis: string;
  group_number: string;
  pw_salt: string;
  pw_hash: string;
  token: string | null;
};

export type ReportRow = {
  id: string;
  reporter_user_id: string;
  reporter: string;
  lot_id: string | null;
  category: string;
  description: string;
  status: IssueReport["status"];
  created_at: string;
};

export type PriceRow = { name: string; price: string | number; source: string; image: string };

const num = (value: string | number): number => Number(value);

export function toLot(row: LotRow): Lot {
  const base: Lot = {
    id: row.id,
    name: row.name,
    type: row.type,
    price: num(row.price),
    coret: row.coret === null ? null : num(row.coret),
    weight: num(row.weight),
    seller: row.seller,
    location: row.location,
    time: row.time,
    createdAt: row.created_at,
    size: row.size,
    image: row.image,
    rating: num(row.rating),
    sold: num(row.sold),
    promo: row.promo,
  };
  if (row.quality) {
    base.quality = row.quality;
  }
  return base;
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    lotId: row.lot_id,
    buyerUserId: row.buyer_user_id,
    buyer: row.buyer,
    quantity: num(row.quantity),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toOrderView(row: OrderViewRow): OrderView {
  return { ...toOrder(row), product: row.product ?? "(lot dihapus)", seller: row.seller ?? "—" };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    email: row.email,
    accountType: row.account_type ?? "seller",
    role: row.role,
    organization: row.organization,
    location: row.location,
    verified: row.verified,
    verificationBasis: row.verification_basis,
    groupNumber: row.group_number,
    pwSalt: row.pw_salt,
    pwHash: row.pw_hash,
    token: row.token ?? undefined,
  };
}

export function toReport(row: ReportRow): IssueReport {
  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reporter: row.reporter,
    lotId: row.lot_id,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toPrice(row: PriceRow): Price {
  return { name: row.name, price: num(row.price), source: row.source, image: row.image };
}

export function toPublicUser(user: User | null): PublicUser | null {
  if (!user) return null;
  const { pwSalt: _s, pwHash: _h, token: _t, ...rest } = user;
  return rest;
}
