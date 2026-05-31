import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Invite = {
  id: string;
  full_name: string;
  email: string;
  company_id: string;
  profile_type: string | null;
  language: string | null;
  accepted_at: string | null;
  expires_at: string | null;
};

export default function InviteAccept() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("team_invitations")
        .select("id, full_name, email, company_id, profile_type, language, accepted_at, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError(t("inviteAccept.errors.invalid", { defaultValue: "This invitation link is invalid or has expired." }));
      } else if (data.accepted_at) {
        setError(t("inviteAccept.errors.alreadyAccepted", { defaultValue: "This invitation has already been accepted. Please sign in." }));
      } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError(t("inviteAccept.errors.expired", { defaultValue: "This invitation has expired. Please ask for a new one." }));
      } else {
        setInvite(data as Invite);
        if (data.language && data.language !== i18n.language) {
          i18n.changeLanguage(data.language);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, t, i18n]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    if (password.length < 8) {
      toast.error(t("inviteAccept.errors.passwordShort", { defaultValue: "Password must be at least 8 characters." }));
      return;
    }
    if (password !== confirm) {
      toast.error(t("inviteAccept.errors.passwordMismatch", { defaultValue: "Passwords do not match." }));
      return;
    }
    setBusy(true);
    try {
      // Try sign up; if user already exists, sign in
      let userId: string | null = null;
      const { data: signUp, error: suErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: invite.full_name } },
      });
      if (suErr && !/already/i.test(suErr.message)) throw suErr;
      userId = signUp?.user?.id ?? null;
      if (!userId) {
        const { data: signIn, error: siErr } = await supabase.auth.signInWithPassword({
          email: invite.email, password,
        });
        if (siErr) throw siErr;
        userId = signIn.user?.id ?? null;
      }
      if (!userId) throw new Error("no_user_id");

      const { error: acceptErr } = await (supabase as any).rpc("accept_team_invitation", {
        p_token: token, p_user_id: userId,
      });
      if (acceptErr) throw acceptErr;

      toast.success(t("inviteAccept.success", { defaultValue: "Welcome! Redirecting to your workspace…" }));
      setTimeout(() => navigate("/"), 800);
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invitation");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{t("common.loading")}…</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold mb-2">{t("inviteAccept.errors.title", { defaultValue: "Invitation unavailable" })}</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button className="ufm-btn-primary" onClick={() => navigate("/login")}>{t("common.signIn", { defaultValue: "Sign in" })}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <form onSubmit={handleAccept} className="max-w-md w-full rounded-xl border bg-card p-8 shadow-sm">
        <div className="text-xs tracking-widest font-bold text-primary mb-3">MUNDUS TRADE</div>
        <h1 className="text-xl font-semibold mb-1">{t("inviteAccept.title", { defaultValue: "Accept your invitation" })}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("inviteAccept.subtitle", { defaultValue: "Hi {{name}}, set a password to access your workspace.", name: invite?.full_name })}
        </p>
        <div className="mb-4">
          <label className="text-xs text-muted-foreground">{t("inviteAccept.email", { defaultValue: "E-mail" })}</label>
          <input className="ufm-input" value={invite?.email ?? ""} readOnly />
        </div>
        <div className="mb-4">
          <label className="text-xs text-muted-foreground">{t("inviteAccept.password", { defaultValue: "Password" })}</label>
          <input type="password" className="ufm-input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus minLength={8} required />
        </div>
        <div className="mb-6">
          <label className="text-xs text-muted-foreground">{t("inviteAccept.confirm", { defaultValue: "Confirm password" })}</label>
          <input type="password" className="ufm-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        </div>
        <button type="submit" className="ufm-btn-primary w-full" disabled={busy}>
          {busy ? t("common.submitting", { defaultValue: "Submitting…" }) : t("inviteAccept.cta", { defaultValue: "Accept and continue" })}
        </button>
      </form>
    </div>
  );
}