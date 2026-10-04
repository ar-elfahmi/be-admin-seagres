import { supabase } from "./supabase";
import {
  toDocument,
  toGeoPoint,
  toHistory,
  toLot,
  toOrder,
  toOrderView,
  toPrice,
  toProduct,
  toReport,
  toSubProduct,
  toUser,
  type DocumentRow,
  type GeoPointRow,
  type HistoryRow,
  type LotRow,
  type OrderRow,
  type OrderViewRow,
  type PriceRow,
  type ProductRow,
  type ReportRow,
  type SubProductRow,
  type UserRow,
} from "./rows";
import type {
  IssueReport,
  Lot,
  Order,
  OrderView,
  Price,
  Product,
  ProductDetail,
  ProductHistory,
  SubProduct,
  User,
  HistoryKind,
  CatalogProduct,
} from "./types";

export type RecentActivity =
  | {
      kind: "event";
      id: string;
      createdAt: string;
      productId: string;
      productName: string;
      actor: string;
      historyKind: HistoryKind;
      quantityDelta: number;
      note: string | null;
    }
  | {
      kind: "order";
      id: string;
      createdAt: string;
      product: string;
      seller: string;
      buyer: string;
      quantity: number;
      status: string;
    };


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

/** Legacy lots identify their seller by organization, not by product owner ID. */
export async function listSellerOrderViews(organization: string): Promise<OrderView[]> {
  const { data, error } = await supabase().from("order_views").select("*").eq("seller", organization).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as OrderViewRow[]).map(toOrderView);
}

export async function listBuyerOrderViews(userId: string): Promise<OrderView[]> {
  const { data, error } = await supabase().from("order_views").select("*").eq("buyer_user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as OrderViewRow[]).map(toOrderView);
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

/* ---------- Produk agregasi pengepul ---------- */

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Keep reads compatible before the archive migration; missing deleted_at is active.
  return (data as ProductRow[]).map(toProduct).filter((product) => !product.deletedAt);
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : null;
}

export async function listSubProducts(productId: string): Promise<SubProduct[]> {
  const { data, error } = await supabase()
    .from("sub_products")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as SubProductRow[]).map(toSubProduct);
}

export async function listHistory(productId: string): Promise<ProductHistory[]> {
  const { data, error } = await supabase()
    .from("product_history")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const events = (data as HistoryRow[]).map(toHistory);
  if (!events.length) return events;
  const ids = events.map((event) => event.id);
  const [pointsRes, docsRes] = await Promise.all([
    supabase().from("history_geo_points").select("*").in("history_id", ids),
    supabase().from("history_documents").select("*").in("history_id", ids),
  ]);
  if (pointsRes.error) throw pointsRes.error;
  if (docsRes.error) throw docsRes.error;
  const pointsByHistory = new Map<string, ProductHistory["points"]>();
  for (const row of (pointsRes.data ?? []) as GeoPointRow[]) {
    const point = toGeoPoint(row);
    const list = pointsByHistory.get(point.historyId) ?? [];
    list.push(point);
    pointsByHistory.set(point.historyId, list);
  }
  const docsByHistory = new Map<string, ProductHistory["documents"]>();
  for (const row of (docsRes.data ?? []) as DocumentRow[]) {
    const doc = toDocument(row);
    const list = docsByHistory.get(doc.historyId) ?? [];
    list.push(doc);
    docsByHistory.set(doc.historyId, list);
  }
  return events.map((event) => ({
    ...event,
    points: pointsByHistory.get(event.id) ?? [],
    documents: docsByHistory.get(event.id) ?? [],
  }));
}

/** Total qty tersedia = jumlah seluruh sub-product pada produk. */
export async function aggregateQuantity(productId: string): Promise<number> {
  const subs = await listSubProducts(productId);
  return subs.reduce((sum, sub) => sum + sub.quantity, 0);
}

/** Catalog publik: agregat semua produk + sub-products + history ringkas. */
export async function listCatalogProducts(): Promise<ProductDetail[]> {
  const products = await listProducts();
  if (!products.length) return [];
  return Promise.all(
    products.map(async (product) => {
      const [subProducts, history] = await Promise.all([
        listSubProducts(product.id),
        listHistory(product.id),
      ]);
      return {
        ...product,
        subProducts,
        history,
        available: subProducts.reduce((sum, sub) => sum + sub.quantity, 0),
      };
    })
  );
}

/** Buyer cards need stock totals, not each source's documents and coordinates. */
export async function listBuyerCatalogProducts(): Promise<CatalogProduct[]> {
  const products = await listProducts();
  if (!products.length) return [];
  const { data, error } = await supabase().from("sub_products")
    .select("product_id,quantity,price").in("product_id", products.map((product) => product.id));
  if (error) throw error;
  const quantities = new Map<string, number>();
  const priceRanges = new Map<string, { min: number; max: number }>();
  for (const row of data ?? []) {
    quantities.set(row.product_id, (quantities.get(row.product_id) ?? 0) + Number(row.quantity));
    const price = Number(row.price);
    if (Number(row.quantity) > 0 && Number.isFinite(price) && price > 0) {
      const range = priceRanges.get(row.product_id);
      priceRanges.set(row.product_id, { min: Math.min(range?.min ?? price, price), max: Math.max(range?.max ?? price, price) });
    }
  }
  return products.map((product) => ({ ...product, available: quantities.get(product.id) ?? 0,
    minPrice: priceRanges.get(product.id)?.min ?? null, maxPrice: priceRanges.get(product.id)?.max ?? null }));
}
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const product = await getProduct(id);
  if (!product) return null;
  const [subProducts, history] = await Promise.all([
    listSubProducts(id),
    listHistory(id),
  ]);
  return {
    ...product,
    subProducts,
    history,
    available: subProducts.reduce((sum, sub) => sum + sub.quantity, 0),
  };
}

export async function listProductDetailsByPengepul(pengepulId: string): Promise<ProductDetail[]> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("pengepul_id", pengepulId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const products = (data as ProductRow[]).map(toProduct);
  if (!products.length) return [];
  const subs = await Promise.all(products.map((product) => listSubProducts(product.id)));
  const histories = await Promise.all(products.map((product) => listHistory(product.id)));
  return products.map((product, index) => ({
    ...product,
    subProducts: subs[index],
    history: histories[index],
    available: subs[index].reduce((sum, sub) => sum + sub.quantity, 0),
  }));
}

/**
 * Aktivitas terbaru gabungan event product_history (untuk pengepul ini)
 * untuk pengepul ini. Pesanan legacy tidak dicampur dengan ledger produk baru.
 */
export async function listRecentActivity(
  pengepulId: string,
  limit = 8
): Promise<RecentActivity[]> {
  const eventsRes = await supabase()
      .from("product_history")
      .select("id, product_id, actor, kind, quantity_delta, note, created_at, products!inner(name, pengepul_id)")
      .eq("products.pengepul_id", pengepulId)
      .order("created_at", { ascending: false })
      .limit(limit);
  if (eventsRes.error) throw eventsRes.error;
  type EventRow = {
    id: string;
    product_id: string;
    actor: string;
    kind: HistoryKind;
    quantity_delta: string | number;
    note: string | null;
    created_at: string;
    products: { name: string } | { name: string }[];
  };
  const events: RecentActivity[] = ((eventsRes.data ?? []) as EventRow[]).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    return {
      kind: "event",
      id: row.id,
      createdAt: row.created_at,
      productId: row.product_id,
      productName: product?.name ?? "(produk)",
      actor: row.actor,
      historyKind: row.kind,
      quantityDelta: Number(row.quantity_delta),
      note: row.note,
    };
  });
  return events
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}

export async function insertProduct(product: Product): Promise<void> {
  const { error } = await supabase().from("products").insert({
    id: product.id,
    name: product.name,
    type: product.type,
    price: product.price,
    coret: product.coret,
    size: product.size,
    image: product.image,
    promo: product.promo,
    pengepul_id: product.pengepulId,
    organization: product.organization,
    location: product.location,
    barcode: product.barcode,
    created_at: product.createdAt,
  });
  if (error) throw error;
}

export async function insertSubProduct(sub: SubProduct): Promise<void> {
  const { error } = await supabase().from("sub_products").insert({
    id: sub.id,
    product_id: sub.productId,
    name: sub.name,
    fisherman_name: sub.fishermanName,
    quantity: sub.quantity,
    unit: sub.unit,
    geo_lat: sub.geoLat,
    geo_lng: sub.geoLng,
    price: sub.price,
    grade: sub.grade ?? null,
    min_order_kg: sub.minOrderKg,
    quality: sub.quality ?? null,
    barcode: sub.barcode,
    created_at: sub.createdAt,
  });
  if (error) throw error;
}
export async function setProductArchived(id: string, actorId: string, archived: boolean): Promise<void> {
  const { error } = await supabase().rpc("set_product_archived", {
    p_product_id: id, p_actor_id: actorId, p_archived: archived,
  });
  if (error) throw error;
}

/** Quantity and its ledger entry commit together under the same row lock. */
export async function recordStockEvent(event: ProductHistory): Promise<void> {
  const { error } = await supabase().rpc("record_stock_event", {
    p_event_id: event.id, p_product_id: event.productId, p_sub_product_id: event.subProductId,
    p_actor_id: event.actorId, p_delta: event.quantityDelta, p_note: event.note,
  });
  if (error) throw error;
}

/** Create a product and all its source receipts/history in one DB transaction. */
export async function createProductReceipts(product: Product | null, productId: string, actorId: string,
  receipts: Array<{ sub: SubProduct; historyId: string; note: string | null }>): Promise<void> {
  const { error } = await supabase().rpc("create_product_receipts", {
    p_actor_id: actorId, p_product_id: productId,
    p_product: product ? { id: product.id, name: product.name, type: product.type, price: product.price, coret: product.coret,
      size: product.size, image: product.image, promo: product.promo, pengepul_id: actorId, organization: product.organization,
      location: product.location, barcode: product.barcode, created_at: product.createdAt } : null,
    p_receipts: receipts.map(({ sub, historyId, note }) => ({ id: sub.id, name: sub.name, fisherman_name: sub.fishermanName,
      quantity: sub.quantity, price: sub.price, min_order_kg: sub.minOrderKg, grade: sub.grade, quality: sub.quality,
      geo_lat: sub.geoLat, geo_lng: sub.geoLng, barcode: sub.barcode, history_id: historyId, note })),
  });
  if (error) throw error;
}

export async function getSubProduct(id: string): Promise<SubProduct | null> {
  const { data, error } = await supabase()
    .from("sub_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toSubProduct(data as SubProductRow) : null;
}
export async function findSubProductByBarcode(barcode: string): Promise<SubProduct | null> {
  const { data, error } = await supabase()
    .from("sub_products")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) throw error;
  return data ? toSubProduct(data as SubProductRow) : null;
}
export async function insertHistory(event: ProductHistory): Promise<void> {
  const { error } = await supabase().from("product_history").insert({
    id: event.id,
    product_id: event.productId,
    sub_product_id: event.subProductId,
    actor_id: event.actorId,
    actor: event.actor,
    kind: event.kind,
    stage: event.stage ?? null,
    note: event.note,
    quantity_delta: event.quantityDelta,
    created_at: event.createdAt,
  });
  if (error) throw error;
}

export async function insertGeoPoint(point: {
  id: string;
  historyId: string;
  lat: number;
  lng: number;
  label: string | null;
  createdAt: string;
}): Promise<void> {
  const { error } = await supabase().from("history_geo_points").insert({
    id: point.id,
    history_id: point.historyId,
    lat: point.lat,
    lng: point.lng,
    label: point.label,
    created_at: point.createdAt,
  });
  if (error) throw error;
}

export async function insertDocument(doc: {
  id: string;
  historyId: string;
  url: string;
  filename: string;
  mime: string;
  kind: ProductHistory["documents"][number]["kind"];
  createdAt: string;
  capturedAt: string | null;
  capturedLat: number | null;
  capturedLng: number | null;
  capturedAccuracyM: number | null;
}): Promise<void> {
  const { error } = await supabase().from("history_documents").insert({
    id: doc.id,
    history_id: doc.historyId,
    url: doc.url,
    filename: doc.filename,
    mime: doc.mime,
    kind: doc.kind,
    created_at: doc.createdAt,
    captured_at: doc.capturedAt,
    captured_lat: doc.capturedLat,
    captured_lng: doc.capturedLng,
    captured_accuracy_m: doc.capturedAccuracyM,
  });
  if (error) throw error;
}
