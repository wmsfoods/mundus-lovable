import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMatchingContacts,
  type OutreachContact,
  type OutreachOffer,
} from "@/hooks/useSupplierOutreach";
import { buildOutreachBody, buildOutreachSubject } from "@/lib/outreachEmailTemplate";

type Props = {
  offer: OutreachOffer | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function OutreachModal({ offer, open, onClose, onSent }: Props) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!offer || !open) return;
    setLoading(true);
    setSelected(new Set());
    setSubject(buildOutreachSubject(offer));
    setBody(buildOutreachBody(offer));
    setShowPreview(false);
    fetchMatchingContacts(offer.id, offer.markets)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [offer, open]);

  const eligible = useMemo(() => contacts.filter((c) => !c.alreadySent), [contacts]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(eligible.map((c) => c.id)));
  const deselectAll = () => setSelected(new Set());

  const handleSend = async () => {
    if (!offer || selected.size === 0) return;
    setBusy(true);
    const now = new Date().toISOString();
    const rows = contacts
      .filter((c) => selected.has(c.id))
      .map((c) => ({
        offer_id: offer.id,
        contact_email: c.email,
        contact_name: c.fullName,
        contact_company: c.company,
        country: c.country,
        subject,
        body_html: body,
        status: "sent",
        sent_at: now,
      }));
    const { error } = await (supabase as any).from("outreach_emails").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("supplier.outreach.modal.sentSuccess", { count: rows.length }));
    onSent?.();
    onClose();
  };

  if (!offer) return null;

  return (
    <Modal open={open} onClose={onClose} width={840} ariaLabel={t("supplier.outreach.modal.title")}>
      <h2>{t("supplier.outreach.modal.title", { offer: offer.title })}</h2>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Offer summary */}
        <div style={{ background: "var(--bg-soft, #fafafa)", border: "1px solid var(--border, #eee)", borderRadius: 8, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, fontSize: "var(--fs-sm)" }}>
          <div><div style={{ color: "var(--fg-muted)" }}>{t("supplier.outreach.modal.origin")}</div><strong>{offer.origin}</strong></div>
          <div><div style={{ color: "var(--fg-muted)" }}>{t("supplier.outreach.modal.markets")}</div><strong>{offer.markets.join(", ") || "—"}</strong></div>
          <div><div style={{ color: "var(--fg-muted)" }}>{t("supplier.outreach.modal.incoterm")}</div><strong>{offer.incoterm}</strong></div>
          <div><div style={{ color: "var(--fg-muted)" }}>{t("supplier.outreach.modal.price")}</div><strong>{offer.pricePerKg ? `US$ ${offer.pricePerKg.toFixed(2)}/kg` : "—"}</strong></div>
        </div>

        {/* Contacts */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>{t("supplier.outreach.modal.matchingContacts", { count: contacts.length })}</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>{t("supplier.outreach.modal.selectAll")}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={deselectAll}>{t("supplier.outreach.modal.deselectAll")}</button>
            </div>
          </div>
          {loading ? (
            <p style={{ color: "var(--fg-muted)" }}>{t("common.loading")}</p>
          ) : contacts.length === 0 ? (
            <p style={{ color: "var(--fg-muted)" }}>{t("supplier.outreach.modal.noMatches")}</p>
          ) : (
            <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid var(--border,#eee)", borderRadius: 8 }}>
              <table className="data-table" style={{ margin: 0 }}>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} style={c.alreadySent ? { opacity: 0.55 } : undefined}>
                      <td style={{ width: 32 }}>
                        <input
                          type="checkbox"
                          disabled={c.alreadySent}
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                      </td>
                      <td><strong>{c.fullName}</strong></td>
                      <td style={{ color: "var(--fg-muted)" }}>{c.company || "—"}</td>
                      <td style={{ color: "var(--fg-muted)" }}>{c.email}</td>
                      <td>{c.country}</td>
                      <td style={{ textAlign: "right" }}>
                        {c.alreadySent && (
                          <span className="pill pill-active">✓ {t("supplier.outreach.modal.sentBadge")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subject + body */}
        <div>
          <label style={{ display: "block", fontSize: "var(--fs-sm)", marginBottom: 4 }}>{t("supplier.outreach.modal.subject")}</label>
          <input className="input" style={{ width: "100%" }} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ fontSize: "var(--fs-sm)" }}>{t("supplier.outreach.modal.body")}</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? t("supplier.outreach.modal.editBody") : t("supplier.outreach.modal.preview")}
            </button>
          </div>
          {showPreview ? (
            <div style={{ border: "1px solid var(--border,#eee)", borderRadius: 8, padding: 12, maxHeight: 320, overflow: "auto", background: "#fff" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
          ) : (
            <textarea
              className="input"
              style={{ width: "100%", minHeight: 180, fontFamily: "monospace", fontSize: 12 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={busy || selected.size === 0}
        >
          {t("supplier.outreach.modal.sendButton", { count: selected.size })}
        </button>
      </div>
    </Modal>
  );
}