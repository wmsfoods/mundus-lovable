## Goal
Na aba **Negotiation** dentro de Order (buyer) e Sale (supplier), substituir a tabela atual (que hoje aparece com `—` e sem rounds reais) pela **mesma `PriceHistoryTable`** usada na página de negociação, com colunas Asking, Floor (apenas supplier), Bid R1, Counter R1, Bid R2, Counter R2, etc., refletindo a negociação real que originou o pedido.

## Diagnóstico
- `DealDetailView` já renderiza uma tabela própria de rounds, porém é alimentada por `genNegotiation()` (mock em `dealDetailAdapters.ts`) — gera apenas totals fakes, sem `cut.rounds`, sem `floorPerKgUsd`. Por isso aparecem traços.
- Já existe `useOrderNegotiationId(orderId)` que devolve o `negotiationId` real do order/sale.
- Já existe `useBuyerNegotiation(id)` que produz `products` + `rounds` no formato exato exigido por `PriceHistoryTable`.
- `PriceHistoryTable` já mostra Asking, Floor (quando role=supplier via prop interna do componente — vamos verificar e, se necessário, passar a role), e Bid/Counter por round.

## Mudanças

### 1. `src/components/mundus/DealDetailView.tsx`
- Dentro do `<TabPanel active={tab === "negotiation"}>`, quando `data.orderId` existir, montar um subcomponente `<DealNegotiationTab orderId role />` que:
  - usa `useOrderNegotiationId(orderId)` para obter `negotiationId`
  - usa `useBuyerNegotiation(negotiationId)` (hook é agnóstico de role; só retorna `products`/`rounds`) para obter dados reais
  - calcula `maxRoundShown = min(MAX_DISPLAY_ROUNDS, max(rounds.round, 1))`
  - renderiza `<PriceHistoryTable products={d.products} maxRoundShown={maxRoundShown} role={data.role} lastRoundAt={...} />`
  - mantém o "Round timeline" pill existente, mas alimentado a partir dos `rounds` reais (bid/counter por round) — não mais do mock
  - mantém o link "Open full negotiation →"
- Fallback: se não houver `negotiationId`, mantém o caminho atual (mock) ou exibe estado vazio "No negotiation rounds recorded."

### 2. `src/components/negotiation/PriceHistoryTable.tsx`
- Adicionar prop opcional `role?: "buyer" | "supplier"` para mostrar a coluna **Floor** apenas quando `role === "supplier"` (ela já existe para o supplier hoje na página de negociação; só precisa do gatilho explícito aqui).
- Sem mudança no layout/visual.

### 3. `src/lib/dealDetailAdapters.ts`
- Remover a chamada a `genNegotiation()` para buyer e supplier (ou deixar opcional). A tab de negotiation passa a ser alimentada exclusivamente pelo hook real dentro do componente.
- Manter `negotiation` undefined → o novo `DealNegotiationTab` decide o que mostrar.

### 4. i18n
- Reusa as chaves já existentes do `PriceHistoryTable` (en/pt/es/zh/ar). Sem novas chaves.

## Arquivos afetados
- `src/components/mundus/DealDetailView.tsx` (refactor da TabPanel "negotiation")
- `src/components/negotiation/PriceHistoryTable.tsx` (nova prop `role`)
- `src/lib/dealDetailAdapters.ts` (deixa de injetar mock de negotiation)

## Fora de escopo
- Lógica de negócio (engine de rounds, status do pedido)
- Demais abas (Overview, Shipment, Documents, Messages)
- Visual/animations do card (já feitos anteriormente)
