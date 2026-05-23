import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";

type ViewRow = {
  offer_id: string;
  viewer_company_id: string | null;
  viewer_country: string | null;
  viewed_at: string | null;
};

type OfferLite = { id: string; offer_number: number; created_at?: string | null; supplier_name: string | null };

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function last30DaysList(): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function OfferAnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [offers, setOffers] = useState<Record<string, OfferLite>>({});
  const [negCount, setNegCount] = useState(0);
  const [negByOffer, setNegByOffer] = useState<Record<string, number>>({});
  const [dist, setDist] = useState<{ sent: number; opened: number; clicked: number }>({
    sent: 0, opened: 0, clicked: 0,
  });

  useEffect(() => {
    const since = daysAgoIso(30);
    (async () => {
      setLoading(true);
      const [viewsRes, negsRes, offersRes, distRes] = await Promise.all([
        supabase.from("offer_views").select("offer_id, viewer_company_id, viewer_country, viewed_at").gte("viewed_at", since),
        supabase.from("negotiations").select("id, offer_id, created_at").gte("created_at", since),
        supabase.from("offers").select("id, offer_number, created_at, supplier_name"),
        supabase.from("offer_distributions").select("status, opened_at, clicked_at, sent_at").gte("created_at", since),
      ]);
      const v = (viewsRes.data ?? []) as ViewRow[];
      setViews(v);
      const offMap: Record<string, OfferLite> = {};
      (offersRes.data ?? []).forEach((o: any) => { offMap[o.id] = o; });
      setOffers(offMap);
      const negs = (negsRes.data ?? []) as Array<{ offer_id: string }>;
      setNegCount(negs.length);
      const negByOff: Record<string, number> = {};
      negs.forEach(n => { negByOff[n.offer_id] = (negByOff[n.offer_id] ?? 0) + 1; });
      setNegByOffer(negByOff);
      const d = (distRes.data ?? []) as Array<{ opened_at: string | null; clicked_at: string | null; sent_at: string | null }>;
      setDist({
        sent: d.length,
        opened: d.filter(x => x.opened_at).length,
        clicked: d.filter(x => x.clicked_at).length,
      });
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  const totalViews = views.length;
  const uniqueViewers = new Set(views.map(v => v.viewer_company_id).filter(Boolean)).size;
  const conversion = totalViews > 0 ? Math.round((negCount / totalViews) * 100) : 0;

  const byCountry: Record<string, number> = {};
  views.forEach(v => {
    const c = v.viewer_country || "Unknown";
    byCountry[c] = (byCountry[c] || 0) + 1;
  });
  const sortedCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const byOffer: Record<string, number> = {};
  views.forEach(v => { byOffer[v.offer_id] = (byOffer[v.offer_id] || 0) + 1; });
  const topOffers = Object.entries(byOffer).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const byDay: Record<string, number> = {};
  views.forEach(v => {
    if (!v.viewed_at) return;
    const day = v.viewed_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const days = last30DaysList();
  const maxDay = Math.max(1, ...days.map(d => byDay[d] || 0));

  const distPctOpened = dist.sent > 0 ? Math.round((dist.opened / dist.sent) * 100) : 0;
  const distPctClicked = dist.sent > 0 ? Math.round((dist.clicked / dist.sent) * 100) : 0;

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">📊 Offer Analytics</h2>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : totalViews === 0 && dist.sent === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No analytics data yet</div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Views" value={totalViews.toLocaleString()} accent />
            <StatCard label="Unique Viewers" value={uniqueViewers.toLocaleString()} />
            <StatCard label="Negotiations Started" value={negCount.toLocaleString()} />
            <StatCard label="Conversion" value={`${conversion}%`} />
          </div>

          {/* Views by country */}
          <div className="rounded-md border p-4">
            <div className="text-sm font-semibold mb-3">Views by Country (Top 10)</div>
            {sortedCountries.length === 0 ? (
              <div className="text-xs text-muted-foreground">No views yet.</div>
            ) : sortedCountries.map(([country, count]) => {
              const pct = (count / totalViews) * 100;
              return (
                <div key={country} className="flex items-center gap-3 mb-2">
                  <span className="min-w-[120px] text-[13px] truncate">{country}</span>
                  <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: "#8B2252" }} />
                  </div>
                  <span className="min-w-[80px] text-right text-xs text-muted-foreground tabular-nums">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Most viewed offers */}
          <div className="rounded-md border p-4 overflow-x-auto">
            <div className="text-sm font-semibold mb-3">Most Viewed Offers (Top 10)</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Offer</th>
                  <th className="py-2 pr-2">Supplier</th>
                  <th className="py-2 pr-2 text-right">Views</th>
                  <th className="py-2 text-right">Negs</th>
                </tr>
              </thead>
              <tbody>
                {topOffers.length === 0 ? (
                  <tr><td colSpan={5} className="py-3 text-center text-xs text-muted-foreground">No data</td></tr>
                ) : topOffers.map(([offerId, count], i) => {
                  const o = offers[offerId];
                  return (
                    <tr key={offerId} className="border-b last:border-0">
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-2" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{o ? formatOfferNumber(o.offer_number, o.created_at) : offerId.slice(0, 8)}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{o?.supplier_name ?? "—"}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{count}</td>
                      <td className="py-2 text-right tabular-nums">{negByOffer[offerId] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Views over time */}
          <div className="rounded-md border p-4">
            <div className="text-sm font-semibold mb-3">Views Over Time (last 30 days)</div>
            <div className="flex items-end gap-1 h-24">
              {days.map((day, i) => {
                const count = byDay[day] || 0;
                const height = (count / maxDay) * 100;
                return (
                  <div key={day} className="flex flex-col items-center flex-1 min-w-0" title={`${day}: ${count}`}>
                    <div className="w-full h-20 bg-muted rounded flex items-end overflow-hidden">
                      <div
                        className="w-full rounded"
                        style={{
                          height: `${height}%`,
                          background: "#8B2252",
                          minHeight: count > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                    {i % 5 === 0 && (
                      <span className="text-[9px] text-muted-foreground mt-1 truncate">{day.slice(5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution performance */}
          <div className="rounded-md border p-4">
            <div className="text-sm font-semibold mb-2">Distribution Performance</div>
            <div className="text-sm text-muted-foreground">
              Sent: <span className="font-semibold text-foreground">{dist.sent}</span>
              {" · "}Opened: <span className="font-semibold text-foreground">{dist.opened}</span> ({distPctOpened}%)
              {" · "}Clicked: <span className="font-semibold text-foreground">{dist.clicked}</span> ({distPctClicked}%)
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-md border p-3"
      style={accent ? { borderColor: "#8B2252", background: "rgba(139,34,82,0.04)" } : undefined}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={accent ? { color: "#8B2252" } : undefined}>
        {value}
      </div>
    </div>
  );
}
