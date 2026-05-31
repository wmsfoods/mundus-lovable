## Mobile Way — Execução dos P0

Plano focado nos 6 itens P0 do relatório. Desktop (>1024px) permanece intocado; tudo isolado via `.app-shell.is-mobile`, `.app-shell.is-stack` e `useIsMobileShell()`.

### 1. Scroll do SignupShell (navbar fixa, só conteúdo rola)

`src/pages/signup/SignupShell.tsx`: trocar wrapper para `h-[100dvh] flex flex-col overflow-hidden`, header `shrink-0` (remover `sticky`), `<main className="flex-1 min-h-0 overflow-y-auto">`. Validar Login se aplicável.

### 2. Breakpoint 1024 — fechar gap 769–1023px

- `src/styles/mundus-offers.css`: subir oculto de `.crumbs` de @767px para o seletor global `.app-shell.is-mobile .crumbs { display: none }` em `mundus-shell.css`.
- Auditar páginas que usam `useIsMobile` (768) para decisões de layout (não shell) — listar e migrar para `useIsMobileShell` quando for swap tabela/cards ou popover/sheet. Alvos confirmados pelo relatório: `SupplierCreateOffer` (CutPhotoCell HoverCard) + pickers em `BuyerCreateRequest`.

### 3. Stack routes — completar matriz

Adicionar a `src/lib/mobile-nav.ts` (`STACK_PATHS`, `STACK_PATTERNS`, `BACK_FALLBACK`, `STACK_TITLES`):

- `/buyer/auctions`, `/buyer/auctions/:id`
- `/buyer/requests/new`, `/buyer/offers/:id/bid`
- `/supplier/offers/new`, `/supplier/offers/:id/edit`
- `/supplier/company`, `/buyer/company` (se existir)
- `/supplier/insights/*`, `/buyer/insights/*` restantes (procurement, demand)
- `/supplier/sales` (lista secundária quando aplicável — verificar se é tab root)
- `/buyer/orders/:id/*` sub-rotas

Critério: qualquer rota não listada como tab root vira stack.

### 4. Chrome duplicado — backs e h1 in-page

Expandir seletores em `src/styles/mundus-stack-header.css` para ocultar quando `.app-shell.is-stack`:

- `.profile-back`, `.ntf-header h1`, `.bcr-header`, `.cov4-header`, `.ddv-back`, `.btn-back`
- adicionar: headers de `BuyerRequests`, `Auction*`, `SupplierCreateOffer` header, `BuyerCreateRequest` header, `ProcurementIntelligence` h1, `Notifications` h1, `Profile` back inline.

Páginas afetadas validadas via grep por `class.*-header` / `<h1` nas rotas stack.

### 5. Tabelas críticas → ListCard

`src/pages/buyer/BuyerRequests.tsx` e `src/pages/buyer/ProcurementIntelligence.tsx`:

- Envolver tabela em `<div className="has-mobile-cards">` para herdar `src/styles/mundus-list-card.css`.
- Criar variação `ListCard` no mobile (`useIsMobileShell()`) replicando colunas-chave (status, qty, ETA, ação).
- Padrão de referência: `src/pages/buyer/Orders.tsx`.

### 6. Validação

- Smoke manual em viewport 375 e 1024 (limite) das rotas tocadas.
- Confirmar desktop ≥1024px inalterado (sem mudanças em `md:` / grids `lg:`).
- Rodar `tests/mundus/09-visual-audit.spec.js` quando o usuário publicar no CI.

### Fora de escopo (P1/P2)

Polish de modais sem fullscreen, padding double, headers duplicados restantes, dashboards BI em feed vertical — abrir como próxima iteração depois deste P0.

### Riscos

- Mudar seletores CSS de ocultação pode esconder elementos legítimos em desktop se mal escopados — todos serão prefixados por `.app-shell.is-stack` ou `.app-shell.is-mobile`.
- Migrar `useIsMobile`→`useIsMobileShell` em criação de oferta toca formulário ativo — escopo limitado a HoverCard/Popover, não muda submit.

Após sua aprovação, sigo executando em ordem 1→6.
