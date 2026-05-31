## Objetivo

Reorganizar a página `/buyer/requests` ("My Requests") para que no mobile siga exatamente o mesmo padrão visual e de navegação já usado em `/buyer/negotiations` (Negotiations). Desktop permanece idêntico ao atual.

## Padrão de referência (já existente em Negotiations)

- Filtros/busca/ordenação em **bottom sheet** via `NegotiationsFilterSheet` (acionado por botão flutuante no mobile).
- Toolbar + chips horizontais ficam **ocultos no mobile** (renderizados só quando `!isMobileShell`).
- Tabela desktop continua dentro de `data-table-wrap.has-mobile-cards` (esconde no mobile via CSS já existente).
- Lista mobile dedicada com:
  - `MobileNegoTabs` → 3 abas com contadores
  - `MobileNegoGroup` agrupando por contexto
  - `MobileNegoBidCard` para cada item, com top‑bar colorido por status, 3 stats, data e onClick

## Mudanças em `src/pages/buyer/BuyerRequests.tsx`

1. **Imports novos**: `useIsMobileShell`, `NegotiationsFilterSheet`, `MobileNegoTabs`, `MobileNegoGroup`, `MobileNegoBidCard`, `MobileNegoStatusTone`.
2. **State adicional**: `mobileTab` (`"needs_attention" | "waiting" | "closed"`).
3. **Mapas**:
   - `STATUS_TONE: Record<BuyerRequestStatus, MobileNegoStatusTone>`
     - `with_responses → action_required`
     - `offer_sent → accepted`
     - `new → awaiting`
     - `closed → rejected`
     - `not_interested → expired`
   - `TAB_OF_STATUS: Record<BuyerRequestStatus, MobileTab>`
     - `with_responses → needs_attention`
     - `new → waiting`
     - `offer_sent, closed, not_interested → closed`
4. **Renderização**:
   - Adicionar `<NegotiationsFilterSheet>` reusando `search`/`statusF`/chips existentes (passar `sortBy="recent"` fixo já que requests hoje não tem sort).
   - Envolver `table-toolbar` + `nego-chips` em `{!isMobile && (...)}` para esconder no mobile.
   - Manter a tabela desktop como está (já tem `has-mobile-cards`).
   - **Remover** o bloco atual `ListCardList` (mobile antigo).
   - **Adicionar** componente local `MobileRequestsList` (espelho de `MobileBuyerNegoList`) que:
     - Calcula `counts` por aba a partir de `filtered`
     - Renderiza `MobileNegoTabs` com 3 abas traduzidas
     - Agrupa por status com `MobileNegoGroup` (1 grupo "Active" / "Closed" conforme a aba) ou simplesmente lista chata sem grupo se preferível — ficamos com 1 `MobileNegoGroup` por aba para manter visual consistente.
     - Cada `MobileNegoBidCard` recebe:
       - `initials` = 2 primeiras letras do `product_name`
       - `partyName` = `formatRequestNumber(...)`
       - `subtitle` = `product_name` + categoria
       - `status` = `{ tone: STATUS_TONE[r.status], label: STATUS_LABEL[r.status] }`
       - `stats` = [Volume, Target price, Responses]
       - `dateLabel` = `fmtDate(r.created_at)`
       - `onClick` → `navigate('/buyer/requests/' + r.id)`

## Comportamento esperado

- Desktop (≥ 1024px): exatamente como hoje — toolbar com busca + botão "New request", chips de status, tabela completa.
- Mobile: header limpo, botão de filtros abre bottom sheet com busca + status; 3 abas (Needs attention / Waiting / Closed); cards verticais grandes, tap‑friendly, respeitando safe‑area; sem tabela horizontal.

## Escopo

- Somente `src/pages/buyer/BuyerRequests.tsx`.
- Nenhuma mudança em hooks, dados, regras de negócio, ou desktop.
- Reuso 100% de CSS/components já existentes (`mundus-negotiations-mobile.css`, `MobileNegotiationCard`, `NegotiationsFilterSheet`) — sem novo CSS.
