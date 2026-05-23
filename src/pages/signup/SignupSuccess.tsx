import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Mail } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { SignupShell } from "./SignupShell";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export default function SignupSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const email = params.get("email") ?? "";

  return (
    <SignupShell title={t("signup.success.navTitle")}>
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <Mail className="h-20 w-20" style={{ color: "#B64769" }} strokeWidth={1.5} />
            <CheckCircle
              className="absolute -bottom-1 -right-1 h-8 w-8 bg-white rounded-full"
              style={{ color: "#B64769" }}
              strokeWidth={2}
            />
          </div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#111]">{t("signup.success.title")}</h2>
        <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
          <Trans
            i18nKey="signup.success.body"
            values={{ email: maskEmail(email) }}
            components={{ 1: <span className="font-medium text-gray-700" /> }}
          >
            {t("signup.success.body", { email: maskEmail(email) })}
          </Trans>
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="h-11 px-6 rounded-full bg-[#B64769] text-white hover:bg-[#8E3653] text-sm font-medium"
          >
            {t("signup.success.backToLogin")}
          </button>
        </div>
      </div>
    </SignupShell>
  );
}