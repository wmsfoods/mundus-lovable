import { AdminDocView, type DocContent, type Lang } from "@/components/admin/docs/AdminDocRenderer";

const PT: DocContent = {
  tagline: "Admin Mundus · Platform",
  hero: "MCP Sample AI — Guia de uso do Mundus Admin MCP",
  badge: "MODE: READ + WRITE",
  sections: [
    {
      kicker: "Visão geral",
      title: "Como o admin conversa com o banco",
      blocks: [
        { kind: "lede", text: "Conector Mundus_MCP_ADMIN. O admin fala em linguagem natural com o Claude; o MCP lê e edita direto no banco de produção, com freios." },
        { kind: "cards2", items: [
          { t: "Modo atual", d: "Leitura + escrita liberadas via Claude." },
          { t: "Freios", d: "minimum_price nunca exposto. Denylist protege snapshots: round_proposals, cut_rounds, mcp_audit_log. Todo write registrado em mcp_audit_log." },
        ] },
        { kind: "callout", text: "Recomendação no Claude: tools de leitura em \"Sempre permitir\"; db_update e db_insert em \"Perguntar\"." },
      ],
    },
    {
      kicker: "Seção 1",
      title: "Perguntas de consulta",
      blocks: [
        { kind: "ul", items: [
          "Me dá um raio-x: quantas offers ativas, negociações abertas e pedidos por status.",
          "Lista as offers ativas do <fornecedor> com cuts e preço.",
          "Quais negociações estão em pending_confirmation e em que rodada cada uma está?",
          "Me mostra o pedido <número> completo (cuts, preço, incoterm, destino).",
          "Quais companies são buyers e ainda estão inactive?",
          "Lista os últimos 10 prospects criados.",
        ] },
      ],
    },
    {
      kicker: "Seção 2",
      title: "Diagnóstico",
      blocks: [
        { kind: "ul", items: [
          "Tem offer com FCL reservado mas sem negociação viva?",
          "Tem negociação passando da rodada 3?",
          "Quais offers ativas estão sem nenhum cut em offer_items?",
          "Tem company duplicada (mesmo tax_id ou nome)?",
        ] },
      ],
    },
    {
      kicker: "Seção 3",
      title: "Edição / operação",
      blocks: [
        { kind: "p", text: "Toda escrita pede confirmação no Claude antes de rodar." },
        { kind: "ul", items: [
          "Atualiza o status do pedido <X> para awaiting_pre_payment.",
          "Marca a offer <número> como inactive.",
          "Muda o shipment_month da offer <Y> para setembro/2026.",
          "Ativa o prospect <nome>.",
        ] },
      ],
    },
    {
      kicker: "Seção 4",
      title: "Auditoria",
      blocks: [
        { kind: "ul", items: [
          "Últimos 10 writes do MCP em mcp_audit_log.",
          "Quais alterações o MCP fez na tabela orders esta semana?",
        ] },
      ],
    },
    {
      kicker: "Seção 5",
      title: "Criar OFFERS",
      blocks: [
        { kind: "p", text: "Estrutura: 1 linha em offers + 1 linha em offer_items por cut. Catálogo de cuts vem de customer_products." },
        { kind: "h3", text: "Modelo rápido (1 cut)" },
        { kind: "code", text:
`Cria uma offer:
- Fornecedor: <empresa>
- Origem: <país>, porto <porto>
- Container: 40ft, 1 FCL
- Incoterm: CFR (frete não incluso)
- Embarque: agosto/2026
- Pagamento: 30% Advance, Balance TT
- Distribuição: marketplace = não, específico para <buyer>
- Halal: sim
Cuts:
  1) <cut> — <kg> — preço US$ <full> — floor US$ <min> — Frozen
Notas: <texto>` },
        { kind: "h3", text: "Modelo Mix FCL" },
        { kind: "code", text:
`Cria uma offer Mix FCL:
- Fornecedor: <empresa> | Origem: <país> / <porto> | 20ft, 1 FCL
- Incoterm: CIF | Embarque: junho/2026
Cuts (têm que somar a capacidade):
  1) <cut> — <kg> — US$ <full> — floor <min> — Frozen — marbling <grau>
  2) <cut> — <kg> — US$ <full> — floor <min> — Frozen — marbling <grau>` },
      ],
    },
    {
      kicker: "Seção 6",
      title: "Criar PROSPECTS",
      blocks: [
        { kind: "p", text: "Prospect = linha em companies com is_buyer = true." },
        { kind: "h3", text: "Criar 1 prospect" },
        { kind: "code", text:
`Cria um prospect (company buyer):
- Nome: <empresa>
- País: <país>
- Perfil de proteína: <Beef/Pork/Poultry/Lamb>
- Cuts preferidos: <lista>
- Status: prospect / inactive` },
        { kind: "h3", text: "Importar vários" },
        { kind: "code", text:
`Cria estes prospects (buyers):
Nome | País | Proteína
Acme Importers | China | Beef
Delta Foods | UAE | Beef, Lamb` },
      ],
    },
    {
      kicker: "Referência",
      title: "Tabelas-chave",
      blocks: [
        { kind: "table", head: ["Tabela", "O que é"], rows: [
          ["offers", "A oferta."],
          ["offer_items", "Cuts da oferta (com minimum_price)."],
          ["customer_products", "Catálogo de produtos por empresa."],
          ["companies", "Buyers, suppliers e prospects."],
          ["mcp_audit_log", "Registro de todos os writes feitos pelo MCP."],
        ] },
      ],
    },
  ],
  footer_kicker: "Mundus Admin · MCP",
  footer_lines: [
    "Conector Claude: Mundus_MCP_ADMIN",
    "Auditoria: tabela mcp_audit_log",
  ],
  signature: "MUNDUS TRADE · INTERNAL DOCUMENT",
  print: "Imprimir",
};

const CONTENT: Record<Lang, DocContent> = { pt: PT, en: PT, es: PT, zh: PT };

export default function AdminDocsPlatform() {
  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <AdminDocView content={CONTENT} />
    </div>
  );
}