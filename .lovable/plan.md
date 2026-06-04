## Bug: Edit Offer perde dados

Ao clicar **Edit** numa offer publicada, o sistema mostra a tela de criação mas **não traz** vários campos que já estavam salvos. Quando o supplier salva, mudanças desaparecem porque o estado nunca foi populado corretamente.

### Causa raiz

`OfferDetail.handleEdit` constrói um objeto `editOffer` parcial — busca poucas colunas e ignora children importantes — e `SupplierCreateOffer` reusa o mesmo `useEffect` de **clone** para hidratar (`hydrateSource = editOffer ?? cloneFrom`). Clone foi feito para criar uma offer **nova** (limpa campos opcionais), então:

**Não são trazidos nem na query nem na hidratação:**

- `plant_id` / plant por cut (`offer_items.plant_id`) — some sempre.
- `packaging` (`offer_items.packaging`) — `pkg` é resetado para `"\n"`.
- Marbling/grade do cut (`gr`) — resetado para `"\n"`.
- Notes por cut (`notes`).
- Portos selecionados por mercado (`offer_markets` traz só o país, não os ports).
- Freight por porto / freight uniforme (tabela `freight_options`).
- Distribuição (marketplace, specific customers, exclude lists).
- `incoExtras` além de `exwCity` (cif insurance %, etc.).
- `shipment_month/year`.
- Imagens custom dos cuts (`customer_product_images`).
- `negotiation_mode/dial/allow_quantity_negotiation` — já carregado em effect separado (ok, mas isolado).

**Save (`handlePublish` em modo edit):**

- Faz `DELETE` em `offer_items`, `offer_allowed_incoterms`, `offer_markets`, `freight_options` e re-insere a partir do estado. Como o estado está incompleto/zerado, os children são re-gravados **piores que o original** (plant, packaging, freight zerados).
- Esse é o motivo de "não salvou as alterações" — o que foi alterado pelo usuário é gravado, **mas o que não foi tocado também é apagado** porque o estado não refletia o salvo.

## Plano

### 1) Expandir a query em `OfferDetail.handleEdit` (e por consistência em `handleClone`)

Buscar TUDO o que a tela precisa:

```
offers: shipment_month, shipment_year, plant_id, office_id,
        negotiation_mode, negotiation_dial, allow_quantity_negotiation,
        ...todos os campos já listados
offer_items: + packaging, plant_id,
             customer_product: + image_url (se houver), notes
offer_markets: + selected_port_ids (via offer_markets ↔ ports — confirmar relação;
               se não houver hoje, usar freight_options para inferir ports ativos)
freight_options: market_id, port_id, freight_per_kg, uniform flag
offer_distributions: tipo, customer_ids
```

Adicionar esses campos ao objeto `editOffer` enviado em `navigate("/supplier/offers/new", { state: { editOffer } })`.

### 2) Criar fluxo de hidratação dedicado para `editOffer`

Em `SupplierCreateOffer.tsx`, separar do effect de clone:

- Manter o effect de **clone** intocado (usa defaults vazios para criar offer nova).
- Adicionar **novo effect** que dispara só quando `isEditing`, e hidrata:
  - `setCuts` com `pkg`, `gr`, `notes`, `plant`, `plantId`, `cutImage` preenchidos a partir dos `items`.
  - `setMktCfg` com `sp` (selected ports), `gf` (general freight), `pf` (per-port freight) reconstruídos das tabelas `freight_options` + `offer_markets`.
  - `setIncoExtras` completo.
  - `setDistMarketplace/Specific/All/SelectedCustomers` a partir de `offer_distributions`.
  - `setOriginPortId`, `setShipmentMonth/Year` se aplicável.

### 3) Tornar `handlePublish` em modo edit menos destrutivo

Hoje deleta children e reinsere. Mantém a estratégia (mais simples que diff), **mas** só execute esse caminho **depois** que o estado foi hidratado por completo. Adicionar guard: se `isEditing && !hydratedFully`, bloquear save com toast "Loading offer data — try again in a moment".

Marcar `hydratedFully = true` ao final do novo effect.

### 4) Sanidade visual

Ao abrir Edit, exibir um spinner curto ou skeleton enquanto a hidratação roda, para o supplier não começar a editar campos vazios e perder a mudança quando o effect popular depois.

## Escopo / arquivos

- `src/pages/supplier/OfferDetail.tsx` — expandir query do Edit (e Clone).
- `src/pages/supplier/SupplierCreateOffer.tsx` — separar effect de edit, hidratar todos campos, guard no save.
- Sem mudança de schema.
- Admin on-behalf usa a mesma tela → herda a correção. Confirmar se existe outra entrada de Edit (ex: `AdminOfferDetail`) e replicar a query expandida lá também.

## Perguntas antes de implementar

1. **Distribuição (marketplace vs specific customers)** — confirmo existência da tabela `offer_distributions` (vejo na lista de tabelas). Quer que eu hidrate também distribution no Edit? (recomendo sim, senão "exclusões" somem ao salvar) SIM
2. **Edit deve travar campos que não podem mudar** após publicação (ex: supplier, offer number, origem) — ou tudo é editável como já é hoje? Se nao tiver negociacoes, sim TUDO
3. Existe `AdminOfferDetail` com Edit próprio? Se sim, replico a mesma correção lá. NAO SEI