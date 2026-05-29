import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

export type ChangelogEntry = { date: string; section: string; change: string };

/**
 * Histórico de versões deste documento.
 * Adicione uma nova linha SEMPRE que atualizar uma seção.
 * Mantenha em ordem cronológica decrescente (mais recente primeiro).
 */
export const PLATFORM_CHANGELOG: ChangelogEntry[] = [
  { date: "2026-05-29", section: "13 — Changelog", change: "Criada a seção de versões/changelog do documento." },
  { date: "2026-05-29", section: "Documentação", change: "Adicionado Relatório de Gaps e busca por palavras-chave na aba de docs." },
];

const doc: DocContent = {
  tagline: "Documentação técnica e funcional da plataforma Mundus",
  hero: "Como a Mundus funciona, papel a papel, tela a tela, regra a regra.",
  badge: "DOCUMENTO INTERNO | EQUIPE MUNDUS | 2026",
  print: "Imprimir / Salvar PDF",
  footer_kicker: "Mundus Trade",
  footer_lines: [
    "Mundus Trade LLC — Ocoee, Florida, USA",
    "Documento vivo · atualize sempre que houver mudança em rota, módulo, regra de negócio ou edge function",
    "Fonte: leitura direta do código (src/ e supabase/functions/).",
  ],
  signature: "MUNDUS | DOCUMENTAÇÃO DA PLATAFORMA | 2026",
  sections: [
    // ── 1. VISÃO GERAL ─────────────────────────────────────────────
    {
      kicker: "01 — VISÃO GERAL",
      title: "O que é a Mundus",
      blocks: [
        { kind: "lede", text: "A Mundus é um marketplace B2B global para exportação e importação de proteínas animais, conectando frigoríficos (suppliers) e compradores internacionais (buyers) sem intermediação comercial." },
        { kind: "p", text: "A plataforma é uma web app React/Vite com backend Supabase (Auth, Postgres com RLS, Edge Functions e Storage). Também é distribuída como app nativo iOS e Android via Capacitor, com PWA habilitado." },
        { kind: "h3", text: "Proteínas suportadas" },
        { kind: "ul", items: [
          "Beef, Pork, Poultry, Lamb, Ovine e Veal (src/lib/proteins.ts).",
          "Beef e Pork têm nomenclatura adicional US/IMPS (alterna no Create Offer e Create Request).",
          "O catálogo visível depende do supplier_protein_profile da empresa; quando vazio, aplica-se o default (Beef, Pork, Poultry, Lamb).",
        ]},
        { kind: "h3", text: "Papéis da plataforma" },
        { kind: "cards3", items: [
          { t: "Buyer", d: "Importador/trader. Vê o marketplace, cria Offer Requests, dá bids, negocia, fecha pedido e acompanha shipping." },
          { t: "Supplier", d: "Frigorífico. Publica ofertas (Offers), recebe bids, contrapropõe, fecha vendas e responde a Requests dos buyers." },
          { t: "Admin Mundus", d: "Equipe interna. Gerencia empresas, prospects, CRM, BI, finance, outreach e pode atuar em nome de suppliers gerenciados." },
        ]},
        { kind: "callout", text: "Existem ainda áreas públicas sem login: signup, aceite de convite (/invite/:token), resposta de supplier por token (/respond/:token) e Shipping Instructions (/shipping-instructions/:token)." },
      ],
    },

    // ── 2. ARQUITETURA & STACK ─────────────────────────────────────
    {
      kicker: "02 — ARQUITETURA",
      title: "Stack & arquitetura",
      blocks: [
        { kind: "table", head: ["Camada", "Tecnologia", "Observações"], rows: [
          ["Frontend", "React 18 + Vite 5 + TypeScript 5", "TanStack Query para data fetching e cache."],
          ["UI", "Tailwind + shadcn/ui + CSS modulares em src/styles/", "Tokens HSL via index.css; tema light."],
          ["i18n", "i18next (en, pt, es, fr, zh)", "src/i18n/locales/*.json."],
          ["Mobile/Native", "Capacitor (iOS + Android) + PWA", "android/, ios/, public/manifest.json."],
          ["Backend", "Supabase (Postgres + RLS + Auth + Storage + Realtime + Edge Functions Deno)", "Projeto referenciado como ‘Lovable Cloud’ ao usuário final."],
          ["E-mail", "Resend via edge function send-email", "Templates HTML em src/lib/emailTemplates.ts e fila em email_queue."],
          ["Realtime", "Supabase Realtime", "Usado em notificações in-app e Mundus Whats."],
        ]},
        { kind: "h3", text: "Autenticação & redirect inicial" },
        { kind: "ol", items: [
          { t: "Login via Supabase Auth", d: "src/pages/Login.tsx e src/contexts/AuthContext.tsx." },
          { t: "RoleRedirect decide a home", d: "Após login, o componente RoleRedirect (src/App.tsx → rota /) detecta o papel ativo (lib/activeRole.ts + has_role/is_mundus_admin) e redireciona para /buyer, /supplier ou /admin." },
          { t: "Guards de rota", d: "RequireAuth protege todas as áreas autenticadas; RequireAdmin (src/components/RequireAdmin.tsx) protege /admin checando useIsMundusAdmin." },
          { t: "Backfill de company_id", d: "useCurrentCompany faz fallback em 3 níveis (users.company_id → active_company_id → company_users) e backfilla o vínculo automaticamente." },
        ]},
      ],
    },

    // ── 3. PAPÉIS & PERMISSÕES ─────────────────────────────────────
    {
      kicker: "03 — PAPÉIS",
      title: "Papéis, perfis e permissões",
      blocks: [
        { kind: "table", head: ["Papel / role", "O que pode fazer", "Como é protegido"], rows: [
          ["buyer (company role)", "Acessar /buyer/*, criar requests, dar bids, negociar e fechar pedidos.", "RequireAuth + RLS por buyer_company_id em offers/orders/negotiations."],
          ["supplier (company role)", "Acessar /supplier/*, publicar offers, responder requests, contrapropor, encerrar vendas.", "RequireAuth + RLS por supplier_id; políticas em offer_items / freight_options / offer_markets."],
          ["master_buyer / master_supplier", "Gerencia usuários da empresa, troca papéis, aprova convites.", "is_company_master(_company_id) RPC."],
          ["mundus_admin", "Visão total + atua em nome de suppliers gerenciados (Mundus Managed).", "is_mundus_admin() RPC + RequireAdmin no front."],
          ["mundus_ops / mundus_sales / mundus_support", "Variações operacionais do admin.", "Mesma proteção; ROLE_OPTIONS em AdminTeam.tsx."],
          ["Operator/Export Manager/Quality/Logistics", "Perfis funcionais dentro de uma empresa.", "company_users.role e permissões aplicadas em UI."],
        ]},
        { kind: "callout", text: "Trigger tg_company_users_block_admin_escalation impede que usuários não-admin se atribuam roles ‘mundus_*’. Trigger tg_users_prevent_identity_change bloqueia troca de company_id/email por terceiros." },
      ],
    },

    // ── 4. MÓDULO BUYER ────────────────────────────────────────────
    {
      kicker: "04 — BUYER",
      title: "Módulo Buyer (/buyer/*)",
      blocks: [
        { kind: "p", text: "Cada rota abaixo está mapeada em src/App.tsx e usa o layout BuyerShell." },
        { kind: "table", head: ["Rota", "Tela", "Ações principais"], rows: [
          ["/buyer", "Home", "KPIs do comprador, atalhos para Marketplace e Requests, greeting com indicador pulsante."],
          ["/buyer/offers e /buyer/marketplace", "Listagem de ofertas", "Filtros por proteína/país/incoterm; cards mostram supplier_name, view_count real e tooltips de destinations/incoterms."],
          ["/buyer/offers/:id", "Offer Detail", "Layout 3 colunas (foto, centro, sidebar). Botão ‘Place Bid’ abre BidModal."],
          ["/buyer/requests", "Minhas requisições", "Lista de Offer Requests do buyer."],
          ["/buyer/requests/new", "Create Request", "Wizard: protein, cuts, qty/container, destination country + destination port (dependente do país), incoterm, target price. Submit grava em buyer_requests."],
          ["/buyer/requests/:editId/edit", "Editar Request", "Mesma tela em modo edição."],
          ["/buyer/requests/:id", "Request Detail", "Mostra ofertas vinculadas (offers.request_id) e status de fulfillment."],
          ["/buyer/negotiations e /buyer/negotiations/:id", "Negociações", "Lista com filtros via bottom sheet em mobile; detalhe mostra Price Trail completo."],
          ["/buyer/orders e /buyer/orders/:id", "Pedidos", "Status segundo lib/orderStatus.tsx; shipping instructions linkadas por token."],
          ["/buyer/chat e /buyer/chat/:conversationId", "Chat", "Habilitado a partir da rodada 3 da negociação (negotiationEngine.CHAT_ENABLED_FROM_ROUND)."],
          ["/buyer/procurement-intelligence", "BI do comprador", "Insights de demanda e preço."],
          ["/buyer/users", "Equipe", "Gerenciamento de usuários da empresa (somente master)."],
          ["/buyer/company", "My Company", "Perfil + endereços com Google Places autocomplete; adicionar location grava em company_locations (não cria nova company)."],
        ]},
        { kind: "h3", text: "Fluxo: criar Offer Request" },
        { kind: "ol", items: [
          { t: "Buyer abre /buyer/requests/new", d: "Seleciona proteína e nomenclatura (Global ou US IMPS quando aplicável)." },
          { t: "Adiciona cuts", d: "Cada cut com bone_spec (Bone-in/Boneless/Offals), unit_weight (kg/lb), quantidade e target price." },
          { t: "Logística", d: "Escolhe incoterm (FOB/CFR/CIF/EXW), país de destino e porto de destino (dropdown filtrado por country_id)." },
          { t: "Submit request", d: "Grava em buyer_requests + items; gera número R-000000-AAAA (lib/requestNumber.ts) e dispara notificações para suppliers compatíveis." },
        ]},
      ],
    },

    // ── 5. MÓDULO SUPPLIER ─────────────────────────────────────────
    {
      kicker: "05 — SUPPLIER",
      title: "Módulo Supplier (/supplier/*)",
      blocks: [
        { kind: "table", head: ["Rota", "Tela", "Ações principais"], rows: [
          ["/supplier", "Home", "KPIs de vendas, ofertas ativas, requests pendentes."],
          ["/supplier/offers", "Minhas ofertas", "Lista com status (draft, published, sold_out, expired)."],
          ["/supplier/offers/new", "Create Offer (wizard 5 passos)", "Ver detalhamento abaixo."],
          ["/supplier/offers/:id", "Offer Detail", "Edit/Clone, OfferDestinationPorts, More information expansível."],
          ["/supplier/auctions e /supplier/auctions/create", "Leilões", "Variação da oferta como leilão (auction_opp_number gerado por trigger)."],
          ["/supplier/requests e /supplier/requests/:id", "Requests recebidos", "Mostra Offer Requests dos buyers compatíveis com o perfil."],
          ["/supplier/sales e /supplier/sales/:id", "Vendas", "Ofertas que viraram pedido."],
          ["/supplier/negotiations e /supplier/negotiations/:id", "Negociações", "Detalhe inclui OtherBidsPanel com melhor bid dos outros buyers."],
          ["/supplier/insights/price-benchmark e /supplier/insights/analytics", "Insights", "Comparativo de preço e analytics próprios."],
          ["/supplier/offices", "Plants/Offices", "Cada office pode ter plant_numbers próprios."],
          ["/supplier/users e /supplier/company", "Equipe e perfil", "Igual buyer."],
        ]},
        { kind: "h3", text: "Wizard Create Offer (SupplierCreateOffer.tsx)" },
        { kind: "ol", items: [
          { t: "Passo 1 — Unit", d: "Escolha de unidade base (kg ou lb). Trava a oferta inteira nessa unidade para inputs; storage interno sempre em kg." },
          { t: "Passo 2 — Product Details", d: "Adicionar linhas: foto, protein, cut (combobox com thumbnails, filtrado pelo protein_profile), spec auto-preenchido (Bone-in/Boneless/Offals), packing (Vacuum/Bulk/Master Carton/etc.), plant # (dropdown vindo do profile + offices), qty por container, asking price, floor price, notes. Marbling/Grade só para suppliers US." },
          { t: "Passo 3 — Sales Terms & Pricing", d: "Incoterm permitido (FOB/CFR/CIF/EXW; CFR e CIF mutuamente exclusivos), freight_per_kg, insurance_per_kg, total_fcl (até 20 containers), tipo de container (20'/40' com auto-upgrade)." },
          { t: "Passo 4 — Logistics & Shipping", d: "Origin Port (filtrado pelo país do supplier), Destination Markets (offer_markets) com portos por país, freight options (freight_options)." },
          { t: "Passo 5 — Attachments & Review", d: "Upload de docs; revisão final. Botão ‘Publish’ executa em 6 steps: (1) offers, (2) customer_products via RPC resolve_customer_product, (3) offer_items, (4) offer_allowed_incoterms, (5) offer_markets, (6) freight_options. Se algum step falha, faz rollback do offer órfão." },
        ]},
        { kind: "h3", text: "Distribuir oferta (DistributeOfferModal)" },
        { kind: "ul", items: [
          "Publish to Marketplace — visível para todos os buyers compatíveis.",
          "Specific Customers — restringe a uma lista escolhida.",
          "Send to all customers — dispara para a base de clientes do supplier.",
        ]},
      ],
    },

    // ── 6. MÓDULO ADMIN ───────────────────────────────────────────
    {
      kicker: "06 — ADMIN",
      title: "Módulo Admin Mundus (/admin/*)",
      blocks: [
        { kind: "p", text: "Navegação em src/pages/admin/AdminShell.tsx; cada grupo abaixo aparece no sidebar do admin." },
        { kind: "h3", text: "OVERVIEW & BI" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/dashboard", "KPIs gerais da plataforma em tempo real."],
          ["/admin/analytics", "Analytics operacional (sessões, tráfego)."],
          ["/admin/bi", "Executive Overview consolidado (GMV, receita projetada 0,30%, run-rate, mix de proteína)."],
          ["/admin/bi/market", "Market Intelligence: GMV, trend de preço, top cuts."],
          ["/admin/bi/negotiations", "Funnel: Offers → Negs → Accepted → Orders, settled GMV, avg time to close, top suppliers."],
          ["/admin/bi/demand", "Buyer Demand: requests vs fulfilled, top destinations, cuts mais pedidos."],
        ]},
        { kind: "h3", text: "OPERATIONS" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/companies e /admin/companies/:id", "Lista e detalhe de empresas. Detalhe espelha layout de Prospects (avatar header, inline edit, status chips). Toggle ‘Mundus Managed Supplier/Buyer’ habilita atuação por procuração."],
          ["/admin/user-requests", "Aprovação de cadastros pendentes (badge no menu mostra pendentes)."],
          ["/admin/offer-requests", "Lista de Buyer Requests; botão ‘📝 Create Offer’ inicia Path 3 (admin cria offer em nome de supplier gerenciado a partir do request)."],
          ["/admin/offers", "Todas as ofertas da plataforma."],
          ["/admin/deals", "Todos os pedidos."],
          ["/admin/negotiations", "Visão admin agrupada por offer_id com clusters colapsáveis."],
          ["/admin/create-offer", "Cria offer em nome de outra empresa (passa ?as_company=)."],
        ]},
        { kind: "h3", text: "CRM & PROSPECTING" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/crm/prospects", "Lista de prospects + tab C-Level com domain match."],
          ["/admin/crm/prospects/:id", "Detalhe com Enrich (Apollo) e ações de qualificação."],
          ["/admin/crm/pipeline", "Kanban ou List view; smart filters (search, stage, country, owner, date)."],
          ["/admin/crm/meeting-prep/:companyId", "Briefing gerado por IA (edge function generate-meeting-prep)."],
          ["/admin/prospect/companies | /people | /lists", "Busca de empresas e contatos + listas curadas."],
        ]},
        { kind: "h3", text: "MARKETPLACE" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/marketplace/products", "Catálogo de cuts; Create/Edit Cut com bone_spec, unit_weight, IMPS."],
          ["/admin/marketplace/markets", "Mercados/países servidos."],
          ["/admin/marketplace/ports", "Portos; mostra ⚠️ em ports duplicados por city/country."],
        ]},
        { kind: "h3", text: "OUTREACH & E-MAIL" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/outreach", "Outreach Center com inteligência de matching real (useOutreachIntelligence)."],
          ["/admin/outreach/campaigns", "Campanhas conectadas a prospects vivos."],
          ["/admin/outreach/templates e /admin/settings/email", "Templates e settings do provedor."],
          ["/admin/email-activity", "Dashboard de opens/clicks via pixel + redirect (edge function email-track)."],
          ["/admin/email-queue e /admin/email-preview", "Fila de envio e preview de templates."],
        ]},
        { kind: "h3", text: "FINANCE" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/finance/revenue", "Status Due → Invoiced → Received; Estimated Revenue = Total × 0,30%."],
          ["/admin/finance/commissions", "Coming soon."],
        ]},
        { kind: "h3", text: "COMMUNICATION & SETTINGS" },
        { kind: "table", head: ["Rota", "Função"], rows: [
          ["/admin/whats/*", "Mundus Whats — Conversas/Contatos/Tarefas/Macros/Análises/Configurações (port do projeto Zap_WmsFoods, integração Evolution API)."],
          ["/admin/settings/team", "Gestão de admins Mundus (mundus_admin/ops/sales/support)."],
          ["/admin/settings/audit", "Audit log de ações sensíveis."],
          ["/admin/settings/flags", "Feature flags."],
          ["/admin/import", "Wizard de import (CSV) — buyers, suppliers, c-level prospects, multi-contact grouping."],
          ["/admin/docs", "Esta documentação."],
        ]},
      ],
    },

    // ── 7. PÚBLICO (SEM LOGIN) ────────────────────────────────────
    {
      kicker: "07 — PÚBLICO",
      title: "Áreas públicas (sem login)",
      blocks: [
        { kind: "table", head: ["Rota", "O que faz"], rows: [
          ["/signup", "Wizard de cadastro em 5 passos (empresa, perfil, contatos, proteínas, confirmação). Cria company + master user; gera notificação em /admin/user-requests."],
          ["/signup/success", "Tela de sucesso pós-signup."],
          ["/signup/partner", "Cadastro especial de partner (CRM Pipeline)."],
          ["/invite/:token", "Aceite de convite de equipe — chama accept_team_invitation RPC e cria/linka company_users."],
          ["/respond/:token", "Página onde o supplier responde a um request sem precisar logar (token único)."],
          ["/shipping-instructions/:token", "Formulário público para coletar shipping instructions; submit via edge function shipping-instructions-submit."],
          ["/shipping-instructions/print/:requestId", "Versão imprimível das instruções aprovadas."],
        ]},
      ],
    },

    // ── 8. REGRAS DE NEGÓCIO ──────────────────────────────────────
    {
      kicker: "08 — REGRAS DE NEGÓCIO",
      title: "Regras críticas implementadas",
      blocks: [
        { kind: "h3", text: "Regra central — Container / FCL" },
        { kind: "callout", text: "Toda quantidade declarada por cut é POR CONTAINER ÚNICO (por FCL). ‘N FCLs’ significa N containers idênticos com o mesmo mix. A barra de capacidade usa SEMPRE a capacidade de um único container como denominador — NUNCA multiplique pelo número de containers." },
        { kind: "table", head: ["Tipo", "Capacidade por container", "Comportamento"], rows: [
          ["20ft", "13.000 kg (lib/units.ts trata 14.000 como teto duro)", "Auto-upgrade para 40ft quando o mix excede a capacidade do 20ft."],
          ["40ft", "28.000 kg", "Hard cap por container."],
          ["Total FCL", "Até 20 containers por offer", "Definido no passo 3 do Create Offer."],
        ]},
        { kind: "p", text: "Volume total da oferta = (soma dos itens de um container) × total_fcl. A UI mostra o volume por container para o usuário entender o ‘molde’." },
        { kind: "callout", text: "VALOR. ‘Total Value / per FCL’ = soma(qty_por_item × preço_por_kg) de UM container. NUNCA divida esse valor por total_fcl. O total do inventário disponível é per-FCL × total_fcl. Vale para Supplier, Buyer e Admin." },

        { kind: "h3", text: "Unidades kg / lbs (src/lib/units.ts)" },
        { kind: "ul", items: [
          "Storage SEMPRE em kg. ‘lbs’ é só preferência de display/input.",
          "Conversões: KG_PER_LB = 0,45359237; LB_PER_KG = 2,20462262185 (NIST).",
          "Helpers: toDisplay, fromDisplay, fmtWeight, fmtPrice, weightLabel, priceLabel.",
          "A escolha feita no passo 1 do Create Offer trava a unidade de entrada do wizard inteiro.",
        ]},

        { kind: "h3", text: "Incoterms & preço efetivo (src/lib/incotermPricing.ts)" },
        { kind: "table", head: ["Incoterm", "Add-on aplicado", "Quem paga frete/seguro"], rows: [
          ["FOB", "0", "Buyer (frete e seguro)."],
          ["EXW", "0", "Buyer arca com tudo (incluindo inland)."],
          ["CFR / CNF / C&F", "+ freight/kg", "Supplier inclui frete; seguro com o buyer."],
          ["CIF", "+ freight/kg + insurance/kg", "Supplier inclui frete e seguro."],
        ]},
        { kind: "p", text: "CFR e CIF são mutuamente exclusivos na oferta. stripIncotermAdjustment converte um preço efetivo de volta para FOB quando o supplier avalia um bid CFR/CIF." },

        { kind: "h3", text: "Motor de negociação (src/lib/negotiationEngine.ts + supabase/functions/_shared/negotiation/*)" },
        { kind: "ul", items: [
          "MAX_DISPLAY_ROUNDS = 4 rodadas exibidas; MAX_RAW_ROUNDS = 8 (cada rodada exibida = bid + counter = 2 raw).",
          "CHAT_ENABLED_FROM_ROUND = 3 — chat livre só a partir da rodada 3.",
          "EXPIRATION_HOURS = 24h por rodada; supplier pode customizar via supplier_negotiation_settings.",
          "Direção de preço travada: buyer NUNCA pode baixar bid; supplier NUNCA pode subir counter (validateBuyerBidDirection / validateSupplierCounterDirection).",
          "Round 1 — Bid mínimo deve ser ≥ 70% do asking. Round 4 mostra banner de ‘Final’.",
          "‘Accept’ fecha no valor da CONTRAPARTE — RPC accept_negotiation rejeita aceitar a própria última rodada (cannot_accept_own_round).",
          "Estratégias por rodada: firstRound / secondRound / thirdRound (decidem o counter sugerido para o supplier)." ,
          "Feedback de bulk apply: fair (≤4%), high (≤10%), aggressive (≤20%), extreme (>20%).",
          "Submit inicial usa RPC submit_initial_bid (SECURITY DEFINER, atômico: negotiation + round_proposal + cut_rounds + token).",
          "Submit de rodada subsequente: RPC submit_negotiation_round.",
          "Edge function nudge-stale-negotiations cutuca negociações paradas; negotiation-notifications dispara avisos para buyer/supplier.",
        ]},

        { kind: "h3", text: "Numeração e status" },
        { kind: "table", head: ["Recurso", "Formato / Origem"], rows: [
          ["Offer", "M-NNNNNN-AAAA (lib/offerNumber.ts)."],
          ["Request", "R-NNNNNN-AAAA (lib/requestNumber.ts)."],
          ["Auction", "MDS-A#NNNNN (trigger generate_auction_opp_number)."],
          ["Order status", "17 estados em lib/orderStatus.tsx (do pending_supplier ao completed, com legacy aliases)." ],
          ["Negotiation status", "awaiting_supplier, pending_buyer_review, bid_accepted, offer_rejected, expired."],
        ]},

        { kind: "h3", text: "Notificações" },
        { kind: "ul", items: [
          "In-app: tabela app_notifications + hook useAppNotifications + NotificationBell (realtime).",
          "Preferências por usuário em notification_preferences.",
          "E-mail: 13 templates HTML (src/lib/emailTemplates.ts) → fila email_queue → edge function send-email (Resend; from ‘Mundus Trade <noreply@mundustrade.com>’).",
          "Tracking: open pixel + click redirect via edge function email-track (atualiza opened_at/clicked_at via RPC track_email_open/click).",
        ]},

        { kind: "h3", text: "Distribuição de oferta" },
        { kind: "p", text: "Definida no Create Offer e via DistributeOfferModal: Marketplace público, lista específica de buyers ou base inteira de customers. Cada destinatário recebe notificação in-app; e-mails só são disparados nos eventos transacionais cobertos pelos templates." },
      ],
    },

    // ── 9. MODELO DE DADOS ────────────────────────────────────────
    {
      kicker: "09 — DADOS",
      title: "Modelo de dados (principais tabelas)",
      blocks: [
        { kind: "p", text: "Nomes conferidos em src/integrations/supabase/types.ts e migrations. RLS ligada em todas as tabelas user-facing." },
        { kind: "table", head: ["Tabela", "Função", "Relacionamentos chave"], rows: [
          ["companies", "Empresas (buyer/supplier).", "1↔N users, offices, company_users, offers, buyer_requests."],
          ["company_locations", "Endereços/plantas adicionais (factory, warehouse, sales office).", "FK company_id; carrega plant_numbers extras."],
          ["company_offices", "Offices/branches da empresa.", "FK company_id."],
          ["users", "Perfil do usuário (espelha auth.users via id).", "company_id + active_company_id."],
          ["company_users", "Vínculo N:N user↔company com role (master_buyer, master_supplier, mundus_admin etc.).", "Bloqueio de escalada de papel via trigger."],
          ["roles", "Catálogo de roles canônicos.", "Usado por has_role / is_mundus_admin."],
          ["team_invitations", "Convites enviados; aceitos via RPC accept_team_invitation.", "FK company_id."],
          ["offers + offer_items", "Oferta e itens (cuts).", "FK supplier_id, request_id, customer_product_id."],
          ["offer_allowed_incoterms / offer_markets / freight_options", "Detalhes da oferta.", "FK offer_id."],
          ["buyer_requests + items", "Offer Requests do buyer.", "FK buyer_company_id; ligado a offers via request_id."],
          ["negotiations", "Negociação por offer × buyer.", "FK offer_id, buyer_company_id; agregado em orders ao aceitar."],
          ["round_proposals + cut_rounds + counter_proposals", "Histórico completo de rodadas, com preços por cut e contra-propostas geradas pelo motor.", "FK em cadeia até negotiations."],
          ["negotiation_tokens", "Token para acesso público (supplier respond).", "FK negotiation_id."],
          ["orders + order_items", "Pedidos fechados.", "FK buyer_company_id, offer_id, negotiation_id."],
          ["shipments + shipping_instructions + shipment_containers", "Logística e instruções de embarque.", "FK order_id."],
          ["product_categories + standard_products + customer_products + cuts", "Catálogo (global e por empresa).", "RPC resolve_customer_product cria/encontra na publicação."],
          ["markets + countries + ports", "Geografia comercial.", "Ports usados em destination/origin."],
          ["app_notifications + notification_preferences", "Notificações in-app.", "Realtime."],
          ["email_queue", "Fila de e-mails + tracking.", "Templates em src/lib/emailTemplates.ts."],
          ["audit_log", "Log de ações sensíveis.", "Escrito via lib/auditLog.ts."],
          ["feature_flags", "Toggles operacionais.", "Lido por hooks/UI."],
          ["prospects + crm_companies + crm_contacts + mundus_partners", "CRM e prospecting.", "Apollo enrich + import."],
          ["mw_* (Mundus Whats)", "Conversas, contatos, tarefas, macros, instâncias.", "Integração Evolution API."],
        ]},
      ],
    },

    // ── 10. EDGE FUNCTIONS ────────────────────────────────────────
    {
      kicker: "10 — EDGE FUNCTIONS",
      title: "Edge functions (supabase/functions/*)",
      blocks: [
        { kind: "table", head: ["Função", "O que faz / quem dispara"], rows: [
          ["accept-counter", "Buyer aceita o counter do supplier; cria order. Disparada do front."],
          ["propose-counter", "Supplier propõe counter usando o motor (strategies)."],
          ["reject-counter", "Buyer rejeita counter; encerra negociação."],
          ["negotiation-notifications", "Envia notificações in-app/e-mail a cada movimento de rodada."],
          ["nudge-stale-negotiations", "Cron — cutuca negociações paradas perto do prazo."],
          ["parse-request-cuts", "Parser IA (Lovable AI) que converte texto colado em itens de Offer Request."],
          ["send-email", "Envia e-mail via Resend (from noreply@mundustrade.com)."],
          ["email-track", "Pixel de abertura + redirect de click; atualiza email_queue."],
          ["send-team-invite", "Dispara convite de equipe (Resend) com link /invite/:token."],
          ["verify-email", "Verifica token de e-mail no signup."],
          ["verify-document", "Verifica documento enviado."],
          ["extract-bl", "Extrai dados de Bill of Lading (IA)."],
          ["scan-business-card", "Camera + Gemini 2.0 Flash; auto-preenche modais de criação."],
          ["prospect-enrich", "Enriquecimento via Apollo."],
          ["prospect-search", "Busca de prospects."],
          ["prospect-phone-webhook", "Webhook de captura de telefone do prospect."],
          ["generate-meeting-prep", "Briefing de reunião gerado por IA."],
          ["signup-notifications", "Notifica admins quando há novo signup."],
          ["shipping-instructions-send-link", "Envia link público com token para o buyer preencher SI."],
          ["shipping-instructions-submit", "Recebe e valida submissão pública das SI."],
          ["shipping-instructions-validate", "Valida token/conteúdo das SI."],
          ["shipping-instructions-notify-approved", "Notifica partes quando SI é aprovada."],
        ]},
      ],
    },

    // ── 11. FLUXOS PONTA-A-PONTA ──────────────────────────────────
    {
      kicker: "11 — FLUXOS",
      title: "Fluxos ponta-a-ponta",
      blocks: [
        { kind: "h3", text: "(a) Buyer → Request → Supplier responde com Offer" },
        { kind: "ol", items: [
          { t: "Buyer cria Request", d: "/buyer/requests/new → buyer_requests + items + número R-..." },
          { t: "Notificação", d: "Suppliers compatíveis veem em /supplier/requests; admin vê em /admin/offer-requests." },
          { t: "Supplier cria Offer a partir do Request", d: "/supplier/offers/new?from_request=<id> pré-preenche cuts; admin pode usar /admin/create-offer?as_company=<supplier>." },
          { t: "Buyer dá Bid", d: "BidModal chama RPC submit_initial_bid; chat libera no round 3." },
          { t: "Negociação", d: "Até 4 rodadas exibidas; preço por cut com direção travada." },
          { t: "Aceite", d: "RPC accept_negotiation cria orders + order_items e atualiza offer para sold_out se completar total_fcl." },
          { t: "Shipping", d: "Order avança nos 17 status; SI emitida via link público." },
        ]},
        { kind: "h3", text: "(b) Supplier publica Offer no Marketplace" },
        { kind: "ol", items: [
          { t: "Wizard 5 passos", d: "SupplierCreateOffer.tsx; publish em 6 steps com rollback." },
          { t: "Distribuição", d: "Marketplace / Specific Customers / Send to all customers." },
          { t: "Buyer abre offer", d: "RPC increment_offer_views atualiza view_count real." },
          { t: "Bid → Counter → Accept", d: "Mesmo motor de negociação." },
          { t: "Pré-pagamento → Produção → Embarque → Entrega", d: "Order avança pelos status; e-mails transacionais e nudges automatizados." },
        ]},
        { kind: "h3", text: "(c) Onboarding / Signup" },
        { kind: "ol", items: [
          { t: "Signup wizard (5 passos)", d: "Cria company + master user." },
          { t: "Pending approval", d: "Admin vê em /admin/user-requests (badge no menu)." },
          { t: "Aprovação", d: "Admin libera; sistema dispara notificação + e-mail." },
          { t: "Convites de equipe", d: "Master envia convite (send-team-invite); convidado aceita em /invite/:token (RPC accept_team_invitation)." },
        ]},
      ],
    },

    // ── 12. ROADMAP ───────────────────────────────────────────────
    {
      kicker: "12 — ROADMAP",
      title: "Roadmap & próximos passos",
      blocks: [
        { kind: "p", text: "A ser preenchido. O Relatório de Gaps (documento separado nesta mesma subtab Plataforma) consolidará o que ainda precisa ser organizado, refatorado ou implementado." },
        { kind: "callout", text: "Sempre que uma rota, regra ou edge function mudar, atualize este documento. A fonte de verdade é o código — este texto deve segui-lo." },
      ],
    },

    // ── 13. CHANGELOG ─────────────────────────────────────────────
    {
      kicker: "13 — CHANGELOG",
      title: "Versões & histórico de alterações",
      blocks: [
        { kind: "lede", text: "Use esta área para registrar QUANDO cada seção foi atualizada. A lista é renderizada a partir de PLATFORM_CHANGELOG (topo deste arquivo) — basta adicionar uma nova linha no array." },
        { kind: "callout", text: "Convenção: data no formato YYYY-MM-DD, identifique a seção alterada e descreva a mudança em uma frase curta. Mantenha a entrada mais recente no topo." },
        {
          kind: "table",
          head: ["Data", "Seção", "Alteração"],
          rows: PLATFORM_CHANGELOG.map((e) => [e.date, e.section, e.change]),
        },
      ],
    },
  ],
};

export const CONTENT: Record<Lang, DocContent> = { pt: doc, en: doc, es: doc, zh: doc };

export function PlatformDocDocument({ scrollTarget }: { scrollTarget?: string | null }) {
  return <AdminDocView content={CONTENT} scrollTarget={scrollTarget} />;
}