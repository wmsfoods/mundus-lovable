import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Utensils } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import PublicOfferCard from "@/components/public/PublicOfferCard";
import MaxChatWidget from "@/components/public/MaxChatWidget";
import { usePublicOffers, type PublicOffer } from "@/hooks/usePublicOffers";
import {
  ProteinFilter,
  categoryToProtein,
  type ProteinKey,
} from "@/components/marketplace/ProteinFilter";
import {
  OffersFilterBar,
  DEFAULT_OFFERS_FILTER,
  type OffersFilterState,
} from "@/components/marketplace/OffersFilterBar";
import heroAsset from "@/assets/hero-banner-bg.png.asset.json";

function offerProtein(o: PublicOffer): Exclude<ProteinKey, "all"> | null {
  for (const it of o.items) {
    const p = categoryToProtein(it.category_name) || categoryToProtein(it.category_code);
    if (p) return p;
  }
  return null;
}

export default function PublicHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { offers, loading } = usePublicOffers();
  const [chatOpen, setChatOpen] = useState(false);
  const offersRef = useRef<HTMLDivElement>(null);

  const [protein, setProtein] = useState<ProteinKey>("all");
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
    const counts: Record<Exclude<ProteinKey, "all">, number> = {
      beef: 0, pork: 0, poultry: 0, ovine: 0,
    };
    for (const o of offers) {
      const p = offerProtein(o);
      if (p) counts[p] += 1;
    }
    const available = (Object.keys(counts) as Array<Exclude<ProteinKey, "all">>).filter(
      (k) => counts[k] > 0,
    );
    return { counts, available };
  }, [offers]);

  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return offers.filter((o) => {
      if (protein !== "all" && offerProtein(o) !== protein) return false;
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
  }, [offers, protein, filter]);

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
      <section className="relative overflow-hidden bg-[#5C1B30] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(90deg, #5C1B30 0%, #5C1B30 35%, rgba(92,27,48,0.85) 55%, rgba(92,27,48,0.4) 100%), url(${heroAsset.url})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wider backdrop-blur">
            <Utensils size={12} />
            {t("public.home.heroBadge", "B2B MEAT MARKETPLACE")}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {t("public.home.heroTitleLine1", "Excellence in every cut,")}
            <br />
            {t("public.home.heroTitleLine2", "value in every purchase.")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-white/85 sm:text-base">
            {t(
              "public.home.heroSubtitle",
              "Browse live container offers from vetted suppliers across the globe. Negotiate faster, in fewer rounds, with full price and incoterm control.",
            )}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/signup")}
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#7A2440] shadow-sm transition hover:bg-white/95"
            >
              {t("public.home.createAccount", "Create free account")} →
            </button>
            <button
              onClick={scrollToOffers}
              className="rounded-md border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {t("public.home.browseOffers", "Browse offers")}
            </button>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
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

        {/* Filters — matches buyer Offers */}
        <div className="bo-filterbar mt-6">
          <OffersFilterBar
            value={filter}
            onChange={setFilter}
            options={filterOptions}
            searchPlaceholder={t("public.home.searchPlaceholder", "Search products, ports...")}
            proteinNode={
              <ProteinFilter
                value={protein}
                onChange={setProtein}
                available={proteinAgg.available}
                counts={proteinAgg.counts}
              />
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
                <PublicOfferCard key={o.id} offer={o} onReveal={() => setChatOpen(true)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <MaxChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </PublicLayout>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur">
      <div className="text-2xl font-bold">{n}</div>
      <div className="mt-0.5 text-xs text-white/80">{label}</div>
    </div>
  );
}
