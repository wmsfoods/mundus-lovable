## Problema

O `AdminShell` usa um layout próprio (`adm-sidebar` + `adm-topbar`) que não tem responsividade mobile — não há `BottomNav`, `MobileDrawer` nem `StackHeader`. Por isso, no celular o admin fica sem menu/navegação.

Os shells `BuyerShell` e `SupplierShell` já seguem um padrão consistente baseado em `Sidebar`, `Topbar`, `BottomNav`, `MobileDrawer` e `StackHeader`, controlados por `useIsMobileShell()` e `isStackRoute()`.

## Solução

Reescrever `src/pages/admin/AdminShell.tsx` para usar exatamente o mesmo padrão de shell mobile dos outros papéis, mantendo todos os itens de navegação atuais do admin (Dashboard, Companies, Deals, Negotiations, Verifications, Disputes, Prospects, Pipeline, Products, Markets, Ports, Revenue, Commissions, Team, Audit, Flags).

### Estrutura nova do AdminShell

- `StackHeaderProvider` na raiz.
- `div.app-shell` com classes `is-mobile` / `is-stack` calculadas via `useIsMobileShell()` e `isStackRoute(location.pathname)`.
- `<Sidebar items={ADMIN_NAV} rolePill={t("shell.admin")} userName userSubtitle={company?.name} />` — usado no desktop e dentro do `MobileDrawer`.
- `<Topbar onMenuClick={() => setDrawerOpen(true)} />` no topo (ou `<StackHeader />` quando em rota de stack mobile).
- `<main className="app-main"><Outlet /></main>`.
- `<BottomNav items={ADMIN_BOTTOM} />` no mobile (quando não estiver em stack).
- `<MobileDrawer items={ADMIN_NAV} rolePill={t("shell.admin")} ... />` no mobile.

### Itens de navegação

`ADMIN_NAV` (sidebar/drawer) — mantém todos os links atuais; cada grupo vira um item com `groupLabel` (mesmo mecanismo já usado no Supplier para "Insights") para preservar a divisão visual entre Overview / Operations / CRM / Marketplace / Finance / Settings. Ícones permanecem os atuais (lucide-react).

`ADMIN_BOTTOM` (5 itens) — escolha pragmática para mobile:
1. Dashboard (`/admin/dashboard`) — `LayoutDashboard`
2. Companies (`/admin/companies`) — `Building`
3. Deals (`/admin/deals`) — `Package`, `accent: true`
4. Prospects (`/admin/crm/prospects`) — `Users`
5. Verifications (`/admin/verifications`) — `ShieldCheck`

### i18n

Adicionar a chave `shell.admin` em `src/i18n/locales/{en,pt,es}.json` (espelhando `shell.buyer` / `shell.supplier`) para o `rolePill`.

### Limpeza

Remover o uso das classes próprias `adm-app` / `adm-sidebar` / `adm-main` / `adm-topbar` etc. do JSX. Os estilos CSS antigos em `src/styles` podem ser deixados em paz por ora (sem referências quebradas, apenas não usados); não tocaremos em CSS para manter o escopo só de frontend de shell.

## Arquivos alterados

- `src/pages/admin/AdminShell.tsx` — reescrito no padrão Buyer/Supplier.
- `src/i18n/locales/en.json`, `pt.json`, `es.json` — adicionar `shell.admin`.

## Fora do escopo

- Nenhuma mudança em rotas, páginas internas do admin, banco de dados, RLS, ou no switch de papéis (que já mostra Admin corretamente após o fix recente do `useIsMundusAdmin`).
