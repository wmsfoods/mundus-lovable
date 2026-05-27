import "@/styles/mundus-outreach.css";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { MatchedRecipient } from "@/hooks/useOutreachIntelligence";

const FILTERS = ["All", "offer_alert", "request_match", "nudge", "welcome"];

type DraftPayload = {
  opportunityId: string;
  type: string;
  title: string;
  entityId: string;
  entityType: string;
  entityLabel: string;
  recipients: MatchedRecipient[];
};

function mapDraftToCampaignType(t: string): string {
  if (t === "new_offer_to_buyers") return "offer_alert";
  if (t === "new_request_to_suppliers") return "request_match";
  if (t === "stale_negotiation") return "nudge";
  if (t === "welcome_sequence") return "welcome";
  return "offer_alert";
}

function defaultTemplate(type: string, title: string) {
  if (type === "offer_alert")
    return `Hi {{first_name}},\n\nWe just published a new offer that matches your sourcing profile: ${title}.\n\nReview it here and let us know if you'd like to negotiate.\n\n— The Mundus team`;
  if (type === "request_match")
    return `Hi {{first_name}},\n\nA buyer on Mundus has posted a request that matches what you supply: ${title}.\n\nReply with your indication and we'll connect you.\n\n— The Mundus team`;
  if (type === "nudge")
    return `Hi {{first_name}},\n\nYour negotiation has been idle for a while. A quick response will keep the deal moving.\n\n— The Mundus team`;
  return `Welcome to Mundus, {{first_name}}!\n\nWe're glad to have ${"{{company}}"} on the platform. Here's a quick guide to get started.\n\n— The Mundus team`;
}

export default function OutreachCampaigns() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [params, setParams] = useSearchParams();

  // pick up draft from URL (from OutreachCenter "Send Campaign")
  useEffect(() => {
    const raw = params.get("draft");
    if (raw && !draft) {
      try {
        setDraft(JSON.parse(decodeURIComponent(raw)));
      } catch {
        /* ignore */
      }
      params.delete("draft");
      setParams(params, { replace: true });
    }
  }, [params, draft, setParams]);

  // load real campaigns + recipients
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["outreach-campaigns"],
    queryFn: async () => {
      const { data: camps } = await supabase
        .from("outreach_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const ids = (camps ?? []).map((c: any) => c.id);
      let recipientsByCamp: Record<string, any[]> = {};
      if (ids.length > 0) {
        const { data: recs } = await supabase
          .from("outreach_recipients")
          .select("*")
          .in("campaign_id", ids);
        for (const r of recs ?? []) {
          (recipientsByCamp[r.campaign_id] ??= []).push(r);
        }
      }
      return (camps ?? []).map((c: any) => ({ ...c, recipients: recipientsByCamp[c.id] ?? [] }));
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    if (filter === "All") return campaigns;
    return campaigns.filter((c: any) => (c.campaign_type ?? "").toLowerCase().includes(filter));
  }, [filter, campaigns]);

  return (
    <div className="out-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="out-h1">Campaigns</h1>
          <p className="out-sub">All outreach campaigns sent from Mundus</p>
        </div>
        <Button
          className="out-btn-wine"
          onClick={() =>
            setDraft({
              opportunityId: "",
              type: "new_offer_to_buyers",
              title: "Untitled campaign",
              entityId: "",
              entityType: "",
              entityLabel: "",
              recipients: [],
            })
          }
        >
          + New Campaign
        </Button>
      </div>
      <div className="out-filter-pills">
        {FILTERS.map((f) => (
          <button key={f} className={`out-pill-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "All" ? "All" : f}
          </button>
        ))}
      </div>

      {isLoading && <div className="out-card" style={{ padding: 20, color: "hsl(var(--muted-foreground))" }}>Loading campaigns…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="out-card" style={{ padding: 20, color: "hsl(var(--muted-foreground))" }}>
          No campaigns yet. Trigger one from the Outreach Center or click "+ New Campaign".
        </div>
      )}

      {/* Desktop table */}
      {rows.length > 0 && (
      <div className="out-card out-desktop-only">
        <div className="out-table-wrap">
        <table className="out-table">
          <thead><tr><th></th><th>Campaign</th><th>Type</th><th>Recipients</th><th>Opened</th><th>Clicked</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {rows.map((c: any) => (
              <Fragment key={c.id}>
                <tr onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
                  <td>{expanded === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td>{c.subject}</td>
                  <td><span className="out-badge cat">{c.campaign_type}</span></td>
                  <td>{c.recipients_count}</td>
                  <td>{c.opened_count} {c.recipients_count > 0 ? `(${Math.round((c.opened_count / c.recipients_count) * 100)}%)` : ""}</td>
                  <td>{c.clicked_count}</td>
                  <td><span className={`out-pill ${c.status}`}>{c.status}</span></td>
                  <td>{new Date(c.sent_at ?? c.created_at).toLocaleDateString()}</td>
                </tr>
                {expanded === c.id && (
                  <tr className="out-expand-row">
                    <td colSpan={8}>
                      <table className="out-rec-table">
                        <thead><tr><th>Email</th><th>Name</th><th>Company</th><th>Country</th><th>Status</th></tr></thead>
                        <tbody>
                          {c.recipients.length === 0 && (
                            <tr><td colSpan={5} style={{ color: "hsl(var(--muted-foreground))" }}>No recipients recorded.</td></tr>
                          )}
                          {c.recipients.map((r: any) => (
                            <tr key={r.id}>
                              <td>{r.contact_email}</td><td>{r.contact_name}</td><td>{r.company_name}</td><td>{r.country}</td>
                              <td><span className={`out-pill ${r.status}`}>{r.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      )}

      {/* Mobile card list */}
      <div className="out-mobile-only out-list">
        {rows.map((c: any) => {
          const openPct = c.recipients_count > 0 ? Math.round((c.opened_count / c.recipients_count) * 100) : 0;
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="out-item">
              <div className="out-item-head" onClick={() => setExpanded(isOpen ? null : c.id)} style={{ cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="out-item-title">{c.subject}</div>
                  <div className="out-item-meta" style={{ marginTop: 4 }}>
                    <span className="out-badge cat">{c.campaign_type}</span>
                    <span className={`out-pill ${c.status}`}>{c.status}</span>
                  </div>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              <div className="out-item-meta">
                <span>📅 {new Date(c.sent_at ?? c.created_at).toLocaleDateString()}</span>
              </div>
              <div className="out-item-stats">
                <div className="out-item-stat"><span className="out-item-stat-label">Recipients</span><span className="out-item-stat-value">{c.recipients_count}</span></div>
                <div className="out-item-stat"><span className="out-item-stat-label">Opened</span><span className="out-item-stat-value">{c.opened_count} <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 400 }}>({openPct}%)</span></span></div>
                <div className="out-item-stat"><span className="out-item-stat-label">Clicked</span><span className="out-item-stat-value">{c.clicked_count}</span></div>
              </div>
              {isOpen && (
                <div className="out-item-expand">
                  {c.recipients.length === 0 && <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>No recipients recorded.</div>}
                  {c.recipients.map((r: any) => (
                    <div key={r.id} className="out-rec-mini">
                      <div className="out-rec-mini-info">
                        <div className="out-rec-mini-name">{r.contact_name}</div>
                        <div className="out-rec-mini-sub">{r.company_name} · {r.contact_email}</div>
                      </div>
                      <span className={`out-pill ${r.status}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CampaignDraftDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["outreach-campaigns"] });
          setDraft(null);
        }}
      />
    </div>
  );
}

function CampaignDraftDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: DraftPayload | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [campaignType, setCampaignType] = useState("offer_alert");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const ct = mapDraftToCampaignType(draft.type);
    setCampaignType(ct);
    setSubject(draft.title);
    setBody(defaultTemplate(ct, draft.title));
  }, [draft]);

  if (!draft) return null;

  const recipients = draft.recipients ?? [];

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error("No recipients to send to.");
      return;
    }
    setSending(true);
    try {
      const { data: camp, error } = await supabase
        .from("outreach_campaigns")
        .insert({
          campaign_type: campaignType,
          subject,
          body_html: body,
          recipients_count: recipients.length,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      if (camp?.id && recipients.length > 0) {
        const rows = recipients.map((r) => ({
          campaign_id: camp.id,
          contact_email: r.contactEmail || `${r.companyId}@unknown`,
          contact_name: r.contactName || r.companyName,
          company_name: r.companyName,
          country: r.country,
          status: "queued",
        }));
        await supabase.from("outreach_recipients").insert(rows);
      }

      auditLog({
        action: "outreach.campaign_created",
        category: "system",
        entityType: draft.entityType,
        entityId: draft.entityId || null,
        entityLabel: draft.entityLabel || subject,
        details: {
          campaign_id: camp?.id,
          campaign_type: campaignType,
          subject,
          recipient_count: recipients.length,
          recipients: recipients.map((r) => ({
            companyId: r.companyId,
            companyName: r.companyName,
            email: r.contactEmail,
            matchScore: r.matchScore,
            matchReasons: r.matchReasons,
          })),
        },
      });

      toast.success(`Campaign logged for ${recipients.length} recipients — connect an email provider to send.`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full mt-1 border rounded px-2 py-2 text-sm bg-background"
            >
              <option value="offer_alert">Offer alert</option>
              <option value="request_match">Request match</option>
              <option value="nudge">Nudge</option>
              <option value="welcome">Welcome</option>
            </select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code>{"{{first_name}}"}</code> and <code>{"{{company}}"}</code> as personalization tokens.
            </p>
          </div>
          <div>
            <Label>Recipients ({recipients.length})</Label>
            <div className="mt-1 max-h-48 overflow-y-auto border rounded p-2 space-y-1 text-sm">
              {recipients.length === 0 && <div className="text-muted-foreground text-xs">No recipients matched.</div>}
              {recipients.map((r) => (
                <div key={r.companyId} className="flex justify-between items-center text-xs">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.companyName}</div>
                    <div className="text-muted-foreground truncate">{r.contactEmail || "no email"} · {r.country}</div>
                  </div>
                  <span className="out-pill sent">{r.matchScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button className="out-btn-wine" onClick={handleSend} disabled={sending || recipients.length === 0}>
            {sending ? "Saving…" : "Send Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}