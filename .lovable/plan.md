## Problema

Quando o buyer (ou supplier) abre o modal `Send Counter-Response`, ele só vê o **último** valor da contraparte (chip "Bid R1 → Counter R1") e a coluna "Supplier Counter" referente à rodada atual. Não há a sequência completa de bids/counters por produto, que existe apenas na tela de detalhe (`Price history per product`).

## Solução

Reutilizar o componente já existente `PriceHistoryTable` dentro do `CounterOfferModal`, exibindo a sequência completa de rounds (Bid R1, Counter R1, Bid R2, Counter R2 …) por produto, logo acima da tabela editável "your counter".

### Comportamento
- Aparece a partir do round 2 (quando já existe pelo menos uma rodada anterior).
- Bloco recolhível com título "Price history per product" (default: aberto no desktop, fechado no mobile para economizar espaço).
- Reaproveita exatamente a mesma tabela do detalhe, garantindo paridade visual e de regras (células vazias `—` para rounds ainda não enviados, ícone 🔒 nos itens já travados).
- Funciona para `perspective="buyer"` **e** `perspective="supplier"`, já que ambos abrem o mesmo modal.

### Detalhes técnicos
- Em `src/components/supplier/CounterOfferModal.tsx`:
  - Construir `products: PriceHistoryProduct[]` mapeando `negotiation.offer.items` + `negotiation.rounds + cut_rounds` (mesma lógica usada hoje em `BuyerNegotiationDetail.tsx` / `SupplierNegotiationDetail.tsx` — extrair para um helper compartilhado em `src/lib/negotiationHistory.ts`).
  - Calcular `maxRoundShown = displayRound` (incluir a rodada que está sendo composta para mostrar a coluna "atual" como pendente).
  - Renderizar `<PriceHistoryTable products={…} maxRoundShown={…} agreedByName={…} />` dentro de um `<details>`/`Collapsible` no modal, entre o resumo (chips Bid/Counter) e a tabela "APPLY BID IN ALL ITEMS".
- Sem mudança de schema, sem mudança de negócio.

### Arquivos afetados
- `src/lib/negotiationHistory.ts` (novo helper — extrai a montagem dos `PriceHistoryProduct` que hoje está duplicada nas duas páginas de detalhe).
- `src/components/supplier/CounterOfferModal.tsx` (importar helper + `PriceHistoryTable` e renderizar bloco recolhível).
- (Opcional housekeeping) `BuyerNegotiationDetail.tsx` e `SupplierNegotiationDetail.tsx` passam a usar o mesmo helper, evitando divergência futura.

### Fora de escopo
- Não altera lógica de validação, envio, ou regras de round.
- Não muda a tabela editável de "your counter" — ela continua exatamente igual.
