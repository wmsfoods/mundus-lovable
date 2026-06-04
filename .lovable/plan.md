## Bug

O sistema deixou um supplier publicar uma offer com **floor (preço mínimo) maior que o ask (preço pedido)**. Isso quebra a lógica de negociação inteira — o "piso" virou um teto.

A função `validatePricePair(ask, floor)` existe e checa `ask >= floor`, mas ela só é usada nos campos do "add new cut" e na exibição da tabela de derivados. **O `handlePublish` não revalida a lista final de cuts antes de inserir no banco**, então qualquer cut com floor > ask passa direto. Pior: na linha 1332 o código faz `floorVal = floor > 0 ? floor : ask` — aceita o floor mesmo sendo maior que o ask. Em `SupplierCreateAuction` a validação só roda no add-cut, não no submit final.

## Correção

### 1) `src/pages/supplier/SupplierCreateOffer.tsx` — `handlePublish`
Adicionar, logo após o bloco `invalidCuts` (~L1194), uma checagem que percorre `cuts` e bloqueia publish/draft se algum cut tem `floor > ask`:

```
const badFloor = cuts.find(c => {
  const a = parseFloat(c.ask), f = parseFloat(c.floor);
  return Number.isFinite(a) && Number.isFinite(f) && f > a;
});
if (badFloor) {
  toast.error("Floor price cannot be greater than asking price. Fix the cut and try again.");
  return;
}
```

Aplicar também para `asDraft` (draft com floor inválido não deve ser salvo errado).

Na linha 1331-1332, trocar a regra silenciosa por clamp seguro:
```
const floorVal = Number.isFinite(floor) && floor > 0 && floor <= ask ? floor : ask;
```
(defesa em profundidade caso a validação acima seja burlada).

### 2) `src/pages/supplier/SupplierCreateOffer.tsx` — edição inline da tabela de cuts
A coluna `floor` da tabela principal (L2797-2802) usa `updateCutField` direto, sem validação. Adicionar feedback visual (borda vermelha + tooltip "Floor ≤ asking") quando `c.floor > c.ask`, reusando `validatePricePair`. Não bloquear digitação — bloquear no submit.

### 3) `src/pages/supplier/SupplierCreateAuction.tsx` — submit
A validação atual (L225-226) só roda no botão "add cut". Adicionar no handler de publish da auction a mesma checagem sobre todos os cuts já adicionados, com o mesmo toast. Aplicar clamp na hora de gravar `minimum_price` se houver.

### 4) Admin on-behalf
O fluxo admin on-behalf reusa `SupplierCreateOffer`/`SupplierCreateAuction` (mesma tela), então herda a correção automaticamente. Sem mudança extra.

### 5) Backend (defesa em profundidade) — opcional, recomendado
Adicionar um trigger `BEFORE INSERT OR UPDATE` em `offer_items` que rejeita `minimum_price > price`:
```sql
CREATE OR REPLACE FUNCTION public.enforce_floor_le_ask() RETURNS trigger ...
  IF NEW.minimum_price IS NOT NULL AND NEW.price IS NOT NULL
     AND NEW.minimum_price > NEW.price THEN
    RAISE EXCEPTION 'minimum_price (%) cannot exceed price (%)', NEW.minimum_price, NEW.price;
  END IF;
```
Garante que nenhum caminho (UI, API, edge function, import) consiga gravar floor > ask no futuro.

## Escopo

- Frontend: 2 arquivos (`SupplierCreateOffer.tsx`, `SupplierCreateAuction.tsx`).
- Backend: 1 migration (trigger em `offer_items`) — confirmar se quer incluir.
- Sem mudança de schema, sem mudança de UX além do toast e da borda vermelha.

## Pergunta

Incluo o **trigger de banco** (item 5) na mesma entrega? Recomendo fortemente — sem ele, qualquer bug futuro de frontend volta a permitir o problema.
