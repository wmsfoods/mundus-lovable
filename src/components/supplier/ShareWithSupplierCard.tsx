import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mail, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  negotiationId: string;
  buyerLabel?: string;
}

type TokenRow = {
  id: string;
  token: string;
  supplier_email: string | null;
  supplier_name: string | null;
  is_used: boolean;
  expires_at: string;
};

export function ShareWithSupplierCard({ negotiationId, buyerLabel }: Props) {
  const { t } = useTranslation();
  const [tok, setTok] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Pick the most recent unused token, or create one.
      const { data } = await supabase
        .from("negotiation_tokens")
        .select("id, token, supplier_email, supplier_name, is_used, expires_at")
        .eq("negotiation_id", negotiationId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      let row = (data?.[0] as TokenRow | undefined) ?? null;
      if (!row) {
        const ins = await supabase
          .from("negotiation_tokens")
          .insert({ negotiation_id: negotiationId })
          .select("id, token, supplier_email, supplier_name, is_used, expires_at")
          .single();
        if (cancelled) return;
        if (ins.error) {
          toast.error(ins.error.message);
        } else {
          row = ins.data as TokenRow;
        }
      }
      setTok(row);
      setEmail(row?.supplier_email ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [negotiationId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border p-4 bg-muted/30 text-sm text-muted-foreground">
        {t("supplier.share.loading")}
      </div>
    );
  }
  if (!tok) return null;

  const isPreview =
    window.location.hostname.includes("lovable") ||
    window.location.hostname.includes("localhost");
  const baseUrl = isPreview ? window.location.origin : "https://app.mundustrade.com";
  const link = `${baseUrl}/respond/${tok.token}`;
  const shortToken = tok.token.slice(0, 12);
  const displayLink = `${baseUrl}/respond/${shortToken}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t("supplier.share.copied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function saveEmail() {
    if (!tok) return;
    const { error } = await supabase
      .from("negotiation_tokens")
      .update({ supplier_email: email || null })
      .eq("id", tok.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTok({ ...tok, supplier_email: email || null });
    toast.success(t("supplier.share.emailSaved"));
  }

  function openMailto() {
    const subject = encodeURIComponent(t("supplier.share.mailSubject"));
    const body = encodeURIComponent(
      t("supplier.share.mailBody", {
        buyer: buyerLabel ?? "a buyer",
        link,
      }),
    );
    const to = email ? encodeURIComponent(email) : "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div
      className="rounded-xl border p-4 mb-4"
      style={{ background: "rgba(139,34,82,0.04)", borderColor: "rgba(139,34,82,0.25)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "#8B2252", color: "#fff" }}
        >
          <Mail size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">
            {t("supplier.share.title")}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tok.is_used
              ? t("supplier.share.subtitleUsed")
              : t("supplier.share.subtitle")}
          </p>

          <div className="mt-3 flex gap-2">
            <Input
              readOnly
              value={displayLink}
              onFocus={(e) => e.currentTarget.select()}
              className="text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="ml-1.5 hidden sm:inline">
                {copied ? t("supplier.share.copied") : t("supplier.share.copy")}
              </span>
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <label className="text-xs">
              <span className="font-medium text-foreground">
                {t("supplier.share.supplierEmail")}
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                className="mt-1 h-9"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveEmail}
              disabled={email === (tok.supplier_email ?? "")}
            >
              {t("supplier.share.saveEmail")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={openMailto}
              style={{ background: "#8B2252", color: "#fff" }}
              className="hover:opacity-90"
            >
              <Mail size={14} className="mr-1.5" />
              {t("supplier.share.sendEmail")}
            </Button>
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            {t("supplier.share.expiresAt", {
              date: new Date(tok.expires_at).toLocaleDateString(),
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareWithSupplierCard;