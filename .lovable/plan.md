# Confirmação em duas etapas (Accept → Confirm Deal)

Analisei o prompt vs o código atual. **Sem conflito bloqueante.** O engine atual (`accept_negotiation`, `submit_negotiation_round`, `reject_negotiation`) e os componentes de UI (`DealClosedBanner`, painel de bids, price history, agreed-items) seguem funcionando — vamos só dividir o accept em duas etapas e mover order/sold_out/emails pro confirm.

## Decisões confirmadas pelo usuário

- **Admin Act-on-Behalf:** quando o admin está atuando como managed em algum dos lados, ele **pode aceitar E confirmar sozinho** — fecha o deal direto. Vale para os dois casos: managed buyer ou managed supplier. A regra "counterparty confirma" só se aplica entre empresas reais não-managed.
- **FCL availability:** `pending_confirmation` **não** consome FCL. Offer só fica `sold_out` quando todos os FCLs viram `bid_accepted`. Enquanto pendente, outros buyers podem continuar fechando. A lógica atual em `useRemainingFcl` já trata `bid_accepted` como vendido e os ativos como "in negotiation" — vamos só garantir que `pending_confirmation` entre como `inNegotiation` (não como `sold`).

## Mudanças

### 1. Migration — schema + RPCs
- `ALTER TABLE negotiations`: estender CHECK de `status` pra incluir `pending_confirmation`.
- Adicionar colunas: `accepted_by text`, `accepted_by_user_id uuid`, `accepted_at timestamptz`, `accepted_total_value numeric(18,2)`, `accepted_round_proposal_id uuid`.
- **Reescrever `accept_negotiation(p_negotiation_id, p_user_id, p_accepted_by text)`** (nova assinatura, com `p_accepted_by` obrigatório `'buyer'|'supplier'`):
  - Mantém validação de status e guard `cannot_accept_own_round`.
  - Calcula `v_settled_total` igual hoje (a partir de `agreed_items` ou do último round).
  - **Não** cria order, **não** mexe em `offers.status`, **não** dispara emails.
  - Grava `status='pending_confirmation'`, `accepted_by`, `accepted_by_user_id`, `accepted_at=now()`, `accepted_total_value=v_settled_total`, `accepted_round_proposal_id=v_last_round_id`. Zera `expires_at`.
  - **Atalho admin-managed:** se a empresa que está sendo "aceita por" tem `mundus_managed_buyer/supplier=true` E `p_user_id` é mundus_admin (`is_mundus_admin()` no contexto do caller — passamos via flag), seta direto para `bid_accepted` chamando o helper de criação de order (extraído pra função interna `_finalize_negotiation_close`). Decisão: simplificar — admin sempre **pode** chamar o novo `confirm_negotiation` imediatamente após o accept; UI faz isso automaticamente quando detecta managed. Migration não precisa de lógica especial.
- **Novo `confirm_negotiation(p_negotiation_id, p_user_id)`** SECURITY DEFINER:
  - Exige `status='pending_confirmation'`.
  - Resolve company do `p_user_id`. Regra de autorização (uma das três):
    1. User pertence à empresa counterparty (a oposta a `accepted_by`).
    2. `is_mundus_admin(p_user_id)` E a empresa `accepted_by` tem `mundus_managed_*=true` (admin agindo on behalf, pode confirmar sozinho).
    3. `is_mundus_admin(p_user_id)` E a counterparty tem `mundus_managed_*=true` (admin fechando pelo outro lado).
  - Senão, rejeita com `not_counterparty`.
  - Executa a lógica atual de criação de order/order_items + `status='bid_accepted'` + `settled_total_value` + `settled_round_proposal_id` + sold_out check (extrair em helper interno reutilizado pelo accept, ou inline).
  - Retorna `{ success, order_id, settled_total_value }`.
- `GRANT EXECUTE ON FUNCTION public.confirm_negotiation TO authenticated;`

### 2. Frontend
- **Buyer accept** (`BuyerNegotiationDetail` → `accept-counter` edge function): edge function passa a chamar `accept_negotiation` com `p_accepted_by='buyer'`. Sucesso → modal "Thanks for accepting this deal. The supplier will confirm this action asap." [OK] → navega para `/buyer/offers`. Remover toast "Order created".
- **Supplier accept** (`CounterOfferActions.acceptNegotiation`): chama `accept_negotiation` com `p_accepted_by='supplier'`. Sucesso → modal "Buyer will confirm this action asap." [OK] → `/supplier/offers`. Remover toast imediato + remover envio direto de `dealClosed`.
- **Edge function `accept-counter`**: ajustar payload do RPC (adicionar `p_accepted_by:'buyer'`), atualizar copy de resposta, remover envio `dealClosed`, disparar nova notificação `awaitingConfirmation` pro supplier.
- **`SupplierRespond` (link público do email)**: ajustar success state ("Buyer will confirm asap").
- **Novo `PendingConfirmationBanner`** em `BuyerNegotiationDetail` / `SupplierNegotiationDetail` / `AdminNegotiations` quando `status='pending_confirmation'`:
  - **Counterparty (humano)**: banner + botão **Confirm Deal** (wine `#8B2252`) + **Reject** secundário (chama `reject_negotiation`).
  - **Quem aceitou**: read-only "Waiting for {counterparty} to confirm the deal."
  - **Admin geral**: read-only por padrão.
  - **Admin com managed** (qualquer lado): vê **Confirm Deal** no banner mesmo quando seria o "accepter" — UI detecta `mundus_managed_buyer/supplier` na company correspondente. Server-side `confirm_negotiation` libera (regra 2/3 acima).
  - **Auto-confirm para managed accept**: quando admin clica accept e a contraparte é managed, UI imediatamente encadeia `confirm_negotiation` (fecha o deal num único fluxo). Quando admin clica accept e a contraparte **não é** managed, vai para pending_confirmation normal.
- Sucesso do confirm → recarrega → cai no `DealClosedBanner` existente + toast "🎉 Deal confirmed — Order #XXXX".

### 3. Mapeamentos de status (atualizar `pending_confirmation` em todos)
- `useRealNegotiation.mapStatusForSupplier/Buyer`: `pending_confirmation` → para a parte que precisa confirmar = `action_required`; para a parte que aceitou = `awaiting_buyer`/`awaiting_supplier`. Decidir baseado em `accepted_by`.
- `useAdminNegotiations.ACTIVE_STATUSES`: incluir `pending_confirmation`.
- `useRemainingFcl`: tratar como `inNegotiation` (não `sold`). Já lê do switch — só adicionar o case.
- `OfferDetail` status chips (supplier): label "Awaiting confirmation", cor amber.
- `useAdminAnalytics`, dashboards, BI, funil: incluir `pending_confirmation` como ativo, não como fechado.
- `supabase/functions/_shared/negotiation/types.ts`: adicionar à union.
- `supabase/functions/nudge-stale-negotiations`: ignorar (já filtra por awaiting/pending_buyer_review).

### 4. Notificações + Emails
- Pós-`accept_negotiation` (no handler do frontend / edge function, padrão atual):
  - **In-app** via `enqueue_app_notifications` para os user_ids da counterparty company (`get_company_active_user_ids`): title "Buyer/Supplier accepted — confirm the deal", link para a negociação.
  - **Email** para o primary contact da counterparty via `get_company_primary_contact` + `enqueue_email`: novo template `dealAwaitingConfirmation` em `src/lib/emailTemplates.ts` (assunto, preheader, CTA para a URL da negociação). Best-effort.
- **Mover** os emails `dealClosed` (ambos os lados) + audit log `negotiation.deal_closed` do accept path para dentro do handler de sucesso do `confirm_negotiation` — esse é o close real agora. Inclusive para o caminho auto-confirm admin-managed.

### 5. i18n (en/pt/es/fr/zh)
- `negotiation.status.pending_confirmation`.
- `negotiation.acceptThanks.{title, supplierWillConfirm, buyerWillConfirm, ok}`.
- `negotiation.pendingConfirmation.{bannerBuyerAccepted, bannerSupplierAccepted, waiting, confirmCta, rejectCta, successToast, adminBadge}`.
- Email subject/preheader/body de `dealAwaitingConfirmation`.

### 6. Não-regressão
- Counter, reject, expiração, troca inline `activeId`, painel de bids, price history full-width, deal progression card, agreed-item locking, chat-to-order e `confirm_chat_proposal` — todos intocados.
- RLS: `confirm_negotiation` é SECURITY DEFINER com check próprio; sem mudança de policies.
- Idempotência: 2º confirm cai em `invalid_status` (não é mais `pending_confirmation`).
- `submit_negotiation_round` e `reject_negotiation`: continuam aceitando só `awaiting_supplier`/`pending_buyer_review` → impossível counterar/rejeitar a partir de `pending_confirmation` exceto pelo banner que chama `reject_negotiation` (vamos liberar `pending_confirmation` no `reject_negotiation` também).

## Resposta direta às suas perguntas
1. **Admin managed pode bater o martelo sozinho:** sim, vou implementar exatamente isso — `confirm_negotiation` autoriza admin quando a empresa "accepter" ou a counterparty for managed, e a UI encadeia accept+confirm num único fluxo para a parte managed.
2. **FCL só consome quando totalmente confirmado:** já é o comportamento; vou só garantir que `pending_confirmation` conte como `inNegotiation` (não como `sold`) em `useRemainingFcl`. Offer só vira `sold_out` quando o último FCL atinge `bid_accepted`.
