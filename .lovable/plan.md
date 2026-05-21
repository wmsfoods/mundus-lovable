## Diagnóstico (390×844, /buyer/negotiations/bb-01)

Pontos fracos observados na tela atual:

1. **Header** — avatar + título + timer + pill "Action required" empilham mas com gaps grandes; o pill fica "solto" abaixo do timer numa terceira linha.
2. **Meta chips** — rola horizontal (ok), mas sem indicação visual de scroll e com chip cortado pela direita.
3. **Stats (Asking / Your bid / Supplier counter)** — empilhados em 3 cards full-width gastam muito scroll vertical; valores em 22px desperdiçam espaço.
4. **Card head (Round 2 of 3 + Updated)** — quebra mal, "Updated" some pra direita.
5. **Botões de ação (Accept / Counter / Reject)** — ocupam ~56px cada empilhados; ficam embaixo do fold e o usuário precisa rolar pra decidir.
6. **Card "joined" (supplier info)** — `margin-top: -16px` cria sobreposição estranha no mobile.
7. **Timeline horizontal** — pills ok, mas falta gradient/fade indicando scroll.
8. **Price table** — sticky first column já existe, mas o wrap não tem indicação clara de scroll horizontal e o título "Price details" fica numa linha solta.
9. **Padding geral dos `.nd-card`** — 20px é pesado no mobile (já tem 14px @640, mas pode ir mais enxuto).

## O que vou mudar

### 1. CSS — `src/styles/mundus-negotiations.css` (@media max-width: 640px)

- **Header (`.nd-header`)**
  - Layout em duas linhas: linha 1 = avatar + título/sub (flex-row); linha 2 = timer + pill status (flex-wrap, justify-start).
  - Reduzir padding pra 14px; título 17px line-height 1.25; sub em 12px com truncate de 2 linhas.

- **Meta chips (`.nd-meta-chips`)**
  - Manter scroll horizontal, adicionar fade à direita (gradient `::after`), `scroll-snap-type: x proximity` e padding-right 24px pra revelar o último chip.
  - Chips em 11px, padding 5px 10px.

- **Card head (`.nd-card-head`)**
  - `flex-wrap: wrap; gap: 6px`; em mobile o `nd-updated` cai pra linha de baixo com `width: 100%; text-align: left`.
  - Reduzir padding do `.nd-card` pra 12px e `margin-bottom` 10px.

- **Stats (`.nd-stats`)**
  - Mudar pra `grid-template-columns: 1fr 1fr` no mobile (Asking + Your bid lado a lado em cards compactos) e **Supplier counter ocupando linha cheia** (`grid-column: 1/-1`) com destaque verde.
  - `.nd-stat` padding 10px, label 10px, value 16px. Supplier counter destaca value em 20px.

- **Gap row / bar**
  - Reduzir altura da bar pra 5px, knob 12px, labels 10px.

- **Actions (`.nd-actions`)**
  - No mobile: virar **sticky bottom bar** (`position: sticky; bottom: 0`) com `background: #fff; border-top: 1px solid var(--border); padding: 10px 14px; margin: 0 -14px -14px`; grid `1fr 1fr` com botão **Counter (primário) ocupando a linha de cima full-width** + Accept/Reject lado a lado embaixo. Tamanho dos botões 44px (touch target), font 13px.
  - Garante safe-area: `padding-bottom: max(10px, env(safe-area-inset-bottom))`.

- **Card joined (`.nd-card--joined`)**
  - No mobile: remover o `margin-top: -16px` e a borda tracejada; vira card separado normal.
  - `dl` já empilha — manter, mas reduzir `gap` pra 4px e separar pares com `border-bottom: 1px dashed #f0f0f0`.

- **Timeline (`.nd-timeline-flow`)**
  - Adicionar fade `::after` à direita pra indicar scroll. Diminuir setas `→` pra 12px.

- **Price table wrap (`.nd-price-scroll-wrap`)**
  - Já tem fade no CSS atual; garantir altura mínima e adicionar hint textual "← deslize →" só na 1ª vez (via `:has(table)` + `::before` pequeno em 10px cinza, opcional/leve).
  - Reduzir font da tabela pra 10.5px no 390px, padding 6px 4px.

### 2. TSX — `src/pages/buyer/BuyerNegotiationDetail.tsx` e `src/pages/supplier/SupplierNegotiationDetail.tsx`

Mudanças simétricas, mínimas:

- Envolver header em duas divs internas (`nd-h-main` com avatar+texto, `nd-h-meta` com timer+pill) para o CSS conseguir empilhar limpo no mobile sem `flex-wrap` confuso.
- Adicionar classe `nd-stat--full` no card "Supplier counter" / "Your counter" pra ativar o `grid-column: 1/-1` no mobile.
- Adicionar wrapper `<div class="nd-actions-wrap">` em volta de `.nd-actions` pra virar sticky no mobile sem afetar desktop (desktop continua inline).
- Nenhuma mudança de lógica/negócio.

### 3. Validação

- Verificar em 390×844 (iPhone 12/13), 360×800 (Android pequeno) e 768 (tablet) que:
  - Header não quebra estranho.
  - Stats ficam 2+1.
  - Botões sticky aparecem só < 640px.
  - Price table rola e mantém primeira coluna fixa.
  - Nada estoura a largura (overflow horizontal da página = 0).

## Arquivos editados

- `src/styles/mundus-negotiations.css`
- `src/pages/buyer/BuyerNegotiationDetail.tsx`
- `src/pages/supplier/SupplierNegotiationDetail.tsx`
