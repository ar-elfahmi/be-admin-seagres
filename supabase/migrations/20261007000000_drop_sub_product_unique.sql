-- Terima berulang: satu nelayan boleh punya banyak penerimaan.
-- Tiap klik Terima = 1 baris sub_products baru (= 1 kartu penerimaan),
-- jadi unique (product_id, fisherman_name) harus dicabut.
alter table public.sub_products
  drop constraint if exists sub_products_product_id_fisherman_name_key;
