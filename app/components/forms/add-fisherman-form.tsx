"use client";

import { Plus, MapPin, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addSubProductAction } from "../../actions";
import type { ProductDetail } from "../../../lib/types";

interface Props {
  productId: string;
  lockedProductName?: string;
  onSaved?: (detail: ProductDetail) => void;
}

interface DocEntry {
  id: string;
  name: string;
  size: number;
  file: File;
}

function newDocId() {
  return Math.random().toString(36).slice(2, 10);
}

const PACKAGING_OPTIONS = [
  "Es & box food grade",
  "Keranjang bersih",
  "Kemasan olahan tersegel",
  "Standar pengepul",
];
export default function AddFishermanForm({ productId, lockedProductName, onSaved }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fishermanName, setFishermanName] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [price, setPrice] = useState("");
  const [minOrderKg, setMinOrderKg] = useState("1");
  const [grade, setGrade] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cleanHandling, setCleanHandling] = useState(true);
  const [packaging, setPackaging] = useState(PACKAGING_OPTIONS[0]);
  const [temperature, setTemperature] = useState("");
  const [dispatch, setDispatch] = useState("");
  const [note, setNote] = useState("");
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function captureGeolocation() {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
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
      next.push({ id: newDocId(), name: file.name, size: file.size, file });
    }
    setDocs((current) => current.concat(next));
  }

  function removeDoc(id: string) {
    setDocs((current) => current.filter((entry) => entry.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!fishermanName.trim()) {
      setError("Nama nelayan wajib diisi.");
      return;
    }
    const data = new FormData();
    data.set("fishermanName", fishermanName.trim());
    data.set("name", lockedProductName ? "" : name.trim());
    data.set("quantity", quantity);
    data.set("price", price);
    data.set("minOrderKg", minOrderKg);
    if (grade) data.set("grade", grade);
    if (lat) data.set("geoLat", lat);
    if (lng) data.set("geoLng", lng);
    if (cleanHandling) data.set("qualityClean", "on");
    data.set("qualityPackaging", packaging);
    data.set("qualityTemperature", temperature);
    data.set("qualityDispatch", dispatch);
    if (note) data.set("historyNote", note);
    for (const entry of docs) {
      data.append("documents[]", entry.file);
    }
    setBusy(true);
    try {
      const res = await addSubProductAction(productId, data);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setFishermanName("");
      setName("");
      setQuantity("0");
      setPrice("");
      setMinOrderKg("1");
      setGrade("");
      setLat("");
      setLng("");
      setTemperature("");
      setDispatch("");
      setNote("");
      setDocs([]);
      router.refresh();
      if (res.detail) onSaved?.(res.detail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {lockedProductName ? (
        <div className="sell-banner">
          <Plus aria-hidden="true" />
          <p>
            <strong>{lockedProductName}</strong>
            <span>Hanya tambah sumber nelayan ke produk ini.</span>
          </p>
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
      {lockedProductName ? (
        <label>
          Nama nelayan
          <input
            value={fishermanName}
            onChange={(e) => setFishermanName(e.target.value)}
            placeholder="ex: Pak Hasan"
            required
          />
        </label>
      ) : (
        <div className="form-grid">
          <label>
            Nama produk <small>(opsional, default nama produk)</small>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Bandeng segar" />
          </label>
          <label>
            Nama nelayan
            <input
              value={fishermanName}
              onChange={(e) => setFishermanName(e.target.value)}
              placeholder="ex: Pak Hasan"
              required
            />
          </label>
        </div>
      )}
      <div className="form-grid">
        <label>
          Kuantitas (kg)
          <input
            type="number"
            min="0"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label>
          Harga dari nelayan (Rp/kg)
          <input
            type="number"
            min="0"
            step="500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="opsional, default harga produk"
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Minimum pembelian (kg)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={minOrderKg}
            onChange={(e) => setMinOrderKg(e.target.value)}
            required
          />
        </label>
        <label>
          Grade <small>(opsional)</small>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">— tanpa grade —</option>
            <option value="A">A (terbaik)</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Latitude
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="opsional"
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="opsional"
          />
        </label>
      </div>
      <fieldset className="quality-block">
        <legend>Mutu & penanganan</legend>
        <label className="check-line">
          <input
            type="checkbox"
            checked={cleanHandling}
            onChange={(e) => setCleanHandling(e.target.checked)}
          />
          Penanganan bersih
        </label>
        <div className="form-grid">
          <label>
            Kemasan
            <select value={packaging} onChange={(e) => setPackaging(e.target.value)}>
              {PACKAGING_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label>
            Suhu penyimpanan
            <input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="ex: 0–4 °C" />
          </label>
        </div>
        <label>
          Metode pengiriman
          <input value={dispatch} onChange={(e) => setDispatch(e.target.value)} placeholder="ex: Mobil box berpendingin" />
        </label>
      </fieldset>
      <button className="link-button" type="button" onClick={captureGeolocation}>
        <MapPin /> Ambil titik lokasi dari browser
      </button>
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
              <button
                type="button"
                className="link-button"
                onClick={() => removeDoc(entry.id)}
                aria-label={`Hapus ${entry.name}`}
              >
                <X /> hapus
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label>
        Catatan event <small>(opsional)</small>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: Hasil tangkapan 2 April" />
      </label>
      <button className="primary-button form-submit" type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : <><Plus /> Catat sumber nelayan</>}
      </button>
    </form>
  );
}
