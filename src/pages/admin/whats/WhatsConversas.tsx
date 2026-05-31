import { useMemo, useState } from "react";
import { MessageCircle, Search, Send, Smile, Paperclip, Filter } from "lucide-react";
import { useMwConversations, useMwContacts } from "@/hooks/mw/useMw";

export default function WhatsConversas() {
  const { rows: conversations, loading } = useMwConversations();
  const { rows: contacts } = useMwContacts();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const enriched = useMemo(() => {
    return conversations.map((c) => {
      const contact = contacts.find((x) => x.id === c.contact_id);
      return { ...c, contact };
    });
  }, [conversations, contacts]);

  const filtered = enriched.filter((c) => {
    if (!query) return true;
    const name = c.contact?.name ?? c.contact?.phone ?? "";
    return name.toLowerCase().includes(query.toLowerCase());
  });

  const current = enriched.find((c) => c.id === selected) ?? null;

  return (
    <div className="mw-conv-layout">
      <aside className="mw-conv-list">
        <div className="mw-conv-list-head">
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", top: 10, left: 10, color: "var(--g500)" }} />
            <input
              className="search-input"
              placeholder="Buscar conversas, contatos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px 8px 32px",
                border: "1px solid hsl(var(--border))", borderRadius: 8,
                fontSize: 13, background: "var(--g050)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" style={pillStyle(true)}>Todas</button>
            <button className="btn btn-ghost btn-sm" style={pillStyle(false)}>Não lidas</button>
            <button className="btn btn-ghost btn-sm" style={pillStyle(false)}><Filter size={12} /> Filtros</button>
          </div>
        </div>
        <div className="mw-conv-list-scroll">
          {loading && <div style={{ padding: 16, color: "var(--g600)" }}>Carregando…</div>}
          {!loading && filtered.length === 0 && (
            <div className="mw-empty" style={{ padding: "30px 16px" }}>
              <div className="mw-empty-icon"><MessageCircle size={22} /></div>
              <div className="mw-empty-title">Sem conversas ainda</div>
              <div className="mw-empty-sub">As conversas aparecerão aqui assim que uma instância for conectada.</div>
            </div>
          )}
          {filtered.map((c) => {
            const name = c.contact?.name ?? c.contact?.phone ?? "Sem nome";
            const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <button
                key={c.id}
                className={`mw-conv-row ${selected === c.id ? "is-active" : ""}`}
                onClick={() => setSelected(c.id)}
              >
                <span className="mw-conv-avatar">{initials || "?"}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{name}</div>
                  <div className="preview">{c.last_message_preview ?? "—"}</div>
                </div>
                <div className="meta">
                  <div>{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                  {c.unread_count > 0 && <div className="unread">{c.unread_count}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="mw-conv-thread">
        {!current ? (
          <div className="mw-empty" style={{ flex: 1, justifyContent: "center" }}>
            <div className="mw-empty-icon"><MessageCircle size={28} /></div>
            <div className="mw-empty-title">Selecione uma conversa</div>
            <div className="mw-empty-sub">Escolha um contato na lista para visualizar o histórico de mensagens.</div>
          </div>
        ) : (
          <>
            <div style={{
              padding: "12px 16px", background: "#fff",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span className="mw-conv-avatar">
                {(current.contact?.name ?? "?").slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{current.contact?.name ?? "Sem nome"}</div>
                <div style={{ fontSize: 11, color: "var(--g500)" }}>{current.contact?.phone ?? "—"}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16, color: "var(--g600)", fontSize: 13 }}>
              Histórico de mensagens aparecerá aqui quando o WhatsApp for conectado.
            </div>
            <div style={{
              padding: 12, background: "#fff", borderTop: "1px solid hsl(var(--border))",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <button className="btn btn-ghost"><Smile size={16} /></button>
              <button className="btn btn-ghost"><Paperclip size={16} /></button>
              <input
                placeholder="Digite uma mensagem ou use /macro:atalho"
                style={{
                  flex: 1, padding: "8px 12px",
                  border: "1px solid hsl(var(--border))", borderRadius: 8,
                  fontSize: 13, background: "var(--g050)",
                }}
              />
              <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Send size={14} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12, padding: "4px 10px", borderRadius: 999,
    border: "1px solid " + (active ? "var(--p800)" : "hsl(var(--border))"),
    background: active ? "#fde2e7" : "#fff",
    color: active ? "var(--p800)" : "var(--g700)",
    fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
  };
}