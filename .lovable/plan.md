# Create Offer v4 — single-screen, 3 panels

Substituir o wizard atual em `/supplier/offers/new` por um layout de tela única em 3 colunas (Markets/Terms · Cuts & Pricing · Live Preview), conforme `LOVABLE-CREATE-OFFER-V4-SPEC.md` e o protótipo `mundus-create-offer-v4.jsx`.

**Constraint do usuário:** manter o bloco de **Certifications** (Halal, Kosher, USDA, HACCP, BRC, Organic) que existe hoje no sidebar — o spec v4 não mencionava, mas ele fica preservado como uma sub-seção dentro do painel esquerdo (entre Incoterms e Payment terms).

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER  título + origem + 👁 Live preview toggle             │
├────────────┬─────────────────────────┬───────────────────────┤
│ LEFT 340px │ CENTER flex             │ RIGHT 320px (toggle)  │
│ Container  │ Capacity bar            │ Buyer-eye preview     │
│ Temperature│ ✨ AI Import (3 modos)   │ - hero + título       │
│ Markets    │ Cuts table (com fotos,  │ - meta grid           │
│  + ports   │   spec/pkg/grade/aging, │ - lista de cuts       │
│  + freight │   ask/floor/notes)      │ - distribution badges │
│ Incoterms  │ + Add cut inline        │                       │
│ ★ Certifs  │                         │                       │
│ Payment    │                         │                       │
│ Distribut. │                         │                       │
├────────────┴─────────────────────────┴───────────────────────┤
│ FOOTER  resumo · Save draft · Review & publish               │
└──────────────────────────────────────────────────────────────┘
```

Mobile (<900px): colunas empilham; right panel vira accordion no topo quando aberto.

## Mudanças

### Arquivos novos
- `src/styles/mundus-create-offer-v2.css` — tokens do v4 (chips de mercado, market cards, ports, incoterm grid, cuts table com thumbs, AI panel, live preview)
- `src/components/supplier/create-offer/MarketSelector.tsx` — chips de países
- `src/components/supplier/create-offer/MarketCard.tsx` — card expandido por mercado (ports + freight, "same freight?" toggle)
- `src/components/supplier/create-offer/IncotermSelector.tsx` — grid 3×2 + campos condicionais (CIF insurance, EXW/DDP/DAP city)
- `src/components/supplier/create-offer/CutsTable.tsx` — tabela com foto, categoria+cut, spec/pkg/grade/aging, qty, ask/floor, notes
- `src/components/supplier/create-offer/CutAddRow.tsx` — linha inline de adição
- `src/components/supplier/create-offer/AiImportPanel.tsx` — 3 modos (paste/file/voice), mock de parser
- `src/components/supplier/create-offer/LivePreview.tsx` — buyer-eye card
- `src/components/supplier/create-offer/DistributionOptions.tsx` — 3 checkboxes + customer chips

### Arquivos editados
- `src/pages/supplier/SupplierCreateOffer.tsx` — substituído pela nova composição em 3 colunas (mantém rota e `from=requestId` prefill)
- `src/i18n/locales/{en,pt,es}.json` — namespace `supplier.createOffer.v4.*` com todas as labels (markets, incoterms condicionais, AI import, distribution, certifications, preview)
- `src/styles/mundus-create-offer.css` — manter ou remover? **Manter** os tokens `.co-*` reutilizáveis (botões, footer); remover apenas o que conflita com v2

### Certifications (preservado)
Sub-seção no painel esquerdo, abaixo de Incoterms:
- Label: "Certifications"
- Tags toggleable: Halal, Kosher, USDA, HACCP, BRC, Organic
- Mesmo visual `.co-tag` que já temos
- Estado: `certifications: string[]` (igual ao atual)
- Aparece no Live Preview como badges quando selecionado

### Mocks
- `MARKETS` (China, Saudi Arabia, UAE, Egypt, Argentina, HK, Philippines, Chile) com ports
- `CUTS_DB` por espécie (Beef, Pork, Poultry, Lamb)
- `PAY_TERMS`, `INCOTERMS` com `extra` field
- `MOCK_CUSTOMERS` para distribuição específica
- AI Import: mock que injeta 2 cuts pré-definidos após 2s

### Comportamento
- Container: 20ft = 13.000 kg, 40ft = 28.000 kg
- Capacity bar: <70% rosa, 70–95% âmbar, >95% verde
- "Same freight for all ports?" só aparece com 2+ ports
- Incoterm extras renderizam abaixo da grid (campos condicionais)
- Publish habilitado quando: ≥1 mercado + ≥1 cut + ≥1 incoterm
- Pré-preenchimento via `?from=requestId` mantido

### Fora do escopo (mock, não backend)
- Sem edge function `parse-cuts` (AI = mock setTimeout)
- Sem upload real de fotos (DataURL local)
- Sem persistência no Supabase (toast no publish)

## Detalhes técnicos

- Design tokens: `var(--p800)` `#B64769`, `var(--p900)` `#752642`, `var(--bg-brand-soft)`, fonte Inter via `var(--font-sans)`
- Borders 8px cards / 6px inputs / 999px chips, labels uppercase 9–10px
- Mobile: respeitar safe-area, single column, bottom sheet para preview
- i18n: nenhum string hard-coded em componente; toda label via `t('supplier.createOffer.v4.*')`
- Acessibilidade: `role="group"`, `aria-pressed` nos chips, `aria-label` em botões de ícone