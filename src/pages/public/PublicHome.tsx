import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Utensils } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import PublicOfferCard from "@/components/public/PublicOfferCard";
import PublicOfferModal from "@/components/public/PublicOfferModal";
import MaxChatWidget from "@/components/public/MaxChatWidget";
import { usePublicOffers, type PublicOffer } from "@/hooks/usePublicOffers";
import {
  OffersFilterBar,
  DEFAULT_OFFERS_FILTER,
  type OffersFilterState,
} from "@/components/marketplace/OffersFilterBar";
import heroAsset from "@/assets/hero-banner-bg.png.asset.json";
import { BlurFade } from "@/components/ui/blur-fade";

const PROTEIN_CODES = ["beef", "pork", "poultry", "lamb"] as const;
type ProteinCode = typeof PROTEIN_CODES[number];
const PROTEIN_EMOJI: Record<ProteinCode, string> = {
  beef: "🥩", pork: "🐖", poultry: "🐓", lamb: "🐑",
};

const HERO_PHRASES: { emoji: string; text: string }[] = [
  { emoji: "☕", text: "Grab a coffee from the corner cafe." },
  { emoji: "📱", text: "Load up your Mundus app." },
  { emoji: "🚢", text: "Order new containers online." },
  { emoji: "🏭", text: "Have it produced and delivered." },
  { emoji: "📢", text: "Suppliers post new offers." },
  { emoji: "🛒", text: "Buyers create new demands." },
  { emoji: "🔗", text: "All from a single source of truth." },
  { emoji: "🤝", text: "Directly with each other." },
];

function HeroPhraseList() {
  const loop = [...HERO_PHRASES, ...HERO_PHRASES];
  return (
    <div
      aria-hidden
      className="relative h-full w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
      }}
    >
      <div className="absolute right-0 top-0 flex flex-col gap-2 pr-1 text-right hero-marquee">
        {loop.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center justify-end gap-2 whitespace-nowrap text-sm font-medium text-white/90 sm:text-base"
          >
            <span>{p.text}</span>
            <span aria-hidden className="text-base">{p.emoji}</span>
          </div>
        ))}
      </div>
      <style>{`
        .hero-marquee { animation: heroMarquee 22s linear infinite; }
        @keyframes heroMarquee {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-marquee { animation: none; }
        }
      `}</style>
    </div>
  );
}

function offerProteinCodes(o: PublicOffer): Set<string> {
  const out = new Set<string>();
  for (const it of o.items) {
    const c = (it.category_code || "").trim().toLowerCase();
    if (c) out.add(c);
  }
  return out;
}

export default function PublicHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { offers, loading } = usePublicOffers();
  const [chatOpen, setChatOpen] = useState(false);
  const [detailOffer, setDetailOffer] = useState<PublicOffer | null>(null);
  const offersRef = useRef<HTMLDivElement>(null);

  const [selectedProteins, setSelectedProteins] = useState<ProteinCode[]>([]);
  const [filter, setFilter] = useState<OffersFilterState>(DEFAULT_OFFERS_FILTER);

  const filterOptions = useMemo(() => {
    const origins = new Set<string>();
    const markets = new Set<string>();
    const incoterms = new Set<string>();
    offers.forEach((o) => {
      if (o.origin_country) origins.add(o.origin_country);
      o.markets.forEach((m) => m.country && markets.add(m.country));
      (o.incoterms || []).forEach((i) => i && incoterms.add(i));
    });
    return {
      origins: Array.from(origins).sort(),
      markets: Array.from(markets).sort(),
      incoterms: Array.from(incoterms).sort(),
    };
  }, [offers]);

  const proteinAgg = useMemo(() => {
    const counts: Record<ProteinCode, number> = { beef: 0, pork: 0, poultry: 0, lamb: 0 };
    for (const o of offers) {
      const codes = offerProteinCodes(o);
      for (const k of PROTEIN_CODES) if (codes.has(k)) counts[k] += 1;
    }
    return { counts };
  }, [offers]);

  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return offers.filter((o) => {
      if (selectedProteins.length > 0) {
        const codes = offerProteinCodes(o);
        if (!selectedProteins.some((p) => codes.has(p))) return false;
      }
      if (filter.temp !== "all" && !o.items.some((it) => it.condition === filter.temp)) return false;
      if (filter.origins.length && (!o.origin_country || !filter.origins.includes(o.origin_country))) return false;
      if (filter.markets.length && !o.markets.some((m) => m.country && filter.markets.includes(m.country))) return false;
      if (filter.incoterms.length && !(o.incoterms || []).some((i) => filter.incoterms.includes(i))) return false;
      if (filter.halal !== "any") {
        const want = filter.halal === "yes";
        if (Boolean(o.is_halal) !== want) return false;
      }
      if (filter.kosher !== "any") {
        const want = filter.kosher === "yes";
        if (Boolean(o.is_kosher) !== want) return false;
      }
      if (q) {
        const hay = [
          o.origin_country || "",
          o.origin_port || "",
          ...o.markets.map((m) => m.country || ""),
          ...o.items.map((it) => `${it.product_name || ""} ${it.category_name || ""} ${it.category_code || ""}`),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [offers, selectedProteins, filter]);

  const totalMT =
    filtered.reduce(
      (s, o) => s + o.items.reduce((ss, it) => ss + Number(it.amount ?? 0), 0),
      0,
    ) / 1000;

  const heroStatOffers = offers.length;
  const heroStatOrigins = filterOptions.origins.length;

  const scrollToOffers = () =>
    offersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <PublicLayout>
      {/* Hero band */}
      <section className="relative overflow-hidden bg-[#8B2E4F] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(90deg, #8B2E4F 0%, #8B2E4F 35%, rgba(139,46,79,0.78) 55%, rgba(139,46,79,0.35) 100%), url(${heroAsset.url})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-[1.4rem] sm:py-8 md:grid-cols-[1fr_minmax(220px,300px)] md:items-stretch">
          <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider backdrop-blur">
            <Utensils size={10} />
            {t("public.home.heroBadge", "B2B MEAT MARKETPLACE")}
          </span>
          <BlurFade delay={0.15} duration={0.6} yOffset={12} blur="10px">
            <h1 className="mt-2 max-w-3xl text-xl font-bold leading-tight sm:text-2xl">
              {t("public.home.heroTitleLine1", "Excellence in every cut,")}
              <br />
              {t("public.home.heroTitleLine2", "value in every purchase.")}
            </h1>
          </BlurFade>
          <BlurFade delay={0.45} duration={0.6} yOffset={10} blur="8px">
            <p className="mt-1.5 max-w-2xl text-[11px] text-white/85 sm:text-xs">
              {t(
                "public.home.heroSubtitle",
                "Browse live container offers from vetted suppliers across the globe. Negotiate faster, in fewer rounds, with full price and incoterm control.",
              )}
            </p>
          </BlurFade>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate("/signup")}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#8B2E4F] shadow-sm transition hover:bg-white/95"
            >
              {t("public.home.createAccount", "Create free account")} →
            </button>
            <button
              onClick={scrollToOffers}
              className="rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {t("public.home.browseOffers", "Browse offers")}
            </button>
          </div>

          <div className="mt-4 grid max-w-2xl grid-cols-3 gap-2.5">
            <Stat
              n={`${heroStatOffers}+`}
              label={t("public.home.statOffers", "Live container offers")}
            />
            <Stat
              n={String(heroStatOrigins)}
              label={t("public.home.statOrigins", "Origin countries")}
            />
            <Stat n="3" label={t("public.home.statRounds", "Negotiation rounds, max")} />
          </div>
          </div>
          {/* Right column: scrolling phrases over the ship photo */}
          <div className="hidden md:block">
            <HeroPhraseList />
          </div>
        </div>
      </section>

      {/* Live offers */}
      <section ref={offersRef} className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold text-[#1A1A2E]">
          {t("public.home.liveOffersTitle", "Live offers")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t(
            "public.home.liveOffersSubtitle",
            "Real container loads, updated in real time. Sign up to reveal supplier identity and start a deal.",
          )}
        </p>

        {/* Filters */}
        <div className="bo-filterbar mt-6">
          <OffersFilterBar
            value={filter}
            onChange={setFilter}
            options={filterOptions}
            searchPlaceholder={t("public.home.searchPlaceholder", "Search products, ports...")}
            proteinNode={
              <div className="flex flex-wrap gap-2" role="group" aria-label="Protein filter">
                {PROTEIN_CODES.map((k) => {
                  const on = selectedProteins.includes(k);
                  const c = proteinAgg.counts[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelectedProteins((prev) =>
                          prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        on
                          ? "border-[#8B2E4F] bg-[#8B2E4F] text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span aria-hidden>{PROTEIN_EMOJI[k]}</span>
                      <span>{t(`public.home.protein_${k}`, k.charAt(0).toUpperCase() + k.slice(1))}</span>
                      <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}>{c}</span>
                    </button>
                  );
                })}
              </div>
            }
          />
        </div>

        <div className="result-bar mt-4 flex items-center justify-between">
          <span className="result-count text-sm text-gray-700">
            {loading ? (
              t("public.home.loading", "Loading offers…")
            ) : (
              <>
                {t("public.home.showing", "Showing")} <b>{filtered.length}</b>{" "}
                {filtered.length === 1
                  ? t("public.home.offerOne", "offer")
                  : t("public.home.offerOther", "offers")}{" "}
                · <b>{totalMT >= 100 ? Math.round(totalMT) : totalMT.toFixed(1)}</b> MT
              </>
            )}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {t("public.home.anonymousLabel", "Supplier names hidden — reveal to see")}
          </span>
        </div>

        <div className="mt-3 pb-16">
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-500">
              {t("public.home.loading", "Loading offers…")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-gray-500">
              {offers.length === 0
                ? t("public.home.empty", "No active offers right now. Check back soon.")
                : t("public.home.noMatch", "No offers match your filters.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((o) => (
                <PublicOfferCard
                  key={o.id}
                  offer={o}
                  onReveal={() => setChatOpen(true)}
                  onOpenDetails={() => setDetailOffer(o)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicOfferModal
        offer={detailOffer}
        onClose={() => setDetailOffer(null)}
        onReveal={() => {
          setDetailOffer(null);
          setChatOpen(true);
        }}
      />
      <MaxChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </PublicLayout>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
      <div className="text-xl font-bold">{n}</div>
      <div className="mt-0.5 text-[10px] text-white/80">{label}</div>
    </div>
  );
}
