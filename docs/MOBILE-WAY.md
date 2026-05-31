# Mobile Way — Mundus Trade

Guia obrigatório para toda feature. Desktop (>1024px) continua foco principal, mas **toda funcionalidade** precisa de versão "pocket" nativa, sem quebrar o desktop.

Resumo das regras vive em `mem/index.md` (Core) — este arquivo é a referência longa.

## Princípio

Mobile não é "desktop encolhido" — é **outro layout** atrás dos mesmos dados, isolado por hooks/CSS. Três camadas de isolamento:

| Camada | Quando ativa | Uso |
|--------|--------------|-----|
| `.app-shell.is-mobile` | viewport <1024px ou Capacitor | CSS layout, esconder chrome web |
| `.app-shell.is-stack` | mobile + rota de detalhe/create | StackHeader, esconder bottom nav, ocultar backs in-page |
| `body.is-native` / `body.is-native-ios` | só Capacitor | tweaks WKWebView |
| `useIsMobileShell()` | JS equivalente ao shell | trocar Popover→Sheet, tabela→ListCard, HoverCard→Dialog |

**Nunca** alterar defaults globais que afetam web (`dialog.tsx`, `use-mobile.tsx` @768px, grids desktop `lg:`).

## 1. Navegação

**Tab roots (BottomNav + Topbar):**
- Buyer: `/buyer`, `/buyer/offers`, `/buyer/chat`, `/buyer/orders`
- Supplier: `/supplier`, `/supplier/offers`, `/supplier/negotiations`, `/supplier/sales`

**Stack (StackHeader iOS, sem BottomNav):** todo o resto — detalhes `:id`, `/new`, `/edit`, listas secundárias (negotiations buyer, requests, auctions), company, insights, procurement, profile, notifications.

Botões "Create" no BottomNav **navegam para stack**, não ficam como tab root na tela de destino.

**Ao criar rota nova:**
1. Registrar em `src/lib/mobile-nav.ts`: `isStackRoute`, `STACK_TITLES`, `BACK_FALLBACK`.
2. Em stack: **não** colocar back/título/h1 in-page — usar `useStackHeader({ title })`.
3. Ocultar chrome in-page via `src/styles/mundus-stack-header.css` (`.btn-back`, `.profile-back`, `.ddv-back`, `.bcr-header`, `.cov4-header`, `.ntf-header h1`).

Referência: `src/pages/buyer/BuyerChat.tsx`.

## 2. Scroll

Navbar / StackHeader / BottomNav **nunca rolam**. Só o conteúdo scrolla.

**App logado (shell):** já correto — scroll só em `.app-main` (`src/styles/mundus-shell.css`).

**Auth / fora do shell** (SignupShell, Login):

```tsx
<div className="h-[100dvh] flex flex-col overflow-hidden">
  <header className="shrink-0">{/* fixo, SEM sticky */}</header>
  <main className="flex-1 min-h-0 overflow-y-auto">{/* ÚNICO scroll */}</main>
  <footer className="shrink-0">{/* opcional */}</footer>
</div>
```

Evitar: `min-h-[100dvh]` + `overflow-y-auto` no mesmo wrapper que contém header; `sticky` como substituto de flex; headers de página (`.bcr-header`, `.cov4-header`) dentro do scroll quando stack mode deveria usar StackHeader.

## 3. Listas e dados

| Desktop | Mobile Way |
|---------|------------|
| `data-table` multi-col | `ListCard` + `ListCardList` |
| Tabela + scroll horizontal | Cards verticais |
| Toolbar densa | Bottom sheet de filtros ou action sheet (⋯) |

Wrapper `has-mobile-cards` + CSS `src/styles/mundus-list-card.css` @1023px. Ref: `Orders.tsx`, `Sales.tsx`, `Requests.tsx`.

## 4. Filtros, pickers e modais

| Desktop | Mobile Way |
|---------|------------|
| Popover inline | Bottom `Sheet` com draft + Apply/Cancel |
| HoverCard | `Dialog` ou Sheet |
| Tooltip hover | Ícone → bottom sheet explicativo |
| Modal `max-w-lg` | `max-sm:!max-w-full max-sm:!h-[100dvh] max-sm:!rounded-none` |
| Modal legacy largo | Sheet em `useIsMobileShell()` |

Refs: `BidModal.tsx`, `CounterOfferModal.tsx`, `OffersFilterBar.tsx`, `NegotiationsFilterSheet.tsx`.

## 5. Layout e espaçamento

- Padding mobile = 12px do `.app-main` — não somar 20–24px no wrapper da página.
- Full-bleed intencional: `-mx-3` explícito.
- Grids multi-col empilham @1023px (KPIs → 2 col ou carousel scroll-snap).
- Dashboards BI: feed vertical de cards, **não** painel desktop encolhido.
- Tap targets ≥44px em CTAs primários.
- `min-w-0` + `truncate` / `line-clamp-2` em textos longos.
- Safe-area: `env(safe-area-inset-*)` em header/footer fixos.
- Breadcrumbs: ocultas em `.app-shell.is-mobile`.

## 6. Checklist PR

No mobile (375px + Capacitor):
- [ ] Rota registrada em `mobile-nav.ts`?
- [ ] StackHeader em fluxos; BottomNav só em tab roots?
- [ ] Um único voltar; sem h1/back duplicado?
- [ ] Scroll só no conteúdo; navbar fixa?
- [ ] Listas em cards (não tabela horizontal)?
- [ ] Filtros/pickers em bottom sheet?
- [ ] Modais fullscreen/sheet no mobile?
- [ ] Breakpoint 1024 (`useIsMobileShell`, não `md:`)?
- [ ] Desktop (>1024px) inalterado?

## 7. Anti-patterns

1. `useIsMobile` (768) para layout do shell — usar `useIsMobileShell` (1024).
2. `hidden md:block` / `md:hidden` para swap tabela/cards — usar `lg:` ou hook shell.
3. Inline styles com grids fixos sem `@media` ou classes mobile.
4. BottomNav visível em create/detail/settings.
5. Hover-only para funcionalidade essencial.
6. `overflow-y-auto` no root que inclui navbar.

## 8. Arquivos-chave

| Assunto | Arquivo |
|---------|---------|
| Rotas stack/tab | `src/lib/mobile-nav.ts` |
| Shell layout | `src/layouts/BuyerShell.tsx`, `src/layouts/SupplierShell.tsx` |
| CSS shell + scroll | `src/styles/mundus-shell.css` |
| Stack header + ocultar backs | `src/styles/mundus-stack-header.css` |
| List cards | `src/styles/mundus-list-card.css` |
| Hook mobile | `src/hooks/useIsMobileShell.ts` |
| Auth layout | `src/pages/signup/SignupShell.tsx` |
| Memória produto | `mem/index.md` |

## Prompt sugerido para Lovable

> Implementar [feature] seguindo o **Mobile Way**: tab root vs stack (`mobile-nav.ts`), scroll só no conteúdo, `useIsMobileShell` @1024px, listas em ListCard, filtros em Sheet, modais fullscreen no mobile. Não alterar layout desktop. Validar em 375px e stack mode.
