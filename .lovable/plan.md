## Problema identificado

O sistema está tratando `total_fcl` como divisor em alguns lugares. Exemplo atual:

```text
27,000 kg × US$ 5.90/kg = US$ 159,300.00 por container/FCL
mas a tela mostra: 159,300 / 5 = US$ 31,860.00
```

Isso está errado para a regra da Mundus: a quantidade lançada em offer/request é o mix de UM container. O número de containers disponíveis indica quantos containers idênticos existem; não deve alterar o preço unitário do container.

## Plano de correção

1. **Centralizar a regra de preço por FCL**
   - Criar/usar um helper de cálculo para deixar claro:
     - `containerValueUsd = soma(item.amount_kg × item.price_per_kg)`
     - `totalInventoryValueUsd = containerValueUsd × total_fcl`
   - O valor principal “Total Value / per FCL” deve sempre mostrar `containerValueUsd`.

2. **Corrigir Supplier + Admin Offer Detail**
   - Em `useRealSupplierOffers.ts`, remover a divisão por `total_fcl`.
   - `pricePerFclUsd` passa a ser o valor real de um container/FCL.
   - Em `OfferDetailLayout.tsx`, manter o hero como valor por FCL e deixar o resumo de inventário como `valor por FCL × FCLs`, ou renomear visualmente para evitar confusão.
   - Como `/admin/offers/:id` reutiliza a tela de supplier, o Admin Detail será corrigido junto.

3. **Corrigir Buyer Offer Detail**
   - Em `BuyerOfferDetail.tsx`, remover `grossValue / total_fcl`.
   - O valor principal deve ser `grossValue`, ou seja, o valor de 1 container/FCL.
   - A área do buyer deve continuar mostrando quantos FCLs estão disponíveis, mas sem dividir o preço.

4. **Revisar pontos relacionados para não quebrar negociação**
   - Verificar modais de bid/counter e listas de negociação para garantir que continuam calculando valor conforme a quantidade de FCL escolhida na negociação.
   - A regra esperada é:
     - visualização da offer: valor por container/FCL
     - negociação/order: valor do container negociado × FCLs selecionados pelo buyer

5. **Atualizar documentação interna**
   - Ajustar a regra em `/admin/docs` para ficar explícito em PT-BR:
     - quantidade por item = por container
     - preço por FCL = soma do mix de um container
     - total inventory value = preço por FCL × containers disponíveis
     - nunca dividir por containers disponíveis.

6. **Validação**
   - Procurar novamente no código qualquer padrão de divisão por `total_fcl` aplicado a valor.
   - Conferir o exemplo da tela: 27,000 kg × 5.90 = US$ 159,300.00 como valor por FCL, tanto em Supplier quanto Buyer/Admin.