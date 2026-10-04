"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, RefreshCw, Trash2 } from "lucide-react";
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

interface Coords {
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
  helperText,
}: Props) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    refreshCoords();
    // revoke preview URLs on unmount
    return () => {
      docs.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          capturedAt: new Date(pos.timestamp).toISOString(),
        });
        setGpsBusy(false);
      },
      (err) => {
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
    setCaptureError(null);
    setBusy(true);
    try {
      const next: VerifiedDoc[] = [];
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
        onChange([...docs, ...next]);
      } else {
        setCaptureError("File bukan gambar. Ambil foto lewat tombol kamera.");
      }
    } catch (err) {
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
        disabled={busy || !coords}
        onChange={(e) => handleFiles(e.currentTarget.files)}
      />
      {helperText ? <small className="capture-helper">{helperText}</small> : null}
      {captureError ? <div className="form-error">{captureError}</div> : null}
      {docs.length ? (
        <ul className="file-list">
          {docs.map((doc) => (
            <li key={doc.id} className="verified-doc">
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
                  {new Date(doc.capturedAt).toLocaleString('id-ID')}
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
            <strong>Ambil foto bukti langsung dari kamera.</strong>
            <span>
              Aktifkan izin GPS pada browser lalu pilih tombol kamera. Foto
              otomatis dibakar dengan stempel waktu, koordinat, dan identitas
              pengepul.
            </span>
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="link-button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || !coords}
      >
        <Camera /> {busy ? 'Memproses…' : 'Ambil foto lagi'}
      </button>
    </div>
  );
}