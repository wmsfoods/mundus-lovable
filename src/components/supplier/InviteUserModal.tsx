import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_SUPPLIER_COMPANY_ID, type SupplierProfileType } from "@/hooks/useSupplierUsers";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const PROFILES: SupplierProfileType[] = [
  "master_supplier",
  "operator",
  "export_manager",
  "quality_control",
  "logistics",
];

export function InviteUserModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<SupplierProfileType>("operator");
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("company_users").insert({
      company_id: MOCK_SUPPLIER_COMPANY_ID,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: profile,
      status: "invited",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("supplier.users.invite.successEmail", { email: email.trim() }));
    setFullName("");
    setEmail("");
    setProfile("operator");
    onCreated?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={480} ariaLabel={t("supplier.users.invite.title")}>
      <h2>{t("supplier.users.invite.title")}</h2>
      <div className="modal-body">
        <p style={{ margin: "0 0 16px", fontSize: "var(--fs-sm)", color: "var(--fg-muted)" }}>
          {t("supplier.users.invite.subtitle")}
        </p>
        <TextField
          label={t("supplier.users.invite.fullNameLabel")}
          required
          value={fullName}
          onChange={setFullName}
          placeholder={t("supplier.users.invite.fullNamePlaceholder")}
        />
        <TextField
          label={t("supplier.users.invite.emailLabel")}
          required
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t("supplier.users.invite.emailPlaceholder")}
        />
        <SelectField
          label={t("supplier.users.invite.profileLabel")}
          required
          value={profile}
          onChange={(v) => setProfile(v as SupplierProfileType)}
          options={PROFILES.map((p) => ({ value: p, label: t(`supplier.users.profile.${p}`) }))}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("supplier.users.invite.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!email.trim() || !fullName.trim() || busy}
        >
          {t("supplier.users.invite.send")}
        </button>
      </div>
    </Modal>
  );
}