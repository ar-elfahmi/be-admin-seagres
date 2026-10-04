export const MAX_EVIDENCE_BYTES = 6 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 8;

/** Shared by the server and upload UI; the request limit includes multipart overhead. */
export function uploadBudgetError(files: readonly { size: number }[], otherBytes = 0): string | null {
  if (files.length > MAX_EVIDENCE_FILES) return "Maksimal 8 berkas bukti dalam satu penyimpanan.";
  if (files.some((file) => !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_EVIDENCE_BYTES)) return "Setiap berkas bukti harus berukuran lebih dari 0 dan maksimal 6 MB.";
  if (files.reduce((sum, file) => sum + file.size, otherBytes) > MAX_UPLOAD_BYTES) return "Total foto dan bukti maksimal 20 MB. Kurangi berkas lalu simpan kembali.";
  return null;
}

/** MIME supplied by a browser is not enough: reject clearly mismatched content. */
export function fileContentMatches(type: string, bytes: Uint8Array): boolean {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (type) {
    case "image/jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": return [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte);
    case "image/webp": return text(0,4) === "RIFF" && text(8,12) === "WEBP";
    case "image/gif": return ["GIF87a", "GIF89a"].includes(text(0,6));
    case "application/pdf": return text(0,5) === "%PDF-";
    default: return false;
  }
}
