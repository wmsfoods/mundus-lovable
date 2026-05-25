import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Beef, Search, Check, Languages, Tag, Pencil, Upload, ImagePlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAdminCuts, CATEGORY_COLORS, type AdminCutRow, type CutCategory } from "@/hooks/useAdminCuts";
import EditCutModal from "@/components/admin/EditCutModal";
import { transformedPublicUrl } from "@/lib/imageOptimization";

const PAGE_SIZE = 25;
const CATS: ("all" | CutCategory)[] = ["all", "Beef", "Pork", "Poultry", "Ovine"];
type ActiveKey = "all" | "active" | "inactive";

export default function AdminProducts() {
  const { t } = useTranslation();
  const {
    rows, total, active, translationsCount, loading, error,
    toggleCutActive, updateCut, deleteCut, uploadCutImage, upsertTranslation, deleteTranslation, isMutating,
  } = useAdminCuts();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState<"all" | CutCategory>("all");
  const [activeF, setActiveF] = useState<ActiveKey>("all");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const tm = setTimeout(() => { setSearch(searchInput.trim().toLowerCase()); setPage(1); }, 300);
    return () => clearTimeout(tm);
  }, [searchInput]);

  const filtered = useMemo(() => {
    let list = rows;
    if (catF !== "all") list = list.filter((r) => r.category === catF);
    if (activeF === "active") list = list.filter((r) => r.is_active);
    else if (activeF === "inactive") list = list.filter((r) => !r.is_active);
    if (search) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(search) ||
        (r.product_number != null && String(r.product_number).includes(search)),
      );
    }
    return list;
  }, [rows, catF, activeF, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const handleToggle = async (row: AdminCutRow, next: boolean) => {
    setPendingId(row.id);
    try {
      await toggleCutActive(row.id, next);
      toast.success(t(next ? "admin.marketplace.cuts.toggle.activated" : "admin.marketplace.cuts.toggle.deactivated", { name: row.name }));
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setPendingId(null); }
  };

  const editingCut = useMemo(() => rows.find((r) => r.id === editId) ?? null, [rows, editId]);

  return (
    <div className="adm-body">
      <div className="adm-page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #8B2252, #7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Beef size={18} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="adm-page-title">{t("admin.marketplace.cuts.title")}</span>
            <span className="adm-page-subtle">{t("admin.marketplace.cuts.subtitle")}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
        <StatCard icon={<Beef size={16} />} label={t("admin.marketplace.cuts.stats.total")} value={total} />
        <StatCard icon={<Check size={16} />} label={t("admin.marketplace.cuts.stats.active")} value={active} accent="#16a34a" />
        <StatCard icon={<Tag size={16} />} label={t("admin.marketplace.cuts.stats.categories")} value={4} accent="#8B2252" />
        <StatCard icon={<Languages size={16} />} label={t("admin.marketplace.cuts.stats.translations")} value={translationsCount} accent="#378ADD" />
      </div>

      <div className="crm-toolbar" style={{ marginTop: 12 }}>
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder={t("admin.marketplace.cuts.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="crm-select" value={catF} onChange={(e) => { setCatF(e.target.value as any); setPage(1); }}>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? t("admin.marketplace.cuts.allCategories") : t(`admin.marketplace.cuts.categories.${c}`)}
            </option>
          ))}
        </select>
        <select className="crm-select" value={activeF} onChange={(e) => { setActiveF(e.target.value as ActiveKey); setPage(1); }}>
          <option value="all">{t("admin.marketplace.cuts.filters.all")}</option>
          <option value="active">{t("admin.marketplace.cuts.filters.activeOnly")}</option>
          <option value="inactive">{t("admin.marketplace.cuts.filters.inactiveOnly")}</option>
        </select>
      </div>

      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "var(--danger, #b91c1c)" }}>{error}</div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="adm-panel" style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{t("admin.marketplace.cuts.empty.title")}</h3>
          <p style={{ margin: "8px 0 0", color: "var(--fg-muted, #6b7280)", fontSize: 13 }}>{t("admin.marketplace.cuts.empty.body")}</p>
        </div>
      ) : (
        <>
          <div className="adm-panel adm-only-desktop" style={{ padding: 0, marginTop: 12 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}></th>
                    <th>{t("admin.marketplace.cuts.cols.name")}</th>
                    <th>{t("admin.marketplace.cuts.cols.pn")}</th>
                    <th>{t("admin.marketplace.cuts.cols.category")}</th>
                    <th>{t("admin.marketplace.cuts.cols.bone", { defaultValue: "Bone" })}</th>
                    <th>{t("admin.marketplace.cuts.cols.translations")}</th>
                    <th>{t("admin.marketplace.cuts.cols.active")}</th>
                    <th style={{ width: 70 }}>{t("admin.marketplace.cuts.cols.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const c = CATEGORY_COLORS[r.category];
                    return (
                      <RowDrop key={r.id} cutId={r.id} onUpload={uploadCutImage}>
                        <td><Thumb url={r.image_url} alt={r.name} cutId={r.id} onUpload={uploadCutImage} /></td>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.product_number != null ? <span className="adm-chip">{r.product_number}</span> : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}</td>
                        <td>
                          <span className="adm-chip" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                            {t(`admin.marketplace.cuts.categories.${r.category}`)}
                          </span>
                        </td>
                        <td>
                          <span className="adm-chip" style={{ background: r.bone_spec === "Bone-In" ? "#FEF3C7" : "#ECFDF5", color: r.bone_spec === "Bone-In" ? "#92400E" : "#065F46", borderColor: r.bone_spec === "Bone-In" ? "#FDE68A" : "#A7F3D0" }}>
                            {r.bone_spec}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {r.translations.length > 0 ? (
                            <span style={{ color: "var(--fg-muted, #6b7280)" }}>
                              {t("admin.marketplace.cuts.langsCount", { count: r.translations.length, defaultValue: "{{count}} langs" })}
                            </span>
                          ) : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}
                        </td>
                        <td>
                          <Switch checked={r.is_active} disabled={pendingId === r.id} onCheckedChange={(v) => handleToggle(r, !!v)} />
                        </td>
                        <td>
                          <button type="button" className="crm-btn-outline" onClick={() => setEditId(r.id)} aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                        </td>
                      </RowDrop>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-only-mobile adm-cards-stack" style={{ marginTop: 12 }}>
            {pageRows.map((r) => {
              const c = CATEGORY_COLORS[r.category];
              return (
                <CardDrop key={r.id} cutId={r.id} onUpload={uploadCutImage}>
                  <Thumb url={r.image_url} alt={r.name} cutId={r.id} onUpload={uploadCutImage} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <strong style={{ fontSize: 14 }}>{r.name}</strong>
                      {r.product_number != null && <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>#{r.product_number}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="adm-chip" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                        {t(`admin.marketplace.cuts.categories.${r.category}`)}
                      </span>
                      <span className="adm-chip" style={{ background: r.bone_spec === "Bone-In" ? "#FEF3C7" : "#ECFDF5", color: r.bone_spec === "Bone-In" ? "#92400E" : "#065F46", borderColor: r.bone_spec === "Bone-In" ? "#FDE68A" : "#A7F3D0" }}>
                        {r.bone_spec}
                      </span>
                      {r.translations.length > 0 && (
                        <span className="adm-chip">
                          <Languages size={10} style={{ marginRight: 3 }} />{r.translations.length}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Switch checked={r.is_active} disabled={pendingId === r.id} onCheckedChange={(v) => handleToggle(r, !!v)} />
                      <button type="button" className="crm-btn-outline" onClick={() => setEditId(r.id)}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </CardDrop>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12, color: "var(--fg-muted, #6b7280)", flexWrap: "wrap", gap: 8 }}>
            <span>{t("admin.marketplace.cuts.showing", { from: showingFrom, to: showingTo, total: filtered.length })}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="crm-btn-outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.back")}
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px" }}>{safePage} / {pageCount}</span>
              <button type="button" className="crm-btn-outline" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                {t("admin.marketplace.cuts.next")}
              </button>
            </div>
          </div>
        </>
      )}

      <EditCutModal
        cut={editingCut}
        open={!!editId}
        onOpenChange={(o) => { if (!o) setEditId(null); }}
        onSave={updateCut}
        onDelete={deleteCut}
        onUploadImage={uploadCutImage}
        onUpsertTranslation={upsertTranslation}
        onDeleteTranslation={deleteTranslation}
        isMutating={isMutating}
      />
    </div>
  );
}

function Thumb({ url, alt, cutId, onUpload }: { url: string | null; alt: string; cutId: string; onUpload: (id: string, f: File) => Promise<string> }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(url);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalUrl(url); }, [url]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Only image files"); return; }
    setBusy(true);
    try {
      const next = await onUpload(cutId, file);
      setLocalUrl(next);
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setBusy(false); }
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
      title="Click or drag an image"
      style={{
        width: 64, height: 64, borderRadius: 10, overflow: "hidden",
        background: drag ? "#EEF2FF" : "#F3F4F6",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `${drag ? 2 : 1}px ${drag ? "dashed" : "solid"} ${drag ? "#6366F1" : "#E5E7EB"}`,
        cursor: "pointer", position: "relative", transition: "all 0.15s",
      }}
    >
      <input
        ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
      />
      {localUrl ? (
        <img
          src={transformedPublicUrl(localUrl, { width: 128, height: 128, quality: 70 })}
          alt={alt}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Upload size={18} color="#9CA3AF" />
      )}
      {(busy || drag) && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(99,102,241,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>
          {busy ? "..." : "Drop"}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="adm-panel" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-muted, #6b7280)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        <span style={{ color: accent ?? "#8B2252" }}>{icon}</span> {label}
      </span>
      <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums", color: accent ?? "inherit" }}>{value.toLocaleString()}</strong>
    </div>
  );
}

function useRowDropzone(cutId: string, onUpload: (id: string, f: File) => Promise<string>) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const counter = useRef(0);
  const handlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      counter.current += 1;
      setDrag(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      e.stopPropagation();
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) setDrag(false);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      counter.current = 0;
      setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) { toast.error("Only image files"); return; }
      setBusy(true);
      try {
        await onUpload(cutId, f);
        toast.success("Image uploaded");
      } catch (err: any) { toast.error(err?.message || "Upload failed"); }
      finally { setBusy(false); }
    },
  };
  return { drag, busy, handlers };
}

function RowDrop({ cutId, onUpload, children }: { cutId: string; onUpload: (id: string, f: File) => Promise<string>; children: React.ReactNode }) {
  const { drag, busy, handlers } = useRowDropzone(cutId, onUpload);
  return (
    <tr
      {...handlers}
      style={{
        outline: drag ? "2px dashed #6366F1" : "none",
        outlineOffset: -2,
        background: drag ? "rgba(99,102,241,0.06)" : undefined,
        transition: "background 0.15s",
        position: "relative",
      }}
    >
      {children}
      {busy && (
        <td style={{ position: "absolute", right: 8, top: 8, padding: 0, border: 0, fontSize: 11, color: "#6366F1", fontWeight: 600 }}>Uploading…</td>
      )}
    </tr>
  );
}

function CardDrop({ cutId, onUpload, children }: { cutId: string; onUpload: (id: string, f: File) => Promise<string>; children: React.ReactNode }) {
  const { drag, busy, handlers } = useRowDropzone(cutId, onUpload);
  return (
    <div
      {...handlers}
      className="adm-panel"
      style={{
        padding: 12, display: "flex", gap: 12, alignItems: "flex-start",
        border: drag ? "2px dashed #6366F1" : undefined,
        background: drag ? "rgba(99,102,241,0.06)" : undefined,
        position: "relative", transition: "all 0.15s",
      }}
    >
      {children}
      {busy && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#6366F1", fontWeight: 600, borderRadius: 8 }}>
          <ImagePlus size={14} style={{ marginRight: 6 }} /> Uploading…
        </div>
      )}
    </div>
  );
}