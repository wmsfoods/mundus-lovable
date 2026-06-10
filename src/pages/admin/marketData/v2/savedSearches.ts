import type { PanelFilters } from "./types";

const KEY = "admin.marketDataV2.savedSearches";

export type SavedSearch = {
  id: string;
  name: string;
  filters: PanelFilters;
  activeTab: string;
  createdAt: number;
};

export function loadSaved(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function persistSaved(list: SavedSearch[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export function addSaved(s: Omit<SavedSearch, "id" | "createdAt">): SavedSearch[] {
  const list = loadSaved();
  const entry: SavedSearch = { ...s, id: crypto.randomUUID(), createdAt: Date.now() };
  const next = [entry, ...list].slice(0, 30);
  persistSaved(next);
  return next;
}

export function removeSaved(id: string): SavedSearch[] {
  const next = loadSaved().filter((s) => s.id !== id);
  persistSaved(next);
  return next;
}