import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShoppingCart,
  UtensilsCrossed,
  ArrowLeftRight,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import cubeRoll from "@/assets/onboarding/cube-roll.png.asset.json";
import chickenBreast from "@/assets/onboarding/chicken-breast.png.asset.json";

type Role = "buyer" | "supplier";

/* =========================================================================
   Mundus — Mobile Onboarding (4 screens). Mobile-only, safe-area aware.
   ========================================================================= */

const SWIPE_THRESHOLD = 60;

export default function Onboarding() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<Role>("buyer");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; t: number } | null>(null);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(3, i)));
  const next = () => (index === 3 ? finish() : goTo(index + 1));
  const prev = () => goTo(index - 1);
  const skip = () => goTo(3);

  const finish = () => navigate(`/signup?role=${role}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, role]);

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
      ? "Get started"
      : index === 3
        ? `Continue as ${role}`
        : "Next";

  const ctaOnDark = index === 0 || index === 3;

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#0d0709] font-[Inter,system-ui,sans-serif] text-[#0A0A0A]"
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
          Skip
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
  return (
    <ScreenShell
      style={{
        background:
          "linear-gradient(165deg, #6C0B28 0%, #8a2342 52%, #A74764 100%)",
      }}
    >
      {/* Hero */}
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
            src={cubeRoll.url}
            alt="Cube roll"
            className="w-[230px] -rotate-6"
            style={{ filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.45))" }}
          />
        </motion.div>
      </div>

      {/* Copy */}
      <div className="mb-4">
        <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] text-white/85">
          <span className="h-[1px] w-7 bg-white/55" />
          MUNDUS TRADE
        </div>
        <h1
          className="text-[34px] font-semibold leading-[1.04] text-white"
          style={{ letterSpacing: "-0.5px" }}
        >
          Excellence
          <br />
          in every cut.
        </h1>
        <p className="mt-4 max-w-[300px] text-[14px] leading-[1.5] text-white/82">
          The global B2B meat marketplace — vetted suppliers, real container loads,
          fairer deals.
        </p>
      </div>
    </ScreenShell>
  );
}

/* ====================== Screen 2 — Browse offers ========================== */
function Screen2() {
  return (
    <ScreenShell style={{ background: "#eeeef0" }}>
      <header className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B64769]">
          Live Marketplace
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-[#0A0A0A]"
          style={{ letterSpacing: "-0.4px" }}
        >
          Browse real offers,
          <br />
          updated live.
        </h1>
        <p className="mt-3 max-w-[300px] text-[13.5px] leading-[1.5] text-[#5e5f6b]">
          Filter by species, origin, incoterm and certification — volumes and ports up
          front.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <OfferCard
          feature
          dotColor="#c0392b"
          species="Beef · Chilled"
          title="Grass-fed Cube Roll"
          flag="🇧🇷"
          origin="Brazil"
          mt="26 MT"
          incoterm="CIF Jebel Ali"
          thumb={cubeRoll.url}
          thumbBg="#fdf3f4"
        />
        <OfferCard
          dotColor="#e08e3c"
          species="Poultry · Frozen"
          title="Skin-on Chicken Breast"
          flag="🇺🇸"
          origin="USA"
          mt="27 MT"
          incoterm="FOB Houston"
          thumb={chickenBreast.url}
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
            Active
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
  const nodes = [
    {
      who: "You bid",
      body: (
        <>
          Place a price on any cut — or <b>bulk-bid</b> a whole offer.
        </>
      ),
      bg: "#3478d4",
      Icon: ShoppingCart,
    },
    {
      who: "Mundus matches",
      body: (
        <>
          We relay offer and counter in real time, <b>item by item</b>.
        </>
      ),
      bg: "#B64769",
      Icon: ArrowLeftRight,
    },
    {
      who: "Supplier closes",
      body: (
        <>
          Accept, counter or hold — <b>up to 3 rounds</b>, then it's a deal.
        </>
      ),
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
          Smart Negotiation
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-[#0A0A0A]"
          style={{ letterSpacing: "-0.4px" }}
        >
          Close in three rounds,
          <br />
          not three weeks.
        </h1>
      </header>

      <div className="relative">
        {/* Spine */}
        <div
          className="absolute left-[22px] top-[22px] w-[3px] rounded-full bg-[#e6e6ea]"
          style={{ bottom: 22 }}
        />
        <div className="flex flex-col gap-4">
          {nodes.map(({ who, body, bg, Icon }, i) => (
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
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 self-start">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3f4] px-3 py-1.5 text-[11px] font-medium text-[#B64769]">
          <Sparkles size={12} strokeWidth={2.2} />
          3 rounds · 24h expiry · item-level lock
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
  return (
    <ScreenShell
      style={{
        background: "linear-gradient(180deg, #1c0d13 0%, #2a131c 100%)",
      }}
    >
      {/* Top radial wine glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px]"
        style={{
          background:
            "radial-gradient(420px 220px at 50% 0%, rgba(182,71,105,0.35) 0%, rgba(182,71,105,0) 70%)",
        }}
      />

      <header className="relative mb-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#efb2bd]">
          Get Started
        </div>
        <h1
          className="mt-2 text-[28px] font-semibold leading-[1.08] text-white"
          style={{ letterSpacing: "-0.4px" }}
        >
          How will you
          <br />
          use Mundus?
        </h1>
      </header>

      <div className="relative flex flex-col gap-3">
        <RoleCard
          active={role === "buyer"}
          onClick={() => setRole("buyer")}
          title="I'm a buyer"
          body="Source container loads from vetted suppliers worldwide."
          tileBg="linear-gradient(135deg,#B64769,#752642)"
          Icon={ShoppingCart}
        />
        <RoleCard
          active={role === "supplier"}
          onClick={() => setRole("supplier")}
          title="I'm a supplier"
          body="List offers and reach qualified buyers in new markets."
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