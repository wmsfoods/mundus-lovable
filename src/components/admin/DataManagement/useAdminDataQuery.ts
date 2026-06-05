import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdminQueryArgs } from "./types";

export type AdminDataResult<T> = {
  rows: T[];
  total: number;
};

/**
 * Generic read-only data query for the admin Data Management tabs.
 * Soft-deleted rows are excluded unless `includeTrash` is true.
 */
export function useAdminDataQuery<T = any>(args: AdminQueryArgs) {
  const {
    table, columns, filters, search, dateRange,
    includeTrash, sort, page, pageSize,
  } = args;

  return useQuery({
    queryKey: [
      "adminData", table, columns, filters, search, dateRange,
      includeTrash, sort.column, sort.dir, page, pageSize,
    ],
    queryFn: async (): Promise<AdminDataResult<T>> => {
      let q: any = (supabase as any)
        .from(table)
        .select(columns, { count: "exact" });

      if (!includeTrash) q = q.is("deleted_at", null);

      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v == null || v === "" || v === "all") continue;
          q = q.eq(k, v);
        }
      }

      if (search?.value && search.columns.length) {
        const term = search.value.replace(/[,()]/g, " ").trim();
        if (term) {
          const or = search.columns.map((c) => `${c}.ilike.%${term}%`).join(",");
          q = q.or(or);
        }
      }

      if (dateRange?.column) {
        if (dateRange.from) q = q.gte(dateRange.column, dateRange.from);
        if (dateRange.to)   q = q.lte(dateRange.column, dateRange.to);
      }

      q = q.order(sort.column, { ascending: sort.dir === "asc", nullsFirst: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as T[], total: count ?? 0 };
    },
    staleTime: 30_000,
  });
}