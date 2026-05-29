
## Objetivo

Adaptar o layout das telas de negociação para casar pixel-a-pixel com os 5 screenshots, **sem alterar regras de negócio**: motor de rounds (`negotiationEngine.ts`), validação de direção de preço, item-locking, expiração, RLS, RPCs (`submit_initial_bid`, accept/reject), `CounterOfferModal`/`RejectNegotiationModal` e `useRealNegotiation` permanecem intactos.

Mudanças são **somente visuais + comportamento de troca inline de buyer** no lado supplier. O admin já reusa `SupplierNegotiationDetail` na rota `/admin/negotiations/:id` (App.tsx:245), então a redesign do supplier cobre o admin automaticamente. Buyer continua vendo só a própria negociação.

---

## Escopo por arquivo

### 1. `src/components/negotiation/OtherBidsPanel.tsx` (supplier + admin)
- Título **"Bids on this offer"** + pill `N bids` (ícone bar-chart).
- Inclui a negociação atual e ranqueia TODAS por total desc (1, 2, 3…).
- Linha: badge numerado (wine `#8B2252` no selecionado / cinza nos outros) + avatar com iniciais + `Buyer: {Company}` (tag `viewing` se ativa) + sublinha `{Contact} · Round {displayRound} of 4`. Direita: bandeira do destino + pill `💬 chat` se houver mensagens + total ($verde com `BEST` ou cinza com `total bid`) + chevron.
- Selecionado: borda pink + fundo `#FDF2F8` se BEST; borda azul `#2563EB` + mesmo fundo se não-best.
- Linha-resumo `Best bid: $… — {Company}` verde.
- Collapse: top 3 + botão wine `Show N more bids ⌄` / `Show fewer ⌃`. Pinar a linha selecionada se rank > 3.
- Props novas: `activeNegId`, `onSelect(negId)`. Linha clicável (exceto a selecionada).

### 2. `src/pages/supplier/SupplierNegotiationDetail.tsx` (também serve admin)
- `const [activeNegId, setActiveNegId] = useState(id)` → passa para `useRealNegotiation`. Trocar de buyer = `setActiveNegId` + `history.replaceState` opcional, **sem `navigate()`**. Skeleton leve durante refetch.
- Toda a área inferior (round detail, footer, timeline/progression, price table, chat, modais) lê de `activeNegId`.
- `<NegotiationChat>` só renderiza quando há mensagens **ou** `isChatEnabled(neg)`. Remover o placeholder "🔒 Available from Round 3".
- CounterOfferModal/RejectNegotiationModal continuam apontando para `activeNegId`.

### 3. Novo `src/components/negotiation/DealProgressionCard.tsx`
- Recebe `rounds` + `cutRounds` + `asking`. Totais por round = `Σ price_per_kg × qty_kg`.
- 1 round → "Round timeline" simples (Bid 1 / Counter 1 current).
- >1 round → "Deal progression": header + `N of 4 rounds`, linha `Asking (start)`, card por round com `BUYER BID → YOUR COUNTER` + chip `gap $z`. Último round tintado `Round N · FINAL` + chip `✓ aligned` se bid≈counter.

### 4. Novo `src/components/negotiation/PriceHistoryTable.tsx`
- Colunas: `PRODUCT | QTY | START/ASKING` + grupos por round (`ROUND n` → sub-colunas `BID` verde / `COUNTER` wine com fundo pink leve). Último grupo `ROUND n · FINAL`.
- Linha bold `Total value` somando colunas + total de QTY com unidade.
- Header direito: `Asking + N rounds · $askingTotal → $latestTotal`.
- Forma compacta quando só 1 round.
- Usa `useWeightUnit` + `fmtWeight/fmtPrice`. Scroll horizontal em mobile.

### 5. Barras `Items Agreed: X of Y` + `Round: n of 4`
- Componente inline (ou `NegotiationProgressBars.tsx`) acima do round detail em ambas as páginas.

### 6. `src/components/supplier/ShareWithSupplierCard.tsx` (supplier; oculto para admin/buyer)
- Colapsado por default: barra única (ícone + título + subtítulo + chevron). Conteúdo atual entra no painel expansível.
- **Trocar `mailto:` por envio server-side** via `sendEmailNotification` reaproveitando a edge function `send-email` existente. TO = email do buyer digitado. **BCC = master email do supplier logado** (resolver via `useCurrentCompany` + `getPrimaryCompanyContact` de `src/lib/companyContact.ts`). Sem master → envia mesmo assim + toast informativo.
- Body usa template existente com `/respond/{token}` + contexto. Toasts de sucesso/erro. Persistência de `supplier_email` mantida. "Copy link" segue como fallback.

### 7. `src/pages/buyer/BuyerNegotiationDetail.tsx`
- Aplica o mesmo layout visual (barras de progresso, `DealProgressionCard`, `PriceHistoryTable`, chat condicional) reusando os componentes compartilhados.
- **Não** renderiza `OtherBidsPanel` nem `ShareWithSupplierCard`. Buyer vê só a própria negociação.

### 8. Admin
- Sem código novo: a rota `/admin/negotiations/:id` já renderiza `SupplierNegotiationDetail`, então herda automaticamente o novo layout, o painel "Bids on this offer", a troca inline de buyer, o Deal progression e o Price history. `ShareWithSupplierCard` continua visível ao admin (mesmo componente).
- A página de listagem `AdminNegotiations.tsx` não é afetada.

### 9. i18n
- Novas strings em `supplier.negotiations.detail.*` e `buyer.negotiations.detail.*` (en/pt/es/fr/zh): `bidsOnThisOffer`, `bestBid`, `viewing`, `totalBid`, `showMoreBids`, `showFewer`, `dealProgression`, `roundFinal`, `aligned`, `priceHistory`, `itemsAgreed`, `roundOf`, `shareCollapsedTitle`, etc.

### 10. CSS
- Estender `src/styles/mundus-negotiations.css` / `negotiation-detail.css` com tokens já usados (wine `#8B2252`, verde `#16a34a/#059669`, blue `#2563EB`, pink-tint `#FDF2F8`, radius 12px, Inter). Mobile: rows stack, lower area 1-col, price table scroll-x, safe-area.

---

## Não muda
- `useRealNegotiation.ts`, `negotiationEngine.ts`, RPCs, RLS, `submit_initial_bid`, accept-counter/reject-counter, CounterOfferModal/RejectNegotiationModal, schema do banco, lógica de unidades.
- Buyer **nunca** vê bids de outros buyers.

---

## Validação
- Preview: 1 round (Image 1), 3 rounds + chat (Image 4), 4 rounds finalizado (Image 2), collapse/expand (Images 3 & 5).
- Trocar de buyer no painel → URL atualiza sem navegação, só área inferior recarrega.
- Mesma experiência em `/admin/negotiations/:id`.
- Mobile: stack vertical, tabela rola horizontal.
- Envio de email via Mundus + BCC do master do supplier aparece no Email Activity.
