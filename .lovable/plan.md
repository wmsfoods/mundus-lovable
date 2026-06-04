
# Plan — Redesign layout do "Create new offer" (Supplier)

Escopo: **somente visual/layout** em `src/pages/supplier/SupplierCreateOffer.tsx` + novo CSS dedicado + i18n. **Nenhuma mudança em fluxo, regras, cálculos, validações, hooks, queries ou estado.** Todo o state atual (markets, cuts, pricing, freight, NegotiationHandlingControl, payment terms, distribution flags, etc.) é reaproveitado integralmente.

## 1. Novo cabeçalho da página

Substituir o cabeçalho atual por:

- **Breadcrumb**: `Home › New offer`
- **Título**: `New offer` + subtítulo `One screen · click any pill to edit`
- **Lado direito**: pill `● Live preview` (toggle existente), toggle `kg / lbs` (já existe), chip `● In progress · NN %` (usa cálculo de progresso já existente)

## 2. Barra de "Logistics summary" (pills resumo + Edit logistics)

Bloco horizontal logo abaixo do título com pills read-only derivadas do estado atual:

```text
FROM            TO · N COUNTRIES     CONTAINER         INCOTERM    CERTIFICATIONS   📦 FREIGHT QUOTE     [ ✎ Edit logistics ]
🇺🇸 Wilmington   🇨🇳 🇨🇦 · 3 ports    1 × 40ft · Frozen  CFR         USDA · HACCP     Search rates →
```

- Valores vêm do state já existente (origin port, destinations, container, incoterm, certifications, freight).
- Botão **Edit logistics** abre um **modal/drawer** contendo **exatamente** os blocos hoje renderizados (Origin, Destinations + ports, Container/Incoterm, Certifications, Freight rates) — apenas movidos para dentro do modal. Comportamento idêntico ao das telas atuais (screenshots 2 e 3 anexados).
- Nada de lógica nova: o modal só reusa os mesmos componentes/handlers já existentes.

## 3. Card único "Products & pricing"

Um card grande contendo, em ordem:

1. Header do card: ícone 🥩, título `Products & pricing`, subtítulo `N cuts · drag to reorder`, botão `✨ AI fill from file` à direita (abre o painel AI Import já existente).
2. Tabs: `🌐 Global Beef & Pork Cuts` | `🇺🇸 US Beef & Pork (IMPS)` — usa `cutRegion` já existente.
3. Linha **Container capacity** com barra de progresso (cálculo atual de `totalQty / capacity`).
4. **Barra ✨ APPLY TO ALL** (novo controle visual; só altera linhas via handlers existentes):
   - `Packing` — dropdown com a lista atual de packings; aplica em todas as linhas.
   - `Plant #` — dropdown carregado dos plants do supplier (hook/fonte já usado por cada linha).
   - `Spec` — dropdown com `Bone-In | Boneless | Offals` (mesma fonte já usada nas linhas, via `normalizeSpec`).
   - `Floor price` — mantém o controle "apply to all" já existente.
   - Cada controle fica **desabilitado quando há ≤ 1 corte** (regra pedida pelo usuário).
   - Botão `🧾 Paste from Excel` à direita (já existe).
5. Tabela compacta com colunas: foto, PROTEIN, BRAND, ITEM/CUT, SPEC, PACKING, PLANT #, NOTES, QTY, ASK, FLOOR, SUBTOTAL, ✕. Mesmas células/handlers atuais — só reorganização visual e tipografia.
6. `+ Add cut` à esquerda + contador `N cuts` à direita.
7. Linha de totais: `TOTAL QTY`, `AVG ASK PRICE`, `ASKING TOTAL`, `FLOOR TOTAL` (todos já calculados hoje).

## 4. Footer de 2 colunas

Abaixo do card de produtos, **duas colunas lado a lado**:

### 4a. Payment terms (esquerda)
- Select de payment terms (componente atual).
- Campo `Shipment ready` (já existe).

### 4b. Offer distribution (direita) — somente Marketplace ativo
- **Publish to Marketplace** — checkbox **funcional** (já existe).
- **Send to all my customers** — exibir como card **desabilitado** com badge `🚧 In construction`. Checkbox desabilitado; sem efeito no submit.
- **Marketplace + Specific** — exibir como card **desabilitado** com badge `🚧 In construction`.
- **Specific customers** — exibir como card **desabilitado** com badge `🚧 In construction`. Esconder a lista de chips de clientes (não renderizar `MOCK_CUSTOMERS`).
- A lógica de `distOk` permanece a mesma; como apenas Marketplace é selecionável, na prática o gating fica equivalente ao atual quando o usuário marca Marketplace.

## 5. Negotiation handling (Manual vs Automatic)

- **Mantém-se exatamente** o componente `NegotiationHandlingControl` com modal Manual/Automatic e o dial. Ele é re-posicionado dentro do footer (abaixo de Payment terms / Offer distribution, ocupando largura total) **sem nenhuma mudança de comportamento**.
- **Remover do layout** o bloco "Negotiation rules / Allow buyers to negotiate item quantities" (pedido explícito do usuário). O state `allowQtyNegotiation` é mantido com valor default atual para não quebrar o submit; só o bloco visual é removido.

## 6. Footer sticky de ações (mantido)

- Barra fixa no rodapé com `Save draft`, barra de progresso `N of 5 ready`, `Preview`, `Publish` — já existem; apenas estilo alinhado ao novo visual.

## 7. CSS

- Novo arquivo `src/styles/mundus-create-offer-v3.css` com classes `co3-*` para o novo layout. O CSS antigo (`mundus-create-offer-v2.css`) continua importado enquanto o modal de logistics reutilizar suas classes internas.
- Tokens semânticos (`hsl(var(--...))`); responsivo (≥1100px duas colunas, <1100px empilha).

## 8. i18n

- Adicionar apenas chaves novas em `supplier.createOffer.screen.*` para: `oneScreenHint`, `logisticsFrom`, `logisticsTo`, `logisticsContainer`, `logisticsIncoterm`, `logisticsCertifications`, `freightQuote`, `editLogistics`, `aiFillFromFile`, `cutsDragHint`, `applyToAllSpec`, `inConstruction`, `dragToReorder`. Sem alterar chaves existentes. Paridade nos 5 idiomas (en/pt/es/fr/zh).

## Detalhes técnicos

- Arquivos tocados:
  - `src/pages/supplier/SupplierCreateOffer.tsx` (reorganização do JSX + novo modal "Edit logistics" envolvendo blocos atuais).
  - `src/styles/mundus-create-offer-v3.css` (novo).
  - `src/i18n/locales/{en,pt,es,fr,zh}.json` (somente novas chaves).
- **Não alterados**: hooks (`useSupplierOfferData`, etc.), `NegotiationHandlingControl`, schemas, edge functions, rotas, submit handler, cálculos de progresso/capacity/pricing.
- `MOCK_CUSTOMERS` permanece no arquivo mas não é renderizado.
- Apply-to-all (Packing/Plant#/Spec) usa os mesmos setters por linha que o usuário aciona manualmente hoje — apenas iterando sobre `cuts`.

## Divergências sinalizadas

1. O screenshot não mostra `Negotiation handling`. Vou mantê-lo (conforme você pediu) **logo abaixo** do par Payment terms / Offer distribution, em largura total. Confirme se prefere dentro de um Accordion fechado.
2. O screenshot mostra Plant # como input livre por linha. Vou manter input livre por linha **e** adicionar o dropdown "Apply to all → Plant #" baseado nos plants cadastrados do supplier (como você descreveu). Sem alterar a coluna existente.
3. "Marketplace + Specific" não existe hoje como opção separada — vou adicioná-la apenas como card visual desabilitado com `In construction` (sem state novo).
