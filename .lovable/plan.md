## Problema

No desktop, quando o sidebar está colapsado (largura 64px):
- O logo wordmark da Mundus continua sendo renderizado em tamanho cheio e fica espremido/cortado dentro de 64px.
- Os badges "PRO" / "NEW" continuam aparecendo ao lado dos ícones e estouram a coluna.
- O `sb-section-body` mantém `border-left` + `margin-left: 14px`, então as linhas dos sub-itens ficam tortas/recuadas dentro de um rail estreito.
- O botão de colapsar fica no header junto com o logo apertado, gerando má distribuição.
- Falta feedback de hover (tooltip) já que os labels somem.

## O que vou ajustar

Apenas CSS + pequenos ajustes no `Sidebar.tsx` (presentação). Sem mexer em lógica.

### 1. `src/components/mundus/Sidebar.tsx`
- Quando `collapsed === true`, substituir o `<Logo />` por um monograma "M" (chip wine 32x32, mesma identidade visual) — evita espremer o wordmark.
- Mover o `sb-collapse-toggle` para fora do `sb-logo` quando colapsado, centralizado abaixo do monograma (ou mantê-lo como único elemento no header colapsado, centralizado).
- Adicionar `title={item.label}` em cada `NavLink`/section header para servir como tooltip nativo no estado colapsado.

### 2. `src/styles/mundus-shell.css` — bloco `@media (min-width: 1024px)` para `.sb.is-collapsed`
- Header colapsado: `padding: 12px 0`, `flex-direction: column`, `gap: 8px`, `justify-content: center`, sem `flex-wrap`.
- Monograma: 32x32, `border-radius: 10px`, fundo `var(--p800)`, texto branco bold.
- `.sb-item`, `.sb-section-header`: largura 40px, altura 40px, `margin: 2px auto`, `border-radius: 10px`, padding zero, ícone 20px centralizado. Hover/active preenchem só esse quadrado (não a faixa inteira).
- Esconder também `.pro-badge` e qualquer `.sb-item-badge`/`.nav-new-badge` no estado colapsado (hoje só badge/new estão escondidos, PRO não).
- `.sb-section-body`: remover `border-left`, `margin-left`, `padding-left` no colapsado; manter sub-itens como quadrados centralizados de 40px (ou esconder o body inteiro e abrir só ao clicar — ver questão abaixo).
- `.sb-user` colapsado: só o avatar 32x32 centralizado, sem borda superior pesada (`padding: 10px 0`).
- `.sb-collapse-toggle` colapsado: 28x28, centralizado, sem `margin-left: auto`.
- Tooltip nativo via `title` é suficiente; sem dependência nova.

### 3. Comportamento das seções colapsáveis no rail estreito
Hoje, ao colapsar, o `chevron` some mas o `sb-section-body` continua expandido empilhando ícones dos filhos sem hierarquia visual. Proponho: no estado colapsado, esconder o `sb-section-body` por padrão e mostrar apenas o ícone do header da seção (clique reabre via expansão automática do sidebar — fora de escopo). Alternativa mais simples: manter os filhos visíveis como quadrados, sem indent/borda. Vou seguir a alternativa simples para não mudar comportamento.

## Resultado esperado

Rail de 64px limpo:
- Topo: monograma "M" wine + botão de expandir logo abaixo.
- Itens: quadrados 40x40 centralizados, hover/active destacando só o quadrado.
- Sem PRO/NEW/contadores transbordando.
- Sub-itens alinhados ao centro, sem borda lateral órfã.
- Tooltip nativo ao passar o mouse.
