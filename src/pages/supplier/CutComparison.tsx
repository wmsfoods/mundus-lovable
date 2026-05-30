import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyContext } from "@/hooks/useFamilyContext";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";

type StdProduct = { id: string; name: string };
type OwnRow = { originCountry: string; avgAsk: number | null; recentClosed: number | null; sample: number };
type BenchRow = { sample_count: number; min_usd_kg: number | null; median_usd_kg: number | null; max_usd_kg: number | null };

export default function CutComparison() {
  const fam = useFamilyContext();
  const { isAdmin } = useIsMundusAdmin();
  const allowed = fam.isGlobalDirector || isAdmin;

  const [products, setProducts] = useState<StdProduct[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [ownRows, setOwnRows] = useState<OwnRow[]>([]);
  const [bench, setBench] = useState<BenchRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("standard_products")
        .select("id, name")
        .order("name");
      setProducts((data ?? []) as StdProduct[]);
    })();
  }, []);

  useEffect(() => {
    if (!productId || !fam.familyOfficeIds.length) {
      setOwnRows([]); setBench(null); return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Own family side: offers + items joined to standard product, grouped by origin_country
      const { data: items } = await (supabase as any)
        .from("offer_items")
        .select("price, customer_products!inner(standard_product_id), offers!inner(id, supplier_id, origin_country, created_at, deleted_at)")
        .eq("customer_products.standard_product_id", productId);
      const ownItems = (items ?? []).filter((it: any) =>
        it.offers && !it.offers.deleted_at && fam.familyOfficeIds.includes(it.offers.supplier_id),
      );
      const byOrigin = new Map<string, number[]>();
      ownItems.forEach((it: any) => {
        const c = it.offers?.origin_country ?? "—";
        const arr = byOrigin.get(c) ?? [];
        arr.push(Number(it.price));
        byOrigin.set(c, arr);
      });
      const rows: OwnRow[] = Array.from(byOrigin.entries()).map(([country, prices]) => ({
        originCountry: country,
        avgAsk: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
        recentClosed: null,
        sample: prices.length,
      }));
      // Anonymized market via SECURITY DEFINER RPC
      const { data: benchData } = await (supabase as any).rpc("market_cut_benchmark", {
        p_standard_product_id: productId,
        p_destination_country: destination || null,
      });
      if (cancelled) return;
      setOwnRows(rows);
      const b = Array.isArray(benchData) && benchData.length ? (benchData[0] as BenchRow) : null;
      setBench(b);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [productId, destination, fam.familyOfficeIds.join(",")]);

  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}/kg`;

  const benchLow = bench && bench.sample_count >= 3 ? bench.min_usd_kg : null;
  const benchHigh = bench && bench.sample_count >= 3 ? bench.max_usd_kg : null;

  const insufficient = useMemo(
    () => bench != null && bench.sample_count < 3,
    [bench],
  );

  if (!allowed) {
    return (
      <>
        <Crumbs items={[{ label: "Home", to: "/supplier" }, { label: "Cut Comparison" }]} />
        <PageTitle icon={BarChart3 as any} title="Cut Comparison" />
        <div className="empty-state" style={{ padding: 24 }}>
          This view is available to Global Directors only.
        </div>
      </>
    );
  }

  return (
    <>
      <Crumbs items={[{ label: "Home", to: "/supplier" }, { label: "Cut Comparison" }]} />
      <PageTitle
        icon={BarChart3 as any}
        title="Cut Comparison"
        subtitle="Your family's plants vs the anonymized market — aggregates only, never competitor identities."
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12 }}>
          <div style={{ marginBottom: 4, color: "var(--fg-muted)" }}>Cut</div>
          <select className="btn-tb" style={{ width: "100%" }} value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select a cut…</option>
            {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </label>
        <label style={{ display: "block", fontSize: 12 }}>
          <div style={{ marginBottom: 4, color: "var(--fg-muted)" }}>Destination country (optional)</div>
          <input
            className="btn-tb"
            style={{ width: "100%" }}
            value={destination}
            placeholder="e.g. China"
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
      </div>

      <div className="data-table-wrap" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Origin</th>
              <th>Avg asking USD/kg</th>
              <th>Recent closed USD/kg</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {!productId ? (
              <tr className="empty-row"><td colSpan={4}>Pick a cut to compare.</td></tr>
            ) : loading ? (
              <tr className="empty-row"><td colSpan={4}>Loading…</td></tr>
            ) : (
              <>
                {ownRows.length === 0 ? (
                  <tr className="empty-row"><td colSpan={4}>No offers from your family for this cut yet.</td></tr>
                ) : ownRows.map((r) => (
                  <tr key={r.originCountry}>
                    <td>🏭 {r.originCountry}</td>
                    <td>{fmt(r.avgAsk)}</td>
                    <td>{fmt(r.recentClosed)}</td>
                    <td>{r.sample}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f8fafc" }}>
                  <td><strong>Anonymized market</strong></td>
                  <td colSpan={2}>
                    {bench == null
                      ? "—"
                      : insufficient
                        ? <em>Insufficient market data (need ≥ 3 samples)</em>
                        : `${fmt(benchLow)} – median ${fmt(bench.median_usd_kg)} – ${fmt(benchHigh)}`}
                  </td>
                  <td>{bench?.sample_count ?? 0}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {bench && !insufficient && (
        <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>Price band (market vs your offers)</div>
          <PriceBandChart ownRows={ownRows} bench={bench} />
        </div>
      )}
    </>
  );
}

function PriceBandChart({ ownRows, bench }: { ownRows: OwnRow[]; bench: BenchRow }) {
  const all: number[] = [
    ...(bench.min_usd_kg != null ? [bench.min_usd_kg] : []),
    ...(bench.max_usd_kg != null ? [bench.max_usd_kg] : []),
    ...ownRows.flatMap((r) => (r.avgAsk != null ? [r.avgAsk] : [])),
  ];
  if (all.length === 0) return null;
  const lo = Math.min(...all) * 0.95;
  const hi = Math.max(...all) * 1.05;
  const span = Math.max(hi - lo, 0.01);
  const pct = (v: number) => `${((v - lo) / span) * 100}%`;
  return (
    <div style={{ position: "relative", height: 48 }}>
      <div style={{ position: "absolute", top: 20, left: 0, right: 0, height: 8, background: "#e5e7eb", borderRadius: 999 }} />
      {bench.min_usd_kg != null && bench.max_usd_kg != null && (
        <div
          style={{
            position: "absolute", top: 20, height: 8,
            left: pct(bench.min_usd_kg),
            width: `calc(${pct(bench.max_usd_kg)} - ${pct(bench.min_usd_kg)})`,
            background: "#bfdbfe", borderRadius: 999,
          }}
          title="Market range"
        />
      )}
      {ownRows.map((r, i) =>
        r.avgAsk != null ? (
          <div
            key={r.originCountry}
            style={{
              position: "absolute", top: 12, left: pct(r.avgAsk),
              transform: "translateX(-50%)",
              fontSize: 10, color: "var(--fg)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, background: ["#b91c1c","#0e7490","#15803d","#7c3aed"][i % 4] }} />
            <span style={{ whiteSpace: "nowrap" }}>{r.originCountry}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}