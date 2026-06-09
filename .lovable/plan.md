## Problema

No drawer "Logística" do supplier (passo **1 — Origem**), os dois campos **País** e **Porto** são `Popover` + `cmdk` (`Command`/`CommandList`/`CommandItem`).

No screenshot, o popover de **Portos** abre com o primeiro item cortado pela metade ("Itajaí (BRIJI)") e a lista parece já estar rolada para baixo — o usuário não consegue ver/clicar nos primeiros portos. Causas combinadas:

1. `CommandList` não tem `max-h` explícito; herda o default do shadcn (`max-h-[300px] overflow-y-auto`), mas quando o `Command` recebe um `value` controlado (ou o último item destacado), o `cmdk` chama `scrollIntoView` no item ativo e desloca a lista para baixo, escondendo o topo.
2. Não há reset do highlight ao abrir, então o popover reabre na mesma posição em que estava.
3. Falta affordance visual de "scroll" e de seleção múltipla (o porto é multi-select, mas o popover não mostra contagem, "Selecionar todos" nem "Limpar").
4. País usa o mesmo padrão e sofre dos mesmos problemas (lista longa de países sem "fixar" o input de busca, sem indicador de país selecionado em destaque no topo).

Nenhuma regra de negócio, validação, RLS, freight, incoterm ou estado de oferta muda — somente UI/UX dos dois pickers.

## Solução (somente front-end)

**Arquivo único:** `src/pages/supplier/SupplierCreateOfferV2Desktop.tsx`, componente helper `OriginSection` (linhas ~270–440). O drawer mobile (`LogisticsSheetMobile.tsx`) já usa chips verticais e não tem o bug; fica intocado.

### 1. Corrigir o scroll do popover de portos (bug do "primeiro item cortado")

- Adicionar `max-h-[280px] overflow-y-auto overscroll-contain` explicitamente no `CommandList` (não confiar no default do cmdk).
- Forçar reset do highlight ao abrir cada popover: prop `value=""` controlada no `<Command>` e `setValue("")` no `onOpenChange(true)`. Isso elimina o `scrollIntoView` que estava deslocando a lista.
- `PopoverContent` ganha `sideOffset={4}` e `collisionPadding={12}` para nunca encostar no header/footer do drawer.

### 2. Melhorar usabilidade do picker de **País** (origem)

- Manter `CommandInput` (já existe), mas adicionar `autoFocus` ao abrir.
- Header sticky dentro do `CommandList`: input fica fixo no topo, lista rola por baixo.
- Item selecionado renderiza com leve destaque (`bg-muted/40`) e o `Check` em verde.
- Mostrar o nome em inglês + emoji da bandeira (já tem) e adicionar o código ISO em cinza menor à direita, para reduzir ambiguidade entre países com nomes parecidos.
- Botão "Limpar país" (`X`) inline no trigger quando há país selecionado, para desfazer rapidamente.

### 3. Melhorar usabilidade do picker de **Porto** (origem, multi-select)

- Lista virou multi-select de fato (já é), mas o trigger só dizia "N port(s) selected". Trocar por: quando 1 selecionado → mostra o nome; 2+ → mostra primeiro + `+N`; nada → "Adicionar porto".
- Adicionar barra de ações no topo do popover (logo abaixo do `CommandInput`, sticky):
  - **Contador**: "N selecionado(s) de M".
  - **Selecionar todos** (filtrados) / **Limpar** quando há filtro digitado, opera apenas sobre os visíveis.
- Cada `CommandItem` mostra checkbox no lugar do `Check` (visual mais claro de multi-select), nome do porto + código `(BRSSZ)` em cinza menor.
- Itens já selecionados sobem para o topo da lista (sort estável: selecionados primeiro, restante por ordem alfabética). Assim o usuário sempre vê o que já escolheu sem precisar rolar.
- Popover não fecha após cada toggle (já é o comportamento atual, mantido).
- O bloco de chips removíveis abaixo (já existente) ganha botão pequeno "Limpar todos" quando tem 2+ chips.

### 4. Comportamento responsivo

- O trigger do botão usa `truncate` no texto, ícone com `shrink-0`. Em larguras menores do drawer (tablet), o `grid-cols-2` do par País/Porto cai para `grid-cols-1` em `< sm` para nunca espremer o trigger.
- `PopoverContent` mantém `w-[var(--radix-popover-trigger-width)]` no desktop e cresce para `min-w-[280px]` em telas estreitas, garantindo que o nome do porto + código caibam em uma linha.

## Não alterar

- Nenhuma lógica de logística, validação de FOB/EXW (`tooManyPorts`), freight, lista de incoterms, parsing de AI Quick-fill, RLS, edge function ou hooks.
- Componentes não-relacionados (mobile sheet, destinos, container, freight, distribution, payment, cuts).
- Estado/contrato de `OriginSection` (mesmas props `countryId`, `portIds`, `onCountryChange`, `onPortIdsChange`).

## Verificação

Abrir `/supplier/offers/new` → "Edit logistics" → Origem em três larguras (1440, 1024, 820 px):

- Abrir o popover de **Portos** com Brasil selecionado → primeiro item (Itajaí) totalmente visível, scroll funcionando, contador no topo, marcar/desmarcar funciona sem fechar.
- Abrir popover de **País** → input em foco, lista rolável até o fim, item escolhido fica destacado.
- Trigger do porto mostra nome do porto selecionado (ou "+N") em vez de só contar.
- Nada quebra em mobile (mobile usa outro componente).
