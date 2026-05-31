# Project Memory

## Core
Desktop é foco principal, mas TODA funcionalidade precisa de experiência mobile responsiva, fluida e bem pensada (versão "pocket" do sistema).
Mobile: navegação simples, toques confortáveis, espaçamentos consistentes, respeitar safe-area/notch, sem tabelas complexas, priorizar cards/listas verticais/bottom sheets, usabilidade com uma mão, validar em telas pequenas (iPhone/Android).
Mobile Way (regras obrigatórias, não alterar desktop >1024px):
- Breakpoint único do shell mobile: 1024px. Usar `useIsMobileShell()` / `.app-shell.is-mobile` — NUNCA `useIsMobile` (768) ou `md:` para layout do shell (causa tela vazia 769–1023px).
- Navegação: BottomNav só em tab roots. Buyer tab roots = `/buyer`, `/buyer/offers`, `/buyer/chat`, `/buyer/orders`. Supplier = `/supplier`, `/supplier/offers`, `/supplier/negotiations`, `/supplier/sales`. Tudo o resto (detalhes `:id`, `/new`, `/edit`, listas secundárias, profile, notifications, company, insights, procurement, auctions) = stack route com StackHeader (voltar + título), sem BottomNav.
- Registrar toda rota nova em `src/lib/mobile-nav.ts` (`isStackRoute`, `STACK_TITLES`, `BACK_FALLBACK`). Em stack, NÃO renderizar back/h1 in-page — usar `useStackHeader({ title })` e ocultar chrome duplicado via `src/styles/mundus-stack-header.css` (`.btn-back`, `.profile-back`, `.ddv-back`, `.bcr-header`, `.cov4-header`, `.ntf-header h1`).
- Scroll: navbar/StackHeader/BottomNav nunca rolam — só o conteúdo. Padrão auth fora do shell: `h-[100dvh] flex flex-col overflow-hidden` no root, header `shrink-0` (sem sticky), `main flex-1 min-h-0 overflow-y-auto`, footer `shrink-0`. NUNCA `min-h-[100dvh] overflow-y-auto` no wrapper que contém a navbar.
- Listas: usar `ListCard` + `ListCardList` + wrapper `has-mobile-cards` (ref: Orders, Sales, Requests). Evitar `data-table` multi-coluna em mobile.
- Filtros/pickers: bottom `Sheet` com draft + Apply/Cancel (ref: `OffersFilterBar`, `NegotiationsFilterSheet`). Nunca Popover/HoverCard/Tooltip para função essencial no touch.
- Modais: `max-sm:!max-w-full max-sm:!h-[100dvh] max-sm:!rounded-none` (ref: `BidModal`, `CounterOfferModal`). Não alterar `dialog.tsx` default.
- Layout: padding mobile = 12px do `.app-main`, não somar no wrapper da página. Grids multi-col empilham @1023px. Dashboards BI = feed vertical de cards + KPI carousel scroll-snap, não painel desktop encolhido. Tap targets ≥44px. Safe-area em header/footer fixos. Breadcrumbs ocultas no shell mobile.
- Anti-patterns proibidos: `useIsMobile` (768) para shell; `hidden md:block`/`md:hidden` para swap tabela/cards; inline grids fixos sem `@media`; BottomNav em create/detail/settings; hover-only essencial; `overflow-y-auto` no root com navbar.
- Checklist PR mobile (375px + Capacitor): rota registrada em mobile-nav? StackHeader em fluxos? Um único voltar? Scroll só no conteúdo? Cards em vez de tabela? Sheet em vez de Popover? Modal fullscreen? Breakpoint 1024? Desktop inalterado?
- Doc completo: `docs/MOBILE-WAY.md`.
