# SeaGres

SeaGres adalah web app marketplace hasil laut Gresik. Platform ini mempertemukan nelayan, pembudidaya, kelompok, pengolah/UMKM, dan pembeli lokal melalui katalog lot yang dapat ditelusuri, pre-order, serta informasi harga pesisir.

Nama SeaGres merupakan implementasi MVP dari gagasan PesisirHub/iGres.

## Fitur MVP

- Profil pelaku dengan status verifikasi dan tipe akses.
- Dua role terpisah: **Penjual** dan **Pembeli**.
- Pencatatan hasil tangkap/panen berupa lot, volume, ukuran, waktu, lokasi umum, dan foto.
- Kartu lot dengan QR code untuk membuka halaman penelusuran lot.
- Checklist mutu: penanganan bersih, kemasan, suhu penyimpanan, dan rencana pengiriman.
- Katalog produk segar dan olahan dengan filter, pencarian, pengurutan, dan pagination “Muat lebih banyak”.
- Pre-order dari akun pembeli dan agregasi pesanan untuk kelompok penjual.
- Papan harga informatif dengan tanggal dan sumber laporan.
- Rencana pasokan mendatang serta ringkasan produksi dan permintaan.
- Pelaporan masalah mutu, keterlambatan, atau ketidaksesuaian.
- Homepage responsif dengan hero slider, motion ringan, dan layout mobile.

## Role dan akses

### Penjual

Penjual dapat mencatat lot baru, mengisi checklist mutu, melihat pesanan masuk, menerima/menolak pesanan, melihat ringkasan produksi, dan membuka profil usahanya.

### Pembeli

Pembeli dapat menjelajahi katalog, melihat detail dan QR lot, membuat pre-order, memantau pesanan sendiri, serta melaporkan masalah.

## Akun demo

Semua akun demo menggunakan kata sandi `demo1234`.

| Role | Email |
| --- | --- |
| Penjual — Pak Rahmat / KUB Mina Jaya | `rahmat@seagres.id` |
| Pembeli — Resto Pesisir Gresik | `resto@seagres.id` |

## Menjalankan secara lokal

Prasyarat: Node.js 20.9 atau lebih baru dan npm.

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Perintah lain yang tersedia:

```bash
npm run lint       # pemeriksaan ESLint
npm run build      # build production
npm run start      # menjalankan build production
```

## Penyimpanan data MVP

MVP ini memakai penyimpanan JSON lokal di `data/db.json`. File tersebut dibuat otomatis dari data seed saat aplikasi pertama kali dijalankan dan diabaikan oleh Git. Upload foto lot disimpan di `public/uploads` dan juga diabaikan oleh Git.

Untuk penggunaan production, ganti layer penyimpanan ini dengan database terkelola (misalnya PostgreSQL/Supabase), object storage untuk foto, dan session store yang sesuai.

## Struktur utama

```text
app/
  actions.ts                 Server actions login, register, lot, order, report
  page.tsx                   Entry point auth/storefront
  components/
    auth-screen.tsx          Login dan register dua langkah
    storefront.tsx           Homepage marketplace dan panel interaksi
  lot/[id]/page.tsx          Halaman detail dan QR lot
  globals.css                Design system dan responsive UI
lib/
  store.ts                   Seed, baca/tulis database lokal, query role
  session.ts                 Session cookie lokal
  types.ts                   Model User, Lot, Order, Price, dan Report
public/products/              Gambar produk bawaan
```

## Catatan pengembangan

- Informasi harga di SeaGres bersifat informatif berdasarkan sumber laporan, bukan klaim harga resmi pasar.
- Lokasi yang ditampilkan adalah lokasi umum; titik kapal tidak dipublikasikan.
- QR lot membuka data penelusuran yang aman untuk dibagikan tanpa perlu login.
- Data demo ditujukan untuk prototyping alur dua role sebelum integrasi database production.
