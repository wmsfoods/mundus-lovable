## Objetivo

Na página `/supplier/offers/:id`, dentro do bloco **🤝 Active Negotiations**, melhorar cada linha de negociação:

1. Mostrar o **nome do buyer** (ex: "Acme Foods") em vez de `Buyer #00000000`.
2. Mostrar uma **🇦🇪 bandeirinha + país** do buyer ao lado do nome.
3. **Remover** o "· CFR" (incoterm) da linha.
4. Trocar o badge de status pela ótica do supplier:
   - `awaiting_supplier` → **"Waiting your reply"** (vermelho)
   - `pending_buyer_review` → **"Waiting buyer reply"** (amber)
   - `bid_accepted` → **"Accepted"** (verde)
   - `offer_rejected` → **"Rejected"** (cinza)

## Arquivo a alterar

- `src/pages/supplier/OfferDetail.tsx`

## Mudanças técnicas

1. Estender o `select` da query de `negotiations` para trazer o buyer:
   ```ts
   .select(`
     id, status, buyer_company_id, incoterm, created_at, updated_at,
     buyer:companies!negotiations_buyer_company_id_fkey ( id, name, country )
   `)
   ```
   E estender o tipo do `useState` para incluir `buyer: { name, country } | null`.

2. Reutilizar o helper de bandeira já usado em `OtherBidsPanel.tsx` (códigos ISO-2 → emoji via `String.fromCodePoint`). Se o campo `country` no `companies` for nome (ex: "United Arab Emirates"), usar `src/lib/countryCodes.ts` / `countryFlags.ts` que já existem no projeto para resolver para code/emoji.

3. Criar um mapa `statusLabel` e `statusColor` na ótica do supplier (substitui o `n.status.replace(/_/g, " ")` cru) e usá-lo no badge.

4. Layout da linha (mantendo estilo inline atual):
   - Esquerda: `🇦🇪 <Buyer Name>` (nome em negrito, bandeira antes; fallback "Buyer" se name vier null).
   - Direita: badge com o label correto.
   - **Remover** o ` · {n.incoterm || "FOB"}`.

## Fora de escopo

- Não alterar a página de detalhe da negociação em si.
- Sem mudanças de schema ou RLS — `companies.name` e `companies.country` já são legíveis pelo supplier via a relação (mesmo padrão usado no `OtherBidsPanel`).
