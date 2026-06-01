import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicLayout from "@/layouts/PublicLayout";
import PublicOfferCard from "@/components/public/PublicOfferCard";
import MaxChatWidget from "@/components/public/MaxChatWidget";
import { usePublicOffers } from "@/hooks/usePublicOffers";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { offers, loading } = usePublicOffers();
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
          {t("public.home.heroTitle", "Live protein offers from verified suppliers")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          {t("public.home.heroSubtitle", "Browse real prices, cuts, origins and destinations. Reveal suppliers in one click — a Mundus rep will be in touch.")}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            {t("public.home.sectionTitle", "Active offers")}
          </h2>
          {!user && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {t("public.home.anonymousLabel", "Supplier names hidden — reveal to see")}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">{t("public.home.loading", "Loading offers…")}</div>
        ) : offers.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500">{t("public.home.empty", "No active offers right now. Check back soon.")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <PublicOfferCard
                key={o.id}
                offer={o}
                isAuthenticated={Boolean(user)}
                onReveal={() => setChatOpen(true)}
                onOpen={() => navigate(`/buyer/offers/${o.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <MaxChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </PublicLayout>
  );
}