-- SeaGres: tambah grade & min_order_kg di sub_products, stage di product_history.
--
-- Tujuan:
--   1) Sub-product punya grade A-D (untuk ditampilkan ke pembeli) dan
--      minimum order per nelayan (quantity terkecil yang bisa dibeli).
--   2) product_history menyimpan stage siklus: estimasi_tangkap |
--      diambil_pengepul | simpan_gudang | olah | siap_jual | jual.
--      Kolom `kind` tetap untuk siklus inventaris; `stage` adalah
--      label proses.
--   3) Index untuk query history per sub_product.

-- 1) sub_products: grade & min_order_kg
alter table public.sub_products
  add column if not exists grade text,
  add column if not exists min_order_kg numeric(12,1) default 1
    check (min_order_kg is null or min_order_kg > 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sub_products_grade_check'
  ) then
    alter table public.sub_products
      add constraint sub_products_grade_check
      check (grade is null or grade in ('A','B','C','D'));
  end if;
end $$;

-- Backfill min_order_kg: 1 untuk baris lama yang masih null
update public.sub_products
  set min_order_kg = 1
  where min_order_kg is null;

-- 2) product_history: stage
alter table public.product_history
  add column if not exists stage text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_history_stage_check'
  ) then
    alter table public.product_history
      add constraint product_history_stage_check
      check (
        stage is null
        or stage in (
          'estimasi_tangkap',
          'diambil_pengepul',
          'simpan_gudang',
          'olah',
          'siap_jual',
          'jual'
        )
      );
  end if;
end $$;

-- Backfill stage dari kind (event yang sudah ada)
update public.product_history
  set stage = case kind
    when 'tambah_produk'   then 'estimasi_tangkap'
    when 'terima_nelayan'  then 'diambil_pengepul'
    when 'jual'            then 'jual'
    else stage
  end
  where stage is null;

-- 3) Index untuk query history per sub_product (sesuai memory sebelumnya)
create index if not exists product_history_sub_product_idx
  on public.product_history(sub_product_id, created_at desc)
  where sub_product_id is not null;
