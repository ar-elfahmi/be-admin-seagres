import { supabase } from "./supabase";
import {
  toLot,
  toOrder,
  toOrderView,
  toPrice,
  toReport,
  toUser,
  type LotRow,
  type OrderRow,
  type OrderViewRow,
  type PriceRow,
  type ReportRow,
  type UserRow,
} from "./rows";
import type { IssueReport, Lot, Order, OrderView, Price, User } from "./types";

/** Seluruh lot, terbaru dulu (urutan yang diharapkan katalog). */
export async function listLots(): Promise<Lot[]> {
  const { data, error } = await supabase()
    .from("lots")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LotRow[]).map(toLot);
}

export async function listPrices(): Promise<Price[]> {
  const { data, error } = await supabase().from("prices").select("*");
  if (error) throw error;
  return (data as PriceRow[]).map(toPrice);
}

export async function listOrderViews(): Promise<OrderView[]> {
  const { data, error } = await supabase()
    .from("order_views")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderViewRow[]).map(toOrderView);
}

export async function getLot(lotId: string): Promise<Lot | null> {
  const { data, error } = await supabase().from("lots").select("*").eq("id", lotId).maybeSingle();
  if (error) throw error;
  return data ? toLot(data as LotRow) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase()
    .from("users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase().from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function insertUser(user: User): Promise<void> {
  const { error } = await supabase().from("users").insert({
    id: user.id,
    name: user.name,
    initials: user.initials,
    email: user.email,
    account_type: user.accountType,
    role: user.role,
    organization: user.organization,
    location: user.location,
    verified: user.verified,
    verification_basis: user.verificationBasis,
    group_number: user.groupNumber,
    pw_salt: user.pwSalt,
    pw_hash: user.pwHash,
    token: user.token ?? null,
  });
  if (error) throw error;
}

export async function setUserToken(userId: string, token: string | null): Promise<void> {
  const { error } = await supabase().from("users").update({ token }).eq("id", userId);
  if (error) throw error;
}

export async function insertLot(lot: Lot): Promise<void> {
  const { error } = await supabase().from("lots").insert({
    id: lot.id,
    name: lot.name,
    type: lot.type,
    price: lot.price,
    coret: lot.coret,
    weight: lot.weight,
    seller: lot.seller,
    location: lot.location,
    time: lot.time,
    created_at: lot.createdAt,
    size: lot.size,
    image: lot.image,
    rating: lot.rating,
    sold: lot.sold,
    promo: lot.promo,
    quality: lot.quality ?? null,
  });
  if (error) throw error;
}

/**
 * Potong stok secara atomik lewat RPC (PostgREST update tidak mendukung
 * ekspresi kolom). Row lock `weight >= p_qty` mencegah oversell.
 * false berarti lot tidak ada atau stok kurang.
 */
export async function reserveWeight(lotId: string, quantity: number): Promise<boolean> {
  const { data, error } = await supabase().rpc("reserve_lot_weight", {
    p_lot_id: lotId,
    p_qty: quantity,
  });
  if (error) throw error;
  return data === true;
}

export async function insertOrder(order: Order): Promise<void> {
  const { error } = await supabase().from("orders").insert({
    id: order.id,
    lot_id: order.lotId,
    buyer_user_id: order.buyerUserId,
    buyer: order.buyer,
    quantity: order.quantity,
    status: order.status,
    created_at: order.createdAt,
  });
  if (error) throw error;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrder(data as OrderRow) : null;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Terapkan efek penerimaan order ke stok lot ( otorisasi dicek pemanggil). */
export async function applyAcceptEffects(order: Order): Promise<void> {
  const { error } = await supabase().rpc("apply_accept_effects", {
    p_order_id: order.id,
  });
  if (error) throw error;
}

/** Laporan masalah. */
export async function insertReport(report: IssueReport): Promise<void> {
  const { error } = await supabase().from("reports").insert({
    id: report.id,
    reporter_user_id: report.reporterUserId,
    reporter: report.reporter,
    lot_id: report.lotId,
    category: report.category,
    description: report.description,
    status: report.status,
    created_at: report.createdAt,
  });
  if (error) throw error;
}

export async function listReports(limit = 50): Promise<IssueReport[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ReportRow[]).map(toReport);
}
