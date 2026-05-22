import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardIcon, XIcon, PlusIcon, SparkleIcon } from "@/components/icons";
import { useSupplierOfferData } from "@/hooks/useSupplierOfferData";
import RequestPasteImport, { type ParsedRow } from "@/components/buyer/RequestPasteImport";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const CATEGORIES = ["Beef", "Pork", "Poultry", "Ovine"] as const;
const INCOTERMS = ["CFR", "CIF", "FOB"] as const;
const MARBLINGS = ["Not specified", "Low", "Medium", "High", "Prime"] as const;
const CONTAINER_KG = { "20": 14000, "40": 28000 } as const;

type Row = {
  id: string;
  cut: string;
  cutImage?: string | null;
  spec: string;
  marbling: string;
  qty: string;
  target: string;
};

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2, 9),
  cut: "", cutImage: null, spec: "", marbling: "Not specified", qty: "", target: "",
});

export default function BuyerCreateRequest() {
  const navigate = useNavigate();
  const { markets, cutsByCategory } = useSupplierOfferData();

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Beef");
  const [countryId, setCountryId] = useState("");
  const [incoterm, setIncoterm] = useState<(typeof INCOTERMS)[number]>("CFR");
  const [containerType, setContainerType] = useState<"20" | "40">("40");
  const [containerCount, setContainerCount] = useState("1");
  const [shipmentWindow, setShipmentWindow] = useState("");
  const [halal, setHalal] = useState(false);
  const [kosher, setKosher] = useState(false);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [openCutFor, setOpenCutFor] = useState<string | null>(null);
  const [openMarblingFor, setOpenMarblingFor] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const cuts = cutsByCategory[category] ?? [];
  const knownCutNames = useMemo(() => cuts.map((c) => c.displayName), [cuts]);

  const totalKg = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0),
    [rows]
  );
  const capacity = CONTAINER_KG[containerType] * (parseInt(containerCount) || 0);
  const pctOfCapacity = capacity > 0 ? Math.min(100, (totalKg / capacity) * 100) : 0;
  const filledRows = rows.filter((r) => r.cut.trim()).length;

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) =>
    setRows((rs) => (rs.length === 1 ? [newRow()] : rs.filter((r) => r.id !== id)));
  const add = () => setRows((rs) => [...rs, newRow()]);

  const applyImport = (imported: ParsedRow[]) => {
    const mapped: Row[] = imported.map((p) => {
      const match = cuts.find((c) => c.displayName.toLowerCase() === p.cut.toLowerCase());
      return {
        id: Math.random().toString(36).slice(2, 9),
        cut: p.cut,
        cutImage: match?.image_url ?? null,
        spec: p.spec ?? "",
        marbling: p.marbling ?? "Not specified",
        qty: String(p.qty_kg ?? ""),
        target: p.target_price_per_kg != null ? String(p.target_price_per_kg) : "",
      };
    });
    setRows((rs) => {
      const keep = rs.filter((r) => r.cut.trim() || r.qty.trim());
      return [...keep, ...mapped];
    });
  };

  const broadcast = () => {
    if (!countryId) return toast.error("Select a destination country");
    if (filledRows === 0) return toast.error("Add at least one cut");
    toast.success("Request broadcasted to suppliers (mock).");
    navigate("/buyer/requests");
  };

  return (
    <div className="bcr">
      {/* HEADER */}
      <header className="bcr-header">
        <div className="bcr-header-l">
          <div className="bcr-header-icon"><ClipboardIcon size={20} /></div>
          <div>
            <h1>New offer request</h1>
            <p>Describe what you need — suppliers will respond with offers.</p>
          </div>
        </div>
        <button type="button" className="bcr-close" onClick={() => navigate("/buyer/requests")} aria-label="Close">
          <XIcon size={18} />
        </button>
      </header>

      {/* MAIN GRID */}
      <div className="bcr-grid">
        {/* LEFT: what you need */}
        <section className="bcr-col">
          <div className="bcr-card bcr-card-selectors">
            <div className="bcr-field">
              <label>Species</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bcr-field">
              <label>Destination country *</label>
              <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
                <option value="">Select country…</option>
                {markets.map((m) => <option key={m.id} value={m.id}>{m.f} {m.n}</option>)}
              </select>
            </div>
            <div className="bcr-field">
              <label>Incoterm *</label>
              <select value={incoterm} onChange={(e) => setIncoterm(e.target.value as any)}>
                {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div className="bcr-card">
            <div className="bcr-cuts-head">
              <div className="bcr-cuts-title">
                <span className="bcr-ic-sq" aria-hidden>▦</span>
                <strong>Cuts requested</strong>
                <span className="bcr-count">· {filledRows}</span>
              </div>
              <button type="button" className="bcr-ai-pill" onClick={() => setShowImport(true)}>
                <SparkleIcon size={13} /> Paste / Import with AI
              </button>
              <div className="bcr-vol">
                <span className="bcr-vol-l">TOTAL VOLUME</span>
                <strong>{totalKg.toLocaleString()}</strong>
                <span className="bcr-vol-u">kg</span>
              </div>
            </div>

            <div className="bcr-progress">
              <div className="bcr-progress-bar" style={{ width: `${pctOfCapacity}%` }} />
            </div>
            <div className="bcr-progress-meta">
              <span>{Math.round(pctOfCapacity)}% of container</span>
              <span>{totalKg.toLocaleString()} / {capacity.toLocaleString()} kg</span>
            </div>

            {/* desktop table */}
            <div className="bcr-table-wrap">
              <table className="bcr-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th>Cut</th>
                    <th>Spec (optional)</th>
                    <th>Marbling</th>
                    <th style={{ width: 110 }}>Qty (kg)</th>
                    <th style={{ width: 120 }}>Target $/kg</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="bcr-td-num">{i + 1}</td>
                      <td>
                        <Popover open={openCutFor === r.id} onOpenChange={(o) => setOpenCutFor(o ? r.id : null)}>
                          <PopoverTrigger asChild>
                            <button type="button" className="bcr-cell-btn">
                              {r.cut || <span className="bcr-ph">Pick or type cut…</span>}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[260px]" align="start">
                            <Command>
                              <CommandInput placeholder="Search cuts…" />
                              <CommandList>
                                <CommandEmpty>
                                  <button
                                    type="button"
                                    className="bcr-create"
                                    onClick={() => { update(r.id, { cut: (document.activeElement as HTMLInputElement)?.value || r.cut }); setOpenCutFor(null); }}
                                  >
                                    Use custom name
                                  </button>
                                </CommandEmpty>
                                <CommandGroup>
                                  {cuts.map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.displayName}
                                      onSelect={() => { update(r.id, { cut: c.displayName }); setOpenCutFor(null); }}
                                    >
                                      {c.displayName}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td>
                        <input
                          className="bcr-input"
                          value={r.spec}
                          onChange={(e) => update(r.id, { spec: e.target.value })}
                          placeholder="e.g. 7-9 lb"
                        />
                      </td>
                      <td>
                        <select
                          className="bcr-input"
                          value={r.marbling}
                          onChange={(e) => update(r.id, { marbling: e.target.value })}
                        >
                          {MARBLINGS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          className="bcr-input bcr-input-num"
                          type="number" inputMode="decimal" min="0"
                          value={r.qty}
                          onChange={(e) => update(r.id, { qty: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          className="bcr-input bcr-input-num"
                          type="number" inputMode="decimal" step="0.01" min="0"
                          value={r.target}
                          onChange={(e) => update(r.id, { target: e.target.value })}
                          placeholder="optional"
                        />
                      </td>
                      <td>
                        <button type="button" className="bcr-rm" onClick={() => remove(r.id)} aria-label="Remove">
                          <XIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="bcr-rows-mobile">
              {rows.map((r, i) => (
                <div key={r.id} className="bcr-rcard">
                  <div className="bcr-rcard-h">
                    <span className="bcr-rcard-n">#{i + 1}</span>
                    <button type="button" className="bcr-rm" onClick={() => remove(r.id)} aria-label="Remove"><XIcon size={14} /></button>
                  </div>
                  <label>Cut</label>
                  <input className="bcr-input" value={r.cut} onChange={(e) => update(r.id, { cut: e.target.value })} placeholder="Pick or type cut…" list={`cuts-${category}`} />
                  <datalist id={`cuts-${category}`}>
                    {cuts.map((c) => <option key={c.id} value={c.displayName} />)}
                  </datalist>
                  <div className="bcr-rcard-grid">
                    <div>
                      <label>Spec</label>
                      <input className="bcr-input" value={r.spec} onChange={(e) => update(r.id, { spec: e.target.value })} placeholder="7-9 lb" />
                    </div>
                    <div>
                      <label>Marbling</label>
                      <select className="bcr-input" value={r.marbling} onChange={(e) => update(r.id, { marbling: e.target.value })}>
                        {MARBLINGS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Qty (kg)</label>
                      <input className="bcr-input" type="number" inputMode="decimal" value={r.qty} onChange={(e) => update(r.id, { qty: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <label>Target $/kg</label>
                      <input className="bcr-input" type="number" inputMode="decimal" step="0.01" value={r.target} onChange={(e) => update(r.id, { target: e.target.value })} placeholder="optional" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="bcr-add" onClick={add}>
              <PlusIcon size={14} /> Add cut
            </button>

            <div className="bcr-tip">
              <strong>Tip</strong> · target price is optional. Leave blank if you want suppliers to quote freely.
            </div>
          </div>
        </section>

        {/* RIGHT: logistics & terms */}
        <aside className="bcr-col bcr-col-r">
          <div className="bcr-card bcr-card-logistics">
            <div className="bcr-side-title">
              <ClipboardIcon size={14} /> LOGISTICS &amp; TERMS
            </div>

            <div className="bcr-side-block">
              <label className="bcr-side-label">CONTAINER</label>
              <div className="bcr-pills">
                <button type="button" className={`bcr-pill ${containerType === "20" ? "on" : ""}`} onClick={() => setContainerType("20")}>20' FCL</button>
                <button type="button" className={`bcr-pill ${containerType === "40" ? "on" : ""}`} onClick={() => setContainerType("40")}>40' FCL</button>
              </div>
              <div className="bcr-count-row">
                <span>×</span>
                <input
                  type="number" min="1"
                  value={containerCount}
                  onChange={(e) => setContainerCount(e.target.value)}
                  className="bcr-input bcr-input-tiny"
                />
                <span className="bcr-muted">FCL</span>
              </div>
            </div>

            <div className="bcr-side-block">
              <label className="bcr-side-label">SHIPMENT WINDOW</label>
              <input
                className="bcr-input"
                value={shipmentWindow}
                onChange={(e) => setShipmentWindow(e.target.value)}
                placeholder="e.g. June 2026 / Prompt"
              />
            </div>

            <div className="bcr-side-block">
              <label className="bcr-side-label">COMPLIANCE</label>
              <div className="bcr-checks">
                <label><input type="checkbox" checked={halal} onChange={(e) => setHalal(e.target.checked)} /> Halal</label>
                <label><input type="checkbox" checked={kosher} onChange={(e) => setKosher(e.target.checked)} /> Kosher</label>
              </div>
            </div>

            <div className="bcr-side-block">
              <label className="bcr-side-label">NOTES FOR SUPPLIERS</label>
              <textarea
                className="bcr-input bcr-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quality preferences, certifications, timing…"
              />
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="bcr-footer">
        <div className="bcr-summary">
          <strong>{filledRows}</strong> cuts · <strong>{totalKg.toLocaleString()}</strong> kg · {containerCount}×{containerType}ft
        </div>
        <div className="bcr-actions">
          <button type="button" className="bcr-btn-ghost" onClick={() => navigate("/buyer/requests")}>Cancel</button>
          <button type="button" className="bcr-btn-primary" onClick={broadcast}>
            ↗ Broadcast request
          </button>
        </div>
      </footer>

      <RequestPasteImport
        open={showImport}
        onOpenChange={setShowImport}
        category={category}
        knownCuts={knownCutNames}
        onApply={applyImport}
      />
    </div>
  );
}
