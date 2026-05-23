
## Escopo

Mudança UX no `src/components/supplier/CounterOfferModal.tsx` (usado por ambos os lados nos rounds 2+). Sem alterações no banco, RPC ou edge functions. Validação client mantém as regras atuais (não passar do counter anterior / não cair abaixo do bid anterior).

`BidModal` (bid inicial R1 do buyer) **fica fora** — lá não existe "outro lado" ainda.

## Conceito

Cada lado escolhe a **âncora** (de onde parte o ajuste) e a **direção** já é implícita pelo papel:

- **Supplier**
  - `− do meu asking` (default) — desconto em $/kg ou % sobre o próprio asking price do item
  - `+ no bid do buyer` — acréscimo em $/kg ou % sobre o último bid do buyer para o item
- **Buyer**
  - `+ no meu bid` (default) — acréscimo em $/kg ou % sobre o próprio bid anterior do item
  - `− do counter do supplier` — desconto em $/kg ou % sobre o último counter do supplier para o item

A âncora é puramente de **input** (de onde o cálculo parte). O valor final ainda precisa cair na janela válida (já validado hoje: supplier ≤ counter/asking anterior; buyer ≥ bid anterior, ≤ counter anterior implícito, ≤ 30% deduction).

## Mudanças no `CounterOfferModal.tsx`

### 1. Estado de modo (bulk e por item)

```ts
type Anchor = "self" | "other"; // self = meu lado, other = lado oposto
type Unit = "amount" | "percent";

const [bulkAnchor, setBulkAnchor] = useState<Anchor>("self");          // default −asking / +bid
const [bulkMode, setBulkMode] = useState<Unit>("amount");              // já existe
const [bulkValue, setBulkValue] = useState<string>("");                // já existe

// Por item (sobrescreve quando o usuário digita direto no input do item)
const [rowAnchor, setRowAnchor] = useState<Record<string, Anchor>>({});
const [rowMode, setRowMode]   = useState<Record<string, Unit>>({});
const [rowValue, setRowValue] = useState<Record<string, string>>({});  // texto do delta
```

`counters[itemId]` continua sendo o **preço final em $/kg** (estado autoritativo enviado ao banco). Os controles novos são uma camada de input que recalcula `counters[itemId]` quando o usuário muda anchor/mode/valor.

### 2. Helper de cálculo

```ts
function priceFromDelta(args: {
  perspective: "supplier"|"buyer",
  anchor: Anchor,
  mode: Unit,
  value: number,           // já em $/kg se mode=amount (após fromDisplay)
  askingKg: number,        // it.price
  theirKg: number,         // theirPrices.get(it.id) (último bid p/ supplier, último counter p/ buyer)
}): number {
  const base = args.anchor === "self" ? args.askingKg : args.theirKg;
  const sign =
    args.perspective === "supplier" ? -1 /* desconta se self, acrescenta se other */ : +1;
  // supplier self = base − Δ ; supplier other = base + Δ
  // buyer    self = base + Δ ; buyer    other = base − Δ
  const dir = args.anchor === "self" ? sign * -1 /* invert: self é "ceder no meu lado" */ : sign;
  // simplificado:
  // supplier self → −, supplier other → +
  // buyer self → +,    buyer other → −
  const factorOrDelta =
    args.mode === "percent" ? base * (args.value / 100) : args.value;
  return Math.max(0, base + dir * factorOrDelta);
}
```

(A tabela "self vs other × supplier vs buyer" será mapeada explicitamente; ignorar a álgebra acima — virá com switch claro no código.)

### 3. UI do bulk (substitui o bloco atual "Apply ... in all items")

```text
┌ Apply in all items ─────────────────────────────────────────────────┐
│ Reference: [ − from my asking ] [ + on buyer bid ]   ← toggle pill │
│            (supplier)                                               │
│            [ + on my bid ] [ − from supplier counter ]              │
│            (buyer)                                                  │
│                                                                     │
│ [ $/kg ] [ % ]   [ input 0.10 ]   [ Apply to All ]                  │
│                                                                     │
│ [Accept all]  [Meet in middle]                                      │
└─────────────────────────────────────────────────────────────────────┘
```

Mantém `Meet in middle` e `Accept all`. Feedback de deduction (%) continua aparecendo p/ buyer.

### 4. UI por item (linha da tabela e card mobile)

Na célula "Your Counter" trocar o input simples por um grupo compacto:

```text
[anchor toggle ▾]  [ $/kg | % ]   [ Δ input ]   = $X.XX/kg
```

- `anchor toggle` mostra o label curto (`−asking` / `+bid` no supplier; `+bid` / `−counter` no buyer).
- Δ input recebe o número; quando o usuário muda qualquer um dos três, recalcula `counters[it.id]` via helper.
- Continua possível **digitar o preço final** num campo escondido atrás de um link "edit price directly" (mantém fallback p/ quem quer só bater o número). Opcional — se simplificar, removo esse fallback.

No mobile (card), os controles ficam empilhados em 1 linha (`flex-wrap`), input com `h-11`.

### 5. Prefill

Quando o modal abre:
- `bulkAnchor = "self"`, `bulkValue = ""`.
- Para cada item: `rowAnchor[it.id] = "self"`, `rowMode = "amount"`, `rowValue = ""`.
- `counters[it.id]` segue prefill atual (supplier = asking, buyer = último counter), então o input mostra "Δ vazio → preço = base default".

### 6. Aplicar bulk

`applyBulk()` itera `openItems`, recalcula `counters[it.id]` via helper usando `(bulkAnchor, bulkMode, bulkValue)`, e também **sincroniza** `rowAnchor/rowMode/rowValue` por linha pra UI ficar coerente.

### 7. Validação (mantém o existente, só ajusta mensagens)

O bloco `errors` atual (linhas 167–224) **continua valendo** — ele valida o **preço final**, que é o que importa. Mensagens já são adequadas. Adiciono só uma proteção: se o anchor + valor resultarem em preço inválido, o input do item fica em vermelho com a mensagem atual + dica ("Reduce Δ or change reference").

### 8. Telemetria/i18n

- Adicionar 4 chaves novas no `en.json`/`pt.json`/etc:
  - `engine.anchor.supplier.self` = "− from my asking"
  - `engine.anchor.supplier.other` = "+ on buyer bid"
  - `engine.anchor.buyer.self` = "+ on my bid"
  - `engine.anchor.buyer.other` = "− from supplier counter"

### 9. Mobile

- Toggle de anchor vira segmented control compacto (`text-[11px] px-2 py-1`) acima do input.
- Tudo dentro do card existente; respeita safe-area (modal já tem `max-sm:!h-[100dvh]`).

## Fora do escopo

- Edge function `propose-counter` e RPC `submit_negotiation_round` ficam intocados.
- `BidModal` (bid inicial R1) intocado.
- Nada de migração de schema.

## Arquivos tocados

- `src/components/supplier/CounterOfferModal.tsx` (refactor do bloco bulk + colunas da tabela/cards)
- `src/i18n/locales/{en,pt,es,fr,zh}.json` (4 chaves novas)

## Riscos

- Estado por linha aumenta a complexidade do `useEffect` de prefill — vou garantir deps estáveis pra não resetar a digitação do usuário (regressão recente já corrigida).
- Manter o input de "preço final direto" como fallback evita travar quem prefere digitar o número.
