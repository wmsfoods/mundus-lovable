# Redesign de `/supplier/offers` (My Offers)

Refazer a página para bater com o mockup anexado, mantendo dados mock atuais e adicionando alguns campos derivados.

## 1. Estrutura visual (de cima pra baixo)

```text
[Tag] My Offers                                        [+ New offer]   ← header

┌──────┬──────┬──────┬──────┬──────┬──────┐
│  7   │  6   │  0   │  2   │ 805  │  26  │   ← KPI strip (6 cards)
│Total │Avail.│In neg│Exp≤7d│Views │Props │
└──────┴──────┴──────┴──────┴──────┴──────┘

[All] Beef  Pork  Poultry  Ovine       Status ▾  Sort ▾  [▦|≣]   ← filtros
Showing 7 of 7 offers

┌─card─┐ ┌─card─┐ ┌─card─┐ ┌─card─┐ ┌─card─┐ ┌─card─┐   ← grid 6 col (xl)
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

Header substitui o atual hero (`<section class="hero">`) + breadcrumbs + PageTitle por um header compacto: ícone Tag em pílula rosa + "My Offers" à esquerda, botão **+ New offer** brand rosa à direita. Sem breadcrumb (a referência não mostra).

## 2. KPI strip — 6 cards

Cada card: ícone redondo rosa-claro à esquerda, número grande + label cinza. Valores calculados em tempo real do array mock:

- **Total offers** = `MOCK_SUPPLIER_OFFERS.length`
- **Available** = status `active`
- **In negotiation** = status `negotiating`
- **Expiring ≤ 7d** = cards com `daysLeft <= 7` (campo derivado novo)
- **Total views** = soma de `views` derivado
- **Total proposals** = soma de `proposals` derivado

## 3. Filtros e toolbar

- Pílulas de categoria: **All / Beef / Pork / Poultry / Ovine**, segmented, ativo em preto (como mock). `Lamb` no mock vira `Ovine` na UI (label apenas).
- Direita: dropdown **Status: All statuses** + **Sort by: Newest first** (reaproveita lógica atual) + toggle **grid/list** (visual apenas — grid já é o default; list fica como stub que só troca o ícone ativo, sem mudar layout neste commit).
- Linha `Showing X of Y offers` fica abaixo das pílulas, à esquerda.

## 4. Card novo (compacto)

Layout vertical, sem CTA inline rosa antigo. Conteúdo:

```text
[icon] Beef · Frozen   [4 CUTS]            • Available
Beef Premium Cuts — Mixed Container
[Ribeye][Striploin][Tenderloin][+1 more]

DESTINATION         INCOTERM
🇧🇲 Bermuda          CFR
SHIPMENT            VOLUME
End June 2026       25 MT

👁 184 views   💬 4 props   ⏱ 22d left
─────────────────────────────────
QTY 25 MT              [ Open offer → ]
```

Diferenças do card atual:
- Pílula `4 CUTS` rosa mais forte no topo.
- Bloco `DESTINATION/INCOTERM/SHIPMENT/VOLUME` em grid 2x2 com labels uppercase cinza.
- **Volume em MT** (kg/1000), não em USD.
- Nova linha de estatísticas (views / proposals / days-left).
- Footer: `QTY X MT` à esquerda + botão **Open offer →** rosa à direita.
- Sem preço em USD na lista (referência não mostra).

## 5. Dados — campos derivados

Não vou alterar o mock file. Vou computar no componente, a partir do `id`, valores estáveis pseudo-aleatórios:

- `views` = hash(id) mod 200 + 30
- `proposals` = hash(id) mod 7
- `daysLeft` = hash(id) mod 45 + 1
- `volumeMt` = `totalKg / 1000`

Assim os números ficam consistentes entre renders e batem visualmente com o mockup.

## 6. Arquivos

- **Editar** `src/pages/supplier/Offers.tsx` — reescrever JSX + adicionar state `category`, `statusFilter`, `viewMode` e helpers de derivados.
- **Editar** `src/styles/mundus-supplier-offers.css` — adicionar classes novas (`.so-header`, `.so-kpis`, `.so-kpi`, `.so-cat-pills`, `.so-toolbar-r`, `.so-view-toggle`, `.oc-stats`, `.oc-volume`, `.oc-open-btn`, `.cuts-badge-strong`) e ajustar `.oc`, `.oc-head`, `.oc-meta-grid`, `.oc-footer` para o layout compacto. Manter classes antigas que não conflitam.
- **Editar** `src/i18n/locales/en.json`, `pt.json`, `es.json` — novas chaves: `supplier.offers.kpi.total / available / negotiating / expiring / views / proposals`, `supplier.offers.cat.all/beef/pork/poultry/ovine`, `supplier.offers.statusFilter`, `supplier.offers.openOffer`, `supplier.offers.card.volume`, `supplier.offers.card.qty`, `supplier.offers.card.views`, `supplier.offers.card.proposals`, `supplier.offers.card.daysLeft`.

## 7. Responsivo (mobile)

Mobile (≤640px):
- KPI strip: scroll horizontal (snap por card) — mantém densidade sem quebrar.
- Pílulas de categoria: scroll horizontal.
- Cards: 1 coluna full-width.
- Toolbar direita empilha abaixo da contagem.

Breakpoints intermediários: 2 col (sm), 3 col (md), 4 col (lg), 6 col (xl ≥1280).

## 8. Fora do escopo

- Funcionalidade real de filtros status/grid-list (apenas UI; grid mantém o comportamento atual, list é stub visual).
- Mudanças em `mockSupplierOffers.ts`, detail page, ou qualquer outro arquivo fora dos 5 listados.
- Auth, hooks, supabase.

## Verificação

1. `/supplier/offers` renderiza header novo + KPI strip + 7 cards (e 8º Chicken Wings).
2. Trocar idioma PT/ES traduz tudo.
3. Pílula de categoria filtra os cards visíveis e atualiza "Showing X of Y".
4. Click no card abre detail (mantido).
5. Mobile 375px: KPIs scrollam horizontal, cards 1 col.
