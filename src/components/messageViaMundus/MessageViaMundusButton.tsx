import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { useRecipientContact } from "@/hooks/useRecipientContact";
import { MessageViaMundusModal } from "./MessageViaMundusModal";

interface Props {
  negotiationId: string;
  recordType: "negotiation" | "order" | "sale";
  recordDisplayId: string;
  currentSide: "buyer" | "supplier";
  onSent?: () => void;
  variant?: "primary" | "compact";
  className?: string;
}

export function MessageViaMundusButton({
  negotiationId,
  recordType,
  recordDisplayId,
  currentSide,
  onSent,
  variant = "compact",
  className = "",
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Light query so the button label can include the recipient first name
  // (uses the same RPC the modal will call, but the modal also re-queries
  // when opened — fine, RPCs are cached at provider).
  const recipient = useRecipientContact(negotiationId, currentSide);

  const label = recipient.firstName
    ? (t("messageViaMundus.trigger", { name: recipient.firstName }) as string)
    : (t("messageViaMundus.triggerCompact") as string);

  const sizing =
    variant === "primary"
      ? "w-full h-12 text-base px-5"
      : "h-9 text-sm px-4";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors bg-[#FFECEC] text-[#B64769] hover:bg-[#FFD9D9] border-[#FFCCCC]/60 ${sizing} ${className}`}
      >
        <Mail size={16} />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <MessageViaMundusModal
          open={open}
          onOpenChange={setOpen}
          negotiationId={negotiationId}
          recordType={recordType}
          recordDisplayId={recordDisplayId}
          currentSide={currentSide}
          onSent={(r) => {
            onSent?.();
            // keep callback signature for parent timeline refetch
            void r;
          }}
        />
      )}
    </>
  );
}

export default MessageViaMundusButton;