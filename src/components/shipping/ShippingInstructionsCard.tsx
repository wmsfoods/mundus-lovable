import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import "@/styles/mundus-shipping-instructions.css";

type SIRequest = {
  id: string;
  token: string;
  status: string;
  buyer_email: string;
  buyer_name: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  expires_at: string;
};

type SIRecord = Record<string, unknown> & {
  id: string;
  approved_at: string | null;
  documents_requested?: string[];
  approved_shipping_lines?: string[];
};

type Props = {
  orderId: string;
  defaultBuyerEmail?: string;
  defaultBuyerName?: string;
  readOnly?: boolean;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ShippingInstructionsCard({ orderId, defaultBuyerEmail = "", defaultBuyerName = "", readOnly }: Props) {
  const { toast } = useToast();
  const [request, setRequest] = useState<SIRequest | null>(null);
  const [si, setSi] = useState<SIRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyerEmail, setBuyerEmail] = useState(defaultBuyerEmail);
  const [buyerName, setBuyerName] = useState(defaultBuyerName);
  const [sending, setSending] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("shipping_instructions_requests")
      .select("id, token, status, buyer_email, buyer_name, sent_at, submitted_at, expires_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1);
    const r = reqs?.[0] ?? null;
    setRequest(r);
    if (r) {
      setBuyerEmail(r.buyer_email || defaultBuyerEmail);
      setBuyerName(r.buyer_name || defaultBuyerName);
      const { data: siRows } = await supabase
        .from("shipping_instructions")
        .select("*")
        .eq("request_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1);
      setSi((siRows?.[0] as SIRecord) ?? null);
    } else {
      setSi(null);
    }
    setLoading(false);
  }, [orderId, defaultBuyerEmail, defaultBuyerName]);

  useEffect(() => { load(); }, [load]);

  async function sendLink() {
    if (!buyerEmail) { toast({ title: "Buyer email required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("shipping-instructions-send-link", {
        body: { order_id: orderId, buyer_email: buyerEmail, buyer_name: buyerName, origin: window.location.origin },
      });
      if (error) throw error;
      await navigator.clipboard.writeText(data.url).catch(() => {});
      toast({ title: "Link generated", description: "Link copied to clipboard." });
      await load();
    } catch (e) {
      toast({ title: "Failed to send link", description: String((e as Error)?.message ?? e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!request) return;
    const url = `${window.location.origin}/shipping-instructions/${request.token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }

  async function inactivate() {
    if (!request) return;
    if (!confirm("Inactivate this shipping instructions link?")) return;
    await supabase.from("shipping_instructions_requests").update({ status: "inactive" }).eq("id", request.id);
    await load();
  }

  async function approve() {
    if (!si) return;
    const userRes = await supabase.auth.getUser();
    await supabase.from("shipping_instructions").update({
      approved_at: new Date().toISOString(),
      approved_by: userRes.data.user?.id ?? null,
    }).eq("id", si.id);
    if (request) {
      await supabase.from("shipping_instructions_requests").update({ status: "approved" }).eq("id", request.id);
    }
    toast({ title: "Shipping instructions approved" });
    await load();
  }

  const status = request?.status ?? "not_requested";

  const statusPill = () => {
    const map: Record<string, { label: string; cls: string }> = {
      not_requested: { label: "Not Requested", cls: "is-pending" },
      link_sent: { label: "Link Sent", cls: "is-sent" },
      received: { label: "Received", cls: "is-received" },
      approved: { label: "Approved", cls: "is-approved" },
      sent_to_supplier: { label: "Sent to Supplier", cls: "is-approved" },
      inactive: { label: "Inactive", cls: "is-inactive" },
    };
    const m = map[status] ?? map.not_requested;
    return <span className={`si-status-pill ${m.cls}`}>● {m.label}</span>;
  };

  if (loading) {
    return <div className="si-supplier-card"><h3>📋 Shipping Instructions</h3><p className="si-info-line">Loading…</p></div>;
  }

  return (
    <div className="si-supplier-card">
      <h3>📋 Shipping Instructions {statusPill()}</h3>

      {!readOnly && (status === "not_requested" || status === "inactive") && (
        <>
          <div className="si-email-row">
            <div className="si-field" style={{ flex: 1 }}>
              <label>Buyer Email</label>
              <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="buyer@company.com" />
            </div>
            <div className="si-field" style={{ flex: 1 }}>
              <label>Buyer Name (optional)</label>
              <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Contact name" />
            </div>
          </div>
          <div className="si-actions-row">
            <button className="si-btn is-primary" onClick={sendLink} disabled={sending}>
              {sending ? "Generating…" : "📧 Generate Link"}
            </button>
          </div>
        </>
      )}

      {request && status === "link_sent" && !readOnly && (
        <>
          <p className="si-info-line">✅ Link sent to <strong>{request.buyer_email}</strong> on {fmtDate(request.sent_at)}</p>
          <p className="si-info-line">Link expires: {fmtDate(request.expires_at)}</p>
          <div className="si-link-box">{window.location.origin}/shipping-instructions/{request.token}</div>
          <div className="si-actions-row">
            <button className="si-btn" onClick={copyLink}>📋 Copy Link</button>
            <button className="si-btn" onClick={sendLink} disabled={sending}>🔄 Resend</button>
            <button className="si-btn is-danger" onClick={inactivate}>✕ Inactivate</button>
          </div>
        </>
      )}

      {request && (status === "received" || status === "approved") && si && (
        <>
          <p className="si-info-line">
            ✅ Shipping Instructions {status === "approved" ? "Approved" : "Received"} on {fmtDate(status === "approved" ? si.approved_at : request.submitted_at)}
          </p>
          <div className="si-actions-row">
            <button className="si-btn" onClick={() => setViewOpen(true)}>👁 View Instructions</button>
            {!readOnly && status === "received" && (
              <button className="si-btn is-primary" onClick={approve}>✓ Approve</button>
            )}
          </div>
        </>
      )}

      {readOnly && status === "not_requested" && (
        <p className="si-info-line">No shipping instructions have been requested yet.</p>
      )}

      {viewOpen && si && (
        <SIViewModal si={si} request={request} onClose={() => setViewOpen(false)} />
      )}
    </div>
  );
}

function SIViewModal({ si, request, onClose }: { si: SIRecord; request: SIRequest | null; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%",
        maxHeight: "90vh", overflow: "auto", padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: "#8B2252", margin: 0, fontSize: 18 }}>Shipping Instructions</h2>
          <button className="si-btn" onClick={onClose}>✕</button>
        </div>
        <Row k="Order Number" v={String(si.order_number ?? "—")} />
        <Row k="Importer Reference" v={String(si.importer_reference ?? "—")} />
        <Row k="Submitted" v={request?.submitted_at ? fmtDate(request.submitted_at) : "—"} />
        <Section title="Buyer">
          <Row k="Name" v={String(si.buyer_name ?? "—")} />
          <Row k="Address" v={String(si.buyer_address ?? "—")} />
        </Section>
        <Section title="Destination">
          <Row k="Port" v={String(si.port_of_destination ?? "—")} />
          <Row k="Country" v={String(si.country_of_destination ?? "—")} />
        </Section>
        <Section title="Consignee">
          <Row k="Name" v={String(si.consignee_name ?? "—")} />
          <Row k="Address" v={String(si.consignee_address ?? "—")} />
          <Row k="Phone" v={String(si.consignee_phone ?? "—")} />
        </Section>
        <Section title="Notify Party">
          <Row k="Name" v={String(si.notify_name ?? "—")} />
          <Row k="Address" v={String(si.notify_address ?? "—")} />
          <Row k="Phone" v={String(si.notify_phone ?? "—")} />
        </Section>
        <Section title="Documents Requested">
          <p style={{ margin: 0, fontSize: 13 }}>
            {(si.documents_requested ?? []).join(", ") || "—"}
          </p>
        </Section>
        <Section title="Telex Release">
          <p style={{ margin: 0, fontSize: 13 }}>{String(si.telex_release ?? "—")}</p>
        </Section>
        <Section title="Approved Shipping Lines">
          <p style={{ margin: 0, fontSize: 13 }}>
            {(si.approved_shipping_lines ?? []).join(", ") || "—"}
          </p>
        </Section>
        <Section title="Observations">
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{String(si.observations ?? "—")}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #ece4e7" }}>
      <h3 style={{ color: "#8B2252", fontSize: 12, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>{title}</h3>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: "#8a7780", minWidth: 140 }}>{k}</span>
      <span style={{ color: "#2a1a20", flex: 1 }}>{v}</span>
    </div>
  );
}