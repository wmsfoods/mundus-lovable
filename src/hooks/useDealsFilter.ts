import { useMemo } from "react";

export type DealsFilterState = {
  q: string;
  status: string | null; // null = all
  dealId: string;
  products: string[];
  parties: string[]; // buyer or supplier names
  origins: string[]; // origin port or country
  destinations: string[]; // destination port or country
  dateFrom: string | null; // ISO yyyy-mm-dd
  dateTo: string | null;
};

export const EMPTY_FILTER: DealsFilterState = {
  q: "",
  status: null,
  dealId: "",
  products: [],
  parties: [],
  origins: [],
  destinations: [],
  dateFrom: null,
  dateTo: null,
};

export type DealAccessor<T> = {
  dealId: (it: T) => string;
  product: (it: T) => string;
  party: (it: T) => string;
  origin: (it: T) => string;
  destination: (it: T) => string;
  status: (it: T) => string;
  date: (it: T) => Date | null;
};

function tryParseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  // Accept ISO (yyyy-mm-dd) and US (mm/dd/yyyy)
  const iso = /^\d{4}-\d{2}-\d{2}/.test(v);
  if (iso) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v);
  if (us) {
    const [, mm, dd, yy] = us;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d = new Date(year, Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function dateAccessorFromString<T>(get: (it: T) => string) {
  return (it: T) => tryParseDate(get(it));
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function countActiveFilters(f: DealsFilterState): number {
  let n = 0;
  if (f.dealId.trim()) n++;
  if (f.products.length) n++;
  if (f.parties.length) n++;
  if (f.origins.length) n++;
  if (f.destinations.length) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

export function useDealsFilter<T>(
  items: T[],
  filter: DealsFilterState,
  acc: DealAccessor<T>,
) {
  // Apply non-status filters first (status is the chip row; its counts depend on the others).
  const baseFiltered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    const dealQ = filter.dealId.trim().toLowerCase();
    const from = filter.dateFrom ? tryParseDate(filter.dateFrom) : null;
    const to = filter.dateTo ? tryParseDate(filter.dateTo) : null;

    return items.filter((it) => {
      if (q) {
        const hay = [
          acc.dealId(it),
          acc.product(it),
          acc.party(it),
          acc.origin(it),
          acc.destination(it),
          acc.status(it),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dealQ && !acc.dealId(it).toLowerCase().includes(dealQ)) return false;
      if (filter.products.length && !filter.products.includes(acc.product(it)))
        return false;
      if (filter.parties.length && !filter.parties.includes(acc.party(it)))
        return false;
      if (filter.origins.length && !filter.origins.includes(acc.origin(it)))
        return false;
      if (
        filter.destinations.length &&
        !filter.destinations.includes(acc.destination(it))
      )
        return false;
      if (from || to) {
        const d = acc.date(it);
        if (!d) return false;
        if (from && d < from) return false;
        if (to) {
          const end = new Date(to);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
      return true;
    });
  }, [items, filter, acc]);

  const filtered = useMemo(() => {
    if (!filter.status) return baseFiltered;
    return baseFiltered.filter((it) => acc.status(it) === filter.status);
  }, [baseFiltered, filter.status, acc]);

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of baseFiltered) {
      const s = acc.status(it);
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
  }, [baseFiltered, acc]);

  const options = useMemo(() => {
    return {
      products: uniqSorted(items.map(acc.product)),
      parties: uniqSorted(items.map(acc.party)),
      origins: uniqSorted(items.map(acc.origin)),
      destinations: uniqSorted(items.map(acc.destination)),
      statuses: uniqSorted(items.map(acc.status)),
    };
  }, [items, acc]);

  return { filtered, statusCounts, options, totalBeforeStatus: baseFiltered.length };
}