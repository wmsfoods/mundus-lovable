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
  bl_extracted_data?: unknown;
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

  // BL extraction state (per active container)
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);

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
    const { error } = await supabase.from("shipment_containers").update(merged as never).eq("id", id);
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
    if (containers.length >= fclCount) return;
    const pos = (containers[containers.length - 1]?.position ?? containers.length) + 1;
    const { data } = await supabase.from("shipment_containers").insert({
      order_id: orderId, position: pos, status: "pending",
    }).select("*").single();
    if (data) {
      setContainers((prev) => [...prev, data as ShipmentContainer]);
      setActiveIdx(containers.length);
    }
  };

  const isContainerEmpty = useCallback((c: ShipmentContainer) => {
    const checkKeys: (keyof ShipmentContainer)[] = [
      "container_number", "seal_number", "bl_number", "shipping_line",
      "vessel_name", "voyage_number", "origin_port_id", "destination_port_id",
      "stuffed_date", "gate_in_date", "vessel_loaded_date", "departed_date",
      "arrived_date", "discharged_date", "gate_out_date", "delivered_date",
      "bl_document_url", "bl_draft_url",
    ];
    return checkKeys.every((k) => !c[k]);
  }, []);

  const deleteContainer = async (id: string) => {
    const target = containers.find((c) => c.id === id);
    if (!target || !isContainerEmpty(target)) return;
    if (containers.length <= 1) return;
    if (!window.confirm(`Remove FCL ${target.position ?? ""}? This container has no data.`)) return;
    const { error } = await supabase.from("shipment_containers").delete().eq("id", id);
    if (error) return;
    setContainers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveIdx((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const filledCount = useMemo(() => {
    if (!current) return 0;
    return MILESTONES.filter((m) => m.key !== ("__transit__" as never) && current[m.key as keyof ShipmentContainer]).length;
  }, [current]);

  // ------- BL upload + AI extraction -------
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        const idx = s.indexOf(",");
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const uploadBLFile = async (file: File, kind: "final" | "draft") => {
    if (!current) return;
    if (file.size > 10 * 1024 * 1024) {
      setExtractError("File exceeds 10MB limit.");
      return;
    }
    setExtractError(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${orderId}/${current.id}/${kind}-${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("bl-documents").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { setExtractError(`Upload failed: ${upErr.message}`); return; }
    // Bucket is private — store the storage path; signed URLs are issued on demand.
    const url = path;
    const patch: Partial<ShipmentContainer> = kind === "final"
      ? { bl_document_url: url }
      : { bl_draft_url: url };
    await persist(current.id, patch);

    if (kind === "final") {
      // trigger AI extraction
      try {
        setExtracting(true);
        setExtractResult(null);
        const b64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("extract-bl", {
          body: { fileBase64: b64, mimeType: file.type },
        });
        if (error) throw new Error(error.message);
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        const extracted = (data as { extracted: Record<string, unknown> }).extracted || {};
        setExtractResult(extracted);
        await persist(current.id, { bl_extracted_data: extracted as unknown as ShipmentContainer["bl_extracted_data"] });
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : "Extraction failed.");
      } finally {
        setExtracting(false);
      }
    }
  };

  const FORM_FIELDS = [
    "container_number","seal_number","bl_number","shipping_line",
    "vessel_name","voyage_number","origin_port","destination_port",
    "origin_country","destination_country","departed_date","arrived_date",
  ] as const;

  const applyExtraction = async () => {
    if (!extractResult || !current) return;
    const patch: Partial<ShipmentContainer> = {};
    for (const k of FORM_FIELDS) {
      const v = extractResult[k];
      if (v === null || v === undefined || v === "") continue;
      if (k === "departed_date" || k === "arrived_date") {
        const iso = fromDateInput(String(v));
        if (iso) (patch as Record<string, unknown>)[k] = iso;
      } else if (k === "shipping_line") {
        const norm = SHIPPING_LINES.find((s) => s.toLowerCase() === String(v).toLowerCase());
        if (norm) patch.shipping_line = norm;
      } else {
        (patch as Record<string, unknown>)[k] = String(v);
      }
    }
    // Try to match ports by extracted port string
    const matchPort = (txt: string) => {
      const t = txt.toLowerCase();
      return ports.find((p) => t.includes(p.code.toLowerCase()) || t.includes(p.name.toLowerCase()));
    };
    if (typeof extractResult.origin_port === "string") {
      const p = matchPort(extractResult.origin_port);
      if (p) { patch.origin_port_id = p.id; patch.origin_country = p.country?.english_name ?? patch.origin_country ?? null; }
    }
    if (typeof extractResult.destination_port === "string") {
      const p = matchPort(extractResult.destination_port);
      if (p) { patch.destination_port_id = p.id; patch.destination_country = p.country?.english_name ?? patch.destination_country ?? null; }
    }
    await persist(current.id, patch);
    setExtractResult(null);
  };
  // ------- end BL extraction -------

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
            <span key={c.id} className={`shp-tab ${i === activeIdx ? "is-active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                role="tab"
                aria-selected={i === activeIdx}
                onClick={() => setActiveIdx(i)}
                style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
              >
                FCL {i + 1}{c.container_number ? ` · ${c.container_number}` : ""}
              </button>
              {!readOnly && containers.length > 1 && isContainerEmpty(c) && (
                <button
                  type="button"
                  title="Remove this empty FCL"
                  aria-label="Remove this empty FCL"
                  onClick={(e) => { e.stopPropagation(); deleteContainer(c.id); }}
                  style={{
                    width: 18, height: 18, borderRadius: 9,
                    border: "1px solid #e5e7eb", background: "white",
                    color: "#8B2252", cursor: "pointer", lineHeight: 1,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, padding: 0,
                  }}
                >×</button>
              )}
            </span>
          ))}
          {!readOnly && containers.length < fclCount && (
            <button
              type="button"
              className="shp-tab shp-tab-add"
              onClick={addContainer}
              title={`Add container (${containers.length}/${fclCount})`}
            >
              + Add Container ({containers.length}/{fclCount})
            </button>
          )}
        </div>
      )}

      {/* Header card */}
      <section className="shp-card">
        <div className="shp-card-head">
          <h3>🚢 Container · FCL {activeIdx + 1}</h3>
          <span className={`shp-save ${savingId === current.id ? "is-saving" : savedFlash === current.id ? "is-saved" : ""}`}>
            <span>{filledCount}/9</span>
            <span>·</span>
            <span>
              {savingId === current.id ? "💾 Saving…" : savedFlash === current.id ? "✅ Auto-saved" : readOnly ? "👁 View only" : "Auto-save on"}
            </span>
          </span>
        </div>
        {/* Mundus AI BL Extraction (suppliers only) */}
        {!readOnly && (
          <div className="shp-ai">
            <div className="shp-ai-head">
              <strong>🤖 Mundus AI — BL Extraction</strong>
              <span>Upload a Bill of Lading (PDF or image) and our AI will auto-fill the shipment details.</span>
            </div>
            <div
              className="shp-ai-drop"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) uploadBLFile(f, "final");
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              📄 Drop BL here or click to upload
              <small>Accepted: PDF, PNG, JPG (max 10MB)</small>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBLFile(f, "final");
                e.target.value = "";
              }}
            />
            <input
              ref={draftInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBLFile(f, "draft");
                e.target.value = "";
              }}
            />
            <div className="shp-ai-actions">
              <button type="button" className="shp-carrier-btn" onClick={() => fileInputRef.current?.click()} disabled={extracting}>
                📎 Upload BL
              </button>
              <button type="button" className="shp-carrier-btn shp-btn-ghost" onClick={() => draftInputRef.current?.click()} disabled={extracting}>
                📋 Upload Draft BL
              </button>
            </div>

            {extracting && (
              <div className="shp-ai-progress">
                <div className="shp-ai-pulse" />
                <span>🤖 Mundus AI is reading your Bill of Lading…</span>
              </div>
            )}

            {extractError && (
              <div className="shp-ai-error">
                ❌ {extractError}
                <button type="button" className="shp-btn-link" onClick={() => setExtractError(null)}>Dismiss</button>
              </div>
            )}

            {extractResult && !extracting && (
              <ExtractionReview
                data={extractResult}
                formFields={FORM_FIELDS as readonly string[]}
                onApply={applyExtraction}
                onDismiss={() => setExtractResult(null)}
                blUrl={current.bl_document_url ?? null}
              />
            )}

            {(current.bl_document_url || current.bl_draft_url) && (
              <div className="shp-ai-docs">
                {current.bl_document_url && (
                  <div>
                    <strong>📄 BL Document:</strong>{" "}
                    <a href={current.bl_document_url} target="_blank" rel="noopener noreferrer">View</a>
                    {" · "}
                    <a href={current.bl_document_url} download>Download</a>
                  </div>
                )}
                {current.bl_draft_url && (
                  <div>
                    <strong>📋 Draft BL:</strong>{" "}
                    <a href={current.bl_draft_url} target="_blank" rel="noopener noreferrer">View</a>
                    {" · "}
                    <a href={current.bl_draft_url} download>Download</a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Buyer view: only show BL document links */}
        {readOnly && (current.bl_document_url || current.bl_draft_url) && (
          <div className="shp-ai-docs is-readonly">
            {current.bl_document_url && (
              <div>
                <strong>📄 BL Document:</strong>{" "}
                <a href={current.bl_document_url} target="_blank" rel="noopener noreferrer">View</a>
                {" · "}
                <a href={current.bl_document_url} download>Download</a>
              </div>
            )}
            {current.bl_draft_url && (
              <div>
                <strong>📋 Draft BL:</strong>{" "}
                <a href={current.bl_draft_url} target="_blank" rel="noopener noreferrer">View</a>
                {" · "}
                <a href={current.bl_draft_url} download>Download</a>
              </div>
            )}
          </div>
        )}
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

const FIELD_LABELS: Record<string, string> = {
  container_number: "Container",
  seal_number: "Seal",
  bl_number: "BL Number",
  shipping_line: "Shipping Line",
  vessel_name: "Vessel",
  voyage_number: "Voyage",
  origin_port: "Origin",
  destination_port: "Destination",
  origin_country: "Origin Country",
  destination_country: "Destination Country",
  departed_date: "ETD",
  arrived_date: "ETA",
  shipper_name: "Shipper",
  consignee_name: "Consignee",
  notify_party: "Notify Party",
  description_of_goods: "Goods",
  gross_weight_kg: "Gross Weight (kg)",
  number_of_packages: "Packages",
  package_type: "Package Type",
  freight_terms: "Freight Terms",
  place_of_receipt: "Place of Receipt",
  place_of_delivery: "Place of Delivery",
};

function ExtractionReview({
  data, formFields, onApply, onDismiss, blUrl,
}: {
  data: Record<string, unknown>;
  formFields: readonly string[];
  onApply: () => void;
  onDismiss: () => void;
  blUrl: string | null;
}) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
  const newCount = entries.filter(([k]) => formFields.includes(k)).length;
  return (
    <div className="shp-ai-success">
      <div className="shp-ai-success-head">
        ✅ Extracted {entries.length} fields from BL — Review and confirm.
      </div>
      <ul className="shp-ai-fields">
        {entries.map(([k, v]) => {
          const isNew = formFields.includes(k);
          return (
            <li key={k} className={isNew ? "is-new" : "is-info"}>
              <span className="shp-ai-key">{FIELD_LABELS[k] ?? k}:</span>
              <span className="shp-ai-val">{String(v)}</span>
              <span className={`shp-ai-badge ${isNew ? "is-new" : "is-info"}`}>
                {isNew ? "✓ NEW" : "ℹ INFO"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="shp-ai-actions">
        <button type="button" className="shp-carrier-btn" onClick={onApply}>
          ✓ Apply {newCount} field{newCount === 1 ? "" : "s"}
        </button>
        <button type="button" className="shp-carrier-btn shp-btn-ghost" onClick={onDismiss}>
          ✕ Dismiss
        </button>
        {blUrl && (
          <a className="shp-carrier-btn shp-btn-ghost" href={blUrl} target="_blank" rel="noopener noreferrer">
            📄 View BL
          </a>
        )}
      </div>
    </div>
  );
}