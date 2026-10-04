-- SeaGres: reset demo + seed baru yang enak dilihat.
--
-- Cara pakai: jalankan SELURUH file ini di Supabase SQL editor.
-- File mandiri: memastikan kolom dulu (DB prod belum tentu sudah
-- menjalankan migrasi 05/06), mencabut unique, menghapus HANYA data demo,
-- lalu insert seed baru.
--
-- Isi seed: 2 akun demo (kredensial persis seed lama), 4 produk (semua tipe
-- filter: Bandeng/Udang/Kerang/Olahan), tiap produk 2-3 nelayan dan
-- 1 nelayan punya 2-3 penerimaan (sub_products beda id/created_at),
-- tiap penerimaan 1 history tambah_produk + 1-2 history jual.

-- 0a) Pastikan kolom per-nelayan ada (migrasi 05).
alter table public.sub_products
  add column if not exists name text,
  add column if not exists price numeric(12,0),
  add column if not exists quality jsonb;

-- 0b) Pastikan grade & min_order_kg ada (migrasi 06).
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

update public.sub_products
  set min_order_kg = 1
  where min_order_kg is null;

-- 0c) Pastikan stage ada (migrasi 06).
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

-- 0d) Cabut unique agar 1 nelayan boleh punya banyak penerimaan.
alter table public.sub_products
  drop constraint if exists sub_products_product_id_fisherman_name_key;

-- 1) Hapus HANYA data demo (scoped, aman untuk data produksi).
--    Urutan child-first: docs/points -> history -> subs -> products,
--    lalu lots/orders demo, reports demo, users/prices demo.
delete from public.history_documents
  where history_id in (
    select h.id from public.product_history h
    join public.products p on p.id = h.product_id
    where p.pengepul_id = 'USR-DEMO'
  );
delete from public.history_geo_points
  where history_id in (
    select h.id from public.product_history h
    join public.products p on p.id = h.product_id
    where p.pengepul_id = 'USR-DEMO'
  );
delete from public.product_history
  where product_id in (
    select id from public.products where pengepul_id = 'USR-DEMO'
  );
delete from public.sub_products
  where product_id in (
    select id from public.products where pengepul_id = 'USR-DEMO'
  );
delete from public.products where pengepul_id = 'USR-DEMO';
delete from public.orders where id in ('PO-040926-01', 'PO-040926-02', 'PO-130926-01', 'PO-130926-02');
delete from public.lots where id in ('SGR-LEGACY-001', 'SGR-LEGACY-002');
delete from public.reports where reporter_user_id in ('USR-DEMO', 'USR-DEMO-CUST', 'USR-DEMO-BUYER');
delete from public.users where id in ('USR-DEMO', 'USR-DEMO-CUST', 'USR-DEMO-BUYER');
delete from public.prices where name in ('Bandeng', 'Udang Vaname', 'Kerang Hijau', 'Bandeng Tanpa Duri');

-- 2) Akun demo (salt/hash/token persis seed lama — jangan regenerate).
insert into public.users (
  id, name, initials, email, role, organization, location,
  verified, verification_basis, group_number, account_type,
  pw_salt, pw_hash, token
) values (
  'USR-DEMO', 'Pak Rahmat', 'PR', 'rahmat@seagres.id',
  'Pengepul perikanan', 'KUB Mina Jaya', 'Ujungpangkah',
  true, 'Rekomendasi penyuluh perikanan', 'KUB-GRS-019', 'pengepul',
  '806e0b2012aa9982137612331112907b',
  'acb1fe52b4b52e887dfdfe021ac16fa6de0b571852b13def301906636521e612078a0fa26c70e7b3feb56e26af5caf0ff556c22531da1120d922618e8f595db3',
  '6ad67617c78275578e5ec8f2ef0499fc'
), (
  'USR-DEMO-CUST', 'Resto Pesisir Gresik', 'RP', 'resto@seagres.id',
  'Pembeli lokal', 'Resto Pesisir Gresik', 'Gresik Kota',
  true, 'Profil usaha lokal', 'Pembeli-GRS-004', 'customer',
  'GRESIK-BUYER-DEMO-SALT-2026',
  '58a186356f5523c5aa4308872ac04fb992921e80832ef6882e2f8aafadacf34d5f0045ce81925dd3d9d481fbaa688f1ab0cdd85e4347198567ce6f761925e5ba',
  'demo-customer-session-token'
);

-- 3) Harga acuan.
insert into public.prices (name, price, source, image) values
  ('Bandeng', 26000, 'Pasar Sidayu', '/products/bandeng.png'),
  ('Udang Vaname', 88000, 'TPI Campurejo', '/products/udang-vaname.png'),
  ('Kerang Hijau', 18000, 'Pasar Gresik', '/products/kerang-hijau.png'),
  ('Bandeng Tanpa Duri', 42000, 'UMKM Olahan Gresik', '/products/bandeng-tanpa-duri.png');

-- 4) Produk (4 tipe filter ter-cover).
insert into public.products (
  id, name, type, price, coret, size, image, promo,
  pengepul_id, organization, location, barcode, created_at
) values
  ('PRD-BANDENG-01', 'Bandeng Pagi', 'Bandeng', 28000, 32000, '3–4 ekor/kg', '/products/bandeng.png', 'Rantai Dingin',
   'USR-DEMO', 'KUB Mina Jaya', 'Ujungpangkah', 'SG20261004BAND01', '2026-10-04T05:00:00Z'),
  ('PRD-UDANG-01', 'Udang Vaname Size 50', 'Udang', 95000, 105000, 'Size 50', '/products/udang-vaname.png', 'Bebas Ongkir',
   'USR-DEMO', 'KUB Mina Jaya', 'Manyar', 'SG20261004UDANG01', '2026-10-04T05:30:00Z'),
  ('PRD-KERANG-01', 'Kerang Hijau', 'Kerang', 18000, 21000, '±60 biji/kg', '/products/kerang-hijau.png', null,
   'USR-DEMO', 'KUB Mina Jaya', 'Sidayu', 'SG20261004KERANG01', '2026-10-04T06:00:00Z'),
  ('PRD-OLAHAN-01', 'Bandeng Presto Tulang Lunak', 'Olahan', 45000, 52000, '500 g/pack', '/products/bandeng-tanpa-duri.png', 'Siap Saji',
   'USR-DEMO', 'KUB Mina Jaya', 'Gresik Kota', 'SG20261004OLAHAN01', '2026-10-04T06:30:00Z');

-- 5) Penerimaan (sub_products). Kunci demo hirarki: Pak Ali 3x terima,
--    Pak Hadi 2x terima, Bu Aminah 2x terima, Bu Lastri 2x terima
--    (nama sama, id + created_at beda).
--    Stok = diterima - terjual: ALI-1 28-5=23, HADI-1 25-8=17,
--    LASTRI-1 30-10=20 (konsisten dengan history jual di bawah).
insert into public.sub_products
  (id, product_id, name, fisherman_name, quantity, unit, price, min_order_kg, grade, quality, geo_lat, geo_lng, created_at)
values
  -- Bandeng Pagi: Pak Ali 3 penerimaan + Bu Sri 1 penerimaan
  ('SUB-BDG-ALI-1', 'PRD-BANDENG-01', 'Bandeng segar', 'Pak Ali', 23, 'kg', 26500, 1, 'A',
   '{"cleanHandling": true, "packaging": "Es & box food grade", "temperature": "0–4 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9340, 112.5480, '2026-10-04T05:10:00Z'),
  ('SUB-BDG-ALI-2', 'PRD-BANDENG-01', 'Bandeng segar', 'Pak Ali', 22, 'kg', 27000, 1, 'A',
   '{"cleanHandling": true, "packaging": "Es & box food grade", "temperature": "0–4 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9342, 112.5484, '2026-10-04T05:45:00Z'),
  ('SUB-BDG-ALI-3', 'PRD-BANDENG-01', 'Bandeng segar', 'Pak Ali', 18, 'kg', 27500, 1, 'B',
   '{"cleanHandling": true, "packaging": "Keranjang bersih", "temperature": "0–4 °C", "dispatch": "Motor keranjang"}',
   -6.9345, 112.5490, '2026-10-04T06:20:00Z'),
  ('SUB-BDG-SRI-1', 'PRD-BANDENG-01', 'Bandeng segar', 'Bu Sri', 20, 'kg', 28500, 1, 'A',
   '{"cleanHandling": true, "packaging": "Keranjang bersih", "temperature": "0–4 °C", "dispatch": "Motor keranjang"}',
   -6.9361, 112.5519, '2026-10-04T05:25:00Z'),
  -- Udang: Pak Hadi 2 penerimaan + Pak Yanto 1 penerimaan
  ('SUB-UDG-HADI-1', 'PRD-UDANG-01', 'Udang vaname size 50', 'Pak Hadi', 17, 'kg', 93000, 1, 'A',
   '{"cleanHandling": true, "packaging": "Es & box food grade", "temperature": "-18 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9750, 112.6230, '2026-10-04T05:40:00Z'),
  ('SUB-UDG-HADI-2', 'PRD-UDANG-01', 'Udang vaname size 50', 'Pak Hadi', 15, 'kg', 94000, 1, 'B',
   '{"cleanHandling": true, "packaging": "Es & box food grade", "temperature": "-18 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9752, 112.6234, '2026-10-04T06:15:00Z'),
  ('SUB-UDG-YANTO-1', 'PRD-UDANG-01', 'Udang vaname size 50', 'Pak Yanto', 15, 'kg', 97000, 2, 'A',
   '{"cleanHandling": true, "packaging": "Es & box food grade", "temperature": "-18 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9768, 112.6275, '2026-10-04T05:55:00Z'),
  -- Kerang: Pak Surat 1 + Bu Aminah 2 penerimaan
  ('SUB-KRG-SURAT-1', 'PRD-KERANG-01', 'Kerang hijau', 'Pak Surat', 40, 'kg', 17500, 2, 'B',
   '{"cleanHandling": true, "packaging": "Keranjang bersih", "temperature": null, "dispatch": "Motor keranjang"}',
   -6.9920, 112.5210, '2026-10-04T06:10:00Z'),
  ('SUB-KRG-AMINAH-1', 'PRD-KERANG-01', 'Kerang hijau', 'Bu Aminah', 20, 'kg', 18500, 2, 'A',
   '{"cleanHandling": true, "packaging": "Keranjang bersih", "temperature": null, "dispatch": "Motor keranjang"}',
   -6.9942, 112.5235, '2026-10-04T06:25:00Z'),
  ('SUB-KRG-AMINAH-2', 'PRD-KERANG-01', 'Kerang hijau', 'Bu Aminah', 12, 'kg', 18000, 2, 'A',
   '{"cleanHandling": true, "packaging": "Keranjang bersih", "temperature": null, "dispatch": "Motor keranjang"}',
   -6.9944, 112.5238, '2026-10-04T06:40:00Z'),
  -- Olahan: Bu Lastri 2 penerimaan + Pak Joko 1 penerimaan
  ('SUB-OLH-LASTRI-1', 'PRD-OLAHAN-01', 'Bandeng presto', 'Bu Lastri', 20, 'kg', 40000, 1, 'A',
   '{"cleanHandling": true, "packaging": "Kemasan olahan tersegel", "temperature": "0–4 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9980, 112.5320, '2026-10-04T06:35:00Z'),
  ('SUB-OLH-LASTRI-2', 'PRD-OLAHAN-01', 'Bandeng presto', 'Bu Lastri', 20, 'kg', 41000, 1, 'A',
   '{"cleanHandling": true, "packaging": "Kemasan olahan tersegel", "temperature": "0–4 °C", "dispatch": "Mobil box berpendingin"}',
   -6.9982, 112.5324, '2026-10-04T07:00:00Z'),
  ('SUB-OLH-JOKO-1', 'PRD-OLAHAN-01', 'Bandeng presto', 'Pak Joko', 15, 'kg', 42000, 1, 'B',
   '{"cleanHandling": true, "packaging": "Kemasan olahan tersegel", "temperature": "0–4 °C", "dispatch": "Motor keranjang"}',
   -6.9990, 112.5340, '2026-10-04T06:50:00Z');

-- 6) History: tiap penerimaan 1 tambah_produk (+ geo point), plus jual.
--    quantity_delta tambah = jumlah diterima; sub.quantity = sisa setelah jual.
insert into public.product_history
  (id, product_id, sub_product_id, actor_id, actor, kind, stage, note, quantity_delta, created_at)
values
  ('HIS-BDG-ALI-1', 'PRD-BANDENG-01', 'SUB-BDG-ALI-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'estimasi_tangkap', 'Setoran pagi trip pertama', 28, '2026-10-04T05:10:00Z'),
  ('HIS-BDG-ALI-2', 'PRD-BANDENG-01', 'SUB-BDG-ALI-2', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'diambil_pengepul', 'Setoran pagi trip kedua', 22, '2026-10-04T05:45:00Z'),
  ('HIS-BDG-ALI-3', 'PRD-BANDENG-01', 'SUB-BDG-ALI-3', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'diambil_pengepul', 'Setoran siang, size agak kecil', 18, '2026-10-04T06:20:00Z'),
  ('HIS-BDG-SRI-1', 'PRD-BANDENG-01', 'SUB-BDG-SRI-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'estimasi_tangkap', 'Setoran Bu Sri pagi ini', 20, '2026-10-04T05:25:00Z'),
  ('HIS-BDG-JUAL-1', 'PRD-BANDENG-01', 'SUB-BDG-ALI-1', 'USR-DEMO', 'Pak Rahmat', 'jual', 'jual', 'Jual 5 kg ke Warung Apung Rahma', -5, '2026-10-04T07:30:00Z'),
  ('HIS-UDG-HADI-1', 'PRD-UDANG-01', 'SUB-UDG-HADI-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'estimasi_tangkap', 'Panen tambak Manyar pagi', 25, '2026-10-04T05:40:00Z'),
  ('HIS-UDG-HADI-2', 'PRD-UDANG-01', 'SUB-UDG-HADI-2', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'diambil_pengepul', 'Panen susulan, grade B', 15, '2026-10-04T06:15:00Z'),
  ('HIS-UDG-YANTO-1', 'PRD-UDANG-01', 'SUB-UDG-YANTO-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'estimasi_tangkap', 'Setoran Pak Yanto', 15, '2026-10-04T05:55:00Z'),
  ('HIS-UDG-JUAL-1', 'PRD-UDANG-01', 'SUB-UDG-HADI-1', 'USR-DEMO', 'Pak Rahmat', 'jual', 'jual', 'Jual 8 kg ke Resto Pesisir', -8, '2026-10-04T07:45:00Z'),
  ('HIS-KRG-SURAT-1', 'PRD-KERANG-01', 'SUB-KRG-SURAT-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'estimasi_tangkap', 'Kerang dari Sidayu', 40, '2026-10-04T06:10:00Z'),
  ('HIS-KRG-AMINAH-1', 'PRD-KERANG-01', 'SUB-KRG-AMINAH-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'diambil_pengepul', 'Setoran pertama Bu Aminah', 20, '2026-10-04T06:25:00Z'),
  ('HIS-KRG-AMINAH-2', 'PRD-KERANG-01', 'SUB-KRG-AMINAH-2', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'diambil_pengepul', 'Setoran kedua Bu Aminah', 12, '2026-10-04T06:40:00Z'),
  ('HIS-OLH-LASTRI-1', 'PRD-OLAHAN-01', 'SUB-OLH-LASTRI-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'simpan_gudang', 'Presto batch pagi', 30, '2026-10-04T06:35:00Z'),
  ('HIS-OLH-LASTRI-2', 'PRD-OLAHAN-01', 'SUB-OLH-LASTRI-2', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'siap_jual', 'Presto batch siang', 20, '2026-10-04T07:00:00Z'),
  ('HIS-OLH-JOKO-1', 'PRD-OLAHAN-01', 'SUB-OLH-JOKO-1', 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'olah', 'Setoran Pak Joko, presto rumahan', 15, '2026-10-04T06:50:00Z'),
  ('HIS-OLH-JUAL-1', 'PRD-OLAHAN-01', 'SUB-OLH-LASTRI-1', 'USR-DEMO', 'Pak Rahmat', 'jual', 'jual', 'Jual 10 pack ke Resto Pesisir', -10, '2026-10-04T08:00:00Z');

insert into public.history_geo_points (id, history_id, lat, lng, label) values
  ('GEO-BDG-ALI-1', 'HIS-BDG-ALI-1', -6.9340, 112.5480, 'Pendaratan Ujungpangkah'),
  ('GEO-BDG-ALI-2', 'HIS-BDG-ALI-2', -6.9342, 112.5484, 'Pendaratan Ujungpangkah'),
  ('GEO-BDG-ALI-3', 'HIS-BDG-ALI-3', -6.9345, 112.5490, 'Pendaratan Ujungpangkah'),
  ('GEO-BDG-SRI-1', 'HIS-BDG-SRI-1', -6.9361, 112.5519, 'Pendaratan Ujungpangkah'),
  ('GEO-UDG-HADI-1', 'HIS-UDG-HADI-1', -6.9750, 112.6230, 'Tambak Manyar'),
  ('GEO-UDG-HADI-2', 'HIS-UDG-HADI-2', -6.9752, 112.6234, 'Tambak Manyar'),
  ('GEO-UDG-YANTO-1', 'HIS-UDG-YANTO-1', -6.9768, 112.6275, 'Tambak Manyar'),
  ('GEO-KRG-SURAT-1', 'HIS-KRG-SURAT-1', -6.9920, 112.5210, 'Pendaratan Sidayu'),
  ('GEO-KRG-AMINAH-1', 'HIS-KRG-AMINAH-1', -6.9942, 112.5235, 'Pendaratan Sidayu'),
  ('GEO-KRG-AMINAH-2', 'HIS-KRG-AMINAH-2', -6.9944, 112.5238, 'Pendaratan Sidayu'),
  ('GEO-OLH-LASTRI-1', 'HIS-OLH-LASTRI-1', -6.9980, 112.5320, 'Dapur olahan Gresik'),
  ('GEO-OLH-LASTRI-2', 'HIS-OLH-LASTRI-2', -6.9982, 112.5324, 'Dapur olahan Gresik'),
  ('GEO-OLH-JOKO-1', 'HIS-OLH-JOKO-1', -6.9990, 112.5340, 'Dapur olahan Gresik');

-- 7) Lots legacy + orders demo (pre-order flow tetap hidup).
insert into public.lots
  (id, name, type, price, coret, weight, seller, location, "time", created_at, size, image, rating, sold, promo)
values
  ('SGR-LEGACY-001', 'Bandeng Segar (lama)', 'Bandeng', 28000, 32000, 50, 'KUB Mina Jaya', 'Ujungpangkah', 'Hari ini, 06:30', '2026-10-04T05:00:00Z', '3–4 ekor/kg', '/products/bandeng.png', 4.9, 0, null),
  ('SGR-LEGACY-002', 'Udang Vaname (lama)', 'Udang', 95000, 105000, 30, 'KUB Mina Jaya', 'Manyar', 'Hari ini, 07:00', '2026-10-04T05:30:00Z', 'Size 50', '/products/udang-vaname.png', 4.8, 0, null);

insert into public.orders (id, lot_id, buyer_user_id, buyer, quantity, status, created_at) values
  ('PO-040926-01', 'SGR-LEGACY-001', 'USR-DEMO-CUST', 'Warung Apung Rahma', 10, 'Baru', '2026-10-04T07:40:00Z'),
  ('PO-040926-02', 'SGR-LEGACY-002', 'USR-DEMO-CUST', 'Resto Pesisir Gresik', 8, 'Baru', '2026-10-04T08:05:00Z');
