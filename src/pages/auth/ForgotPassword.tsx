import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { ShiningButton } from "@/components/ui/shining-button";
import { AuthLayout } from "./AuthLayout";

const COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting || cooldown > 0) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    // Always show the same neutral response to avoid account enumeration.
    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
    try {
      auditLog({ action: "auth.password_reset_requested", category: "auth", details: { email } });
    } catch { /* ignore */ }
    if (error) {
      // Log but never surface to the user.
      console.warn("[forgot-password]", error.message);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-bold text-[#111] text-center md:text-left">
        {t("auth.forgotTitle")}
      </h1>
      <p className="mt-2 text-sm text-gray-500 text-center md:text-left">
        {t("auth.forgotSubtitle")}
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{t("auth.resetLinkSent")}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm text-[#333] mb-1.5">{t("auth.email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769]"
          />
        </div>

        <ShiningButton
          type="submit"
          disabled={submitting || cooldown > 0}
          className="h-11 w-full text-sm"
        >
          {submitting
            ? t("auth.sending")
            : cooldown > 0
              ? `${t("auth.sendResetLink")} (${cooldown}s)`
              : t("auth.sendResetLink")}
        </ShiningButton>
      </form>

      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#B64769]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("auth.backToLogin")}
      </Link>
    </AuthLayout>
  );
}