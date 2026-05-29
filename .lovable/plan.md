Refinar visual do `DealProgressionCard` para refletir o anexo, mantendo a estrutura atual. Aplica automaticamente nas três visões (buyer, supplier e admin) porque todas reusam o mesmo componente.

## Mudanças visuais

**1. Cabeçalho** — manter título "Deal progression" + meta "X of N rounds" (já existe).

**2. Linha "Asking (start)"** — nova linha logo abaixo do cabeçalho:
- Fundo cinza claro (`#f3f4f6`), borda tracejada sutil
- Label "Asking (start)" à esquerda em cinza
- Valor total inicial (asking) à direita em negrito preto
- Mostrado uma única vez no topo, antes dos cards de round

**3. Cards de round** — refinar cores conforme anexo:
- Header do card: `Round N` à esquerda; **pill "gap $X.XXX" cinza claro** à direita (em vez do delta central atual)
- Layout interno: BUYER BID (esquerda) → seta → YOUR COUNTER (direita), em uma linha só
- **BUYER/YOUR BID** em **azul** (`#1d4ed8`)
- **YOUR/SUPPLIER COUNTER** em **vermelho/burgundy** (mantém `#8B2252` já usado no sistema)
- Labels "BUYER BID" / "YOUR COUNTER" em uppercase, cinza, pequenos
- Remover a coluna central de delta (movida para o pill no header)
- Manter borda/realce do round "CURRENT" (mais sutil — borda burgundy, sem badge no header pra não competir com o pill de gap)

**4. Gap pill** — formato: `gap $7,080` (sem casas decimais, com separador de milhar). Só aparece quando há bid e counter no round. Cor: fundo `#f3f4f6`, texto `#6b7280`.

**5. Labels por perspectiva** — manter lógica atual:
- Buyer: "Your bid" / "Supplier counter"
- Supplier/Admin: "Buyer bid" / "Your counter"

## Detalhes técnicos

- Único arquivo: `src/components/negotiation/DealProgressionCard.tsx`
- Adicionar prop opcional `askingTotalUsd?: number` para alimentar a linha "Asking (start)". Passar em:
  - `src/pages/buyer/BuyerNegotiationDetail.tsx`
  - `src/pages/supplier/SupplierNegotiationDetail.tsx` (cobre admin via "Act on behalf")
  - Valor = soma de `qtyKg * askingUsdKg` dos produtos (já disponível em `d.products`)
- CSS: pequenos ajustes inline ou via `src/styles/negotiation-detail.css` para o pill `.dp-gap-pill` e a linha `.dp-asking`
- Sem mudanças de lógica de negociação, sem tocar em hooks ou backend

## Fora de escopo

- Não mexer no `PriceHistoryTable` (já redesenhado na rodada anterior)
- Não mexer em copy/i18n além dos novos labels "Asking (start)" e "gap"
