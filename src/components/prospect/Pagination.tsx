export function PspPagination({
  total, page, pageSize, onChange,
}: { total: number; page: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const nums: number[] = [];
  const add = (n: number) => { if (!nums.includes(n) && n >= 1 && n <= pages) nums.push(n); };
  add(1); add(2);
  for (let i = page - 1; i <= page + 1; i++) add(i);
  add(pages - 1); add(pages);
  return (
    <div className="psp-pagination">
      <div>Showing {start}-{end} of {total.toLocaleString()}</div>
      <div className="pages">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
        {nums.sort((a,b)=>a-b).map((n, i, arr) => (
          <span key={n} style={{ display: "inline-flex", gap: 4 }}>
            {i > 0 && arr[i - 1] !== n - 1 && <span style={{ padding: "0 4px", color: "var(--adm-text-tertiary)" }}>…</span>}
            <button className={n === page ? "is-active" : ""} onClick={() => onChange(n)}>{n}</button>
          </span>
        ))}
        <button disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
      </div>
    </div>
  );
}
