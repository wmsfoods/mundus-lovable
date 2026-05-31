import { Zap, Plus } from "lucide-react";
import { useMwMacros } from "@/hooks/mw/useMw";

const SUGGESTIONS = [
  { slug: "saudacao", body: "Olá! Tudo bem? Como posso te ajudar hoje?" },
  { slug: "envio", body: "Seu pedido foi enviado e chegará em até 3 dias úteis." },
  { slug: "retorno", body: "Recebido! Vou verificar e retorno em alguns minutos." },
];

export default function WhatsMacros() {
  const { rows, loading } = useMwMacros();
  return (
    <div className="mw-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <h2 className="mw-card-title">Macros (Respostas rápidas)</h2>
          <p className="mw-card-sub">Use <code>/macro:atalho</code> no chat para inserir uma resposta rápida.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nova macro
        </button>
      </div>
      {loading ? (
        <div style={{ color: "var(--g600)", marginTop: 16 }}>Carregando…</div>
      ) : rows.length === 0 ? (
        <>
          <div className="mw-empty" style={{ padding: "40px 20px" }}>
            <div className="mw-empty-icon"><Zap size={22} /></div>
            <div className="mw-empty-title">Nenhuma macro criada</div>
            <div className="mw-empty-sub">Crie sua primeira macro para começar a usar respostas rápidas.</div>
            <button className="btn btn-primary" style={{ marginTop: 8 }}>+ Criar primeira macro</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 8 }}>
            {SUGGESTIONS.map((s) => (
              <div key={s.slug} style={{
                border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 14, background: "#fff",
              }}>
                <div style={{ fontSize: 13, color: "var(--p800)", fontFamily: "monospace", marginBottom: 4 }}>
                  /macro:{s.slug}
                </div>
                <div style={{ fontSize: 13, color: "var(--fg)" }}>{s.body}</div>
                <div style={{ fontSize: 11, color: "var(--g500)", marginTop: 8 }}>Sugestão pronta para uso</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
          {rows.map((m) => (
            <div key={m.id} style={{
              border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 14, background: "#fff",
            }}>
              <div style={{ fontSize: 13, color: "var(--p800)", fontFamily: "monospace", marginBottom: 4 }}>
                /macro:{m.slug}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: "var(--g700)" }}>{m.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}