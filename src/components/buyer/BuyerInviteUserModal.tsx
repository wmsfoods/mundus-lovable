import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import type { BuyerUser } from "@/hooks/useBuyerUsers";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PROFILES: BuyerUser["profileType"][] = ["admin", "buyer", "viewer"];

export function BuyerInviteUserModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<BuyerUser["profileType"]>("buyer");

  const handleSend = () => {
    console.log("invite buyer user", { email, profile });
    toast.success(t("buyer.users.invite.success"));
    setEmail("");
    setProfile("buyer");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={480} ariaLabel={t("buyer.users.invite.title")}>
      <h2>{t("buyer.users.invite.title")}</h2>
      <div className="modal-body">
        <p style={{ margin: "0 0 16px", fontSize: "var(--fs-sm)", color: "var(--fg-muted)" }}>
          {t("buyer.users.invite.subtitle")}
        </p>
        <TextField
          label={t("buyer.users.invite.emailLabel")}
          required
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t("buyer.users.invite.emailPlaceholder")}
        />
        <SelectField
          label={t("buyer.users.invite.profileLabel")}
          required
          value={profile}
          onChange={(v) => setProfile(v as BuyerUser["profileType"])}
          options={PROFILES.map((p) => ({ value: p, label: t(`buyer.users.profile.${p}`) }))}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("buyer.users.invite.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!email.trim()}
        >
          {t("buyer.users.invite.send")}
        </button>
      </div>
    </Modal>
  );
}
