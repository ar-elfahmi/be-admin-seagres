"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { uploadBudgetError } from "../../lib/upload-policy";
import { renderOverlay, type CaptureContext } from "./verified-photo-overlay";

export interface VerifiedDoc {
  id: string;
  blob: Blob;
  previewUrl: string;
  filename: string;
  size: number;
  capturedAt: string;
  capturedLat: number;
  capturedLng: number;
  capturedAccuracyM: number | null;
}

export interface CaptureCoords {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
}

interface Props {
  actorName: string;
  productLabel: string;
  docs: VerifiedDoc[];
  onChange: (docs: VerifiedDoc[]) => void;
  onCoords?: (coords: CaptureCoords) => void;
  helperText?: string;
}

function newDocKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatCoord(value: number, positive: string, negative: string): string {
  const sign = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  return `${abs.toFixed(5)}° ${sign}`;
}

export default function VerifiedPhotoCapture({
  actorName,
  productLabel,
  docs,
  onChange,
  onCoords,
  helperText,
}: Props) {
  const [coords, setCoords] = useState<CaptureCoords | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const currentDocs = useRef(docs);

  useEffect(() => {
    currentDocs.current.filter((previous) => !docs.some((doc) => doc.previewUrl === previous.previewUrl)).forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
    currentDocs.current = docs;
  }, [docs]);

  useEffect(() => {
    // Request location only after an explicit user action, not on mounting a form.
    return () => {
      currentDocs.current.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
    };
  }, []);

  function refreshCoords() {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung geolocation.");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          capturedAt: new Date(pos.timestamp).toISOString(),
        };
        setCoords(next);
        onCoords?.(next);
        setGpsBusy(false);
      },
      (err) => {
        setCoords(null);
        setGpsError(`Tidak bisa mendapatkan lokasi (${err.message}).`);
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    if (!coords) {
      setCaptureError("Aktifkan lokasi dulu sebelum mengambil foto bukti.");
      return;
    }
    if (Date.now() - Date.parse(coords.capturedAt) > 120000) {
      setCaptureError("Lokasi sudah lebih dari dua menit. Pilih refresh lokasi sebelum menambahkan foto.");
      return;
    }
    const budgetError = uploadBudgetError([...docs, ...Array.from(files)]);
    if (budgetError) {
      setCaptureError(budgetError);
      return;
    }
    setCaptureError(null);
    setBusy(true);
    const next: VerifiedDoc[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;
        if (!file.type.startsWith("image/")) continue;
        const ctx: CaptureContext = {
          actorName,
          productLabel,
          capturedAt: new Date(),
          lat: coords.lat,
          lng: coords.lng,
          accuracyM: coords.accuracyM,
        };
        const { blob } = await renderOverlay(file, ctx);
        if (blob.size > 6 * 1024 * 1024) throw new Error("Foto hasil pemrosesan lebih dari 6 MB. Gunakan foto lebih kecil.");
        const previewUrl = URL.createObjectURL(blob);
        next.push({
          id: newDocKey(),
          blob,
          previewUrl,
          filename: `gebr-${Date.now()}-${i}.jpg`,
          size: blob.size,
          capturedAt: ctx.capturedAt.toISOString(),
          capturedLat: ctx.lat,
          capturedLng: ctx.lng,
          capturedAccuracyM: ctx.accuracyM,
        });
      }
      if (next.length) {
        const outputError = uploadBudgetError([...docs, ...next]);
        if (outputError) {
          next.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
          setCaptureError(outputError);
        } else onChange([...docs, ...next]);
      } else {
        setCaptureError("File bukan gambar. Ambil foto lewat tombol kamera.");
      }
    } catch (err) {
      next.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
      setCaptureError(
        err instanceof Error ? err.message : "Gagal memproses foto."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeDoc(id: string) {
    const target = docs.find((doc) => doc.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(docs.filter((doc) => doc.id !== id));
  }

  return (
    <div className="verified-capture">
      <div className={`capture-status ${coords ? "ready" : "pending"}`}>
        {coords ? (
          <>
            <MapPin aria-hidden="true" />
            <span>
                {formatCoord(coords.lat, "U", "S")} ·{" "}
                {formatCoord(coords.lng, "T", "B")} · ±
                {Math.round(coords.accuracyM)} m
              </span>
            <button
              type="button"
              className="link-button"
              onClick={refreshCoords}
              disabled={gpsBusy}
            >
              <RefreshCw /> refresh
            </button>
          </>
        ) : (
          <>
            <MapPin aria-hidden="true" />
            <span>
              {gpsError
                ? gpsError
                : gpsBusy
                ? "Mengambil lokasi…"
                : "Lokasi belum tersedia"}
            </span>
            <button
              type="button"
              className="link-button"
              onClick={refreshCoords}
              disabled={gpsBusy}
            >
              <RefreshCw /> ambil lokasi
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        disabled={busy || gpsBusy || !coords}
        onChange={(e) => handleFiles(e.currentTarget.files)}
      />
      {helperText ? <small className="capture-helper">{helperText}</small> : null}
      {captureError ? <div className="form-error">{captureError}</div> : null}
      {docs.length ? (
        <ul className="file-list">
          {docs.map((doc) => (
            <li key={doc.id} className="verified-doc">
              {/* Local blob previews should not pass through the image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.previewUrl}
                alt={`Foto bukti ${doc.filename}`}
                width={80}
                height={80}
              />
              <div className="verified-doc-meta">
                <strong>{doc.filename}</strong>
                <small>
                  {(doc.size / 1024).toFixed(1)} KB ·{' '}
                  {new Date(doc.capturedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                </small>
                <small>
                  {formatCoord(doc.capturedLat, 'U', 'S')} ·{' '}
                  {formatCoord(doc.capturedLng, 'T', 'B')} ·{' '}
                  {doc.capturedAccuracyM === null
                    ? 'akurasi tidak tersedia'
                    : `±${Math.round(doc.capturedAccuracyM)} m`}
                </small>
              </div>
              <button
                type="button"
                className="link-button"
                onClick={() => removeDoc(doc.id)}
                aria-label={`Hapus ${doc.filename}`}
              >
                <Trash2 /> hapus
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!coords && !busy ? (
        <div className="capture-banner">
          <Camera aria-hidden="true" />
          <p>
            <strong>Tambahkan foto bukti dengan lokasi pencatatan.</strong>
            <span>
              Pilih ambil lokasi, lalu ambil foto di ponsel atau unggah foto di
              laptop. Stempel menunjukkan waktu dan lokasi pencatatan saat ini,
              bukan bukti lokasi asli foto maupun persetujuan verifikator.
            </span>
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="link-button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || gpsBusy || !coords}
      >
        <Camera /> {busy ? 'Memproses…' : 'Ambil / unggah foto bukti'}
      </button>
    </div>
  );
}
