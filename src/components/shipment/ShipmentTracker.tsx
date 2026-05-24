import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ShipmentContainer = {
  id: string;
  order_id: string | null;
  position: number | null;
  container_number: string | null;
  seal_number: string | null;
  bl_number: string | null;
  shipping_line: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  origin_port_id: string | null;
  destination_port_id: string | null;
  origin_port: string | null;
  destination_port: string | null;
  origin_country: string | null;
  destination_country: string | null;
  stuffed_date: string | null;
  gate_in_date: string | null;
  vessel_loaded_date: string | null;
  departed_date: string | null;
  arrived_date: string | null;
  discharged_date: string | null;
  gate_out_date: string | null;
  delivered_date: string | null;
  status: string | null;
  bl_document_url?: string | null;
  bl_draft_url?: string | null;
  bl_extracted_data?: Record<string, unknown> | null;
};

type Port = { id: string; name: string; code: string; country_id: string; country?: { english_name: string | null } };

type Props = {
  orderId: string;
  fclCount?: number;
  readOnly?: boolean;
};

const SHIPPING_LINES = [
  "MSC", "Maersk", "CMA CGM", "Hapag-Lloyd", "ONE", "Evergreen",
  "COSCO", "ZIM", "Yang Ming", "HMM", "PIL", "Other",
];

const CARRIER_URLS: Record<string, (cn: string) => string | null> = {
  MSC: (cn) => `https://www.msc.com/track-a-shipment?agencyPath=msc&containerNumber=${encodeURIComponent(cn)}`,
  Maersk: (cn) => `https://www.maersk.com/tracking/${encodeURIComponent(cn)}`,
  "CMA CGM": (cn) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=${encodeURIComponent(cn)}`,
  "Hapag-Lloyd": (cn) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${encodeURIComponent(cn)}`,
  COSCO: (cn) => `https://elines.coscoshipping.com/ebusiness/cargotracking?trackingType=CONTAINER&number=${encodeURIComponent(cn)}`,
  ONE: (cn) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trkNo=${encodeURIComponent(cn)}`,
  Evergreen: (cn) => `https://www.evergreen-line.com/teu1/jsp/TEU1_ViewTracking.jsp?BkgRefNo=${encodeURIComponent(cn)}`,
  ZIM: (cn) => `https://www.zim.com/tools/track-a-shipment?consnumber=${encodeURIComponent(cn)}`,
  "Yang Ming": () => `https://www.yangming.com/e-service/track-trace/track-trace.aspx`,
  HMM: () => `https://www.hmm21.com/cms/business/ebiz/trackTrace/trackTrace/index.jsp`,
  PIL: () => `https://www.pilship.com/en--/120.html`,
  Other: () => null,
};

const MILESTONES: { key: keyof ShipmentContainer; label: string; sub: string; icon: string }[] = [
  { key: "stuffed_date", label: "Stuffed", sub: "Loaded at origin", icon: "📦" },
  { key: "gate_in_date", label: "Gate In", sub: "Entered terminal", icon: "🚛" },
  { key: "vessel_loaded_date", label: "Vessel Loaded", sub: "Loaded on vessel", icon: "🏗️" },
  { key: "departed_date", label: "Departed", sub: "ETD", icon: "⚓" },
  { key: "__transit__" as never, label: "In Transit", sub: "At sea", icon: "🌊" },
  { key: "arrived_date", label: "Arrived", sub: "ETA", icon: "🛳️" },
  { key: "discharged_date", label: "Discharged", sub: "Unloaded vessel", icon: "🏭" },
  { key: "gate_out_date", label: "Gate Out", sub: "Picked up from port", icon: "🚚" },
  { key: "delivered_date", label: "Delivered", sub: "Received by buyer", icon: "✅" },
];

function computeStatus(c: Partial<ShipmentContainer>): string {
  if (c.delivered_date) return "delivered";
  if (c.gate_out_date) return "in_delivery";
  if (c.discharged_date) return "discharged";
  if (c.arrived_date) return "arrived";
  if (c.departed_date && !c.arrived_date) return "in_transit";
  if (c.vessel_loaded_date) return "loaded";
  if (c.gate_in_date) return "at_port";
  if (c.stuffed_date) return "stuffed";
  return "pending";
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(v + "T00:00:00Z").toISOString();
}

function formatTransitText(c: Partial<ShipmentContainer>): { badge: string; sub: string } {
  const dep = c.departed_date ? new Date(c.departed_date) : null;
  const arr = c.arrived_date ? new Date(c.arrived_date) : null;
  if (dep && arr) {
    const days = Math.max(0, Math.ceil((arr.getTime() - dep.getTime()) / 86400000));
    return { badge: `${days} of ${days} days`, sub: "Completed" };
  }
  if (dep && !arr) {
    const days = Math.max(0, Math.ceil((Date.now() - dep.getTime()) / 86400000));
    return { badge: `Day ${days}`, sub: "At sea" };
  }
  return { badge: "—", sub: "Pending" };
}

export function ShipmentTracker({ orderId, fclCount = 1, readOnly = false }: Props) {
  const [containers, setContainers] = useState<ShipmentContainer[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ports, setPorts] = useState<Port[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [vesselOpen, setVesselOpen] = useState(false);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load ports + containers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: portRows }, { data: rows }] = await Promise.all([
        supabase.from("ports").select("id, name, code, country_id, country:countries(english_name)").eq("is_active", true).order("name"),
        supabase.from("shipment_containers").select("*").eq("order_id", orderId).order("position", { ascending: true }).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setPorts((portRows ?? []) as unknown as Port[]);
      let list = (rows ?? []) as ShipmentContainer[];
      if (list.length === 0 && !readOnly && fclCount > 0) {
        const toCreate = Array.from({ length: fclCount }, (_, i) => ({
          order_id: orderId,
          position: i + 1,
          status: "pending",
        }));
        const { data: created } = await supabase.from("shipment_containers").insert(toCreate).select("*");
        list = (created ?? []) as ShipmentContainer[];
      }
      setContainers(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId, fclCount, readOnly]);

  const current = containers[activeIdx];

  const patchLocal = useCallback((id: string, patch: Partial<ShipmentContainer>) => {
    setContainers((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const persist = useCallback(async (id: string, patch: Partial<ShipmentContainer>) => {
    setSavingId(id);
    const merged = { ...patch };
    // include computed status
    const target = containers.find((c) => c.id === id);
    if (target) {
      const combined = { ...target, ...patch };
      merged.status = computeStatus(combined);
    }
    const { error } = await supabase.from("shipment_containers").update(merged).eq("id", id);
    setSavingId(null);
    if (!error) {
      patchLocal(id, merged);
      setSavedFlash(id);
      setTimeout(() => setSavedFlash((v) => (v === id ? null : v)), 1500);
    }
  }, [containers, patchLocal]);

  const onChange = useCallback((id: string, patch: Partial<ShipmentContainer>) => {
    patchLocal(id, patch);
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(() => persist(id, patch), 500);
  }, [patchLocal, persist]);

  const onPortChange = useCallback((id: string, kind: "origin" | "destination", portId: string) => {
    const p = ports.find((x) => x.id === portId);
    if (kind === "origin") {
      onChange(id, {
        origin_port_id: portId || null,
        origin_port: p ? `${p.name} (${p.code})` : null,
        origin_country: p?.country?.english_name ?? null,
      });
    } else {
      onChange(id, {
        destination_port_id: portId || null,
        destination_port: p ? `${p.name} (${p.code})` : null,
        destination_country: p?.country?.english_name ?? null,
      });
    }
  }, [ports, onChange]);

  const addContainer = async () => {
    const pos = (containers[containers.length - 1]?.position ?? containers.length) + 1;
    const { data } = await supabase.from("shipment_containers").insert({
      order_id: orderId, position: pos, status: "pending",
    }).select("*").single();
    if (data) {
      setContainers((prev) => [...prev, data as ShipmentContainer]);
      setActiveIdx(containers.length);
    }
  };

  const filledCount = useMemo(() => {
    if (!current) return 0;
    return MILESTONES.filter((m) => m.key !== ("__transit__" as never) && current[m.key as keyof ShipmentContainer]).length;
  }, [current]);

  if (loading) return <div className="shp-empty">Loading shipment…</div>;
  if (!current) {
    return (
      <div className="shp">
        <div className="shp-empty">
          No containers yet.{" "}
          {!readOnly && (
            <button type="button" className="shp-carrier-btn" onClick={addContainer}>+ Add Container</button>
          )}
        </div>
      </div>
    );
  }

  const transitText = formatTransitText(current);
  const carrierUrl = current.shipping_line && current.container_number && CARRIER_URLS[current.shipping_line]
    ? CARRIER_URLS[current.shipping_line](current.container_number)
    : null;

  // Compute step index for visual state
  const dateKeys: (keyof ShipmentContainer)[] = [
    "stuffed_date","gate_in_date","vessel_loaded_date","departed_date",
    "arrived_date","discharged_date","gate_out_date","delivered_date",
  ];
  const visualIdx: number[] = []; // mapped per milestone slot to fill state
  const filledFlags = dateKeys.map((k) => Boolean(current[k]));
  // Determine current milestone (first non-filled)
  const firstPending = filledFlags.indexOf(false);
  const stepStates: ("done" | "current" | "pending" | "transit")[] = MILESTONES.map((m, idx) => {
    if (m.key === ("__transit__" as never)) {
      if (current.departed_date && !current.arrived_date) return "transit";
      if (current.arrived_date) return "done";
      return "pending";
    }
    const dIdx = dateKeys.indexOf(m.key as keyof ShipmentContainer);
    if (filledFlags[dIdx]) return "done";
    // first pending => current
    if (dIdx === firstPending) return "current";
    return "pending";
  });

  return (
    <div className="shp">
      {/* Tabs for multi-container */}
      {(containers.length > 1 || !readOnly) && (
        <div className="shp-tabs" role="tablist">
          {containers.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              className={`shp-tab ${i === activeIdx ? "is-active" : ""}`}
              onClick={() => setActiveIdx(i)}
            >
              FCL {c.position ?? i + 1}{c.container_number ? ` · ${c.container_number}` : ""}
            </button>
          ))}
          {!readOnly && (
            <button type="button" className="shp-tab shp-tab-add" onClick={addContainer}>+ Add Container</button>
          )}
        </div>
      )}

      {/* Header card */}
      <section className="shp-card">
        <div className="shp-card-head">
          <h3>🚢 Container · {current.container_number || `FCL ${current.position ?? activeIdx + 1}`}</h3>
          <span className={`shp-save ${savingId === current.id ? "is-saving" : savedFlash === current.id ? "is-saved" : ""}`}>
            <span>{filledCount}/9</span>
            <span>·</span>
            <span>
              {savingId === current.id ? "💾 Saving…" : savedFlash === current.id ? "✅ Auto-saved" : readOnly ? "👁 View only" : "Auto-save on"}
            </span>
          </span>
        </div>
        <div className="shp-grid-4">
          <Field label="Container #">
            <input
              className="shp-input"
              value={current.container_number ?? ""}
              onChange={(e) => onChange(current.id, { container_number: e.target.value })}
              disabled={readOnly}
              placeholder="ABCD1234567"
            />
          </Field>
          <Field label="Seal Number">
            <input
              className="shp-input"
              value={current.seal_number ?? ""}
              onChange={(e) => onChange(current.id, { seal_number: e.target.value })}
              disabled={readOnly}
              placeholder="MNDS012345"
            />
          </Field>
          <Field label="BL Number">
            <input
              className="shp-input"
              value={current.bl_number ?? ""}
              onChange={(e) => onChange(current.id, { bl_number: e.target.value })}
              disabled={readOnly}
              placeholder="MNDS-BL-000001"
            />
          </Field>
          <Field label="Shipping Line">
            <select
              className="shp-select"
              value={current.shipping_line ?? ""}
              onChange={(e) => onChange(current.id, { shipping_line: e.target.value || null })}
              disabled={readOnly}
            >
              <option value="">Select…</option>
              {SHIPPING_LINES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Timeline */}
      <section className="shp-card shp-timeline-card">
        <div className="shp-timeline-head">
          <h3>📅 Voyage Timeline</h3>
          <span className="shp-timeline-meta">
            <strong>{filledCount} of 9</strong> milestones
            {current.departed_date && current.arrived_date && (
              <> · Transit: <strong>{transitText.badge}</strong></>
            )}
          </span>
        </div>
        <div className="shp-timeline">
          {MILESTONES.map((m, i) => {
            const state = stepStates[i];
            const isTransit = m.key === ("__transit__" as never);
            const value = !isTransit ? toDateInput(current[m.key as keyof ShipmentContainer] as string | null) : "";
            return (
              <div
                key={m.label}
                className={`shp-step ${state === "done" ? "is-done" : ""} ${state === "current" ? "is-current" : ""} ${state === "transit" ? "is-transit" : ""}`}
              >
                <div className="shp-step-dot-wrap">
                  <span className="shp-step-line" />
                  <span className="shp-dot">{state === "done" ? "✓" : ""}</span>
                </div>
                <div className="shp-step-content">
                  <div className="shp-step-icon" aria-hidden>{m.icon}</div>
                  <div className="shp-step-label">{m.label}</div>
                  <div className="shp-step-sub">{isTransit ? transitText.sub : m.sub}</div>
                  <div className="shp-step-date">
                    {isTransit ? (
                      <span className="shp-transit-badge">{transitText.badge}</span>
                    ) : (
                      <input
                        type="date"
                        value={value}
                        onChange={(e) => onChange(current.id, { [m.key]: fromDateInput(e.target.value) } as Partial<ShipmentContainer>)}
                        disabled={readOnly}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Origin / Destination */}
      <div className="shp-grid-2">
        <section className="shp-card shp-od-card is-origin">
          <h4>🟢 Origin</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Origin Port">
              <select
                className="shp-select"
                value={current.origin_port_id ?? ""}
                onChange={(e) => onPortChange(current.id, "origin", e.target.value)}
                disabled={readOnly}
              >
                <option value="">Select port…</option>
                {ports.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Origin Country">
              <div className="shp-static">{current.origin_country || "—"}</div>
            </Field>
            <Field label="ETD — Departure">
              <input
                type="date"
                className="shp-input"
                value={toDateInput(current.departed_date)}
                onChange={(e) => onChange(current.id, { departed_date: fromDateInput(e.target.value) })}
                disabled={readOnly}
              />
            </Field>
          </div>
        </section>
        <section className="shp-card shp-od-card is-destination">
          <h4>🔴 Destination</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Destination Port">
              <select
                className="shp-select"
                value={current.destination_port_id ?? ""}
                onChange={(e) => onPortChange(current.id, "destination", e.target.value)}
                disabled={readOnly}
              >
                <option value="">Select port…</option>
                {ports.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Destination Country">
              <div className="shp-static">{current.destination_country || "—"}</div>
            </Field>
            <Field label="ETA — Arrival">
              <input
                type="date"
                className="shp-input"
                value={toDateInput(current.arrived_date)}
                onChange={(e) => onChange(current.id, { arrived_date: fromDateInput(e.target.value) })}
                disabled={readOnly}
              />
            </Field>
          </div>
        </section>
      </div>

      {/* Vessel collapsible */}
      <section className="shp-card">
        <div className="shp-vessel-head" onClick={() => setVesselOpen((v) => !v)}>
          <h3>🚢 Vessel Information</h3>
          <span>
            <span className="shp-vessel-meta">
              {current.vessel_name || "—"}{current.voyage_number ? ` · Voyage ${current.voyage_number}` : ""}
            </span>
            <span>{vesselOpen ? "˄" : "˅"}</span>
          </span>
        </div>
        <div className={`shp-vessel-body ${vesselOpen ? "is-open" : ""}`}>
          <div className="shp-grid-2">
            <Field label="Vessel Name">
              <input
                className="shp-input"
                value={current.vessel_name ?? ""}
                onChange={(e) => onChange(current.id, { vessel_name: e.target.value })}
                disabled={readOnly}
                placeholder="Ever Glory"
              />
            </Field>
            <Field label="Voyage Number">
              <input
                className="shp-input"
                value={current.voyage_number ?? ""}
                onChange={(e) => onChange(current.id, { voyage_number: e.target.value })}
                disabled={readOnly}
                placeholder="231E"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Carrier */}
      <div className="shp-carrier">
        <div className="shp-carrier-text">
          <strong>🔗 Track on {current.shipping_line || "carrier"} website</strong>
          <span>
            {current.shipping_line && current.container_number
              ? `Opens the carrier's live tracking page with container ${current.container_number} pre-filled.`
              : current.shipping_line === "Other"
                ? "Visit your carrier's website to track this container."
                : "Fill in shipping line and container number to enable tracking."}
          </span>
        </div>
        {carrierUrl ? (
          <a href={carrierUrl} target="_blank" rel="noopener noreferrer" className="shp-carrier-btn">
            Track shipment ↗
          </a>
        ) : (
          <button type="button" className="shp-carrier-btn" disabled>
            Track shipment ↗
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="shp-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default ShipmentTracker;