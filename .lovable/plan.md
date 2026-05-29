## Decisões confirmadas

1. **Aceite no chat fecha o deal imediatamente** (não consome rodada, não importa se é round 1 ou 4) → gera order na hora.
2. **Confirmação dupla**: quem fez a proposta precisa confirmar antes do fechamento (modal "Confirm sale at $X").
3. **Chat manual por enquanto** (motor automático fica para depois — mesmo padrão atual).
4. **Quem pode propor**: a partir do round 3 (regra atual `CHAT_ENABLED_FROM_ROUND`), qualquer lado, a qualquer momento. Independente do fluxo de rodadas paralelo.
5. **Quantidade**: bloqueada por padrão. Supplier decide na criação da offer se aceita ajuste. Mesmo com ajuste permitido, **o total ofertado deve bater** (soma das qty dos itens = `offer.total_kg` original).

## Modelo de dados

**Migration:**
- `offers.allow_quantity_negotiation boolean default false` — toggle na criação da offer.
- `negotiation_messages`:
  - `promoted_to_order_id uuid null` — se aceito, referência ao order criado.
  - `confirmed_by_proposer_at timestamptz null` — segundo aceite (autor).
  - `superseded_at timestamptz null` — proposta invalidada por nova rodada oficial.
- RPC `accept_chat_proposal(p_message_id uuid)` — SECURITY DEFINER:
  - Valida: negociação ativa, round ≥ 3, status pending, aceitador ≠ autor.
  - Marca `proposal_status='accepted_pending_confirmation'` + grava `accepted_at`, `accepted_by`.
  - **Não fecha ainda** — espera confirmação do autor.
- RPC `confirm_chat_proposal(p_message_id uuid)`:
  - Só o autor original pode chamar.
  - Valida itens contra `allow_quantity_negotiation`:
    - Sempre: `sum(quantity_kg) == offer.total_kg`.
    - Se `allow_quantity_negotiation=false`: cada item.quantity_kg deve bater com `offer_items.amount` original.
  - Cria `round_proposal` "selado" + `cut_rounds` com os valores aceitos (para trilha auditável).
  - Atualiza `negotiations.agreed_items`, `status='bid_accepted'`, `settled_total_value`.
  - Cria `orders` + `order_items` (reaproveita lógica do `accept_negotiation`).
  - Marca message `promoted_to_order_id`, `confirmed_by_proposer_at`.
- Trigger: ao inserir novo `round_proposal` "oficial" depois de proposta pendente → marcar pending messages como `superseded_at=now()`.

## UX

### Compose Proposal (chat, round ≥ 3)
- Botão "Send formal proposal" abre **ProposalComposer** inline:
  - Tabela read-only de qty (se `allow_quantity_negotiation=false`) ou editável (se true) com avisos.
  - Coluna preço editável (pré-preenchida com último valor da rodada).
  - Validação ao vivo: badge vermelho se `sum(qty) ≠ total_kg`.
  - Total recalculado.
  - Note opcional ("Pode chegar em 5.77?").
- Envia → cria message `message_type='proposal'` com `structured_data { items[], total_usd, note, allow_qty }`.

### Receber Proposal
- **ProposalCard** mostra:
  - Tabela linha por linha: produto, qty, $/kg, subtotal.
  - Total destacado.
  - Note do autor.
  - Status chip (Pending / Accepted by counterparty — awaiting confirmation / Sealed / Superseded / Declined).
- Botões para a contraparte: **Accept**, **Decline**.
  - Accept → chama `accept_chat_proposal` → toast "Awaiting confirmation from {author}".
  - Card muda de cor e mostra "Awaiting {author} confirmation".
- Após accept, autor original vê **ConfirmSaleModal**:
  - Título: "Confirm sale at $X total"
  - Tabela final dos itens
  - Aviso: "This will close the negotiation and create order #XXX"
  - Botões: **Confirm & close deal** / **Cancel** (reabre proposal como pending)
  - Confirm → chama `confirm_chat_proposal` → toast "Deal closed", redirect para order.

### Save-guards visuais
- Se `allow_quantity_negotiation=false` e usuário tenta editar qty: input disabled com tooltip "Supplier locked quantities for this offer".
- Se `sum(qty) ≠ total_kg`: botão "Send proposal" disabled com mensagem "Total must equal {total_kg} kg".

### Offer Create
- Em `SupplierCreateOffer.tsx`, novo toggle:
  > ☐ **Allow buyers to negotiate item quantities** (total must always equal {total_kg} kg)
  - Default off.
  - Tooltip explicando.

## Edge cases

- **Proposal pendente + nova rodada oficial** → proposta marcada `superseded`, botões Accept/Confirm desabilitam, card mostra "Superseded by Round N".
- **Expiration da negociação** → proposta também expira, accept bloqueado.
- **Author cancela antes da contraparte aceitar** → message `proposal_status='cancelled'`.
- **Negotiation com múltiplos buyers (OtherBidsPanel)** → proposal/aceite afetam só a negociação atual; demais buyers seguem normal. Quando deal fecha por chat, mesma lógica de `sold_out` em `accept_negotiation` aplica (`v_sold_fcls >= v_total_fcl`).

## Arquivos afetados

**SQL**: 1 migration (coluna offers + colunas messages + 2 RPCs + 1 trigger).

**Frontend**:
- `src/components/negotiation/NegotiationChat.tsx` — reescrever `ProposalCard` + novo `ProposalComposer` + `ConfirmSaleModal`.
- `src/pages/supplier/SupplierCreateOffer.tsx` — toggle `allow_quantity_negotiation`.
- `src/hooks/useRealNegotiation.ts` — refetch após confirm; expor `offer.allow_quantity_negotiation`.
- `src/lib/negotiationEngine.ts` — helper `canStartChatProposal(neg)` (round ≥ 3 + status ativo + não expirado).
- i18n: novas strings (pt/en/es/fr/zh) para composer, modal, statuses.

**Mobile**: ProposalComposer e ConfirmSaleModal renderizam como bottom sheet em < 768px (padrão do projeto).

## Não está nesta etapa

- Motor automático de aceite (segue manual, igual ao resto da negociação).
- Edição parcial de itens (drop de linha) — fica para v2 quando `allow_quantity_negotiation` evoluir.
- Histórico de propostas canceladas no `PriceHistoryTable` (só rounds oficiais aparecem lá; chat tem sua própria timeline).