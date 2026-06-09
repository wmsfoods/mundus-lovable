import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bot, User, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NegotiationHandlingControl, {
  type NegotiationMode,
  type NegotiationDial,
} from "@/components/offer/NegotiationHandlingControl";
import {
  useActiveNegotiationCountForOffer,
  ACTIVE_NEGOTIATION_STATUSES,
} from "@/hooks/useActiveNegotiationCountForOffer";
import { auditLog } from "@/lib/auditLog";

type Props = {
  offerId: string;
  offerNumber?: string | null;
};

const DIAL_LABEL: Record<NegotiationDial, string> = {
  protect_margin: "Protect margin",
  balanced: "Balanced",
  win_deal: "Win deal",
};

export function AutoNegotiationSettingsCard({ offerId }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string, vars?: Record<string, unknown>) =>
    t(`supplier.offerDetail.autoNeg.${k}`, { defaultValue: fb, ...(vars ?? {}) }) as string;

  const [mode, setMode] = useState<NegotiationMode>("manual");
  const [dial, setDial] = useState<NegotiationDial>("balanced");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmManualOpen, setConfirmManualOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<NegotiationMode>("manual");
  const [draftDial, setDraftDial] = useState<NegotiationDial>("balanced");
  const [saving, setSaving] = useState(false);
  const { count: activeCount, refetch: refetchCount } =
    useActiveNegotiationCountForOffer(offerId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("negotiation_mode, negotiation_dial")
        .eq("id", offerId)
        .maybeSingle();
      if (cancelled) return;
      const m = ((data as any)?.negotiation_mode ?? "manual") as NegotiationMode;
      const d = ((data as any)?.negotiation_dial ?? "balanced") as NegotiationDial;
      setMode(m);
      setDial(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [offerId]);

  const openEdit = (initialMode: NegotiationMode) => {
    setDraftMode(initialMode);
    setDraftDial(dial);
    setEditOpen(true);
  };

  const persist = async (newMode: NegotiationMode, newDial: NegotiationDial) => {
    if (saving) return;
    setSaving(true);
    try {
      const { error: offerErr } = await supabase
        .from("offers")
        .update({ negotiation_mode: newMode, negotiation_dial: newDial })
        .eq("id", offerId);
      if (offerErr) {
        toast.error(offerErr.message);
        return;
      }

      // Cascade to active negotiations
      const { data: activeNegs } = await supabase
        .from("negotiations")
        .select("id")
        .eq("offer_id", offerId)
        .in("status", ACTIVE_NEGOTIATION_STATUSES)
        .is("deleted_at", null);

      const affected = activeNegs?.length ?? 0;
      if (affected > 0) {
        await supabase
          .from("negotiations")
          .update({ negotiation_mode: newMode, negotiation_dial: newDial } as any)
          .in("id", activeNegs!.map((n) => n.id));
      }

      auditLog({
        action: "offer.negotiation_mode_changed",
        category: "offer",
        entityType: "offer",
        entityId: offerId,
        details: {
          from: { mode, dial },
          to: { mode: newMode, dial: newDial },
          activeNegotiationsAffected: affected,
        },
        severity: "warn",
      });

      setMode(newMode);
      setDial(newDial);
      refetchCount();
      toast.success(
        affected > 0
          ? tk("savedToastWithCascade", "Mode updated · {{count}} active negotiation(s) also updated", { count: affected })
          : tk("savedToast", "Negotiation mode updated"),
      );
      setEditOpen(false);
      setConfirmManualOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isAuto = mode === "auto";
  const dialLabel = DIAL_LABEL[dial];

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid hsl(var(--border))",
        background: "hsl(var(--card))",
        marginBottom: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}>
          <ShieldCheck size={14} />
          {tk("title", "Auto-negotiation")}
        </div>
        {isAuto ? (
          <Badge style={{ background: "#B64769", color: "#fff", border: "none" }}>
            <Bot size={12} style={{ marginRight: 4 }} />
            Auto · {dialLabel}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <User size={12} style={{ marginRight: 4 }} />
            Manual
          </Badge>
        )}
      </div>

      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
        {isAuto
          ? tk("autoDesc", "Mundus AI counters bids automatically based on your floor price.")
          : tk("manualDesc", "You manually counter each bid.")}
      </div>

      {isAuto && (
        <div style={{ fontSize: 12 }}>
          <span style={{ color: "hsl(var(--muted-foreground))" }}>
            {tk("currentDial", "Current dial")}:
          </span>{" "}
          <strong>{dialLabel}</strong>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {isAuto ? (
          <>
            <Button size="sm" variant="outline" onClick={() => openEdit("auto")}>
              {tk("changeDial", "Change dial")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmManualOpen(true)}
              style={{ color: "#b91c1c" }}>
              🛑 {tk("switchToManual", "Switch to Manual")}
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => openEdit("auto")}>
            🤖 {tk("switchToAuto", "Switch to Auto")}
          </Button>
        )}
      </div>

      {/* Edit modal — pick mode + dial */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tk("title", "Auto-negotiation")}</DialogTitle>
            <DialogDescription>
              {tk("editDesc", "Choose how this offer responds to buyer bids.")}
              {activeCount > 0 && (
                <div style={{ marginTop: 8, color: "#92400e" }}>
                  ⚠️ {tk("activeNegotiationsWarning",
                    "{{count}} active negotiation(s) will also be updated",
                    { count: activeCount })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <NegotiationHandlingControl
            mode={draftMode}
            dial={draftDial}
            onChange={(m, d) => { setDraftMode(m); setDraftDial(d); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => persist(draftMode, draftDial)} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Switch to Manual */}
      <Dialog open={confirmManualOpen} onOpenChange={setConfirmManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tk("confirmSwitchTitle", "Switch to Manual mode?")}</DialogTitle>
            <DialogDescription>
              {tk("confirmSwitchBody", "All future bids on this offer will require your manual response.")}
              {activeCount > 0 && (
                <div style={{ marginTop: 8, color: "#92400e" }}>
                  ⚠️ {tk("activeNegotiationsWarning",
                    "{{count}} active negotiation(s) will also be switched to manual",
                    { count: activeCount })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmManualOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => persist("manual", dial)} disabled={saving}>
              {saving ? "Saving…" : tk("switchToManual", "Switch to Manual")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}