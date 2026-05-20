## Objetivo

Criar uma página **Analytics** no painel Admin (`/admin/analytics`) inspirada no Plausible (screenshot enviado), com todas as funcionalidades equivalentes: KPIs, gráfico de tendência, breakdowns por Source / Page / Country / Device e filtro de período. Foco em desktop + experiência mobile fluida (cards verticais, sem tabelas largas).

## Funcionalidades

1. **Header**
   - Indicador "X current visitors" (ponto verde pulsando) — visitantes ativos nos últimos 5 min.
   - Seletor de período: Realtime, Last 24h, Last 7 days (default), Last 30 days, Last 90 days, Custom range.

2. **KPI cards (5)** com valor + comparação vs período anterior (% delta colorido):
   - Visitors (únicos)
   - Pageviews
   - Views per Visit
   - Visit Duration (m s)
   - Bounce Rate (%)
   - Clique no card destaca a métrica no gráfico (estado ativo azul como no print).

3. **Gráfico de tendência** (área/linha) — Recharts, granularidade auto (hora p/ ≤24h, dia p/ ≤90d), tooltip com data + métrica selecionada, gradient sutil. Linha de comparação tracejada do período anterior (toggle).

4. **Breakdowns (4 painéis em grid 2×2)** — cada linha com barra de progresso proporcional ao topo + valor numérico:
   - **Source** (referrer / utm_source agrupado; "Direct" quando vazio)
   - **Page** (path mais visitado)
   - **Country** (com bandeira emoji)
   - **Device** (Mobile / Desktop / Tablet com %)
   - Cada painel: top 10 + botão "Details" abrindo modal com lista completa, busca e paginação.

5. **Filtros cruzados**: clicar em qualquer linha de breakdown adiciona um chip de filtro no topo (ex.: `Page = /login ×`) e refiltra todos os outros painéis e o gráfico — comportamento idêntico ao Plausible.

6. **Export**: botão para baixar CSV do período/filtros atuais.

7. **Auto-refresh** a cada 30s quando período = Realtime / Last 24h.

## Mobile (pocket)

- KPIs em carrossel horizontal scroll-snap (1.2 cards visíveis).
- Gráfico ocupa largura total, altura reduzida.
- Breakdowns viram acordeões empilhados (um por vez expandido), respeitando safe-area.
- Filtros ativos viram bottom sheet.
- Sem tabelas — só listas verticais com barras.

## Dados

**Fase 1 (entrega):** hook `useAdminAnalyticsTraffic()` retornando dados mock determinísticos (mesmo padrão do `useAdminAnalytics.ts` existente), para que a UI fique 100% funcional imediatamente.

**Fase 2 (fora do escopo desta tarefa, deixar TODO):** tabela `analytics_pageviews` + edge function de ingestão (pixel `/track`) + queries reais. Não criar tabelas agora.

## Integração no shell

- Nova rota `/admin/analytics` em `src/App.tsx`.
- Novo item em `ADMIN_NAV` no `AdminShell.tsx` no grupo **Overview** (ícone `BarChart3`), entre Dashboard e Companies.
- i18n: chaves `admin.analytics.*` em en/pt/es.

## Arquivos novos

- `src/pages/admin/AdminAnalytics.tsx` — página principal.
- `src/components/admin/analytics/KpiCard.tsx`
- `src/components/admin/analytics/TrendChart.tsx`
- `src/components/admin/analytics/BreakdownPanel.tsx`
- `src/components/admin/analytics/BreakdownDetailModal.tsx`
- `src/components/admin/analytics/PeriodPicker.tsx`
- `src/components/admin/analytics/FilterChips.tsx`
- `src/hooks/useAdminAnalyticsTraffic.ts` — mock determinístico.
- `src/styles/mundus-analytics.css` — visual escuro inspirado no print (cards `bg-card`, barras azuis com gradiente sutil).

## Arquivos alterados

- `src/App.tsx` — rota.
- `src/pages/admin/AdminShell.tsx` — item de menu + bottom nav (opcional substituir um item).
- `src/i18n/locales/{en,pt,es}.json` — textos.

## Fora do escopo

- Ingestão real de eventos / pixel de tracking / tabelas no banco (fase 2).
- Funis, retenção, goals (recursos Plausible Pro) — podem vir depois.
