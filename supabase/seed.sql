-- Seed SeaGres: akun demo pengepul + customer + 3 produk agregasi + 1 history per produk +
-- 2 lots legacy untuk pre-order yang masih hidup di /lot/[id] + 2 orders demo.
-- Jalankan setelah migration 20261004000000_pengepul.sql.

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
) on conflict (id) do nothing;

insert into public.users (
  id, name, initials, email, role, organization, location,
  verified, verification_basis, group_number, account_type,
  pw_salt, pw_hash, token
) values (
  'USR-DEMO-CUST', 'Resto Pesisir Gresik', 'RP', 'resto@seagres.id',
  'Pembeli lokal', 'Resto Pesisir Gresik', 'Gresik Kota',
  true, 'Profil usaha lokal', 'Pembeli-GRS-004', 'customer',
  'GRESIK-BUYER-DEMO-SALT-2026',
  '58a186356f5523c5aa4308872ac04fb992921e80832ef6882e2f8aafadacf34d5f0045ce81925dd3d9d481fbaa688f1ab0cdd85e4347198567ce6f761925e5ba',
  'demo-customer-session-token'
) on conflict (id) do nothing;

insert into public.prices (name, price, source, image) values
  ('Bandeng', 26000, 'Pasar Sidayu', '/products/bandeng.png'),
  ('Udang Vaname', 88000, 'TPI Campurejo', '/products/udang-vaname.png'),
  ('Kerang Hijau', 18000, 'Pasar Gresik', '/products/kerang-hijau.png')
on conflict (name) do nothing;

-- 3 produk agregasi dari Pak Rahmat.
insert into public.products (
  id, name, type, price, coret, size, image, promo,
  pengepul_id, organization, location, barcode, created_at
) values
  ('PRD-130926-001', 'Bandeng Pagi', 'Bandeng', 28000, 32000, '3–4 ekor/kg', '/products/bandeng.png', 'Rantai Dingin',
   'USR-DEMO', 'KUB Mina Jaya', 'Ujungpangkah', 'SG20261013MPRD01', '2026-10-13T06:30:00Z'),
  ('PRD-130926-002', 'Udang Vaname Size 50', 'Udang', 95000, 105000, 'Size 50', '/products/udang-vaname.png', 'Bebas Ongkir',
   'USR-DEMO', 'KUB Mina Jaya', 'Manyar', 'SG20261013MPRD02', '2026-10-13T07:00:00Z'),
  ('PRD-120926-001', 'Kerang Hijau', 'Kerang', 18000, 21000, '±60 biji/kg', '/products/kerang-hijau.png', null,
   'USR-DEMO', 'KUB Mina Jaya', 'Sidayu', 'SG20261012MPRD01', '2026-10-12T07:10:00Z')
on conflict (id) do nothing;

-- Sub-products per produk (nelayan sebagai sumber utama).
insert into public.sub_products (id, product_id, fisherman_name, quantity, unit, geo_lat, geo_lng) values
  ('SUB-130926-001', 'PRD-130926-001', 'Pak Ali',   30, 'kg', -6.9340, 112.5480),
  ('SUB-130926-002', 'PRD-130926-001', 'Bu Sri',    20, 'kg', -6.9361, 112.5519),
  ('SUB-130926-003', 'PRD-130926-002', 'Pak Hadi',  25, 'kg', -6.9750, 112.6230),
  ('SUB-130926-004', 'PRD-130926-002', 'Pak Yanto', 15, 'kg', -6.9768, 112.6275),
  ('SUB-120926-001', 'PRD-120926-001', 'Pak Surat', 40, 'kg', -6.9920, 112.5210),
  ('SUB-120926-002', 'PRD-120926-001', 'Bu Aminah', 20, 'kg', -6.9942, 112.5235)
on conflict (id) do nothing;

-- History tambah_produk per produk dengan 1 titik geo (pendaratan).
insert into public.product_history (id, product_id, sub_product_id, actor_id, actor, kind, note, quantity_delta, created_at) values
  ('HIS-130926-001', 'PRD-130926-001', null, 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'Hasil tangkapan pagi ini, dua rantai tongkat', 0, '2026-10-13T06:30:00Z'),
  ('HIS-130926-002', 'PRD-130926-002', null, 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'Tambahan vaname dari tambak Manyar',          0, '2026-10-13T07:00:00Z'),
  ('HIS-120926-001', 'PRD-120926-001', null, 'USR-DEMO', 'Pak Rahmat', 'tambah_produk', 'Kerang hijau dari Sidayu',                     0, '2026-10-12T07:10:00Z');

insert into public.history_geo_points (id, history_id, lat, lng, label) values
  ('GEO-130926-001', 'HIS-130926-001', -6.9340, 112.5480, 'Pendaratan Ujungpangkah'),
  ('GEO-130926-002', 'HIS-130926-002', -6.9750, 112.6230, 'Tambak Manyar'),
  ('GEO-120926-001', 'HIS-120926-001', -6.9920, 112.5210, 'Pendaratan Sidayu');

-- Lots legacy untuk back-compat: pre-order di /lot/[id] masih hidup dan
-- order FK mengharuskan lot_id valid. Katalog utama adalah produk agregasi.
insert into public.lots (id, name, type, price, coret, weight, seller, location, "time", created_at, size, image, rating, sold, promo) values
  ('SGR-LEGACY-001', 'Bandeng Segar (lama)', 'Bandeng', 28000, 32000, 50, 'KUB Mina Jaya', 'Ujungpangkah', 'Hari ini, 06:30', '2026-10-13T06:30:00Z', '3–4 ekor/kg', '/products/bandeng.png', 4.9, 0, null),
  ('SGR-LEGACY-002', 'Udang Vaname (lama)', 'Udang', 95000, 105000, 30, 'KUB Mina Jaya', 'Manyar', 'Hari ini, 07:00', '2026-10-13T07:00:00Z', 'Size 50', '/products/udang-vaname.png', 4.8, 0, null)
on conflict (id) do nothing;

-- 2 orders demo dari akun customer terhadap lot legacy (pre-order flow).
insert into public.orders (id, lot_id, buyer_user_id, buyer, quantity, status, created_at) values
  ('PO-130926-01', 'SGR-LEGACY-001', 'USR-DEMO-CUST', 'Warung Apung Rahma',  10, 'Baru', '2026-10-13T07:40:00Z'),
  ('PO-130926-02', 'SGR-LEGACY-002', 'USR-DEMO-CUST', 'Resto Pesisir Gresik', 8, 'Baru', '2026-10-13T08:05:00Z')
on conflict (id) do nothing;