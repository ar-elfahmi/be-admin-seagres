"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { addHistoryEventAction } from "@/app/actions";
import { HISTORY_STAGES, HISTORY_STAGE_LABELS, type HistoryStage } from "@/lib/types";
interface Props {
  productId: string;
  subProductId: string;
}

export default function TambahRiwayatButton({ productId, subProductId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<HistoryStage>(HISTORY_STAGES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData();
    data.set("stage", stage);
    data.set("note", note);
    data.set("quantityDelta", "0");
    setBusy(true);
    try {
      const res = await addHistoryEventAction(productId, subProductId, data);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNote("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Riwayat belum dapat disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="link-button" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> Tambah riwayat
      </button>
    );
  }

  return (
    <form className="form receipt-event-form" onSubmit={submit}>
      <header>
        <strong>Tambah riwayat</strong>
        <button type="button" className="icon-button" aria-label="Tutup" onClick={() => setOpen(false)}>
          <X />
        </button>
      </header>
      {error ? <div className="form-error">{error}</div> : null}
      <label>
        Status
        <select value={stage} onChange={(e) => setStage(e.target.value as HistoryStage)}>
          {HISTORY_STAGES.map((value) => (
            <option key={value} value={value}>
              {HISTORY_STAGE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Catatan
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ex: kapal bersandar di Tambak 07:20"
        />
      </label>
      <p className="hint">Riwayat proses tidak mengubah stok. Catat perubahan jumlah melalui Terima atau Jual.</p>
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          Batal
        </button>
      </div>
    </form>
  );
}
