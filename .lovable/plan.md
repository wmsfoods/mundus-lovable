
# Plano — Analytics Admin que entrega valor

## Diagnóstico

A página atual (`AdminAnalytics.tsx`) é um clone estilo "Plausible": visitantes, pageviews, bounce rate, fontes de tráfego — tudo **mock**, desconectado do negócio. Em paralelo existe `useAdminAnalytics.ts` com KPIs reais do marketplace (GMV, deals, pipeline, top buyers/suppliers, ops queue) usado só no Dashboard.

Para Fernando, "valor" = entender **saúde do marketplace, gargalos e onde agir agora**, não contar pageviews.

## Direção

Transformar a página em um **Marketplace Intelligence Center** com 5 blocos que respondem perguntas concretas, conectados a dados reais do Supabase (com fallback para mock quando vazio).

```text
┌────────────────────────────────────────────────────┐
│  1. Health Score + Insights (AI)                   │
├─────────────────┬──────────────────────────────────┤
│  2. KPI strip   │  GMV · Deals · Win% · Cycle · TR │
├─────────────────┴──────────────────────────────────┤
│  3. Trend chart (GMV/Deals) com período comparado  │
├──────────────────────┬─────────────────────────────┤
│  4. Conversion funnel│  5. Attention queue         │
│  Offers → Neg → Won  │  (KYC, certs, stalled negs) │
│  → Shipped → Paid    │  com botão "Resolver"       │
└──────────────────────┴─────────────────────────────┘
   6. Top buyers / suppliers — leaderboards
   7. Geografia & mix de produto — origens, destinos
```

## Detalhes por bloco

### 1. Health Score + Insights
- Score 0–100 calculado a partir de: liquidez (offers/buyer ativos), taxa de conversão neg→won, ciclo médio, % deals at-risk.
- 3 a 4 **insights gerados** (regra primeiro, AI depois) tipo:
  - "GMV caiu 18% vs período anterior — concentrado em Brasil→China"
  - "12 negociações paradas há +5 dias aguardando supplier"
  - "Win rate Pampa Beef caiu para 12% (vs 34% média)"
- Cada insight tem CTA: "Ver detalhes" → filtra a página ou abre lista.

### 2. KPI strip (real, com sparkline)
GMV · Active Deals · Win Rate · Avg Cycle (days) · Avg Deal Size · Take Rate (commission) · New Signups · Liquidity Ratio.  
Clicar um KPI → vira métrica do gráfico de tendência.

### 3. Trend chart
- Linha atual vs período anterior (já existe).
- Toggle de **segmento**: All / Buyer-side / Supplier-side / Product (beef, pork, poultry, lamb).

### 4. Funnel de conversão
Offers publicadas → Negociações abertas → Aceitas → Shipped → Pagas.  
Mostra **drop-off %** em cada etapa, com cor (vermelho > 50%).

### 5. Attention queue (acionável)
Lista priorizada: KYC pendentes, certificados expirando, negs paradas, disputas, deals at-risk de SLA. Cada item → botão **Resolver** que leva ao detalhe correto (`/admin/companies/:id`, `/admin/negotiations`, etc).

### 6. Leaderboards
- Top 5 buyers por GMV (delta vs período anterior)
- Top 5 suppliers por GMV
- Underperformers (queda > 30%) — destaque para ação comercial.

### 7. Geografia & mix
Mapa simples de destinos (lista com flag + barra), mix por categoria (donut), top portos de origem.

## Filtros globais (topo)
Período (7d / 30d / 90d / 12m / custom) · Mercado (origem/destino) · Categoria de produto · Role (buyer/supplier).  
Aplicam em todos os blocos.

## Mobile (memória do projeto)
- Topo vira sticky com período e Health Score compacto.
- Blocos viram cards verticais empilhados (sem tabelas largas).
- Funil vira lista vertical com %.
- Attention queue prioritária no topo na versão mobile (uma mão, ação rápida).
- Leaderboards em swipe horizontal de cards.

---

## Detalhes técnicos

### Arquivos
- **Reescrever** `src/pages/admin/AdminAnalytics.tsx`.
- **Novo** `src/hooks/useMarketplaceAnalytics.ts` — consulta Supabase (negotiations, offers, orders, companies, round_proposals, crm_companies) e devolve `{ kpis, trend, funnel, attentionQueue, leaderboards, geo, insights }`. Períodos via `gte/lte` em `created_at`.
- **Novo** componentes em `src/components/admin/analytics/`: `HealthScoreCard`, `InsightCard`, `KpiStrip`, `TrendChart`, `ConversionFunnel`, `AttentionQueue`, `Leaderboard`, `GeoMixPanel`.
- **Novo** edge function `generate-marketplace-insights` (opcional, fase 2) — Lovable AI Gateway (`google/gemini-2.5-flash`) recebendo o snapshot e gerando 3 insights em linguagem natural. Fase 1 usa regras locais.
- **Manter** `useAdminAnalytics.ts` (ainda usado pelo Dashboard) sem mudanças.
- **Remover** `useAdminAnalyticsTraffic.ts` se ficar órfão.
- **CSS**: estender `src/styles/mundus-analytics.css`.
- **i18n**: chaves novas em `admin.analytics.*` (en/pt/es).

### Queries chave
- KPIs: `SELECT count(*), sum(settled_total_value) FROM negotiations WHERE created_at >= …`
- Funnel: counts por status (`awaiting_supplier`, `pending_buyer_review`, `bid_accepted`) + `orders` por status.
- Attention queue: negs com `expires_at < now()+24h`, companies com `kyc_status='pending'`, certs próximos do vencimento (se tabela existir).
- Leaderboards: agrupar `settled_total_value` por `buyer_company_id` / `offers.supplier_id`.
- Cache via TanStack Query, `staleTime: 60s`.

### Fora de escopo desta fase
- Cohort retention completo (planejar fase 3).
- Export PDF (CSV já existe e será mantido).
- Mapa SVG mundial — usar lista com bandeira + barra por enquanto.

## Entregável da fase 1
Página `/admin/analytics` operando com dados reais para KPI strip, trend, funnel, attention queue e leaderboards. Insights via regras. Filtros de período + categoria. Versão mobile validada.
