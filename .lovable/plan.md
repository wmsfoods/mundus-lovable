## Objetivo

Substituir os submenus de "Mundus Intel" por um item único no sidebar que abre uma **tela hub** com cards de **pacotes/add-ons**. Hoje só existe 1 pacote por lado (o que já está configurado no Stripe). As features internas (Price Benchmark, Analytics, Market Intelligence, Procurement Intelligence) continuam existindo nas mesmas rotas — só muda a porta de entrada.

## Estado atual

**Supplier sidebar** (`src/layouts/SupplierShell.tsx`) — grupo "Mundus Intel":
- Price Benchmark → `/supplier/insights/price-benchmark` (PRO `supplier_pro`)
- Analytics → `/supplier/insights/analytics` (PRO `supplier_pro`)
- Market Intelligence → link externo `market-us.mundustrade.com` (PRO)

**Buyer sidebar** (`src/layouts/BuyerShell.tsx`) — grupo "Mundus Intel":
- Procurement Intelligence → `/buyer/procurement-intelligence` (PRO `buyer_pro`)
- Market Intelligence → link externo (PRO)

Stripe já tem 2 planos: `supplier_pro` ($1000/mo) e `buyer_pro` ($300/mo) — `src/lib/proSubscription.ts`.

## Mudanças

### 1. Novas rotas hub
- `src/pages/supplier/SupplierMundusIntel.tsx` (rota `/supplier/mundus-intel`)
- `src/pages/buyer/BuyerMundusIntel.tsx` (rota `/buyer/mundus-intel`)

Cada página renderiza o hub com cards de pacote. Reaproveita `PageTitle` e CSS do projeto (`mundus-insights.css` ou um novo `mundus-mundus-intel.css` enxuto).

### 2. Configuração de pacotes
Criar `src/lib/mundusIntelPackages.ts` com os dados de cada pacote:

```ts
// Supplier: 1 pacote "Analytics Package" — supplier_pro — $1000/mo
//   features: Price Benchmark, Analytics, Market Intelligence
// Buyer:    1 pacote "Intelligence Package" — buyer_pro — $300/mo
//   features: Procurement Intelligence, Market Intelligence
```

Cada feature interna do card guarda `{ label, description, icon, to | externalUrl }`.

### 3. Card de pacote (componente)
`src/components/mundus-intel/PackageCard.tsx`:
- Header com nome do pacote, badge PRO, preço `$X / month`.
- Lista das features incluídas (3 para supplier, 2 para buyer) com ícone + título + descrição curta.
- Estado por subscrição (usa `useCompanySubscription` + `planForFeature`):
  - **Assinante** → botão "Open feature" em cada feature (`<Link>` para a rota; externos abrem em nova aba).
  - **Não assinante** → botão único "Subscribe — $X/mo" que chama `startProCheckout()` do `proSubscription.ts` (mesmo fluxo já usado em `InsightsUpsellPanel`).
- Layout responsivo: grid 1 col mobile, 2+ cols desktop (igual ao padrão dos cards de ofertas / `action-row`).

### 4. Atualizar shells (sidebar)

**SupplierShell.tsx**: remover os 3 itens (`price-benchmark`, `analytics`, market intel externo) e substituir por:
```ts
{ to: "/supplier/mundus-intel", label: t("shell.nav.mundusIntel"),
  icon: Sparkles, proBadge: false, groupLabel: undefined }
```
Mantém `cut-comparison` (director-only) como antes, ou move para uma seção interna.

**BuyerShell.tsx**: mesma coisa — remove os 2 itens, adiciona `/buyer/mundus-intel`.

**Bottom nav mobile**: mantém como está (Mundus Intel não está no bottom nav hoje).

### 5. Rotas em `App.tsx`
Adiciona:
```tsx
<Route path="mundus-intel" element={<SupplierMundusIntel />} /> // dentro de /supplier
<Route path="mundus-intel" element={<BuyerMundusIntel />} />    // dentro de /buyer
```

As rotas existentes (`insights/price-benchmark`, `insights/analytics`, `procurement-intelligence`) **permanecem intactas** — protegidas pelo `RequirePro` como hoje. O hub apenas linka para elas.

### 6. i18n
Adicionar chaves em `src/i18n/index.ts`:
- `shell.nav.mundusIntel` (já existe como groupLabel — reaproveitar)
- `mundusIntel.title`, `mundusIntel.subtitle`
- `mundusIntel.packages.analytics.*` (supplier)
- `mundusIntel.packages.intelligence.*` (buyer)
- CTAs: `subscribe`, `openFeature`, `included`, `currentPlan`

### 7. Mobile
Hub vira lista vertical de cards (1 col), botão de assinar full-width, safe-area respeitada (segue regra de memória mobile do projeto).

## Fora de escopo
- Não muda Stripe / produtos / preços.
- Não muda as páginas das features (Price Benchmark, Analytics, Procurement Intelligence, Market Intelligence externo).
- Não mexe no `RequirePro` nem em `InsightsUpsellPanel` (continuam funcionando para deep-links diretos).
- `cut-comparison` (admin-only) continua acessível pela rota direta; pode ficar fora do hub.

## Validação
1. Sidebar Supplier mostra "Mundus Intel" único; clique abre hub com 1 card "Analytics Package — $1000/mo" listando 3 features.
2. Não assinante → botão Subscribe redireciona pro Stripe checkout.
3. Assinante → cada feature abre a rota correspondente (Market Intelligence abre externo em nova aba).
4. Mesmo fluxo no Buyer com 1 card "Intelligence Package — $300/mo" e 2 features.
5. Deep-link direto `/supplier/insights/analytics` continua funcionando (com gate PRO existente).
6. Responsivo no mobile (iPhone): cards em coluna, CTA confortável, sem overflow.
