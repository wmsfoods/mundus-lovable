import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectPriceIntent, type DetectableItem, type DetectedPrice } from "@/lib/priceIntentDetector";

type OfferItem = { id: string; name: string; price: number; amount: number };

type NegotiationChatProps = {
  negotiationId: string;
  perspective: "buyer" | "supplier";
  offerItems: OfferItem[];
  enabled: boolean;
  rounds?: { id: string; round: number; created_at: string }[];
  agreedItems?: unknown;
  /** Whether buyers can edit per-item quantities. Defaults to false (locked). */
  allowQtyNegotiation?: boolean;
};

type ProposalItem = {
  offer_item_id?: string;
  name: string;
  quantity_kg: number;
  price_per_kg: number;
};
type ProposalData = { items?: ProposalItem[]; total_usd?: number; note?: string };

type Message = {
  id: string;
  negotiation_id: string;
  sender_user_id: string | null;
  sender_side: string | null;
  message_type: string | null;
  content: string | null;
  structured_data: ProposalData | null;
  proposal_status?: string | null;
  accepted_by_user_id?: string | null;
  superseded_at?: string | null;
  promoted_to_order_id?: string | null;
  created_at: string;
};

type FeedRow =
  | (Message & { _kind: "message" })
  | { _kind: "system"; id: string; created_at: string; text: string };

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function fmtUsd(n: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;
}

export function NegotiationChat({
  negotiationId,
  perspective,
  offerItems,
  enabled,
  rounds,
  agreedItems,
  allowQtyNegotiation = false,
}: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedPrice[]>([]);
  const [dismissedFor, setDismissedFor] = useState<string>("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState<ProposalItem[] | null>(null);
  const [confirmFor, setConfirmFor] = useState<Message | null>(null);
  // Mobile collapsible: panel collapsed by default below 720px.
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 720px)").matches : false,
  );
  const [open, setOpen] = useState<boolean>(() => !isMobile);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 720px)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setOpen(!e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id ?? null));
  }, []);

  const fetchMessages = useMemo(
    () => async () => {
      const { data } = await supabase
        .from("negotiation_messages")
        .select("*")
        .eq("negotiation_id", negotiationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    },
    [negotiationId],
  );

  // Initial fetch + realtime subscription (auto-update without refresh).
  useEffect(() => {
    if (!negotiationId || !enabled) return;
    fetchMessages();
    const channel = supabase
      .channel(`neg-chat-${negotiationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "negotiation_messages", filter: `negotiation_id=eq.${negotiationId}` },
        () => fetchMessages(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [negotiationId, enabled, fetchMessages]);

  // Resolve display names for every sender_user_id we've seen.
  useEffect(() => {
    const ids = Array.from(
      new Set(messages.map((m) => m.sender_user_id).filter((v): v is string => !!v && !(v in userNames))),
    );
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("users").select("id, name").in("id", ids);
      if (cancelled || !data) return;
      setUserNames((prev) => {
        const next = { ...prev };
        for (const u of data) next[u.id as string] = (u.name as string) ?? "";
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Build the rendered feed: real messages + synthesized system events (rounds, agreed items).
  const feed: FeedRow[] = useMemo(() => {
    const rows: FeedRow[] = messages.map((m) => ({ ...m, _kind: "message" as const }));
    // Round events from round_proposals.
    if (rounds && rounds.length > 0) {
      // Display-round = ceil(raw / 2). Emit "Round N started" the first time each display round is reached.
      const seen = new Set<number>();
      for (const r of rounds) {
        const display = Math.ceil(r.round / 2);
        if (seen.has(display) || display < 2) continue;
        seen.add(display);
        rows.push({
          _kind: "system",
          id: `sys-round-${display}-${r.id}`,
          created_at: r.created_at,
          text: display >= 3 ? `Round ${display} started — chat unlocked` : `Round ${display} started`,
        });
      }
    }
    // Item-agreed events.
    if (Array.isArray(agreedItems)) {
      for (const it of agreedItems as Array<Record<string, unknown>>) {
        const name = (it.name as string) ?? (it.item_name as string) ?? "Item";
        const at = (it.agreed_at as string) ?? new Date().toISOString();
        rows.push({
          _kind: "system",
          id: `sys-agreed-${name}-${at}`,
          created_at: at,
          text: `✓ ${name} agreed`,
        });
      }
    }
    rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return rows;
  }, [messages, rounds, agreedItems]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [feed.length, open]);

  // Detect embedded price proposals as the user types.
  const detectables: DetectableItem[] = useMemo(
    () => (offerItems ?? []).map((oi) => ({ itemId: oi.id, itemName: oi.name, askingPrice: Number(oi.price) || 0 })),
    [offerItems],
  );
  useEffect(() => {
    if (!input.trim() || input.trim() === dismissedFor) {
      setDetected([]);
      return;
    }
    const found = detectPriceIntent(input, detectables);
    setDetected(found);
  }, [input, detectables, dismissedFor]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (!userId) return;
      await supabase.from("negotiation_messages").insert({
        negotiation_id: negotiationId,
        sender_user_id: userId,
        sender_side: perspective,
        message_type: "text",
        content: text,
      });
      setInput("");
      setDetected([]);
      setDismissedFor("");
    } finally {
      setSending(false);
    }
  }

  async function sendAsProposal() {
    if (sending || detected.length === 0) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (!userId) return;
      const items = detected.map((d) => {
        const oi = offerItems.find((x) => x.id === d.itemId);
        return {
          offer_item_id: oi?.id,
          name: d.itemName,
          quantity_kg: Number(oi?.amount ?? 0),
          price_per_kg: d.price,
        };
      });
      const total = items.reduce((s, it) => s + it.price_per_kg * it.quantity_kg, 0);
      await supabase.from("negotiation_messages").insert({
        negotiation_id: negotiationId,
        sender_user_id: userId,
        sender_side: perspective,
        message_type: "proposal",
        content: input.trim(),
        structured_data: { items, total_usd: total, note: input.trim() } as never,
        proposal_status: "pending",
      });
      setInput("");
      setDetected([]);
      setDismissedFor("");
    } finally {
      setSending(false);
    }
  }

  async function sendProposalFromComposer(items: ProposalItem[], note: string) {
    if (sending) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (!userId) return;
      const total = items.reduce((s, it) => s + Number(it.price_per_kg) * Number(it.quantity_kg), 0);
      await supabase.from("negotiation_messages").insert({
        negotiation_id: negotiationId,
        sender_user_id: userId,
        sender_side: perspective,
        message_type: "proposal",
        content: note || "Formal proposal",
        structured_data: { items, total_usd: total, note } as never,
        proposal_status: "pending",
      });
      setComposerOpen(false);
      setComposerSeed(null);
    } finally {
      setSending(false);
    }
  }

  async function respondToProposal(msg: Message, action: "accept" | "decline" | "counter" | "cancel") {
    if (actingOn) return;
    setActingOn(msg.id);
    try {
      if (action === "accept") {
        const { error } = await supabase.rpc("accept_chat_proposal", { p_message_id: msg.id });
        if (error) { alert(error.message); return; }
      } else if (action === "cancel") {
        const { error } = await supabase.rpc("cancel_chat_proposal", { p_message_id: msg.id });
        if (error) { alert(error.message); return; }
      } else if (action === "decline") {
        await supabase
          .from("negotiation_messages")
          .update({ proposal_status: "declined" })
          .eq("id", msg.id);
      } else if (action === "counter") {
        // Pre-fill composer with the proposal's items, then open it.
        const seed = (msg.structured_data?.items ?? []).map((it) => ({
          offer_item_id: it.offer_item_id,
          name: it.name,
          quantity_kg: Number(it.quantity_kg) || 0,
          price_per_kg: Number(it.price_per_kg) || 0,
        }));
        setComposerSeed(seed);
        setComposerOpen(true);
      }
    } finally {
      setActingOn(null);
    }
  }

  async function confirmSale(msg: Message) {
    if (actingOn) return;
    setActingOn(msg.id);
    try {
      const { error } = await supabase.rpc("confirm_chat_proposal", { p_message_id: msg.id });
      if (error) { alert(error.message); return; }
      setConfirmFor(null);
    } finally {
      setActingOn(null);
    }
  }

  function displayName(m: Message): string {
    if (m.sender_user_id && userNames[m.sender_user_id]) return userNames[m.sender_user_id];
    return m.sender_side === "buyer" ? "Buyer" : m.sender_side === "supplier" ? "Supplier" : "System";
  }

  /* ─────────── Locked panel ─────────── */
  if (!enabled) {
    return (
      <div className="neg-chat-wrap" style={wrapStyle(isMobile)}>
        <Header
          isMobile={isMobile}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          title="💬 Chat"
          subtitle="🔒 Available from Round 3"
          locked
        />
        {(open || !isMobile) && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Chat will be unlocked when the negotiation reaches Round 3.
          </div>
        )}
      </div>
    );
  }

  /* ─────────── Active panel ─────────── */
  return (
    <>
      {isMobile && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          style={{
            position: "fixed",
            right: 16,
            bottom: "calc(16px + env(safe-area-inset-bottom))",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            border: "none",
            boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            fontSize: 22,
            cursor: "pointer",
            zIndex: 60,
          }}
        >
          💬
          {messages.length > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4, background: "#ef4444", color: "white",
              borderRadius: 10, fontSize: 10, padding: "1px 5px", fontWeight: 700,
            }}>{messages.length}</span>
          )}
        </button>
      )}
      <div
        className="neg-chat-wrap"
        style={isMobile && open ? mobileSheetStyle : wrapStyle(false)}
      >
        <Header
          isMobile={isMobile}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          title="💬 Negotiation Chat"
          subtitle={`${messages.length} ${messages.length === 1 ? "message" : "messages"}`}
        />

        {(open || !isMobile) && (
          <>
            <div
              ref={bodyRef}
              style={{
                flex: isMobile ? 1 : undefined,
                height: isMobile ? undefined : 320,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "hsl(var(--background))",
              }}
            >
              {feed.length === 0 ? (
                <div style={{ margin: "auto", color: "hsl(var(--muted-foreground))", fontSize: 13, textAlign: "center" }}>
                  No messages yet. Start the conversation.
                </div>
              ) : (
                feed.map((row) => {
                  if (row._kind === "system") {
                    return (
                      <div key={row.id} style={{ alignSelf: "center", textAlign: "center", maxWidth: "85%" }}>
                        <span style={{
                          display: "inline-block",
                          background: "hsl(var(--muted))",
                          color: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontWeight: 500,
                        }}>
                          {row.text} · {fmtTime(row.created_at)}
                        </span>
                      </div>
                    );
                  }
                  const m = row;
                  const side = m.sender_side ?? "system";
                  const isSystem = m.message_type === "system" || side === "mundus";
                  const isProposal = m.message_type === "proposal";
                  const isMine = side === perspective;

                  if (isSystem) {
                    return (
                      <div key={m.id} style={{ alignSelf: "center", textAlign: "center", maxWidth: "85%" }}>
                        <span style={{
                          display: "inline-block",
                          background: "hsl(var(--muted))",
                          color: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 999,
                        }}>{m.content} · {fmtTime(m.created_at)}</span>
                      </div>
                    );
                  }

                  if (isProposal) {
                    return (
                      <ProposalCard
                        key={m.id}
                        message={m}
                        isMine={isMine}
                        senderName={displayName(m)}
                        busy={actingOn === m.id}
                        currentUserId={currentUserId}
                        onAct={(a) => respondToProposal(m, a)}
                        onConfirm={() => setConfirmFor(m)}
                      />
                    );
                  }

                  const bg = side === "buyer" ? "#dbeafe" : "#fce7f3";
                  const color = side === "buyer" ? "#1e3a8a" : "#831843";
                  const align: "flex-start" | "flex-end" = isMine ? "flex-end" : "flex-start";
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: align, maxWidth: "100%" }}>
                      <div style={{
                        maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13,
                        background: bg, color, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                        {displayName(m)} · {fmtTime(m.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{
              display: "flex", gap: 8, padding: "12px 16px",
              borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
              paddingBottom: isMobile ? "calc(12px + env(safe-area-inset-bottom))" : 12,
            }}>
            </div>
            {detected.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid hsl(var(--border))",
                background: "#fef9c3",
                color: "#713f12",
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  💡 We detected {detected.length === 1 ? "a price" : `${detected.length} prices`} in your message
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                  {detected.map((d) => (
                    <div key={d.itemId} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{d.itemName}</span>
                      <span style={{ fontWeight: 600 }}>
                        {fmtUsd(d.price)}/kg
                        {d.askingPrice > 0 && (
                          <span style={{ marginLeft: 6, color: "#92400e", fontWeight: 400 }}>
                            (asking {fmtUsd(d.askingPrice)})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={sendAsProposal}
                    disabled={sending}
                    style={{ flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 700, background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
                  >
                    Send as formal proposal
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedFor(input.trim())}
                    style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#713f12", border: "1px solid #d6b86a", borderRadius: 8, cursor: "pointer" }}
                  >
                    Send as text only
                  </button>
                </div>
              </div>
            )}
            <div style={{
              display: "flex", gap: 8, padding: "12px 16px",
              borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
              paddingBottom: isMobile ? "calc(12px + env(safe-area-inset-bottom))" : 12,
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type your message..."
                style={{
                  flex: 1, padding: "10px 12px", border: "1px solid hsl(var(--border))",
                  borderRadius: 8, fontSize: 14, background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || sending}
                style={{
                  padding: "10px 16px", borderRadius: 8,
                  background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                  fontSize: 13, fontWeight: 600, border: "none",
                  cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                  opacity: input.trim() && !sending ? 1 : 0.5,
                }}
              >
                {sending ? "..." : "Send →"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────── Sub-components ─────────── */
function Header({
  isMobile, open, onToggle, title, subtitle, locked,
}: {
  isMobile: boolean; open: boolean; onToggle: () => void;
  title: string; subtitle: string; locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={isMobile ? onToggle : undefined}
      style={{
        all: "unset",
        display: "flex",
        padding: "12px 16px",
        background: "hsl(var(--muted))",
        borderBottom: open || !isMobile ? "1px solid hsl(var(--border))" : "none",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 14,
        fontWeight: 600,
        cursor: isMobile ? "pointer" : "default",
        boxSizing: "border-box",
        width: "100%",
      }}
      aria-expanded={open}
    >
      <span>{title}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
        {subtitle}
        {isMobile && (
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>{open ? "▾" : "▴"}</span>
        )}
        {!isMobile && locked && null}
      </span>
    </button>
  );
}

function ProposalCard({
  message, isMine, senderName, busy, currentUserId, onAct, onConfirm,
}: {
  message: Message;
  isMine: boolean;
  senderName: string;
  busy: boolean;
  currentUserId: string | null;
  onAct: (action: "accept" | "decline" | "counter" | "cancel") => void;
  onConfirm: () => void;
}) {
  const data = message.structured_data ?? {};
  const items = data.items ?? [];
  const total = data.total_usd ?? items.reduce((s, it) => s + Number(it.price_per_kg) * Number(it.quantity_kg), 0);
  const status = message.proposal_status ?? "pending";
  const decided = status !== "pending" && status !== "accepted_pending_confirmation";
  const pendingConfirm = status === "accepted_pending_confirmation";
  const iAmProposer = !!currentUserId && message.sender_user_id === currentUserId;

  const statusPill =
    status === "accepted" ? { bg: "#dcfce7", fg: "#15803d", label: "Closed · Order created" }
    : status === "accepted_pending_confirmation" ? { bg: "#fef9c3", fg: "#854d0e", label: "Awaiting proposer confirmation" }
    : status === "declined" ? { bg: "#fee2e2", fg: "#b91c1c", label: "Declined" }
    : status === "countered" ? { bg: "#fef3c7", fg: "#92400e", label: "Countered" }
    : status === "superseded" ? { bg: "#e5e7eb", fg: "#374151", label: "Superseded" }
    : status === "cancelled" ? { bg: "#e5e7eb", fg: "#374151", label: "Cancelled" }
    : { bg: "#e0e7ff", fg: "#3730a3", label: "Awaiting response" };

  return (
    <div style={{
      alignSelf: isMine ? "flex-end" : "flex-start",
      maxWidth: "92%",
      width: "min(420px, 92%)",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      background: "hsl(var(--card))",
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "hsl(var(--muted))" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))" }}>📋 Proposal · {senderName}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: statusPill.bg, color: statusPill.fg }}>
          {statusPill.label}
        </span>
      </div>
      <div style={{ padding: 12, fontSize: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: "hsl(var(--muted-foreground))" }}>{data.note ?? message.content ?? "No items."}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "hsl(var(--foreground))" }}>{it.name}</span>
                <span style={{ color: "hsl(var(--muted-foreground))" }}>
                  {new Intl.NumberFormat("en-US").format(Number(it.quantity_kg))} kg · {fmtUsd(Number(it.price_per_kg))}/kg
                </span>
              </div>
            ))}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed hsl(var(--border))", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Total</span>
              <span>{fmtUsd(Number(total))}</span>
            </div>
          </div>
        )}
        {data.note && items.length > 0 && (
          <div style={{ marginTop: 8, fontStyle: "italic", color: "hsl(var(--muted-foreground))" }}>“{data.note}”</div>
        )}
      </div>
      {!isMine && !decided && !pendingConfirm && (
        <div style={{ display: "flex", gap: 6, padding: "8px 12px 12px" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct("accept")}
            style={btnStyle("#16a34a", "white")}
          >Accept</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct("counter")}
            style={btnStyle("hsl(var(--background))", "hsl(var(--foreground))", true)}
          >Counter</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct("decline")}
            style={btnStyle("hsl(var(--background))", "#b91c1c", true)}
          >Decline</button>
        </div>
      )}
      {pendingConfirm && iAmProposer && (
        <div style={{ display: "flex", gap: 6, padding: "8px 12px 12px" }}>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={btnStyle("#16a34a", "white")}
          >Confirm sale & close deal</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct("cancel")}
            style={btnStyle("hsl(var(--background))", "#b91c1c", true)}
          >Cancel</button>
        </div>
      )}
      {pendingConfirm && !iAmProposer && (
        <div style={{ padding: "8px 12px 12px", fontSize: 11, color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
          Accepted — waiting for {senderName} to confirm the sale.
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, fg: string, bordered = false): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color: fg,
    border: bordered ? "1px solid hsl(var(--border))" : "none",
    borderRadius: 8,
    cursor: "pointer",
  };
}

function wrapStyle(_isMobile: boolean): React.CSSProperties {
  return {
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    marginTop: 16,
    overflow: "hidden",
    background: "hsl(var(--card))",
    display: "flex",
    flexDirection: "column",
  };
}

const mobileSheetStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  display: "flex",
  flexDirection: "column",
  background: "hsl(var(--card))",
  margin: 0,
  borderRadius: 0,
  paddingTop: "env(safe-area-inset-top)",
};