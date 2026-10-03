/**
 * Barcode generator untuk kartu telusur produk.
 * Dipakai server (app/actions.ts) dan klien (app/components/trace-card.tsx).
 * Tidak boleh di-export dari file "use server" (Next 16: server actions
 * wajib async).
 */
export function makeBarcode(id: string, createdAt: Date): string {
  const datePart = `${createdAt.getUTCFullYear()}${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}${String(createdAt.getUTCDate()).padStart(2, "0")}`;
  const idTail = id.replace(/-/g, "").toUpperCase().slice(-6);
  return `SG${datePart}${idTail}`;
}