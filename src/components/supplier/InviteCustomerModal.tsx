import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { useDedupCheck, type DedupCase } from "@/hooks/useDedupCheck";
import { useInviteBuyer, type InviteBuyerFlow } from "@/hooks/useInviteBuyer";

type Props = {
  open: boolean;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KNOWN_ERRORS: Record<string, string> = {
  already_in_list: "supplier.myCustomers.errors.already_in_list",
  cooldown_active: "supplier.myCustomers.errors.cooldown_active",
  max_reinvites_reached: "supplier.myCustomers.errors.max_reinvites_reached",
};

const DEDUP_TONE: Record<DedupCase, "info" | "warn" | "success" | "error"> = {
  existing_user: "info",
  pending_invite: "warn",
  existing_company_new_contact: "info",
  new_buyer: "success",
  invalid_input: "error",
};

function dedupClasses(tone: "info" | "warn" | "success" | "error") {
  switch (tone) {
    case "info":
      return "border-[#bcd4f5] bg-[#e0effc] text-[#1d4ed8]";
    case "warn":
      return "border-[#f5d59a] bg-[#fff4e0] text-[#b45309]";
    case "success":
      return "border-[#bfe6cd] bg-[#e6f7ed] text-[#15803d]";
    case "error":
      return "border-[#f5c6c6] bg-[#fdecec] text-[#b42323]";
  }
}

export default function InviteCustomerModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset whenever the modal opens.
  useEffect(() => {
    if (open) {
      setCompanyName("");
      setContactName("");
      setEmail("");
      setTaxId("");
      setPhone("");
      setCountry("");
      setSubmitError(null);
    }
  }, [open]);

  const { result: dedup } = useDedupCheck(email, taxId);
  const { inviteBuyer, isInviting } = useInviteBuyer();

  const emailTrim = email.trim();
  const emailValid = EMAIL_RE.test(emailTrim);
  const canSubmit = emailValid && !isInviting;

  // Pick which dedup banner to show.
  let dedupCase: DedupCase | null = null;
  if (emailTrim) {
    if (!emailValid) {
      dedupCase = "invalid_input";
    } else if (dedup?.case) {
      // Only show existing_company_new_contact when tax_id was actually typed.
      if (dedup.case === "existing_company_new_contact" && !taxId.trim()) {
        dedupCase = null;
      } else {
        dedupCase = dedup.case;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await inviteBuyer({
        email: emailTrim,
        companyName: companyName.trim() || undefined,
        contactName: contactName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
      });
      if (result.ok) {
        const flow = (result.flow ?? "invited_new_buyer") as InviteBuyerFlow;
        toast.success(
          t(`supplier.myCustomers.toast.${flow}`, {
            defaultValue: t("supplier.myCustomers.toast.invited_new_buyer"),
          }),
        );
        onClose();
      } else {
        const reason = result.reason ?? "";
        if (reason in KNOWN_ERRORS) {
          const retry = (result as any)?.detail?.retry_after ?? (result as any)?.retry_after ?? "";
          setSubmitError(t(KNOWN_ERRORS[reason], { retry_after: retry }));
        } else {
          toast.error(t("supplier.myCustomers.errors.already_in_list", { defaultValue: "Could not send invite" }));
          setSubmitError(t("supplier.myCustomers.errors.already_in_list", { defaultValue: "Could not send invite" }));
        }
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not send invite");
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={520} ariaLabel={t("supplier.myCustomers.modal.title")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-1">
        <h2 className="text-lg font-semibold">{t("supplier.myCustomers.modal.title")}</h2>

        <TextField
          label={t("supplier.myCustomers.modal.companyName")}
          value={companyName}
          onChange={setCompanyName}
        />
        <TextField
          label={t("supplier.myCustomers.modal.contactName")}
          value={contactName}
          onChange={setContactName}
        />
        <TextField
          label={t("supplier.myCustomers.modal.email")}
          required
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="off"
        />

        {dedupCase && (
          <div
            role="status"
            className={`rounded-md border px-3 py-2 text-sm ${dedupClasses(DEDUP_TONE[dedupCase])}`}
          >
            {t(`supplier.myCustomers.dedup.${dedupCase}`, {
              expires_at: dedup?.expires_at ?? "",
            })}
            {(dedup?.echo_email || dedup?.echo_tax_id) && (
              <div className="mt-1 text-xs opacity-80">
                {dedup?.echo_email}
                {dedup?.echo_tax_id ? ` · ${dedup.echo_tax_id}` : ""}
              </div>
            )}
          </div>
        )}

        <TextField
          label={t("supplier.myCustomers.modal.taxId")}
          value={taxId}
          onChange={setTaxId}
        />
        <TextField
          label={t("supplier.myCustomers.modal.phone")}
          value={phone}
          onChange={setPhone}
        />
        <TextField
          label={t("supplier.myCustomers.modal.country")}
          value={country}
          onChange={setCountry}
        />

        {submitError && (
          <div className="rounded-md border border-[#f5c6c6] bg-[#fdecec] px-3 py-2 text-sm text-[#b42323]">
            {submitError}
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isInviting}>
            {t("supplier.myCustomers.modal.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {t("supplier.myCustomers.modal.sendInvite")}
          </button>
        </div>
      </form>
    </Modal>
  );
}