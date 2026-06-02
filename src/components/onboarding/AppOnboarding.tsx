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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-white flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground min-h-[44px] px-3 rounded-md"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      {/* Swipe area */}
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
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
              style={{
                background: "var(--brand-gradient, linear-gradient(135deg,#8B2E4F,#6C0B28))",
                color: "white",
              }}
            >
              <Icon className="w-12 h-12" strokeWidth={1.75} />
            </div>
            <h2
              className="text-2xl font-semibold mb-4 leading-tight"
              style={{ color: "var(--p800, #6C0B28)" }}
            >
              {step.title}
            </h2>
            <p className="text-base text-muted-foreground max-w-sm">{step.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 py-4">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-6" : "w-1.5 opacity-40",
            )}
            style={{ background: "var(--p800, #6C0B28)" }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 flex gap-3">
        {index > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            className="min-h-[48px] flex-1"
          >
            {t("onboarding.back")}
          </Button>
        )}
        <Button
          type="button"
          onClick={goNext}
          className="min-h-[48px] flex-1"
          style={{ background: "var(--p800, #6C0B28)", color: "white" }}
        >
          {isLast ? t(`onboarding.${role}.cta`) : t("onboarding.next")}
        </Button>
      </div>
    </div>
  );
}