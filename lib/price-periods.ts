export function priceMonth(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-01`;
}

/** Current month plus six previous months, consistently using Jakarta time. */
export function priceMonths(now: Date) {
  const current = priceMonth(now);
  if (!current) throw new Error("Invalid price calendar date");
  const [year, month] = current.split("-").map(Number);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (6 - index), 1));
    return { key: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(date) };
  });
}

export function priceDay(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function offsetPriceDay(day: string, amount: number): string {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
