import { Users, Plus } from "lucide-react";
import { useMwContacts } from "@/hooks/mw/useMw";

export default function WhatsContatos() {
  const { rows, loading } = useMwContacts();
  return (
    <div className="mw-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="mw-card-title">Contatos</h2>
          <p className="mw-card-sub">Sincronizados das instâncias conectadas.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Novo contato
        </button>
      </div>
      {loading ? (
        <div style={{ color: "var(--g600)" }}>Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="mw-empty">
          <div className="mw-empty-icon"><Users size={22} /></div>
          <div className="mw-empty-title">Nenhum contato ainda</div>
          <div className="mw-empty-sub">Conecte uma instância para começar a sincronizar contatos.</div>
        </div>
      ) : (
        <table className="mundus-table">
          <thead>
            <tr><th>Nome</th><th>Telefone</th><th>Tags</th><th>Última atividade</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.tags.join(", ") || "—"}</td>
                <td>{c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}