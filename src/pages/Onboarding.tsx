import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import {
  POST_ONBOARDING_PATH,
  usePreLoginOnboarding,
  type PreLoginRole,
} from "@/hooks/usePreLoginOnboarding";
import { isNativeApp } from "@/lib/isNativeApp";
import { prepareNativeAuthScreen } from "@/lib/nativeAuthScreen";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShoppingCart,
  UtensilsCrossed,
  ArrowLeftRight,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import cubeRollImg from "@/assets/onboarding/cube-roll.png";
import chickenBreastImg from "@/assets/onboarding/chicken-breast.png";

type Role = PreLoginRole;

/* =========================================================================
   Mundus — Mobile Onboarding (4 screens). Mobile-only, safe-area aware.
   ========================================================================= */

const SWIPE_THRESHOLD = 60;

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, done, complete } = usePreLoginOnboarding();
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<Role>("buyer");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; t: number } | null>(null);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(3, i)));
  const finish = async () => {
    await complete(role);
    navigate(POST_ONBOARDING_PATH, { replace: true });
  };
  const next = () => (index === 3 ? void finish() : goTo(index + 1));
  const prev = () => goTo(index - 1);
  const skip = () => goTo(3);
  const isNative = isNativeApp();
  const canShow = isNative && !loading && !done;

  useEffect(() => {
    if (!canShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShow, index, role]);

  useEffect(() => {
    return () => {
      void prepareNativeAuthScreen();
    };
  }, []);

  if (!isNative) {
    return <Navigate to="/home" replace />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d0709]">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (done) {
    return <Navigate to={POST_ONBOARDING_PATH} replace />;
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, t: Date.now() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
  };

  const ctaLabel =
    index === 0
      ? t("onboarding.pre.getStarted")
      : index === 3
        ? t("onboarding.pre.continueAs", {
            role: t(
              role === "buyer" ? "onboarding.pre.roleBuyer" : "onboarding.pre.roleSupplier",
            ),
          })
        : t("onboarding.pre.next");

  const ctaOnDark = index === 0 || index === 3;

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden bg-[#0d0709] font-[Inter,system-ui,sans-serif] text-[#0A0A0A]"
      style={{ touchAction: "pan-y" }}
    >
      {/* Sliding track */}
      <div
        ref={trackRef}
        className="absolute inset-0 flex"
        style={{
          width: "400%",
          transform: `translateX(-${index * 25}%)`,
          transition: prefersReducedMotion
            ? "none"
            : "transform 0.55s cubic-bezier(0.65, 0, 0.18, 1)",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragStart.current = null)}
      >
        <Screen1 />
        <Screen2 />
        <Screen3 />
        <Screen4 role={role} setRole={setRole} />
      </div>

      {/* Skip — top right, inside safe area */}
      {index < 3 && (
        <button
          onClick={skip}
          className="absolute right-5 z-30 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/85 active:scale-[0.98]"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* Footer: dots + CTA */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-5 px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <Dots index={index} onJump={goTo} dark={ctaOnDark} />
        <button
          onClick={next}
          className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform active:scale-[0.98] ${
            ctaOnDark
              ? "bg-white text-[#B64769] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
              : "bg-[#B64769] text-white shadow-[0_18px_40px_-18px_rgba(118,37,56,0.55)]"
          }`}
        >
          <span className={index === 3 ? "capitalize" : ""}>{ctaLabel}</span>
          <ArrowRight size={17} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Dots ---------------------------------------------------------- */
function Dots({
  index,
  onJump,
  dark,
}: {
  index: number;
  onJump: (i: number) => void;
  dark: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3].map((i) => {
        const active = i === index;
        const baseColor = dark
          ? active
            ? "bg-white"
            : "bg-white/30"
          : active
            ? "bg-[#B64769]"
            : "bg-black/15";
        return (
          <button
            key={i}
            aria-label={`Go to step ${i + 1}`}
            onClick={() => onJump(i)}
            className={`h-[7px] rounded-full transition-all duration-300 ${baseColor}`}
            style={{ width: active ? 26 : 7 }}
          />
        );
      })}
    </div>
  );
}

/* ---------- Layout primitives -------------------------------------------- */
const safeTopPad: CSSProperties = {
  paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)",
};
const safeBottomPad: CSSProperties = {
  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 160px)",
};

function ScreenShell({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative h-full w-1/4 flex-shrink-0 overflow-hidden ${className}`}
      style={{ ...style }}
    >
      <div
        className="flex h-full w-full flex-col px-6"
        style={{ ...safeTopPad, ...safeBottomPad }}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================ Screen 1 — Welcome ========================== */
function Screen1() {
  const { t } = useTranslation();
  return (
    <ScreenShell
      style={{
        background:
          "linear-gradient(165deg, #6C0B28 0%, #8a2342 52%, #A74764 100%)",
      }}
    >
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 72%)",
          }}
        >
          <img
            src={cubeRollImg}
            alt=""
            className="w-[230px] -rotate-6"
            style={{ filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.45))" }}
          />
        </motion.div>
      </div>

      <div className="mb-4">
        <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] text-white/85">
          <span className="h-[1px] w-7 bg-white/55" />
          {t("onboarding.pre.s1.eyebrow")}
        </div>
        <h1
          className="text-[34px] font-semibold leading-[1.04] text-white"
          style={{ letterSpacing: "-0.5px" }}
        >
          <Trans i18nKey="onboarding.pre.s1.title" components={{ br: <br /> }} />
        </h1>
        <p className="mt-4 max-w-[300px] text-[14px] leading-[1.5] text-white/82">
          {t("onboarding.pre.s1.subtitle")}
        </p>
      </div>
    </ScreenShell>
  );
}

/* ====================== Screen 2 — Browse offers ========================== */
function Screen2() {
  const { t } = useTranslation();
  return (
    <ScreenShell style={{ background: "#eeeef0" }}>
      <header className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B64769]">
          {t("onboarding.pre.s2.kicker")}
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-[#0A0A0A]"
          style={{ letterSpacing: "-0.4px" }}
        >
          <Trans i18nKey="onboarding.pre.s2.title" components={{ br: <br /> }} />
        </h1>
        <p className="mt-3 max-w-[300px] text-[13.5px] leading-[1.5] text-[#5e5f6b]">
          {t("onboarding.pre.s2.lede")}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <OfferCard
          feature
          dotColor="#c0392b"
          species={t("onboarding.pre.s2.card1.chip")}
          title={t("onboarding.pre.s2.card1.title")}
          flag="🇧🇷"
          origin={t("onboarding.pre.s2.card1.country")}
          mt={t("onboarding.pre.s2.card1.volume")}
          incoterm={t("onboarding.pre.s2.card1.incoterm")}
          activeLabel={t("onboarding.pre.active")}
          thumb={cubeRollImg}
          thumbBg="#fdf3f4"
        />
        <OfferCard
          dotColor="#e08e3c"
          species={t("onboarding.pre.s2.card2.chip")}
          title={t("onboarding.pre.s2.card2.title")}
          flag="🇺🇸"
          origin={t("onboarding.pre.s2.card2.country")}
          mt={t("onboarding.pre.s2.card2.volume")}
          incoterm={t("onboarding.pre.s2.card2.incoterm")}
          activeLabel={t("onboarding.pre.active")}
          thumb={chickenBreastImg}
          thumbBg="#fff5e8"
        />
      </div>
    </ScreenShell>
  );
}

function OfferCard({
  feature = false,
  dotColor,
  species,
  title,
  flag,
  origin,
  mt,
  incoterm,
  activeLabel,
  thumb,
  thumbBg,
}: {
  feature?: boolean;
  dotColor: string;
  species: string;
  title: string;
  flag: string;
  origin: string;
  mt: string;
  incoterm: string;
  activeLabel: string;
  thumb: string;
  thumbBg: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[22px] bg-white p-3"
      style={{
        border: feature ? "1.5px solid #f6d5db" : "1.5px solid #ececef",
        boxShadow: feature
          ? "0 22px 42px -22px rgba(118,37,56,0.32)"
          : "0 16px 36px -22px rgba(0,0,0,0.14)",
      }}
    >
      <div
        className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px]"
        style={{ background: thumbBg }}
      >
        <img src={thumb} alt={title} className="h-[56px] w-[56px] object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[#5e5f6b]">
            <span
              className="inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: dotColor }}
            />
            {species}
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#e6f7ed] px-2 py-[2px] text-[10px] font-semibold text-[#16a34a]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#16a34a]" />
            {activeLabel}
          </span>
        </div>
        <h3 className="mt-1 text-[15px] font-semibold leading-tight text-[#0A0A0A]">
          {title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6b7280]">
          <span>{flag}</span>
          <span>{origin}</span>
          <span className="opacity-50">·</span>
          <span>{mt}</span>
          <span className="opacity-50">·</span>
          <span>{incoterm}</span>
        </div>
      </div>
    </div>
  );
}

/* ========================= Screen 3 — Negotiate =========================== */
function Screen3() {
  const { t } = useTranslation();
  const nodes = [
    {
      who: t("onboarding.pre.s3.nodes.buyer.who"),
      bodyKey: "onboarding.pre.s3.nodes.buyer.text",
      bg: "#3478d4",
      Icon: ShoppingCart,
    },
    {
      who: t("onboarding.pre.s3.nodes.mundus.who"),
      bodyKey: "onboarding.pre.s3.nodes.mundus.text",
      bg: "#B64769",
      Icon: ArrowLeftRight,
    },
    {
      who: t("onboarding.pre.s3.nodes.supplier.who"),
      bodyKey: "onboarding.pre.s3.nodes.supplier.text",
      bg: "#42424A",
      Icon: UtensilsCrossed,
    },
  ];
  return (
    <ScreenShell
      style={{
        background:
          "linear-gradient(180deg, #fdf3f4 0%, #ffffff 38%, #ffffff 100%)",
      }}
    >
      <header className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B64769]">
          {t("onboarding.pre.s3.kicker")}
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-[#0A0A0A]"
          style={{ letterSpacing: "-0.4px" }}
        >
          <Trans i18nKey="onboarding.pre.s3.title" components={{ br: <br /> }} />
        </h1>
      </header>

      <div className="relative">
        {/* Spine */}
        <div
          className="absolute left-[22px] top-[22px] w-[3px] rounded-full bg-[#e6e6ea]"
          style={{ bottom: 22 }}
        />
        <div className="flex flex-col gap-4">
          {nodes.map(({ who, bodyKey, bg, Icon }, i) => (
            <div key={i} className="flex items-stretch gap-3">
              <div
                className="relative z-10 flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background: bg,
                  boxShadow: "0 12px 22px -10px rgba(0,0,0,0.32)",
                }}
              >
                <Icon size={20} strokeWidth={2} />
              </div>
              <div
                className="flex-1 rounded-[18px] bg-white px-4 py-3"
                style={{
                  border: "1px solid #ececef",
                  boxShadow: "0 14px 30px -22px rgba(0,0,0,0.16)",
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#42424A]">
                  {who}
                </div>
                <p className="mt-1 text-[13px] leading-[1.45] text-[#42424A]">
                  <Trans i18nKey={bodyKey} components={{ b: <b /> }} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 self-start">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3f4] px-3 py-1.5 text-[11px] font-medium text-[#B64769]">
          <Sparkles size={12} strokeWidth={2.2} />
          {t("onboarding.pre.s3.badge")}
        </span>
      </div>
    </ScreenShell>
  );
}

/* ======================= Screen 4 — Choose role =========================== */
function Screen4({
  role,
  setRole,
}: {
  role: Role;
  setRole: (r: Role) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScreenShell
      style={{
        background: "linear-gradient(180deg, #1c0d13 0%, #2a131c 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px]"
        style={{
          background:
            "radial-gradient(420px 220px at 50% 0%, rgba(182,71,105,0.35) 0%, rgba(182,71,105,0) 70%)",
        }}
      />

      <header className="relative mb-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#efb2bd]">
          {t("onboarding.pre.s4.kicker")}
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-white"
          style={{ letterSpacing: "-0.4px" }}
        >
          <Trans i18nKey="onboarding.pre.s4.title" components={{ br: <br /> }} />
        </h1>
      </header>

      <div className="relative flex flex-col gap-3">
        <RoleCard
          active={role === "buyer"}
          onClick={() => setRole("buyer")}
          title={t("onboarding.pre.s4.buyer.title")}
          body={t("onboarding.pre.s4.buyer.sub")}
          tileBg="linear-gradient(135deg,#B64769,#752642)"
          Icon={ShoppingCart}
        />
        <RoleCard
          active={role === "supplier"}
          onClick={() => setRole("supplier")}
          title={t("onboarding.pre.s4.supplier.title")}
          body={t("onboarding.pre.s4.supplier.sub")}
          tileBg="rgba(255,255,255,0.10)"
          Icon={UtensilsCrossed}
        />
      </div>
    </ScreenShell>
  );
}

function RoleCard({
  active,
  onClick,
  title,
  body,
  tileBg,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
  tileBg: string;
  Icon: typeof ShoppingCart;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[24px] p-4 text-left transition-colors active:scale-[0.99]"
      style={{
        background: active ? "rgba(182,71,105,0.16)" : "rgba(255,255,255,0.06)",
        border: active
          ? "1.5px solid #e5879a"
          : "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[14px] text-white"
        style={{ background: tileBg }}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold leading-tight text-white">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-[1.45] text-white/65">{body}</p>
      </div>
      <div
        className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: active ? "#B64769" : "transparent",
          border: active ? "1.5px solid #B64769" : "1.5px solid rgba(255,255,255,0.25)",
        }}
      >
        {active && <Check size={15} strokeWidth={3} className="text-white" />}
      </div>
    </button>
  );
}