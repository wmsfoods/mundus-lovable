## Objetivo

Aplicar um redesign **somente mobile** (≤768px) nas telas de Negotiations para Supplier, Buyer e Admin, fiel aos screenshots anexos. Desktop permanece intacto. Nenhuma mudança de lógica, fluxos, RPCs, regras de round, validação, dependências ou novos componentes funcionais — apenas reorganização visual e estilos CSS de elementos que já existem.

## Escopo (apenas mobile)

### 1. Lista de Negotiations (Supplier / Buyer / Admin)
Arquivos: `SupplierNegotiations.tsx`, `BuyerNegotiations.tsx`, `AdminNegotiations.tsx` + `mundus-negotiations.css`.

- Header: título grande "Negotiations" + subtítulo com contagens ("5 waiting on you · 4 on buyers · 5 closed") e sino de notificações à direita.
- Chips de filtro substituídos por **3 tabs pill** ("Needs you", "Waiting", "Closed") com count chip; tab ativa com borda vinho e fundo branco.
- "SORTED BY URGENCY" como label discreto.
- Cada negociação vira um **card** com:
  - Avatar quadrado colorido (iniciais) + nome empresa + flag país + status pill ("Awaiting buyer", "Action required", "Deal closed", "Rejected").
  - Subtítulo: produto / RFQ.
  - Linha de 3 mini-stats: **ASKING / BUYER BID / YOUR COUNTER** (cores: preto / azul / vinho).
  - Footer: bolinhas de round ("Round 2 of 3") + ícone relógio com data ou tempo restante.
- Cards agrupados por offer (parent) mantêm a lógica atual, mas o parent vira um card com título do produto, #offer, contagem de bids e badge "1 need you"; filhos como sub-cards dentro do mesmo bloco com leve indicador colorido na borda superior (cinza/azul/verde por status).

### 2. Detalhe de Negociação (Supplier / Buyer / Admin)
Arquivos: `SupplierNegotiationDetail.tsx`, `BuyerNegotiationDetail.tsx`, `AdminNegotiationDetail.tsx` + `negotiation-detail.css` / `mundus-negotiations.css`.

- Header sticky: botão back ◄, título do produto truncado, #offer + "3 competing bids", menu ⋯.
- **Switcher de bids** (já existe via `OtherBidsPanel`) reestilizado em mobile como linha horizontal scrollable de pills com avatar + nome curto; ativa com fundo vinho e texto branco.
- Card "Round X of Y" com:
  - Badge round + "Updated …".
  - Frase resumo ("Mei Wong placed a bid in round 1…").
  - 3 mini-stats ASKING / BUYER BID / YOUR COUNTER (com ≈$/kg sob cada).
  - Barra **Bid vs counter gap** com gradient azul→vinho e knob.
  - Sub-bloco **"Buyer bid vs your floor"** com barra horizontal vermelho→verde e labels Floor/Asking.
- Card **Deal progression** colapsável: linha "Asking — start of deal $X", uma linha por round com bolinha vinho, "BUYER BID $… › YOUR COUNTER $…" e "gap $X" à direita.
- Card **"N cuts in this load"** colapsável: lista de cuts com ícone, nome, pack/MT e preço "bid → counter /kg" (azul → vinho).
- **Price details — full history** (PriceHistoryTable já existente): mesmo card com tabela compacta, sticky first column, header colorido (BID azul, COUNTER vinho).
- **Bottom action bar sticky** com 3 botões: **Counter** (vinho, largo) · **Accept** (verde claro) · **✕** (cinza), respeitando safe-area.
- Banners de estado existentes (`PendingConfirmationBanner`, `OfferAvailabilityChip`) renderizados acima do card de round sem alterar lógica.

### 3. Counter Modal (mobile bottom sheet)
Arquivo: `CounterOfferModal.tsx` + CSS.

- Em mobile, modal vira **bottom sheet** com handle no topo.
- Header: "Counter to {Buyer}" + "Round X of Y · N cuts — counter each on its own price."
- Resumo top: **BUYER BID / YOUR COUNTER / GAP** (3 colunas, GAP verde).
- Linha "SEED EVERY CUT AT ONCE" com 4 quick-actions: **Hold / Split / Meet bid / At floor** (pills com label + sublabel).
- "PER-CUT COUNTER" com link "Sort by gap" à direita.
- Cards por cut: nome + size + MT, stepper `−  $X.XX /kg  +` com input central destacado em vinho, linha "buyer $X · floor $Y" e gap "+$0.55/kg" verde alinhado à direita; checkbox de seleção no topo direito.
- Footer sticky: **Cancel** (cinza) · **Send counter** (vinho largo) com safe-area.

### 4. Diferenciação por papel
- Supplier: textos "YOUR COUNTER", "buyer bid", botão Counter.
- Buyer: textos "YOUR BID", "supplier counter", botão Bid/Counter — só troca de label (já existe), reaproveitando o mesmo CSS.
- Admin: mesma UI mobile do supplier por padrão (read-mostly), mantendo as ações já liberadas.

## Implementação técnica

- Tudo dentro de media query `@media (max-width: 768px)` — desktop permanece byte-a-byte igual.
- Tokens reutilizados: `--p800` (vinho), `--fg`, `--fg-muted`, `--border`, `--g050`, azul `#2563eb`, verde `#15803d`. Sem cores hardcoded fora do que já existe.
- Sem novos componentes React: ajustes em JSX existentes apenas para wrappers/classes (ex.: envolver header em `.neg-mobile-header`, stats em `.neg-mobile-stats`, etc.) e reorganizar ordem de blocos com `order` CSS quando possível.
- Bottom sheet do CounterOfferModal: reaproveitar o padrão Vaul já usado em `NegotiationsFilterSheet.tsx` apenas em mobile via `useIsMobile()`; desktop mantém o modal atual.
- Bottom action bar sticky reaproveita classes `.nd-actions` já existentes, com refinamento visual (tamanho, ordem, safe-area) só no breakpoint mobile.
- Nenhuma alteração em hooks, RPCs, validações monotônicas, two-step confirmation, `useRemainingFcl`, price history mapping, etc.

## Arquivos previstos

- `src/styles/mundus-negotiations.css` — estilos da lista mobile.
- `src/styles/negotiation-detail.css` — estilos do detalhe mobile + sticky action bar.
- `src/components/negotiation/CounterOfferModal.tsx` (+ CSS) — variante bottom-sheet em mobile.
- Pequenos ajustes de markup (classes/wrappers) em:
  - `SupplierNegotiations.tsx`, `BuyerNegotiations.tsx`, `AdminNegotiations.tsx`
  - `SupplierNegotiationDetail.tsx`, `BuyerNegotiationDetail.tsx`, `AdminNegotiationDetail.tsx`
  - `PriceHistoryTable.tsx`, `DealProgressionCard.tsx`, `OtherBidsPanel.tsx` (apenas classes/labels mobile)

## Fora do escopo

- Qualquer mudança em desktop.
- Qualquer alteração em lógica, regras de negócio, RLS, RPCs, notificações, e-mails.
- Novos componentes funcionais vistos nos screenshots que não existam hoje (ex.: bottom nav "Negotiations / Messages / Flow" — não será adicionado se ainda não existir; mantemos o shell mobile atual).
