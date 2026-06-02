import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { ShiningButton } from "@/components/ui/shining-button";
import { AuthLayout } from "./AuthLayout";
import { PasswordRequirements } from "@/pages/signup/PasswordRequirements";
import { allRulesMet, checkPassword } from "@/pages/signup/passwordRules";

type Mode = "loading" | "ready" | "invalid";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Recovery links arrive in 3 possible formats. We handle all of them:
    //  1) PKCE:        ?code=...
    //  2) OTP token:   ?token_hash=...&type=recovery
    //  3) Legacy hash: #access_token=...&type=recovery  (auto-picked by client)
    let cancelled = false;
    let resolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        resolved = true;
        setMode("ready");
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const hash = window.location.hash || "";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) { setMode("invalid"); return; }
          // Strip ?code from URL so a refresh doesn't re-consume it
          window.history.replaceState({}, "", url.pathname);
          setMode("ready");
          return;
        }

        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
          if (cancelled) return;
          if (error) { setMode("invalid"); return; }
          window.history.replaceState({}, "", url.pathname);
          setMode("ready");
          return;
        }

        // Legacy hash flow — give the client a moment to process it.
        const looksLikeRecovery = hash.includes("type=recovery") || hash.includes("access_token");
        setTimeout(async () => {
          if (cancelled || resolved) return;
          const { data } = await supabase.auth.getSession();
          if (data.session && (looksLikeRecovery || resolved)) setMode("ready");
          else setMode("invalid");
        }, 900);
      } catch {
        if (!cancelled) setMode("invalid");
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const rules = checkPassword(password);
  const strong = allRulesMet(rules);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = strong && matches && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!matches) toast.error(t("auth.passwordsDontMatch"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    try {
      auditLog({ action: "auth.password_reset_completed", category: "auth" });
    } catch { /* ignore */ }
    await supabase.auth.signOut();
    toast.success(t("auth.passwordUpdated"));
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-bold text-[#111] text-center md:text-left">
        {t("auth.resetTitle")}
      </h1>
      <p className="mt-2 text-sm text-gray-500 text-center md:text-left">
        {t("auth.resetSubtitle")}
      </p>

      {mode === "loading" && (
        <p className="mt-10 text-sm text-gray-500 text-center">{t("common.loading")}</p>
      )}

      {mode === "invalid" && (
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{t("auth.invalidResetLink")}</p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#B64769] text-sm font-semibold text-white hover:opacity-90"
          >
            {t("auth.requestNewLink")}
          </Link>
          <Link to="/login" className="block text-center text-sm text-gray-600 hover:text-[#B64769]">
            {t("auth.backToLogin")}
          </Link>
        </div>
      )}

      {mode === "ready" && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-[#333] mb-1.5">{t("auth.newPassword")}</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 pr-12 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769]"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={t("auth.togglePassword")}
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#333] mb-1.5">{t("auth.confirmPassword")}</label>
            <input
              type={show ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769]"
            />
            {confirm.length > 0 && !matches && (
              <p className="mt-1 text-xs text-red-600">{t("auth.passwordsDontMatch")}</p>
            )}
          </div>

          <PasswordRequirements rules={rules} />

          <ShiningButton
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full text-sm"
          >
            {submitting ? t("auth.updating") : t("common.save")}
          </ShiningButton>

          <Link to="/login" className="block text-center text-sm text-gray-600 hover:text-[#B64769]">
            {t("auth.backToLogin")}
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}