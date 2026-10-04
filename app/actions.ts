"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  applyAcceptEffects,
  deleteProduct,
  findUserByEmail,
  getLot,
  getOrder,
  getProduct,
  getProductDetail,
  getSubProduct,
  insertDocument,
  insertGeoPoint,
  insertHistory,
  insertLot,
  insertOrder,
  insertProduct,
  insertReport,
  insertSubProduct,
  insertUser,
  listOrderViews,
  listLots,
  listProductDetailsByPengepul,
  reserveWeight,
  updateOrderStatus,
  updateSubProductQuantity,
} from "../lib/queries";
import { makeBarcode } from "../lib/barcode";
import { supabase } from "../lib/supabase";
import { checkPassword, hashPassword, initialsOf } from "../lib/crypto";
import { currentUser, startSession, endSession } from "../lib/session";
import type {
  AccountType,
  HistoryKind,
  HistoryStage,
  IssueReport,
  Lot,
  LotQuality,
  Order,
  OrderView,
  Product,
  ProductDetail,
  ProductGrade,
  ProductHistory,
  RegisterInput,
  SubProduct,
  User,
} from "../lib/types";

const STAGE_FOR_KIND: Record<HistoryKind, HistoryStage> = {
  tambah_produk: "estimasi_tangkap",
  terima_nelayan: "diambil_pengepul",
  jual: "jual",
};
const ALLOWED_STAGES: ReadonlySet<string> = new Set([
  "estimasi_tangkap",
  "diambil_pengepul",
  "simpan_gudang",
  "olah",
  "siap_jual",
  "jual",
]);
const ALLOWED_GRADES: ReadonlySet<string> = new Set(["A", "B", "C", "D"]);
function asStage(value: string | null): HistoryStage | null {
  return value && ALLOWED_STAGES.has(value) ? (value as HistoryStage) : null;
}
function asGrade(value: string): ProductGrade | null {
  const upper = value.trim().toUpperCase();
  return upper && ALLOWED_GRADES.has(upper) ? (upper as ProductGrade) : null;
}

const DEFAULT_IMAGES: Record<string, string> = {
  Bandeng: "/products/bandeng.png",
  Udang: "/products/udang-vaname.png",
  Kerang: "/products/kerang-hijau.png",
  Olahan: "/products/bandeng-tanpa-duri.png",
};

const ACCEPT_IMAGES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "";
}

export async function login(email: unknown, password: unknown): Promise<{ error?: string; ok?: boolean }> {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user || !checkPassword(user, String(password))) {
    return { error: "Email atau kata sandi salah." };
  }
  await startSession(user);
  return { ok: true };
}

export async function register(input: RegisterInput): Promise<{ error?: string; ok?: boolean }> {
  const name = String(input?.name || "").trim();
  const email = String(input?.email || "").trim().toLowerCase();
  const password = String(input?.password || "");
  const accountType: AccountType = input?.accountType === "customer" ? "customer" : "pengepul";
  if (!name || !email || password.length < 6) {
    return { error: "Lengkapi nama, email, dan kata sandi minimal 6 karakter." };
  }
  if (await findUserByEmail(email)) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }
  const { salt, hash } = hashPassword(password);
  const user: User = {
    id: newId("USR"),
    name,
    initials: initialsOf(name),
    email,
    accountType,
    role: accountType === "customer" ? "Pembeli lokal" : String(input.role || "Pengepul perikanan"),
    organization:
      accountType === "customer"
        ? String(input.organization || "Belum ada usaha terdaftar")
        : String(input.organization || "Belum ada kelompok"),
    location: String(input.location || "Gresik"),
    verified: false,
    verificationBasis: "Dokumen pendaftaran sedang ditinjau",
    groupNumber: "Menunggu penerbitan",
    pwSalt: salt,
    pwHash: hash,
    token: crypto.randomBytes(16).toString("hex"),
  };
  await insertUser(user);
  await startSession(user);
  return { ok: true };
}

export async function logout(): Promise<{ ok: boolean }> {
  await endSession();
  return { ok: true };
}

function parseQuality(formData: FormData): LotQuality {
  return {
    cleanHandling: formData.get("cleanHandling") === "on",
    packaging: String(formData.get("packaging") || "Kemasan standar").trim() || "Kemasan standar",
    temperature: String(formData.get("temperature") || "Belum dicatat").trim() || "Belum dicatat",
    dispatch: String(formData.get("dispatch") || "Jadwal menyusul").trim() || "Jadwal menyusul",
  };
}

export async function createLot(formData: FormData): Promise<{ error?: string; ok?: boolean; lot?: Lot; lots?: Lot[] }> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mencatat hasil panen." };
  if (user.accountType !== "pengepul") {
    return { error: "Akun customer tidak bisa mencatat lot. Masuk dengan akun pengepul." };
  }

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "Bandeng");
  const price = Math.round(Number(formData.get("price")));
  const weight = Math.round(Number(formData.get("weight")));
  const size = String(formData.get("size") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const harvestRaw = String(formData.get("harvestTime") || "");
  const harvest = harvestRaw ? new Date(harvestRaw) : new Date();

  if (!name || !size || !location || Number.isNaN(price) || Number.isNaN(weight)) {
    return { error: "Ada kolom yang belum terisi dengan benar." };
  }
  if (price < 1000 || weight < 1) {
    return { error: "Harga minimal Rp1.000 dan berat minimal 1 kg." };
  }

  let image = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.Bandeng;
  const photo = formData.get("photo");
  if (photo && typeof photo === "object" && "size" in photo && typeof photo.size === "number" && photo.size > 0 && "type" in photo) {
    const fileType = String(photo.type || "");
    const ext = ACCEPT_IMAGES[fileType];
    if (!ext) return { error: "Format foto harus PNG, JPG, WebP, atau GIF." };
    if (photo.size > 4 * 1024 * 1024) return { error: "Ukuran foto maksimal 4 MB." };
    const buffer = Buffer.from(await (photo as Blob).arrayBuffer());
    const objectPath = `lots/${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const { error: uploadError } = await supabase()
      .storage
      .from("lot-photos")
      .upload(objectPath, buffer, { contentType: fileType });
    if (uploadError) return { error: "Gagal mengunggah foto lot." };
    const { data } = supabase().storage.from("lot-photos").getPublicUrl(objectPath);
    image = data.publicUrl;
  }

  const now = new Date();
  const lot: Lot = {
    id: newId("SGR"),
    name,
    type,
    price,
    coret: null,
    weight,
    seller: user.organization,
    location,
    time: Number.isNaN(harvest.getTime())
      ? "Hari ini"
      : harvest.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    createdAt: now.toISOString(),
    size,
    image,
    rating: 5,
    sold: 0,
    promo: "Baru dicatat",
    quality: parseQuality(formData),
  };

  await insertLot(lot);
  revalidatePath("/");
  revalidatePath(`/lot/${lot.id}`);
  return { ok: true, lot, lots: await listLots() };
}

export async function preorder(
  lotId: string,
  quantity: unknown
): Promise<{ error?: string; ok?: boolean; order?: Order; orders?: OrderView[] }> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mengajukan pre-order." };
  if (user.accountType !== "customer") {
    return { error: "Akun pengepul tidak bisa mengajukan pre-order ke lot sendiri. Masuk dengan akun customer." };
  }
  const lot = await getLot(lotId);
  if (!lot) return { error: "Lot tidak ditemukan." };
  if (lot.weight <= 0) return { error: "Stok lot ini sudah habis." };
  const amount = Math.max(1, Math.min(lot.weight, Math.round(Number(quantity) || 1)));
  const reserved = await reserveWeight(lot.id, amount);
  if (!reserved) return { error: "Stok lot ini sudah habis." };
  const order: Order = {
    id: newId("PO"),
    lotId: lot.id,
    buyerUserId: user.id,
    buyer: user.name,
    quantity: amount,
    status: "Baru",
    createdAt: new Date().toISOString(),
  };
  await insertOrder(order);
  revalidatePath("/");
  return { ok: true, order, orders: await listOrderViews() };
}

export async function setOrderStatus(
  orderId: string,
  status: string
): Promise<{ error?: string; ok?: boolean; orders?: OrderView[]; lots?: Lot[] }> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mengelola pesanan." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa mengubah status pesanan." };
  if (!["Diterima", "Ditolak", "Baru"].includes(status)) return { error: "Status tidak valid." };
  const order = await getOrder(orderId);
  if (!order) return { error: "Pesanan tidak ditemukan." };
  const lot = await getLot(order.lotId);
  if (!lot || lot.seller !== user.organization) {
    return { error: "Hanya kelompok pengepul lot ini yang bisa mengubah status." };
  }
  const updated = await updateOrderStatus(orderId, status);
  if (updated && status === "Diterima" && order.status !== "Diterima") {
    await applyAcceptEffects(order);
  }
  revalidatePath("/");
  revalidatePath(`/lot/${lot.id}`);
  return { ok: true, orders: await listOrderViews(), lots: await listLots() };
}

export async function reportIssue(
  formData: FormData
): Promise<{ error?: string; ok?: boolean; report?: IssueReport }> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mengirim laporan." };
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const lotId = String(formData.get("lotId") || "").trim() || null;
  if (!category || description.length < 10) {
    return { error: "Pilih jenis masalah dan jelaskan minimal 10 karakter." };
  }
  const report: IssueReport = {
    id: newId("LPR"),
    reporterUserId: user.id,
    reporter: user.name,
    lotId,
    category,
    description,
    status: "Baru",
    createdAt: new Date().toISOString(),
  };
  await insertReport(report);
  return { ok: true, report };
}

/* ---------- Produk agregasi pengepul ---------- */

interface ParsedFisherman {
  index: number;
  name: string;
  fishermanName: string;
  quantity: number;
  price: number;
  minOrderKg: number;
  grade: ProductGrade | null;
  quality: {
    cleanHandling: boolean;
    packaging: string;
    temperature: string | null;
    dispatch: string | null;
  };
  geoLat: number | null;
  geoLng: number | null;
  files: File[];
}

function readFishermanRows(formData: FormData): ParsedFisherman[] {
  const rows: ParsedFisherman[] = [];
  for (let i = 0; formData.has(`fishermanName[${i}]`); i++) {
    const name = String(formData.get(`subName[${i}]`) || "").trim();
    const fishermanName = String(formData.get(`fishermanName[${i}]`) || "").trim();
    const quantity = Number(formData.get(`subQuantity[${i}]`));
    const price = Number(formData.get(`subPrice[${i}]`));
    const minOrderRaw = Number(formData.get(`minOrderKg[${i}]`));
    const gradeRaw = String(formData.get(`grade[${i}]`) || "").trim().toUpperCase();
    const latRaw = String(formData.get(`geoLat[${i}]`) || "").trim();
    const lngRaw = String(formData.get(`geoLng[${i}]`) || "").trim();
    const geoLat = latRaw ? Number(latRaw) : null;
    const geoLng = lngRaw ? Number(lngRaw) : null;
    const cleanHandling = formData.get(`qualityClean[${i}]`) === "on";
    const packaging = String(formData.get(`qualityPackaging[${i}]`) || "Standar pengepul").trim() || "Standar pengepul";
    const temperatureRaw = String(formData.get(`qualityTemperature[${i}]`) || "").trim();
    const dispatchRaw = String(formData.get(`qualityDispatch[${i}]`) || "").trim();
    const files: File[] = [];
    const documentValues = formData.getAll(`documents[${i}]`);
    for (const value of documentValues) {
      if (value && typeof value === "object" && "size" in value && typeof value.size === "number" && value.size > 0) {
        files.push(value as File);
      }
    }
    rows.push({
      index: i,
      name,
      fishermanName,
      quantity: Number.isNaN(quantity) ? 0 : quantity,
      price: Number.isNaN(price) ? 0 : price,
      minOrderKg: Number.isFinite(minOrderRaw) && minOrderRaw > 0 ? minOrderRaw : 1,
      grade: asGrade(gradeRaw),
      quality: {
        cleanHandling,
        packaging,
        temperature: temperatureRaw || null,
        dispatch: dispatchRaw || null,
      },
      geoLat,
      geoLng,
      files,
    });
  }
  return rows;
}

async function uploadProductPhoto(formData: FormData): Promise<string | null> {
  const photo = formData.get("photo");
  if (!photo || typeof photo !== "object" || !("size" in photo) || typeof photo.size !== "number" || photo.size <= 0) {
    return null;
  }
  const fileType = String(photo.type || "");
  const ext = ACCEPT_IMAGES[fileType];
  if (!ext) return "__invalid__";
  if (photo.size > 4 * 1024 * 1024) return "__too_large__";
  const buffer = Buffer.from(await (photo as Blob).arrayBuffer());
  const objectPath = `products/${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const { error: uploadError } = await supabase()
    .storage
    .from("lot-photos")
    .upload(objectPath, buffer, { contentType: fileType });
  if (uploadError) return "__upload_failed__";
  const { data } = supabase().storage.from("lot-photos").getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadHistoryDocuments(files: File[], historyId: string): Promise<{
  inserted: number;
  failures: string[];
}> {
  let inserted = 0;
  const failures: string[] = [];
  for (const file of files) {
    const fileType = String(file.type || "");
    const ext = ACCEPT_IMAGES[fileType];
    if (!ext) {
      failures.push(`${file.name || "berkas"} format tidak didukung`);
      continue;
    }
    if (file.size > 6 * 1024 * 1024) {
      failures.push(`${file.name || "berkas"} lebih dari 6 MB`);
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectPath = `history/${historyId}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const { error: uploadError } = await supabase()
      .storage
      .from("lot-photos")
      .upload(objectPath, buffer, { contentType: fileType });
    if (uploadError) {
      failures.push(`${file.name || "berkas"} gagal diunggah`);
      continue;
    }
    const { data } = supabase().storage.from("lot-photos").getPublicUrl(objectPath);
    await insertDocument({
      id: newId("DOC"),
      historyId,
      url: data.publicUrl,
      filename: file.name || `dokumen-${Date.now()}.${ext}`,
      mime: fileType,
      kind: ext === "pdf" ? "dokumen" : "foto",
      createdAt: new Date().toISOString(),
    });
    inserted++;
  }
  return { inserted, failures };
}

export type CreateProductResult = {
  error?: string;
  ok?: boolean;
  product?: ProductDetail;
  products?: ProductDetail[];
};

export async function createProduct(formData: FormData): Promise<CreateProductResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mencatat hasil tangkapan." };
  if (user.accountType !== "pengepul") {
    return { error: "Akun customer tidak bisa membuat produk. Masuk dengan akun pengepul." };
  }

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "Bandeng") as Product["type"];
  const price = Math.round(Number(formData.get("price")));
  const size = String(formData.get("size") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const promoRaw = String(formData.get("promo") || "").trim();
  const coretRaw = String(formData.get("coret") || "").trim();
  const coret = coretRaw ? Math.round(Number(coretRaw)) : null;

  if (!name || !size || !location || Number.isNaN(price) || price < 1000) {
    return { error: "Lengkapi nama, ukuran, lokasi, dan harga minimal Rp1.000." };
  }

  const fishermen = readFishermanRows(formData);
  const badPrice = fishermen.find((row) => row.fishermanName && (row.price < 1000));
  if (badPrice) {
    return { error: `Harga per kg untuk ${badPrice.fishermanName} wajib diisi, minimal Rp1.000.` };
  }

  if (!fishermen.length) {
    return { error: "Tambahkan minimal satu nelayan sumber." };
  }
  for (const row of fishermen) {
    if (!row.fishermanName) {
      return { error: `Nama nelayan baris ke-${row.index + 1} belum diisi.` };
    }
    if (Number.isNaN(row.quantity) || row.quantity < 0) {
      return { error: `Kuantitas nelayan ${row.fishermanName} tidak valid.` };
    }
    if ((row.geoLat === null) !== (row.geoLng === null)) {
      return { error: `Lokasi geo nelayan ${row.fishermanName} harus diisi lengkap atau kosong.` };
    }
  }

  const uploaded = await uploadProductPhoto(formData);
  if (uploaded === "__invalid__") return { error: "Format foto harus PNG, JPG, WebP, atau GIF." };
  if (uploaded === "__too_large__") return { error: "Ukuran foto maksimal 4 MB." };
  if (uploaded === "__upload_failed__") return { error: "Gagal mengunggah foto produk." };
  const image = uploaded ?? DEFAULT_IMAGES[type] ?? DEFAULT_IMAGES.Bandeng;

  const now = new Date();
  const id = newId("PRD");
  const barcode = makeBarcode(id, now);
  const product: Product = {
    id,
    name,
    type,
    price,
    coret: coret === null || Number.isNaN(coret) ? null : coret,
    size,
    image,
    promo: promoRaw || null,
    pengepulId: user.id,
    organization: user.organization,
    location,
    barcode,
    createdAt: now.toISOString(),
  };

  try {
    await insertProduct(product);
  } catch (err: unknown) {
    const message = errorMessage(err);
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return { error: "Produk dengan nama ini sudah ada di pengepulanmu." };
    }
    throw err;
  }

  for (const row of fishermen) {
    const subId = newId("SUB");
    const sub: SubProduct = {
      id: subId,
      productId: product.id,
      name: row.name || product.name,
      fishermanName: row.fishermanName,
      quantity: row.quantity,
      price: row.price,
      minOrderKg: row.minOrderKg,
      grade: row.grade,
      quality: row.quality,
      unit: "kg",
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      barcode: makeBarcode(subId, now),
      createdAt: now.toISOString(),
    };
    await insertSubProduct(sub);
    const subHistory: ProductHistory = {
      id: newId("HIS"),
      productId: product.id,
      subProductId: subId,
      actorId: user.id,
      actor: user.name,
      kind: "tambah_produk",
      stage: "estimasi_tangkap",
      note: String(formData.get("historyNote") || "").trim() || null,
      quantityDelta: row.quantity,
      createdAt: now.toISOString(),
      points: [],
      documents: [],
    };
    await insertHistory(subHistory);
    if (row.geoLat !== null && row.geoLng !== null) {
      await insertGeoPoint({
        id: newId("GEO"),
        historyId: subHistory.id,
        lat: row.geoLat,
        lng: row.geoLng,
        label: `Nelayan ${row.fishermanName}`,
        createdAt: now.toISOString(),
      });
    }
    const docResult = await uploadHistoryDocuments(row.files, subHistory.id);
    if (docResult.failures.length) {
      console.warn("Dokumen gagal diunggah", docResult.failures);
    }
  }

  const detail = await getProductDetail(product.id);
  const products = await listProductDetailsByPengepul(user.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  revalidatePath(`/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}`);
  return { ok: true, product: detail ?? undefined, products };
}

export type UpdateProductQuantityResult = {
  error?: string;
  ok?: boolean;
  detail?: ProductDetail;
  products?: ProductDetail[];
};

export async function updateProductQuantity(
  productId: string,
  subProductId: string,
  kind: HistoryKind,
  quantity: number
): Promise<UpdateProductQuantityResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mengubah kuantitas." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa mengubah kuantitas." };
  if (kind !== "terima_nelayan" && kind !== "jual") return { error: "Aksi tidak valid." };
  const amount = Number(quantity);
  if (Number.isNaN(amount) || amount <= 0) return { error: "Masukkan kuantitas lebih dari 0." };

  const product = await getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan." };
  if (product.pengepulId !== user.id) return { error: "Produk ini bukan milikmu." };

  const sub = await getSubProduct(subProductId);
  if (!sub || sub.productId !== productId) return { error: "Sub-produk tidak ditemukan." };

  const delta = kind === "terima_nelayan" ? amount : -amount;
  const next = sub.quantity + delta;
  if (next < 0) return { error: "Jumlah jual melebihi sisa sub-produk." };

  await updateSubProductQuantity(sub.id, next);

  const history: ProductHistory = {
    id: newId("HIS"),
    productId: product.id,
    subProductId: sub.id,
    actorId: user.id,
    actor: user.name,
    kind,
    stage: STAGE_FOR_KIND[kind],
    note: kind === "terima_nelayan" ? `Tambahan ${amount} kg dari ${sub.fishermanName}` : `Jual ${amount} kg dari ${sub.fishermanName}`,
    quantityDelta: delta,
    createdAt: new Date().toISOString(),
    points: [],
    documents: [],
  };
  await insertHistory(history);

  const detail = await getProductDetail(product.id);
  const products = await listProductDetailsByPengepul(user.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  revalidatePath(`/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}`);
  return { ok: true, detail: detail ?? undefined, products };
}

export type AddProductHistoryResult = {
  error?: string;
  ok?: boolean;
  detail?: ProductDetail;
  products?: ProductDetail[];
};

export async function addProductHistory(formData: FormData): Promise<AddProductHistoryResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mencatat event." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa mencatat event." };
  const productId = String(formData.get("productId") || "").trim();
  const kind = String(formData.get("kind") || "tambah_produk") as HistoryKind;
  const note = String(formData.get("note") || "").trim() || null;
  const subProductIdRaw = String(formData.get("subProductId") || "").trim();
  const stageRaw = String(formData.get("stage") || "").trim();
  if (!["tambah_produk", "terima_nelayan", "jual"].includes(kind)) return { error: "Jenis event tidak valid." };

  const product = await getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan." };
  if (product.pengepulId !== user.id) return { error: "Produk ini bukan milikmu." };

  let subProductId: string | null = null;
  if (subProductIdRaw) {
    const sub = await getSubProduct(subProductIdRaw);
    if (!sub || sub.productId !== productId) return { error: "Sub-produk tidak ditemukan." };
    subProductId = sub.id;
  }
  const stage: HistoryStage | null = asStage(stageRaw) ?? STAGE_FOR_KIND[kind];

  const geoRows: Array<{ lat: number; lng: number; label: string | null }> = [];
  for (let i = 0; formData.has(`geoLat[${i}]`); i++) {
    const lat = Number(formData.get(`geoLat[${i}]`));
    const lng = Number(formData.get(`geoLng[${i}]`));
    const label = String(formData.get(`geoLabel[${i}]`) || "").trim() || null;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      geoRows.push({ lat, lng, label });
    }
  }
  const documentFiles: File[] = [];
  for (const value of formData.getAll("documents[]")) {
    if (value && typeof value === "object" && "size" in value && typeof value.size === "number" && value.size > 0) {
      documentFiles.push(value as File);
    }
  }

  const history: ProductHistory = {
    id: newId("HIS"),
    productId: product.id,
    subProductId,
    actorId: user.id,
    actor: user.name,
    kind,
    stage,
    note,
    quantityDelta: 0,
    createdAt: new Date().toISOString(),
    points: [],
    documents: [],
  };
  await insertHistory(history);
  for (const point of geoRows) {
    await insertGeoPoint({
      id: newId("GEO"),
      historyId: history.id,
      lat: point.lat,
      lng: point.lng,
      label: point.label,
      createdAt: history.createdAt,
    });
  }
  await uploadHistoryDocuments(documentFiles, history.id);

  const detail = await getProductDetail(product.id);
  const products = await listProductDetailsByPengepul(user.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  revalidatePath(`/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}`);
  return { ok: true, detail: detail ?? undefined, products };
}

/* ---------- Tambah sub-product ke produk existing ---------- */

export type AddSubProductResult = {
  error?: string;
  ok?: boolean;
  detail?: ProductDetail;
  subProductId?: string;
};

export async function addSubProductAction(
  productId: string,
  formData: FormData
): Promise<AddSubProductResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk menambah sumber." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa menambah sumber." };

  const product = await getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan." };
  if (product.pengepulId !== user.id) return { error: "Produk ini bukan milikmu." };

  const fishermanName = String(formData.get("fishermanName") || "").trim();
  if (!fishermanName) return { error: "Nama nelayan wajib diisi." };
  const quantity = Number(formData.get("quantity"));
  if (Number.isNaN(quantity) || quantity < 0) return { error: "Kuantitas tidak valid." };
  const priceRaw = Number(formData.get("price"));
  if (!formData.get("price") || Number.isNaN(priceRaw) || priceRaw < 1000) {
    return { error: "Harga per kg wajib diisi, minimal Rp1.000." };
  }
  const price = priceRaw;
  const minOrderRaw = Number(formData.get("minOrderKg"));
  const minOrderKg = Number.isFinite(minOrderRaw) && minOrderRaw > 0 ? minOrderRaw : 1;
  const grade: ProductGrade | null = asGrade(String(formData.get("grade") || ""));
  const latRaw = String(formData.get("geoLat") || "").trim();
  const lngRaw = String(formData.get("geoLng") || "").trim();
  const geoLat = latRaw ? Number(latRaw) : null;
  const geoLng = lngRaw ? Number(lngRaw) : null;
  if ((geoLat === null) !== (geoLng === null)) {
    return { error: "Lokasi geo harus diisi lengkap atau kosong keduanya." };
  }
  const cleanHandling = formData.get("qualityClean") === "on";
  const packaging = String(formData.get("qualityPackaging") || "Standar pengepul").trim() || "Standar pengepul";
  const temperature = String(formData.get("qualityTemperature") || "").trim() || null;
  const dispatch = String(formData.get("qualityDispatch") || "").trim() || null;
  const documentFiles: File[] = [];
  for (const value of formData.getAll("documents[]")) {
    if (value && typeof value === "object" && "size" in value && typeof value.size === "number" && value.size > 0) {
      documentFiles.push(value as File);
    }
  }
  const note = String(formData.get("historyNote") || "").trim() || null;

  const now = new Date();
  const subId = newId("SUB");
  const sub: SubProduct = {
    id: subId,
    productId: product.id,
    name: String(formData.get("name") || "").trim() || product.name,
    fishermanName,
    quantity,
    price,
    minOrderKg,
    grade,
    quality: { cleanHandling, packaging, temperature, dispatch },
    unit: "kg",
    geoLat,
    geoLng,
    barcode: makeBarcode(subId, now),
    createdAt: now.toISOString(),
  };
  try {
    await insertSubProduct(sub);
  } catch (err: unknown) {
    const message = errorMessage(err);
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return { error: "Penerimaan ini duplikat menurut database. Jalankan migrasi 20261007000000 (cabut unique product_id + fisherman_name) di Supabase SQL editor, lalu coba lagi." };
    }
    throw err;
  }
  const history: ProductHistory = {
    id: newId("HIS"),
    productId: product.id,
    subProductId: subId,
    actorId: user.id,
    actor: user.name,
    kind: "tambah_produk",
    stage: "estimasi_tangkap",
    note,
    quantityDelta: quantity,
    createdAt: now.toISOString(),
    points: [],
    documents: [],
  };
  await insertHistory(history);
  if (geoLat !== null && geoLng !== null) {
    await insertGeoPoint({
      id: newId("GEO"),
      historyId: history.id,
      lat: geoLat,
      lng: geoLng,
      label: `Nelayan ${fishermanName}`,
      createdAt: now.toISOString(),
    });
  }
  await uploadHistoryDocuments(documentFiles, history.id);

  const detail = await getProductDetail(product.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  revalidatePath(`/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}/sub/${subId}`);
  return { ok: true, detail: detail ?? undefined, subProductId: subId };
}

/* ---------- Tambah event history ke sub-product ---------- */

export type AddHistoryEventResult = {
  error?: string;
  ok?: boolean;
  detail?: ProductDetail;
  eventId?: string;
};

export async function addHistoryEventAction(
  productId: string,
  subProductId: string,
  formData: FormData
): Promise<AddHistoryEventResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk mencatat event." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa mencatat event." };

  const product = await getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan." };
  if (product.pengepulId !== user.id) return { error: "Produk ini bukan milikmu." };

  const sub = await getSubProduct(subProductId);
  if (!sub || sub.productId !== productId) return { error: "Sub-produk tidak ditemukan." };

  const stageRaw = String(formData.get("stage") || "").trim();
  const stage = asStage(stageRaw);
  if (!stage) return { error: "Pilih stage yang valid." };
  const note = String(formData.get("note") || "").trim() || null;
  const quantityDeltaRaw = Number(formData.get("quantityDelta"));
  const quantityDelta = Number.isFinite(quantityDeltaRaw) ? quantityDeltaRaw : 0;

  const geoRows: Array<{ lat: number; lng: number; label: string | null }> = [];
  for (let i = 0; formData.has(`geoLat[${i}]`); i++) {
    const lat = Number(formData.get(`geoLat[${i}]`));
    const lng = Number(formData.get(`geoLng[${i}]`));
    const label = String(formData.get(`geoLabel[${i}]`) || "").trim() || null;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      geoRows.push({ lat, lng, label });
    }
  }
  const documentFiles: File[] = [];
  for (const value of formData.getAll("documents[]")) {
    if (value && typeof value === "object" && "size" in value && typeof value.size === "number" && value.size > 0) {
      documentFiles.push(value as File);
    }
  }

  const now = new Date();
  const history: ProductHistory = {
    id: newId("HIS"),
    productId: product.id,
    subProductId: sub.id,
    actorId: user.id,
    actor: user.name,
    kind: "tambah_produk",
    stage,
    note,
    quantityDelta,
    createdAt: now.toISOString(),
    points: [],
    documents: [],
  };
  await insertHistory(history);
  for (const point of geoRows) {
    await insertGeoPoint({
      id: newId("GEO"),
      historyId: history.id,
      lat: point.lat,
      lng: point.lng,
      label: point.label,
      createdAt: now.toISOString(),
    });
  }
  await uploadHistoryDocuments(documentFiles, history.id);

  const detail = await getProductDetail(product.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  revalidatePath(`/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}`);
  revalidatePath(`/pengepul/produk/${product.id}/sub/${sub.id}`);
  return { ok: true, detail: detail ?? undefined, eventId: history.id };
}

export type DeleteProductResult = {
  error?: string;
  ok?: boolean;
  products?: ProductDetail[];
};

export async function deleteProductAction(productId: string): Promise<DeleteProductResult> {
  const user = await currentUser();
  if (!user) return { error: "Masuk dulu untuk menghapus produk." };
  if (user.accountType !== "pengepul") return { error: "Hanya akun pengepul yang bisa menghapus produk." };
  const product = await getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan." };
  if (product.pengepulId !== user.id) return { error: "Produk ini bukan milikmu." };
  await deleteProduct(productId);
  const products = await listProductDetailsByPengepul(user.id);
  revalidatePath("/");
  revalidatePath("/pengepul");
  return { ok: true, products };
}
