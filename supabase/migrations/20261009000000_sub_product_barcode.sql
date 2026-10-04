-- SeaGres: traceability per penerimaan (sub_product), bukan agregat.
--
--   sub_products.barcode UNIQUE -> barcode keterlacakan per nelayan
--   (produk X dari nelayan Y pada penerimaan Z). Backfill deterministic
--   untuk baris existing: SG<YYYYMMDD><idTail6>, sama dengan makeBarcode()
--   di lib/barcode.ts (bukan ISO date ISO, hanya YYYYMMDD UTC dari
--   sub.created_at).

alter table public.sub_products
  add column if not exists barcode text;

update public.sub_products
  set barcode = 'SG'
       || to_char(created_at AT TIME ZONE 'UTC', 'YYYYMMDD')
       || upper(right(replace(id, '-', ''), 6))
where barcode is null;

alter table public.sub_products
  alter column barcode set not null;

create unique index if not exists sub_products_barcode_key
  on public.sub_products(barcode);
