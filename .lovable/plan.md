## Goal

Trocar a forma como o deal fechado é mostrado na aba **Negotiation** do detalhe de **Order/Sales** (tanto para buyer quanto supplier). Em vez das barras coloridas "How this deal closed", reusar o mesmo layout da página de negociação interna (Round timeline + Price details), com diferenças por perspectiva:

- **Supplier**: mostra colunas **Asking** + **Floor** + Bid R1/Counter R1/…
- **Buyer**: mostra **Asking** + Bid R1/Counter R1/… (sem Floor)

## Onde mexer

Toda a mudança vive em `src/components/mundus/DealDetailView.tsx` (aba `negotiation`). Nenhuma mudança em backend/dados — vamos reutilizar o que já está em `data.negotiation.rounds`, `data.cuts` e adicionar leitura de floor a partir dos cuts quando `role === "supplier"`.

## Mudanças

### 1. Aba Negotiation — substituir o card "HOW THIS DEAL CLOSED"

Remover o bloco atual das barras por round (linhas ~336-389) e o `FINAL PRICE PER CUT` (linhas ~391-420). No lugar, renderizar dois cards no mesmo estilo de `SupplierNegotiationDetail`:

**a) Round timeline card** (`.nd-card` + `.nd-timeline-flow`)
- Header: ícone Sparkle + "Round timeline" + meta "Round X of Y"
- Pills alternadas Bid → Counter → Bid → … usando `data.negotiation.rounds` (bid azul, counter verde, último accepted em destaque `tl-pill--current`)

**b) Price details card** (`.nd-card` + `.nd-price-table`)
- Colunas fixas: Product · Qty · **Asking** · (**Floor** somente se `data.role === "supplier"`) · Bid R1 · Counter R1 · Bid R2 · Counter R2 · …
- Linhas: `data.cuts` (com badge "Agreed at $X/lb" verde no produto, igual ao detail)
- A coluna do último counter em verde forte (deal final)
- Wrapper `.nd-price-scroll-wrap` para scroll horizontal mobile (já estilizado em `mundus-negotiations.css`)

### 2. Manter o "Deal closed" banner verde acima

O `DealClosedBanner` (ou equivalente já renderizado pelo container) continua acima dos cards — o usuário pediu apenas para mudar a forma como mostramos o histórico/preços dentro da aba.

### 3. Floor por cut

`DealDetailViewProps.cuts` hoje tem `pricePerKgUsd`. Para o floor do supplier vamos:
- Adicionar campo opcional `floorPerKgUsd?: number` em `DealCut` (mesmo arquivo).
- No render, se `data.role === "supplier"` e o cut tiver `floorPerKgUsd`, mostra na coluna Floor; caso contrário "—".
- Quem alimenta `DealDetailView` (ex. `SaleDetail`, mock adapters) passa o floor quando disponível. Nesta primeira iteração, basta deixar opcional — se o adapter ainda não preencher, mostra "—" e seguimos.

### 4. Aside (TOTALS) — sem mudança

Mantém o card lateral "TOTALS" (Initial asking / First buyer bid / Discount / Final total) e o link "Open full negotiation".

## Visual reference

```text
┌── Round timeline ───────────────────────── Round 2 of 4 ─┐
│ Bid 1 $154,000 → Counter 1 $156,800 → Bid 2 $155,400    │
└──────────────────────────────────────────────────────────┘

┌── Price details ─────────────────────────────────────────┐
│ PRODUCT          QTY   ASKING [FLOOR] BID R1 CNT R1 …    │
│ 🔒 Beef Navel  14k lb  $2.68  [$2.55] $2.59   $2.63 …    │
│    Agreed at $2.61/lb                                    │
│ 🔒 Beef Point  14k lb  $2.49  [$2.40] $2.40   $2.45 …    │
└──────────────────────────────────────────────────────────┘
```
Colchetes `[FLOOR]` aparecem só na visão supplier.

## Out of scope

- Não mexer no `DealClosedBanner` em si.
- Não criar/alterar tabelas, edge functions ou rotas.
- Não mudar a página `SupplierNegotiationDetail` / `BuyerNegotiationDetail`.
