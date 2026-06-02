import { ReactNode, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { prepareNativeAuthScreen } from "@/lib/nativeAuthScreen";
import mundusLogo from "@/assets/mundus-logo.png";

export function SignupShell({
  children,
  onBack,
  title,
}: {
  children: ReactNode;
  /** Mobile back handler. Defaults to navigate(-1). Pass null to hide. */
  onBack?: (() => void) | null;
  /** Mobile navbar title. Defaults to "Sign Up". */
  title?: string;
}) {
  const navigate = useNavigate();
  const showBack = onBack !== null;
  const handleBack = onBack ?? (() => navigate(-1));
  const navTitle = title ?? "Sign Up";

  useEffect(() => {
    void prepareNativeAuthScreen();
  }, []);

  return (
    <div className="auth-screen">
      {/* Mobile navbar — fixed height includes safe-top */}
      <header className="auth-screen-navbar md:hidden">
        <div className="auth-screen-navbar__inner">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="absolute left-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] hover:bg-black/5 active:bg-black/10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <h1 className="text-base font-semibold text-[#111] truncate max-w-[min(100%,14rem)]">
            {navTitle}
          </h1>
          <div className="absolute right-0">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Desktop logo header */}
      <div className="hidden md:flex shrink-0 pt-8 px-8 items-center justify-between">
        <div className="w-24" />
        <img src={mundusLogo} alt="Mundus Trade" className="h-12 w-auto" />
        <div className="w-24 flex justify-end">
          <LanguageSwitcher variant="pill" />
        </div>
      </div>

      <main className="auth-screen-scroll flex min-h-0 flex-1 flex-col">
        <div className="auth-screen-scroll__content min-h-0 flex-1">
          <div className="w-full max-w-[700px] md:mx-auto">{children}</div>
        </div>
        <footer className="auth-screen-footer shrink-0 flex flex-col items-center gap-2">
          <img src={mundusLogo} alt="Mundus Trade" className="h-6 w-auto opacity-80" />
          <p className="text-xs text-gray-400">© Copyright 2025 – All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
