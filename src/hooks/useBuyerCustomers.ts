/**
 * useBuyerCustomers — temporary localStorage-backed store.
 * Swap to Supabase when `buyer_customers` table is created.
 */
import { useCallback, useEffect, useState } from "react";

export type BuyerCustomer = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  active: boolean;
  invitedAt: string;
};

export type BuyerCustomerInput = Omit<BuyerCustomer, "id" | "active" | "invitedAt">;

const STORAGE_KEY = "mundus.buyer.customers.v1";

function load(): BuyerCustomer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is BuyerCustomer =>
        c &&
        typeof c.id === "string" &&
        typeof c.company === "string" &&
        typeof c.contact === "string" &&
        typeof c.email === "string" &&
        typeof c.phone === "string" &&
        typeof c.country === "string" &&
        typeof c.active === "boolean" &&
        typeof c.invitedAt === "string",
    );
  } catch {
    return [];
  }
}

function save(items: BuyerCustomer[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useBuyerCustomers() {
  const [customers, setCustomers] = useState<BuyerCustomer[]>(() => load());

  useEffect(() => {
    save(customers);
  }, [customers]);

  const add = useCallback((input: BuyerCustomerInput) => {
    const next: BuyerCustomer = {
      id: genId(),
      ...input,
      active: false,
      invitedAt: new Date().toISOString(),
    };
    setCustomers((prev) => [next, ...prev]);
    return next;
  }, []);

  const update = useCallback((id: string, patch: Partial<BuyerCustomer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const toggleActive = useCallback((id: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  }, []);

  const remove = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { customers, add, update, toggleActive, remove };
}