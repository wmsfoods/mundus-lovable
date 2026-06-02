import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { ShiningButton } from "@/components/ui/shining-button";
import { isNativeApp } from "@/lib/isNativeApp";
import { cn } from "@/lib/utils";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const native = isNativeApp();

  return (
    <div
      className={cn(
        "bg-white text-[#1A1A2E]",
        native ? "flex h-full min-h-0 flex-col overflow-hidden" : "min-h-screen",
      )}
    >
      <header
        className={cn(
          "border-b border-gray-200 bg-white",
          native && "auth-screen-safe-top flex-shrink-0",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <Link to="/home" className="flex shrink-0 items-center" aria-label="Mundus Trade">
            <Logo size={28} className="sm:hidden" />
            <Logo size={36} className="hidden sm:block" />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user ? (
              <Link
                to="/"
                className="rounded-md bg-[#B64769] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 sm:px-6 sm:py-3 sm:text-base"
              >
                {t("public.home.openApp", "Open app")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-2 py-1.5 text-sm font-semibold text-[#1A1A2E] hover:text-[#B64769] sm:px-3 sm:py-2 sm:text-base"
                >
                  {t("public.home.login", "Login")}
                </Link>
                <ShiningButton
                  onClick={() => navigate("/signup")}
                  className="!rounded-md whitespace-nowrap px-3 py-1.5 text-sm font-semibold sm:px-6 sm:py-3 sm:text-base"
                >
                  {t("public.home.signup", "Sign up")}
                </ShiningButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main
        className={cn(
          native &&
            "flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]",
        )}
        style={
          native
            ? { paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >
        {children}
      </main>
    </div>
  );
}