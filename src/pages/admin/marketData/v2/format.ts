// pt-BR compact formatting helpers

export function fmtTonCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi ton";
  if (abs >= 1e3) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil ton";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " ton";
}

export function fmtTon(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n));
}

export function fmtUsdCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e9) return "US$ " + (v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " bi";
  if (abs >= 1e6) return "US$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (abs >= 1e3) return "US$ " + (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  return "US$ " + v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function fmtCompactNumber(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (abs >= 1e3) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "—";
  return "US$ " + new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n)) + "/t";
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n)) + "%";
}

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function fmtMonth(yyyymm: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(yyyymm ?? "");
  if (!m) return yyyymm ?? "";
  const y = m[1].slice(2);
  const mo = parseInt(m[2], 10) - 1;
  return `${MONTH_LABELS[mo] ?? m[2]}/${y}`;
}

export function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

export function truncate(s: string, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function hsLabel(code: string): { code: string; name: string } {
  // "02023000 - CARNES BOVINAS..." → split
  const idx = code.indexOf(" - ");
  if (idx > 0) return { code: code.slice(0, idx), name: code.slice(idx + 3) };
  return { code, name: "" };
}

// CSV export helper
export function downloadCsv(filename: string, rows: any[], columns?: { key: string; label: string }[]) {
  if (!rows?.length) return;
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.map((c) => esc(c.label)).join(";");
  const lines = rows.map((r) => cols.map((c) => esc(r[c.key])).join(";"));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function periodCaption(rows: { month: string }[] | undefined): string | null {
  if (!rows?.length) return null;
  const last = rows[rows.length - 1].month;
  return last ? `Dados até ${fmtMonth(last)}` : null;
}