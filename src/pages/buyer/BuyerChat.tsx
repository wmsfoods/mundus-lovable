import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MessageIcon,
  SearchIcon,
  SendIcon,
  PaperclipIcon,
  ArrowLeftIcon,
} from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import {
  useBuyerConversations,
  type Conversation,
  type ChatMessage,
} from "@/hooks/useBuyerChat";

function relTime(iso: string, t: (k: string, v?: any) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("buyer.chat.time.justNow");
  if (mins < 60) return t("buyer.chat.time.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("buyer.chat.time.hoursAgo", { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("buyer.chat.time.daysAgo", { n: days });
  const wks = Math.floor(days / 7);
  return t("buyer.chat.time.weeksAgo", { n: wks });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function linkFor(c: Conversation): string | null {
  if (!c.linkedToId) return null;
  if (c.linkedToType === "offer") return `/buyer/offers/${c.linkedToId}`;
  if (c.linkedToType === "negotiation") return `/buyer/negotiations/${c.linkedToId}`;
  if (c.linkedToType === "request") return `/buyer/requests/${c.linkedToId}`;
  return null;
}

export default function BuyerChat() {
  const { t } = useTranslation();
  const { conversations, totalUnread } = useBuyerConversations();
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [showThread, setShowThread] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.counterpartyName.toLowerCase().includes(q) ||
        (c.linkedToTitle ?? "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const current = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [selectedId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    toast.success(t("buyer.chat.toast.messageSent"));
    setInputText("");
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowThread(true);
  };

  const linkLabel = (c: Conversation) => {
    if (c.linkedToType === "offer") return t("buyer.chat.viewOffer");
    if (c.linkedToType === "negotiation") return t("buyer.chat.viewNegotiation");
    if (c.linkedToType === "request") return t("buyer.chat.viewRequest");
    return "";
  };

  const linkedChip = (c: Conversation) => {
    const k = `buyer.chat.linkedTo.${c.linkedToType}`;
    const label = t(k);
    return c.linkedToTitle ? `${label} · ${c.linkedToTitle}` : label;
  };

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/buyer" },
          { label: t("buyer.chat.title") },
        ]}
      />
      <PageTitle
        icon={MessageIcon}
        title={t("buyer.chat.title")}
        right={
          totalUnread > 0 ? (
            <span className="chat-unread-pill">{totalUnread}</span>
          ) : undefined
        }
      />

      <div className={`chat-grid ${showThread ? "show-thread" : ""}`.trim()}>
        {/* LEFT — list */}
        <aside className="chat-list">
          <div className="chat-list-search">
            <div className="search-input">
              <span className="ic"><SearchIcon size={16} /></span>
              <input
                type="text"
                placeholder={t("buyer.chat.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="chat-list-rows">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chat-conv-row ${c.id === selectedId ? "is-active" : ""}`.trim()}
                onClick={() => handleSelect(c.id)}
                style={{ width: "100%", textAlign: "left" }}
              >
                <span className="avatar">{c.counterpartyInitials}</span>
                <div className="content">
                  <div className="name">{c.counterpartyName}</div>
                  <div className="linked-chip">{linkedChip(c)}</div>
                  <div className="preview">{c.lastMessage}</div>
                </div>
                <div className="meta">
                  <span className="time">{relTime(c.lastMessageAt, t as any)}</span>
                  {c.unreadCount > 0 && (
                    <span className="unread-badge">{c.unreadCount}</span>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--g500)", fontSize: 13 }}>
                {t("buyer.chat.empty")}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT — thread */}
        <section className="chat-thread">
          {current ? (
            <>
              <div className="chat-thread-head">
                <button
                  type="button"
                  className="chat-back-btn"
                  onClick={() => setShowThread(false)}
                  aria-label="Back"
                >
                  <ArrowLeftIcon size={16} />
                </button>
                <span className="avatar">{current.counterpartyInitials}</span>
                <div className="who">
                  <span className="name">{current.counterpartyName}</span>
                  <span className="sub">{current.counterpartyCountryCode}</span>
                </div>
                <span className="spacer" />
                {current.linkedToType !== "general" && linkFor(current) && (
                  <Link to={linkFor(current)!} className="chat-thread-link">
                    {linkLabel(current)}
                  </Link>
                )}
              </div>

              <div className="chat-messages" ref={messagesRef}>
                {current.messages.map((m: ChatMessage) => {
                  if (m.isSystem) {
                    return (
                      <div key={m.id} className="chat-msg system">
                        <span className="bubble">{m.text}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={m.id}
                      className={`chat-msg ${m.isFromMe ? "mine" : "theirs"}`}
                    >
                      {!m.isFromMe && <span className="sender">{m.senderName}</span>}
                      <div className="bubble">
                        {m.text}
                        {m.attachmentName && (
                          <div className="attachment">
                            <PaperclipIcon size={12} />
                            <span>{m.attachmentName}</span>
                          </div>
                        )}
                      </div>
                      <span className="meta">{fmtTime(m.timestamp)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="chat-input">
                <button
                  type="button"
                  className="attach-btn"
                  onClick={() => toast(t("buyer.chat.toast.attachFile"))}
                  aria-label={t("buyer.chat.attachBtn")}
                >
                  <PaperclipIcon size={16} />
                </button>
                <textarea
                  rows={1}
                  placeholder={t("buyer.chat.inputPlaceholder")}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                >
                  <SendIcon size={16} />
                  <span>{t("buyer.chat.sendBtn")}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty">{t("buyer.chat.empty")}</div>
          )}
        </section>
      </div>
    </>
  );
}