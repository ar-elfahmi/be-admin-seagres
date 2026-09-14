import crypto from "node:crypto";
import { cookies } from "next/headers";
import { findUserById, setUserToken } from "./queries";
import { safeEqual } from "./crypto";
import type { User } from "./types";

const COOKIE = "sgres_session";

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [uid, secret] = String(raw).split(".");
  if (!uid || !secret) return null;
  const user = await findUserById(uid);
  if (!user || !user.token || !safeEqual(user.token, secret)) return null;
  return user;
}

export async function startSession(user: User): Promise<void> {
  const target = await findUserById(user.id);
  if (!target) return;
  let token = target.token;
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    await setUserToken(target.id, token);
  }
  const store = await cookies();
  store.set(COOKIE, `${target.id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
