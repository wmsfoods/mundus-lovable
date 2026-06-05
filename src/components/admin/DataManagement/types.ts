export type AdminColumn<T> = {
  key: string;
  label: string;
  width?: number | string;
  render: (row: T) => React.ReactNode;
  sortKey?: string;
};

export type AdminFilters = Record<string, string | undefined | null>;

export type SortDir = "asc" | "desc";

export type AdminQueryArgs = {
  table: string;
  columns: string;
  filters?: AdminFilters;
  search?: { columns: string[]; value: string };
  dateRange?: { column: string; from?: string; to?: string };
  includeTrash: boolean;
  sort: { column: string; dir: SortDir };
  page: number;
  pageSize: number;
};