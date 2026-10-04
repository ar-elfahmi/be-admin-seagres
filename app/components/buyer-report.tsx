"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { reportIssue } from "../actions";

export function BuyerDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="sg-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onClose();
  }}>
    <div className="sg-dialog-head"><h2 id={titleId}>{title}</h2><button type="button" className="sg-icon-button" onClick={onClose} aria-label="Tutup dialog"><X /></button></div>
    <div className="sg-dialog-body">{children}</div>
  </dialog>;
}

export function BuyerReport({ lotId, context }: { lotId?: string; context?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (context) data.set("description", `${context}\n${data.get("description")}`);
    setBusy(true); setError("");
    try {
      const result = await reportIssue(data);
      if (result.error) setError(result.error);
      else setDone(result.report?.id || "tercatat");
    } catch { setError("Laporan belum terkirim. Silakan coba lagi."); }
    finally { setBusy(false); }
  }
  return <>
    <button className="sg-text-button" onClick={() => { setError(""); setDone(""); setOpen(true); }}>Laporkan masalah</button>
    {open ? <BuyerDialog title="Laporkan masalah" onClose={() => { if (!busy) setOpen(false); }}>
      {done ? <div className="sg-empty"><Check size={30} /><h3>Laporan terkirim</h3><p>Nomor laporan: {done}. Laporanmu tersimpan untuk ditindaklanjuti.</p><button className="sg-primary" onClick={() => setOpen(false)}>Selesai</button></div> :
        <form className="sg-form" onSubmit={submit}>
          {lotId ? <input type="hidden" name="lotId" value={lotId} /> : null}
          <p className="sg-muted">Jelaskan kendalanya. Jangan sertakan kata sandi atau informasi pembayaran sensitif.</p>
          <label>Jenis masalah<select name="category" required defaultValue=""><option value="" disabled>Pilih jenis masalah</option><option>Mutu produk</option><option>Keterlambatan</option><option>Ketidaksesuaian</option><option>Lainnya</option></select></label>
          <label>Detail masalah<textarea name="description" required minLength={10} maxLength={2000} placeholder="Ceritakan kendala yang kamu alami (minimal 10 karakter)" /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="sg-primary" type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim laporan"}</button>
        </form>}
    </BuyerDialog> : null}
  </>;
}
