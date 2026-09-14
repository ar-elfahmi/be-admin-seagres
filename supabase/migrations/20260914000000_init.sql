-- SeaGres: skema awal untuk pengganti data/db.json
-- Semua ID memakai format lama (SGR-xxx, PO-xxx, USR-xxx) agar UI tidak berubah.

create table if not exists public.users (
  id          text primary key,
  name        text not null,
  initials    text not null,
  email       text not null unique,
  role        text not null,
  organization text not null,
  location    text not null,
  verified    boolean not null default false,
  verification_basis text not null,
  group_number text not null,
  pw_salt     text not null,
  pw_hash     text not null,
  token       text unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.prices (
  name   text primary key,
  price  numeric(12,0) not null,
  source text not null,
  image  text not null
);

create table if not exists public.lots (
  id         text primary key,
  name       text not null,
  type       text not null,
  price      numeric(12,0) not null,
  coret      numeric(12,0),
  weight     numeric(12,1) not null default 0,
  seller     text not null,
  location   text not null,
  "time"     text not null,
  created_at timestamptz not null default now(),
  size       text not null,
  image      text not null,
  rating     numeric(3,1) not null default 5,
  sold       numeric(12,0) not null default 0,
  promo      text
);

create table if not exists public.orders (
  id            text primary key,
  lot_id        text not null references public.lots(id),
  buyer_user_id text not null references public.users(id),
  buyer         text not null,
  quantity      numeric(12,1) not null,
  status        text not null default 'Baru',
  created_at    timestamptz not null default now()
);

create index if not exists orders_lot_id_idx on public.orders(lot_id);
create index if not exists orders_buyer_idx on public.orders(buyer_user_id);
create index if not exists lots_created_at_idx on public.lots(created_at desc);

-- views untuk kebutuhan UI (OrderView: product + seller dari lot)
create or replace view public.order_views as
select o.id, o.lot_id, o.buyer_user_id, o.buyer, o.quantity, o.status, o.created_at,
       coalesce(l.name, '(lot dihapus)') as product,
       coalesce(l.seller, '—')          as seller
from public.orders o
left join public.lots l on l.id = o.lot_id;
