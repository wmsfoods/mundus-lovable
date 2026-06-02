import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Utensils } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import PublicOfferCard from "@/components/public/PublicOfferCard";
import MaxChatWidget from "@/components/public/MaxChatWidget";
import { usePublicOffers } from "@/hooks/usePublicOffers";

const PROTEIN_KEYWORDS: Record<string, string[]> = {
  beef: ["beef", "bovin", "carne", "vacuno"],
  pork: ["pork", "porc", "suino", "suíno", "cerdo"],
  poultry: ["chicken", "poultry", "frango", "aves", "pollo"],
  lamb: ["lamb", "mutton", "cordero", "ovino"],
  fish: ["fish", "seafood", "pescado", "peixe"],
};

function detectProtein(text: string): string | null {
  const t = text.toLowerCase();
  for (const [k, words] of Object.entries(PROTEIN_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return k;
  }
  return null;
}

export default function PublicHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { offers, loading } = usePublicOffers();
  const [chatOpen, setChatOpen] = useState(false);
  const offersRef = useRef<HTMLDivElement>(null);

  // filters
  const [protein, setProtein] = useState<string>("all");
  const [temp, setTemp] = useState<string>("all");
  const [origin, setOrigin] = useState<string>("all");
  const [market, setMarket] = useState<string>("all");
  const [search, setSearch] = useState("");

  const origins = useMemo(
    () => Array.from(new Set(offers.map((o) => o.origin_country).filter(Boolean) as string[])).sort(),
    [offers],
  );
  const markets = useMemo(
    () =>
      Array.from(
        new Set(
          offers.flatMap((o) => o.markets.map((m) => m.country).filter(Boolean) as string[]),
        ),
      ).sort(),
    [offers],
  );
  const proteinsAvailable = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) =>
      o.items.forEach((it) => {
        const p = detectProtein(`${it.category_name || ""} ${it.category_code || ""} ${it.product_name || ""}`);
        if (p) set.add(p);
      }),
    );
    return Array.from(set);
  }, [offers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((o) => {
      if (origin !== "all" && o.origin_country !== origin) return false;
      if (market !== "all" && !o.markets.some((m) => m.country === market)) return false;
      if (temp !== "all" && !o.items.some((it) => it.condition === temp)) return false;
      if (protein !== "all") {
        const ok = o.items.some((it) => {
          const p = detectProtein(`${it.category_name || ""} ${it.category_code || ""} ${it.product_name || ""}`);
          return p === protein;
        });
        if (!ok) return false;
      }
      if (q) {
        const hay = [
          o.origin_country || "",
          o.origin_port || "",
          ...o.markets.map((m) => m.country || ""),
          ...o.items.map((it) => `${it.product_name || ""} ${it.category_name || ""} ${it.category_code || ""}`),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [offers, protein, temp, origin, market, search]);

  const heroStatOffers = offers.length;
  const heroStatOrigins = origins.length;

  const scrollToOffers = () =>
    offersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <PublicLayout>
      {/* Hero band */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#5C1B30] via-[#7A2440] to-[#A33B5A] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-10 md:block"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.3) 0, transparent 35%)",
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

        {/* Filters */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label={t("public.home.filterProtein", "Protein")}
              value={protein}
              onChange={setProtein}
              options={[
                { v: "all", label: t("public.home.filterAll", "All") },
                ...proteinsAvailable.map((p) => ({
                  v: p,
                  label: t(`public.chat.leadType_${p}`, p[0].toUpperCase() + p.slice(1)),
                })),
              ]}
            />
            <FilterSelect
              label={t("public.home.filterTemp", "Temperature")}
              value={temp}
              onChange={setTemp}
              options={[
                { v: "all", label: t("public.home.filterAll", "All") },
                { v: "Frozen", label: "Frozen" },
                { v: "Chilled", label: "Chilled" },
                { v: "Fresh", label: "Fresh" },
              ]}
            />
            <FilterSelect
              label={t("public.home.filterOrigin", "Origin")}
              value={origin}
              onChange={setOrigin}
              options={[
                { v: "all", label: t("public.home.filterAll", "All") },
                ...origins.map((c) => ({ v: c, label: c })),
              ]}
            />
            <FilterSelect
              label={t("public.home.filterMarket", "Market")}
              value={market}
              onChange={setMarket}
              options={[
                { v: "all", label: t("public.home.filterAll", "All") },
                ...markets.map((c) => ({ v: c, label: c })),
              ]}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("public.home.searchPlaceholder", "Search products, ports…")}
              className="ml-auto min-w-[200px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#B64769] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="font-medium text-gray-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-[#1A1A2E] focus:border-[#B64769] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}