## Plano

### 1. Limpar mock do chat
- `DELETE FROM negotiation_messages` (remove as 3 linhas existentes).

### 2. Fan-out de notificações movido para o banco (fonte da verdade)

Hoje a gravação em `app_notifications` depende de `notifyCompanyUsers()` ser chamada no front, dentro do `BidModal`/`CounterOfferModal`, como "best-effort". Resultado: `app_notifications` está com 0 linhas mesmo após 15 rounds reais. Vamos resolver no banco, com triggers `SECURITY DEFINER`, para cobrir TODOS os caminhos (modal, RPC, edge, admin on behalf).

**Função utilitária**
- `notify_negotiation_event(p_negotiation_id, p_event, p_actor_user_id)` — resolve buyer/supplier/admin, monta título/body, descobre destinatários via `get_company_active_user_ids`, insere em `app_notifications` pulando `user_id` inválido (loop 1-a-1, `EXCEPTION WHEN foreign_key_violation` por linha para nunca abortar o lote).

**Triggers**
1. `round_proposals AFTER INSERT` →
   - `round = 1` e `side = 'buyer'` → notifica supplier: *"New bid received"*.
   - `round > 1` e criador pertence ao supplier → notifica buyer: *"Counter-offer received"*.
   - `round > 1` e criador pertence ao buyer → notifica supplier: *"New bid received (round X)"*.
2. `negotiations AFTER UPDATE OF status` →
   - `pending_confirmation` → notifica counterparty: *"Confirme o deal"* (icon handshake).
   - `bid_accepted` (deal fechado) → notifica ambos os lados: *"🎉 Deal closed"* + linkar order.
   - `offer_rejected` → notifica counterparty: *"Negotiation rejected"*.
3. `negotiation_messages AFTER UPDATE` quando `proposal_status` muda para `accepted_pending_confirmation` ou `accepted` → notifica o proposer/contraparte do chat.

Categoria padronizada como `"negotiations"` (plural) em todos os pontos (corrige o bug em `CounterOfferActions.ts` que usa `"negotiation"` singular e some do filtro do dropdown).

### 3. Limpeza no front
- Remover as chamadas `notifyCompanyUsers` duplicadas de `BidModal.tsx`, `CounterOfferModal.tsx` e `CounterOfferActions.ts` (agora redundantes e fonte de inconsistência de categoria/título). Emails continuam disparados do front como hoje.

### 4. Validação
- `psql` para confirmar que após um INSERT em `round_proposals` aparecem linhas em `app_notifications`.
- Conferir bell na UI (preview) com usuário logado.

### Detalhes técnicos
- Triggers em `SECURITY DEFINER` com `SET search_path = public`.
- Loop por destinatário com `BEGIN ... EXCEPTION WHEN foreign_key_violation THEN CONTINUE; END;` para tolerar `user_id` órfão.
- `related_id` enviado como `uuid` (coluna é uuid).
- `app_notifications` já está no publication `supabase_realtime` ✅ — o sininho atualiza em tempo real.
- Nenhuma alteração em RLS/grants (tabela já tem políticas corretas).

### Fora de escopo
- Página `/buyer/chat` (mocks em arquivo) — não tocar agora.
- Email/Resend — sem mudança.
- Negociações antigas não recebem notificações retroativas.
