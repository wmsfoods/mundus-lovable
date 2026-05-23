import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OfferItem = { id: string; name: string; price: number; amount: number };

type NegotiationChatProps = {
  negotiationId: string;
  perspective: "buyer" | "supplier";
  offerItems: OfferItem[];
  enabled: boolean;
};

type Message = {
  id: string;
  negotiation_id: string;
  sender_user_id: string | null;
  sender_side: string | null;
  message_type: string | null;
  content: string | null;
  structured_data: any;
  proposal_status?: string | null;
  created_at: string;
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function NegotiationChat({
  negotiationId,
  perspective,
  enabled,
}: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useMemo(
    () => async () => {
      const { data } = await supabase
        .from("negotiation_messages")
        .select("*")
        .eq("negotiation_id", negotiationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    },
    [negotiationId]
  );

  useEffect(() => {
    if (!negotiationId || !enabled) return;
    fetchMessages();
    const i = setInterval(fetchMessages, 5000);
    return () => clearInterval(i);
  }, [negotiationId, enabled, fetchMessages]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      await supabase.from("negotiation_messages").insert({
        negotiation_id: negotiationId,
        sender_user_id: userId,
        sender_side: perspective,
        message_type: "text",
        content: text,
      });
      setInput("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  }

  if (!enabled) {
    return (
      <div className="neg-chat" style={{
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        marginTop: 16,
        overflow: "hidden",
        opacity: 0.75,
      }}>
        <div style={{
          padding: "12px 16px",
          background: "hsl(var(--muted))",
          borderBottom: "1px solid hsl(var(--border))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 600,
        }}>
          <span>💬 Chat</span>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            🔒 Available from Round 3
          </span>
        </div>
        <div style={{
          padding: "24px 16px",
          textAlign: "center",
          color: "hsl(var(--muted-foreground))",
          fontSize: 13,
        }}>
          Chat will be unlocked when the negotiation reaches Round 3.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      marginTop: 16,
      overflow: "hidden",
      background: "hsl(var(--card))",
    }}>
      <div style={{
        padding: "12px 16px",
        background: "hsl(var(--muted))",
        borderBottom: "1px solid hsl(var(--border))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 14,
        fontWeight: 600,
      }}>
        <span>💬 Negotiation Chat</span>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div
        ref={bodyRef}
        style={{
          height: 320,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            margin: "auto",
            color: "hsl(var(--muted-foreground))",
            fontSize: 13,
            textAlign: "center",
          }}>
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const side = m.sender_side ?? "system";
            const isSystem = m.message_type === "system" || side === "system";
            const isMine = side === perspective;
            const bg =
              isSystem ? "#f3f4f6"
              : side === "buyer" ? "#dbeafe"
              : "#fce7f3";
            const color =
              isSystem ? "#6b7280"
              : side === "buyer" ? "#1e3a8a"
              : "#831843";
            const align: "flex-start" | "flex-end" | "center" =
              isSystem ? "center" : isMine ? "flex-end" : "flex-start";
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: align, maxWidth: "100%" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 13,
                  background: bg,
                  color,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                  {isSystem ? "System" : side === "buyer" ? "Buyer" : "Supplier"} · {fmtTime(m.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid hsl(var(--border))",
        background: "hsl(var(--muted))",
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 13,
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            fontSize: 13,
            fontWeight: 600,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            opacity: input.trim() && !sending ? 1 : 0.5,
            border: "none",
          }}
        >
          {sending ? "..." : "Send →"}
        </button>
      </div>
    </div>
  );
}