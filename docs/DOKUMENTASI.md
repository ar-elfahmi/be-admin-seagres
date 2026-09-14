# Dokumentasi SeaGres

Pasar hasil pesisir Gresik, dari nelayan langsung ke pembeli.

---

# Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Latar Belakang dan Masalah](#2-latar-belakang-dan-masalah)
3. [Tujuan Aplikasi](#3-tujuan-aplikasi)
4. [Pengguna dan Peran](#4-pengguna-dan-peran)
5. [Stack Teknologi](#5-stack-teknologi)
6. [Struktur Proyek](#6-struktur-proyek)
7. [Skema Database](#7-skema-database)
8. [Row Level Security](#8-row-level-security)
9. [Alur Autentikasi](#9-alur-autentikasi)
10. [Server Actions](#10-server-actions)
11. [Halaman dan Komponen](#11-halaman-dan-komponen)
12. [Katalog dan Filter](#12-katalog-dan-filter)
13. [Pencatatan Lot](#13-pencatatan-lot)
14. [Pre-Order](#14-pre-order)
15. [Manajemen Pesanan](#15-manajemen-pesanan)
16. [Kartu Lot Publik dan QR](#16-kartu-lot-publik-dan-qr)
17. [Laporan Masalah](#17-laporan-masalah)
18. [Papan Harga](#18-papan-harga)
19. [Antarmuka dan Responsivitas](#19-antarmuka-dan-responsivitas)
20. [Logo dan Identitas](#20-logo-dan-identitas)
21. [Pengaturan Lingkungan](#21-pengaturan-lingkungan)
22. [Build, Lint, dan Type Check](#22-build-lint-dan-type-check)
23. [Urutan Migrasi dan Seed](#23-urutan-migrasi-dan-seed)
24. [Akun Demo](#24-akun-demo)
25. [Catatan Deployment](#25-catatan-deployment)
26. [Perbaikan Bug Terkini](#26-perbaikan-bug-terkini)
27. [Kondisi yang Sudah Diketahui](#27-kondisi-yang-sudah-diketahui)

28. [Alur Operasional dari Nelayan ke Pembeli](#28-alur-operasional-dari-nelayan-ke-pembeli)
29. [Pertimbangan Pengembangan Lanjutan](#29-pertimbangan-pengembangan-lanjutan)
30. [Rangkuman](#30-rangkuman)
31. [Troubleshooting Umum](#31-troubleshooting-umum)
32. [Tanya Jawab](#32-tanya-jawab)

---

# 1. Gambaran Umum

SeaGres adalah aplikasi web marketplace untuk hasil laut pesisir Gresik. Aplikasi mempertemukan dua kelompok pengguna, yaitu penjual (nelayan, pembudidaya, kelompok, koperasi, UMKM pengolah) dan pembeli (restoran, warung, pembeli lokal). Penjual bisa mencatat hasil tangkap atau panen hariannya ke dalam bentuk lot. Pembeli bisa melihat katalog, membuka detail lot, dan mengajukan pre-order.

Nama SeaGres adalah gabungan kata *Sea* (laut) dan *Gres* (singkatan Gresik). Jadi secara bahasa bisa dibaca "laut Gresik" atau "hasil laut Gresik".

Fokus utama SeaGres adalah pelacakan asal-usul produk. Setiap lot yang dicatat penjual mendapat nomor unik dan QR code. QR tersebut bisa di-scan oleh siapa saja untuk membuka halaman publik `/lot/[id]` yang menampilkan informasi lot tanpa perlu login. Pembeli yang memegang barang bisa dengan mudah membuktikan keasliannya.

SeaGres dibangun sebagai MVP (minimum viable product) dari gagasan PesisirHub dan iGres. Tahap awal memakai Supabase sebagai database terpusat dan Next.js sebagai framework frontend. Tujuannya adalah membuktikan alur dua peran (penjual dan pembeli) sebelum integrasi penuh ke sistem yang lebih besar.

---

# 2. Latar Belakang dan Masalah

Nelayan dan pembudidaya di pesisir Gresik umumnya menjual hasil tangkapan secara individu ke pasar tradisional atau pengepul. Beberapa masalah yang muncul dari pola ini:

Pertama, harga yang diterima nelayan tidak stabil. Mereka tidak punya referensi harga yang transparan dan sering menjadi price taker.

Kedua, mutu produk sulit dijaga karena tidak ada catatan tertulis. Pembeli tidak bisa memastikan kapan ikan ditangkap, dengan cara apa, dan oleh siapa.

Ketiga, pembeli lokal seperti restoran membutuhkan pasokan konsisten dengan mutu yang bisa dipertanggungjawabkan. Pembelian dari pengepul tanpa catatan membuat mereka sulit menelusuri asal-usul ketika ada masalah.

Keempat, kelompok nelayan dan pembudidaya yang sudah terverifikasi oleh penyuluh perikanan tidak punya kanal online untuk menunjukkan status mereka. Pembeli tidak bisa membedakan kelompok terverifikasi dengan penjual lepas.

SeaGres mencoba menjawab keempat masalah itu lewat pencatatan lot, verifikasi kelompok, pre-order, dan kartu QR.

---

# 3. Tujuan Aplikasi

Tujuan SeaGres yang ingin dicapai pada tahap MVP:

Mempermudah penjual (nelayan, pembudidaya, UMKM) untuk mencatat hasil tangkap atau panen harian dalam format yang konsisten dan terstruktur.

Mempermudah pembeli lokal memesan produk sebelum panen tiba lewat pre-order, sehingga petani punya kepastian permintaan.

Memberikan akses ke informasi lot secara publik lewat QR, sehingga pembeli bisa memverifikasi keaslian produk yang mereka terima.

Menyediakan papan harga informatif dari sumber lokal agar penjual dan pembeli punya referensi yang sama.

Menjadi basis data histori yang bisa dipakai untuk analisis produksi pesisir Gresik di masa depan.

SeaGres tidak bertujuan menjadi platform e-commerce besar di tahap awal. Fokusnya adalah alur dua peran dan kartu QR. Fitur seperti pembayaran online, ongkir otomatis, dan rating pembeli belum termasuk dalam MVP.

---

# 4. Pengguna dan Peran

SeaGres membedakan dua peran melalui field `account_type` di tabel `users`.

| Peran | Tanggung jawab | Akun demo |
| --- | --- | --- |
| Penjual (seller) | Mencatat lot baru, mengisi checklist mutu, menerima atau menolak pesanan, memantau pesanan masuk. | `rahmat@seagres.id` |
| Pembeli (buyer) | Menjelajahi katalog, mengajukan pre-order, memantau pesanan sendiri, melaporkan masalah. | `resto@seagres.id` |

Akun baru yang mendaftar lewat halaman `/` memilih salah satu peran. Setelah login, pengguna melihat halaman utama yang disesuaikan dengan perannya. Penjual mendapat tombol "Jual" di header dan panel "Pesanan masuk" dengan tombol Terima atau Tolak. Pembeli mendapat tombol "Pre-order saya" dan tombol "Cari lot segar".

Verifikasi profil (`users.verified`) dilakukan di luar aplikasi, misalnya oleh penyuluh perikanan. Akun yang belum terverifikasi tetap bisa masuk dan menggunakan fitur dasar. Status "Menunggu verifikasi pendamping" ditampilkan di panel profil. Akun terverifikasi menampilkan badge "Profil terverifikasi".

---

# 5. Stack Teknologi

Bagian ini menjelaskan teknologi yang dipakai SeaGres dan alasan pemilihannya.

## 5.1 Bahasa dan Runtime

Aplikasi seluruhnya ditulis dalam TypeScript 6. Tipe statis membantu mencegah bug ketika berurusan dengan kontrak Supabase yang bisa berbeda antara sisi klien dan server. Type check dijalankan dengan `tsc --noEmit` sebelum build.

Runtime yang dibutuhkan adalah Node.js 20.9 atau lebih baru. Package manager yang dipakai adalah npm. Skrip `dev`, `build`, `start`, dan `lint` didefinisikan di `package.json`.

## 5.2 Framework Frontend

SeaGres memakai Next.js versi 16.3.5 dengan App Router. Pendekatan App Router memungkinkan pemisahan jelas antara Server Components dan Client Components. Halaman yang butuh data dari database dirender di server, sedangkan interaksi seperti form dan modal dirender di klien.

Turbopack dipakai sebagai bundler. Build dev terasa lebih cepat karena Turbopack tidak menulis file cache ke disk. Untuk build produksi, Turbopack menghasilkan output yang lebih optimal.

React 19.3.0 dipakai sebagai library UI. SeaGres hanya menggunakan hooks standar seperti `useState`, `useEffect`, dan `useRouter`. Tidak ada state management tambahan seperti Redux.

Tailwind CSS 4 dipakai untuk utility styling. Konfigurasi tailwind ada di `postcss.config.mjs`. File `app/globals.css` berisi CSS variables untuk warna brand dan komponen style utama seperti header, kartu lot, dan modal.

## 5.3 Database dan Backend

Database SeaGres adalah PostgreSQL yang di-host lewat Supabase. Skema didefinisikan dalam file SQL di `supabase/migrations/`. Pembuatan tabel, fungsi RPC, dan seed data semuanya berbasis SQL murni, bukan ORM.

Supabase Storage dipakai untuk foto lot. Bucket `lot-photos` dibuat publik supaya URL foto bisa langsung dipakai di tag `<Image>` Next.js.

Library `@supabase/supabase-js` versi 2 dipakai sebagai klien. SeaGres hanya memakai klien di sisi server dengan service role key. Otorisasi tetap dilakukan manual di Server Actions, bukan lewat Row Level Security per-request. Pola ini diambil dari versi awal aplikasi yang sebelumnya memakai file JSON.

## 5.4 Library Pendukung

`lucide-react` versi 1.45 dipakai untuk ikon. Ikon dipakai di hampir semua header, tombol, badge, dan panel. Ikon utama aplikasi adalah `Waves` (ombak), `ShieldCheck`, `QrCode`, dan `ShoppingCart`.

`qrcode` versi 1.5 dipakai untuk membuat QR code lot dalam bentuk data URL. Library ini hanya dipanggil di sisi klien pada saat modal detail dibuka.

ESLint versi 9 dipakai untuk menjaga konsistensi kode. Preset `eslint-config-next` memastikan aturan yang direkomendasikan Next.js dipatuhi.

## 5.5 Font

Font utama adalah `Plus_Jakarta_Sans` dari Google Fonts, diambil lewat helper `next/font/google` di `app/layout.tsx`. Font ini menentukan variabel CSS `--font-jakarta` yang dipakai oleh body. Font ini mempunyai lima bobot dari 400 sampai 800.

---

# 6. Struktur Proyek

Berikut susunan direktori utama dan fungsi tiap bagian.

```
.
├── app/
│   ├── actions.ts              # Server Actions (login, register, lot, order, report)
│   ├── page.tsx                # Entry point: AuthScreen atau Storefront
│   ├── layout.tsx              # Root layout, font, metadata
│   ├── globals.css             # Design system dan CSS variables
│   ├── icon.png                # Favicon tab (Next.js otomatis serve)
│   ├── logo.png                # Logo utama
│   ├── components/
│   │   ├── auth-screen.tsx     # Halaman login dan registrasi
│   │   ├── storefront.tsx      # Halaman utama marketplace
│   │   ├── lot-preorder.tsx    # Form pre-order di halaman /lot/[id]
│   │   └── seagres-logo.tsx    # Komponen logo (memuat /public/logo.png)
│   └── lot/
│       └── [id]/page.tsx       # Halaman publik kartu lot (QR)
├── lib/
│   ├── supabase.ts             # Klien Supabase service role
│   ├── queries.ts              # Wrapper query ke Supabase
│   ├── rows.ts                 # Normalisasi tipe row ke model aplikasi
│   ├── types.ts                # Tipe dan interface domain
│   ├── crypto.ts               # Hash password dan perbandingan aman
│   └── session.ts              # Cookie session
├── supabase/
│   ├── config.toml             # Konfigurasi Supabase CLI
│   ├── migrations/             # Skema database versi-versi
│   │   ├── 20260914000000_init.sql
│   │   ├── 20260914000001_rpc.sql
│   │   └── 20260915000000_polis_features.sql
│   └── seed.sql                # Data awal (akun demo, lot contoh)
├── public/
│   ├── logo.png                # Logo untuk komponen SeagresLogo
│   ├── icon.png                # Cadangan favicon
│   ├── brand/seagres-hero.png  # Foto hero halaman login
│   ├── products/*.png          # Foto default tiap komoditas
│   └── coastal-boat.png
├── docs/                       # Dokumentasi
├── next.config.ts              # Konfigurasi Next.js
├── postcss.config.mjs          # PostCSS + Tailwind
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

---

# 7. Skema Database

Skema SeaGres tersimpan di `supabase/migrations/`. Ada tiga file SQL yang harus dijalankan berurutan, lalu `seed.sql` untuk data awal.

## 7.1 Tabel `users`

Menyimpan akun pengguna.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | text | Primary key, format `USR-xxx`. |
| `email` | text | Unik, dipakai untuk login. |
| `name` | text | Nama lengkap. |
| `initials` | text | Inisial untuk avatar. |
| `account_type` | text | `seller` atau `buyer`. Default `seller`. |
| `role` | text | Misal "Nelayan", "Pembudidaya", atau "Pembeli lokal". |
| `organization` | text | Nama kelompok, koperasi, usaha, atau resto. |
| `location` | text | Lokasi umum (kecamatan atau kota). |
| `verified` | boolean | Status verifikasi oleh pendamping. |
| `verification_basis` | text | Keterangan verifikasi. |
| `group_number` | text | Nomor kelompok atau pembeli. |
| `pw_salt` | text | Salt acak 16 byte per user. |
| `pw_hash` | text | Hasil scrypt dengan salt. |
| `token` | text | Token sesi, dipakai sebagai secret di cookie. |
| `created_at` | timestamptz | Waktu dibuat. |

## 7.2 Tabel `lots`

Mencatat satu hasil tangkap atau panen.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | text | Format `SGR-xxx`. |
| `name` | text | Nama produk, misal "Bandeng Segar". |
| `type` | text | Bandeng, Udang, Kerang, Olahan. |
| `price` | numeric | Harga per kg. |
| `coret` | numeric | Harga coret (sebelum diskon). Null jika tidak ada diskon. |
| `weight` | numeric | Stok tersedia dalam kg. |
| `seller` | text | Nama organisasi penjual, disalin dari `users.organization`. |
| `location` | text | Lokasi umum. |
| `time` | text | Waktu tangkap atau panen, format Indonesia. |
| `created_at` | timestamptz | Waktu pencatatan ke database. |
| `size` | text | Ukuran, misal "3–4 ekor/kg". |
| `image` | text | URL foto (lokal atau Supabase Storage). |
| `rating` | numeric | Rating awal, default 5. |
| `sold` | numeric | Akumulasi terjual. |
| `promo` | text | Label promo, misal "Bebas Ongkir". Null jika tidak ada. |
| `quality` | jsonb | Checklist mutu (cleanHandling, packaging, temperature, dispatch). |

## 7.3 Tabel `orders`

Pre-order yang diajukan pembeli.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | text | Format `PO-xxx`. |
| `lot_id` | text | Foreign key ke `lots.id`. |
| `buyer_user_id` | text | Foreign key ke `users.id`. |
| `buyer` | text | Nama pembeli (snapshot). |
| `quantity` | numeric | Jumlah kg yang dipesan. |
| `status` | text | `Baru`, `Diterima`, atau `Ditolak`. |
| `created_at` | timestamptz | Waktu dibuat. |

## 7.4 Tabel `prices`

Harga informatif dari sumber mitra lokal. Dipakai oleh panel "Harga pesisir" di halaman utama.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `name` | text | Primary key, misal "Bandeng". |
| `price` | numeric | Harga per kg. |
| `source` | text | Sumber harga, misal "Pasar Sidayu". |
| `image` | text | URL gambar kecil untuk kartu. |

## 7.5 Tabel `reports`

Laporan masalah dari pengguna.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | text | Format `RPT-xxx`. |
| `reporter_user_id` | text | Foreign key ke `users.id`. |
| `reporter` | text | Nama pelapor (snapshot). |
| `lot_id` | text | Foreign key ke `lots.id`, boleh null jika tidak terkait lot. |
| `category` | text | Jenis masalah. |
| `description` | text | Minimal 10 karakter (dicek oleh CHECK constraint). |
| `status` | text | `Baru`, `Ditinjau`, atau `Selesai`. |
| `created_at` | timestamptz | Waktu dibuat. |

## 7.6 View `order_views`

View SQL yang menggabungkan `orders` dengan `lots` untuk mendapatkan nama produk dan nama penjual secara otomatis. View ini dipakai oleh `listOrderViews()` di `lib/queries.ts` agar kode aplikasi tidak perlu join manual.

```sql
create or replace view public.order_views as
select o.id, o.lot_id, o.buyer_user_id, o.buyer, o.quantity, o.status, o.created_at,
       coalesce(l.name, '(lot dihapus)') as product,
       coalesce(l.seller, '(tidak diketahui)')          as seller
from public.orders o
left join public.lots l on l.id = o.lot_id;
```

Jika lot terkait sudah dihapus, view ini tetap mengembalikan baris order dengan `product` "(lot dihapus)" dan `seller` "(tidak diketahui)". Pola ini mencegah pesanan hilang saat referensi lot putus.

## 7.7 Fungsi RPC

Ada dua fungsi PostgreSQL yang dipakai oleh SeaGres.

`reserve_lot_weight(p_lot_id, p_qty)` adalah fungsi plpgsql yang memotong stok lot dalam satu statement `UPDATE`. Klausa `where id = p_lot_id and weight >= p_qty` mengembalikan baris hanya jika stok cukup. Row lock dari Postgres mencegah dua transaksi konkuren memotong stok yang sama.

`apply_accept_effects(p_order_id)` adalah fungsi yang dipanggil sekali saat penjual menerima pesanan. Fungsi ini mengurangi `weight` lot dan menambah `sold` sekaligus. Pemanggilan fungsi ini hanya terjadi jika status lama bukan `Diterima`, sehingga transisi diterima dua kali tidak menggandakan efek.

## 7.8 Storage Bucket

Bucket `lot-photos` di Supabase Storage dipakai untuk foto lot. Bucket dibuat publik supaya URL foto bisa langsung dipakai di tag `<Image>`. Definisi bucket ada di `supabase/migrations/20260914000001_rpc.sql` dengan `on conflict do nothing` agar rerun migrasi tidak error.

---

# 8. Row Level Security

Secara default Supabase mengaktifkan Row Level Security (RLS) pada tabel baru. SeaGres menonaktifkan RLS untuk tabel inti (users, lots, orders, prices) karena akses selalu melalui service role key di Server Action dengan otorisasi manual. Pendekatan ini membuat logika akses lebih mudah di-debug.

Untuk tabel `reports`, RLS tetap aktif. Ada dua policy:

`reports_insert` mengizinkan insert untuk semua role (`anon` dan `authenticated`). Policy ini memakai `with check (true)` karena Server Action sudah memvalidasi input dan pemanggil sebelum insert.

`reports_select` mengizinkan select untuk semua role. Hal ini memudahkan pengembangan dashboard pendamping di kemudian hari.

Definisi policy ada di `supabase/migrations/20260915000000_polis_features.sql`.

---

# 9. Alur Autentikasi

SeaGres memakai cookie sesi sederhana, bukan JWT atau library auth pihak ketiga. Tujuannya agar alur autentikasi mudah diaudit dan tidak bergantung pada banyak dependensi.

## 9.1 Registrasi

Pengguna baru membuka `/` dan memilih tab "Daftar". Form registrasi dua langkah:

Langkah pertama, pilih peran (Penjual atau Pembeli) lalu isi nama, organisasi atau nama usaha, dan lokasi. Untuk pembeli, label kolom organisasi adalah "Nama usaha / tempat usaha". Untuk penjual, labelnya adalah "Kelompok / koperasi / usaha".

Langkah kedua, isi email, password, dan role spesifik. Untuk penjual, role spesifik adalah "Nelayan", "Pembudidaya", atau "UMKM Olahan". Untuk pembeli, role otomatis "Pembeli lokal".

`register()` di `app/actions.ts` menerima data ini, memvalidasi, lalu:

1. Memotong spasi di nama, email, dan organization.
2. Generate salt dan hash password dengan `scryptSync`.
3. Membuat record user dengan id baru (`newId("USR")`), account_type, dan field default lain.
4. Insert ke tabel `users`.
5. Memanggil `startSession()` untuk membuat cookie.

## 9.2 Login

Pengguna memasukkan email dan password pada form login. `login()` melakukan:

1. Cari user berdasarkan email dengan `findUserByEmail`.
2. Cek hash dengan `checkPassword` (scrypt + safeEqual).
3. Jika cocok, panggil `startSession()` untuk set cookie.

Jika email tidak ditemukan atau hash tidak cocok, kembalikan error "Email atau kata sandi salah".

## 9.3 Cookie Sesi

Cookie bernama `sgres_session` dengan format `<userId>.<token>`. Token diambil dari kolom `users.token`. Saat login pertama kali, jika kolom `token` masih kosong, aplikasi membuat token acak 16 byte (`crypto.randomBytes(16).toString("hex")`) dan menyimpannya lewat `setUserToken`.

Cookie diset dengan atribut `httpOnly` (tidak bisa diakses JavaScript), `sameSite=lax` (tidak ikut cross-site POST), `secure` (HTTPS-only di production), `path=/`, dan `maxAge` 30 hari.

## 9.4 Validasi Cookie

Validasi dilakukan di `currentUser()` setiap kali ada Server Component yang butuh user. Alurnya:

1. Ambil cookie dari request.
2. Pisahkan `userId` dan `secret` berdasarkan titik.
3. Muat user dari database lewat `findUserById`.
4. Bandingkan `user.token` dengan `secret` lewat `safeEqual` (pembanding constant-time).
5. Jika salah satu langkah gagal, kembalikan `null`.

Pembanding `safeEqual` penting untuk mencegah timing attack. Tanpa constant-time compare, penyerang bisa menebak token byte demi byte berdasarkan perbedaan waktu respons server.

## 9.5 Logout

`logout()` memanggil `endSession()` yang menghapus cookie lewat `cookies().delete(COOKIE)`. Token di database tidak dihapus sehingga login berikutnya bisa memakai token yang sama. Pendekatan ini menyederhanakan validasi dan memungkinkan sesi dipulihkan dalam 30 hari.

## 9.6 Halaman Setelah Login

`app/page.tsx` adalah Server Component dengan `export const dynamic = "force-dynamic"`. Pada setiap request, halaman memanggil `currentUser()`. Jika tidak ada user, render `<AuthScreen />`. Jika ada, muat lot, orders, dan prices lewat `Promise.all([listLots(), listOrderViews(), listPrices()])`, lalu render `<Storefront />` dengan data tersebut.

---

# 10. Server Actions

Server Actions adalah fungsi yang ditandai `"use server"` di `app/actions.ts`. Fungsi-fungsi ini dipanggil dari komponen klien lewat RPC, tetapi berjalan di server dengan akses penuh ke Supabase dan Node.js API.

Daftar action yang tersedia:

| Action | Tujuan | Akses |
| --- | --- | --- |
| `login(email, password)` | Masuk ke aplikasi. | Publik. |
| `register(input)` | Daftar akun baru. | Publik. |
| `logout()` | Hapus cookie sesi. | Publik. |
| `createLot(formData)` | Catat lot baru oleh penjual. | Penjual. |
| `preorder(lotId, quantity)` | Buat pre-order baru. | Pembeli. |
| `setOrderStatus(orderId, status)` | Terima atau tolak pesanan. | Penjual yang memiliki lot. |
| `reportIssue(formData)` | Kirim laporan masalah. | Pengguna login. |

## 10.1 Validasi dan Otorisasi

Setiap action yang memodifikasi data melakukan validasi input dan otorisasi pemanggil sebelum menyentuh database.

`createLot` menolak user yang tidak login atau akun pembeli (`accountType !== "seller"`).

`preorder` hanya menerima akun pembeli. Lot harus ada di database dan stok harus lebih dari 0. Jumlah pesanan dipotong minimal 1 dan maksimal sesuai stok lot.

`setOrderStatus` mencocokkan nama organisasi penjual dengan field `seller` pada lot. Pencocokan dilakukan dengan `trim()` dan `toLocaleLowerCase("id-ID")` agar toleran terhadap spasi atau perbedaan kapital. Perbaikan ini menambahkan konsistensi antara UI dan server: tombol Terima/Tolak di UI hanya muncul untuk order yang lolos pencocokan, dan server hanya menerima perubahan untuk order yang lolos pencocokan yang sama.

`reportIssue` hanya butuh login, tidak membedakan peran. Kategori tidak boleh kosong dan deskripsi minimal 10 karakter.

## 10.2 Format Respons

Action mengembalikan objek dengan bentuk `{ error?, ok?, ...payload }`. Komponen klien mengecek `error` lebih dulu. Jika ada, tampilkan toast atau pesan inline. Jika tidak, gunakan payload untuk memperbarui state.

Contoh payload:

- `preorder` mengembalikan `{ ok, order, orders }`. Komponen `Storefront` menerima `orders` terbaru dan menggantinya di state.
- `setOrderStatus` mengembalikan `{ ok, orders, lots }` agar state keduanya sinkron setelah konfirmasi.
- `createLot` mengembalikan `{ ok, lot, lots }` agar state lot di-refresh.

## 10.3 Revalidation

Setelah mutasi, `revalidatePath("/")` atau `revalidatePath("/lot/[id]")` dipanggil agar Server Components pada route tersebut dirender ulang dengan data terbaru. Pola ini memanfaatkan fitur Next.js untuk invalidasi cache Server Component tanpa harus menulis ulang seluruh halaman.

## 10.4 Limit Upload Foto

`next.config.ts` mengatur `experimental.serverActions.bodySizeLimit` ke 5 MB. Limit default 1 MB akan gagal diam-diam saat `createLot` mengunggah foto yang lebih besar. Limit 5 MB cukup untuk foto 4 MB yang divalidasi oleh action plus overhead FormData.

---

# 11. Halaman dan Komponen

## 11.1 `app/layout.tsx`

Root layout yang membungkus semua halaman. Memuat font `Plus_Jakarta_Sans`, metadata title dan description, favicon (`app/icon.png`), dan stylesheet `globals.css`. Next.js otomatis mendeteksi file `app/icon.png` dan menjadikannya favicon tanpa konfigurasi tambahan.

## 11.2 `app/page.tsx`

Server Component entry point. Memilih render `AuthScreen` atau `Storefront` berdasarkan ada tidaknya sesi. Karena `dynamic = "force-dynamic"`, halaman selalu dirender ulang pada setiap request, sehingga sesi terbaru langsung terbaca.

## 11.3 `app/components/auth-screen.tsx`

Halaman login dan registrasi. Komponen klien dengan state lokal untuk mode (login atau register), step form, dan akun tipe yang dipilih.

Fitur utama:

- Form login dengan email dan password, plus tombol "lihat password" (toggle `showPass`).
- Form register dua langkah: pilih peran dan identitas, lalu email dan password.
- Dua tombol demo untuk login cepat dengan akun `rahmat@seagres.id` (penjual) dan `resto@seagres.id` (pembeli). Tombol ini berguna untuk presentasi tanpa harus mengetik kredensial.
- Brand panel di sisi kiri (desktop) dengan foto hero, logo SeaGres, dan tagline "Pasar hasil pesisir Gresik, dimulai dari sini."
- Pada tampilan mobile, brand panel disembunyikan dan brand ringkas muncul di atas card login.

## 11.4 `app/components/storefront.tsx`

Halaman utama setelah login. Komponen klien besar yang mengelola:

- State katalog (lots), state pesanan (orders), filter, sort, query pencarian.
- Modal untuk buat lot, detail lot, profil, daftar pesanan, dan laporan masalah.
- QR code untuk lot yang sedang dibuka.
- Toast notifikasi untuk umpan balik aksi.

Karena komponen ini panjang, dipecah menjadi sub-komponen: `TopHeader`, `HeroSlider`, `FlashSale`, `SupplyPlan`, `OperationsPanel`, `ProfilePanel`, `OrdersPanel`, `LotDetail`, `ReportIssueForm`, `CreateLotForm`, `ProductCard`, dan `CategoryIcon`.

## 11.5 `app/components/lot-preorder.tsx`

Form pre-order yang dipakai di halaman publik `/lot/[id]`. Komponen klien yang menampilkan:

- Form jumlah dan tombol "Ajukan pre-order" jika user login dan akun pembeli.
- Link "Masuk" jika user belum login.
- Pesan informatif jika user adalah penjual, supaya tidak ada upaya pre-order yang akan ditolak server.

Perbaikan terbaru: tombol pre-order disembunyikan untuk akun penjual setelah ditemukan bahwa penjual yang login dari QR mendapat tombol yang akan ditolak server. Sekarang penjual melihat pesan "Akun penjual dapat memantau lot ini. Pre-order dilakukan dari akun pembeli."

## 11.6 `app/components/seagres-logo.tsx`

Komponen logo SeaGres. Memuat gambar `public/logo.png` lewat `next/image` dengan lebar adaptif sesuai prop `size`. Opsi `showText` tersedia untuk menampilkan wordmark, namun non-aktif secara default karena logo PNG sudah memuat wordmark lengkap dengan penulisan "SeaGres" yang benar (S dan G besar).

## 11.7 `app/lot/[id]/page.tsx`

Halaman publik kartu lot. Dipakai saat QR pada lot di-scan. Server Component yang memuat lot dari Supabase, lalu menampilkan header, foto, informasi lot, checklist mutu, timeline penelusuran, dan komponen `LotPreorder`. Karena tidak butuh login, halaman ini adalah cara paling jujur untuk memperlihatkan informasi lot ke publik.

---

# 12. Katalog dan Filter

Katalog adalah grid kartu produk di halaman utama. Setiap kartu menampilkan foto, nama, harga, harga coret (jika ada), rating, lokasi, dan label promo.

## 12.1 Sumber Data

Saat `Storefront` pertama kali dirender, `listLots()` dipanggil lewat Server Component `app/page.tsx`. Hasilnya menjadi `initialLots` dan disimpan di state komponen.

Saat pengguna membuat lot baru, `createLot()` mengembalikan `lots` terbaru yang kemudian di-`setLots()`.

Saat konfirmasi pesanan, `setOrderStatus` mengembalikan `{ lots }` agar stok dan jumlah terjual selalu sinkron dengan perubahan di server.

## 12.2 Filter

Filter dilakukan di sisi klien dengan membandingkan `lot.type` dengan filter aktif. Tidak ada round-trip ke server saat filter berubah, sehingga UI terasa cepat.

Ada empat filter utama: Bandeng, Udang, Kerang, Olahan. Serta filter "Semua" untuk menampilkan semua lot. Ada juga tombol khusus "Jual" yang hanya muncul untuk akun penjual untuk membuka modal pencatatan lot baru.

## 12.3 Sort

Tiga opsi pengurutan: Terbaru (urutan dari server, default `created_at desc`), Harga terendah (`price asc`), dan Terlaris (`sold desc`). Sort juga dilakukan di klien dengan membuat array baru dan memanggil `Array.sort`.

## 12.4 Pencarian

Pencarian memakai substring case-insensitive terhadap `lot.name`, `lot.seller`, dan `lot.location`. Locale `id-ID` dipakai agar karakter Indonesia (misal huruf dengan aksen) ditangani dengan benar. Saat pengguna mengetik di kotak pencarian, state `query` di-update dan grid di-filter ulang secara otomatis.

## 12.5 Paginasi

Tombol "Muat lebih banyak" menambah `visibleLots` sebanyak `LOTS_PER_PAGE` (6). Pendekatan ini dipakai agar tidak ada library pagination tambahan dan supaya server tidak mengirim semua data sekaligus. Saat jumlah lot yang difilter lebih kecil dari `visibleLots`, tombol disembunyikan.

## 12.6 Flash Sale

Komponen `FlashSale` menampilkan lot dengan `coret` (harga coret) dalam bentuk rail horizontal dengan badge diskon. Ada countdown menuju jam 18:00 sebagai penanda berakhirnya promo harian.

Countdown dihitung dengan `useFlashCountdown` hook. Untuk menghindari hydration mismatch antara server dan klien, state dimulai dari 0 di server, lalu dihitung ulang di klien lewat `setTimeout(0)` setelah mount. Pendekatan ini memastikan UI stabil dulu, lalu timer mulai berjalan.

## 12.7 Aggregate Stats

Kartu ringkasan di pojok kanan atas halaman utama menampilkan tiga angka:

- Total berat tersedia (jumlah `weight` seluruh lot).
- Jumlah pesanan (jumlah pesanan yang relevan dengan akun saat ini, lihat Bagian 15).
- Jumlah kelompok aktif (unik `seller` yang lot-nya masih aktif dan waktu tangkap masih "Hari ini").

---

# 13. Pencatatan Lot

Penjual membuka modal "Jual hasil panen" dari tombol "Jual" di header atau dari kartu kategori. Form yang ditampilkan:

- Nama produk
- Komoditas (select: Bandeng, Udang, Kerang, Olahan)
- Berat tersedia (kg)
- Harga per kg
- Ukuran (misal "3–4 ekor/kg")
- Waktu tangkap atau panen (datetime-local)
- Lokasi umum
- Checklist mutu: penanganan bersih (checkbox), kemasan (select), suhu simpan (text, opsional), rencana pengiriman (text)
- Foto hasil (opsional, maks 4 MB, format PNG/JPG/WebP/GIF)

Saat form disubmit, `createLot()` di server action melakukan hal berikut:

1. Validasi user adalah penjual dan tidak null.
2. Validasi input (nama, ukuran, lokasi, harga, berat tidak boleh kosong atau invalid).
3. Validasi harga minimal Rp 1.000 dan berat minimal 1 kg.
4. Jika ada foto, validasi tipe MIME dan ukuran, lalu unggah ke bucket `lot-photos` di Supabase Storage.
5. Buat objek `Lot` dengan field default (rating 5, sold 0, promo "Baru dicatat", time hasil panen, dsb).
6. Insert ke tabel `lots`.
7. Revalidate path `/` dan `/lot/[id]`.

## 13.1 Nomor Lot

Nomor lot dihasilkan dengan `newId("SGR")` yang menggabungkan timestamp base36 dan 4 karakter hex acak. Contoh: `SGR-LWXK3A1B`. Format ini kompatibel dengan lot pada versi sebelumnya yang masih menggunakan file JSON.

## 13.2 Upload Foto

Foto diunggah ke bucket `lot-photos` dengan path `lots/<timestamp>-<random>.<ext>`. Setelah upload berhasil, aplikasi mengambil URL publik lewat `getPublicUrl()` dan menyimpannya di field `image`. Pola ini memastikan foto lot selalu bisa diakses tanpa URL kadaluarsa.

## 13.3 Validasi Server

Harga minimal Rp 1.000 dan berat minimal 1 kg. Ukuran, nama, dan lokasi tidak boleh kosong. Format foto harus salah satu dari PNG, JPG, WebP, atau GIF dengan ukuran maksimum 4 MB. Validasi tambahan dilakukan lewat atribut HTML di form (required, min, max, accept) untuk UX yang lebih baik.

## 13.4 Default Image

Jika penjual tidak mengunggah foto, aplikasi memakai gambar default berdasarkan komoditas. Pemetaan default ada di `app/actions.ts`:

| Komoditas | Gambar default |
| --- | --- |
| Bandeng | `/products/bandeng.png` |
| Udang | `/products/udang-vaname.png` |
| Kerang | `/products/kerang-hijau.png` |
| Olahan | `/products/bandeng-tanpa-duri.png` |

## 13.5 Fallback In-Memory

`Storefront` memiliki fallback in-memory yang membuat lot lokal jika server action tidak bisa diakses. Fallback ini berguna untuk presentasi offline dan tidak menggantikan server. Saat mode fallback aktif, aplikasi tetap bisa menunjukkan alur "Jual" walau Supabase tidak tersedia.

---

# 14. Pre-Order

Pre-order adalah cara pembeli memesan lot sebelum panen tiba. Alurnya:

1. Pembeli membuka katalog, memilih lot, lalu menekan tombol "Lihat detail" atau langsung tombol "+ Keranjang" di kartu.
2. Modal detail lot terbuka, menampilkan foto, informasi mutu, dan form jumlah.
3. Pembeli memasukkan jumlah kg, lalu submit.
4. Server action `preorder(lotId, quantity)` melakukan hal berikut:
   - Validasi user adalah pembeli.
   - Validasi lot ada dan stok lebih dari 0.
   - Memanggil RPC `reserve_lot_weight` untuk mengurangi stok secara atomik.
   - Insert ke tabel `orders` dengan status "Baru".
   - Revalidate path.

## 14.1 Race Condition

RPC `reserve_lot_weight` memakai klausa `where weight >= p_qty` dalam satu statement `UPDATE`. Mekanisme ini menjamin bahwa jika dua pembeli memesan lot yang hampir habis pada saat bersamaan, hanya satu yang mendapat stok dan yang lain mendapat pesan "Stok lot ini sudah habis".

Cara kerjanya: Postgres mengunci baris lot selama update. Jika transaksi lain mencoba update baris yang sama, transaksi tersebut menunggu. Setelah transaksi pertama selesai, transaksi kedua melihat nilai `weight` yang sudah dikurangi. Jika hasilnya negatif, klausa `where` tidak mengembalikan baris dan `found` false, sehingga fungsi mengembalikan boolean false.

## 14.2 Tampilan Setelah Submit

Setelah berhasil, `Storefront` menerima `orders` terbaru dari server dan menampilkan toast "Pre-order X kg tercatat dan dikirim ke {penjual}". Daftar pesanan di modal diperbarui secara langsung. Stok lot di katalog juga berkurang karena `lots` dikembalikan oleh server.

## 14.3 Validasi Tambahan

- Jumlah minimum 1 kg, maksimum sesuai stok lot yang tersedia.
- User yang login sebagai penjual tidak bisa pre-order (aksi akan ditolak server dengan pesan "Akun penjual tidak bisa mengajukan pre-order ke lot sendiri").
- Lot dengan `weight <= 0` tidak menampilkan tombol pre-order di UI.

## 14.4 Fallback In-Memory

Sama seperti `createLot`, `preorder` di `Storefront` memiliki fallback in-memory yang membuat order lokal jika server action tidak bisa diakses. Fallback ini memakai `Date.now()` sebagai basis id dan menurunkan stok lot di state lokal.

---

# 15. Manajemen Pesanan

Penjual yang login membuka modal "Pesanan masuk" dari header. Modal ini menampilkan pre-order yang ditujukan ke kelompoknya. Pembeli yang login membuka modal "Pre-order saya" dengan judul berbeda dan melihat pesanan yang mereka buat sendiri.

## 15.1 Filter Pesanan per Akun

Pesanan ditampilkan dengan filter yang berbeda sesuai peran.

Untuk penjual, pesanan yang tampil adalah order dengan `order.seller` yang cocok dengan `user.organization`. Pencocokan dilakukan dengan `trim()` dan `toLocaleLowerCase("id-ID")` agar tetap benar walaupun nama organisasi punya spasi atau perbedaan kapital. Pola ini mencegah tombol Terima/Tolak hilang hanya karena input form registrasi tidak rapi.

Untuk pembeli, pesanan yang tampil adalah order dengan `buyerUserId === user.id`. Jadi pembeli hanya melihat pesanannya sendiri, bukan pesanan orang lain ke kelompok yang sama.

## 15.2 Counter Pesanan

Counter di header (badge keranjang), summary card "pesanan", judul modal, dan indikator bottom-nav menggunakan `filteredOrderCount`, bukan total pesanan keseluruhan. Variabel ini dihitung di `Storefront` dengan filter yang sama dengan `OrdersPanel`. Hasilnya counter konsisten dengan isi modal.

## 15.3 Status Pesanan

Status pesanan mengikuti state berikut.

`Baru` artinya pesanan baru, menunggu konfirmasi penjual. Tombol Terima dan Tolak muncul di kartu order.

`Diterima` artinya penjual menerima. Stok lot otomatis berkurang dan `sold` bertambah melalui RPC `apply_accept_effects`. Efek ini hanya terjadi satu kali karena ada guard transisi.

`Ditolak` artinya penjual menolak. Pesanan tetap ada di daftar pembeli sebagai arsip, dengan label status "Ditolak".

## 15.4 Aksi Terima dan Tolak

`setOrderStatus(orderId, status)` melakukan hal berikut:

1. Validasi user adalah penjual (`accountType === "seller"`).
2. Validasi status adalah `Diterima`, `Ditolak`, atau `Baru` (transisi mundur diperbolehkan).
3. Validasi lot terkait dimiliki penjual dengan pencocokan `trim().toLocaleLowerCase()`.
4. Update status di database lewat `updateOrderStatus`.
5. Jika status baru adalah `Diterima` dan status lama bukan `Diterima`, panggil `apply_accept_effects` untuk sinkronisasi stok.
6. Revalidate path.

Tombol Terima dan Tolak disable saat sedang busy untuk mencegah klik ganda. Saat server mengembalikan error, toast merah muncul dengan pesan dari server.

## 15.5 Agregat Permintaan

Di atas daftar pesanan ada blok "Ringkasan permintaan" yang menjumlahkan kuantitas per produk untuk pesanan yang statusnya bukan "Ditolak". Agregat ini membantu penjual melihat total permintaan per komoditas tanpa harus membaca setiap kartu.

---

# 16. Kartu Lot Publik dan QR

Halaman `/lot/[id]` adalah halaman yang dibuka saat QR pada lot di-scan. Karena tidak butuh login, halaman ini adalah media paling jujur untuk memperlihatkan informasi lot ke publik.

## 16.1 Konten

- Header dengan brand SeaGres dan label "Kartu lot & penelusuran".
- Foto utama (full-width pada mobile, proporsional pada desktop).
- Label verifikasi, nama produk, dan harga.
- Blok penjual dengan nama organisasi dan lokasi umum.
- Timeline penelusuran yang terdiri dari empat langkah: waktu tangkap, pencatatan lot, verifikasi kelompok, dan status penjualan.
- Form pre-order (jika stok masih ada dan user login sebagai pembeli).
- Catatan kaki tentang keterbukaan data lokasi.

## 16.2 QR Code

QR code dibuat oleh komponen `openLot` di `Storefront` saat modal detail dibuka. Library `qrcode` menghasilkan data URL PNG 220x220 px dengan warna gelap `#1e5aa8` dan latar putih. URL target adalah `${origin}/lot/${lot.id}`.

QR code hanya ditampilkan untuk pengguna yang login. Pengguna yang scan QR biasanya adalah pembeli yang memegang produk di tangan dan ingin memverifikasi keasliannya.

## 16.3 SEO Metadata

`generateMetadata` di `app/lot/[id]/page.tsx` membuat title dan description dinamis berdasarkan data lot. Title menjadi `"<nama> - Kartu Lot <id> - SeaGres"` dan description menyebutkan nama, penjual, dan lokasi. Pola ini membantu saat link dibagikan di media sosial.

---

# 17. Laporan Masalah

Pengguna login bisa mengirim laporan masalah dari tombol lonceng di header. Modal laporan berisi:

- Kategori (Mutu produk, Keterlambatan pengambilan, Lot tidak sesuai, Masalah lain).
- Deskripsi minimal 10 karakter.
- ID lot terkait (otomatis terisi jika dibuka dari detail lot).

Server action `reportIssue()` menyimpan laporan ke tabel `reports` dengan status awal `Baru`. Setelah submit, pengguna mendapat toast "Laporan diterima. Pendamping akan menindaklanjuti melalui SeaGres."

## 17.1 Akses Laporan

Untuk MVP, hanya pelapor dan pendamping yang bisa membaca laporan. `listReports(limit)` dipakai untuk menampilkan 50 laporan terakhir, biasanya di dashboard pendamping (luar cakupan MVP).

## 17.2 Validasi

Panjang deskripsi minimal 10 karakter dicek baik di klien (atribut `minLength={10}`) maupun server. Kolom `category` tidak boleh kosong. CHECK constraint di level database juga menjamin panjang deskripsi.

---

# 18. Papan Harga

Papan "Harga pesisir" menampilkan harga informatif dari beberapa komoditas seperti Bandeng, Udang Vaname, dan Kerang Hijau. Sumber harga adalah pasar lokal, TPI, atau koperasi yang menjadi mitra.

Harga disimpan di tabel `prices` dengan field nama, harga, sumber, dan URL gambar kecil. Harga diformat dengan `Intl.NumberFormat("id-ID")` agar muncul dengan pemisah ribuan yang sesuai untuk pembaca Indonesia.

Klik salah satu baris akan otomatis mengisi kolom pencarian dengan nama komoditas, sehingga pengguna langsung diarahkan ke katalog dengan filter komoditas tersebut. Pola ini menyederhanakan alur dari papan harga ke detail lot.

Tanggal "13 Sep 2026" ditampilkan sebagai tanggal referensi informasi harga. Sumber asli harga disimpan di database dan ditampilkan di bawah nama produk pada setiap baris.

---

# 19. Antarmuka dan Responsivitas

SeaGres menggunakan pola layout yang konsisten untuk desktop dan mobile.

## 19.1 Top Header

Header utama berisi brand, kolom pencarian, tombol keranjang (dengan badge counter), tombol lonceng (laporan masalah), pill peran, tombol jual (untuk penjual), dan avatar profil. Pada tampilan mobile, kolom pencarian pindah ke baris kedua agar tidak memotong ikon kanan.

## 19.2 Hero Slider

Hero di atas halaman utama berisi slider tiga slide dengan foto produk, tagline, dan tombol "Belanja sekarang". Slider otomatis berpindah setiap 5 detik dan bisa diganti manual lewat dot indicator.

## 19.3 Bottom Nav

Navigasi bawah khusus mobile berisi lima tombol: Home, Katalog, Harga (untuk pembeli) atau Jual (untuk penjual), Pesanan, dan Akun. Indikator dot pada tombol Pesanan muncul saat `filteredOrderCount > 0`.

## 19.4 Modal

Empat modal utama: buat lot, detail lot, profil, dan pesanan. Modal menutup saat backdrop di-klik. Modal scrollable untuk konten panjang seperti form buat lot.

## 19.5 Toast

Toast muncul di bawah header selama 2.8 detik dengan pesan konfirmasi atau error. Toast error berwarna merah, toast sukses berwarna brand.

## 19.6 Style

Stylesheet utama `app/globals.css` mengatur CSS variables untuk warna brand (primary deep blue, primary bright, primary soft, action blue, action blue dark, accent orange, ink, muted, line, surface, surface soft). Variabel-variabel ini dipakai konsisten di seluruh komponen.

Breakpoint responsif mengikuti standar mobile-first dengan `@media (min-width: 880px)` dan `@media (min-width: 1100px)`. Hero side panel disembunyikan di bawah 1100 px.

---

# 20. Logo dan Identitas

Logo SeaGres disimpan di dua tempat.

`public/logo.png` adalah sumber statis yang dimuat oleh komponen `SeagresLogo`. Logo ini memuat wordmark "SeaGres" lengkap dengan huruf S dan G besar, di samping mark tetes air dan ikan stilasi.

`app/icon.png` adalah favicon yang otomatis disajikan oleh Next.js App Router pada tab browser. Ukurannya sama dengan logo utama.

`app/layout.tsx` mendeklarasikan metadata `icons: { icon: "/icon.png" }` sebagai fallback eksplisit, walaupun Next.js sudah otomatis mendeteksi file di `app/icon.png`.

Komponen `SeagresLogo` memakai `next/image` dengan `unoptimized` karena file di `public/` sudah final dan tidak butuh optimisasi runtime. Ukuran adaptif mengikuti prop `size` dengan rasio 2.6 (lebih lebar) saat `showText` true dan 1 saat `showText` false.

---

# 21. Pengaturan Lingkungan

SeaGres membutuhkan beberapa variabel lingkungan agar bisa berjalan. Salin `.env.example` ke `.env.local` lalu isi nilai-nilai berikut:

`SUPABASE_URL` adalah URL proyek Supabase. Bentuknya `https://<project-ref>.supabase.co`.

`SUPABASE_ANON_KEY` adalah kunci anon publik. Tidak dipakai langsung oleh SeaGres karena klien Supabase selalu memakai service role, tapi tetap dideklarasikan untuk konsistensi dengan template Supabase.

`SUPABASE_SERVICE_ROLE_KEY` adalah kunci service role yang hanya dipakai di sisi server. Kunci ini memberikan akses penuh ke database, jadi tidak boleh bocor ke klien. SeaGres memakai kunci ini di `lib/supabase.ts`.

Tanpa variabel ini, `lib/supabase.ts` akan melempar error pada waktu request. Build aplikasi sendiri tidak gagal, tetapi setiap route yang memanggil Supabase akan error pada runtime.

File `.env.local` dan `.env*.local` masuk ke `.gitignore` sehingga tidak ikut ter-commit.

---

# 22. Build, Lint, dan Type Check

Tiga perintah utama untuk menjaga kualitas kode:

`npm run lint` menjalankan ESLint dengan preset Next.js. Aturan yang ditegakkan antara lain: tidak ada `any` implisit, tidak ada variabel tidak terpakai, dan tidak ada hook dengan dependency yang salah.

`npx tsc --noEmit` melakukan type check tanpa menghasilkan output. Perintah ini memastikan kontrak tipe konsisten. TypeScript 6 dipakai karena mendukung fitur terbaru untuk narrowing dan type inference.

`npm run build` menjalankan build produksi lengkap dengan Turbopack. Build ini juga menjalankan TypeScript check dan page generation.

---

# 23. Urutan Migrasi dan Seed

Penerapan migrasi dan seed harus berurutan. File migrasi diberi nama dengan prefiks timestamp agar Supabase CLI bisa mendeteksi urutan. SeaGres memakai tiga migrasi dan satu seed.

Migrasi pertama, `20260914000000_init.sql`, membuat tabel `users`, `prices`, `lots`, dan `orders`. Ia juga membuat index pada kolom `lot_id`, `buyer_user_id`, dan `created_at` untuk mempercepat query yang sering dipakai. View `order_views` juga dibuat di sini.

Migrasi kedua, `20260914000001_rpc.sql`, membuat fungsi RPC `reserve_lot_weight` dan `apply_accept_effects`, lalu membuat bucket storage `lot-photos`. Fungsi RPC adalah inti dari mekanisme race-condition-safe pada stok lot.

Migrasi ketiga, `20260915000000_polis_features.sql`, menambahkan kolom `account_type` ke `users` dengan default `seller`. Migrasi ini juga membuat tabel `reports` dengan policy insert dan select yang terbuka. Yang terakhir, ia men-seed akun demo pembeli `USR-DEMO-BUYER` dengan salt dan hash deterministik, dan memperbaiki order lama yang salah reference ke `USR-DEMO` agar menunjuk ke `USR-DEMO-BUYER`.

Seed `supabase/seed.sql` menambahkan akun `USR-DEMO`, akun `USR-DEMO-BUYER` (idempotent, fallback jika migrasi polis_features belum dijalankan), tiga harga, sembilan lot contoh, dan dua order contoh. Seed ini bergantung pada akun `USR-DEMO-BUYER` yang dibuat oleh migrasi polis_features. Jika migrasi polis_features belum dijalankan, seed akan gagal karena akun `USR-DEMO-BUYER` belum ada untuk referensi order.

Karena itu, urutan wajib adalah:

1. `20260914000000_init.sql`
2. `20260914000001_rpc.sql`
3. `20260915000000_polis_features.sql`
4. `seed.sql`

Lewati satu langkah saja akan menghasilkan data yang tidak konsisten.

---

# 24. Akun Demo

SeaGres menyediakan dua akun demo pada seed database. Kedua akun memakai password `demo1234`.

| Role | Email | Nama | Organisasi |
| --- | --- | --- | --- |
| Penjual | `rahmat@seagres.id` | Pak Rahmat | KUB Mina Jaya |
| Pembeli | `resto@seagres.id` | Resto Pesisir Gresik | Resto Pesisir Gresik |

Tombol demo di halaman login akan login otomatis menggunakan kredensial di atas. Tombol ini hanya untuk presentasi dan development. Untuk produksi, tombol demo harus dihilangkan atau disembunyikan.

Salt dan hash untuk akun demo bersifat deterministik agar seed bisa diulang tanpa menghasilkan password yang berbeda. Akun `USR-DEMO` punya salt `806e0b2012aa9982137612331112907b` dan hash yang sesuai. Akun `USR-DEMO-BUYER` punya salt `GRESIK-BUYER-DEMO-SALT-2026` dan hash yang sesuai. Token sesi awal masing-masing sudah di-set pada kolom `token`.

---

# 25. Catatan Deployment

Bagian ini mencatat kondisi yang perlu diperhatikan saat deploy SeaGres ke lingkungan produksi.

## 25.1 Font

Font `Plus_Jakarta_Sans` diambil dari Google Fonts pada waktu build dan dev. Build offline akan gagal pada langkah `next/font`. Untuk deploy di lingkungan tanpa akses internet, host font secara lokal atau ganti dengan font sistem.

## 25.2 Environment

Variabel `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` wajib di-set sebelum runtime. Tanpa keduanya, `lib/supabase.ts` melempar error pada setiap request ke Supabase. Build sendiri tidak gagal.

## 25.3 Service Role Key

Karena service role key memberikan akses penuh ke database, sangat penting bahwa semua mutasi melewati Server Action dengan validasi manual. Pola ini mirip dengan pendekatan tradisional di mana backend melakukan otorisasi, bukan database lewat RLS.

## 25.4 Deployment Platform

SeaGres dapat di-deploy ke platform yang mendukung Next.js, antara lain Vercel, Netlify, atau self-hosted. Platform deployment harus mendukung:

- Node.js 20.9 atau lebih baru.
- Akses internet keluar untuk `next/font`.
- Environment variables yang bisa di-set per-deployment.
- Build command `npm run build` dan start command `npm run start`.

## 25.5 HTTPS

Cookie sesi diset dengan `secure: true`, jadi aplikasi harus di-serve lewat HTTPS di produksi. Tanpa HTTPS, cookie tidak akan dikirim oleh browser.

## 25.6 Cache dan ISR

SeaGres tidak menggunakan Incremental Static Regeneration. Halaman `app/page.tsx` memakai `dynamic = "force-dynamic"`, sehingga selalu dirender ulang. Pendekatan ini menjamin data selalu segar. Untuk skala besar, pertimbangkan caching per user dengan revalidate berbasis tag.

---

# 26. Perbaikan Bug Terkini

Berikut perbaikan bug yang dilakukan baru-baru ini, berdasarkan catatan pengembangan.

## 26.1 Tombol Terima Pesanan Tidak Muncul

Sebelum perbaikan, `OrdersPanel` menampilkan seluruh pesanan tanpa filter peran, dan tombol Terima/Tolak hanya muncul saat `order.seller === user.organization` dengan perbandingan string ketat. Akibatnya, untuk akun baru atau akun yang namanya dimasukkan dengan spasi tambahan, tombol tidak pernah muncul.

Perbaikan:

- Filter daftar pesanan berdasarkan peran. Penjual hanya melihat pesanan untuk kelompoknya. Pembeli hanya melihat pesanan sendiri.
- Pencocokan nama kelompok memakai `trim()` dan `toLocaleLowerCase("id-ID")` agar toleran terhadap spasi dan kapital.
- Counter badge keranjang, summary card "pesanan", judul modal, dan indikator bottom-nav memakai jumlah terfilter, bukan total pesanan keseluruhan.

## 26.2 Otorisasi Server

Sebelum perbaikan, `setOrderStatus` memakai perbandingan `lot.seller !== user.organization` yang ketat. Server juga rentan menolak pesanan dari akun yang nama organisasinya punya spasi tambahan. Perbaikan menerapkan `trim().toLocaleLowerCase()` yang sama dengan UI, sehingga UI dan server konsisten.

## 26.3 Tombol Pre-Order untuk Penjual

Sebelum perbaikan, `LotPreorder` di halaman publik `/lot/[id]` menampilkan tombol "Ajukan pre-order" untuk semua pengguna yang login, termasuk penjual. Server kemudian menolak aksi dengan pesan error. Perbaikan menyembunyikan tombol untuk akun penjual dan menampilkan pesan informatif sebagai gantinya.

## 26.4 Logo dan Identitas

Sebelum perbaikan, header dan footer hanya menampilkan teks "sea" + "gres" (lowercase) di samping ikon ombak. Logo SeaGres yang sebenarnya memakai penulisan "SeaGres" (S dan G besar). Perbaikan mengganti ikon dengan komponen `SeagresLogo` yang memuat logo PNG lengkap dengan wordmark.

Favicon juga diperbaiki dari placeholder SVG ke file PNG `app/icon.png` yang diambil dari logo utama. Next.js App Router secara otomatis menyajikan file ini sebagai favicon tab.

## 26.5 Trim Organization

Sebelum perbaikan, `register` tidak mentrim spasi di field `organization`. Pengguna yang sengaja atau tidak sengaja menambah spasi akan kesulitan mencocokkan nama organisasi dengan field `lot.seller`. Perbaikan menambah `.trim()` agar konsisten dengan normalisasi di server.

## 26.6 Riwayat Commit

Komit dengan identitas `SeaGres-Agent` sebelumnya dihapus dari history GitHub lewat `git reset --hard` dan force push. Sebagai gantinya, satu commit baru dengan perbaikan fungsional di-commit dengan akun `ar-elfahmi` lalu di-push. Tujuannya adalah menjaga history bersih dari kredensial agent yang tidak lagi dipakai.

---

# 27. Kondisi yang Sudah Diketahui

Beberapa hal yang patut dicatat untuk pengguna dan kontributor berikutnya.

## 27.1 Perubahan Role

Peran (`account_type`) disimpan saat registrasi dan tidak bisa diubah lewat UI. Untuk mengubah peran akun yang sudah ada, lakukan lewat SQL langsung di database.

## 27.2 Format Tanggal

Format tanggal dan jam memakai `Intl` dengan locale `id-ID` sehingga output seperti "13 Sep 2026, 06:30". Locale ini harus tersedia di runtime Node.

## 27.3 Concurrency pada Stok

Mekanisme `reserve_lot_weight` mengunci baris lot selama update. Dalam volume tinggi, lock ini bisa menjadi bottleneck. Untuk MVP, volume masih jauh di bawah batas, sehingga tidak menjadi masalah praktis. Untuk skala besar, pertimbangkan queue atau event-driven stock management.

## 27.4 Akses Penyimpanan Foto

Bucket `lot-photos` di Supabase Storage diset publik supaya URL foto bisa langsung dipakai di tag `<Image>`. Untuk produksi, pertimbangkan signed URL agar hanya pemilik lot yang bisa melihat foto, atau tetap publik karena foto produk pada dasarnya memang untuk konsumsi publik.

## 27.5 Penghapusan Lot

Tidak ada endpoint publik untuk menghapus lot. Penghapusan dilakukan lewat SQL langsung. Konsekuensinya, view `order_views` tetap menampilkan nama produk dari order yang sudah ada walau lot-nya sudah tidak ada (ditampilkan sebagai `(lot dihapus)`).

## 27.6 Penghapusan Akun

Tidak ada endpoint publik untuk menghapus akun. Akun yang sudah ada tetap ada di database dan bisa dipakai untuk login sampai dihapus manual lewat SQL.

## 27.7 AGENTS.md

File `AGENTS.md` di root repo berisi catatan khusus untuk agent AI yang mengerjakan SeaGres. Catatan itu menjelaskan penyimpanan Supabase-only, urutan migrasi, dan font yang butuh internet. Catatan ini dijaga oleh agent, bukan bagian dari kontrak aplikasi.

## 27.8 Tidak Ada ORM

SeaGres tidak memakai ORM seperti Prisma atau Drizzle. Semua akses database lewat `supabase-js` dengan query SQL eksplisit. Alasan utamanya:


Konsekuensinya, tipe data dari Postgres (`numeric`, `timestamptz`) datang lewat supabase-js sebagai string. `lib/rows.ts` berisi fungsi `toLot`, `toOrder`, `toUser` yang menormalisasi kembali ke bentuk yang dipakai aplikasi. Pola ini menjaga agar tipe di seluruh aplikasi konsisten (`number`, bukan `string | number`).

## 27.9 Mengapa Next.js App Router

Beberapa pilihan teknis SeaGres mungkin terasa berbeda dari tutorial Next.js yang banyak beredar:

App Router (bukan Pages Router) dipakai karena Server Components dan Server Actions menghilangkan kebutuhan akan folder `pages/api/`. Mutasi data lewat Server Action lebih sederhana daripada endpoint REST + fetch manual.

Turbopack (bukan Webpack) dipakai untuk build dev yang lebih cepat. Build produksi Turbopack juga lebih optimal karena Rust-based.

Server Actions (bukan tRPC atau GraphQL) dipakai untuk mengurangi overhead tooling. Tipe TypeScript dari Server Action ke pemanggil klien otomatis terjaga, jadi tidak perlu generate client seperti pada tRPC.

Pendekatan ini bukan tanpa kekurangan. Debugging Server Action lebih sulit karena tidak ada endpoint REST yang bisa di-call manual dengan curl. Testing Server Action juga lebih kompleks. Untuk MVP, kesederhanaan Server Action lebih bernilai.

## 27.10 Mengapa Supabase

Supabase dipilih karena beberapa alasan praktis. Pertama, Supabase menyediakan Postgres, Auth, dan Storage dalam satu platform, sehingga tidak perlu mengintegrasikan banyak layanan terpisah.

Kedua, Supabase kompatibel dengan ekosistem Postgres standar. Jika di kemudian hari perlu migrasi ke Postgres self-hosted, skema dan query bisa dipakai ulang tanpa banyak perubahan.

Ketiga, Supabase JS Client ringan dan familiar bagi developer JavaScript. Tidak perlu belajar SQLAlchemy atau pgx seperti di Python atau Go.

Untuk tahap MVP, harga Supabase free tier sudah cukup untuk development dan testing. Saat produksi, biaya perlu diestimasi berdasarkan jumlah request dan ukuran storage.


# 29. Alur Operasional dari Nelayan ke Pembeli

Bagian ini menjelaskan alur lengkap satu siklus transaksi SeaGres, mulai dari ikan ditangkap hingga diterima pembeli. Tujuannya agar pembaca memahami bagaimana setiap fitur aplikasi bekerja bersama.

## 29.1 Tahap Pencatatan

Nelayan pulang melaut dengan hasil tangkapan. Di aplikasi, nelayan (yang sudah login sebagai penjual) membuka modal "Jual hasil panen". Ia mengisi nama produk, memilih komoditas, menulis berat total, harga, ukuran, dan waktu tangkap. Lalu ia menambahkan catatan mutu: penanganan bersih, jenis kemasan, suhu simpan (jika ada rantai dingin), dan rencana pengiriman. Jika ada foto hasil tangkapan, ia mengunggahnya.

Setelah submit, server membuat record lot baru dengan nomor `SGR-xxx`, stok sama dengan berat yang ditulis, dan status default. Lot muncul di katalog dengan label promo "Baru dicatat".

## 29.2 Tahap Penemuan

Restoran atau warung lokal membuka SeaGres, melihat hero slider dan rekomendasi produk. Mereka bisa memfilter berdasarkan komoditas atau mencari nama produk spesifik. Setiap kartu menampilkan harga, rating, lokasi, dan label.

Pembeli yang tertarik mengklik kartu. Modal detail terbuka dengan foto besar, informasi mutu, dan tombol "+ Keranjang". Pembeli memasukkan jumlah kg yang diinginkan. Aplikasi mengirim pre-order ke server.

Server memvalidasi: pembeli login, lot ada, stok cukup. Lalu server memanggil `reserve_lot_weight` untuk menurunkan stok secara atomik dan `insertOrder` untuk membuat record order baru. Order berstatus "Baru".

## 29.3 Tahap Konfirmasi

Nelayan (penjual) membuka SeaGres, melihat badge "1" pada ikon keranjang di header. Ia masuk ke modal "Pesanan masuk". Di sana terlihat order "Baru" dari pembeli tertentu dengan jumlah dan produk.

Penjual memutuskan apakah lot bisa dipenuhi. Jika ya, klik "Terima pesanan". Server memanggil `setOrderStatus` dengan `Diterima`, lalu `apply_accept_effects` untuk sinkronisasi stok. Order berpindah dari "Baru" ke "Diterima".

Jika penjual tidak bisa memenuhi, klik "Tolak". Order berpindah ke "Ditolak" dan tetap terlihat di daftar pembeli sebagai arsip.

## 29.4 Tahap Penyerahan

Setelah dikonfirmasi, pembeli dan penjual berkomunikasi lewat kanal di luar SeaGres (misal WhatsApp atau telepon) untuk mengatur waktu dan lokasi penyerahan. Aplikasi tidak menangani pembayaran atau logistik; itu tetap di luar cakupan MVP.

Saat penyerahan, penjual menunjukkan nomor lot. Pembeli bisa scan QR pada lot untuk membuka halaman publik `/lot/<id>`. Halaman ini menampilkan seluruh informasi lot: nama, penjual, lokasi umum, waktu tangkap, dan timeline penelusuran. Pembeli bisa memverifikasi bahwa produk yang diterimanya benar-benar tercatat di SeaGres.

## 29.5 Tahap Laporan (Opsional)

Jika ada masalah mutu atau ketidaksesuaian, pembeli (atau penjual) bisa membuka modal "Laporkan masalah" dari tombol lonceng di header. Mereka memilih kategori, menulis deskripsi (minimal 10 karakter), lalu submit. Laporan masuk ke tabel `reports` dengan status "Baru" dan akan ditindaklanjuti oleh pendamping.

Pendamping (luar MVP) melihat laporan lewat dashboard terpisah dan menghubungi pihak terkait untuk menyelesaikan masalah.

## 29.6 Pencatatan Hasil

Setelah panen selesai atau stok habis, lot di katalog bisa berstatus "Stok habis". Penjual tidak perlu menghapus lot secara manual; lot tetap ada sebagai arsip. Order yang terkait tetap terlihat di view `order_views` walau lot sudah dihapus (ditampilkan dengan label "(lot dihapus)").

Untuk lot baru pada periode panen berikutnya, penjual cukup membuat lot baru. Tidak ada konsep "edit lot" di MVP; jika perlu perubahan, hapus lot lama lewat SQL lalu buat lot baru.


# 30. Pertimbangan Pengembangan Lanjutan

Bagian ini mencatat arah pengembangan yang mungkin dilakukan setelah MVP.

## 30.1 Pembayaran Online

SeaGres saat ini tidak menangani pembayaran. Pembayaran tetap dilakukan secara langsung antara pembeli dan penjual di luar aplikasi. Untuk menambahkan pembayaran, pertimbangkan integrasi dengan payment gateway seperti Midtrans atau Xendit. Pola integrasi akan menambah satu Server Action `createPayment` dan satu callback webhook untuk konfirmasi status pembayaran.

## 30.2 Ongkos Kirim

Tidak ada kalkulasi ongkir otomatis di MVP. Label "Bebas Ongkir" di beberapa lot adalah promosi statis yang disimpan di field `promo`. Untuk ongkir dinamis, perlu integrasi dengan API kurir lokal dan satu field `shipping_cost` di tabel `orders`.

## 30.3 Rating Pembeli

Lot di katalog memiliki rating default 5. Belum ada mekanisme rating dari pembeli setelah transaksi selesai. Untuk menambahkan rating, perlu tabel `reviews` baru dengan foreign key ke `lot_id` dan `buyer_user_id`, lalu satu Server Action `submitReview`.

## 30.4 Notifikasi Real-Time

Saat ini notifikasi ke penjual bahwa ada pre-order baru bersifat pasif: penjual harus membuka halaman untuk melihatnya. Untuk notifikasi real-time, pertimbangkan Supabase Realtime atau webhook ke platform push notification.

## 30.5 Dashboard Pendamping

Pendamping yang memverifikasi kelompok penjual dan menindaklanjuti laporan belum punya dashboard di SeaGres. Untuk MVP, proses ini dilakukan di luar aplikasi. Dashboard bisa dibangun sebagai route `/admin` dengan proteksi role-based.

## 30.6 Multi-Bahasa

SeaGres saat ini hanya dalam Bahasa Indonesia. Untuk melayani pengguna non-Indonesia, perlu integrasi i18n seperti `next-intl`. Teks UI perlu diekstrak ke file terjemahan.

## 30.7 Aplikasi Mobile

Tampilan mobile SeaGres sudah responsif lewat bottom-nav dan layout adaptif. Untuk pengalaman native, bisa dibangun aplikasi mobile dengan React Native atau Capacitor yang consume API yang sama (walaupun SeaGres saat ini tidak punya REST API; perlu ditambah).


# 31. Penutup (Ringkasan)

SeaGres adalah aplikasi web marketplace dua peran (penjual dan pembeli) untuk hasil laut pesisir Gresik. Stack-nya Next.js 16 dengan App Router, React 19, TypeScript 6, Tailwind 4, dan Supabase untuk Postgres serta Storage.

Fitur intinya adalah pencatatan lot oleh penjual, katalog publik dengan filter dan sort, pre-order oleh pembeli, konfirmasi pesanan oleh penjual, kartu lot publik dengan QR, dan laporan masalah. Setiap fitur memiliki Server Action dengan otorisasi dan validasi manual, sehingga tidak bergantung pada Row Level Security per-request.

Schema database disimpan dalam tiga migrasi SQL yang harus dijalankan berurutan, lalu seed. Tabel utamanya adalah `users`, `lots`, `orders`, `prices`, dan `reports`, dengan view `order_views` dan dua fungsi RPC untuk race-condition-safe stok.

Autentikasi memakai cookie sesi sederhana dengan format `uid.secret` dan hash password scrypt. Tidak ada library auth pihak ketiga; semua logika ada di `lib/session.ts` dan `lib/crypto.ts`.

Perbaikan bug terkini mencakup filter pesanan per peran dengan pencocokan nama kelompok yang tahan spasi dan kapital, penyembunyian tombol pre-order untuk penjual, penambahan logo SeaGres di header dan footer, dan penghapusan history commit agent dari repository.

Untuk deploy, perlu koneksi internet untuk `next/font`, environment variables untuk Supabase, dan HTTPS agar cookie sesi bekerja. Migrasi harus dijalankan berurutan agar seed berhasil.

Arah pengembangan berikutnya mencakup pembayaran online, kalkulasi ongkir, rating pembeli, notifikasi real-time, dashboard pendamping, multi-bahasa, dan aplikasi mobile native. Semua arah itu bisa ditambahkan tanpa mengganggu alur dasar yang sudah berjalan.
---
# 32. Troubleshooting Umum

Bagian ini mencatat masalah yang umum dijumpai saat pengembangan atau deploy, beserta solusinya.

## 32.1 Login Gagal Padahal Akun Benar

Cek apakah cookie sesi terkirim dengan benar. Buka DevTools, tab Application, lihat cookie `sgres_session`. Jika tidak ada, kemungkinan `secure: true` aktif padahal aplikasi diakses lewat HTTP (bukan HTTPS). Untuk development lokal lewat `localhost`, cookie secure tetap dikirim oleh browser modern, jadi masalah biasanya bukan di sini.

Cek juga apakah `SUPABASE_SERVICE_ROLE_KEY` valid. Buka terminal, jalankan query ke `users` lewat psql atau Supabase Studio, pastikan akun ada. Jika akun ada di database tapi login gagal, kemungkinan hash password tidak cocok, yang berarti seed perlu diulang.

## 32.2 Stok Lot Tidak Berkurang Setelah Pre-Order

Kemungkinan RPC `reserve_lot_weight` tidak terpanggil. Cek log server (di Vercel: tab Logs, atau di self-hosted: stdout). Jika ada error, biasanya karena lot sudah dihapus atau nama fungsi typo.

Cek juga apakah klausa `where weight >= p_qty` gagal dipenuhi. Jika stok 0 atau jumlah pesanan melebihi stok, fungsi mengembalikan false dan stok tidak berkurang.

## 32.3 Foto Lot Tidak Muncul

Cek URL foto di field `image`. Jika URL dimulai dengan `/products/` atau `/uploads/`, file harus ada di folder `public/` yang sesuai. Jika URL dimulai dengan `https://`, pastikan bucket `lot-photos` di Supabase Storage masih publik dan file ada.

Cek juga `next.config.ts` dan pastikan tidak ada konfigurasi `images.remotePatterns` yang membatasi domain. Untuk localhost, foto dari Supabase Storage perlu domain yang diizinkan.

## 32.4 QR Code Tidak Tergenerate

Library `qrcode` diimpor secara dinamis di `Storefront.openLot()`. Jika import gagal, biasanya karena masalah network atau build cache. Coba hapus folder `.next` lalu build ulang.

Cek juga apakah `window` tersedia saat `openLot` dipanggil. Server Component tidak bisa akses `window`, jadi QR code hanya dibuat setelah user mengklik lot di klien.

## 32.5 Tombol Pre-Order Tidak Ada

Cek apakah user login sebagai pembeli. Penjual tidak melihat tombol pre-order di LotDetail maupun di LotPreorder publik, sesuai perbaikan terbaru. Jika user adalah pembeli tapi tombol tidak ada, cek `user.accountType` di console. Jika nilainya `seller`, kemungkinan register gagal dan default `seller` dipakai.

## 32.6 Halaman `/lot/[id]` 404

Cek apakah lot dengan id tersebut masih ada di database. Lot yang dihapus lewat SQL langsung akan menampilkan 404. Lot yang stoknya 0 tetap bisa diakses, hanya tombol pre-order yang hilang.

## 32.7 Build Gagal karena Font

Cek koneksi internet. `next/font/google` butuh akses ke fonts.googleapis.com saat build. Untuk build offline, host font secara lokal dan ganti `next/font/google` dengan `next/font/local`.

## 32.8 Supabase Error 401

Cek apakah `SUPABASE_SERVICE_ROLE_KEY` masih aktif di dashboard Supabase. Kunci yang di-rotate akan membuat semua request gagal dengan 401. Generate kunci baru di Settings > API, update env var, lalu redeploy.

# 33. Tanya Jawab

## 33.1 Apakah SeaGres Gratis?

SeaGres sendiri adalah kode sumber terbuka yang bisa dipakai gratis. Namun, untuk menjalankan produksi, perlu akun Supabase (ada tier gratis) dan platform hosting (Vercel ada tier gratis untuk hobby). Untuk traffic produksi, pertimbangkan tier berbayar.

## 33.2 Apakah SeaGres Menangani Pembayaran?

Belum. Pembayaran tetap dilakukan di luar aplikasi (tunai atau transfer langsung antara pembeli dan penjual). Integrasi payment gateway adalah rencana pengembangan berikutnya.

## 33.3 Apakah Foto Lot Wajib?

Tidak. Penjual bisa tidak mengunggah foto, dan aplikasi akan memakai gambar default berdasarkan komoditas. Namun, foto asli meningkatkan kepercayaan pembeli dan disarankan.

## 33.4 Apakah Pembeli Bisa Membatalkan Pre-Order?

Belum. Pembeli harus menunggu penjual menolak pesanan secara eksplisit. Fitur pembatalan oleh pembeli adalah rencana pengembangan berikutnya.

## 33.5 Apakah Bisa Multi-Bahasa?

Belum. SeaGres hanya dalam Bahasa Indonesia. Multi-bahasa adalah rencana pengembangan berikutnya dengan library i18n seperti `next-intl`.

## 33.6 Apakah Bisa Diakses Tanpa Internet?

Tidak. SeaGres butuh koneksi ke Supabase untuk hampir semua operasi. Tanpa internet, hanya halaman statis (foto produk, logo) yang bisa dimuat dari cache browser. Untuk aplikasi offline-first, perlu IndexedDB atau Service Worker yang signifikan.

## 33.7 Berapa Kapasitas Foto yang Didukung?

Batas utama adalah ukuran file 4 MB per foto (divalidasi server). Bucket Supabase Storage free tier punya batas 1 GB total. Untuk produksi dengan banyak foto, pertimbangkan tier berbayar atau CDN eksternal.

## 33.8 Apakah SeaGres Aman untuk Produksi?

Untuk MVP dan demo, ya. Untuk produksi skala besar dengan data sensitif, perlu audit keamanan tambahan: penetration testing, rate limiting, CSRF protection eksplisit, dan secret management yang lebih ketat.


## Rangkuman Akhir

Dokumentasi ini akan berubah seiring fitur baru ditambahkan. Kontributor yang ingin memperbarui struktur database, menambahkan peran baru, atau mengganti tampilan, sebaiknya membaca kembali bagian Skema Database, Server Actions, dan Halaman dan Komponen terlebih dahulu agar konsisten dengan pola yang sudah ada.

Untuk produksi, prioritas berikutnya yang patut dipertimbangkan adalah caching halaman utama (revalidate berbasis tag), penambahan payment gateway, sistem rating pembeli, dan integrasi ongkir otomatis. Semua itu bisa ditambahkan tanpa mengganggu alur dasar yang sudah berjalan hari ini.
