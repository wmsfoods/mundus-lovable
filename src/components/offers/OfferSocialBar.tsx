import { Heart, Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { SocialCounts } from "@/hooks/useOfferSocial";

type Props = {
  offerId: string;
  counts: SocialCounts;
  readOnly?: boolean;
  onToggleLike?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onShare?: (id: string, channel?: string) => void;
  shareUrl?: string;
  shareTitle?: string;
  align?: "left" | "right";
};

export function OfferSocialBar({
  offerId,
  counts,
  readOnly = false,
  onToggleLike,
  onToggleFavorite,
  onShare,
  shareUrl,
  shareTitle,
  align = "left",
}: Props) {
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleShare = async (e: React.MouseEvent) => {
    stop(e);
    const url = shareUrl || window.location.href;
    const title = shareTitle || "Mundus Offer";
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      onShare?.(offerId, (navigator as any).share ? "native" : "clipboard");
    } catch {
      /* user cancelled */
    }
  };

  const wine = "hsl(335, 55%, 45%)";

  return (
    <div
      className="osb"
      onClick={stop}
      role="group"
      aria-label="Offer social actions"
      style={{
        display: "inline-flex",
        gap: 14,
        alignItems: "center",
        marginLeft: align === "right" ? "auto" : 0,
      }}
    >
      <button
        type="button"
        disabled={readOnly}
        onClick={(e) => {
          stop(e);
          if (!readOnly) onToggleLike?.(offerId);
        }}
        aria-pressed={counts.isLiked}
        title={counts.isLiked ? "Unlike" : "Like"}
        style={iconBtnStyle(readOnly)}
      >
        <Heart
          size={16}
          strokeWidth={1.8}
          fill={counts.isLiked ? wine : "none"}
          color={counts.isLiked ? wine : "#6b7280"}
        />
        <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>
          {fmt(counts.likes)}
        </span>
      </button>

      <button
        type="button"
        disabled={readOnly}
        onClick={(e) => {
          stop(e);
          if (!readOnly) onToggleFavorite?.(offerId);
        }}
        aria-pressed={counts.isFavorited}
        title={counts.isFavorited ? "Remove favorite" : "Add to favorites"}
        style={iconBtnStyle(readOnly)}
      >
        <Bookmark
          size={16}
          strokeWidth={1.8}
          fill={counts.isFavorited ? wine : "none"}
          color={counts.isFavorited ? wine : "#6b7280"}
        />
        <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>
          {fmt(counts.favorites)}
        </span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        title="Share"
        style={iconBtnStyle(false)}
      >
        <Share2 size={16} strokeWidth={1.8} color="#6b7280" />
        <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>
          {fmt(counts.shares)}
        </span>
      </button>
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    padding: "2px 4px",
    cursor: disabled ? "default" : "pointer",
    borderRadius: 6,
    color: "#6b7280",
  };
}

function fmt(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default OfferSocialBar;