## Goal

Replicar o filtro completo das screenshots em **Supplier → My Offers** e **Buyer → Offers**, com funcionalidade total e um botão **Clear filters** sempre visível quando houver filtros ativos.

## Filtros (como nas screenshots)

Ordem na barra (linha rolável horizontal no mobile, flex-wrap no desktop):

1. **Pills de proteína** — `All / Beef / Pork / Poultry / Ovine` (já existe via `ProteinFilter`)
2. **All Temps ▾** — single-select: `All / Frozen / Chilled / Fresh`
3. **All Origins ▾** — multi-select com busca, bandeiras, contagem `· N` quando selecionado
4. **All Incoterms ▾** — multi-select: `FOB / CFR / CIF / FCA / DDP / EXW` (lista derivada dos dados)
5. **All Markets ▾** — multi-select com busca, bandeiras, contagem `· N`
6. **Search** — input com ícone, busca por cut, supplier, origem, porto
7. **Halal**: `Any / Yes / No` (segmented)
8. **Kosher**: `Any / Yes / No` (segmented)
9. **Clear filters** (link com ícone X) — aparece logo após o último controle, em destaque, sempre que houver `>0` filtros ativos. No mobile vira chip fixo no topo da lista de chips ativos.

Abaixo da barra, manter linha **`Showing X of Y offers · Z MT`** (já existe).

## Componente compartilhado

Criar `src/components/marketplace/OffersFilterBar.tsx` para reuso buyer/supplier:

- Props: `value`, `onChange`, `options { temps, origins, incoterms, markets }`, `proteinNode` (slot para o `ProteinFilter` existente), `showHalalKosher` (default `true`), `searchPlaceholder`.
- Estado controlado, type:

```ts
type OffersFilterState = {
  protein: ProteinKey;       // gerenciado fora
  temp: "all" | "Frozen" | "Chilled" | "Fresh";
  origins: string[];
  incoterms: string[];
  markets: string[];
  halal: "any" | "yes" | "no";
  kosher: "any" | "yes" | "no";
  search: string;
};
```

- Dropdowns multi-select implementados com shadcn `Popover` + busca interna + checkbox custom + bandeira (`FlagSVG`). Reusa estilo do `DealsFilterBar` (`dfb-multi`) mas com nova classe `ofb-*` para o look "pill arredondado" das screenshots.
- Single-select (Temps) é Popover com lista simples e ✓ no item ativo.
- Segmented Halal/Kosher reusa estilo `bo-filter-pill`.
- Chip do controle muda para variante "selected" (fundo `--p800`, texto branco) quando algum valor está aplicado, e mostra ` · N` ao lado do label.
- "Clear filters" exibe ícone X + contador `(N)` e zera só os campos do filtro (mantém protein opcionalmente — botão limpa tudo inclusive protein).

CSS novo em `src/styles/mundus-offers.css` (`.ofb`, `.ofb-pill`, `.ofb-pill.is-active`, `.ofb-pop`, `.ofb-segment`, `.ofb-clear`).

## Integração

### Supplier (`src/pages/supplier/Offers.tsx`)
- Substituir bloco `so-filterbar` atual pelo `<OffersFilterBar>` (mantendo o `ProteinFilter` como `proteinNode`, e mantendo o select de status + sort + view toggle ao lado direito).
- Derivar `options` a partir de `realOffers`: 
  - `temps` = distintos de `condition`
  - `origins` = distintos de `originCountry`
  - `incoterms` = união de `incoterms[]`
  - `markets` = união de `destinations[].name`
- Aplicar filtro no `useMemo` existente (somar regras temp/origins/incoterms/markets/halal/kosher/search). Como `SupplierOffer` ainda não tem campos halal/kosher, adicionar `isHalal?: boolean; isKosher?: boolean;` opcionais (default `false`) — filtro funciona quando dado existir; UI mostra controle igual.

### Buyer (`src/pages/buyer/Offers.tsx`)
- Substituir `bo-filter-row` (search/sort/chips) pelo `<OffersFilterBar>`. Manter `ProteinFilter` no slot, manter botão "Auctions only" e `AuctionInfoDialog` em linha separada acima, manter `sortBy` à direita.
- `OfferWithDetails` já tem `is_halal` e `is_kosher` no select de `useOffers` (linhas 47-48, 91-92) — usar diretamente. Origins/incoterms/markets derivados dos dados retornados.
- Sincronizar `protein` com URL como hoje.

## Clear filters – UX

- Botão **Clear filters** posicionado no fim da barra (desktop) e fixo logo abaixo (mobile) com:
  - ícone X + texto + badge com nº de filtros ativos
  - cor secundária quando 0 ativos (estado `disabled`, oculto)
  - cor de destaque (border `--p800`, texto `--p800`, fundo hover `--p050`) quando ativos
- Mantém também os "active chips" individuais (igual buyer hoje) para remover 1 a 1.

## Aplicação dos filtros

```ts
const filtered = offers.filter(o => 
  (state.temp === "all" || o.condition === state.temp) &&
  (state.origins.length === 0 || state.origins.includes(o.originCountry)) &&
  (state.incoterms.length === 0 || o.incoterms.some(i => state.incoterms.includes(i))) &&
  (state.markets.length === 0 || o.destinations.some(d => state.markets.includes(d.name))) &&
  (state.halal === "any" || (state.halal === "yes" ? o.isHalal : !o.isHalal)) &&
  (state.kosher === "any" || (state.kosher === "yes" ? o.isKosher : !o.isKosher)) &&
  (state.search === "" || matchesSearch(o, state.search))
);
```

## Mobile

- Barra rola horizontalmente (`overflow-x:auto`, `scroll-snap-x`); pills/dropdowns mantêm tamanho confortável (≥40px alvo de toque).
- Popovers viram bottom-sheet (shadcn `Sheet` side="bottom") em telas <640px, igual `DealsFilterBar`.
- Halal/Kosher quebram para linha de baixo automaticamente.

## Files

- **new**: `src/components/marketplace/OffersFilterBar.tsx`
- **edit**: `src/pages/supplier/Offers.tsx`, `src/pages/buyer/Offers.tsx`, `src/styles/mundus-offers.css`
- **edit (i18n)**: chaves novas em `src/i18n/locales/{en,pt,es,fr,zh}.json` (`offers.filter.temps/origins/incoterms/markets/halal/kosher/clearAll/any/yes/no`)
- **edit (mock, optional)**: adicionar `isHalal`/`isKosher` opcionais em `SupplierOffer`
