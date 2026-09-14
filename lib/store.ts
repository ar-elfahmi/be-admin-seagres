import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Database, Lot, OrderView, PublicUser, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

export function checkPassword(user: User, password: string): boolean {
  try {
    return crypto.scryptSync(String(password), user.pwSalt, 64).toString("hex") === user.pwHash;
  } catch {
    return false;
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

export function initialsOf(name: string): string {
  return String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export function publicUser(user: User | null): PublicUser | null {
  if (!user) return null;
  const { pwSalt, pwHash, token, ...rest } = user;
  return rest;
}

export function ordersView(db: Database): OrderView[] {
  return db.orders
    .map((order) => {
      const lot = db.lots.find((item) => item.id === order.lotId);
      return { ...order, product: lot ? lot.name : "(lot dihapus)", seller: lot ? lot.seller : "—" };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function seed(): Database {
  const demoPw = hashPassword("demo1234");
  return {
    users: [
      {
        id: "USR-DEMO",
        name: "Pak Rahmat",
        initials: "PR",
        email: "rahmat@seagres.id",
        role: "Nelayan & operator kelompok",
        organization: "KUB Mina Jaya",
        location: "Ujungpangkah",
        verified: true,
        verificationBasis: "Rekomendasi penyuluh perikanan",
        groupNumber: "KUB-GRS-019",
        pwSalt: demoPw.salt,
        pwHash: demoPw.hash,
        token: crypto.randomBytes(16).toString("hex"),
      },
    ],
    prices: [
      { name: "Bandeng", price: 26000, source: "Pasar Sidayu", image: "/products/bandeng.png" },
      { name: "Udang Vaname", price: 88000, source: "TPI Campurejo", image: "/products/udang-vaname.png" },
      { name: "Kerang Hijau", price: 18000, source: "Pasar Gresik", image: "/products/kerang-hijau.png" },
    ],
    lots: [
      { id: "SGR-130926-001", name: "Bandeng Segar", type: "Bandeng", price: 28000, coret: 32000, weight: 58, seller: "KUB Mina Jaya", location: "Ujungpangkah", time: "Hari ini, 06:30", createdAt: "2026-09-13T06:30:00.000Z", size: "3–4 ekor/kg", image: "/products/bandeng.png", rating: 4.9, sold: 120, promo: "Bebas Ongkir" },
      { id: "SGR-130926-004", name: "Kerang Hijau", type: "Kerang", price: 18000, coret: 21000, weight: 60, seller: "Kelompok Makmur Bahari", location: "Manyar", time: "Hari ini, 07:10", createdAt: "2026-09-13T07:10:00.000Z", size: "±60 biji/kg", image: "/products/kerang-hijau.png", rating: 4.7, sold: 134, promo: "Bebas Ongkir" },
      { id: "SGR-130926-002", name: "Bandeng Jumbo", type: "Bandeng", price: 36000, coret: null, weight: 22, seller: "KUB Mina Lestari", location: "Ujungpangkah", time: "Hari ini, 06:30", createdAt: "2026-09-13T06:30:00.000Z", size: "2–3 ekor/kg", image: "/products/bandeng.png", rating: 4.8, sold: 64, promo: "Rantai Dingin" },
      { id: "SGR-120926-014", name: "Udang Vaname", type: "Udang", price: 95000, coret: 105000, weight: 40, seller: "Pokdakan Sumber Rezeki", location: "Manyar", time: "Kemarin, 16:20", createdAt: "2026-09-12T16:20:00.000Z", size: "Size 50", image: "/products/udang-vaname.png", rating: 4.8, sold: 86, promo: "Rantai Dingin" },
      { id: "SGR-120926-021", name: "Udang Windu", type: "Udang", price: 128000, coret: null, weight: 18, seller: "Pokdakan Harapan Tani", location: "Gresik Selatan", time: "12 Sep, 15:40", createdAt: "2026-09-12T15:40:00.000Z", size: "Size 40", image: "/products/udang-vaname.png", rating: 4.9, sold: 41, promo: null },
      { id: "SGR-120926-009", name: "Bandeng Tanpa Duri", type: "Olahan", price: 42000, coret: 48000, weight: 30, seller: "CV Laut Bersama", location: "Sidayu", time: "12 Sep, 10:15", createdAt: "2026-09-12T10:15:00.000Z", size: "Kemasan 500 g", image: "/products/bandeng-tanpa-duri.png", rating: 4.9, sold: 210, promo: null },
      { id: "SGR-110926-007", name: "Bandeng Presto", type: "Olahan", price: 30000, coret: 35000, weight: 25, seller: "UMKM Rasa Nusantara", location: "Sidayu", time: "11 Sep, 09:00", createdAt: "2026-09-11T09:00:00.000Z", size: "3 ekor/pack", image: "/products/bandeng-tanpa-duri.png", rating: 4.8, sold: 302, promo: "Bebas Ongkir" },
      { id: "SGR-110926-012", name: "Otak-Otak Bandeng", type: "Olahan", price: 25000, coret: null, weight: 40, seller: "UMKM Mina Rasa", location: "Gresik Kota", time: "11 Sep, 13:20", createdAt: "2026-09-11T13:20:00.000Z", size: "Isi 10 pcs", image: "/products/bandeng-tanpa-duri.png", rating: 4.9, sold: 512, promo: null },
      { id: "SGR-100926-003", name: "Kerang Dara", type: "Kerang", price: 24000, coret: 27000, weight: 15, seller: "Kelompok Tirta Jaya", location: "Manyar", time: "10 Sep, 16:00", createdAt: "2026-09-10T16:00:00.000Z", size: "±30 biji/kg", image: "/products/kerang-hijau.png", rating: 4.6, sold: 77, promo: null },
    ],
    orders: [
      { id: "PO-130926-01", lotId: "SGR-130926-001", buyerUserId: "USR-DEMO", buyer: "Warung Apung Rahma", quantity: 10, status: "Baru", createdAt: "2026-09-13T07:40:00.000Z" },
      { id: "PO-130926-02", lotId: "SGR-120926-014", buyerUserId: "USR-DEMO", buyer: "Resto Pesisir Gresik", quantity: 8, status: "Baru", createdAt: "2026-09-13T08:05:00.000Z" },
    ],
  };
}

export function getDb(): Database {
  if (!fs.existsSync(DATA_FILE)) {
    const fresh = seed();
    saveDb(fresh);
    return fresh;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

export function saveDb(db: Database): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}
