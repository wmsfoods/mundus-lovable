## Problema

Em `/admin/offers/:id` e `/admin/negotiations/:id` o admin é levado pra `SupplierOfferDetail` / `SupplierNegotiationDetail`. Essas páginas usam hooks (`useRealSupplierOffers`, `useNegotiation`/`useRealNegotiation` + `useCurrentCompany`/`useSupplierScope`) que filtram por `supplier_id IN (scopeIds)` da empresa logada (Mundus Trade LLC). Quando o registro pertence a outra empresa (ex.: Meat USA Company), a query volta vazia e a tela mostra **"This offer doesn't exist or has been removed"** / **"Offer not found"**. Mesmo padrão acontece ao clicar uma linha em **Admin → Negotiations** (rota `/admin/negotiations/:id`).

Causa raiz: as páginas `SupplierOfferDetail` e `SupplierNegotiationDetail` foram reaproveitadas no shell admin (App.tsx linhas 284 e 288), mas seus hooks de dados não têm um caminho "admin" que bypassa o scope por supplier.

## O que vai mudar

1. **Detectar contexto admin** nas duas páginas via `useLocation()` (path começa com `/admin/`) + verificação de role admin já existente (`useIsMundusAdmin` ou equivalente — já usado em `RequireAdmin`).

2. **`useRealSupplierOffers` (hook do listing)** — não muda; o detail page faz fetch próprio.

3. **`SupplierOfferDetail` (`src/pages/supplier/OfferDetail.tsx`)**
   - Substituir o `offers.find(o => o.id === id)` do listing do supplier (que depende do scope) por um fetch direto pelo id quando em modo admin. Em modo supplier mantém comportamento atual.
   - O `back` link e botões devem voltar pra `/admin/offers` quando admin.

4. **`SupplierNegotiationDetail` (`src/pages/supplier/SupplierNegotiationDetail.tsx`)**
   - `useNegotiation(id)` / `useRealNegotiation(id)` — verificar se já são por-id puro (provavelmente são, mas o select interno pode ter join scoped). Se houver filtro implícito por company, adicionar branch admin que busca direto por id (admin tem RLS pra ler todas negotiations — confirmar nas policies de `negotiations`).
   - Back link → `/admin/negotiations` quando admin.
   - Botões de ação supplier-only (Counter, Accept, Reject) ficam **read-only / ocultos** em modo admin (admin não atua como supplier).

5. **RLS check**: confirmar que admin role consegue `SELECT` em `offers`, `offer_items` (já garantido), `negotiations`, `round_proposals`, `counter_proposals`, `cut_rounds` independente do supplier. Se faltar, adicionar policy `has_role(auth.uid(), 'admin')` em cada tabela necessária.

## Arquivos tocados
- `src/pages/supplier/OfferDetail.tsx` — admin fetch branch, back link condicional, esconde ações supplier-only
- `src/pages/supplier/SupplierNegotiationDetail.tsx` — admin back link, esconde ações; confirmar hooks
- Possível migration nova adicionando policy admin nas tabelas de negociação se faltar

## Fora de escopo
- Refatorar `SupplierOfferDetail`/`SupplierNegotiationDetail` em componentes "neutros" reutilizáveis (manter mudança mínima)
- Mudar a rota pra usar páginas admin separadas
