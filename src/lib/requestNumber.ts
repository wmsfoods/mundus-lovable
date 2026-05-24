export function formatRequestNumber(
  num: number | null | undefined,
  createdAt?: string | null,
): string {
  const n = num ?? 0;
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `R-${String(n).padStart(6, "0")}-${year}`;
}