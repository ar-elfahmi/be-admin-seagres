-- SeaGres: port fitur polish dari dexpie/iGres ke fork Supabase.
--   - users.account_type: pembeda peran (penjual/pembeli).
--   - lots.quality: checklist mutu per lot (jsonb).
--   - reports: tabel laporan masalah.
--   - Seed akun demo pembeli (USR-DEMO-BUYER).

-- 1) Pembeda peran akun.
-- DEFAULT 'seller' aman: akun lama otomatis jadi penjual; backfill manual USR-DEMO-BUYER ke 'buyer' di bawah.
alter table public.users
  add column if not exists account_type text not null default 'seller'
    check (account_type in ('seller', 'buyer'));

-- 2) Checklist mutu per lot.
alter table public.lots
  add column if not exists quality jsonb;

-- 3) Tabel laporan masalah (pelaporan masalah mutu/keterlambatan/ketidaksesuaian).
create table if not exists public.reports (
  id               text primary key,
  reporter_user_id text not null references public.users(id) on delete cascade,
  reporter         text not null,
  lot_id           text references public.lots(id) on delete set null,
  category         text not null,
  description      text not null check (length(description) >= 10),
  status           text not null default 'Baru'
                     check (status in ('Baru', 'Ditinjau', 'Selesai')),
  created_at       timestamptz not null default now()
);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_reporter_idx on public.reports(reporter_user_id);

-- 4) Seed akun demo pembeli agar login demo resto@seagres.id bekerja.
--    Salt/hash deterministik sehingga seed.sql portabel dan bisa diulang.
insert into public.users (
  id, name, initials, email, role, organization, location,
  verified, verification_basis, group_number, account_type,
  pw_salt, pw_hash, token
) values (
  'USR-DEMO-BUYER', 'Resto Pesisir Gresik', 'RP',
  'resto@seagres.id', 'Pembeli lokal', 'Resto Pesisir Gresik', 'Gresik Kota',
  true, 'Profil usaha lokal', 'Pembeli-GRS-004', 'buyer',
  'GRESIK-BUYER-DEMO-SALT-2026',
  '58a186356f5523c5aa4308872ac04fb992921e80832ef6882e2f8aafadacf34d5f0045ce81925dd3d9d481fbaa688f1ab0cdd85e4347198567ce6f761925e5ba',
  'demo-buyer-session-token'
) on conflict (id) do nothing;

-- Jika tabel users sudah terisi sebelum kolom account_type ada (backfill aman saat rerun):
update public.users set account_type = 'buyer'  where id = 'USR-DEMO-BUYER' and account_type <> 'buyer';
update public.users set account_type = 'seller' where id = 'USR-DEMO'      and account_type <> 'seller';

-- Riwayat order di seed memakai buyer_user_id = USR-DEMO (akun seller) — perbaiki agar OrderView valid.
update public.orders set buyer_user_id = 'USR-DEMO-BUYER' where buyer_user_id = 'USR-DEMO' and buyer = 'Resto Pesisir Gresik';
update public.orders set buyer_user_id = 'USR-DEMO-BUYER' where buyer_user_id = 'USR-DEMO' and id = 'PO-130926-02';

-- 5) Izin: reports select/insert untuk role anon & authenticated (RLS aktif di Supabase default).
alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
drop policy if exists reports_select on public.reports;
create policy reports_insert on public.reports for insert with check (true);
create policy reports_select on public.reports for select using (true);
