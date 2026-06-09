## Ajustes pequenos

### 1. Cut picker com foto + busca livre
**Onde:** `src/components/supplier/CreateOfferV2/CutsTable.tsx` (coluna do cut, hoje um `<select>` nativo) e a versão mobile `mobile/CutSheetMobile.tsx`.

**O que muda:** trocar o `<select>` por um combobox custom (popover) que:
- Lista todos os cuts do catálogo com **thumbnail** (`image_url` já existe em `CutItem`), nome e número IMPS quando houver.
- Campo de busca no topo do popover, filtrando em tempo real por: nome do cut, `imps_number`, ou qualquer combinação (ex.: "1184 sirloin", "ribeye 112"). Match case-insensitive, com normalização de acentos.
- Mantém o caso "orphan cut" (cut salvo fora da região atual) como item desabilitado para preservar o nome.
- Mantém todo o restante (aging, US grade, spec) intacto.

### 2. Nomes longos no campo Item/Cut sem distorcer
Resolvido junto com #1: o trigger do combobox vira um botão flex com `min-width: 0`, nome truncado com `text-overflow: ellipsis` em uma linha e `title` (tooltip) com o nome completo. A coluna deixa de "esticar" o layout quando o nome é grande, e o nome completo continua visível ao passar o mouse / abrir o popover.

### 3. Remover "Avg US$" da linha de stats do buyer
**Onde:** `src/components/offer/OfferDetailCards.tsx` (linha 212).
Remover o `<span>Avg <b>US$ …/kg</b></span>`. Permanecem **Items in this offer · N**, **Total qty**, **Total value**. Não altera nada da tabela de itens nem do mobile.

### 4. Nome do customer não aparece após aceite (My Customers)
**Diagnóstico:** em `useMyCustomers.ts`, depois do aceite o `buyer_company_id` é populado e o hook tenta ler `buyer.name` via FK join em `companies`. Como o supplier não tem RLS para ler a empresa do buyer, o join volta `null` e o fallback `req?.company_name` não dispara (porque `buyer_company_id` deixou de ser null). Resultado: `"—"` na listagem.

**Fix (escolha A — preferida):** criar/usar RPC SECURITY DEFINER `get_supplier_customer_companies(p_office_id uuid)` que devolve `id, name, country, tax_id` apenas das empresas vinculadas via `supplier_customer_links` daquele office. Trocar o join inline por essa chamada e mesclar no `map`.

**Fix (escolha B — fallback simples se quiser evitar nova RPC):** continuar usando o join, mas quando `buyer?.name` vier vazio, cair para `req?.company_name` mesmo com `buyer_company_id` preenchido (preserva o nome usado no convite). Menos preciso, mas resolve a UI imediatamente sem alterar backend.

Plano: implementar **A** (mais correto e cobre também `country`/`tax_id`) e deixar B como fallback caso a RPC retorne vazio para alguma linha legada.

### 5. Buyer pode manter o bid igual (ou maior) — regra de negociação
**Onde:** `src/lib/negotiationEngine.ts`, função `validateBuyerBidDirection` (linha 22).
Trocar a regra estrita `>` por `>=` e atualizar a mensagem de erro: a partir do round 2 o buyer pode **repetir** o bid anterior ou subir, mas não baixar.

**Backend:** verificar a RPC `submit_initial_bid` / `submit_counter_bid` (ou equivalente) por `CHECK` ou validação que force `>`. Se existir, gerar migration ajustando para `>=`. Se não houver, basta a mudança no front.

---

## Detalhes técnicos

- **#1 combobox:** usar `Popover` + `Command` do shadcn (já no projeto). Estrutura do item:
  ```
  [thumb 28x28]  Sirloin Cap (Picanha)        IMPS 184D
                 cap on · choice
  ```
  Busca = `normalize(query).split(/\s+/).every(tok => normalize(displayName + ' ' + imps).includes(tok))`.
- **#2:** trigger `<button class="cut-trigger">` com `display:flex; min-width:0; gap:8px;` e `<span class="truncate">{cutName ?? placeholder}</span>`. Largura da coluna fica estável.
- **#3:** apenas remover a `<span>` do Avg; manter o cálculo de `avgPricePerUnit` caso seja usado em outro lugar (verificar — se for único uso, remover também a variável).
- **#4 (A):**
  ```sql
  create or replace function public.get_supplier_customer_companies(p_office_id uuid)
  returns table (id uuid, name text, country text, tax_id text)
  language sql stable security definer set search_path = public as $$
    select c.id, c.name, c.country, c.tax_id
      from companies c
      join supplier_customer_links scl on scl.buyer_company_id = c.id
     where scl.supplier_office_id = p_office_id;
  $$;
  grant execute on function public.get_supplier_customer_companies(uuid) to authenticated;
  ```
  No hook: 1 chamada extra após carregar os links, indexar por `id` e mesclar em `company_name`/`country`/`tax_id`.
- **#5:** mudança trivial de operador. Atualizar também tradução `pt`/`en` da mensagem se existir chave i18n específica (`buyer.bid.validation.direction`), caso contrário a string inline atual.

## Fora do escopo
- Não mexer no fluxo de aceite de convite em si.
- Não mexer no engine de rounds/expiração.
- Não mexer no layout da tabela de itens além da linha do Avg.