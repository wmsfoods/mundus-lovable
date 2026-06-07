import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mail, Paperclip, Sparkles, X, Zap, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecipientContact } from "@/hooks/useRecipientContact";
import { getTemplatesForRecordType } from "@/lib/messageTemplates";
import { sendViaMundus, ViaMundusError } from "@/lib/messageViaMundus";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string;
  recordType: "negotiation" | "order" | "sale";
  recordDisplayId: string;
  currentSide: "buyer" | "supplier";
  onSent?: (result: { messageId: string; recipientName: string }) => void;
}

const BRAND_GRAD = "linear-gradient(135deg, #6C0B28, #A74764)";

function initials(s: string): string {
  const parts = (s || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function MessageViaMundusModal(props: Props) {
  const { open, onOpenChange, negotiationId, recordType, recordDisplayId, currentSide, onSent } = props;
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const recipient = useRecipientContact(open ? negotiationId : null, open ? currentSide : null);
  const templates = getTemplatesForRecordType(recordType);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSubject("");
      setBody("");
      setUrgent(false);
      setAttachment(null);
      setSelectedTpl(null);
      setSending(false);
    } else {
      // Autofocus subject
      setTimeout(() => subjectRef.current?.focus(), 50);
    }
  }, [open]);

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !sending;
  const bodyLen = body.length;
  const counterWarn = bodyLen >= 1700;

  function pickTemplate(id: string) {
    if (selectedTpl === id) {
      setSelectedTpl(null);
      setSubject("");
      setBody("");
      return;
    }
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    setSelectedTpl(id);
    const sub = t(tpl.subjectKey, { recordId: recordDisplayId, defaultValue: "" }) as string;
    const bod = t(tpl.bodyKey, { recordId: recordDisplayId, defaultValue: "" }) as string;
    setSubject(sub);
    setBody(bod);
    setTimeout(() => subjectRef.current?.focus(), 0);
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await sendViaMundus({
        negotiationId,
        subject: subject.trim(),
        body: body.trim(),
        urgent,
        attachmentFile: attachment,
      });
      toast.success(
        t("messageViaMundus.delivered", { name: res.recipientName || recipient.fullName || "" }),
        { icon: <Check size={16} /> },
      );
      onSent?.({ messageId: res.messageId, recipientName: res.recipientName });
      onOpenChange(false);
    } catch (e: any) {
      const code = e instanceof ViaMundusError ? e.code : "unknown";
      const msg =
        code === "recipient_unreachable"
          ? (t("messageViaMundus.recipientUnreachable") as string)
          : (t("messageViaMundus.errorGeneric", { err: e?.message ?? String(e) }) as string);
      toast.error(msg);
      setSending(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  const recipientFirst = recipient.fullName || recipient.companyName || "";
  const subtitle = t("messageViaMundus.subtitle", {
    name: recipientFirst || "the other side",
    recordType,
  }) as string;

  const content = (
    <div className="flex flex-col gap-5 max-h-[88vh] overflow-y-auto p-1">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="shrink-0 grid place-items-center rounded-xl text-white font-bold text-lg"
          style={{ background: BRAND_GRAD, width: 44, height: 44 }}
        >
          M
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight leading-tight">
            {t("messageViaMundus.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* TO pill */}
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
        <span
          className="shrink-0 grid place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: BRAND_GRAD, width: 28, height: 28 }}
        >
          {recipient.loading ? "…" : initials(recipient.companyName || recipient.fullName)}
        </span>
        <div className="flex-1 min-w-0">
          {recipient.loading ? (
            <div className="space-y-1">
              <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-44 animate-pulse rounded bg-muted/70" />
            </div>
          ) : (
            <>
              <div className="text-sm truncate">
                <span className="font-semibold">{recipient.fullName || "—"}</span>
                {recipient.companyName ? (
                  <span className="text-muted-foreground"> · {recipient.companyName}</span>
                ) : null}
              </div>
              <div className="font-mono text-xs text-muted-foreground truncate">
                {recipient.email || (recipient.error ? t("messageViaMundus.recipientUnreachable") : "")}
              </div>
            </>
          )}
        </div>
        <span
          className="shrink-0 rounded-full text-white text-[10px] font-semibold px-2 py-0.5"
          style={{ background: BRAND_GRAD }}
        >
          {t("messageViaMundus.via")}
        </span>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t("messageViaMundus.subject")}
        </label>
        <Input
          ref={subjectRef}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder={t("messageViaMundus.subjectPlaceholder", { recordId: recordDisplayId }) as string}
          className="text-base"
          autoFocus
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t("messageViaMundus.body")}
        </label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder={t("messageViaMundus.bodyPlaceholder") as string}
          className="min-h-32 text-base"
          style={{ fontSize: 16 }}
        />
        <div
          className={`text-right text-xs ${counterWarn ? "text-orange-600 font-medium" : "text-muted-foreground"}`}
        >
          {bodyLen}/2000
        </div>
      </div>

      {/* Quick templates */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium">
          <Sparkles size={14} style={{ color: "#B64769" }} />
          {t("messageViaMundus.templates")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tpl) => {
            const Icon = tpl.icon;
            const selected = selectedTpl === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => pickTemplate(tpl.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? "text-white border-transparent"
                    : "border-border bg-background hover:bg-[#FFECEC] hover:text-[#B64769]"
                }`}
                style={selected ? { background: BRAND_GRAD } : undefined}
              >
                <Icon size={14} />
                {t(tpl.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-3 border-t pt-4 mt-2">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setAttachment(f);
              e.target.value = "";
            }}
          />
          {attachment ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs max-w-full">
              <Paperclip size={13} className="shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{attachment.name}</span>
              <span className="text-muted-foreground shrink-0">· {formatBytes(attachment.size)}</span>
              <button
                type="button"
                aria-label={t("messageViaMundus.removeAttachment") as string}
                onClick={() => setAttachment(null)}
                className="ml-1 shrink-0 rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Paperclip size={14} />
              {t("messageViaMundus.attach")}
            </button>
          )}
          <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer">
            <Zap size={14} className={urgent ? "text-amber-600" : "text-muted-foreground"} />
            <span className={urgent ? "text-amber-700 font-medium" : "text-muted-foreground"}>
              {t("messageViaMundus.urgent")}
            </span>
            <Switch checked={urgent} onCheckedChange={setUrgent} />
          </label>
        </div>
        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="text-white shadow-sm hover:opacity-95"
          style={{ background: BRAND_GRAD }}
        >
          {sending ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              {t("messageViaMundus.sending")}
            </>
          ) : (
            <>
              <Mail size={14} className="mr-1.5" />
              {t("messageViaMundus.send")} →
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-hidden p-4 sm:p-6 rounded-t-2xl">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default MessageViaMundusModal;