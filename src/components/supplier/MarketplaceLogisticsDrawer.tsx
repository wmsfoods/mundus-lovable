import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type ML_Carrier = {
  id: string;
  name: string;
  short: string;
  color: string;
  textColor: string;
};

export const ML_CARRIERS: ML_Carrier[] = [
  { id: "msc", name: "MSC Mediterranean", short: "MSC", color: "#FFB81C", textColor: "#11295B" },
  { id: "maersk", name: "Maersk Line", short: "Maersk", color: "#42B0D5", textColor: "#003A5D" },
  { id: "cma", name: "CMA CGM", short: "CMA CGM", color: "#003DA5", textColor: "#FFFFFF" },
  { id: "cosco", name: "COSCO Shipping", short: "COSCO", color: "#004B87", textColor: "#FFFFFF" },
  { id: "evergreen", name: "Evergreen Marine", short: "Evergreen", color: "#006747", textColor: "#FFFFFF" },
  { id: "hapag", name: "Hapag-Lloyd", short: "Hapag-Lloyd", color: "#FF6600", textColor: "#FFFFFF" },
];

export type MarketplaceRate = {
  countryCode: string;
  port: string;
  portId: string;
  freight: string;
  insurance: string;
  transitDays: string;
  source: {
    kind: "marketplace";
    carrier: string;
    carrierShort: string;
    carrierColor: string;
    carrierTextColor: string;
    validUntil: string;
    appliedAt: string;
  };
};

type Port = { id: string; n: string };
type Market = { id: string; n: string; f: string; p: Port[] };

type Props = {
  open: boolean;
  onClose: () => void;
  markets: Market[];
  csize: "20ft" | "40ft";
  origin: string;
  onApplyRate: (rate: MarketplaceRate) => void;
};

type Quote = {
  carrier: ML_Carrier;
  price: number;
  transit: number;
  departure: string;
  includes: string;
};

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildQuotes(countryId: string, portId: string, csize: string, month: string): Quote[] {
  const base = hash(`${countryId}-${portId}-${csize}-${month}`);
  const selected = [...ML_CARRIERS]
    .map((c, i) => ({ c, k: hash(c.id + base + i) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 4)
    .map((x) => x.c);
  const inc = ["Basic freight + THC + BAF", "+THC +BAF +ISPS", "Freight + THC + BAF + CAF", "All-in incl. THC, BAF, ISPS"];
  return selected.map((c, i) => {
    const h = hash(c.id + countryId + portId);
    const price = 1800 + (h % 3000) + i * 120;
    const transit = 18 + ((h >> 3) % 18);
    const day = 1 + ((h >> 5) % 20);
    return {
      carrier: c,
      price,
      transit,
      departure: `${month} ${day}`,
      includes: inc[i % inc.length],
    };
  });
}

function CarrierBadge({ c }: { c: ML_Carrier }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: c.color,
        color: c.textColor,
        borderRadius: 999,
        padding: "2px 8px",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: 0.2,
      }}
    >
      {c.short}
    </span>
  );
}

export default function MarketplaceLogisticsDrawer({
  open,
  onClose,
  markets,
  csize,
  origin,
  onApplyRate,
}: Props) {
  const { t } = useTranslation();
  const tr = (k: string, v?: any) => t(`supplier.createOffer.marketplace.${k}`, v as any);

  const [stage, setStage] = useState<"search" | "loading" | "results" | "confirm">("search");
  const [country, setCountry] = useState<string>(markets[0]?.id ?? "");
  const [portId, setPortId] = useState<string>("");
  const [ctn, setCtn] = useState<"20ft" | "40ft">(csize);
  const [ready, setReady] = useState("June 2026");
  const [sort, setSort] = useState<"price" | "transit" | "departure">("price");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [picked, setPicked] = useState<Quote | null>(null);

  useEffect(() => {
    if (open) {
      setStage("search");
      setPicked(null);
      setCtn(csize);
      if (!country && markets[0]) setCountry(markets[0].id);
    }
  }, [open, csize]); // eslint-disable-line

  const currentMarket = useMemo(() => markets.find((m) => m.id === country), [markets, country]);

  useEffect(() => {
    if (currentMarket && !currentMarket.p.find((p) => p.id === portId)) {
      setPortId(currentMarket.p[0]?.id ?? "");
    }
  }, [currentMarket, portId]);

  const sorted = useMemo(() => {
    const arr = [...quotes];
    if (sort === "price") arr.sort((a, b) => a.price - b.price);
    else if (sort === "transit") arr.sort((a, b) => a.transit - b.transit);
    else arr.sort((a, b) => a.departure.localeCompare(b.departure));
    return arr;
  }, [quotes, sort]);

  const cheapest = useMemo(() => (quotes.length ? quotes.reduce((m, q) => (q.price < m.price ? q : m), quotes[0]) : null), [quotes]);

  const runSearch = () => {
    if (!currentMarket || !portId) return;
    setStage("loading");
    setTimeout(() => {
      setQuotes(buildQuotes(country, portId, ctn, ready));
      setStage("results");
    }, 1200);
  };

  const handleConfirm = () => {
    if (!picked || !currentMarket) return;
    const port = currentMarket.p.find((p) => p.id === portId);
    if (!port) return;
    const freight = picked.price.toFixed(2);
    const insurance = Math.round(picked.price * 0.13).toFixed(2);
    onApplyRate({
      countryCode: country,
      portId,
      port: port.n,
      freight,
      insurance,
      transitDays: String(picked.transit),
      source: {
        kind: "marketplace",
        carrier: picked.carrier.name,
        carrierShort: picked.carrier.short,
        carrierColor: picked.carrier.color,
        carrierTextColor: picked.carrier.textColor,
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        appliedAt: new Date().toISOString(),
      },
    });
  };

  if (!open) return null;

  const WINE = "#8B2252";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
          animation: "cov4MlFade 0.18s ease-out",
        }}
      />
      <aside
        role="dialog"
        aria-label="Marketplace Logistics"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100vw)",
          background: "#fff", zIndex: 1001, boxShadow: "-12px 0 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          transform: "translateX(0)", transition: "transform 0.22s ease",
          animation: "cov4MlSlide 0.22s ease-out",
        }}
      >
        <style>{`
          @keyframes cov4MlFade { from { opacity:0 } to { opacity:1 } }
          @keyframes cov4MlSlide { from { transform: translateX(100%) } to { transform: translateX(0) } }
          @keyframes cov4MlPulse { 0%,100% { opacity:0.55 } 50% { opacity:1 } }
          .cov4-ml-skel { background: #eef0f3; border-radius: 8px; animation: cov4MlPulse 1.2s ease-in-out infinite; }
          .cov4-ml-input { width:100%; padding:8px 10px; border:1px solid #d8dce3; border-radius:8px; font-size:13px; background:#fff; }
          .cov4-ml-input:focus { outline: 2px solid ${WINE}33; border-color:${WINE}; }
          .cov4-ml-pill { padding:6px 10px; border:1px solid #d8dce3; border-radius:999px; background:#fff; font-size:12px; cursor:pointer; }
          .cov4-ml-pill.on { background:${WINE}; color:#fff; border-color:${WINE}; }
          .cov4-ml-card { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; transition: box-shadow 0.15s, border-color 0.15s; }
          .cov4-ml-card:hover { border-color:${WINE}66; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
          .cov4-ml-use { background:${WINE}; color:#fff; border:none; padding:7px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
          .cov4-ml-use:hover { filter: brightness(1.1); }
          .cov4-ml-tab { padding:6px 10px; border:1px solid #d8dce3; background:#fff; font-size:12px; cursor:pointer; }
          .cov4-ml-tab.on { background:#f4eef1; color:${WINE}; border-color:${WINE}; font-weight:600; }
        `}</style>

        {/* HEADER */}
        <header style={{ padding: "16px 20px", borderBottom: "1px solid #eef0f3", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1f2b" }}>🚢 {tr("title")}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{tr("subtitle")}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
        </header>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* SEARCH FORM (always visible) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={lblStyle}>{tr("from")}</label>
              <input className="cov4-ml-input" value={origin} readOnly style={{ background: "#f7f8fa", color: "#6b7280" }} />
            </div>
            <div>
              <label style={lblStyle}>{tr("destination")}</label>
              <select className="cov4-ml-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.f} {m.n}</option>
                ))}
              </select>
            </div>
            {currentMarket && (
              <div>
                <label style={lblStyle}>{tr("port")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentMarket.p.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`cov4-ml-pill ${portId === p.id ? "on" : ""}`}
                      onClick={() => setPortId(p.id)}
                    >
                      {p.n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lblStyle}>{tr("container")}</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["20ft", "40ft"] as const).map((o) => (
                    <button key={o} type="button" className={`cov4-ml-pill ${ctn === o ? "on" : ""}`} onClick={() => setCtn(o)}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lblStyle}>{tr("readyToLoad")}</label>
                <input className="cov4-ml-input" value={ready} onChange={(e) => setReady(e.target.value)} placeholder="June 2026" />
              </div>
            </div>
            <button
              type="button"
              onClick={runSearch}
              disabled={!currentMarket || !portId}
              style={{
                marginTop: 4, background: WINE, color: "#fff", border: "none",
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: !currentMarket || !portId ? "not-allowed" : "pointer",
                opacity: !currentMarket || !portId ? 0.55 : 1,
              }}
            >
              {tr("searchBtn")} →
            </button>
          </div>

          {/* DIVIDER */}
          {stage !== "search" && <div style={{ height: 1, background: "#eef0f3", margin: "20px 0" }} />}

          {/* LOADING */}
          {stage === "loading" && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{tr("loading")}</p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="cov4-ml-skel" style={{ height: 92, marginBottom: 10 }} />
              ))}
            </div>
          )}

          {/* RESULTS */}
          {(stage === "results" || stage === "confirm") && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{quotes.length} quotes</span>
                <div style={{ display: "flex", gap: 0, border: "1px solid #d8dce3", borderRadius: 8, overflow: "hidden" }}>
                  {(["price", "transit", "departure"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`cov4-ml-tab ${sort === k ? "on" : ""}`}
                      onClick={() => setSort(k)}
                      style={{ border: "none" }}
                    >
                      {tr(k)}
                    </button>
                  ))}
                </div>
              </div>

              {quotes.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                  {tr("noResults")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sorted.map((q) => {
                    const isCheap = cheapest && q.carrier.id === cheapest.carrier.id;
                    const isPicked = picked?.carrier.id === q.carrier.id;
                    return (
                      <div
                        key={q.carrier.id}
                        className="cov4-ml-card"
                        style={isPicked ? { borderColor: WINE, boxShadow: `0 0 0 2px ${WINE}22` } : undefined}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <CarrierBadge c={q.carrier} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2b" }}>{q.carrier.name}</span>
                            {isCheap && (
                              <span style={{ background: "#10b981", color: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
                                ★ {tr("bestPrice")}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f2b" }}>
                              US$ {q.price.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: "#6b7280" }}>{tr("perFcl")}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: "#4b5563" }}>
                          <span>⏱ {tr("transitDays", { days: q.transit })}</span>
                          <span>📅 {q.departure}</span>
                          <span style={{ color: "#6b7280" }}>{q.includes}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                          <button
                            type="button"
                            className="cov4-ml-use"
                            onClick={() => { setPicked(q); setStage("confirm"); }}
                          >
                            {tr("useRate")} →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONFIRM FOOTER */}
        {stage === "confirm" && picked && (
          <div style={{ borderTop: "1px solid #eef0f3", background: "#fafbfc", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <CarrierBadge c={picked.carrier} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2b" }}>{picked.carrier.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#10b981", fontWeight: 600 }}>{tr("confirmTitle")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#4b5563", marginBottom: 10 }}>
              <span>{tr("freight")}: <strong style={{ color: "#1a1f2b" }}>US$ {picked.price.toLocaleString()}</strong> / FCL</span>
              <span>{tr("insurance")}: <strong style={{ color: "#1a1f2b" }}>~US$ {Math.round(picked.price * 0.13).toLocaleString()}</strong></span>
              <span style={{ gridColumn: "1 / -1", fontSize: 11, color: "#6b7280" }}>
                {tr("source")}: {picked.carrier.name} via Marketplace Logistics
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setStage("results"); setPicked(null); }}
                style={{ flex: 1, padding: "9px 12px", background: "#fff", border: "1px solid #d8dce3", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" }}
              >
                ← {tr("pickDifferent")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{ flex: 2, padding: "9px 12px", background: WINE, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {tr("confirmAdd")} ✓
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

const lblStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
};