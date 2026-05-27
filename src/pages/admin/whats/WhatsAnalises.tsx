import { BarChart3 } from "lucide-react";
import { useMwConversations } from "@/hooks/mw/useMw";

export default function WhatsAnalises() {
  const { rows } = useMwConversations();
  const total = rows.length;
  const open = rows.filter((r) => r.status === "open").length;
  const closed = rows.filter((r) => r.status === "closed").length;
  const archived = rows.filter((r) => r.is_archived).length;

  return (
    <>
      <div className="mw-stats">
        <Stat label="Total de conversas" value={total} />
        <Stat label="Conversas abertas" value={open} delta="—" />
        <Stat label="Conversas fechadas" value={closed} />
        <Stat label="Conversas arquivadas" value={archived} />
      </div>
      <div className="mw-card" style={{ marginTop: 16 }}>
        <h2 className="mw-card-title">Relatório WhatsApp</h2>
        <p className="mw-card-sub">Volume, tempos de resposta, sentimentos e tópicos.</p>
        <div className="mw-empty">
          <div className="mw-empty-icon"><BarChart3 size={22} /></div>
          <div className="mw-empty-title">Sem dados suficientes</div>
          <div className="mw-empty-sub">Os relatórios aparecerão conforme as conversas acontecem.</div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, delta }: { label: string; value: number | string; delta?: string }) {
  return (
    <div className="mw-stat">
      <div className="mw-stat-label">{label}</div>
      <div className="mw-stat-value">{value}</div>
      {delta && <div className="mw-stat-delta">{delta}</div>}
    </div>
  );
}