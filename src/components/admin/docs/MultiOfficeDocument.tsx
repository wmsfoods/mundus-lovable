import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

export type MultiOfficeChangelogEntry = { date: string; change: string };

export const MULTIOFFICE_CHANGELOG: MultiOfficeChangelogEntry[] = [
  { date: "2026-05-30", change: "Publicação inicial do documento Multi-Office (Fases 1-5). Versões EN/ES/ZH replicam o PT até a tradução formal." },
];

const FLOW_DIAGRAM = `Buyer Request  →  HQ (target_supplier_id)
        │
        ▼
auto_route_request  (lê office_markets)
   ├─ match único   →  assigned_office_id + routing_status = 'assigned'
   └─ ambíguo/zero  →  HQ Inbox  (routing_status = 'unassigned')
                              │
                              ▼
                  HQ Member / Global Director
                  "Assign to office ▾"  →  assign_request_to_office(rpc)
                              │
                              ▼
                       Office Operator
              vê em Office Inbox (aba Assigned)
                e responde com a oferta`;

const doc: DocContent = {
  tagline: "Modelo Multi-Office — arquitetura, papéis, roteamento de requests e Global Director",
  hero: "Como a Mundus organiza famílias de empresas (HQ + filiais), distribui demanda e dá visão consolidada ao Global Director.",
  badge: "DOCUMENTO INTERNO | EQUIPE MUNDUS | FASES 1-5 | 2026",
  print: "Imprimir / Salvar PDF",
  footer_kicker: "Mundus Trade",
  footer_lines: [
    "Mundus Trade LLC — Ocoee, Florida, USA",
    "Documento vivo · atualize quando criar novos papéis, mudar RLS ou alterar o fluxo de roteamento.",
    "Use junto com a Documentação da Plataforma e o Relatório de Gaps.",
  ],
  signature: "MUNDUS | MULTI-OFFICE MODEL | 2026",
  sections: [
    {
      kicker: "00 — VISÃO GERAL",
      title: "O que é o Modelo Multi-Office",
      blocks: [
        { kind: "lede", text: "Empresas reais raramente operam de um único ponto: uma supplier global tem matriz comercial + frigoríficos regionais; uma buyer pode ter escritórios de compras em vários países. O Modelo Multi-Office representa isso na Mundus como uma família de companies (HQ + filiais), com isolamento por filial e uma camada de visão consolidada para diretores globais." },
        { kind: "h3", text: "Glossário" },
        { kind: "cards3", items: [
          { t: "HQ (Headquarters)", d: "Company raiz da família. Não tem parent_company_id. Recebe primeiro toda demanda externa." },
          { t: "Office (Filial)", d: "Company filha (parent_company_id = HQ). Pode ter plantas e mercados próprios." },
          { t: "Family", d: "Conjunto HQ + todas as filiais. RLS e hooks de escopo trabalham nesse nível." },
          { t: "HQ Member", d: "Usuário ligado à HQ. Vê pool de unassigned + toda a família." },
          { t: "Office Operator", d: "Usuário ligado a uma única filial. Vê apenas o que está atribuído ao seu office." },
          { t: "Global Director", d: "Papel especial (supplier_global_director / buyer_global_director). Vê e age em toda a família." },
        ]},
      ],
    },
    {
      kicker: "01 — ARQUITETURA",
      title: "Como a família é representada no banco",
      blocks: [
        { kind: "p", text: "Toda a estrutura usa a tabela companies + duas tabelas auxiliares por office. Não criamos uma tabela 'offices' separada — uma filial é uma company filha." },
        { kind: "table", head: ["Tabela / Coluna", "Significado"], rows: [
          ["companies.parent_company_id", "Aponta para a HQ. NULL = a própria company é HQ/standalone."],
          ["office_plants", "Lista de frigoríficos (plant numbers / SIF) cobertos pelo office. Filtra Create Offer."],
          ["office_markets", "Lista de países que o office atende. Base do auto-routing de requests."],
          ["buyer_requests.assigned_office_id", "Office responsável pelo request após o roteamento."],
          ["buyer_requests.routing_status", "'unassigned' (na HQ Inbox) | 'assigned' (na Office Inbox)."],
          ["user_offices", "Liga um usuário a um office específico (escopo de operator)."],
          ["company_users.role", "Papel do usuário: master_*, supplier_global_director, buyer_global_director, etc."],
        ]},
        { kind: "callout", text: "Hoje suportamos um nível de aninhamento (HQ → offices). Se passar disso, ver TODO em useActiveOffice.ts (usar company_family_ids no banco)." },
      ],
    },
    {
      kicker: "02 — PAPÉIS & PERMISSÕES",
      title: "Quem vê o quê",
      blocks: [
        { kind: "cards2", items: [
          { t: "Office Operator", d: "Vê apenas requests, offers, negociações e orders do office onde está. Não enxerga atividade dos irmãos." },
          { t: "HQ Member", d: "Vê o pool de requests unassigned + toda a família. Pode atribuir requests aos offices." },
          { t: "Supplier Global Director", d: "Visibilidade family-wide para supplier: rollup por office + comparação de cuts. Pode atuar em qualquer office." },
          { t: "Buyer Global Director", d: "Espelho do supplier para buyer: vê pedidos e negociações de todas as filiais; pode criar request escolhendo o office." },
          { t: "Mundus Admin", d: "Vê tudo. Pode também atuar 'em nome de' qualquer company (ver botão Act on Behalf no admin)." },
          { t: "Master Supplier / Buyer", d: "Papel histórico de admin da company. Tem visão family-wide e gerencia o team." },
        ]},
      ],
    },
    {
      kicker: "03 — CONFIGURAR OFFICES",
      title: "Como criar a família (HQ + filiais)",
      blocks: [
        { kind: "ol", items: [
          { t: "Entre em /admin/crm", d: "Acessar Companies." },
          { t: "Abra a HQ da família", d: "É a company sem parent_company_id (ou marcada como HQ)." },
          { t: "Vá em 'Offices / Family'", d: "Painel com a árvore da família. Use 'Add office' para criar uma filial — o parent_company_id é preenchido automaticamente." },
          { t: "Defina plantas (office_plants)", d: "Para suppliers: liste os frigoríficos / SIF que esse office representa. Isso filtra o dropdown de plantas no Create Offer." },
          { t: "Defina mercados (office_markets)", d: "Países atendidos pelo office. É a base do auto-routing — se um buyer pedir destino China e só um office cobrir CN, o request vai direto." },
        ]},
        { kind: "callout", text: "Dica: mantenha office_markets enxuto e específico. Mercado duplicado entre dois offices força ambiguidade e manda o request pro HQ Inbox." },
      ],
    },
    {
      kicker: "04 — CONFIGURAR O TEAM",
      title: "Convites e escopos por usuário",
      blocks: [
        { kind: "ol", items: [
          { t: "Mesma página de Company → aba 'Team'", d: "O componente CompanyTeamPanel lista os usuários da família." },
          { t: "Convidar usuário", d: "Edge function send-team-invite (Resend) dispara o e-mail. O convite cria o registro em team_invitations." },
          { t: "Definir escopo", d: "Ao criar/editar: escolha o office (vira Operator) OU marque como HQ Member OU defina o role como supplier_global_director / buyer_global_director." },
          { t: "Aceite", d: "Usuário abre /invite/accept, define senha e cai já com o escopo correto." },
        ]},
        { kind: "table", head: ["Escopo", "Onde fica gravado", "O que enxerga"], rows: [
          ["Office Operator", "user_offices (uma linha)", "Apenas requests/negociações com assigned_office_id = seu office."],
          ["HQ Member", "company_users (company_id = HQ, status = active)", "Pool unassigned + toda a família."],
          ["Global Director", "company_users.role = *_global_director", "Family-wide + acesso aos dashboards Rollup e Cut Comparison."],
        ]},
      ],
    },
    {
      kicker: "05 — REQUEST → OFFICE",
      title: "Como uma demanda chega ao operator certo",
      blocks: [
        { kind: "p", text: "O buyer cria um request apontando para uma supplier (target_supplier_id). O request entra sempre pela HQ da família e, em seguida, o sistema tenta resolver o office automaticamente. Quando não consegue, fica no HQ Inbox até alguém da HQ ou um Global Director atribuir manualmente." },
        { kind: "quote", text: FLOW_DIAGRAM },
        { kind: "h3", text: "Funções envolvidas" },
        { kind: "table", head: ["Função / RPC", "Quando roda", "O que faz"], rows: [
          ["tg_notify_request_arrived_family", "Trigger no insert do request", "Avisa HQ + Global Directors que chegou demanda."],
          ["auto_route_request", "Após o insert", "Tenta atribuir o office baseado em office_markets vs destinos do request."],
          ["assign_request_to_office (RPC)", "Manual, pelo HQ Member / Director", "Grava assigned_office_id + routing_status = 'assigned' e dispara notificação ao office."],
        ]},
        { kind: "h3", text: "Inboxes na UI" },
        { kind: "cards2", items: [
          { t: "HQ Inbox — aba 'Unassigned'", d: "Em /supplier/requests. Visível para HQ Member, Global Director e Mundus Admin. Mostra requests com routing_status = 'unassigned'." },
          { t: "Office Inbox — aba 'Assigned'", d: "Em /supplier/requests. Visível para o Operator do office (ou HQ/Director). Mostra requests com assigned_office_id no escopo do usuário." },
        ]},
      ],
    },
    {
      kicker: "06 — GLOBAL DIRECTOR",
      title: "Visão consolidada e comparativa",
      blocks: [
        { kind: "p", text: "Usuários com role supplier_global_director ganham dois dashboards extras no sidebar do supplier. O equivalente buyer existe para buyer_global_director (com hooks espelhados em useBuyerScope)." },
        { kind: "cards2", items: [
          { t: "/supplier/rollup — ByOfficeRollup", d: "KPIs por office da família: requests recebidos, em negociação, fechados, ticket médio. Permite comparar performance entre filiais." },
          { t: "/supplier/cuts/compare — CutComparison", d: "Compara preço da família contra uma banda de mercado anonimizada (RPC market_cut_benchmark). Só mostra cuts com pelo menos 3 amostras no mercado — caso contrário, exibe 'amostra insuficiente'." },
        ]},
        { kind: "callout", text: "Act anywhere: Global Director também pode entrar em qualquer office da família, abrir uma negociação e responder em nome daquele office — útil quando o operator local está fora." },
      ],
    },
    {
      kicker: "07 — SEGURANÇA & RLS",
      title: "Como o isolamento é garantido",
      blocks: [
        { kind: "p", text: "Toda visibilidade family-aware passa por duas funções SECURITY DEFINER no Postgres, usadas tanto em RLS quanto pelos hooks de frontend (useSupplierScope, useBuyerScope)." },
        { kind: "table", head: ["Função", "Retorna", "Usada em"], rows: [
          ["user_supplier_scope_ids()", "Array de company_id que o usuário pode ver no lado supplier.", "RLS de offers, buyer_requests, negotiations, orders + hooks useRealSupplierOffers, useSupplierDashboard."],
          ["user_buyer_scope_ids()", "Array de company_id que o usuário pode ver no lado buyer.", "RLS de buyer_requests, orders, negotiations + hooks useBuyerOrders, useBuyerDashboard, useRealNegotiationsList."],
        ]},
        { kind: "ul", items: [
          "Operator do office A nunca vê dados do office B na mesma família (RLS valida no banco, não só no frontend).",
          "HQ Member e Global Director recebem todos os IDs da família — não há leakage entre famílias diferentes.",
          "Mundus Admin bypassa via has_role('mundus_admin') nas policies.",
          "Quando o admin atua 'em nome de' uma company, o audit_log registra o ator real (admin) e o sujeito (company)."],
        },
      ],
    },
    {
      kicker: "08 — CHECKLIST DE QA",
      title: "Cenários para validar antes de soltar mudanças",
      blocks: [
        { kind: "ol", items: [
          { t: "Criar uma família nova", d: "Em /admin/crm, criar HQ + 2 offices, com mercados distintos (ex: office A = USA/CA, office B = CN/JP)." },
          { t: "Convidar 3 usuários", d: "Um Operator no office A, um HQ Member na HQ, um Global Director." },
          { t: "Buyer cria request com destino USA", d: "Deve ir direto para office A (routing_status = 'assigned')." },
          { t: "Buyer cria request com destino BR (não coberto)", d: "Deve cair em HQ Inbox (unassigned). HQ Member usa 'Assign to office ▾' e manda para office B." },
          { t: "Login como Operator do office B", d: "Vê o request atribuído na aba Assigned e nenhum request de office A." },
          { t: "Login como Global Director", d: "Vê /supplier/rollup com os dois offices e /supplier/cuts/compare carregando a banda de mercado." },
          { t: "Buyer Global Director", d: "Em /buyer/requests/new aparece o seletor de office; criar um request escolhendo office específico." },
        ]},
      ],
    },
    {
      kicker: "09 — ROTAS RELEVANTES",
      title: "Onde clicar para cada coisa",
      blocks: [
        { kind: "table", head: ["Rota", "Para quem", "O que faz"], rows: [
          ["/admin/crm → Company detail", "Mundus Admin", "Criar/editar HQ, offices, plantas e mercados."],
          ["/admin/crm → Company detail → aba Team", "Mundus Admin / Master", "Convidar usuários e definir escopo (office / HQ / Director)."],
          ["/supplier/requests (aba Unassigned)", "HQ Member / Director / Admin", "HQ Inbox — atribuir requests aos offices."],
          ["/supplier/requests (aba Assigned)", "Operator / HQ / Director", "Office Inbox — responder a demanda."],
          ["/supplier/rollup", "Supplier Global Director", "KPIs consolidados por office da família."],
          ["/supplier/cuts/compare", "Supplier Global Director", "Preço da família vs banda de mercado anonimizada."],
          ["/buyer/requests/new", "Buyer + Buyer Global Director", "Criar request; Director vê seletor de office."],
        ]},
      ],
    },
    {
      kicker: "10 — CHANGELOG",
      title: "Histórico do documento",
      blocks: [
        { kind: "lede", text: "Registre aqui toda mudança estrutural no modelo (novo papel, mudança de RLS, nova função de roteamento)." },
        {
          kind: "table",
          head: ["Data", "Alteração"],
          rows: MULTIOFFICE_CHANGELOG.map((e) => [e.date, e.change]),
        },
      ],
    },
  ],
};

export const CONTENT: Record<Lang, DocContent> = { pt: doc, en: doc, es: doc, zh: doc };

export function MultiOfficeDocument({ scrollTarget }: { scrollTarget?: string | null }) {
  return <AdminDocView content={CONTENT} scrollTarget={scrollTarget} />;
}