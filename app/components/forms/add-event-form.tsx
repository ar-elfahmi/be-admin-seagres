"use client";

import { Plus, MapPin, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addHistoryEventAction } from "../../actions";
import { HISTORY_STAGES, HISTORY_STAGE_LABELS, type HistoryStage } from "../../../lib/types";
import VerifiedPhotoCapture, { type VerifiedDoc } from "../verified-photo-capture";

interface GeoEntry {
  id: string;
  lat: string;
  lng: string;
  label: string;
}

interface DocEntry {
  id: string;
  name: string;
  size: number;
  file: File;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  productId: string;
  subProductId: string;
  actorName: string;
  productLabel: string;
}

export default function AddEventForm({ productId, subProductId, actorName, productLabel }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<HistoryStage>(HISTORY_STAGES[0]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<VerifiedDoc[]>([]);
  const [geo, setGeo] = useState<GeoEntry[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function addGeo() {
    setGeo((current) => current.concat({ id: newId(), lat: "", lng: "", label: "" }));
  }
  function removeGeo(id: string) {
    setGeo((current) => current.filter((entry) => entry.id !== id));
  }
  function updateGeo(id: string, patch: Partial<GeoEntry>) {
    setGeo((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }
  function captureGeolocation(id: string) {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateGeo(id, {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
      },
      () => setError("Tidak bisa mendapatkan lokasi."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function addDocs(files: FileList | null) {
    if (!files) return;
    const next: DocEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      next.push({ id: newId(), name: file.name, size: file.size, file });
    }
    setDocs((current) => current.concat(next));
  }
  function removeDoc(id: string) {
    setDocs((current) => current.filter((entry) => entry.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const data = new FormData();
    data.set("stage", stage);
    data.set("note", note);
    data.set("quantityDelta", "0");
    if (geo.some((entry) => Boolean(entry.lat) !== Boolean(entry.lng))) {
      setError("Isi latitude dan longitude lengkap, atau hapus titik yang belum selesai.");
      return;
    }
    geo.filter((entry) => entry.lat && entry.lng).forEach((entry, index) => {
        data.set(`geoLat[${index}]`, entry.lat);
        data.set(`geoLng[${index}]`, entry.lng);
        data.set(`geoLabel[${index}]`, entry.label);
    });
    for (const entry of photos) data.append("documents[]", entry.blob, entry.filename);
    for (const entry of docs) {
      data.append("documents[]", entry.file);
    }
    data.set("documentsMeta", JSON.stringify([...photos.map((entry) => ({ capturedAt: entry.capturedAt, capturedLat: entry.capturedLat, capturedLng: entry.capturedLng, capturedAccuracyM: entry.capturedAccuracyM })), ...docs.map(() => ({}))]));
    setBusy(true);
    try {
      const res = await addHistoryEventAction(productId, subProductId, data);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNote("");
      setGeo([]);
      setDocs([]);
      setPhotos([]);
      setSuccess(res.warning || "Riwayat proses tersimpan.");
      router.refresh();
    } catch {
      setError("Riwayat belum dapat disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error ? <div className="form-error">{error}</div> : null}
      {success ? <p role="status" className="form-success">{success}</p> : null}
      <label>
        Stage event
        <select value={stage} onChange={(e) => setStage(e.target.value as HistoryStage)}>
          {HISTORY_STAGES.map((s) => (
            <option key={s} value={s}>
              {HISTORY_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">Riwayat proses tidak mengubah stok. Gunakan Terima untuk penerimaan baru, atau Jual untuk mengurangi stok sekaligus mencatat penjualan.</p>
      <label>
        Catatan <small>(opsional)</small>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: Pendaratan di PPS Ujungpangkah" />
      </label>

      <fieldset className="quality-block">
        <legend>Bukti geotag</legend>
        {geo.length ? (
          <ul className="file-list">
            {geo.map((entry, index) => (
              <li key={entry.id}>
                <div className="form-grid">
                  <label>
                    Latitude
                    <input
                      type="number"
                      step="0.000001"
                      value={entry.lat}
                      onChange={(e) => updateGeo(entry.id, { lat: e.target.value })}
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      type="number"
                      step="0.000001"
                      value={entry.lng}
                      onChange={(e) => updateGeo(entry.id, { lng: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Label <small>(opsional)</small>
                  <input
                    value={entry.label}
                    onChange={(e) => updateGeo(entry.id, { label: e.target.value })}
                    placeholder="ex: Pendaratan PPS"
                  />
                </label>
                <button type="button" className="link-button" onClick={() => captureGeolocation(entry.id)}>
                  <MapPin /> Ambil titik {index + 1}
                </button>
                <button type="button" className="link-button" onClick={() => removeGeo(entry.id)}>
                  <X /> Hapus titik
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Belum ada titik geotag.</p>
        )}
        <button type="button" className="link-button" onClick={addGeo}>
          <Plus /> Tambah titik geotag
        </button>
      </fieldset>

      <VerifiedPhotoCapture actorName={actorName} productLabel={productLabel} docs={photos} onChange={setPhotos}
        onCoords={(coords) => setGeo((current) => current.length ? current : [{ id: newId(), lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6), label: "Lokasi pencatatan" }])} />

      <label>
        Berkas pendukung tambahan (foto / PDF, tanpa klaim geotag)
        <input
          className="file-input"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => addDocs(e.currentTarget.files)}
        />
      </label>
      {docs.length ? (
        <ul className="file-list">
          {docs.map((entry) => (
            <li key={entry.id}>
              {entry.name} <small>{(entry.size / 1024).toFixed(1)} KB</small>
              <button type="button" className="link-button" onClick={() => removeDoc(entry.id)}>
                <X /> hapus
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button className="primary-button form-submit" type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : <><Plus /> Catat event</>}
      </button>
    </form>
  );
}
