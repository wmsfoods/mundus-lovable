## Problema

No Supplier → Create new offer, ao abrir o seletor de idioma (Globe na topbar), as opções do meio (Español, parte do Português) ficam atrás do bloco branco "kg | lbs | Live preview" da página, e o item 中文 aparece num segundo "andar" abaixo do bloco. É bug visual de empilhamento (z-index).

## Causa

Em `src/styles/mundus-shell.css`:

- `.tb` (topbar) é `position: sticky` com `z-index: 10` (linha 262).

Em `src/styles/mundus-create-offer-v2.css`:

- `.cov4-header` é `position: sticky` com `z-index: 20` (linha 25).
- `.cov4-footer` é `position: sticky` com `z-index: 20` (linha 494).

Como a topbar é sticky com z-index, ela cria um *stacking context*; portanto o dropdown de idioma (z-index inline 50) fica confinado ao contexto da topbar — globalmente ele ainda paga em z = 10. O `.cov4-header` da página de criar oferta paga em z = 20 e por isso pinta por cima do dropdown.

## Correção

Subir a topbar acima dos elementos sticky da página de criar oferta.

**Arquivo:** `src/styles/mundus-shell.css`

- Mudar o `z-index: 10` da classe `.tb` (linha 262) para `z-index: 30` — fica acima de `.cov4-header`/`.cov4-footer` (20) e abaixo do sidebar drawer/backdrop (39/40) e modais (≥60), mantendo a hierarquia atual.

O dropdown interno continua com z-index 50 inline, agora dentro de um contexto de empilhamento topbar = 30 (global), suficiente para sobrepor o conteúdo da página.

## Escopo / não escopo

- Só ajusta o z-index da topbar; nenhuma alteração de comportamento ou layout.
- Verifico o mesmo fluxo de abrir o seletor de idioma na tela de criar oferta para confirmar visualmente que todas as opções aparecem.

## Arquivos afetados

- `src/styles/mundus-shell.css` (1 valor alterado)
