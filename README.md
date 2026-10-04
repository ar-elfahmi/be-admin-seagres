# SeaGres

Web app hasil pesisir Gresik berbasis Next.js, React, Tailwind CSS 4, dan Supabase. SeaGres merupakan pengembangan gagasan PesisirHub/iGres, dengan katalog produk agregasi pengepul dan keterlacakan per penerimaan nelayan.

## Role dan fitur saat ini

| Role | Akses |
| --- | --- |
| Pengepul | Mencatat produk, menerima sumber nelayan, mencatat penjualan, menambah riwayat dan bukti, melihat stok serta penjualan tercatat |
| Customer / pembeli | Mencari/filter/mengurutkan katalog seluruh pengepul, membuka sumber nelayan dan grade, melihat keterlacakan serta QR, profil, laporan masalah |
| Verifikator | Belum diimplementasikan; tidak tersedia lewat pendaftaran publik |

Satu produk memiliki banyak sub-produk/penerimaan. Nelayan yang sama dapat mempunyai beberapa penerimaan dengan grade, harga, stok, barcode, dan bukti berbeda. Stok produk merupakan jumlah stok seluruh penerimaan; harga katalog berasal dari rentang harga sumber yang masih tersedia.

Alur `lots` dan `orders` lama dipertahankan untuk kompatibilitas. Alur itu bukan preorder untuk model produk agregasi baru. Preorder baru, tracking sampai pelanggan, verifikasi administratif, dan penyimpanan riwayat harga harian masih tahap lanjutan.

## Menjalankan lokal

Gunakan Node.js yang memenuhi syarat versi Next.js terpasang dan npm.

```bash
npm install
```

Buat `.env.local` (diabaikan Git):

```dotenv
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
```

Service role hanya boleh berada di server. Jangan gunakan awalan `NEXT_PUBLIC_`, masukkan ke source code, atau commit environment. Untuk production, pasang environment pada server deployment. Putar kunci jika pernah terekspos.

```bash
npm run dev
```

Buka http://localhost:3000. Login memakai akun di Supabase; aplikasi tidak memakai database JSON lokal atau fallback login palsu ketika database gagal.

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## Migrasi konsistensi stok — diperlukan

Untuk database yang sudah menggunakan schema pengepul terbaru, jalankan hanya:

`supabase/migrations/20261010000000_mvp_stock_consistency.sql`

melalui Supabase SQL Editor atau workflow migrasi proyek. Migrasi ini menambahkan RPC:

- `create_product_receipts`: produk, sumber, riwayat penerimaan, dan titik asal disimpan dalam satu transaksi.
- `record_stock_event`: stok dan riwayat penjualan disimpan dalam satu transaksi dengan row lock. Penjualan seluruh stok menghasilkan 0 kg; penjualan bersamaan ditolak jika stok tidak cukup.

RPC hanya dapat dijalankan service role. Pemilik diperiksa kembali di server dan database. Migrasi tidak mengubah stok atau menghapus riwayat lama.

Jangan menjalankan ulang seluruh migrasi lama sembarangan pada database aktif: beberapa migrasi sebelumnya memuat reseed/penghapusan akun demo. Database baru perlu peninjauan schema awal secara berurutan.

Sebelum migrasi baru aktif, pencatatan produk/penerimaan/penjualan menampilkan pesan kebutuhan migrasi; tidak memakai fallback pembaruan stok berisiko. Bukti diunggah setelah transaksi ledger; kegagalan upload ditampilkan sebagai peringatan. Transaksi stok telah diuji pada produk QA terpisah: penerimaan, stok habis, penjualan bersamaan, penolakan customer, dan rollback ledger/batch. Data QA dibersihkan. Upload/geotag perangkat nyata tetap perlu pengujian menyeluruh.

## Migrasi izin database — diperlukan setelah migrasi stok

Jalankan `supabase/migrations/20261011000000_server_only_access.sql` melalui Supabase SQL Editor. Kemudian jalankan `supabase/checks/server_only_access.sql`; hasil yang diharapkan adalah `PASS`. File pemeriksaan hanya membaca metadata, tidak mengubah data.

Aplikasi memakai sesi custom di cookie, **bukan Supabase Auth**. Karena itu policy berbasis `auth.uid()` tidak cocok dengan akun sekarang. Katalog tetap dibaca melalui Next.js; browser tidak perlu akses langsung ke tabel dengan anon/publishable key. Jalur server memakai service role dan wajib memeriksa sesi, role, serta pemilik pada setiap aksi.

Migrasi ini:

- Mengaktifkan RLS dan menutup grant/policy client pada sepuluh tabel SeaGres, termasuk akun, stok, riwayat, pesanan lama, dan laporan.
- Mengunci view pesanan dan empat RPC untuk server saja, termasuk RPC legacy yang sebelumnya berizin PUBLIC.
- Memberi server hanya operasi tabel yang diperlukan MVP sekarang; ledger tetap tanpa izin UPDATE langsung.
- Menambahkan policy storage **restrictive** untuk mencegah anon/authenticated mengubah/list berkas bucket `lot-photos`, tanpa mengganti policy bucket lain.
- Tidak menghapus/reset akun, produk, stok, riwayat, atau file. Tidak mengubah default grant seluruh schema/proyek.

Jika ada aplikasi lain yang mengakses tabel SeaGres langsung memakai anon/authenticated, akses itu akan ditolak setelah migrasi; gunakan backend yang berotorisasi, jangan memasukkan service role ke browser. Tabel/fitur baru harus mempunyai migrasi izin sendiri; jangan menjalankan ulang policy permissive dari migrasi lama.

URL berkas publik dan halaman keterlacakan tetap publik seperti sebelumnya. Migrasi izin database ini **tidak** membuat dokumen/lokasi menjadi privat atau mengubah arsitektur sesi/rate limiting login. Jangan menganggapnya sebagai audit keamanan produksi lengkap.

Migrasi izin dan skrip pemeriksaan telah diuji pada PostgreSQL lokal terisolasi (PGlite): penolakan kedua role client, grant kolom akun, empat RPC, policy storage dengan policy permissive lama, kompatibilitas operasi server, penghapusan produk sesuai perilaku lama, dan rerun tanpa perubahan data. Hasil lokal bukan bukti bahwa migrasi sudah diterapkan pada Supabase aktif; jalankan pemeriksaan di SQL Editor setelah menerapkannya.

## Data dan keterlacakan

### Arsip produk — migrasi tambahan

Jalankan `supabase/migrations/20261012000000_product_archive.sql` setelah dua migrasi di atas, lalu `supabase/checks/product_archive.sql` (hasil `PASS`). Migrasi bersifat non-destruktif dan dapat dijalankan ulang.

- Menu **Arsipkan produk** menggantikan penghapusan permanen di aplikasi. Tab Aktif/Arsip dan tombol Pulihkan tersedia untuk pengepul pemilik.
- Produk arsip tidak ditawarkan di katalog pembeli; stok, sub-produk, riwayat, bukti, dan barcode tetap ada. Link detail/QR tetap dapat dibaca dengan pemberitahuan arsip.
- Terima/Jual/riwayat proses baru diblokir sampai produk dipulihkan. Database mengunci induk produk untuk menghindari transaksi bersamaan dengan pengarsipan.
- Grafik penjualan tetap mencakup riwayat produk arsip; jumlah produk dan stok aktif tidak mencakup arsip.
- Jika RPC belum terpasang, aplikasi menampilkan kebutuhan migrasi dan **tidak** memakai fallback penghapusan permanen. Pembacaan katalog tetap kompatibel sebelum migrasi.

Perilaku arsip/pulihkan dan penolakan mutasi telah diuji pada PostgreSQL lokal terisolasi; pengujian langsung Supabase memerlukan migrasi diterapkan terlebih dahulu.

### Batas unggahan

Foto produk maksimal 4 MB. Bukti maksimal 6 MB per berkas, 8 berkas dan total foto/bukti 20 MB per penyimpanan. Server Actions dibatasi 24 MB untuk overhead multipart; batas berkas tetap diperiksa di server. Format yang diterima dicek terhadap signature dasar file, bukan hanya MIME browser. Pemeriksaan ini bukan pemindai malware atau verifikasi keaslian geolokasi. Bukti foto diproses menjadi JPEG dengan stempel pencatatan; PDF didukung aksi server, belum memiliki picker tersendiri pada UI kamera.

- Data berada di Supabase Postgres; berkas di bucket `lot-photos`.
- Grafik pengepul berasal dari riwayat penjualan, bukan mock. Grafik tujuh hari memakai waktu Asia/Jakarta.
- Riwayat proses tidak mengubah stok. Gunakan Terima atau Jual untuk perubahan jumlah.
- Pengguna meminta lokasi browser melalui tombol. Koordinat foto mengisi form yang kosong tanpa menimpa nilai manual.
- Stempel foto menunjukkan lokasi/waktu pencatatan sekarang, bukan bukti lokasi/waktu pengambilan asli atau persetujuan verifikator.
- QR membuka data yang dicatat pengepul. Status tercatat tidak berarti disetujui verifikator.
- Halaman telusur dan URL berkas saat ini dapat diakses publik, termasuk koordinat bukti. Jangan unggah dokumen pribadi/lokasi sensitif sebelum kebijakan akses ditentukan.

## Harga pesisir

Harga informatif, bukan harga resmi pasar atau harga transaksi. Baris harga tidak dapat diklik. Filter tanggal mencakup enam bulan sebelumnya hingga hari ini.

Data lama tanpa `reported_at` ditampilkan sebagai referensi tanpa tanggal, bukan laporan hari ini. Tanggal tanpa laporan menampilkan kondisi kosong. Penyimpanan rangkaian laporan harian masih perlu dibangun; memilih tanggal tidak menghasilkan data historis.

## Akun demo pengembangan

Jika seed demo telah diterapkan, kata sandi: `demo1234`.

| Role | Email |
| --- | --- |
| Pengepul — Pak Rahmat / KUB Mina Jaya | `rahmat@seagres.id` |
| Customer — Resto Pesisir Gresik | `resto@seagres.id` |

Jangan biarkan kredensial demo terbuka di deployment produksi yang menyimpan data nyata.

## Struktur utama

```text
app/actions.ts                 Otorisasi dan aksi server
app/dashboard/page.tsx         Dashboard menurut role terbaru
app/components/storefront.tsx  Katalog pembeli
app/components/price-board.tsx Harga informatif dengan filter tanggal
app/produk/[id]/               Detail produk agregasi
app/trace/[barcode]/           Keterlacakan satu penerimaan
app/pengepul/                  Produk dan riwayat pengepul
app/buyer.css                  Komponen Tailwind pembeli
app/collector.css              Komponen Tailwind form/dialog pengepul
lib/queries.ts                 Akses Supabase dan RPC
lib/collector-analytics.ts     Grafik dari ledger
supabase/migrations/           Schema dan fungsi database
```

Style baru menggunakan Tailwind utilities/`@apply`, dengan CSS khusus terbatas untuk backdrop, animasi, dan safe-area. Style lama tetap ada untuk kompatibilitas; ini bukan konversi total halaman legacy.
