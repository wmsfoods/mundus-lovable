import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MessageIcon,
  SearchIcon,
  SendIcon,
  ArrowLeftIcon,
} from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import {
  useBuyerChat,
  useConversation,
  type ChatMessage,
  type Conversation,
} from "@/hooks/useBuyerChat";

function relTime(iso: string, t: (k: string, v?: any) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("buyer.chat.relative.justNow");
  if (mins < 60) return t("buyer.chat.relative.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("buyer.chat.relative.hoursAgo", { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t("buyer.chat.relative.yesterday");
  return t("buyer.chat.relative.daysAgo", { n: days });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function contextLabel(c: Conversation, t: (k: string) => string) {
  const type = t(`buyer.chat.context.${c.context.type}`);
  return `${type} #${c.context.id} · ${c.context.label}`;
}

export default function BuyerChat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, totalUnread } = useBuyerChat();
  const { conversation } = useConversation(conversationId);

  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Reset local appended messages when switching conversation
  useEffect(() => {
    setLocalMessages([]);
    setInputText("");
  }, [conversationId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.supplierName.toLowerCase().includes(q) ||
        c.context.label.toLowerCase().includes(q) ||
        c.context.id.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const allMessages = useMemo<ChatMessage[]>(() => {
    if (!conversation) return [];
    return [...conversation.messages, ...localMessages];
  }, [conversation, localMessages]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [allMessages.length, conversationId]);

  const handleSelect = (id: string) => {
    navigate(`/buyer/chat/${id}`);
  };

  const handleBack = () => {
    navigate("/buyer/chat");
  };

  const handleSend = () => {
    if (!inputText.trim() || !conversation) return;
    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: conversation.id,
      senderType: "buyer",
      senderName: "You",
      body: inputText.trim(),
      sentAt: new Date().toISOString(),
      isRead: true,
    };
    setLocalMessages((prev) => [...prev, newMsg]);
    setInputText("");
    toast.success(t("buyer.chat.toast.messageSent"));
  };

  const showThreadClass = conversation ? "show-thread" : "";

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
            <span className="chat-page-unread">{totalUnread}</span>
          ) : undefined
        }
      />

      <div className={`chat-layout ${showThreadClass}`.trim()}>
        {/* LEFT — conversation list */}
        <aside className="chat-list">
          <div className="chat-search">
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
          <div className="chat-list-scroll">
            {filtered.map((c) => {
              const isActive = c.id === conversationId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`chat-conv-item ${isActive ? "is-active" : ""}`.trim()}
                  onClick={() => handleSelect(c.id)}
                >
                  <span className="chat-avatar-wrap">
                    <span className="chat-avatar">{c.supplierInitials}</span>
                    {c.isOnline && <span className="chat-online-dot" />}
                  </span>
                  <div className="chat-conv-body">
                    <div className="chat-conv-name">{c.supplierName}</div>
                    <div className="chat-context-pill">
                      {t(`buyer.chat.context.${c.context.type}`)} #{c.context.id}
                    </div>
                    <div className="chat-conv-preview">{c.lastMessagePreview}</div>
                  </div>
                  <div className="chat-conv-meta">
                    <span className="chat-conv-time">
                      {relTime(c.lastMessageAt, t as any)}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="chat-unread-badge">{c.unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="chat-empty">{t("buyer.chat.emptyList")}</div>
            )}
          </div>
        </aside>

        {/* RIGHT — thread or empty state */}
        <section className="chat-thread">
          {conversation ? (
            <>
              <div className="chat-thread-head">
                <button
                  type="button"
                  className="chat-back-btn"
                  onClick={handleBack}
                  aria-label="Back"
                >
                  <ArrowLeftIcon size={16} />
                </button>
                <span className="chat-avatar-wrap">
                  <span className="chat-avatar">{conversation.supplierInitials}</span>
                  {conversation.isOnline && <span className="chat-online-dot" />}
                </span>
                <div className="chat-thread-who">
                  <span className="name">{conversation.supplierName}</span>
                  <span className="sub">
                    {conversation.supplierCountryCode} ·{" "}
                    {conversation.isOnline
                      ? t("buyer.chat.online")
                      : t("buyer.chat.offline")}
                  </span>
                </div>
                <span className="chat-thread-spacer" />
                <button
                  type="button"
                  className="chat-context-pill is-link"
                  onClick={() => toast(t("buyer.chat.toast.contextOpen"))}
                  title={contextLabel(conversation, t)}
                >
                  {t(`buyer.chat.context.${conversation.context.type}`)} #
                  {conversation.context.id}
                </button>
              </div>

              <div className="chat-messages" ref={messagesRef}>
                {allMessages.map((m, idx) => {
                  const prev = allMessages[idx - 1];
                  const showSender =
                    m.senderType !== "system" &&
                    (!prev || prev.senderType !== m.senderType);
                  const cls =
                    m.senderType === "buyer"
                      ? "is-buyer"
                      : m.senderType === "supplier"
                        ? "is-supplier"
                        : "is-system";
                  return (
                    <div key={m.id} className={`chat-msg ${cls}`}>
                      {m.senderType === "supplier" && showSender && (
                        <span className="chat-msg-sender">{m.senderName}</span>
                      )}
                      <div className="chat-msg-bubble">{m.body}</div>
                      {m.senderType !== "system" && (
                        <span className="chat-msg-time">{fmtTime(m.sentAt)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="chat-footer">
                <textarea
                  rows={1}
                  placeholder={t("buyer.chat.sendPlaceholder")}
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
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                >
                  <SendIcon size={16} />
                  <span>{t("buyer.chat.sendButton")}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty">{t("buyer.chat.emptyState")}</div>
          )}
        </section>
      </div>
    </>
  );
}