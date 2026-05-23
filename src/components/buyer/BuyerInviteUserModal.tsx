import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_BUYER_COMPANY_ID, type BuyerProfileType } from "@/hooks/useBuyerUsers";
import { useCompanyOffices } from "@/hooks/useCompanyOffices";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const PROFILES: BuyerProfileType[] = ["master_buyer", "procurement", "finance", "compliance"];

export function BuyerInviteUserModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<BuyerProfileType>("procurement");
  const [busy, setBusy] = useState(false);
  const { offices } = useCompanyOffices(MOCK_BUYER_COMPANY_ID);
  const sortedOffices = [...offices].sort((a, b) =>
    !a.parent_company_id ? -1 : !b.parent_company_id ? 1 : 0,
  );
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  if (!selectedOfficeId && sortedOffices.length > 0) {
    setTimeout(() => setSelectedOfficeId(sortedOffices[0].id), 0);
  }

  const handleSend = async () => {
    setBusy(true);
    const { data: inserted, error } = await (supabase as any).from("company_users").insert({
      company_id: MOCK_BUYER_COMPANY_ID,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: profile,
      status: "invited",
    }).select("id").single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (selectedOfficeId && inserted?.id) {
      await (supabase as any).from("user_offices").insert({
        user_id: inserted.id,
        company_id: selectedOfficeId,
        role: "member",
        is_primary: true,
      });
    }
    toast.success(t("buyer.users.invite.successEmail", { email: email.trim() }));
    setFullName("");
    setEmail("");
    setProfile("procurement");
    onCreated?.();
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
          label={t("buyer.users.invite.fullNameLabel")}
          required
          value={fullName}
          onChange={setFullName}
          placeholder={t("buyer.users.invite.fullNamePlaceholder")}
        />
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
          onChange={(v) => setProfile(v as BuyerProfileType)}
          options={PROFILES.map((p) => ({ value: p, label: t(`buyer.users.profile.${p}`) }))}
        />
        {sortedOffices.length > 1 && (
          <div className="field">
            <label className="field-label">Assign to Office</label>
            <select
              className="input"
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
            >
              {sortedOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {!o.parent_company_id
                    ? `🏛️ HQ ${o.office_country || o.country || ""}`.trim()
                    : `🌏 ${o.office_name || o.office_country || "Office"}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("buyer.users.invite.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!email.trim() || !fullName.trim() || busy}
        >
          {t("buyer.users.invite.send")}
        </button>
      </div>
    </Modal>
  );
}
