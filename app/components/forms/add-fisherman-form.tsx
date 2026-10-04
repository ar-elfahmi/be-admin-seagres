"use client";

import { Plus, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addSubProductAction } from "../../actions";
import type { ProductDetail } from "../../../lib/types";
import VerifiedPhotoCapture, {
  type VerifiedDoc,
} from "../verified-photo-capture";

interface Props {
  productId: string;
  lockedProductName?: string;
  actorName?: string;
  productLabel?: string;
  onSaved?: (detail: ProductDetail) => void;
}

const PACKAGING_OPTIONS = [
  "Es & box food grade",
  "Keranjang bersih",
  "Kemasan olahan tersegel",
  "Standar pengepul",
];
export default function AddFishermanForm({
  productId,
  lockedProductName,
  actorName,
  productLabel,
  onSaved,
}: Props) {
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
  const [docs, setDocs] = useState<VerifiedDoc[]>([]);
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
      data.append("documents[]", entry.blob, entry.filename);
    }
    const metas = docs.map((entry) => ({
      capturedAt: entry.capturedAt,
      capturedLat: entry.capturedLat,
      capturedLng: entry.capturedLng,
      capturedAccuracyM: entry.capturedAccuracyM,
    }));
    data.set("documentsMeta", JSON.stringify(metas));
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
          Harga per kg <small>(wajib)</small>
          <input
            type="number"
            min="1000"
            step="500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex: 28000"
            required
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
          Penanganan bersih (ikan tidak rusak, tanpa es kotor)
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
          Metode pengiriman ke pembeli
          <input value={dispatch} onChange={(e) => setDispatch(e.target.value)} placeholder="ex: Mobil box berpendingin" />
        </label>
      </fieldset>
      <button className="link-button" type="button" onClick={captureGeolocation}>
        <MapPin /> Ambil titik lokasi dari browser
      </button>
      <VerifiedPhotoCapture
        actorName={actorName ?? "Pengepul"}
        productLabel={
          (productLabel ?? lockedProductName ?? name) || "Produk pengepul"
        }
        docs={docs}
        onChange={setDocs}
        helperText="Aktifkan GPS lalu ambil foto lewat tombol kamera. Foto otomatis dibakar stempel waktu, lokasi, dan identitas pengepul."
      />
      <label>
        Catatan event <small>(opsional)</small>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: Hasil tangkapan 2 April" rows={3} />
      </label>
      <button className="primary-button form-submit" type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : <><Plus /> Catat sumber nelayan</>}
      </button>
    </form>
  );
}
