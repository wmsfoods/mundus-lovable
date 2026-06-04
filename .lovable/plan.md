## Objetivo
Padronizar visualmente os cards de oferta em todas as visões (Buyer, Supplier, Public — Admin continua em tabela; opcionalmente reuso o card abaixo) para que tenham o **mesmo tamanho e estrutura**.

## Mudanças por card

### 1. Adicionar linha "Origin" com bandeira (logo abaixo da tag "Available"/status)
- **Buyer card** (`src/pages/buyer/Offers.tsx` → `OfferCard`): já existe no meta-grid, mas vai ser **promovido** para uma linha dedicada abaixo do status, como `🇧🇷 Brazil`. Remove a célula "Origin" do meta-grid (para manter altura uniforme com supplier).
- **Supplier card** (`src/components/supplier/OfferCard.tsx`): adicionar a mesma linha (`o.originCountryCode` + `o.originCountry`), abaixo do status.
- **Public card** (`src/components/public/PublicOfferCard.tsx`): mesma linha de origem abaixo do status (substituindo a célula do meta-grid).
- **Admin** (`AdminOffers.tsx`): usa tabela; não muda layout aqui. Origem já aparece em colunas.

### 2. Título dinâmico (negrito principal)
- **1 cut**: título vira `Full Container — 1 Cut` (i18n key nova).
- **>1 cuts**: continua `Mixed Container — {n} cuts`.
- Abaixo do título: lista de cuts (foto + nome) — **máximo 2 visíveis**, com chip `+N more` se houver mais. Hoje é 3 → reduzir para 2 nos três cards.
- Para o caso de 1 cut, o item aparece como **um único chip com foto + nome** (mesmo padrão visual dos chips mixed), em vez do `oc-cut-text` atual.

### 3. Padronizar tamanho do card
- Todos passam a renderizar o mesmo número de linhas: Header → Origin row → Title → Cuts (até 2) → Meta-grid (Destination, Incoterm, Shipment, Volume) → Stats (supplier) ou Footer.
- Buyer perde célula Origin do meta-grid (substituída por Volume) para igualar ao supplier.

## i18n
Adicionar em `en/pt/es/fr/zh.json` sob `buyer.offers.card` e `supplier.offers.card`:
- `fullContainerOneCut`: "Full Container — 1 Cut" (e traduções).
- Ajustar `mixedTitle` para o formato `Mixed Container — {{count}} cuts` em todos os locales (manter chave).

## Arquivos a alterar
- `src/pages/buyer/Offers.tsx` (componente `OfferCard`)
- `src/components/supplier/OfferCard.tsx`
- `src/components/public/PublicOfferCard.tsx`
- `src/i18n/locales/{en,pt,es,fr,zh}.json`

## Fora de escopo
- Backend e lógica de negociação (a discussão de "allow buyers negotiate quantities" fica para o próximo passo).
- Tabela admin não é convertida em card (mantém atual).
- `OfferDetailCards` (cards dentro da página de detalhe) não muda.
