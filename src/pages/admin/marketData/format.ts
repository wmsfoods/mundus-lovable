// pt-BR formatting helpers for the Market Data BI module.

export function fmtTon(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n));
}

export function fmtUsdCompact(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e9) return "US$ " + (v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " bi";
  if (abs >= 1e6) return "US$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (abs >= 1e3) return "US$ " + (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  return "US$ " + v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function fmtCompactNumber(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " bi";
  if (abs >= 1e6) return (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (abs >= 1e3) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  return "US$ " + new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n)) + "/t";
}

export function fmtPercent(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n)) + "%";
}

export function fmtMonth(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export function pctDelta(curr: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function truncate(s: string, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}