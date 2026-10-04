"use client";

import { Plus, MapPin, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addHistoryEventAction } from "../../actions";
import { HISTORY_STAGES, HISTORY_STAGE_LABELS, type HistoryStage } from "../../../lib/types";

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
}

export default function AddEventForm({ productId, subProductId }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<HistoryStage>(HISTORY_STAGES[0]);
  const [note, setNote] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("0");
  const [geo, setGeo] = useState<GeoEntry[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
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
    const data = new FormData();
    data.set("stage", stage);
    data.set("note", note);
    data.set("quantityDelta", quantityDelta);
    geo.forEach((entry, index) => {
      if (entry.lat && entry.lng) {
        data.set(`geoLat[${index}]`, entry.lat);
        data.set(`geoLng[${index}]`, entry.lng);
        data.set(`geoLabel[${index}]`, entry.label);
      }
    });
    for (const entry of docs) {
      data.append("documents[]", entry.file);
    }
    setBusy(true);
    try {
      const res = await addHistoryEventAction(productId, subProductId, data);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNote("");
      setQuantityDelta("0");
      setGeo([]);
      setDocs([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error ? <div className="form-error">{error}</div> : null}
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
      <div className="form-grid">
        <label>
          Perubahan kuantitas (kg) <small>(opsional, + atau -)</small>
          <input
            type="number"
            step="0.1"
            value={quantityDelta}
            onChange={(e) => setQuantityDelta(e.target.value)}
          />
        </label>
      </div>
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

      <label>
        Dokumen pendukung (foto / PDF)
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
