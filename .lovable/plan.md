# Plano — Corrigir negociação manual

Regras confirmadas:
- **4 rounds visíveis × 2 lados = 8 propostas** (1 round visível = buyer bid + supplier counter)
- **Accept** sempre fecha pelo **último valor da contraparte** (buyer aceita → fecha no counter do supplier; supplier aceita → fecha no bid do buyer)
- **Chat libera no round 3** (display)
- Direção de preço: buyer só sobe, supplier só desce

## O que está quebrado hoje

1. **Prefill do supplier no round 2+** estava puxando `asking price` em vez do counter anterior → erro de validação imediato (ceiling). Já corrigido em `CounterOfferModal.tsx` mas precisa validar fim-a-fim.
2. **`current_round` na tabela `negotiations`** é atualizado pelo modal do supplier mas não pelo `BidModal` do buyer → AdminNegotiations e badges mostram round desatualizado.
3. **Confusão display vs raw**: alguns lugares mostram "Round 2 de 4" (display), outros logam raw (1–8). Usuário só deve ver display.
4. **Accept-in-the-middle**: confirmar que `accept_negotiation` (RPC) está usando o **último round salvo** da contraparte. Hoje pega `MAX(round)` independente de quem criou — se o usuário aceita logo após enviar seu próprio round, fecharia pelo valor dele mesmo (errado).
5. **`MAX_ROUNDS = 3`** no engine das edge functions (`supabase/functions/_shared/negotiation/parameters.ts`) está dessincronizado do `MAX_DISPLAY_ROUNDS = 4` do frontend.

## Mudanças

### Frontend
- **`BidModal.tsx` (buyer)**: ao submeter bid, atualizar `negotiations.current_round = displayRound` (mesmo padrão do `CounterOfferModal`).
- **`CounterOfferActions.ts`**: antes de chamar `rpc("accept_negotiation")`, validar que o último `round_proposal` foi criado pela **contraparte**, não pelo próprio usuário. Se foi o próprio, bloquear com toast ("Aguarde a resposta da contraparte para aceitar").
- **Badges de round**: auditar `useRealNegotiationsList.ts`, `AdminNegotiations.tsx`, `BuyerNegotiations.tsx`, `SupplierNegotiations.tsx` — garantir que todos usam `displayRoundFor(raw)` e nunca o raw direto.
- **`CounterOfferModal.tsx`**: confirmar fix do prefill (previous counter como ceiling) e que o atalho "− my asking" usa `min(asking, previousCounter)`.

### Backend (RPC)
- **`accept_negotiation`**: adicionar validação — `v_last_round.created_by_user_id <> p_user_id`. Se igual, retornar erro `cannot_accept_own_round`.
- **`submit_negotiation_round`**: já está OK com `v_next_round > 8`, mas atualizar comentário/constante implícita para refletir "8 raw = 4 display".

### Edge functions (auto-negotiation)
- **`supabase/functions/_shared/negotiation/parameters.ts`**: atualizar `MAX_ROUNDS` de `3` para `4` e estender strategies (`firstRound`, `secondRound`, `thirdRound` + novo `fourthRound`) **OU** documentar que o engine automático opera em 3 rounds enquanto a negociação manual aceita 4. Recomendo **manter 3 no engine automático** e só ajustar o manual — engine auto convergir em 3 já é desejado. Vou adicionar um comentário explícito separando os dois mundos.

### UI
- Garantir que nenhum lugar mostra "round 5/8" ou "round 6". Tudo em "Round N de 4".

## Não muda
- `MAX_DISPLAY_ROUNDS = 4` ✅
- `MAX_RAW_ROUNDS = 8` ✅
- `CHAT_ENABLED_FROM_ROUND = 3` ✅
- `EXPIRATION_HOURS = 24` ✅
- Direção de preço (buyer sobe, supplier desce) ✅
- Order creation + sold_out já corrigidos em turno anterior ✅

## Resultado esperado
- Buyer e supplier veem o mesmo número de round sempre.
- Não dá pra aceitar a própria proposta.
- Accept fecha sempre pelo último valor da contraparte.
- Round 2+ do supplier prefilla com o counter anterior (não com o asking).
- Auto-negotiation continua em 3 rounds; manual em 4.
