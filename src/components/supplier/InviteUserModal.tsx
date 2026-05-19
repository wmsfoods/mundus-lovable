import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import type { SupplierUser } from "@/hooks/useSupplierUsers";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PROFILES: SupplierUser["profileType"][] = [
  "master_supplier",
  "sales_trader",
  "export_manager",
  "quality_control",
  "logistics",
];

export function InviteUserModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<SupplierUser["profileType"]>("sales_trader");

  const handleSend = () => {
    console.log("invite", { email, profile });
    toast.success(t("supplier.users.invite.success"));
    setEmail("");
    setProfile("sales_trader");
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
          onChange={(v) => setProfile(v as SupplierUser["profileType"])}
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
          disabled={!email.trim()}
        >
          {t("supplier.users.invite.send")}
        </button>
      </div>
    </Modal>
  );
}