import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { SelectField } from "@/components/mundus/SelectField";
import { supabase } from "@/integrations/supabase/client";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  profileType: string;
  status: "active" | "invited" | "inactive";
};

type Props = {
  user: EditableUser | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** namespace ('supplier' or 'buyer') for i18n labels */
  ns: "supplier" | "buyer";
  profileOptions: string[];
};

const STATUS_OPTIONS: Array<"active" | "inactive"> = ["active", "inactive"];

export function EditUserModal({ user, open, onClose, onSaved, ns, profileOptions }: Props) {
  const { t } = useTranslation();
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<EditableUser["status"]>("active");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.profileType);
      setStatus(user.status === "invited" ? "active" : user.status);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("company_users")
      .update({ role, status })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t(`${ns}.users.edit.success`));
    onSaved?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={460} ariaLabel={t(`${ns}.users.edit.title`)}>
      <h2>{t(`${ns}.users.edit.title`)}</h2>
      <div className="modal-body">
        <p style={{ margin: "0 0 16px", fontSize: "var(--fs-sm)", color: "var(--fg-muted)" }}>
          {user.name} · {user.email}
        </p>
        <SelectField
          label={t(`${ns}.users.invite.profileLabel`)}
          required
          value={role}
          onChange={setRole}
          options={profileOptions.map((p) => ({ value: p, label: t(`${ns}.users.profile.${p}`) }))}
        />
        <SelectField
          label={t(`${ns}.users.col.status`)}
          required
          value={status}
          onChange={(v) => setStatus(v as EditableUser["status"])}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: t(`${ns}.users.status.${s}`),
          }))}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t(`${ns}.users.invite.cancel`)}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
          {t("common.save")}
        </button>
      </div>
    </Modal>
  );
}