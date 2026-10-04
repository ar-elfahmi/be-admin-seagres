// Helper murni untuk membakar overlay (timestamp + GPS + identitas + peta
// mini) ke foto hasil capture. Dipakai oleh VerifiedPhotoCapture. Tanpa
// dependency eksternal — render ke <canvas> di klien. Peta mini adalah
// ilustrasi (offline), koordinat teks yang terbakar adalah bukti utama.

export interface CaptureContext {
  actorName: string;
  productLabel: string;
  capturedAt: Date;
  lat: number;
  lng: number;
  accuracyM: number | null;
}

export interface OverlayResult {
  blob: Blob;
  width: number;
  height: number;
}

const TILE_SIZE = 96;
const PADDING = 16;

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss} WIB`;
}

function formatCoord(value: number, positive: string, negative: string): string {
  const sign = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  return `${abs.toFixed(5)}° ${sign}`;
}

function formatAccuracy(m: number | null): string {
  if (m === null || Number.isNaN(m)) return "±? m";
  if (m < 1000) return `±${Math.round(m)} m`;
  return `±${(m / 1000).toFixed(1)} km`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal decode gambar."));
      img.src = url;
    });
    return img;
  } finally {
    // Image keeps the object URL alive via src; release after decode.
  }
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  size: number,
  lat: number,
  lng: number
): void {
  // Outer frame
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(originX, originY, size, size);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(originX + 0.5, originY + 0.5, size - 1, size - 1);

  // Grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const gx = originX + (size * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, originY);
    ctx.lineTo(gx, originY + size);
    ctx.stroke();
    const gy = originY + (size * i) / 4;
    ctx.beginPath();
    ctx.moveTo(originX, gy);
    ctx.lineTo(originX + size, gy);
    ctx.stroke();
  }

  // Crosshair at marker
  const cx = originX + size / 2;
  const cy = originY + size / 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx, cy + 12);
  ctx.stroke();

  // Marker pin
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export async function renderOverlay(
  file: File,
  ctx: CaptureContext
): Promise<OverlayResult> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas 2D.");

  context.drawImage(img, 0, 0);

  const w = canvas.width;
  const h = canvas.height;

  // Banner sizing — scale to image so it looks consistent on portrait or landscape.
  const bannerH = Math.max(120, Math.round(h * 0.14));
  const bannerY = h - bannerH;

  // Translucent backdrop
  context.fillStyle = "rgba(15, 23, 42, 0.78)";
  context.fillRect(0, bannerY, w, bannerH);

  const fontBase = Math.max(14, Math.round(h / 36));
  context.fillStyle = "white";
  context.textBaseline = "top";
  context.font = `600 ${fontBase + 2}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.fillText(formatTimestamp(ctx.capturedAt), PADDING, bannerY + PADDING);

  context.font = `500 ${fontBase}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.fillStyle = "rgba(226, 232, 240, 0.95)";
  context.fillText(
    `${formatCoord(ctx.lat, "U", "S")}  ${formatCoord(ctx.lng, "T", "B")}  ${formatAccuracy(ctx.accuracyM)}`,
    PADDING,
    bannerY + PADDING + (fontBase + 6)
  );

  context.fillStyle = "rgba(226, 232, 240, 0.9)";
  context.fillText(
    `Pengepul: ${truncate(ctx.actorName, 32)}`,
    PADDING,
    bannerY + PADDING + (fontBase + 6) * 2
  );
  context.fillText(
    `Produk: ${truncate(ctx.productLabel, 38)}`,
    PADDING,
    bannerY + PADDING + (fontBase + 6) * 3
  );

  // Mini map on the right
  const mapSize = Math.min(bannerH - PADDING * 2, TILE_SIZE);
  drawMiniMap(
    context,
    w - mapSize - PADDING,
    bannerY + PADDING,
    mapSize,
    ctx.lat,
    ctx.lng
  );

  URL.revokeObjectURL(img.src);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Gagal meng-encode gambar ke JPEG."));
      },
      "image/jpeg",
      0.9
    );
  });

  return { blob, width: w, height: h };
}