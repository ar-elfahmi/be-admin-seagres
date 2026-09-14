"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  applyAcceptEffects,
  findUserByEmail,
  getLot,
  getOrder,
  insertLot,
  insertOrder,
  insertReport,
  insertUser,
  listLots,
  listOrderViews,
  reserveWeight,
  updateOrderStatus,
} from "../lib/queries";
import { supabase } from "../lib/supabase";
import { checkPassword, hashPassword, initialsOf } from "../lib/crypto";
import { currentUser, startSession, endSession } from "../lib/session";
import type { AccountType, IssueReport, Lot, LotQuality, Order, OrderView, RegisterInput, User } from "../lib/types";

const DEFAULT_IMAGES: Record<string, string> = {
  Bandeng: "/products/bandeng.png",
  Udang: "/products/udang-vaname.png",
  Kerang: "/products/kerang-hijau.png",
  Olahan: "/products/bandeng-tanpa-duri.png",
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
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
  const accountType: AccountType = input?.accountType === "buyer" ? "buyer" : "seller";
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
    role: accountType === "buyer" ? "Pembeli lokal" : String(input.role || "Pembudidaya"),
    organization:
      accountType === "buyer"
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
  if (user.accountType !== "seller") {
    return { error: "Akun pembeli tidak bisa mencatat lot. Masuk dengan akun penjual." };
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
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[fileType];
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
  if (user.accountType !== "buyer") {
    return { error: "Akun penjual tidak bisa mengajukan pre-order ke lot sendiri. Masuk dengan akun pembeli." };
  }
  const lot = await getLot(lotId);
  if (!lot) return { error: "Lot tidak ditemukan." };
  if (lot.weight <= 0) return { error: "Stok lot ini sudah habis." };
  const amount = Math.max(1, Math.min(lot.weight, Math.round(Number(quantity) || 1)));
  // Reservasi atomik dulu: row lock mencegah oversell; gagal berarti stok kurang.
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
  if (user.accountType !== "seller") return { error: "Hanya akun penjual yang bisa mengubah status pesanan." };
  if (!["Diterima", "Ditolak", "Baru"].includes(status)) return { error: "Status tidak valid." };
  const order = await getOrder(orderId);
  if (!order) return { error: "Pesanan tidak ditemukan." };
  const lot = await getLot(order.lotId);
  if (!lot || lot.seller !== user.organization) {
    return { error: "Hanya kelompok penjual lot ini yang bisa mengubah status." };
  }
  const updated = await updateOrderStatus(orderId, status);
  // Efek penerimaan hanya sekali: guard transisi + hanya jika update sukses.
  if (updated && status === "Diterima" && order.status !== "Diterima") {
    await applyAcceptEffects(order);
  }
  revalidatePath("/");
  revalidatePath(`/lot/${lot.id}`);
  return { ok: true, orders: await listOrderViews(), lots: await listLots() };
}

/** Kirim laporan masalah. Boleh dari akun apa pun yang sudah login. */
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
