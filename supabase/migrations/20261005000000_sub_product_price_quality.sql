-- SeaGres: tambah atribut per-nelayan di sub_products:
--   name    - nama komoditas yang diserahkan nelayan ini
--   price   - harga jual dari nelayan ini (bisa beda antar nelayan)
--   quality - checklist mutu (cleanHandling/packaging/temperature/dispatch)
--
-- Sebelumnya harga diwarisi dari product.price dan mutu hanya ada di
-- legacy lots; sekarang tiap kontribusi nelayan punya harga & mutu sendiri.
--
-- Backfill row existing: name/price dari produk induk, quality default.

alter table public.sub_products
  add column if not exists name text,
  add column if not exists price numeric(12,0),
  add column if not exists quality jsonb;

-- Backfill name dari nama produk induk (sub-produk = kontribusi satu
-- nelayan atas produk induk tersebut).
update public.sub_products sp
  set name = p.name
  from public.products p
  where sp.product_id = p.id
    and sp.name is null;
update public.sub_products sp
  set price = p.price
  from public.products p
  where sp.product_id = p.id
    and sp.price is null;

-- Backfill quality: pakai shape LotQuality minimal (cleanHandling=true,
-- packaging='Standar pengepul', temperature=null, dispatch=null)
update public.sub_products
  set quality = jsonb_build_object(
    'cleanHandling', true,
    'packaging', 'Standar pengepul',
    'temperature', null,
    'dispatch', null
  )
  where quality is null;
