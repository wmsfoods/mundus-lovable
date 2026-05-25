import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardIcon, XIcon, PlusIcon, SparkleIcon, UploadIcon, FileIcon } from "@/components/icons";
import { useSupplierOfferData } from "@/hooks/useSupplierOfferData";
import RequestPasteImport, { type ParsedRow } from "@/components/buyer/RequestPasteImport";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import { countryFlag } from "@/lib/countryFlags";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { toDisplay, fromDisplay, weightLabel, priceLabel, fmtWeight } from "@/lib/units";

const CATEGORIES = ["Beef", "Pork", "Poultry", "Ovine"] as const;
const INCOTERM_OPTIONS = ["FOB", "CFR", "CIF", "EXW"] as const;
const MARBLINGS = ["Not specified", "Low", "Medium", "High", "Prime"] as const;
const CONTAINER_KG = { "20": 14000, "40": 28000 } as const;

type Row = {
  id: string;
  cut: string;
  cutImage?: string | null;
  spec: string;
  boneSpec: "Bone-In" | "Boneless" | "Offals";
  marbling: string;
  qty: string;
  target: string;
};

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2, 9),
  cut: "", cutImage: null, spec: "", boneSpec: "Boneless", marbling: "Not specified", qty: "", target: "",
});

export default function BuyerCreateRequest() {
  const navigate = useNavigate();
  const { editId } = useParams<{ editId?: string }>();
  const isEdit = !!editId;
  const location = useLocation();
  const cloneFrom = (location.state as any)?.cloneFrom as Record<string, any> | undefined;
  const { markets, cutsByCategory } = useSupplierOfferData();
  const { company } = useCurrentCompany();
  const { user } = useAuth();
  const { unit } = useWeightUnit();
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Beef");
  // Destination — searchable single-select
  const [destCountry, setDestCountry] = useState("");
  const [destSearch, setDestSearch] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement | null>(null);
  // Incoterm — multi-select
  const [selectedIncoterms, setSelectedIncoterms] = useState<string[]>(["CFR"]);
  // Origin — multi-select with "any origin"
  const [anyOrigin, setAnyOrigin] = useState(true);
  const [originCountries, setOriginCountries] = useState<string[]>([]);
  const [originSearch, setOriginSearch] = useState("");
  const [originOpen, setOriginOpen] = useState(false);
  const originRef = useRef<HTMLDivElement | null>(null);
  // Attachments
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Cut nomenclature region (global vs US IMPS). Suggested when US is in origin.
  const [cutRegion, setCutRegion] = useState<"global" | "us">("global");

  // Distribution: marketplace (all suppliers) vs specific supplier
  const [distribution, setDistribution] = useState<"marketplace" | "specific">("marketplace");
  const [targetSupplierId, setTargetSupplierId] = useState<string>("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const supplierRef = useRef<HTMLDivElement | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; country?: string | null }>>([]);

  // Ports state
  const [ports, setPorts] = useState<Array<{ id: string; name: string; code: string; country: string }>>([]);
  const [destPort, setDestPort] = useState("");
  const [portSearch, setPortSearch] = useState("");
  const [portOpen, setPortOpen] = useState(false);
  const portRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase
      .from("companies")
      .select("id, name, country")
      .eq("is_supplier", true)
      .is("deleted_at", null)
      .order("name")
      .then(({ data }) => setSuppliers((data ?? []) as any));
  }, []);

  // Fetch ports with country names via join through countries table
  useEffect(() => {
    (async () => {
      const { data: portsData } = await supabase
        .from("ports")
        .select("id, name, code, country_id, is_active")
        .eq("is_active", true)
        .order("name");
      const { data: countriesData } = await supabase
        .from("countries")
        .select("id, english_name");

      const countryMap = new Map<string, string>();
      for (const c of (countriesData ?? [])) {
        countryMap.set(c.id, c.english_name ?? "");
      }

      const mapped = (portsData ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        country: countryMap.get(p.country_id) ?? "",
      }));
      setPorts(mapped);
    })();
  }, []);

  // Load existing request when in edit mode
  useEffect(() => {
    if (!isEdit || !editId || !company?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("id", editId)
        .eq("buyer_company_id", company.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Cannot load request for editing");
        navigate("/buyer/requests");
        return;
      }
      if ((data.category as string) && (CATEGORIES as readonly string[]).includes(data.category as string)) {
        setCategory(data.category as any);
      }
      setDestCountry(data.destination_country ?? "");
      setDestPort(data.destination_port ?? "");
      const incs = String(data.incoterm ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (incs.length) setSelectedIncoterms(incs);
      setAnyOrigin(data.any_origin ?? true);
      setOriginCountries((data.origin_countries as string[] | null) ?? []);
      if ((data as any).cut_region === "us" || (data as any).cut_region === "global") {
        setCutRegion((data as any).cut_region);
      }
      setContainerType(((data.container_size ?? "40ft").startsWith("20") ? "20" : "40") as "20" | "40");
      setContainerCount(String(data.container_count ?? 1));
      setShipmentWindow(data.shipment_date ?? "");

      if ((data as any).target_supplier_id) {
        setDistribution("specific");
        setTargetSupplierId((data as any).target_supplier_id);
      }

      // Parse additional_info for cuts, compliance, notes
      const info = String(data.additional_info ?? "");
      const sections = info.split(/\n\n/);
      let parsedRows: Row[] = [];
      for (const sec of sections) {
        if (sec.startsWith("Cuts:")) {
          const lines = sec.replace(/^Cuts:\n?/, "").split("\n").filter(Boolean);
          parsedRows = lines.map((line) => {
            // {cut} ({spec}) — {marbling} — {qty}kg @ ${target}/kg
            const m = line.match(/^(.+?)(?:\s*\[([^\]]+)\])?(?:\s*\(([^)]*)\))?(?:\s*—\s*([^—]+?))?(?:\s*—\s*([\d.,]+)kg)?(?:\s*@\s*\$([\d.]+)\/kg)?$/);
            const cut = (m?.[1] ?? line).trim();
            const match = (cutsByCategory[(data.category as string) ?? "Beef"] ?? []).find((c) => c.displayName.toLowerCase() === cut.toLowerCase());
            const boneRaw = (m?.[2] ?? "").trim();
            const boneSpec: "Bone-In" | "Boneless" | "Offals" = boneRaw === "Bone-In" ? "Bone-In" : boneRaw === "Boneless" ? "Boneless" : (match?.bone_spec ?? "Boneless");
            return {
              id: Math.random().toString(36).slice(2, 9),
              cut,
              cutImage: match?.image_url ?? null,
              spec: (m?.[3] ?? "").trim(),
              boneSpec,
              marbling: (m?.[4] ?? "Not specified").trim() || "Not specified",
              qty: (m?.[5] ?? "").replace(/,/g, "").trim(),
              target: (m?.[6] ?? "").trim(),
            };
          });
        } else if (sec.startsWith("Compliance:")) {
          const list = sec.replace(/^Compliance:\s*/, "");
          setHalal(/halal/i.test(list));
          setKosher(/kosher/i.test(list));
        } else if (sec.startsWith("Notes:")) {
          setNotes(sec.replace(/^Notes:\n?/, ""));
        }
      }
      if (parsedRows.length) setRows(parsedRows);

      // Pre-fill attachments as existing (display-only chips kept separately)
      const existing = ((data.attachments as Array<{ name: string; url: string; size?: number; type?: string }> | null) ?? []);
      setExistingAttachments(existing);
      setLoadingEdit(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editId, company?.id, cutsByCategory]);

  // Hydrate from a cloned request (navigation state from "Clone request" button).
  const clonedRef = useRef(false);
  useEffect(() => {
    if (clonedRef.current) return;
    if (isEdit) return;
    if (!cloneFrom) return;
    if (!cutsByCategory || Object.keys(cutsByCategory).length === 0) return;
    clonedRef.current = true;
    const data = cloneFrom;
    if ((data.category as string) && (CATEGORIES as readonly string[]).includes(data.category as string)) {
      setCategory(data.category as any);
    }
    setDestCountry(data.destination_country ?? "");
    setDestPort(data.destination_port ?? "");
    const incs = String(data.incoterm ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (incs.length) setSelectedIncoterms(incs);
    setAnyOrigin(data.any_origin ?? true);
    setOriginCountries((data.origin_countries as string[] | null) ?? []);
    if ((data as any).cut_region === "us" || (data as any).cut_region === "global") {
      setCutRegion((data as any).cut_region);
    }
    setContainerType(((data.container_size ?? "40ft").startsWith("20") ? "20" : "40") as "20" | "40");
    setContainerCount(String(data.container_count ?? 1));
    setShipmentWindow(data.shipment_date ?? "");
    if ((data as any).target_supplier_id) {
      setDistribution("specific");
      setTargetSupplierId((data as any).target_supplier_id);
    }

    const info = String(data.additional_info ?? "");
    const sections = info.split(/\n\n/);
    let parsedRows: Row[] = [];
    for (const sec of sections) {
      if (sec.startsWith("Cuts:")) {
        const lines = sec.replace(/^Cuts:\n?/, "").split("\n").filter(Boolean);
        parsedRows = lines.map((line) => {
          const m = line.match(/^(.+?)(?:\s*\[([^\]]+)\])?(?:\s*\(([^)]*)\))?(?:\s*—\s*([^—]+?))?(?:\s*—\s*([\d.,]+)kg)?(?:\s*@\s*\$([\d.]+)\/kg)?$/);
          const cut = (m?.[1] ?? line).trim();
          const match = (cutsByCategory[(data.category as string) ?? "Beef"] ?? []).find((c) => c.displayName.toLowerCase() === cut.toLowerCase());
          const boneRaw = (m?.[2] ?? "").trim();
          const boneSpec: "Bone-In" | "Boneless" | "Offals" = boneRaw === "Bone-In" ? "Bone-In" : boneRaw === "Boneless" ? "Boneless" : (match?.bone_spec ?? "Boneless");
          return {
            id: Math.random().toString(36).slice(2, 9),
            cut,
            cutImage: match?.image_url ?? null,
            spec: (m?.[3] ?? "").trim(),
            boneSpec,
            marbling: (m?.[4] ?? "Not specified").trim() || "Not specified",
            qty: (m?.[5] ?? "").replace(/,/g, "").trim(),
            target: (m?.[6] ?? "").trim(),
          };
        });
      } else if (sec.startsWith("Compliance:")) {
        const list = sec.replace(/^Compliance:\s*/, "");
        setHalal(/halal/i.test(list));
        setKosher(/kosher/i.test(list));
      } else if (sec.startsWith("Notes:")) {
        setNotes(sec.replace(/^Notes:\n?/, ""));
      }
    }
    if (parsedRows.length) setRows(parsedRows);
    toast.success("Cloned — review changes and submit");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneFrom, cutsByCategory, isEdit]);

  const [existingAttachments, setExistingAttachments] = useState<Array<{ name: string; url: string; size?: number; type?: string }>>([]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setDestOpen(false);
      if (originRef.current && !originRef.current.contains(e.target as Node)) setOriginOpen(false);
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierDropdownOpen(false);
      if (portRef.current && !portRef.current.contains(e.target as Node)) setPortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Reset port when country changes
  useEffect(() => {
    setDestPort("");
    setPortSearch("");
  }, [destCountry]);

  const filteredPorts = useMemo(() => {
    if (!destCountry) return [];
    return ports.filter((p) => p.country?.toLowerCase() === destCountry.toLowerCase());
  }, [ports, destCountry]);

  const searchedPorts = useMemo(() => {
    const q = portSearch.trim().toLowerCase();
    if (!q) return filteredPorts;
    return filteredPorts.filter((p) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [filteredPorts, portSearch]);

  const filteredDest = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter((m) => m.n.toLowerCase().includes(q));
  }, [markets, destSearch]);

  const filteredOrigin = useMemo(() => {
    const q = originSearch.trim().toLowerCase();
    const base = markets.filter((m) => !originCountries.includes(m.n));
    if (!q) return base;
    return base.filter((m) => m.n.toLowerCase().includes(q));
  }, [markets, originSearch, originCountries]);

  const toggleIncoterm = (inc: string) =>
    setSelectedIncoterms((prev) =>
      prev.includes(inc) ? prev.filter((i) => i !== inc) : [...prev, inc]
    );

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 5MB`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
  };

  const allCuts = cutsByCategory[category] ?? [];
  const cuts = useMemo(() => {
    if (category !== "Beef") return allCuts.filter((c) => (c as any).region !== "us");
    if (cutRegion === "us") return allCuts.filter((c) => (c as any).region === "us" || c.bone_spec === "Offals");
    return allCuts.filter((c) => (c as any).region !== "us");
  }, [allCuts, category, cutRegion]);
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
        boneSpec: match?.bone_spec ?? "Boneless",
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

  const broadcast = async () => {
    if (!company?.id) return toast.error("No company linked");
    if (!destCountry) return toast.error("Select a destination country");
    if (selectedIncoterms.length === 0) return toast.error("Select at least one incoterm");
    if (filledRows === 0) return toast.error("Add at least one cut");
    if (distribution === "specific" && !targetSupplierId) {
      return toast.error("Select a supplier or switch to marketplace distribution");
    }
    const valid = rows.filter((r) => r.cut.trim());
    const primary = valid[0];
    const productName = valid.length === 1
      ? primary.cut
      : `${primary.cut} + ${valid.length - 1} more cut(s)`;
    const specs = valid.map((r) => `${r.cut} [${r.boneSpec}]${r.spec ? ` (${r.spec})` : ""}${r.marbling && r.marbling !== "Not specified" ? ` — ${r.marbling}` : ""}${r.qty ? ` — ${r.qty}kg` : ""}${r.target ? ` @ $${r.target}/kg` : ""}`).join("\n");
    const targets = valid.map((r) => parseFloat(r.target)).filter((n) => Number.isFinite(n) && n > 0);
    const avgTarget = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
    const compliance: string[] = [];
    if (halal) compliance.push("Halal");
    if (kosher) compliance.push("Kosher");
    const additional = [
      specs ? `Cuts:\n${specs}` : "",
      compliance.length ? `Compliance: ${compliance.join(", ")}` : "",
      notes ? `Notes:\n${notes}` : "",
    ].filter(Boolean).join("\n\n");

    setSubmitting(true);

    // Upload attachments to storage
    const uploaded: { name: string; url: string; size: number; type: string }[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("request-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("request-attachments").getPublicUrl(path);
      uploaded.push({ name: file.name, url: pub.publicUrl, size: file.size, type: file.type });
    }

    const payload = {
      product_name: productName,
      category,
      specification: primary.spec || null,
      destination_country: destCountry,
      destination_port: destPort || null,
      incoterm: selectedIncoterms.join(","),
      container_size: containerType === "20" ? "20ft" : "40ft",
      container_count: parseInt(containerCount) || 1,
      quantity_kg: totalKg,
      temperature: "Frozen",
      target_price_usd: avgTarget,
      shipment_date: shipmentWindow || null,
      additional_info: additional || null,
      any_origin: anyOrigin,
      origin_countries: anyOrigin ? [] : originCountries,
      target_supplier_id: distribution === "specific" ? targetSupplierId : null,
      cut_region: cutRegion,
    };

    if (isEdit && editId) {
      const mergedAttachments = [...existingAttachments, ...uploaded];
      const { error } = await supabase
        .from("buyer_requests")
        .update({ ...payload, attachments: mergedAttachments, updated_at: new Date().toISOString() })
        .eq("id", editId)
        .eq("buyer_company_id", company.id);
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Request updated");
      navigate(`/buyer/requests/${editId}`);
    } else {
      const { data, error } = await supabase
        .from("buyer_requests")
        .insert({
          ...payload,
          buyer_company_id: company.id,
          buyer_user_id: user?.id ?? null,
          status: "new",
          attachments: uploaded,
        })
        .select("id")
        .single();
      setSubmitting(false);
      if (error || !data) return toast.error(error?.message ?? "Failed to create request");
      toast.success("Request published to suppliers");
      navigate("/buyer/requests");
    }
  };

  return (
    <div className="bcr">
      {cloneFrom && !isEdit && (
        <div
          className="rounded-lg p-4 mb-4 flex items-start gap-3"
          style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>📋</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#065F46" }}>
              Cloning request
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#047857" }}>
              Review and submit as a new request.
            </p>
          </div>
        </div>
      )}
      {/* HEADER */}
      <header className="bcr-header">
        <div className="bcr-header-l">
          <div className="bcr-header-icon"><ClipboardIcon size={20} /></div>
          <div>
            <h1>{isEdit ? "Edit request" : "New offer request"}</h1>
            <p>{isEdit ? "Update your request details. Changes will be visible to suppliers." : "Describe what you need — suppliers will respond with offers."}</p>
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
            <div className="bcr-field" ref={destRef} style={{ position: "relative" }}>
              <label>Destination country *</label>
              <input
                type="text"
                className="bcr-input"
                value={destOpen ? destSearch : destCountry}
                onChange={(e) => { setDestSearch(e.target.value); setDestOpen(true); }}
                onFocus={() => { setDestSearch(""); setDestOpen(true); }}
                placeholder="Type to search country…"
                autoComplete="off"
              />
              {destOpen && filteredDest.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 220, overflowY: "auto", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                  {filteredDest.map((m) => (
                    <div
                      key={m.id}
                      onMouseDown={(e) => { e.preventDefault(); setDestCountry(m.n); setDestSearch(""); setDestOpen(false); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      {m.f} {m.n}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {destCountry && filteredPorts.length > 0 && (
              <div className="bcr-field" ref={portRef} style={{ position: "relative" }}>
                <label>Destination Port</label>
                <input
                  type="text"
                  className="bcr-input"
                  value={portOpen ? portSearch : destPort}
                  onChange={(e) => { setPortSearch(e.target.value); setPortOpen(true); }}
                  onFocus={() => { setPortSearch(""); setPortOpen(true); }}
                  placeholder={`Search ports in ${destCountry}...`}
                  autoComplete="off"
                />
                {portOpen && searchedPorts.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 220, overflowY: "auto", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                    {searchedPorts.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDestPort(`${p.name} (${p.code})`);
                          setPortSearch("");
                          setPortOpen(false);
                        }}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      >
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{p.code} · {p.country}</div>
                      </div>
                    ))}
                  </div>
                )}
                {destCountry && filteredPorts.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>
                    No ports found for {destCountry}
                  </div>
                )}
              </div>
            )}
            <div className="bcr-field">
              <label>Preferred incoterms *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {INCOTERM_OPTIONS.map((inc) => {
                  const on = selectedIncoterms.includes(inc);
                  return (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => toggleIncoterm(inc)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        border: on ? "2px solid #8B2252" : "1px solid #d1d5db",
                        background: on ? "#fdf2f8" : "#fff",
                        color: on ? "#8B2252" : "#374151",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {on && "✓ "}{inc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cut nomenclature toggle */}
          {category === "Beef" && (
            <div className="bcr-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                Cut Nomenclature
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => { if (filledRows === 0) setCutRegion("global"); }}
                  disabled={filledRows > 0 && String(cutRegion) !== "global"}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13,
                    border: cutRegion === "global" ? "2px solid #8B1A3A" : "1.5px solid #D1D5DB",
                    background: cutRegion === "global" ? "#F5E6EC" : (filledRows > 0 && String(cutRegion) !== "global") ? "#F3F4F6" : "white",
                    fontWeight: cutRegion === "global" ? 700 : 400,
                    color: cutRegion === "global" ? "#8B1A3A" : (filledRows > 0 && String(cutRegion) !== "global") ? "#D1D5DB" : "#6B7280",
                    cursor: (filledRows > 0 && String(cutRegion) !== "global") ? "not-allowed" : "pointer",
                    opacity: (filledRows > 0 && String(cutRegion) !== "global") ? 0.5 : 1,
                  }}
                >
                  🌐 Global Beef Cuts
                </button>
                <button
                  type="button"
                  onClick={() => { if (filledRows === 0) setCutRegion("us"); }}
                  disabled={filledRows > 0 && String(cutRegion) !== "us"}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13,
                    border: cutRegion === "us" ? "2px solid #8B1A3A" : "1.5px solid #D1D5DB",
                    background: cutRegion === "us" ? "#F5E6EC" : (filledRows > 0 && String(cutRegion) !== "us") ? "#F3F4F6" : "white",
                    fontWeight: cutRegion === "us" ? 700 : 400,
                    color: cutRegion === "us" ? "#8B1A3A" : (filledRows > 0 && String(cutRegion) !== "us") ? "#D1D5DB" : "#6B7280",
                    cursor: (filledRows > 0 && String(cutRegion) !== "us") ? "not-allowed" : "pointer",
                    opacity: (filledRows > 0 && String(cutRegion) !== "us") ? 0.5 : 1,
                  }}
                >
                  🇺🇸 US Beef Cuts (IMPS)
                </button>
                {filledRows > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove all added cuts and start over?")) {
                        setRows([newRow()]);
                      }
                    }}
                    style={{
                      padding: "6px 14px", borderRadius: 8,
                      border: "1.5px solid #EF4444", background: "white",
                      color: "#EF4444", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    🔄 Reset cuts
                  </button>
                )}
                {filledRows > 0 && (
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {cutRegion === "us" ? "🇺🇸 US Beef Cuts" : "🌐 Global Beef Cuts"} · {filledRows} cut{filledRows > 1 ? "s" : ""} added
                  </span>
                )}
              </div>
              {cutRegion === "us" && (
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                  💡 US Beef Cuts use IMPS/NAMP nomenclature, recommended when sourcing from American suppliers
                </div>
              )}
            </div>
          )}

          <div className="bcr-card">
            <div className="bcr-cuts-head">
              <div className="bcr-cuts-title">
                <span className="bcr-ic-sq" aria-hidden>▦</span>
                <strong>Product / Cuts requested</strong>
                <span className="bcr-count">· {filledRows}</span>
              </div>
              <button type="button" className="bcr-ai-pill" onClick={() => setShowImport(true)}>
                <SparkleIcon size={13} /> Paste / Import with AI
              </button>
              {cutRegion === "us" && (
                <span style={{ fontSize: 11, color: "#8B1A3A", background: "#FBEAF0", border: "1px solid rgba(139,26,58,.2)", padding: "4px 8px", borderRadius: 6, lineHeight: 1.35, maxWidth: 360 }}>
                  🇺🇸 Item list will be shown as per your cuts nomenclature selected: <strong>US Beef Cuts</strong>. To select Global beef cuts, click the <strong>🌐 Global Beef Cuts</strong> button above to switch.
                </span>
              )}
              <div className="bcr-vol">
                <span className="bcr-vol-l">TOTAL VOLUME</span>
                <strong>{fmtWeight(totalKg, unit)}</strong>
                <span className="bcr-vol-u">{weightLabel(unit)}</span>
              </div>
            </div>

            <div className="bcr-progress">
              <div className="bcr-progress-bar" style={{ width: `${pctOfCapacity}%` }} />
            </div>
            <div className="bcr-progress-meta">
              <span>{Math.round(pctOfCapacity)}% of container</span>
              <span>{fmtWeight(totalKg, unit)} / {fmtWeight(capacity, unit)} {weightLabel(unit)}</span>
            </div>

            {/* desktop table */}
            <div className="bcr-table-wrap">
              <table className="bcr-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th style={{ width: 44 }} aria-label="img"></th>
                <th>PRODUCT / CUT</th>
                    <th style={{ width: 110 }}>Bone</th>
                    <th>Spec (optional)</th>
                    <th>{"\n"}</th>
                    <th style={{ width: 110 }}>Qty ({weightLabel(unit)})</th>
                    <th style={{ width: 120 }}>Target {priceLabel(unit)}</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="bcr-td-num">{i + 1}</td>
                      <td>
                        <span className="bcr-thumb">
                          {r.cutImage ? <img src={r.cutImage} alt="" /> : <span>📷</span>}
                        </span>
                      </td>
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
                                      onSelect={() => { update(r.id, { cut: c.displayName, cutImage: c.image_url ?? null, boneSpec: c.bone_spec ?? "Boneless" }); setOpenCutFor(null); }}
                                    >
                                      <span className="bcr-pick-thumb">
                                        {c.image_url ? <img src={c.image_url} alt="" /> : <span>📷</span>}
                                      </span>
                                      <span style={{ flex: 1 }}>{c.displayName}</span>
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
                          value={r.boneSpec}
                          onChange={(e) => update(r.id, { boneSpec: e.target.value as "Bone-In" | "Boneless" | "Offals" })}
                        >
                          <option value="Boneless">Boneless</option>
                          <option value="Bone-In">Bone-In</option>
                          <option value="Offals">Offals</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="bcr-input"
                          value={r.marbling}
                          onChange={(e) => update(r.id, { marbling: e.target.value })}
                          style={{ visibility: "hidden" }}
                        >
                          {MARBLINGS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          className="bcr-input bcr-input-num"
                          type="number" inputMode="decimal" min="0"
                          value={unit === "kg" ? r.qty : (r.qty ? String(Math.round(toDisplay(Number(r.qty), "weight", unit))) : "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw) { update(r.id, { qty: "" }); return; }
                            const inKg = unit === "kg" ? raw : String(fromDisplay(parseFloat(raw) || 0, "weight", unit));
                            update(r.id, { qty: inKg });
                          }}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          className="bcr-input bcr-input-num"
                          type="number" inputMode="decimal" step="0.01" min="0"
                          value={unit === "kg" ? r.target : (r.target ? toDisplay(Number(r.target), "price", unit).toFixed(2) : "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw) { update(r.id, { target: "" }); return; }
                            const inKg = unit === "kg" ? raw : String(fromDisplay(parseFloat(raw) || 0, "price", unit));
                            update(r.id, { target: inKg });
                          }}
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
                  <label>PRODUCT / CUT</label>
                  <div className="bcr-cut-row-m">
                    <span className="bcr-thumb">
                      {r.cutImage ? <img src={r.cutImage} alt="" /> : <span>📷</span>}
                    </span>
                    <input
                      className="bcr-input"
                      value={r.cut}
                      onChange={(e) => {
                        const v = e.target.value;
                        const match = cuts.find((c) => c.displayName.toLowerCase() === v.toLowerCase());
                        update(r.id, { cut: v, cutImage: match?.image_url ?? null, ...(match ? { boneSpec: match.bone_spec ?? "Boneless" } : {}) });
                      }}
                      placeholder="Pick or type cut…"
                      list={`cuts-${category}`}
                    />
                  </div>
                  <datalist id={`cuts-${category}`}>
                    {cuts.map((c) => <option key={c.id} value={c.displayName} />)}
                  </datalist>
                  <div className="bcr-rcard-grid">
                    <div>
                      <label>Spec</label>
                      <input className="bcr-input" value={r.spec} onChange={(e) => update(r.id, { spec: e.target.value })} placeholder="7-9 lb" />
                    </div>
                    <div>
                      <label>Bone</label>
                      <select className="bcr-input" value={r.boneSpec} onChange={(e) => update(r.id, { boneSpec: e.target.value as "Bone-In" | "Boneless" | "Offals" })}>
                        <option value="Boneless">Boneless</option>
                        <option value="Bone-In">Bone-In</option>
                        <option value="Offals">Offals</option>
                      </select>
                    </div>
                    <div>
                      <label>MARBLING / GRADE</label>
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

          {/* ATTACHMENTS */}
          <div className="bcr-card">
            <div className="bcr-side-title" style={{ borderBottom: "1px solid var(--g100, #f5f4f3)", marginBottom: 12 }}>
              📎 SPECIFICATIONS &amp; PHOTOS
            </div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: "0 0 10px" }}>
              Upload product specs, reference images, or other documents. PDF, PNG, JPG — max 5MB each, up to 10 files.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              style={{
                border: "1.5px dashed #d1d5db",
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                background: "var(--g050, #fafaf9)",
              }}
            >
              <UploadIcon size={28} style={{ color: "var(--fg-muted)" }} />
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
                Drop files here or click to upload
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                PDF, PNG, JPG · max 5MB each · up to 10 files
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: "none" }}
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            {files.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {files.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 999,
                      background: "#FBEAF0", color: "#8B2252",
                      fontSize: 12, fontWeight: 500,
                    }}
                  >
                    <FileIcon size={12} />
                    <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      style={{ background: "transparent", border: "none", color: "#8B2252", cursor: "pointer", padding: 0, display: "inline-flex" }}
                      aria-label="Remove file"
                    >
                      <XIcon size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {isEdit && existingAttachments.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 6 }}>
                  EXISTING FILES
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {existingAttachments.map((f, i) => (
                    <span key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 999,
                      background: "var(--g050, #fafaf9)", color: "var(--fg-muted)",
                      fontSize: 12, border: "1px solid var(--border)",
                    }}>
                      <FileIcon size={12} />
                      <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</a>
                      <button
                        type="button"
                        onClick={() => setExistingAttachments((prev) => prev.filter((_, j) => j !== i))}
                        style={{ background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: 0, display: "inline-flex" }}
                        aria-label="Remove file"
                      >
                        <XIcon size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: logistics & terms */}
        <aside className="bcr-col bcr-col-r">
          <div className="bcr-card bcr-card-logistics">
            <div className="bcr-side-title">
              <ClipboardIcon size={14} /> LOGISTICS &amp; TERMS
            </div>

            <div className="bcr-side-block" ref={originRef} style={{ position: "relative" }}>
              <label className="bcr-side-label">COUNTRY OF ORIGIN</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={anyOrigin} onChange={(e) => setAnyOrigin(e.target.checked)} />
                Any origin accepted
              </label>
              {!anyOrigin && (
                <>
                  <input
                    type="text"
                    className="bcr-input"
                    value={originSearch}
                    onChange={(e) => { setOriginSearch(e.target.value); setOriginOpen(true); }}
                    onFocus={() => setOriginOpen(true)}
                    placeholder="Type to add an origin country…"
                    autoComplete="off"
                  />
                  {originOpen && filteredOrigin.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 200, overflowY: "auto", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                      {filteredOrigin.map((m) => (
                        <div
                          key={m.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setOriginCountries((prev) => [...prev, m.n]);
                            setOriginSearch("");
                            setOriginOpen(false);
                          }}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                          {m.f} {m.n}
                        </div>
                      ))}
                    </div>
                  )}
                  {originCountries.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {originCountries.map((c) => (
                        <span
                          key={c}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "4px 10px", borderRadius: 999,
                            background: "#FBEAF0", color: "#8B2252",
                            fontSize: 12, fontWeight: 500,
                          }}
                        >
                          {countryFlag(c)} {c}
                          <button
                            type="button"
                            onClick={() => setOriginCountries((prev) => prev.filter((x) => x !== c))}
                            style={{ background: "transparent", border: "none", color: "#8B2252", cursor: "pointer", padding: 0, display: "inline-flex" }}
                            aria-label="Remove"
                          >
                            <XIcon size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
              {category === "Beef" && !anyOrigin && originCountries.includes("United States") && cutRegion === "global" && (
                <div style={{ fontSize: 11, color: "#2563EB", marginTop: 4 }}>
                  💡 Tip: Consider using 🇺🇸 US Beef Cuts (IMPS) above to match American supplier nomenclature
                </div>
              )}
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

            <div className="bcr-side-block" ref={supplierRef} style={{ position: "relative" }}>
              <label className="bcr-side-label">DISTRIBUTION</label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                <input
                  type="radio"
                  checked={distribution === "marketplace"}
                  onChange={() => { setDistribution("marketplace"); setTargetSupplierId(""); }}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>🌐 All suppliers (marketplace)</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Visible to every supplier on the platform</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={distribution === "specific"}
                  onChange={() => setDistribution("specific")}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>🎯 Specific supplier</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Only the selected supplier will see this request</div>
                </div>
              </label>

              {distribution === "specific" && (
                <div style={{ marginTop: 8, position: "relative" }}>
                  <input
                    type="text"
                    className="bcr-input"
                    value={supplierDropdownOpen ? supplierSearch : (suppliers.find((s) => s.id === targetSupplierId)?.name || "")}
                    onChange={(e) => { setSupplierSearch(e.target.value); setSupplierDropdownOpen(true); }}
                    onFocus={() => { setSupplierSearch(""); setSupplierDropdownOpen(true); }}
                    placeholder="Search supplier…"
                    autoComplete="off"
                  />
                  {supplierDropdownOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 220, overflowY: "auto", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                      {suppliers
                        .filter((s) => !supplierSearch.trim() || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                        .slice(0, 50)
                        .map((s) => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTargetSupplierId(s.id);
                              setSupplierSearch("");
                              setSupplierDropdownOpen(false);
                            }}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                          >
                            {countryFlag(s.country || "")} {s.name}
                          </div>
                        ))}
                      {suppliers.filter((s) => !supplierSearch.trim() || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--fg-muted)" }}>No suppliers found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="bcr-footer">
        <div className="bcr-summary">
          <strong>{filledRows}</strong> product / cuts · <strong>{totalKg.toLocaleString()}</strong> kg · {containerCount}×{containerType}ft
        </div>
        <div className="bcr-actions">
          <button type="button" className="bcr-btn-ghost" onClick={() => navigate("/buyer/requests")}>Cancel</button>
          <button type="button" className="bcr-btn-primary" onClick={broadcast} disabled={submitting || loadingEdit}>
            {isEdit ? "💾 Save changes" : "✓ Submit request"}
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
