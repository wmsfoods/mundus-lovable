import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  const w = 1;

  push(1);
  if (page - w > 2) push("…");
  for (let p = Math.max(2, page - w); p <= Math.min(totalPages - 1, page + w); p++) {
    push(p);
  }
  if (page + w < totalPages - 1) push("…");
  if (totalPages > 1) push(totalPages);

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="pager-btn pager-arrow"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeftIcon size={16} />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="pager-gap">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`pager-btn ${p === page ? "is-active" : ""}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="pager-btn pager-arrow"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}