## Problema

Nos campos **Ask** e **Floor** da criação de offer (e em outros campos `$`/qty), ao digitar `7` o input vira `7.00` imediatamente — o cursor pula para as casas decimais e o usuário precisa selecionar `00` para digitar `33`.

**Causa raiz** (confirmada em `SupplierCreateOffer.tsx` ~L2798 e gêmeos em Auction):

```text
value = unit === "kg" ? c.ask : toDisplay(parseFloat(c.ask), "price", "lbs").toFixed(2)
```

A cada keystroke o valor é convertido kg ↔ lb e re-formatado com `.toFixed(2)`, então `7` vira `7.00` no próximo render. Pior em lbs, mas também afeta qualquer campo formatado a cada tecla.

## Solução

Criar um componente único **`<MoneyInput>`** (e irmão `<QtyInput>`) que:

- Usa `type="text"` + `inputMode="decimal"` (evita os bugs do `type=number` em Safari/Android e o auto-formatting do browser).
- Mantém o **texto cru** que o usuário digita em estado local enquanto o campo está focado — **sem reformatar a cada tecla**.
- Aceita só `0-9` + `.` (US). Bloqueia vírgula como decimal; se digitada, converte para `.` (ajuda quem vem de teclado BR/EU).
- **No blur**: parse → arredonda a 2 casas → reformata como `1,234.56` (US) → emite `onChange` com o número canônico em string (ex.: `"7.33"`).
- Em modo lbs: converte lb → kg só no blur (uma vez), nunca durante a digitação. Re-exibe em lb a partir do valor kg salvo.
- Suporta placeholder, prefixo (`$`), sufixo (`/kg`, `/lb`), `min`, `max`, `disabled`, `aria-*`.

Padrão de exibição em todo o sistema: **US (1,234.56)**. Sem preferência por usuário por ora (decidido).

## Onde aplicar

1. `src/pages/supplier/SupplierCreateOffer.tsx`
   - Linha da tabela de cuts: `qty`, `ask`, `floor`, e os overrides de incoterm secundário (`cutIncoOverrides`).
   - Linhas do "Add cut" form (qty/ask/floor inline).
   - Quaisquer outros `<input type="number">` de $/peso no arquivo.
2. `src/pages/supplier/SupplierCreateAuction.tsx`
   - `qtyPh`, `askPh`, `floorPh` (~L711, 723, 735), freight (~L486), `US$/kg` start price (~L470, 926).
3. Admin **on-behalf** de offer/auction — usa os mesmos componentes acima, então herda automaticamente. (Confirmado: admin reaproveita `SupplierCreateOffer`/`SupplierCreateAuction` quando cria em nome de supplier; nada extra precisa mudar lá.)
4. `src/components/offer/NegotiationHandlingControl.tsx` se tiver campo $ similar (verificar no build).

## Arquivos novos

- `src/components/inputs/MoneyInput.tsx` — input $/kg ou $/lb com conversão no blur.
- `src/components/inputs/QtyInput.tsx` — input de quantidade (inteiro, milhares com vírgula no blur).
- `src/lib/numberFormat.ts` — helpers `parseUS(str): number | null`, `formatUS(num, decimals): string`, `sanitizeNumericTyping(str): string`.

## Comportamento garantido

- Digitar `7` → mostra `7` (sem `.00`).
- Digitar `7.` → mostra `7.`.
- Digitar `7.33` → mostra `7.33`.
- Sair do campo → vira `7.33` (ou `7.00` se digitou só `7`).
- Apagar tudo → fica vazio (não vira `0.00`).
- Em lbs: digita `7.33` → no blur salva `3.32` kg internamente, exibe `7.33` lb.

## Sem mudanças de schema / backend

Armazenamento continua em kg; só o input muda. Nenhuma migration.

## Validações já existentes mantidas

`validatePricePair` (ask ≥ floor), `qty > 0`, `ask > 0` — continuam funcionando porque o `onChange` final entrega número parseável.

## Decisão futura (não nesta tarefa)

Preferência por usuário (US vs BR/EU). Fica registrado, mas só implementar depois quando houver demanda de supplier não-US.

## Resumo técnico

```text
MoneyInput
 ├─ state: rawText (string)
 ├─ props: valueKg (number|string), unit ("kg"|"lbs"), onChangeKg(strKg)
 ├─ onFocus  → seta rawText = display atual sem grouping
 ├─ onChange → filtra chars, atualiza rawText (NÃO chama onChangeKg)
 ├─ onBlur   → parse rawText → converte para kg → onChangeKg(kg) → reformata display US
 └─ render   → focused ? rawText : formatUS(toDisplay(valueKg))
```
