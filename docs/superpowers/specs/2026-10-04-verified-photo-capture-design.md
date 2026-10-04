# Verified Photo Capture — Pengepul Bukti Penerimaan

**Date**: 2026-10-04
**Status**: Draft — menunggu approval user

## Latar Belakang

Saat ini form "Terima" (di dashboard card + di halaman detail) dan form "Tambah Produk" (di dashboard) menggunakan `<input type="file" accept="image/*,application/pdf">`. User dapat mengunggah file apa pun dari galeri. Ini membuka celah:

- Foto bisa di-*screenshot* dari internet / foto lama / foto orang lain.
- PDF (surat jalan, dll.) tanpa bukti visual.
- Tidak ada bukti visual lokasi atau waktu di foto itu sendiri.

**Tujuan**: Saat pengepul mencatat penerimaan barang, ia harus ambil foto langsung lewat kamera aplikasi, dan foto yang diunggah otomatis membawa bukti lokasi, waktu, dan identitas aktor+nama produk yang tidak terpisah (overlay dibakar ke pixel).

## Tujuan & Non-Tujuan

### Tujuan

1. UI dokumen pendukung hanya izinkan capture lewat kamera (`<input type="file" accept="image/*" capture="environment">`), bukan pilih dari galeri.
2. Setiap foto dibakar overlay: timestamp, koordinat GPS + peta kecil, nama pengepul, nama produk.
3. Data capture (GPS, waktu, akurasi) juga disimpan sebagai field terstruktur di tabel `history_documents` agar bisa di-query / ditampilkan.
4. Multi-foto: tetap bisa ambil banyak foto per event.
5. PDF dihapus dari accepted types.

### Non-Tujuan (di luar scope)

- Validasi silang server-side antara koordinat overlay vs `geo_point` event (trust model = visual, sesuai pilihan user).
- Verifikasi hash / signature foto di server.
- Reverse-geocoding nama tempat (hemat dependency).
- Filter EXIF GPS dari foto asli (akan ditimpa oleh overlay).
- Mode gelap untuk UI camera (mengikuti OS default).

## Pendekatan

**Klien (capture) → Server (simpan)**

1. **Klien**:
   - Saat buka form, request `navigator.geolocation.getCurrentPosition` sekali → simpan koordinat + akurasi + timestamp di state.
   - Ganti `<input type="file">` dengan `<input type="file" accept="image/*" capture="environment">` — di mobile akan buka kamera belakang; di desktop fallback ke file picker biasa.
   - Setiap foto yang dipilih, render ke `<canvas>` di klien: tempel foto + overlay (timestamp, GPS dalam DMS atau desimal, peta kecil statis dari tile, nama aktor, nama produk/sub-product).
   - Konversi canvas → `Blob` JPEG → tambahkan ke state `docs`/`files`. File `name` jadi `gebr-verified-<timestamp>.jpg`.
2. **FormData**: kirim file hasil canvas (sudah overlay) + field tambahan `capturedAt`, `capturedLat`, `capturedLng`, `capturedAccuracy` per foto.
3. **Server**:
   - `uploadHistoryDocuments` baca field `capturedAt/Lat/Lng/Accuracy` dari FormData (`documentsMeta[]` paralel dengan `documents[]`).
   - Tulis ke kolom baru `history_documents`: `captured_at`, `captured_lat`, `captured_lng`, `captured_accuracy_m`. `created_at` server-side tetap ada (audit).
   - Tolak upload yang tidak punya koordinat klien (sesuai trust model user: visual + wajib GPS di klien).

## Perubahan Schema

### `history_documents` (tambah kolom nullable, tidak migrasi data lama)

| Kolom | Tipe | Nullable | Catatan |
|---|---|---|---|
| `captured_at` | timestamptz | ya | Waktu kamera/client ambil foto |
| `captured_lat` | numeric(9,6) | ya | Latitude GPS saat shutter |
| `captured_lng` | numeric(9,6) | ya | Longitude GPS saat shutter |
| `captured_accuracy_m` | numeric(8,2) | ya | Akurasi GPS meter |

Lama-kosong: dokumen lama tetap valid, hanya tidak punya field ini.

### Migrasi Supabase

File baru: `supabase/migrations/20261004000000_history_documents_capture_meta.sql`

```sql
ALTER TABLE history_documents
  ADD COLUMN captured_at timestamptz,
  ADD COLUMN captured_lat numeric(9, 6),
  ADD COLUMN captured_lng numeric(9, 6),
  ADD COLUMN captured_accuracy_m numeric(8, 2);
```

## Perubahan Kode

### `lib/types.ts` — tambah field ke `HistoryDocument`

```ts
export interface HistoryDocument {
  id: string;
  historyId: string;
  url: string;
  filename: string;
  mime: string;
  kind: DocumentKind;
  createdAt: string;
  // baru:
  capturedAt: string | null;
  capturedLat: number | null;
  capturedLng: number | null;
  capturedAccuracyM: number | null;
}
```

### `lib/queries.ts` — `insertDocument` & row mapping

Tambah field baru ke parameter `insertDocument` dan SELECT list. Row mapping baca `captured_at → capturedAt`, dst.

### `app/actions.ts`

- `uploadHistoryDocuments(files, historyId, metas)` → terima `metas: Array<{capturedAt, capturedLat, capturedLng, capturedAccuracyM} | null>` paralel dengan `files`. Tolak jika `file` ada & `meta` null.
- `addSubProductAction`, `createProduct`, `addProductHistory`, `addHistoryEventAction` — parse `documentsMeta[]` dari FormData, teruskan ke `uploadHistoryDocuments`.

### Komponen baru `app/components/verified-photo-capture.tsx`

- Client component, props: `productId`, `actorName`, `productName`, `subProductName?`, `onChange(docs: VerifiedDoc[])`.
- State: `coords: {lat, lng, accuracy} | null`, `docs: VerifiedDoc[]`.
- Method internal `captureGeolocation()` — request sekali saat mount.
- Render `<input type="file" accept="image/*" capture="environment" multiple>`.
- Setiap file diproses `renderOverlay(file)` → return `Blob` + meta → push ke state.
- Helper `renderOverlay(file: File, ctx: CaptureContext): Promise<{blob: Blob, capturedAt: string, capturedLat: number, capturedLng: number, capturedAccuracyM: number}>` — menggambar ke canvas.
- Render peta kecil: pakai `fetch(staticmap URL)` atau `render` SVG sederhana berisi polyline kotak + crosshair + label lat/lng. **Pilihan minimal**: render SVG sederhana (kotak dengan marker + label koordinat) tanpa network — anti-pemalsuan cukup karena koordinat visualnya = koordinat klaim.
- Submit: tiap `VerifiedDoc` punya `blob` dan `meta`; saat form submit, expose ke parent form via callback.

### Form integrasi

#### `app/components/forms/add-fisherman-form.tsx` (Terima)

- Hapus import `DocEntry` lama; ganti state `docs` jadi `VerifiedDoc[]`.
- Ganti blok label `Dokumen pendukung (foto / PDF)` (L271-280) dengan `<VerifiedPhotoCapture productId={productId} actorName={...} productName={product.name} onChange={setDocs} />`.
- Submit handler: loop `docs` → push `data.append("documents[]", entry.blob)` + push meta paralel (`documentsMeta[]` JSON atau `capturedAt[i]` indexed).

#### `app/components/pengepul-dashboard.tsx` (Tambah)

- `FishermanRowState.files: File[]` → `verifiedDocs: VerifiedDoc[]`.
- Sama: ganti `<input type="file">` per-baris Nelayan jadi `<VerifiedPhotoCapture />`.
- Submit: serialize `documents[N][i]` nested atau serial via JSON blob.

**Kompleksitas submit**: untuk createProduct dengan multi-row Nelayan, lebih sederhana pakai JSON blob `documentsMetaJSON` daripada indexed fields. Server parse JSON.

## Peta kecil (peta statis)

Pilihan paling ringan — render inline SVG di canvas tanpa network:

```
┌───────────────────────┐
│                       │
│   ┌──┐                │
│   │  │                │
│   └──┘                │
│                       │
│ -6.1234, 106.5678     │
└───────────────────────┘
```

Pilihan medium — fetch tile OpenStreetMap static map:
- Tambah dependency / API key.
- 1 request HTTP per capture (rate-limit).
- Lebih meyakinkan secara visual tapi tidak menambah keamanan (koordinat sudah terbakar sebagai teks).

**Rekomendasi**: SVG sederhana (kotak + crosshair + label). Hemat, offline-friendly, dan bukti visual utama = teks koordinat yang dibakar — yang tidak bisa dipalsukan tanpa edit gambar.

## Trust Boundary

| Aspek | Klien | Server |
|---|---|---|
| Capture koordinat | ✅ sumber utama (navigator.geolocation) | tidak percaya |
| Render overlay ke pixel | ✅ satu-satunya cara file dibuat | tidak intervensi |
| Validasi `capturedAt/Lat/Lng` presence | ✅ selalu kirim | ✅ tolak jika null untuk foto baru |
| Validasi silang vs `geo_point` event | ❌ | ❌ (out of scope) |
| Simpan `captured_*` di DB | ❌ | ✅ audit trail |
| `created_at` server | ❌ | ✅ audit terpisah |

Catatan: User yang paham editor gambar masih bisa memalsukan overlay. Trade-off eksplisit: model trust = "bukti visual kasual + jejak audit server-side", bukan kriptografi. Cocok untuk traceability antar-pengepul-pembeli, bukan forensik adversarial.

## Error Handling

- **GPS denied**: form tampilkan banner "Aktifkan lokasi untuk mengambil foto bukti" — submit disabled.
- **Kamera tidak tersedia** (desktop tanpa webcam): `<input type="file" capture>` fallback ke file picker. Overlay tetap dibakar. Captured GPS tetap.
- **Canvas tainted** (CORS foto): gunakan `createImageBitmap` + `canvas.drawImage` di canvas yang sama-origin. Untuk foto dari kamera mobile, biasanya aman. Tangani error dengan banner.
- **Network fail upload**: existing — `failures[]` sudah ada di `uploadHistoryDocuments`.

## Testing

- **Unit** (preferred): helper `renderOverlay` bisa di-test headless di Node dengan `canvas` package — tapi menambah dep. Trade-off: pakai jsdom + canvas di Vitest.
- **Integration**: tulis server action test dengan mock upload + assert dokumen row baru memiliki `captured_*` populated.
- **Manual smoke**: 
  1. Mobile Chrome/Safari: tombol "Ambil foto" → kamera terbuka → shutter → preview dengan overlay → submit → verifikasi di `history_documents` row.
  2. Desktop: file picker biasa → pilih JPEG → overlay terbakar → submit.
  3. Tolak GPS di browser → submitter disabled → no submit.

## File yang Diubah / Ditambah

### Tambah
- `supabase/migrations/20261004000000_history_documents_capture_meta.sql`
- `app/components/verified-photo-capture.tsx`
- `app/components/verified-photo-overlay.ts` (helper canvas + SVG peta kecil, dipisah biar testable)

### Ubah
- `lib/types.ts` (tambah field `HistoryDocument`)
- `lib/queries.ts` (`insertDocument` + row mapping)
- `lib/rows.ts` (row mapping history_documents jika ada)
- `app/actions.ts` (`uploadHistoryDocuments` + 4 callers parse meta)
- `app/components/forms/add-fisherman-form.tsx` (ganti file input)
- `app/components/pengepul-dashboard.tsx` (ganti file input per row + submit)

## Rollout

1. Migrasi kolom nullable → aman, no downtime.
2. Komponen klien baru → switch input gradual.
3. Verifikasi visual di production sebelum hapus input lama.
4. Tidak ada rencana hapus `created_at` server / `filename` legacy.