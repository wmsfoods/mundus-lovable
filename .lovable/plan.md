## Parte 1 — Invite User real (Resend)

### Backend
Criar edge function `send-team-invite` em `supabase/functions/send-team-invite/index.ts` com:
- Validação de JWT do usuário chamador.
- Confere que o chamador é master da `company_id` (via `is_company_master`) ou Mundus admin.
- Cria/atualiza `auth.users` via `admin.inviteUserByEmail` (Service Role) gerando o link de aceite.
- Vincula `company_users.user_id` ao usuário criado.
- Gera token de aceite (UUID) com expiração de 7 dias na nova tabela `team_invitations` (já existe parcialmente — vou aproveitar).
- Envia email via gateway Resend (`https://connector-gateway.lovable.dev/resend`) com template HTML inline multilíngue (idioma vem do payload).
- Retorna `{ ok, invite_id, link }`.

Migration mínima:
- Garantir colunas `team_invitations.token`, `expires_at`, `accepted_at`, `language`.
- Função `accept_team_invite(token)` que move o usuário para `active`.

### Frontend
- `UserFormModal.tsx`: quando `mode=invite`, em vez de `INSERT` direto, chamar `supabase.functions.invoke('send-team-invite', { body: { ...payload, language: i18n.language } })`.
- Página `/invite/:token` para o convidado definir senha e ativar conta.
- Toast com retry e estado de loading no botão.

---

## Parte 2 — i18n: auditoria + execução em fases

### Estado atual
- 5 locales (`en, pt, es, fr, zh`) configurados.
- Apenas 33% dos componentes usam `t()`. Strings hardcoded espalhadas: labels, placeholders, toasts, headings, options de select, mensagens de validação.

### Estratégia
Convenção: cada módulo ganha um namespace dedicado em `src/i18n/locales/*.json` (ex.: `team.invite.*`, `negotiation.counter.*`). Profiles, status, e enums viram dicionários reutilizáveis (`enums.profile.master_buyer` etc).

### Fases (ordem de prioridade, cada fase é um turno separado)

```text
Fase 1 — Team & Users (alto impacto, baixo risco)
  UserFormModal, BuyerUsers, SupplierUsers, AdminTeam,
  CompanyTeamPanel, CompanyProfileSections, CompanyProfilePage,
  TradePreferencesSection, SupplierOffices
  ~140 strings

Fase 2 — Negotiation flow (crítico p/ buyers/suppliers)
  BidModal, CounterOfferModal, CounterOfferActions,
  BuyerNegotiationDetail, SupplierNegotiationDetail,
  OtherBidsPanel, negotiation hints/validators
  ~180 strings

Fase 3 — Create flows
  BuyerCreateRequest, SupplierCreateOffer, SupplierCreateAuction,
  CreateBuyerProfileModal, CreateCutModal, todos os modais de criação
  ~250 strings

Fase 4 — Marketplace / Orders / Shipment
  Offers, OfferDetail (buyer+supplier), OrderDetail, Orders,
  Requests, RequestDetail, ShipmentTracker, ShippingInstructions*
  ~200 strings

Fase 5 — CRM & Admin (volume maior, menos prioridade p/ clientes finais)
  CRMPipeline, AdminCompanyDetail, AdminProspects, OutreachCenter,
  OutreachCampaigns, OutreachTemplates, EmailSettings, AdminProducts,
  AdminRevenue, AdminOrders, AdminNegotiations, AdminAuditLog,
  AdminAnalytics, AdminDashboard, AdminImport, AdminUserRequests,
  partners/PartnersModule, FindCompanies, FindPeople, ListDetail
  ~600 strings

Fase 6 — Whats module (PT-BR fixo hoje)
  WhatsConversas, WhatsTarefas, WhatsMacros, WhatsContatos,
  WhatsConfiguracoes, WhatsAnalises, components/whats/*
  ~200 strings

Fase 7 — Auxiliares (modals públicos, settings, etc)
  prospect/SaveToCrmModal, supplier/TransferOffersModal,
  marketplace/OffersFilterBar, mundus/AddressAutocomplete,
  settings/NotificationPreferences, signup/*, public/Shipping*
  ~150 strings

Total estimado: ~1700 strings em ~150 arquivos.
```

### Padrão de qualidade por fase
1. Extrair toda string visível para namespace dedicado.
2. Adicionar chaves nos 5 locales (`en` como base; pt/es/fr/zh traduzidos).
3. Toasts e erros de validação também traduzidos.
4. Date/Number formatting respeita `i18n.language`.
5. Pluralização com `{count}`.

---

## Detalhes técnicos

**Edge function Resend (parte 1):**
- Template HTML simples (heading, CTA button, footer) com cores do brand (`hsl(var(--primary))` resolvido para hex).
- `from: 'Mundus Trade <noreply@notify.mundustrade.us>'` (ou domínio já verificado — vou conferir antes de codar).
- Idioma do email vem do `i18n.language` do chamador.
- Idempotência: token UUID único por convite.

**i18n (parte 2):**
- Novos arquivos: nada — só estendo `src/i18n/locales/*.json`.
- Helper opcional `tEnum(ns, value)` para enums.
- Lint regra: posso adicionar script de CI que detecta strings hardcoded suspeitas (`>[A-Z][a-z]{3,}<`) — opcional, sob confirmação.

---

## O que vou entregar agora (após sua aprovação do plano)

**Turno 1**: Parte 1 completa (Resend invite + página /invite/:token) + Fase 1 do i18n (Team & Users — incluindo o modal que você acabou de ver em chinês).

Demais fases entram em turnos separados pra eu não estourar contexto e você poder revisar incrementalmente.
