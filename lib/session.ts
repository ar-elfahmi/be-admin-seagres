import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, saveDb } from "./store";
import type { User } from "./types";

const COOKIE = "sgres_session";

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [uid, secret] = String(raw).split(".");
  const user = getDb().users.find((item) => item.id === uid);
  if (!user || !secret || user.token !== secret) return null;
  return user;
}

export async function startSession(user: User): Promise<void> {
  const db = getDb();
  const target = db.users.find((item) => item.id === user.id);
  if (!target) return;
  if (!target.token) {
    target.token = crypto.randomBytes(16).toString("hex");
    saveDb(db);
  }
  const store = await cookies();
  store.set(COOKIE, `${user.id}.${target.token}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
