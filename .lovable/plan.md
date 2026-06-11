## Objetivo
Dar mais peso visual ao bloco **"Price details — full history"** na tela de negociação (buyer e supplier), deixando claro que ali está o coração da conversa de preços. Sem mexer em lógica, dados ou layout da tabela — só no header do card, no contorno e em micro-animação.

## O que muda (escopo visual apenas)

### 1. Header com identidade própria
No `PriceHistoryTable` (`src/components/negotiation/PriceHistoryTable.tsx`), redesenhar só o bloco `nd-price-history__head`:

- Barra de acento vertical à esquerda do card (gradiente Mundus rosa → âmbar suave), 4px.
- Ícone atual trocado por um "chip" arredondado com fundo rosa-claro e ícone `History` em rosa-Mundus.
- Título maior, peso 700, cor `--foreground`. Subtítulo em uma linha menor, ex.: *"Acompanhe cada rodada de bid e counter"* (i18n nas 5 línguas).
- O resumo do canto direito (`Asking + N rounds · $X → $Y`) vira um mini-stat:
  - dois valores empilhados com seta animada entre eles
  - cor condicional: verde se Y < X (buyer ganhou), rosa se Y > X
  - micro-rótulo: *"N rodada(s) negociada(s)"*.

### 2. Animação de entrada e foco
Em `src/styles/negotiation-detail.css`:

- `.nd-price-history` ganha `animation: nd-ph-enter 420ms ease-out both` (fade + slide-up 8px no mount).
- Sweep de luz percorrendo o header 1x logo após o mount (`::after` com gradient + keyframe `nd-ph-shimmer`, 1.2s, sem loop).
- Pulse infinito sutil (2s, opacity 0.5↔1) no dot do número do round mais recente no `<thead>` da tabela.

Tudo CSS puro, respeitando `prefers-reduced-motion` (desativa shimmer + pulse).

### 3. Estado "atualizado agora"
Detectar no componente se a última rodada (último `cut_round` com timestamp) foi há menos de 24h. Quando verdadeiro:

- Card recebe a classe `is-fresh` → contorno ganha `box-shadow: 0 0 0 1px rosa, 0 8px 24px -12px rosa/30%` e um glow sutil.
- Pequeno badge animado no header: ponto verde com pulse + texto *"Atualizado agora"* / *"Atualizada há Xh"*.
- Quando passa de 24h, classe sai e o card volta ao estado neutro automaticamente.

A "data da última rodada" é derivada dos `products` já recebidos como prop (maior `updatedAt`/`createdAt` entre os cut_rounds existentes). Se a prop não trouxer timestamp, adicionamos um campo opcional `lastRoundAt?: string` em `Props` — passado pelos dois callers (buyer e supplier negotiation detail). Sem timestamp, o badge simplesmente não aparece (degradação graciosa).

## Arquivos afetados
- `src/components/negotiation/PriceHistoryTable.tsx` — header redesenhado, badge "fresh", mini-stat, prop opcional `lastRoundAt`.
- `src/styles/negotiation-detail.css` — novas regras `.nd-price-history__head`, `.nd-ph-accent`, `.nd-ph-stat`, `.nd-ph-fresh-pill`, keyframes `nd-ph-enter` / `nd-ph-shimmer` / `nd-ph-pulse`, bloco `@media (prefers-reduced-motion)`.
- `src/pages/buyer/BuyerNegotiationDetail.tsx` e `src/pages/supplier/SupplierNegotiationDetail.tsx` — passar `lastRoundAt` se já disponível no payload (1 linha cada).
- `src/i18n/locales/{en,pt,es,fr,zh}.json` — chaves `negotiation.history.subtitle`, `negotiation.history.roundsCount`, `negotiation.history.freshNow`, `negotiation.history.freshAgo`.

## Fora de escopo
- Nenhuma mudança na tabela em si (colunas, números, lógica de gap/movement).
- Nenhuma mudança em motor de negociação, RPC, dados ou cálculos.
- Sem novas dependências (CSS puro, sem framer-motion novo).

## Mobile
Header empilha em telas <720px (já existe `.nd-price-history__head` em coluna no media query); o mini-stat e o badge "fresh" ficam abaixo do título, sem quebrar a tabela horizontal já existente.
