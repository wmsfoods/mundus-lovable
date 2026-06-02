
## Objetivo
Adotar o layout novo (segundo screenshot) na tela de detalhe da oferta, **mantendo 100% das informações, regras, fluxos, permissões e ações atuais** para buyer, supplier e Mundus admin. Só muda a apresentação visual.

## Escopo das telas
- `src/pages/buyer/OfferDetail.tsx` — buyer (CTA principal continua **Negotiate**; Close Deal permanece como hoje, ao lado).
- `src/pages/supplier/OfferDetail.tsx` — supplier e Mundus admin (mesma rota). Mantém colunas extras (Asking/Floor), toggle Active, ações Edit/Clone/Share, banners e status.

## Novo layout (4 cards empilhados, full width)

```text
┌──────────────────────────────────────────────────────────────┐
│ [thumb+ILLUSTRATIVE]  M-000031-2026                          │
│  [mini thumbs]        Mixed Container — N cuts               │
│                       ● Beef   ❄ Frozen   N specs · N cuts   │
│                                       TOTAL VALUE · PER FCL  │
│                                       US$ 225,100            │
│                                       61,700 lb · 1×40ft ·   │
│                                       Shipment Jul 2026      │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ORIGIN          [Frozen] [1×40ft]            DESTINATION     │
│ 🇧🇷 Brazil    -------------------▶          Hong Kong 🇭🇰   │
│ Miami (USMIA)                                Port of HK      │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ Items in this offer · N         Total qty · Avg · Total value│
│ ──────────────────────────────────────────────────────────── │
│ [img] Cut name        PACKING   QTY     PRICE [ ASK FLOOR ]  │
│       Spec · pack                                            │
│ ...                                                          │
│ N items               total qty                  total value │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ INCOTERMS              PAYMENT TERMS   CONTAINER   CREATED   │
│ [FOB ...] [CFR ...]    100% TT          1 × 40ft   6/2/2026  │
└──────────────────────────────────────────────────────────────┘

[ Negotiate ] (buyer)        [ Close Deal ]   ← rodapé sticky igual hoje
```

Comportamento por quantidade de cuts:
- **1 cut**: card de items mostra 1 linha; header mostra "1 spec · 1 cut"; thumbs mostra 1 imagem (sem strip extra).
- **2 cuts**: como no mockup (strip com 2 mini-thumbs sob a thumb grande).
- **10 cuts**: card de items rola verticalmente dentro de altura máxima (`max-h` com scroll interno); strip de thumbs vira carrossel horizontal scrollável (a galeria atual já suporta auto-advance + click → lightbox; mantemos).

## Permissões / variações por papel (sem mudança lógica)
- Colunas **ASKING / LB** e **FLOOR / LB** só renderizam quando `role !== 'buyer'` (supplier + admin), exatamente como hoje em `supplier/OfferDetail.tsx`.
- Toolbar (toggle Active, Edit, Clone, Share, Inactive banner, negotiations banner) só para supplier/admin — fica acima do primeiro card.
- Buyer mantém botões **Negotiate** (primary) e **Close Deal** no rodapé sticky atual; nenhuma mudança de fluxo.
- "More information" (notes, view count, proposal count) continua como collapsible — movido para baixo do card de incoterms, idêntico em conteúdo.

## Implementação técnica
1. Criar `src/components/offer/OfferDetailCards.tsx` com subcomponentes puramente visuais:
   - `OfferHeaderCard` (thumb + título + chips + total/FCL/shipment).
   - `OfferRouteCard` (origem → destino com chips de condição/container no meio, dashed line).
   - `OfferItemsCard` (tabela responsiva; aceita `showSupplierPricing: boolean` para Asking/Floor).
   - `OfferMetaCard` (incoterms + payment terms + container + created).
   Props recebem dados já normalizados (nada de fetch novo).
2. Criar `src/styles/mundus-offer-cards.css` com tokens HSL do design system (cards `rounded-2xl border bg-card`, separadores, chips). Importar em `src/index.css` ou nas duas páginas.
3. Atualizar `src/pages/buyer/OfferDetail.tsx`:
   - Substituir o body atual (que usa `OfferDetailLayout` / `od-grid`) pelos 4 cards.
   - Manter exatamente: hooks (`useOffer`, `useOfferImages`, `useOfferDestinationPorts`, weight unit), cálculo de preço/total, formatadores, breadcrumbs, status pill, rodapé sticky com Negotiate/Close Deal, modais de negociação e de close deal.
4. Atualizar `src/pages/supplier/OfferDetail.tsx`:
   - Substituir `SupplierOfferBuyerStyleBody` pelos mesmos 4 cards passando `showSupplierPricing` quando o usuário é supplier/admin.
   - Manter toolbar (Active toggle, Edit, Clone, Share), banners (Inactive, negotiations), "More information", e toda a lógica/data atuais.
5. Reutilizar `OfferImageGallery` para a thumb principal + strip (ou um wrapper compacto), preservando auto-advance, swipe e lightbox no click.
6. Mobile: cards empilham naturalmente (já são full width); tabela de items vira lista de linhas compactas em `< sm` (como já fazemos em `PublicOfferModal`). Respeita safe-area no rodapé sticky.
7. Não tocar em: hooks, queries, edge functions, fluxo de negociação, regras de FCL/preço, permissões, i18n keys (reaproveitar as existentes).

## Validação
- Buyer em oferta com 1, 2 e 10 cuts: layout idêntico ao mockup, sem Asking/Floor, CTA Negotiate primário.
- Supplier/admin na mesma oferta: ganha colunas Asking/Floor + toolbar + banners.
- Galeria: auto-advance + click abre lightbox, igual hoje.
- Sem regressão em mobile (cards empilham, tabela vira lista, rodapé sticky).
