import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserSide } from "@/hooks/useCurrentUserSide";
import { TimelineMessageCard, type TimelineMessage } from "./TimelineMessageCard";

type Props = {
  negotiationId: string;
  buyerLabel: string;
  supplierLabel: string;
};

/**
 * Renders the chronological list of "Message via Mundus" exchanges for an
 * order/sale, scoped to a single negotiation. Subscribes to realtime inserts
 * so newly-sent messages appear without a manual refresh.
 */
export function DealTimeline({ negotiationId, buyerLabel, supplierLabel }: Props) {
  const { t } = useTranslation();
  const { side } = useCurrentUserSide(negotiationId);
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!negotiationId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("negotiation_messages")
        .select(
          "id, created_at, sender_user_id, sender_side, message_type, content, structured_data, emailed, emailed_at",
        )
        .eq("negotiation_id", negotiationId)
        .eq("message_type", "via_mundus")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data ?? []) as unknown as TimelineMessage[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [negotiationId, tick]);

  useEffect(() => {
    if (!negotiationId) return;
    const channel = supabase
      .channel(`deal-timeline-${negotiationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negotiation_messages",
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        () => setTick((n) => n + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [negotiationId]);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4">
      <header className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-gray-600" />
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {t("messageViaMundus.timeline.tabMessages")}
        </h2>
      </header>

      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            {t("messageViaMundus.timeline.loading")}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <MessageSquare size={28} />
            <p className="text-sm text-center max-w-sm">
              {t("messageViaMundus.timeline.emptyDeal")}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const senderLabel =
              m.sender_side === "buyer"
                ? buyerLabel
                : m.sender_side === "supplier"
                  ? supplierLabel
                  : "Mundus Trade";
            return (
              <TimelineMessageCard
                key={m.id}
                message={m}
                currentUserSide={side}
                senderLabel={senderLabel}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

export default DealTimeline;