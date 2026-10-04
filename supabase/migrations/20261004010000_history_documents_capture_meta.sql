-- SeaGres: tambah capture metadata di history_documents untuk bukti foto.
--
-- Tujuan:
--   Dokumen bukti (foto) yang di-append ke event history (terima Nelayan,
--   tambah event, dll) sekarang dibuat lewat komponen VerifiedPhotoCapture:
--   kamera klien + overlay (timestamp, koordinat GPS, peta kecil, identitas
--   aktor & produk). Server menyimpan metadata capture terpisah dari
--   metadata upload (created_at):
--
--     captured_at            -- waktu shutter dari device klien
--     captured_lng/lat        -- koordinat GPS saat shutter
--     captured_accuracy_m    -- akurasi GPS meter
--
--   Dokumen lama (backlog) tetap valid; kolom nullable berarti tidak perlu
--   backfill. Trust model: visual + audit trail, bukan forensik adversarial
--   (lihat docs/superpowers/specs/2026-10-04-verified-photo-capture-design.md).

alter table public.history_documents
  add column if not exists captured_at timestamptz,
  add column if not exists captured_lat numeric(9, 6),
  add column if not exists captured_lng numeric(9, 6),
  add column if not exists captured_accuracy_m numeric(8, 2);

create index if not exists history_documents_captured_at_idx
  on public.history_documents(captured_at desc)
  where captured_at is not null;