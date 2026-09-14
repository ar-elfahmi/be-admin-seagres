import crypto from "node:crypto";

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

/** Pembanding konstan-waktu; mencegah kebocoran via timing. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Bandingkan tetap agar waktu stabil, hasil tetap salah.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(user: { pwSalt: string; pwHash: string }, password: string): boolean {
  try {
    const hash = crypto.scryptSync(String(password), user.pwSalt, 64).toString("hex");
    return safeEqual(hash, user.pwHash);
  } catch {
    return false;
  }
}

export function initialsOf(name: string): string {
  return String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

