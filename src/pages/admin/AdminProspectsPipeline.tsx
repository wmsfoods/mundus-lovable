import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload, Plus, KanbanSquare, Table as TableIcon } from "lucide-react";
import {
  useAdminProspects, getStageCounts, getFunnelMetrics,
  getOwnerLeaderboard, getSourceBreakdown,
  PIPELINE_STAGES,
} from "@/hooks/useAdminProspects";
import { AddProspectModal } from "@/components/admin/AddProspectModal";
import { ImportProspectsModal } from "@/components/admin/ImportProspectsModal";

const fmtGmv = (v?: number) =>
  v == null ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

export default function AdminProspectsPipeline() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const list = useAdminProspects();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const counts = useMemo(() => getStageCounts(list), [list]);
  const totalCount = list.length;
  const activeCount = totalCount - counts.lost - counts.onboarded;

  const grouped = useMemo(() => {
    const map: Record<string, typeof list> = {};
    PIPELINE_STAGES.forEach((s) => { map[s] = []; });
    list.forEach((p) => { if (map[p.stage]) map[p.stage].push(p); });
    return map;
  }, [list]);

  const funnel = useMemo(() => getFunnelMetrics(list), [list]);
  const leaderboard = useMemo(() => getOwnerLeaderboard(list), [list]);
  const sources = useMemo(() => getSourceBreakdown(list), [list]);
  const maxActive = Math.max(1, ...leaderboard.map((l) => l.activeCount));
  const maxSource = Math.max(1, ...sources.map((s) => s.count));

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">{t("admin.crm.title")}</span>
          <span className="adm-page-subtle">· {t("admin.crm.subtitle", { active: activeCount, total: totalCount })}</span>
        </div>
        <div className="crm-header-actions">
          <div className="crm-seg" style={{ marginRight: 8 }}>
            <Link to="/admin/crm/prospects" className="crm-seg-btn" aria-label="Table"><TableIcon size={14} /></Link>
            <button type="button" className="crm-seg-btn is-active" aria-label="Kanban"><KanbanSquare size={14} /></button>
          </div>
          <button type="button" className="crm-btn-outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> {t("admin.crm.importCsv")}
          </button>
          <button type="button" className="crm-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> {t("admin.crm.addProspect")}
          </button>
        </div>
      </div>

      {/* kanban */}
      <div className="crm-kanban">
        {PIPELINE_STAGES.map((s) => (
          <div className="crm-col" key={s}>
            <div className="crm-col-header">
              <span className={`pill stage-${s}`}>{t(`admin.crm.stages.${s}`)}</span>
              <span className="crm-col-count">{grouped[s].length}</span>
            </div>
            <div className="crm-col-body">
              {grouped[s].map((p) => (
                <div className="crm-card" key={p.id} onClick={() => nav(`/admin/crm/prospects/${p.id}`)}>
                  <div className="crm-card-top">
                    <span className="adm-table-av crm-av-blue">{p.initials}</span>
                    <div className="crm-cell-stack">
                      <span className="name">{p.companyName}</span>
                      <span className="mono">{p.country}</span>
                    </div>
                  </div>
                  <div className="crm-card-notes">{p.notes}</div>
                  <div className="crm-card-bottom">
                    <span className="pill info">{t(`admin.crm.roles.${p.role}`)}</span>
                    <span className="crm-card-gmv">{fmtGmv(p.estGmv)}</span>
                    <span className="crm-owner-av">{p.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* analytics row */}
      <div className="adm-row-3">
        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.kanban.funnelConversion")}</span></div>
          <div className="adm-list">
            {funnel.map((f) => (
              <div key={`${f.from}-${f.to}`} className="crm-funnel-row">
                <span className="crm-funnel-label">
                  {t(`admin.crm.stages.${f.from}`)} → {t(`admin.crm.stages.${f.to}`)}
                </span>
                <div className="crm-funnel-bar"><div className="crm-funnel-fill" style={{ width: `${f.percent}%` }} /></div>
                <span className="crm-funnel-pct">{f.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.kanban.ownerLeaderboard")}</span></div>
          <div className="adm-list">
            {leaderboard.map((o) => (
              <div className="adm-list-row" key={o.initials}>
                <span className="crm-owner-av" style={{ width: 24, height: 24, fontSize: 11 }}>{o.initials}</span>
                <div className="adm-list-meta">
                  <div className="adm-list-top">
                    <span className="adm-list-name">{o.name}</span>
                  </div>
                  <span className="crm-cell-sub">
                    {t("admin.crm.kanban.qualifiedCount", { n: o.qualified })} · {t("admin.crm.kanban.onboardedCount", { n: o.onboarded })}
                  </span>
                  <div className="adm-list-bar"><div className="adm-list-bar-fill" style={{ width: `${(o.activeCount / maxActive) * 100}%` }} /></div>
                </div>
                <span className="adm-list-value">{o.activeCount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.kanban.sources")}</span></div>
          <div className="adm-list">
            {sources.map((s) => (
              <div key={s.source} className="crm-funnel-row">
                <span className={`crm-source ${s.source}`} style={{ minWidth: 80 }}>{t(`admin.crm.sources.${s.source}`)}</span>
                <div className="crm-funnel-bar"><div className="crm-funnel-fill" style={{ width: `${(s.count / maxSource) * 100}%`, background: "#888780" }} /></div>
                <span className="crm-funnel-pct">{s.count} · {s.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddProspectModal open={addOpen} onOpenChange={setAddOpen} />
      <ImportProspectsModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}