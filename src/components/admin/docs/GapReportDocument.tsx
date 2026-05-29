import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

export type GapChangelogEntry = { date: string; section: string; change: string };

export const GAP_CHANGELOG: GapChangelogEntry[] = [
  { date: "2026-05-29", section: "Documento", change: "Criação inicial do Relatório de Gaps." },
];

const doc: DocContent = {
  tagline: "Relatório de Gaps — o que precisa ser organizado, refatorado ou implementado",
  hero: "Inventário vivo das lacunas técnicas, funcionais e de produto da plataforma Mundus.",
  badge: "DOCUMENTO INTERNO | EQUIPE MUNDUS | 2026",
  print: "Imprimir / Salvar PDF",
  footer_kicker: "Mundus Trade",
  footer_lines: [
    "Mundus Trade LLC — Ocoee, Florida, USA",
    "Documento vivo · atualize sempre que um gap for descoberto, priorizado ou fechado.",
    "Use junto com a Documentação da Plataforma para contexto técnico das rotas/módulos.",
  ],
  signature: "MUNDUS | RELATÓRIO DE GAPS | 2026",
  sections: [
    {
      kicker: "00 — COMO USAR",
      title: "Como ler este relatório",
      blocks: [
        { kind: "lede", text: "Cada seção lista gaps por área (produto, dados, segurança, operação). Mantenha o status: Aberto, Em andamento, Fechado." },
        { kind: "callout", text: "Sempre que um gap for fechado, mova a linha para o Changelog (última seção) com a data e descrição da entrega." },
        { kind: "ul", items: [
          "Prioridade: P0 (bloqueador), P1 (alto), P2 (médio), P3 (baixo).",
          "Owner: pessoa ou squad responsável.",
          "Evidência: link de issue, PR, rota ou print quando aplicável.",
        ]},
      ],
    },
    {
      kicker: "01 — PRODUTO & UX",
      title: "Gaps de produto e experiência",
      blocks: [
        { kind: "table", head: ["Gap", "Prioridade", "Status", "Owner"], rows: [
          ["Onboarding de supplier sem perfil de proteína definido cai em catálogo default — reforçar wizard.", "P1", "Aberto", "—"],
          ["Fluxo de chat na negociação só libera no round 3, mas não há indicação visual disso antes.", "P2", "Aberto", "—"],
          ["Mobile: tabelas longas de Sales/Orders ainda não têm versão card-first completa.", "P2", "Aberto", "—"],
        ]},
      ],
    },
    {
      kicker: "02 — DADOS & CATÁLOGO",
      title: "Gaps de dados, catálogo e integrações",
      blocks: [
        { kind: "table", head: ["Gap", "Prioridade", "Status", "Owner"], rows: [
          ["Padronizar nomenclatura US/IMPS para Poultry e Lamb (hoje só Beef e Pork).", "P2", "Aberto", "—"],
          ["Deduplicação automática de portos por cidade/país no admin (hoje só badge visual).", "P2", "Aberto", "—"],
          ["Enriquecimento de prospects via Apollo: tratar limites e fallback quando domínio não casa.", "P1", "Aberto", "—"],
        ]},
      ],
    },
    {
      kicker: "03 — NEGOCIAÇÃO & PRICING",
      title: "Gaps do motor de negociação",
      blocks: [
        { kind: "table", head: ["Gap", "Prioridade", "Status", "Owner"], rows: [
          ["Painel multi-buyer no supplier não exibe histórico completo quando há >5 buyers.", "P2", "Aberto", "—"],
          ["Regra de mínimo 70% na rodada 1 precisa de mensagem mais explicativa quando rejeitada.", "P3", "Aberto", "—"],
          ["Conversão kg/lb: garantir que toda label use fmtWeight()/fmtPrice() (auditoria pendente).", "P1", "Aberto", "—"],
        ]},
      ],
    },
    {
      kicker: "04 — SEGURANÇA & RLS",
      title: "Gaps de segurança e permissões",
      blocks: [
        { kind: "table", head: ["Gap", "Prioridade", "Status", "Owner"], rows: [
          ["Revisão completa das policies pendente (scan inicial identificou 13 itens — ver memória).", "P0", "Aberto", "—"],
          ["Auditoria de buckets privados: confirmar signed URLs em todos os pontos de download.", "P1", "Aberto", "—"],
          ["Migração de admins legados para o padrão has_role (eliminar checks ad-hoc).", "P1", "Aberto", "—"],
        ]},
      ],
    },
    {
      kicker: "05 — OPERAÇÃO & ADMIN",
      title: "Gaps operacionais da equipe Mundus",
      blocks: [
        { kind: "table", head: ["Gap", "Prioridade", "Status", "Owner"], rows: [
          ["Email Activity Dashboard precisa de filtros por campanha + export CSV.", "P2", "Aberto", "—"],
          ["Outreach Center: regras de matching ainda heurísticas — formalizar pesos.", "P2", "Aberto", "—"],
          ["CRM Pipeline: bulk actions em lote (mover stage, atribuir owner) ainda não implementadas.", "P1", "Aberto", "—"],
        ]},
      ],
    },
    {
      kicker: "06 — CHANGELOG",
      title: "Versões & histórico de fechamento de gaps",
      blocks: [
        { kind: "lede", text: "Quando um gap for fechado, registre aqui. Mantenha a entrada mais recente no topo." },
        {
          kind: "table",
          head: ["Data", "Seção", "Alteração"],
          rows: GAP_CHANGELOG.map((e) => [e.date, e.section, e.change]),
        },
      ],
    },
  ],
};

export const CONTENT: Record<Lang, DocContent> = { pt: doc, en: doc, es: doc, zh: doc };

export function GapReportDocument({ scrollTarget }: { scrollTarget?: string | null }) {
  return <AdminDocView content={CONTENT} scrollTarget={scrollTarget} />;
}