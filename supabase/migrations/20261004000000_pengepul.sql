-- SeaGres: reposisi produk ke arsitektur pengepul + katalog pelanggan.
--   1) account_type: seller|buyer -> pengepul|customer.
--   2) Tabel agregasi: products (1 pengepul), sub_products (per-nelayan),
--      product_history (event log per penambahan/penjualan),
--      history_geo_points (multi-titik per event),
--      history_documents (multi-dokumen per event).

-- 1) Lebarkan check constraint, migrasikan data, set default.
--    Default validate-on-add aman karena update di bawah sudah mengganti
--    nilai lama sebelum constraint baru dipasang.
alter table public.users drop constraint if exists users_account_type_check;

update public.users
  set account_type = case when account_type = 'buyer' then 'customer' else 'pengepul' end;

alter table public.users
  add constraint users_account_type_check check (account_type in ('pengepul','customer'));

alter table public.users alter column account_type set default 'pengepul';

-- Hapus akun demo lama agar seed ulang menjadi sumber tunggal.
delete from public.orders where buyer_user_id in (select id from public.users where id like 'USR-DEMO%');
delete from public.users where id in ('USR-DEMO','USR-DEMO-BUYER');

-- 2) Produk agregasi: satu nama per pengepul.
create table if not exists public.products (
  id            text primary key,
  name          text not null,
  type          text not null check (type in ('Bandeng','Udang','Kerang','Olahan')),
  price         numeric(12,0) not null check (price >= 1000),
  coret         numeric(12,0),
  size          text not null,
  image         text not null,
  promo         text,
  pengepul_id   text not null references public.users(id) on delete cascade,
  organization  text not null,
  location      text not null,
  barcode       text not null unique,
  created_at    timestamptz not null default now(),
  unique (pengepul_id, name)
);
create index if not exists products_pengepul_idx on public.products(pengepul_id);
create index if not exists products_created_at_idx on public.products(created_at desc);

-- 3) Sub-produk: kontribusi satu nelayan dalam satu produk.
create table if not exists public.sub_products (
  id             text primary key,
  product_id     text not null references public.products(id) on delete cascade,
  fisherman_name text not null,
  quantity       numeric(12,1) not null default 0 check (quantity >= 0),
  unit           text not null default 'kg',
  geo_lat        double precision,
  geo_lng        double precision,
  created_at     timestamptz not null default now(),
  unique (product_id, fisherman_name)
);
create index if not exists sub_products_product_idx on public.sub_products(product_id);

-- 4) Riwayat produk: append-only log per event.
create table if not exists public.product_history (
  id             text primary key,
  product_id     text not null references public.products(id) on delete cascade,
  sub_product_id text references public.sub_products(id) on delete set null,
  actor_id       text not null references public.users(id),
  actor          text not null,
  kind           text not null check (kind in ('tambah_produk','terima_nelayan','jual')),
  note           text,
  quantity_delta numeric(12,1) not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists product_history_product_idx
  on public.product_history(product_id, created_at desc);

-- 5) Geo points: beberapa titik per event (mis. titik pendaratan & titik kapal).
create table if not exists public.history_geo_points (
  id         text primary key,
  history_id text not null references public.product_history(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  label      text,
  created_at timestamptz not null default now()
);
create index if not exists history_geo_points_history_idx
  on public.history_geo_points(history_id);

-- 6) Dokumen pendukung per event (foto/dokumen pada bucket lot-photos).
create table if not exists public.history_documents (
  id         text primary key,
  history_id text not null references public.product_history(id) on delete cascade,
  url        text not null,
  filename   text not null,
  mime       text not null,
  kind       text not null default 'foto' check (kind in ('foto','dokumen')),
  created_at timestamptz not null default now()
);
create index if not exists history_documents_history_idx
  on public.history_documents(history_id);

-- 7) RLS permissive: aksi otorisasi dilakukan manual di app/actions.ts (pola lama).
alter table public.products enable row level security;
alter table public.sub_products enable row level security;
alter table public.product_history enable row level security;
alter table public.history_geo_points enable row level security;
alter table public.history_documents enable row level security;

drop policy if exists products_all on public.products;
create policy products_all on public.products for all using (true) with check (true);
drop policy if exists sub_products_all on public.sub_products;
create policy sub_products_all on public.sub_products for all using (true) with check (true);
drop policy if exists product_history_all on public.product_history;
create policy product_history_all on public.product_history for all using (true) with check (true);
drop policy if exists history_geo_points_all on public.history_geo_points;
create policy history_geo_points_all on public.history_geo_points for all using (true) with check (true);
drop policy if exists history_documents_all on public.history_documents;
create policy history_documents_all on public.history_documents for all using (true) with check (true);