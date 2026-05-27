import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/mundus-learning-log.css";

type Row = {
  id?: string;
  week_start: string; // YYYY-MM-DD (Monday)
  worked: string;
  stuck: string;
  next_action: string;
  filled_at: string | null;
  tags: string[];
  _dirty?: boolean;
  _saving?: boolean;
  _savedAt?: number;
};

const STOPWORDS = new Set([
  "a","o","e","de","da","do","com","para","em","no","na","os","as","um","uma","que","sem",
  "the","of","and","to","in","on","for","at","by","with","is","was","be","or","an","not","no",
  "el","la","los","las","y","con","por","sin","es","del","una","un",
  "le","les","des","du","et","au","aux","est","pas","ou",
]);

function startOfWeekISO(d: Date): string {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday-start
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - diff);
  return m.toISOString().slice(0, 10);
}

function isoWeekNumber(dateStr: string): { week: number; year: number } {
  const d = new Date(dateStr + "T00:00:00Z");
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { week, year: target.getUTCFullYear() };
}

function quarterFor(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function WeeklyLearningLog() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quarter, setQuarter] = useState<string>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, number>>({});

  const thisWeek = useMemo(() => startOfWeekISO(new Date()), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_learnings")
      .select("id, week_start, worked, stuck, next_action, tags, filled_at")
      .order("week_start", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const byWeek = new Map<string, Row>();
    (data ?? []).forEach((r: any) => {
      const wk = (r.week_start || "").slice(0, 10);
      if (!wk) return;
      // Take the most recent per week (data ordered desc)
      if (!byWeek.has(wk)) {
        byWeek.set(wk, {
          id: r.id,
          week_start: wk,
          worked: r.worked || "",
          stuck: r.stuck || "",
          next_action: r.next_action || "",
          tags: r.tags || [],
          filled_at: r.filled_at,
        });
      }
    });
    // Ensure this week is present
    if (!byWeek.has(thisWeek)) {
      byWeek.set(thisWeek, {
        week_start: thisWeek, worked: "", stuck: "", next_action: "", tags: [], filled_at: null,
      });
    }
    const sorted = Array.from(byWeek.values()).sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
    setRows(sorted);
    setLoading(false);
  }, [thisWeek]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (row: Row) => {
    const payload: any = {
      week_start: row.week_start,
      worked: row.worked || null,
      stuck: row.stuck || null,
      next_action: row.next_action || null,
      tags: row.tags || [],
      filled_at: new Date().toISOString(),
      created_by: userId,
      theme: "weekly-log",
      insight: row.worked || row.stuck || row.next_action || "—",
    };
    if (row.id) {
      const { error } = await supabase.from("crm_learnings").update(payload).eq("id", row.id);
      if (error) { toast.error(error.message); return null; }
      return row.id;
    } else {
      const { data, error } = await supabase.from("crm_learnings").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return null; }
      return (data as any)?.id ?? null;
    }
  }, [userId]);

  const updateField = (week: string, field: "worked" | "stuck" | "next_action", value: string) => {
    setRows((prev) => prev.map((r) => (r.week_start === week ? { ...r, [field]: value, _dirty: true } : r)));
    const key = `${week}`;
    if (debounceRef.current[key]) window.clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = window.setTimeout(async () => {
      let snapshot: Row | undefined;
      setRows((prev) => {
        snapshot = prev.find((r) => r.week_start === week);
        return prev.map((r) => (r.week_start === week ? { ...r, _saving: true } : r));
      });
      if (!snapshot) return;
      const newId = await persist(snapshot);
      setRows((prev) => prev.map((r) => (r.week_start === week
        ? { ...r, id: newId ?? r.id, _saving: false, _dirty: false, _savedAt: Date.now() }
        : r)));
    }, 700);
  };

  const addPrevious = () => {
    setRows((prev) => {
      const oldest = prev[prev.length - 1]?.week_start || thisWeek;
      const newWeek = addWeeks(oldest, -1);
      if (prev.some((r) => r.week_start === newWeek)) return prev;
      return [...prev, { week_start: newWeek, worked: "", stuck: "", next_action: "", tags: [], filled_at: null }];
    });
  };

  // Filtering
  const quarters = useMemo(() => {
    const set = new Set(rows.map((r) => quarterFor(r.week_start)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (quarter !== "all" && quarterFor(r.week_start) !== quarter) return false;
      if (q && ![r.worked, r.stuck, r.next_action].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, quarter]);

  // Smart insights
  const insights = useMemo(() => {
    const recent = rows
      .filter((r) => r.stuck && r.stuck.trim().length > 0)
      .slice(0, 6);
    const freq: Record<string, number> = {};
    recent.forEach((r) => {
      const tokens = (r.stuck || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w));
      const seen = new Set<string>();
      tokens.forEach((w) => {
        if (seen.has(w)) return;
        seen.add(w);
        freq[w] = (freq[w] || 0) + 1;
      });
    });
    const repeating = Object.entries(freq)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Pending: rows older than 7d with next_action but later "worked" doesn't reference any keyword
    const pending: Array<{ week: string; text: string }> = [];
    const sortedByWeek = [...rows].sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
    for (let i = 0; i < sortedByWeek.length - 1; i++) {
      const cur = sortedByWeek[i];
      const next = sortedByWeek[i + 1];
      if (!cur.next_action) continue;
      const ageDays = (Date.now() - new Date(cur.week_start + "T00:00:00Z").getTime()) / 86400000;
      if (ageDays < 7) continue;
      const kws = cur.next_action.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && !STOPWORDS.has(w)).slice(0, 4);
      const nextWorked = (next.worked || "").toLowerCase();
      const mentioned = kws.some((k) => nextWorked.includes(k));
      if (!mentioned) pending.push({ week: cur.week_start, text: cur.next_action });
    }
    return { repeating, pending: pending.slice(0, 3) };
  }, [rows]);

  const filledRows = rows.filter((r) => r.worked || r.stuck || r.next_action);
  const streak = useMemo(() => {
    let s = 0;
    let cursor = thisWeek;
    const filledSet = new Set(filledRows.map((r) => r.week_start));
    while (filledSet.has(cursor)) {
      s++;
      cursor = addWeeks(cursor, -1);
    }
    return s;
  }, [filledRows, thisWeek]);

  return (
    <div className="mw-llog-wrap">
      <div className="mw-llog-card">
        <header className="mw-llog-head">
          <div className="mw-llog-head-row">
            <div>
              <h2 className="mw-llog-title">{t("admin.crm.pipeline.learnings.log.title")}</h2>
              <div className="mw-llog-sub">{t("admin.crm.pipeline.learnings.log.subtitle")}</div>
            </div>
            <button type="button" className="mw-llog-cta" onClick={addPrevious}>
              <Plus size={14} /> {t("admin.crm.pipeline.learnings.log.addPrevious")}
            </button>
          </div>
        </header>

        <div className="mw-llog-toolbar">
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={13} style={{ position: "absolute", left: 8, color: "#9B2251" }} />
            <input
              type="text"
              placeholder={t("admin.crm.pipeline.learnings.log.filterSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 26 }}
            />
          </div>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
            <option value="all">{t("admin.crm.pipeline.learnings.log.filterQuarter")}</option>
            {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <div className="mw-llog-stats">
            <span><strong>{filledRows.length}</strong> {t("admin.crm.pipeline.learnings.log.weeksLogged")}</span>
            <span><strong>{streak}</strong> {t("admin.crm.pipeline.learnings.log.streak")}</span>
          </div>
        </div>

        {loading ? (
          <div className="mw-llog-empty"><div className="mw-llog-empty-t">…</div></div>
        ) : visibleRows.length === 0 ? (
          <div className="mw-llog-empty">
            <div className="mw-llog-empty-t">{t("admin.crm.pipeline.learnings.log.emptyTitle")}</div>
            <button type="button" className="mw-llog-cta" style={{ background: "#9B2251", color: "#fff" }} onClick={addPrevious}>
              <Plus size={14} /> {t("admin.crm.pipeline.learnings.log.emptyCta")}
            </button>
          </div>
        ) : (
          <table className="mw-llog-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>{t("admin.crm.pipeline.learnings.log.colWeek")}</th>
                <th style={{ width: 90 }}>{t("admin.crm.pipeline.learnings.log.colFilled")}</th>
                <th className="mw-llog-th-worked">
                  ✓ {t("admin.crm.pipeline.learnings.log.colWorked")}
                  <span className="mw-llog-th-hint">{t("admin.crm.pipeline.learnings.log.colWorkedHint")}</span>
                </th>
                <th className="mw-llog-th-stuck">
                  ⚠ {t("admin.crm.pipeline.learnings.log.colStuck")}
                  <span className="mw-llog-th-hint">{t("admin.crm.pipeline.learnings.log.colStuckHint")}</span>
                </th>
                <th className="mw-llog-th-next">
                  🔧 {t("admin.crm.pipeline.learnings.log.colNext")}
                  <span className="mw-llog-th-hint">{t("admin.crm.pipeline.learnings.log.colNextHint")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const wk = isoWeekNumber(r.week_start);
                const isThis = r.week_start === thisWeek;
                return (
                  <tr key={r.week_start} className={isThis ? "mw-llog-row-this" : ""}>
                    <td className="mw-llog-week">
                      W{String(wk.week).padStart(2, "0")} · {wk.year}
                      <small>{formatShortDate(r.week_start, i18n.language)}</small>
                      {isThis && <div className="mw-llog-this-pill">{t("admin.crm.pipeline.learnings.log.thisWeek")}</div>}
                    </td>
                    <td className="mw-llog-filled">
                      {r.filled_at ? formatShortDate(r.filled_at.slice(0, 10), i18n.language) : "—"}
                      {r._saving && <div className="mw-llog-save-flag">{t("admin.crm.pipeline.learnings.log.saving")}</div>}
                      {!r._saving && r._savedAt && Date.now() - r._savedAt < 2500 && (
                        <div className="mw-llog-save-flag">✓ {t("admin.crm.pipeline.learnings.log.savedAt")}</div>
                      )}
                    </td>
                    <td>
                      <textarea
                        className="mw-llog-cell mw-llog-cell-worked"
                        rows={3}
                        placeholder={t("admin.crm.pipeline.learnings.log.placeholderWorked")}
                        value={r.worked}
                        onChange={(e) => updateField(r.week_start, "worked", e.target.value)}
                      />
                    </td>
                    <td>
                      <textarea
                        className="mw-llog-cell mw-llog-cell-stuck"
                        rows={3}
                        placeholder={t("admin.crm.pipeline.learnings.log.placeholderStuck")}
                        value={r.stuck}
                        onChange={(e) => updateField(r.week_start, "stuck", e.target.value)}
                      />
                    </td>
                    <td>
                      <textarea
                        className="mw-llog-cell mw-llog-cell-next"
                        rows={3}
                        placeholder={t("admin.crm.pipeline.learnings.log.placeholderNext")}
                        value={r.next_action}
                        onChange={(e) => updateField(r.week_start, "next_action", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Side: smart insights */}
      <aside className="mw-llog-side">
        <div className="mw-llog-side-card">
          <div className="mw-llog-side-title">
            <Sparkles size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
            {t("admin.crm.pipeline.learnings.log.insightsTitle")}
          </div>
          {insights.repeating.length === 0 && insights.pending.length === 0 ? (
            <div className="mw-llog-insight-empty">{t("admin.crm.pipeline.learnings.log.insightsEmpty")}</div>
          ) : (
            <>
              {insights.repeating.map(([word, count]) => (
                <div className="mw-llog-insight" key={word}>
                  <div className="mw-llog-insight-tag">{t("admin.crm.pipeline.learnings.log.insightsRepeating")}</div>
                  <div className="mw-llog-insight-text">"{word}" × {count}</div>
                </div>
              ))}
              {insights.pending.map((p) => (
                <div className="mw-llog-insight" key={p.week + p.text.slice(0, 20)}>
                  <div className="mw-llog-insight-tag">{t("admin.crm.pipeline.learnings.log.insightsPending")}</div>
                  <div className="mw-llog-insight-text">{p.text}</div>
                  <div className="mw-llog-insight-meta">{formatShortDate(p.week, i18n.language)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}