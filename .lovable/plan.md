# Corrigir Fluxo de Negociação Manual

Objetivo: destravar o fluxo manual de bids/contra-ofertas, eliminando falhas silenciosas de RLS, padronizando o accept via RPC e alinhando limites de rounds entre front, engine e DB.

## 1. Migração de banco (1 migration consolidada)

**RLS**
- `CREATE POLICY` UPDATE em `negotiations` — permitido se `user_can_access_negotiation(id)` e status estiver entre `awaiting_supplier`, `pending_buyer_review`.
- `CREATE POLICY` INSERT em `round_proposals` — permitido se o usuário pertencer à empresa buyer ou supplier da negociação.
- `CREATE POLICY` INSERT em `cut_rounds` — idem, via join com `round_proposals → negotiations`.
- `DROP POLICY cut_rounds_public_all` (leak histórico de preços a anônimos).

**Constraint de rounds**
- Aumentar `CHECK (round >= 1 AND round <= 3)` em `round_proposals` para `<= 8` (alinha com `MAX_RAW_ROUNDS = 8`).
- Atualizar `submit_negotiation_round` para `IF v_next_round > 8 THEN RAISE 'max_rounds_reached'`.

**Trigger expiration manual**
- Garantir que `tg_reset_negotiation_expiration` dispara em INSERT de `round_proposals` (hoje só dispara via engine).

## 2. Refactor `acceptNegotiation` (CounterOfferActions.ts)

Substituir o `.update({ status: "bid_accepted" })` direto por:

```ts
const { data, error } = await supabase.rpc("accept_negotiation", {
  p_negotiation_id: neg.id,
  p_user_id: userId,
});
```

Isso passa a criar `orders`, `order_items`, preencher `order_id` e marcar `offers.status = 'sold_out'` quando esgotar FCLs. Remove o cálculo de `settled_total_value` no front (a RPC já calcula via `agreed_items` ou último round).

## 3. Gating do botão Accept

Em `BuyerNegotiationDetail.tsx` e `SupplierNegotiationDetail.tsx`:
- Habilitar "Accept" **apenas** quando `status === "pending_buyer_review"` (buyer) ou `status === "awaiting_supplier"` (supplier respondendo ao último counter).
- Remover o mapeamento errado de `awaiting_supplier → action_required` no lado errado.

## 4. Alinhamento manual ↔ engine

`BidModal.tsx` (round 1 do buyer):
- Criar `negotiations` com `status = 'awaiting_supplier'` + inserir `round_proposals` round=1.
- **NÃO** atualizar status para `pending_buyer_review` aqui — quem faz isso é a RPC `submit_negotiation_round` quando o supplier responde, OU o front quando o buyer faz round subsequente.

`CounterOfferModal.tsx`:
- Para respostas manuais do supplier, chamar a RPC `submit_negotiation_round` (já existe e faz tudo certo: insere round, vira status, trigger de expiration).
- Remover inserts diretos em `round_proposals` / `cut_rounds`.

## 5. Validação de direção

Conectar `validateBuyerBidDirection` e `validateSupplierCounterDirection` (já existem em `negotiationEngine.ts`) aos respectivos modais. Remover regra inline `MIN_BID_PCT = 0.9` do `BidModal`.

## 6. Banner `offer_withdrawn`

Adicionar status `offer_withdrawn` ao enum (se ainda não existir) e expor ação "Withdraw" para o supplier em `SupplierNegotiationDetail` enquanto `status = 'awaiting_supplier'`. (Se preferir adiar, removo o banner morto e mantém só a base.)

---

## Ordem de execução

1. Migration (RLS + constraint + trigger).
2. Refactor `CounterOfferActions.acceptNegotiation` → RPC.
3. Refactor `CounterOfferModal` → RPC `submit_negotiation_round`.
4. Ajustes em `BidModal` (limite via engine + status correto).
5. Gating do Accept nos dois `NegotiationDetail`.
6. Smoke test do fluxo: buyer bid → supplier counter → buyer accept → ver `orders` criado.

## Riscos

- A RPC `accept_negotiation` exige `pending_buyer_review`. Negociações antigas em `bid_accepted` continuam ok; em andamento podem precisar reprocessamento manual se estiverem em status inconsistente.
- Mudar constraint de rounds não afeta dados existentes (todos têm round ≤ 3 hoje).
- Drop da policy `cut_rounds_public_all` quebra qualquer leitura anônima — confirmar que nenhuma página pública lê `cut_rounds` (verifiquei: só páginas autenticadas usam).

Confirma para eu seguir?
