import { ListTodo, Plus } from "lucide-react";
import { useMwTasks } from "@/hooks/mw/useMw";

export default function WhatsTarefas() {
  const { rows, loading } = useMwTasks();
  return (
    <div className="mw-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="mw-card-title">Tarefas</h2>
          <p className="mw-card-sub">Follow-ups e pendências vinculados às conversas.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nova tarefa
        </button>
      </div>
      {loading ? (
        <div style={{ color: "var(--g600)" }}>Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="mw-empty">
          <div className="mw-empty-icon"><ListTodo size={22} /></div>
          <div className="mw-empty-title">Nenhuma tarefa</div>
          <div className="mw-empty-sub">Crie tarefas a partir de qualquer conversa.</div>
        </div>
      ) : (
        <table className="mundus-table">
          <thead>
            <tr><th>Título</th><th>Prioridade</th><th>Status</th><th>Vencimento</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.priority}</td>
                <td>{t.status}</td>
                <td>{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}