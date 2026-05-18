import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="min-h-[100dvh] bg-[#F8F8F8] flex flex-col overflow-y-auto">
      {/* Mobile navbar */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="relative h-14 flex items-center justify-center px-12">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="absolute left-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] hover:bg-black/5 active:bg-black/10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <h1 className="text-base font-semibold text-[#111] truncate">{navTitle}</h1>
        </div>
      </header>

      {/* Desktop logo header */}
      <div className="hidden md:flex pt-8 justify-center">
        <img src={mundusLogo} alt="Mundus Trade" className="h-12 w-auto" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-[700px]">{children}</div>
      </div>
      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 flex flex-col items-center gap-2">
        <img src={mundusLogo} alt="Mundus Trade" className="h-6 w-auto opacity-80" />
        <p className="text-xs text-gray-400">© Copyright 2025 – All rights reserved.</p>
      </footer>
    </div>
  );
}