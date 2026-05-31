import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

const KEYS = ["whatIs", "sealed", "timing", "oneBid", "award", "results"] as const;
const ICONS: Record<(typeof KEYS)[number], string> = {
  whatIs: "🔨", sealed: "🔒", timing: "⏱️", oneBid: "📝", award: "🏆", results: "📊",
};

export function AuctionInfoDialog() {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="auct-info-link">
          <Info size={14} /> {t("buyer.auctions.howItWorks.link")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-sm:!max-w-full max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!max-h-[100dvh]">
        <DialogHeader>
          <DialogTitle>{t("buyer.auctions.howItWorks.title")}</DialogTitle>
        </DialogHeader>
        <ul className="auct-info-list">
          {KEYS.map((k) => (
            <li key={k}>
              <span className="auct-info-emoji" aria-hidden>{ICONS[k]}</span>
              <div>
                <div className="auct-info-title">{t(`buyer.auctions.howItWorks.${k}.title`)}</div>
                <div className="auct-info-body">{t(`buyer.auctions.howItWorks.${k}.body`)}</div>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export default AuctionInfoDialog;