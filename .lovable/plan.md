## Goal
Os cards do `/home` público devem ficar visualmente idênticos aos cards de oferta do buyer (anexo), mantendo o supplier oculto e a CTA "Reveal supplier".

## Mudanças

### 1. `src/components/public/PublicOfferCard.tsx` — reescrever
Reaproveitar 100% da marcação e classes do `OfferCard` do buyer (`src/pages/buyer/Offers.tsx`, linhas 65–297), já que o CSS `.oc*` está global em `mundus-offers.css`. Adaptar para o shape do `PublicOffer` (RPC `get_public_offers`):

- **Header (`.oc-head`)**: chip 🍴 + categoria (`item.category_name || category_code`) · temperatura (`item.condition`) · número da oferta (`formatOfferNumber(offer_number, created_at)`) · badge "mixed" quando >1 item. À direita: pill "Available" estática (offers públicas são sempre ativas) + pill amarela "X of Y FCL available" quando `remaining_fcl < total_fcl`. Remover bloco `myNeg`.
- **Title block (`.oc-title-block`)**:
  - Título: `product_name` do primeiro item, ou "Mixed (N Product / Cuts)" quando >1.
  - **Linha do supplier**: em vez de `🏭 {supplier_name}`, renderizar `🏭 ••••••• ` + chip pequeno "Hidden" (italic, cinza) — mantém a posição visual do anexo.
  - Lista de cuts (mixed) ou linha única de cut (`item.product_name`), sem thumbnail (não há `useCutImages` no público; cair para o ícone padrão ou nada).
- **Meta grid (`.oc-meta-grid`)**: Origin (com flag via `countryToCode(origin_country)`), Destination (primeiro `markets[].country` + `+N`, tooltip de todos), Incoterm (primeiro `incoterms[]` + `+N` + `origin_port`), Shipment (`MONTH YEAR`).
- **Footer (`.oc-footer`)**: QTY + total MT (somar `item.amount`/1000) + `container_size` (e total_fcl). CTA passa a ser **botão "Reveal supplier"** com a cor bordô do design system, no lugar do "View details →". Remover `role=button`/`onClick` do `<article>` para o card inteiro não abrir — apenas o botão dispara `onReveal`.

### 2. `src/pages/public/PublicHome.tsx` — ajuste mínimo
- Continuar passando `onReveal={() => setChatOpen(true)}`.
- Manter o grid atual `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

### 3. i18n
Reutilizar chaves existentes:
- `buyer.offers.card.origin/destination/incoterm/shipment/qty/cuts/mixedTitle/moreCuts` (já em todas as locales).
- `public.home.reveal` e `public.home.hiddenSupplier` (já existem nos 5 locales).
Sem novas chaves.

## O que NÃO muda
- Hero, filtros, busca, locales (já alinhados na rodada anterior).
- `usePublicOffers` / RPC / RLS — supplier_name nunca é retornado, nada de backend muda.
- MAX widget, fluxo de lead, layout público.

## Resultado esperado
Grid de cards com a mesma densidade, tipografia, bandeiras, tooltips e pílulas do marketplace logado — única diferença visível é a linha do supplier mascarada e a CTA "Reveal supplier" no rodapé.
