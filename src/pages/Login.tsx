import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, setRememberMe } from "@/contexts/AuthContext";
import { getPersistedValue } from "@/lib/authStorage";
import { prepareNativeAuthScreen } from "@/lib/nativeAuthScreen";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ShiningButton } from "@/components/ui/shining-button";
import mundusLogo from "@/assets/mundus-logo.png";
import slide1 from "@/assets/login-carousel-1.png";
import slide2 from "@/assets/login-carousel-2.png";
import slide3 from "@/assets/login-carousel-3.png";
import slide4 from "@/assets/login-carousel-4.png";
import slide5 from "@/assets/login-carousel-5.png";
import slide6 from "@/assets/login-carousel-6.png";
import slide7 from "@/assets/login-carousel-7.png";

const slides: string[] = [slide1, slide2, slide3, slide4, slide5, slide6, slide7];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    void prepareNativeAuthScreen();
    getPersistedValue("mundus.rememberMe").then((v) => {
      if (v === "0") setRemember(false);
    });
  }, []);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    await setRememberMe(remember);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.welcomeBack"));
    navigate("/", { replace: true });
  };

  return (
    <div className="auth-screen bg-white">
      <header className="auth-screen-header shrink-0">
        <LanguageSwitcher variant="pill" />
      </header>
      <main className="auth-screen-scroll flex min-h-0 flex-1 flex-col md:flex-row md:items-center md:justify-center md:gap-16 md:py-10">
        <div className="auth-screen-scroll__content flex min-h-0 flex-1 flex-col-reverse items-center justify-center md:flex-row md:items-center md:gap-16 md:py-0 w-full">
        {/* Carousel — desktop only; hidden on mobile */}
        <div className="relative hidden md:block md:w-[420px] lg:w-[480px] md:max-h-[70vh] md:ml-4 lg:ml-8 overflow-hidden rounded-3xl shadow-sm ring-1 ring-black/5 bg-neutral-100 isolate aspect-[4/5]">
          {slides.map((src, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 overflow-hidden rounded-3xl transition-opacity duration-1000",
                i === slide ? "opacity-100" : "opacity-0",
              )}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full block object-cover rounded-3xl"
              />
            </div>
          ))}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === slide ? "w-8" : "w-6 bg-white/50",
                  )}
                  style={i === slide ? { background: "#B64769" } : undefined}
                  aria-label={`${t("auth.slide")} ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT - form */}
          <div className="w-full max-w-[380px] px-6 py-10 md:p-0 text-center md:text-left">
            <img
              src={mundusLogo}
              alt="Mundus Trade"
              className="md:hidden mx-auto mb-6 h-10 w-auto"
            />
            <h1 className="text-[28px] font-bold text-[#111] text-center md:text-left">{t("auth.login")}</h1>

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

            <div>
              <label className="block text-sm text-[#333] mb-1.5">{t("auth.password")}</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 pr-12 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={t("auth.togglePassword")}
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs text-[#B64769] font-medium hover:underline">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#B64769]"
                />
                {t("auth.rememberMe")}
              </label>
              <ShiningButton
                type="submit"
                disabled={submitting}
                className="h-11 w-32 text-sm"
              >
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </ShiningButton>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            {t("auth.noAccount")}{" "}
            <Link to="/signup" className="text-[#B64769] font-semibold">
              {t("auth.signUp")}
            </Link>
          </p>

          <div className="mt-8 flex justify-center gap-6 text-xs text-gray-600">
            <a href="#" className="underline">{t("common.termsLink")}</a>
            <a href="#" className="underline">{t("common.privacyLink")}</a>
          </div>
          </div>
        </div>
        <footer className="auth-screen-footer shrink-0 flex flex-col items-center gap-2 md:hidden">
          <img src={mundusLogo} alt="Mundus Trade" className="h-6 w-auto opacity-80" />
          <p className="text-xs text-gray-400">{t("common.copyright")}</p>
        </footer>
      </main>

      {/* Footer — desktop only */}
      <footer className="hidden md:block shrink-0 border-t border-gray-100 py-5">
        <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
          <img src={mundusLogo} alt="Mundus Trade" className="h-5 w-auto opacity-80" />
          <span>{t("common.copyright")}</span>
        </div>
      </footer>
    </div>
  );
}