import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronUp, Paperclip } from "lucide-react";

export type TimelineMessage = {
  id: string;
  created_at: string;
  sender_side: "buyer" | "supplier" | "mundus" | string;
  sender_user_id: string | null;
  content: string | null;
  structured_data: {
    subject?: string;
    urgent?: boolean;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_size_bytes?: number | null;
    recipient_email?: string | null;
    recipient_name?: string | null;
  } | null;
  emailed: boolean | null;
  emailed_at: string | null;
};

type Props = {
  message: TimelineMessage;
  currentUserSide: "buyer" | "supplier" | "mundus" | null;
  senderLabel: string;
};

function fmtEST(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso)) + " EST"
    );
  } catch {
    return iso;
  }
}

function fmtBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function TimelineMessageCard({ message, currentUserSide, senderLabel }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const sd = message.structured_data ?? {};
  const subject = sd.subject || "(no subject)";
  const urgent = Boolean(sd.urgent);
  const isSent = currentUserSide != null && message.sender_side === currentUserSide;

  const pillClass = isSent
    ? "bg-[#2563EB] text-white"
    : "bg-[#B64769] text-white";
  const borderClass = isSent ? "border-l-[#2563EB]" : "border-l-[#B64769]";
  const linkClass = isSent ? "text-[#2563EB]" : "text-[#B64769]";

  const body = message.content ?? "";

  return (
    <div
      className={`bg-white border border-gray-200 ${borderClass} border-l-4 rounded-r-md px-3 py-3 my-2 shadow-sm`}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${pillClass}`}
        >
          {isSent ? t("messageViaMundus.timeline.sent") : t("messageViaMundus.timeline.received")}
        </span>
        <span
          className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate"
          title={subject}
        >
          {truncate(subject, 80)}
        </span>
        {urgent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-red-600 text-white">
            <AlertTriangle size={10} />
            {t("messageViaMundus.timeline.urgent")}
          </span>
        )}
        <span className="text-[11px] text-gray-500 whitespace-nowrap">
          {fmtEST(message.created_at)}
        </span>
      </div>

      <div className="text-[11px] text-gray-500 mt-1">
        {isSent ? t("messageViaMundus.timeline.to") : t("messageViaMundus.timeline.from")}{" "}
        {isSent ? sd.recipient_name || sd.recipient_email || "—" : senderLabel} ·{" "}
        {t("messageViaMundus.timeline.viaMundus")}
      </div>

      {!expanded ? (
        <>
          <div className="text-[13px] text-gray-700 mt-2 line-clamp-2 whitespace-pre-wrap">
            {body}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`mt-1 inline-flex items-center gap-1 text-[12px] font-medium ${linkClass} hover:underline`}
          >
            {t("messageViaMundus.timeline.showMore")}
            <ChevronDown size={12} />
          </button>
        </>
      ) : (
        <>
          <div className="text-[13px] text-gray-800 mt-2 whitespace-pre-wrap">{body}</div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[12px] text-gray-600">
            <div>
              <span className="font-semibold text-gray-700">
                {t("messageViaMundus.timeline.from")}:
              </span>{" "}
              {senderLabel} ({message.sender_side})
            </div>
            {(sd.recipient_name || sd.recipient_email) && (
              <div>
                <span className="font-semibold text-gray-700">
                  {t("messageViaMundus.timeline.to")}:
                </span>{" "}
                {sd.recipient_name || "—"}
                {sd.recipient_email ? ` (${sd.recipient_email})` : ""}
              </div>
            )}
          </div>

          {sd.attachment_url && (
            <a
              href={sd.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[12px] text-gray-700"
            >
              <Paperclip size={12} />
              <span className="truncate max-w-[220px]">
                {sd.attachment_name || "attachment"}
              </span>
              {sd.attachment_size_bytes ? (
                <span className="text-gray-500">· {fmtBytes(sd.attachment_size_bytes)}</span>
              ) : null}
            </a>
          )}

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={`mt-3 inline-flex items-center gap-1 text-[12px] font-medium ${linkClass} hover:underline`}
          >
            {t("messageViaMundus.timeline.showLess")}
            <ChevronUp size={12} />
          </button>
        </>
      )}

      <div className="text-[11px] text-gray-400 mt-3 border-t border-gray-100 pt-2">
        {message.emailed
          ? t("messageViaMundus.timeline.emailedAt", { time: fmtEST(message.emailed_at) })
          : t("messageViaMundus.timeline.emailPending")}
      </div>
    </div>
  );
}

export default TimelineMessageCard;