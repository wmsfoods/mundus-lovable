## Objetivo

Fazer um levantamento **end-to-end** de todas as notificações do sistema (email, sino in-app no canto superior direito, push mobile), entregar o resultado em PDF + HTML navegável, e criar uma página no Admin Docs onde você possa consultar e (futuramente) editar tudo num só lugar.

---

## O que já mapeei no código

**3 canais ativos:**

```text
┌─────────────────────────────────────────────────────────────┐
│  EVENTO (bid, signup, deal, etc.)                           │
│        │                                                    │
│        ├──► EMAIL (HTML)  via edge fn send-email            │
│        │       templates em src/lib/emailTemplates.ts       │
│        │                                                    │
│        ├──► IN-APP (sino) via RPC enqueue_app_notifications │
│        │       tabela app_notifications + realtime          │
│        │       hook useAppNotifications + NotificationBell  │
│        │                                                    │
│        └──► PUSH (FCM/APNs) via trigger AFTER INSERT        │
│                em app_notifications → send-push edge fn     │
└─────────────────────────────────────────────────────────────┘
```

**Templates de email já existentes (19):** welcome, passwordReset, newOffer, newRequest, bidReceived, counterReceived, dealClosed, dealAwaitingConfirmation, negotiationRejected, orderStatusUpdate, staleNudge, offerShared, customerInvitation, weeklyDigest, publicLeadCaptured, scl_invite_existing, scl_invite_signup, scl_direct_offer, scl_all_customers_offer — mais o `buildViaMundusEmail` (mensagens via Mundus).

**Edge functions que disparam notificações:** signup-notifications, negotiation-notifications, nudge-stale-negotiations, shipping-instructions-notify-approved, shipping-instructions-send-link, send-via-mundus, public-lead-notify, send-team-invite, accept-team-invite, admin-create-team-member, delete-team-member, send-password-reset, stripe-webhook, resend-webhook.

**Call sites frontend:** BidModal, CounterOfferModal, CounterOfferActions, RejectNegotiationModal, closeDeal, useInviteBuyer.

---

## Entregáveis

### 1. Catálogo mestre (PDF + HTML)

Para cada notificação, uma ficha contendo:

- **ID / nome interno** (ex: `bidReceived`)
- **Evento gatilho** (ex: "Comprador envia bid inicial em uma oferta")
- **Onde é disparada** (arquivo + função)
- **Canais usados** (Email ✓ / Sino ✓ / Push ✓ — quais dos três)
- **Destinatário(s)** (papel + como é resolvido — ex: contato primário do supplier)
- **Assunto do email** + **preheader**
- **Título e body do sino**
- **Título e body do push**
- **CTA / link de destino**
- **Variáveis dinâmicas** usadas
- **Preview renderizado do email** (HTML real, mesmo template usado em produção)

Saída:

- `notifications-catalog.pdf` — versão imprimível, uma ficha por página
- `notifications-catalog.html` — versão navegável com índice lateral e previews ao vivo dos emails (iframe sandbox)
- `email-previews/` — pasta com 1 `.html` por template, abrível direto no browser

Tudo gravado em `/mnt/documents/` (download direto pelo chat).

### 2. Página Admin → Docs → Emails & Notifications

Nova rota dentro do painel admin de docs existente:

- **Aba "Visão geral"** — diagrama dos 3 canais + tabela de cobertura (matriz: evento × canal)
- **Aba "Catálogo"** — mesma ficha do PDF, navegável, com preview do email renderizado num iframe
- **Aba "Cobertura"** — lista de eventos sem todos os canais (gaps de notificação)
- **Aba "Templates"** — lista os 19 templates, copy do assunto/preheader/body, link "Abrir preview"

Esta primeira versão é **read-only/documentação**. Edição inline dos templates fica para uma fase 2 (precisa decidir se queremos editor visual, MJML, ou só edição de variáveis — confirmaremos depois).

### 3. Relatório de gaps e inconsistências

Seção final do PDF apontando problemas que eu encontrar no levantamento, por exemplo:

- Eventos que mandam email mas não criam notificação no sino
- Eventos que criam sino mas não enviam email
- Templates definidos mas nunca chamados (dead code)
- Chamadas a templates inexistentes
- Diferenças de tom/copy entre canais para o mesmo evento

---

## Como vou executar (passos técnicos)

1. **Coletar fontes da verdade** — varrer `src/lib/emailTemplates.ts`, todas as edge functions de notificação, e todos os call sites de `sendEmailNotification` / `createNotification` / `notifyCompanyUsers` / `insertAppNotification*`.
2. **Montar um JSON estruturado** (`/tmp/notifications.json`) com uma entrada por evento × canal — esta é a fonte única usada pelo PDF, HTML e página Admin.
3. **Renderizar previews** dos 19 templates com dados de exemplo realistas (gerar HTML via o próprio `emailTemplates.ts` rodando em Node).
4. **Gerar PDF** via ReportLab/HTML→PDF a partir do mesmo JSON.
5. **Gerar HTML catalog** estático com índice lateral.
6. **Criar a página Admin** consumindo o mesmo JSON (committed em `src/data/notifications-catalog.ts`).

---

## Fora de escopo nesta fase

- Editor visual de templates de email (fase 2 — depende de decisão).
- Reescrita/redesign dos templates de email (você disse que vai dar as instruções depois, com base no catálogo).
- Sistema de preferências por usuário (já existe parcialmente em `notification_preferences`; não vou mexer agora).
- Internacionalização dos copies.

---

## Confirmações antes de começar

1. **Idioma do catálogo:** PT-BR (mesma língua que você está usando), correto? INgles e portugues
2. **PDF + HTML + página Admin** — quer os três, ou prefere começar só pelo PDF + HTML e a página Admin entra numa segunda rodada? Sim os 3
3. **Edição inline dos templates** (fase 2) — só registrando, vou tratar separado depois. OK