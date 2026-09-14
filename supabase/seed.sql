-- Seed SeaGres: identik dengan seed() di lib/store.ts
insert into public.users (id, name, initials, email, role, organization, location, verified, verification_basis, group_number, pw_salt, pw_hash, token)
values (
  'USR-DEMO', 'Pak Rahmat', 'PR', 'rahmat@seagres.id',
  'Nelayan & operator kelompok', 'KUB Mina Jaya', 'Ujungpangkah',
  true, 'Rekomendasi penyuluh perikanan', 'KUB-GRS-019',
  '806e0b2012aa9982137612331112907b',
  'acb1fe52b4b52e887dfdfe021ac16fa6de0b571852b13def301906636521e612078a0fa26c70e7b3feb56e26af5caf0ff556c22531da1120d922618e8f595db3',
  '6ad67617c78275578e5ec8f2ef0499fc'
) on conflict (id) do nothing;

insert into public.prices (name, price, source, image) values
  ('Bandeng', 26000, 'Pasar Sidayu', '/products/bandeng.png'),
  ('Udang Vaname', 88000, 'TPI Campurejo', '/products/udang-vaname.png'),
  ('Kerang Hijau', 18000, 'Pasar Gresik', '/products/kerang-hijau.png')
on conflict (name) do nothing;

insert into public.lots (id, name, type, price, coret, weight, seller, location, "time", created_at, size, image, rating, sold, promo) values
  ('SGR-130926-001', 'Bandeng Segar', 'Bandeng', 28000, 32000, 58, 'KUB Mina Jaya', 'Ujungpangkah', 'Hari ini, 06:30', '2026-09-13T06:30:00Z', '3–4 ekor/kg', '/products/bandeng.png', 4.9, 120, 'Bebas Ongkir'),
  ('SGR-130926-004', 'Kerang Hijau', 'Kerang', 18000, 21000, 60, 'Kelompok Makmur Bahari', 'Manyar', 'Hari ini, 07:10', '2026-09-13T07:10:00Z', '±60 biji/kg', '/products/kerang-hijau.png', 4.7, 134, 'Bebas Ongkir'),
  ('SGR-130926-002', 'Bandeng Jumbo', 'Bandeng', 36000, null, 22, 'KUB Mina Lestari', 'Ujungpangkah', 'Hari ini, 06:30', '2026-09-13T06:30:00Z', '2–3 ekor/kg', '/products/bandeng.png', 4.8, 64, 'Rantai Dingin'),
  ('SGR-120926-014', 'Udang Vaname', 'Udang', 95000, 105000, 40, 'Pokdakan Sumber Rezeki', 'Manyar', 'Kemarin, 16:20', '2026-09-12T16:20:00Z', 'Size 50', '/products/udang-vaname.png', 4.8, 86, 'Rantai Dingin'),
  ('SGR-120926-021', 'Udang Windu', 'Udang', 128000, null, 18, 'Pokdakan Harapan Tani', 'Gresik Selatan', '12 Sep, 15:40', '2026-09-12T15:40:00Z', 'Size 40', '/products/udang-vaname.png', 4.9, 41, null),
  ('SGR-120926-009', 'Bandeng Tanpa Duri', 'Olahan', 42000, 48000, 30, 'CV Laut Bersama', 'Sidayu', '12 Sep, 10:15', '2026-09-12T10:15:00Z', 'Kemasan 500 g', '/products/bandeng-tanpa-duri.png', 4.9, 210, null),
  ('SGR-110926-007', 'Bandeng Presto', 'Olahan', 30000, 35000, 25, 'UMKM Rasa Nusantara', 'Sidayu', '11 Sep, 09:00', '2026-09-11T09:00:00Z', '3 ekor/pack', '/products/bandeng-tanpa-duri.png', 4.8, 302, 'Bebas Ongkir'),
  ('SGR-110926-012', 'Otak-Otak Bandeng', 'Olahan', 25000, null, 40, 'UMKM Mina Rasa', 'Gresik Kota', '11 Sep, 13:20', '2026-09-11T13:20:00Z', 'Isi 10 pcs', '/products/bandeng-tanpa-duri.png', 4.9, 512, null),
  ('SGR-100926-003', 'Kerang Dara', 'Kerang', 24000, 27000, 15, 'Kelompok Tirta Jaya', 'Manyar', '10 Sep, 16:00', '2026-09-10T16:00:00Z', '±30 biji/kg', '/products/kerang-hijau.png', 4.6, 77, null)
on conflict (id) do nothing;

insert into public.orders (id, lot_id, buyer_user_id, buyer, quantity, status, created_at) values
  ('PO-130926-01', 'SGR-130926-001', 'USR-DEMO', 'Warung Apung Rahma', 10, 'Baru', '2026-09-13T07:40:00Z'),
  ('PO-130926-02', 'SGR-120926-014', 'USR-DEMO', 'Resto Pesisir Gresik', 8, 'Baru', '2026-09-13T08:05:00Z')
on conflict (id) do nothing;
