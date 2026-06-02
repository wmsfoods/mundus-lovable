import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import {
  Globe,
  Tag,
  MessageSquare,
  Ship,
  CheckCircle2,
  PackagePlus,
  Gavel,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { cn } from "@/lib/utils";

type Role = "buyer" | "supplier";

type Step = {
  key: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

function buildSteps(role: Role, t: (k: string) => string): Step[] {
  const ns = `onboarding.${role}`;
  if (role === "buyer") {
    return [
      { key: "welcome", icon: Globe, title: t(`${ns}.s1.title`), body: t(`${ns}.s1.body`) },
      { key: "offers", icon: Tag, title: t(`${ns}.s2.title`), body: t(`${ns}.s2.body`) },
      { key: "nego", icon: MessageSquare, title: t(`${ns}.s3.title`), body: t(`${ns}.s3.body`) },
      { key: "ship", icon: Ship, title: t(`${ns}.s4.title`), body: t(`${ns}.s4.body`) },
      { key: "ready", icon: CheckCircle2, title: t(`${ns}.s5.title`), body: t(`${ns}.s5.body`) },
    ];
  }
  return [
    { key: "welcome", icon: Globe, title: t(`${ns}.s1.title`), body: t(`${ns}.s1.body`) },
    { key: "offers", icon: PackagePlus, title: t(`${ns}.s2.title`), body: t(`${ns}.s2.body`) },
    { key: "nego", icon: Gavel, title: t(`${ns}.s3.title`), body: t(`${ns}.s3.body`) },
    { key: "sales", icon: ClipboardList, title: t(`${ns}.s4.title`), body: t(`${ns}.s4.body`) },
    { key: "ready", icon: CheckCircle2, title: t(`${ns}.s5.title`), body: t(`${ns}.s5.body`) },
  ];
}

interface Props {
  role: Role;
}

export default function AppOnboarding({ role }: Props) {
  // Native-only guard: never render on web.
  if (!Capacitor.isNativePlatform()) return null;
  return <AppOnboardingInner role={role} />;
}

function AppOnboardingInner({ role }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shouldShow, complete } = useOnboarding();
  const { company, loading: companyLoading } = useCurrentCompany();
  const { isAdmin, loading: adminLoading } = useIsMundusAdmin();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Admins skip onboarding (mark as complete without UI).
  useEffect(() => {
    if (!shouldShow) return;
    if (adminLoading) return;
    if (isAdmin) {
      void complete();
    }
  }, [shouldShow, isAdmin, adminLoading, complete]);

  // Validate role matches company. If mismatch, do not show.
  const allowed = useMemo(() => {
    if (companyLoading) return false;
    if (!company) return false;
    if (role === "buyer") return company.is_buyer;
    return company.is_supplier;
  }, [company, companyLoading, role]);

  const steps = useMemo(() => buildSteps(role, t), [role, t]);

  // Lock body scroll while open.
  const open = shouldShow && allowed && !isAdmin && !adminLoading;
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const isLast = index === steps.length - 1;

  const goNext = () => {
    if (isLast) {
      void complete();
      if (role === "buyer") navigate("/buyer/offers");
      else navigate("/supplier/offers/new");
      return;
    }
    setDirection(1);
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goPrev = () => {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    void complete();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goNext();
    else if (info.offset.x > threshold) goPrev();
  };

  const step = steps[index];
  const Icon = step.icon;

  const finish = () => {
    void complete();
    navigate("/login");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-white overflow-hidden"
    >
      {/* Full-bleed pastel background blob behind safe area */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[58%] pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 10%, rgba(139,46,79,0.18) 0%, rgba(139,46,79,0.08) 45%, rgba(255,255,255,0) 75%)",
        }}
      />

      {/* Content stays within safe area */}
      <div
        className="relative z-10 h-full w-full flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Swipe area: illustration + text + dots + CTA */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.key}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
              className="absolute inset-0 flex flex-col px-6"
            >
              {/* Illustration block (top ~55%) */}
              <div className="flex-1 flex items-center justify-center pt-6">
                <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-[42%_58%_55%_45%/50%_40%_60%_50%]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(139,46,79,0.12), rgba(139,46,79,0.04))",
                    }}
                  />
                  <div
                    className="relative w-40 h-40 rounded-[36px] flex items-center justify-center shadow-lg"
                    style={{
                      background:
                        "var(--brand-gradient, linear-gradient(135deg,#8B2E4F,#6C0B28))",
                      color: "white",
                    }}
                  >
                    <Icon className="w-20 h-20" strokeWidth={1.5} />
                  </div>
                </div>
              </div>

              {/* Text block */}
              <div className="text-center pb-6">
                <h2
                  className="text-2xl font-semibold mb-3 leading-tight tracking-tight uppercase"
                  style={{ color: "var(--p800, #6C0B28)" }}
                >
                  {step.title}
                </h2>
                <p className="text-[15px] leading-relaxed text-muted-foreground max-w-sm mx-auto">
                  {step.body}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page controls (tappable dots) */}
        <div className="flex justify-center gap-2 py-5" role="tablist" aria-label="Onboarding steps">
          {steps.map((s, i) => {
            const active = i === index;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Step ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className="p-2 -m-2"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    active ? "w-6" : "w-1.5 opacity-40",
                  )}
                  style={{ background: "var(--p800, #6C0B28)" }}
                />
              </button>
            );
          })}
        </div>

        {/* Final CTA only on last step */}
        <div className="px-6 pb-6 pt-1 min-h-[72px] flex items-center">
          {isLast ? (
            <Button
              type="button"
              onClick={finish}
              className="min-h-[52px] w-full rounded-full text-base font-semibold"
              style={{ background: "var(--p800, #6C0B28)", color: "white" }}
            >
              {t("onboarding.getStarted", { defaultValue: "Get started" })}
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              className="mx-auto text-sm text-muted-foreground min-h-[44px] px-4 rounded-full"
            >
              {t("onboarding.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}