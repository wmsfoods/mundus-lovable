## Objetivo
Adicionar 3 contadores animados (Tons, Origins, Destinations) na PublicHome, logo **acima da seção "Available Offers at Mundus"**, com efeito blur-digit nas cores Mundus.

## Componente
Criar `src/components/ui/animated-blur-number.tsx` (cópia exata do snippet enviado — zero dependências, self-contained, prefers-reduced-motion ok). Locale default `pt-BR`.

## Dados (RPC pública nova)
Migration: criar função SECURITY DEFINER `public.get_mundus_vitrine_stats()` retornando JSON `{ total_tons, origins, destinations }`. GRANT EXECUTE para `anon` e `authenticated` (página é pública).

Cálculos:
- **total_tons** = `SUM(offer_items.amount) / 1000` desde sempre (sem filtro de status — "transitou").
- **origins** = `COUNT(DISTINCT)` da união de `offers.origin_country` + `unnest(buyer_requests.origin_countries)` (ignorando nulos/vazios).
- **destinations** = `COUNT(DISTINCT)` da união de `markets.country` (via `offer_markets`) + `buyer_requests.destination_country`.

## Hook
`src/hooks/useVitrineStats.ts` — chama o RPC uma vez no mount (`supabase.rpc('get_mundus_vitrine_stats')`), guarda em state. Sem realtime. Retorna `{ tons, origins, destinations, loading }`.

Pequeno polimento UX: tick incremental opcional dos `tons` (+1 a cada 6–10s no client, só visual) para o blur animar continuamente mesmo sem mudança real — coloco como opt-in (`liveTick: false` por padrão) pra não enganar o número. **Default: sem auto-tick.** O blur dispara naturalmente quando o RPC eventualmente retorna valor diferente.

## UI — PublicHome.tsx
Nova seção `MundusVitrineStats` renderizada **entre o `<section hero>` e `{offersSection}`** (e antes do offersSection também no caminho nativo `nativeApp`, para aparecer em mobile/app).

Layout:
- Container full-width com fundo gradient sutil nas cores Mundus (`#8B2E4F` → branco), bordas suaves.
- Grid 3 colunas (desktop) / 1 coluna stacked (mobile, respeitando memória core de responsividade).
- Cada card: label pequeno em uppercase (cor mundus burgundy `#752642`), número grande com `<AnimateNumber>` (cor `#8B2E4F`, fonte bold, ~3rem desktop / 2rem mobile), sublabel ("toneladas transitadas" / "países de origem" / "países de destino").
- Tons: `suffix=" t"`, formato pt-BR com agrupamento.
- Origins/Destinations: número simples.
- Sem botões. Decorativo + informativo. Ping dot suave indicando "live".

```text
┌─────────────────────────────────────────────────────────────┐
│  TONELADAS         │  ORIGENS         │  DESTINOS           │
│  1.204.837 t       │  42              │  68                 │
│  transitadas       │  países          │  países             │
└─────────────────────────────────────────────────────────────┘
```

## Detalhes técnicos
- AnimateNumber importado de `@/components/ui/animated-blur-number`.
- locale `pt-BR` no `format` prop.
- Sem realtime subscription (custo desnecessário) — fetch único no mount.
- Reaproveitar tokens existentes de cores Mundus já usados em PublicHome (`#8B2E4F`, `#752642`).
- Acessibilidade: o componente já expõe sr-only label e respeita `prefers-reduced-motion`.

## Arquivos
- **criar** `supabase/migrations/<ts>_vitrine_stats.sql` (função + grants)
- **criar** `src/components/ui/animated-blur-number.tsx`
- **criar** `src/hooks/useVitrineStats.ts`
- **criar** `src/components/public/MundusVitrineStats.tsx`
- **editar** `src/pages/public/PublicHome.tsx` (montar a seção antes de `offersSection` em ambos os caminhos: nativeApp e web)
- **editar** `src/integrations/supabase/types.ts` (auto-regen após migration aprovada)