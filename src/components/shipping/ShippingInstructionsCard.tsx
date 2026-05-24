import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PUBLIC_APP_URL, publicUrl } from "@/lib/publicUrl";
import { printShippingInstructions } from "@/lib/printShippingInstructions";
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
  orderNumber?: string;
  defaultBuyerEmail?: string;
  defaultBuyerName?: string;
  supplierName?: string;
  readOnly?: boolean;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ShippingInstructionsCard({ orderId, orderNumber = "", defaultBuyerEmail = "", defaultBuyerName = "", supplierName = "", readOnly }: Props) {
  const { toast } = useToast();
  const [request, setRequest] = useState<SIRequest | null>(null);
  const [si, setSi] = useState<SIRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyerEmail, setBuyerEmail] = useState(defaultBuyerEmail);
  const [buyerName, setBuyerName] = useState(defaultBuyerName);
  const [viewOpen, setViewOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

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

  async function copyLink() {
    if (!request) return;
    const url = publicUrl(`/shipping-instructions/${request.token}`);
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

  if (loading) {
    return (
      <div style={cardWrap}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={iconBox}>📋</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Loading shipping instructions…</div>
        </div>
      </div>
    );
  }

  const buyerLabel = buyerName || defaultBuyerName || "the buyer";

  // Not requested / inactive -> initial state
  if (status === "not_requested" || status === "inactive") {
    if (readOnly) {
      return (
        <div style={cardWrap}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={iconBox}>📋</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Shipping Instructions</div>
              <div style={subText}>No shipping instructions have been requested yet.</div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        <div style={cardWrap}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
            <div style={iconBox}>📋</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Shipping Instructions</div>
              <div style={subText}>
                Request shipping details from <strong>{buyerLabel}</strong> — consignee, BL notify, telex release, documents, approved lines. Mundus will email a secure link, the buyer fills it in, and the result comes back to all three of us.
              </div>
            </div>
          </div>
          <button onClick={() => setRequestOpen(true)} style={primaryBtn}>✈️ Request from buyer</button>
        </div>
        {requestOpen && (
          <RequestSIModal
            onClose={() => setRequestOpen(false)}
            onSent={load}
            orderId={orderId}
            orderNumber={orderNumber}
            buyerName={buyerLabel}
            supplierName={supplierName || "your supplier"}
            defaultBuyerEmail={buyerEmail || defaultBuyerEmail}
            setBuyerEmail={setBuyerEmail}
            setBuyerName={setBuyerName}
          />
        )}
      </>
    );
  }

  // link_sent
  if (status === "link_sent" && request) {
    return (
      <div style={cardWrap}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
          <div style={iconBox}>📋</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Shipping Instructions</div>
            <div style={subText}>Link sent to <strong>{request.buyer_email}</strong> on {fmtDate(request.sent_at)} — expires {fmtDate(request.expires_at)}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span style={{ ...statusPillBase, background: "#fef3c7", color: "#92400e" }}>✅ Link sent</span>
          {!readOnly && (
            <div style={{ display: "flex", gap: 6 }}>
              <button style={ghostBtn} onClick={copyLink}>📋 Copy Link</button>
              <button style={ghostBtn} onClick={() => setRequestOpen(true)}>🔄 Resend</button>
              <button style={{ ...ghostBtn, color: "#b91c1c", borderColor: "#fecaca" }} onClick={inactivate}>✕ Cancel</button>
            </div>
          )}
        </div>
        {requestOpen && (
          <RequestSIModal
            onClose={() => setRequestOpen(false)}
            onSent={load}
            orderId={orderId}
            orderNumber={orderNumber}
            buyerName={buyerLabel}
            supplierName={supplierName || "your supplier"}
            defaultBuyerEmail={buyerEmail || defaultBuyerEmail}
            setBuyerEmail={setBuyerEmail}
            setBuyerName={setBuyerName}
          />
        )}
      </div>
    );
  }

  // received / approved
  if ((status === "received" || status === "approved") && request && si) {
    const isApproved = status === "approved";
    return (
      <>
        <div style={cardWrap}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
            <div style={iconBox}>📋</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Shipping Instructions</div>
              <div style={subText}>
                {isApproved
                  ? <>Approved on {fmtDate(si.approved_at)}</>
                  : <>Submitted by buyer on {fmtDate(request.submitted_at)}</>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={{ ...statusPillBase, background: isApproved ? "#dcfce7" : "#dbeafe", color: isApproved ? "#15803d" : "#1e40af" }}>
              {isApproved ? "✓ Approved" : "✅ Received"}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={ghostBtn} onClick={() => setViewOpen(true)}>👁 View</button>
              <button style={ghostBtn} onClick={() => si && printShippingInstructions(si, request)} disabled={!si}>📄 PDF</button>
              {!readOnly && !isApproved && (
                <button style={primarySmallBtn} onClick={approve}>✓ Approve</button>
              )}
            </div>
          </div>
        </div>
        {viewOpen && si && (
          <SIViewModal si={si} request={request} onClose={() => setViewOpen(false)} />
        )}
      </>
    );
  }

  return null;
}

// ----------- styles -----------
const cardWrap: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 20px", background: "white", border: "1px solid #e5e7eb",
  borderRadius: 12, gap: 16, marginBottom: 16,
};
const iconBox: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, background: "#fdf2f8",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 18, flexShrink: 0,
};
const subText: React.CSSProperties = { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginTop: 2 };
const primaryBtn: React.CSSProperties = {
  background: "#8B2252", color: "white", border: "none",
  padding: "10px 20px", borderRadius: 8, fontSize: 13,
  fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
  display: "flex", alignItems: "center", gap: 6,
};
const primarySmallBtn: React.CSSProperties = {
  background: "#8B2252", color: "white", border: "none",
  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  background: "white", color: "#374151", border: "1px solid #e5e7eb",
  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
};
const statusPillBase: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
};

// ----------- Request Modal -----------
function RequestSIModal({
  onClose, onSent, orderId, orderNumber, buyerName, supplierName, defaultBuyerEmail, setBuyerEmail, setBuyerName,
}: {
  onClose: () => void;
  onSent: () => void | Promise<void>;
  orderId: string;
  orderNumber: string;
  buyerName: string;
  supplierName: string;
  defaultBuyerEmail: string;
  setBuyerEmail: (v: string) => void;
  setBuyerName: (v: string) => void;
}) {
  const { toast } = useToast();
  const [to, setTo] = useState(defaultBuyerEmail || "");
  const [cc, setCc] = useState("docs@mundustrade.com, jpires@mundustrade.com");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(copyOnly: boolean) {
    if (!copyOnly && !to.trim()) { toast({ title: "Buyer email required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("shipping-instructions-send-link", {
        body: {
          order_id: orderId,
          buyer_email: to.trim() || defaultBuyerEmail,
          buyer_name: buyerName,
          origin: PUBLIC_APP_URL,
          skip_email: copyOnly,
          personal_note: note.trim() || undefined,
          cc_emails: cc.split(",").map((e) => e.trim()).filter(Boolean),
        },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message || "Failed");
      }
      setBuyerEmail(to.trim());
      setBuyerName(buyerName);
      if (copyOnly) {
        await navigator.clipboard.writeText((data as { url: string }).url).catch(() => {});
        toast({ title: "Link copied to clipboard!" });
      } else {
        toast({ title: `Email sent to ${to}` });
      }
      await onSent();
      onClose();
    } catch (e) {
      toast({ title: "Failed to generate link", description: String((e as Error)?.message ?? e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, maxWidth: 580, width: "100%",
        maxHeight: "90vh", overflow: "auto", padding: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fdf2f8", display: "flex", alignItems: "center", justifyContent: "center" }}>✉️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Request shipping instructions</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Mundus will email a secure link to the buyer for Order <strong style={{ color: "#8B2252" }}>{orderNumber}</strong>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" }}>✕</button>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Labeled label="TO">
            <input value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} placeholder="buyer@company.com" />
          </Labeled>
          <Labeled label="CC (Mundus team)">
            <input value={cc} onChange={(e) => setCc(e.target.value)} style={inputStyle} />
          </Labeled>
          <Labeled label="PERSONAL NOTE (optional)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="e.g. We need this by Friday to book the May 25 vessel."
              style={{ ...inputStyle, resize: "vertical" }} />
          </Labeled>
        </div>

        {/* Preview */}
        <div style={{ margin: "0 24px 16px", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#fafafa", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#8B2252" }}>Ⓜ Mundus</span>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.04em" }}>EMAIL PREVIEW</span>
          </div>
          <div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.6, color: "#2a1a20" }}>
            <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "4px 10px", fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
              <span style={{ fontWeight: 700 }}>FROM</span>
              <span>Mundus Trade &lt;no-reply@mundustrade.com&gt;</span>
              <span style={{ fontWeight: 700 }}>SUBJECT</span>
              <span>Shipping Instructions Required — Mundus Order {orderNumber}</span>
            </div>
            <p style={{ margin: "0 0 8px" }}>Hi {buyerName || "Customer"},</p>
            <p style={{ margin: "0 0 8px" }}>
              Your supplier <strong>{supplierName}</strong> is preparing your shipment for Mundus Order{" "}
              <span style={{ color: "#8B2252", fontWeight: 600 }}>{orderNumber}</span>. We need a few logistics details before we can issue the Bill of Lading and book the vessel.
            </p>
            {note && <p style={{ fontStyle: "italic", color: "#8B2252", margin: "0 0 8px" }}>"{note}"</p>}
            <div style={{ margin: "16px 0" }}>
              <span style={{ background: "#8B2252", color: "white", padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>→ Submit shipping instructions</span>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 11, margin: "0 0 8px", wordBreak: "break-all" }}>
              app.mundustrade.com/shipping-instructions/…
            </p>
            <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 8px" }}>The link expires in 30 days.</p>
            <p style={{ margin: 0 }}>Best,<br /><strong>Mundus Trade</strong></p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", maxWidth: 160, lineHeight: 1.4 }}>
            🔒 Secure tokenised link — no login required for the buyer
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#8B2252", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={() => handleSend(true)} disabled={sending} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #8B2252", background: "white", color: "#8B2252", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📋 Copy link only</button>
            <button type="button" onClick={() => handleSend(false)} disabled={sending || !to.trim()} style={{ padding: "8px 16px", borderRadius: 8, background: "#8B2252", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: sending || !to.trim() ? 0.6 : 1 }}>✈️ Send link</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
  borderRadius: 8, fontSize: 14, marginTop: 4, fontFamily: "inherit",
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>{label}</label>
      {children}
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {request?.id && (
              <button
                onClick={() => si && printShippingInstructions(si, request)}
                style={{ background: "#8B2252", color: "white", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                📄 Download PDF
              </button>
            )}
            <button className="si-btn" onClick={onClose}>✕</button>
          </div>
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