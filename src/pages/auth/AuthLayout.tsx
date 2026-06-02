import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { prepareNativeAuthScreen } from "@/lib/nativeAuthScreen";
import { cn } from "@/lib/utils";
import mundusLogo from "@/assets/mundus-logo.png";
import slide1 from "@/assets/login-carousel-1.png";
import slide2 from "@/assets/login-carousel-2.png";
import slide3 from "@/assets/login-carousel-3.png";
import slide4 from "@/assets/login-carousel-4.png";
import slide5 from "@/assets/login-carousel-5.png";
import slide6 from "@/assets/login-carousel-6.png";
import slide7 from "@/assets/login-carousel-7.png";

const slides = [slide1, slide2, slide3, slide4, slide5, slide6, slide7];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    void prepareNativeAuthScreen();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="auth-screen bg-white">
      <header className="auth-screen-header shrink-0">
        <LanguageSwitcher variant="pill" />
      </header>
      <main className="auth-screen-scroll flex min-h-0 flex-1 flex-col md:flex-row md:items-center md:justify-center md:gap-16 md:py-10">
        <div className="auth-screen-scroll__content flex min-h-0 flex-1 flex-col-reverse items-center justify-center md:flex-row md:items-center md:gap-16 md:py-0 w-full">
          <div className="relative hidden md:block md:w-[420px] lg:w-[480px] md:max-h-[70vh] md:ml-4 lg:ml-8 overflow-hidden rounded-3xl shadow-sm ring-1 ring-black/5 bg-neutral-100 isolate aspect-[4/5]">
            {slides.map((src, i) => (
              <div
                key={i}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-3xl transition-opacity duration-1000",
                  i === slide ? "opacity-100" : "opacity-0",
                )}
              >
                <img src={src} alt="" className="w-full h-full block object-cover rounded-3xl" />
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

          <div className="w-full max-w-[380px] px-6 py-10 md:p-0 text-center md:text-left">
            <img src={mundusLogo} alt="Mundus Trade" className="md:hidden mx-auto mb-6 h-10 w-auto" />
            {children}
          </div>
        </div>
        <footer className="auth-screen-footer shrink-0 flex flex-col items-center gap-2 md:hidden">
          <img src={mundusLogo} alt="Mundus Trade" className="h-6 w-auto opacity-80" />
          <p className="text-xs text-gray-400">{t("common.copyright")}</p>
        </footer>
      </main>
      <footer className="hidden md:block shrink-0 border-t border-gray-100 py-5">
        <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
          <img src={mundusLogo} alt="Mundus Trade" className="h-5 w-auto opacity-80" />
          <span>{t("common.copyright")}</span>
        </div>
      </footer>
    </div>
  );
}