import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase khusus server (Server Components + Server Actions).
 * Service role dipakai karena seluruh otorisasi dilakukan manual di
 * app/actions.ts (pola yang sudah ada), bukan lewat RLS per-request.
 * File ini TIDAK PERNAH diimpor dari client component.
 */
let cached: SupabaseClient | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment ${name} belum diset (lihat .env.local).`);
  return value;
}

export function supabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

