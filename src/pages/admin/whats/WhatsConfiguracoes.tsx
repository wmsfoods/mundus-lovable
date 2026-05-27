import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Rocket, Phone, Zap, GitBranch, Users, Shield, CheckCircle2, Circle, Copy, Plus,
} from "lucide-react";
import { useMwInstances, useMwRules, useMwTeam, useMwMacros } from "@/hooks/mw/useMw";
import { AddInstanceDialog } from "@/components/whats/AddInstanceDialog";
import { InstanceCard } from "@/components/whats/InstanceCard";
import { InstanceSetupCollapsible } from "@/components/whats/InstanceSetupCollapsible";
import { Button } from "@/components/ui/button";

type SettingsKey = "setup" | "instancias" | "macros" | "atribuicao" | "equipe" | "seguranca";

const SIDE: { key: SettingsKey; label: string; icon: LucideIcon }[] = [
  { key: "setup", label: "Setup", icon: Rocket },
  { key: "instancias", label: "Instâncias", icon: Phone },
  { key: "macros", label: "Macros", icon: Zap },
  { key: "atribuicao", label: "Atribuição", icon: GitBranch },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "seguranca", label: "Segurança", icon: Shield },
];

export default function WhatsConfiguracoes() {
  const [active, setActive] = useState<SettingsKey>("setup");

  return (
    <div className="mw-settings">
      <aside className="mw-settings-nav">
        {SIDE.map((s) => {
          const I = s.icon;
          return (
            <a
              key={s.key}
              href="#"
              onClick={(e) => { e.preventDefault(); setActive(s.key); }}
              className={active === s.key ? "is-active" : ""}
            >
              <I size={14} />
              {s.label}
            </a>
          );
        })}
      </aside>
      <div>
        {active === "setup" && <SetupPanel />}
        {active === "instancias" && <InstancesPanel />}
        {active === "macros" && <MacrosPanel />}
        {active === "atribuicao" && <AssignmentPanel />}
        {active === "equipe" && <TeamPanel />}
        {active === "seguranca" && <SecurityPanel />}
      </div>
    </div>
  );
}

function SetupPanel() {
  const { rows: instances } = useMwInstances();
  const { rows: team } = useMwTeam();
  const { rows: rules } = useMwRules();
  const { rows: macros } = useMwMacros();

  const sections = [
    {
      key: "init",
      title: "Configuração Inicial",
      steps: [
        { title: "Conectar instância do WhatsApp", desc: "Configure sua primeira instância para começar a receber mensagens.", done: instances.length > 0 },
        { title: "Receber primeira mensagem", desc: "Aguarde a primeira mensagem chegar na sua instância conectada.", done: false },
      ],
    },
    {
      key: "team",
      title: "Montar Equipe",
      steps: [
        { title: "Convidar agentes", desc: "Adicione membros à sua equipe para distribuir o atendimento.", done: team.length > 0 },
        { title: "Criar regra de atribuição", desc: "Defina como conversas serão distribuídas automaticamente.", done: rules.length > 0 },
      ],
    },
    {
      key: "prod",
      title: "Produtividade",
      steps: [
        { title: "Criar primeira macro", desc: "Acelere respostas comuns com atalhos /macro:nome.", done: macros.length > 0 },
        { title: "Configurar tarefas", desc: "Use tarefas para acompanhar follow-ups.", done: false },
      ],
    },
    {
      key: "more",
      title: "Explorar Recursos",
      steps: [
        { title: "Personalizar permissões", desc: "Ajuste níveis de acesso por agente.", done: false },
        { title: "Configurar notificações", desc: "Escolha quando ser avisado.", done: false },
      ],
    },
  ];

  const totalSteps = sections.reduce((s, sec) => s + sec.steps.length, 0);
  const doneSteps = sections.reduce((s, sec) => s + sec.steps.filter((st) => st.done).length, 0);
  const pct = Math.round((doneSteps / totalSteps) * 100);

  const [activeSection, setActiveSection] = useState(sections[0].key);
  const current = sections.find((s) => s.key === activeSection)!;

  return (
    <>
      <div className="mw-hero">
        <div className="mw-hero-left">
          <div className="mw-hero-icon"><Rocket size={22} /></div>
          <div>
            <div className="mw-hero-title">Checklist de configuração</div>
            <div className="mw-hero-sub">{doneSteps} de {totalSteps} passos concluídos</div>
          </div>
        </div>
        <div className="mw-hero-right">
          <div className="mw-hero-progress-label">Progresso geral</div>
          <div className="mw-hero-progress-value">{doneSteps} de {totalSteps} passos · {pct}%</div>
          <div className="mw-hero-progress-bar"><div className="mw-hero-progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="mw-checklist" style={{ marginTop: 16 }}>
        <aside className="mw-checklist-aside">
          {sections.map((s) => {
            const sectionDone = s.steps.filter((st) => st.done).length;
            const sectionPct = Math.round((sectionDone / s.steps.length) * 100);
            return (
              <button
                key={s.key}
                className={activeSection === s.key ? "is-active" : ""}
                onClick={() => setActiveSection(s.key)}
              >
                <span>{s.title}</span>
                <span className="pct">{sectionPct}%</span>
              </button>
            );
          })}
        </aside>
        <div className="mw-checklist-main">
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{current.title}</div>
            <div style={{ fontSize: 12, color: "var(--g500)" }}>
              {current.steps.filter((s) => s.done).length} de {current.steps.length} passos concluídos
            </div>
          </div>
          {current.steps.map((st, i) => (
            <div key={i} className={`mw-step ${st.done ? "is-done" : ""}`}>
              <span className="mw-step-check">
                {st.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </span>
              <span className="mw-step-icon"><Rocket size={14} /></span>
              <div className="mw-step-body">
                <div className="title">{st.title}</div>
                <div className="desc">{st.desc}</div>
                {!st.done && <button>Começar</button>}
                {st.done && <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>✓ Concluído</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function InstancesPanel() {
  const { rows, loading, reload } = useMwInstances();
  const [showAdd, setShowAdd] = useState(false);
  const webhook = `https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/mw-evolution-webhook`;

  return (
    <>
      <div className="mw-card" style={{ marginBottom: 16, background: "linear-gradient(135deg, var(--p800), #6f1a2d)", color: "#fff", border: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.16)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Rocket size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Configurar Evolution API</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Conecte um número ou crie uma nova instância</div>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 999, fontSize: 12 }}>
            {rows.length}/15
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <InstanceSetupCollapsible onOpenAddDialog={() => setShowAdd(true)} />
      </div>

      <div className="mw-card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 className="mw-card-title">Instâncias</h3>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Nova instância</Button>
        </div>
        {loading ? (
          <div>Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="mw-empty">
            <div className="mw-empty-icon"><Phone size={22} /></div>
            <div className="mw-empty-title">Nenhuma instância conectada</div>
            <div className="mw-empty-sub">Crie uma instância usando a Evolution API para começar a receber mensagens.</div>
            <Button onClick={() => setShowAdd(true)} className="mt-3" size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Conectar primeira instância</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((inst) => (
              <InstanceCard key={inst.id} instance={inst} onChanged={reload} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, padding: 10, background: "var(--g050)", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--g600)" }}>🔗 Webhook URL:</span>
          <code style={{ flex: 1, fontFamily: "monospace" }}>{webhook}</code>
          <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(webhook)}><Copy size={12} /></button>
        </div>
      </div>

      <AddInstanceDialog open={showAdd} onOpenChange={setShowAdd} onCreated={reload} />
    </>
  );
}

function MacrosPanel() {
  return (
    <div className="mw-card">
      <h3 className="mw-card-title">Macros</h3>
      <p className="mw-card-sub">Gerencie respostas rápidas. Edição completa disponível na aba <strong>Macros</strong> do topo.</p>
    </div>
  );
}

function AssignmentPanel() {
  const { rows, loading } = useMwRules();
  const templates = [
    { name: "Round-robin entre agentes ativos", desc: "Distribui novas conversas em ciclo entre todos online." },
    { name: "Por tópico (Vendas → Comercial)", desc: "Conversas marcadas Vendas vão direto para a equipe Comercial." },
    { name: "Idioma do contato", desc: "Direciona EN/PT/ES para agentes do respectivo idioma." },
  ];
  return (
    <>
      <div className="mw-card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h3 className="mw-card-title">Regras de atribuição</h3>
            <p className="mw-card-sub">Configure a atribuição automática de conversas para agentes.</p>
          </div>
          <button className="btn btn-primary">+ Nova regra</button>
        </div>
        {loading ? <div>Carregando…</div> : rows.length === 0 ? (
          <div className="mw-empty">
            <div className="mw-empty-icon"><GitBranch size={22} /></div>
            <div className="mw-empty-title">Nenhuma regra de atribuição configurada</div>
            <div className="mw-empty-sub">Distribua conversas para agentes por palavras-chave, tópicos ou horário.</div>
            <button className="btn btn-ghost" style={{ marginTop: 8 }}>+ Criar primeira regra</button>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Modelos sugeridos</div>
        <div style={{ display: "grid", gap: 8 }}>
          {templates.map((t) => (
            <div key={t.name} className="mw-card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--g600)" }}>{t.desc}</div>
              </div>
              <button className="btn btn-ghost btn-sm">Usar modelo</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TeamPanel() {
  const { rows, loading } = useMwTeam();
  return (
    <div className="mw-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 className="mw-card-title">Equipe</h3>
          <p className="mw-card-sub">Agentes com acesso ao Mundus Whats.</p>
        </div>
        <button className="btn btn-primary">+ Convidar agente</button>
      </div>
      {loading ? <div>Carregando…</div> : rows.length === 0 ? (
        <div className="mw-empty">
          <div className="mw-empty-icon"><Users size={22} /></div>
          <div className="mw-empty-title">Sem agentes ainda</div>
          <div className="mw-empty-sub">Convide membros para atender as conversas.</div>
        </div>
      ) : (
        <table className="mundus-table">
          <thead><tr><th>Nome</th><th>Papel</th><th>Status</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id}><td>{m.display_name ?? m.user_id}</td><td>{m.role}</td><td>{m.status}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="mw-card">
      <h3 className="mw-card-title">Segurança</h3>
      <p className="mw-card-sub">Acesso restrito a administradores Mundus.</p>
      <ul style={{ fontSize: 13, color: "var(--g700)", lineHeight: 1.8, marginTop: 8 }}>
        <li>✓ RLS habilitado em todas as tabelas do módulo</li>
        <li>✓ Bucket de mídia privado (signed URLs)</li>
        <li>✓ Restrição via <code>is_mundus_admin()</code></li>
        <li>✓ Realtime escopado por canal</li>
      </ul>
    </div>
  );
}