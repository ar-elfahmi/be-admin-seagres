import type { ProductDetail } from "./types";
import { offsetPriceDay, priceDay } from "./price-periods";

/** A sale is an actual negative ledger entry, never a process-stage label alone. */
export function collectorAnalytics(products: ProductDetail[], category: string, today: string) {
  const days = Array.from({ length: 7 }, (_, index) => offsetPriceDay(today, index - 6));
  const volumes = new Map(days.map((day) => [day, 0]));
  const top: Array<{ id: string; name: string; qty: number; type: string }> = [];
  for (const product of products) {
    if (category !== "Semua" && product.type !== category) continue;
    let monthly = 0;
    for (const event of product.history) {
      if (event.kind !== "jual" || !Number.isFinite(event.quantityDelta) || event.quantityDelta >= 0) continue;
      const day = priceDay(new Date(event.createdAt));
      if (!day || day > today) continue;
      const quantity = -event.quantityDelta;
      if (volumes.has(day)) volumes.set(day, volumes.get(day)! + quantity);
      if (day.slice(0, 7) === today.slice(0, 7)) monthly += quantity;
    }
    if (monthly > 0) top.push({ id: product.id, name: product.name, qty: monthly, type: product.type });
  }
  return { days, series: days.map((day) => Math.round(volumes.get(day)! * 10) / 10), top: top.sort((a, b) => b.qty - a.qty).slice(0, 5) };
}
