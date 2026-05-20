# Refinar criação de oferta (Supplier)

Escopo: `src/pages/supplier/SupplierCreateOffer.tsx` + estilos `mundus-create-offer-v2.css`. Sem mudanças de schema/backend.

## 1. Mercados principais + busca global

- No `useSupplierOfferData` (ou um derive local na página), separar `markets` em dois grupos:
  - **Principais** (ordem fixa, sempre visíveis como chips para toggle):
    `China, Hong Kong, Vietnam, Taiwan, Thailand, South Korea, Indonesia, Egypt, Russia, Jordan, United States, Canada, Mexico`.
    Matching pelo `english_name` do país (lista whitelist no front).
  - **Outros** → acessíveis via botão "+ More markets" que abre um **Combobox global** (shadcn `Command` em `Popover`) com:
    - input de busca (filtra por nome, ignora acento/caixa);
    - bandeira + nome;
    - multi‑select com checkmark, popover **não fecha** ao selecionar (mantém navegabilidade);
    - mercados já escolhidos aparecem como chips na linha principal com `✕` para remover (igual hoje).
- Mercados principais que já estão selecionados mostram estado ativo; os não-principais selecionados aparecem como chip extra ao lado dos principais.
- Mobile: o botão "+ More markets" abre o mesmo Command dentro de um `Sheet` bottom para uso com uma mão.

## 2. Incoterms: CIF desativa CFR (e vice‑versa)

- Hoje `selInco` é multi‑select livre. Regra nova:
  - Se `CIF` está selecionado → botão `CFR` fica `disabled` (visual `cov4-inco-btn` com opacidade reduzida + `cursor-not-allowed` + tooltip "Incompatível com CIF").
  - Se `CFR` está selecionado → `CIF` fica `disabled`.
  - `FOB` continua livre, combinável com qualquer um.
- Sem mudança de dados; apenas lógica no toggle e no render do botão.

## 3. Cortes — busca digitável + foto

### Campo "Cut" no add‑row
- Substituir o `<select>` nativo por um **Combobox** (shadcn `Command` + `Popover`):
  - input com busca por `displayName` (case/acento‑insensitive);
  - cada item mostra **thumbnail** (`image_url`) + nome;
  - ao escolher, preenche `cutId`, `cut`, `cutImage` como hoje.
- Categoria continua como select acima (filtra a lista do combobox).
- Mobile: mesmo Command dentro de bottom `Sheet`.

### Foto na linha da tabela
- Hoje a célula `.cov4-img-box` já mostra `cutImage` quando existe. Garantir:
  - Quando o usuário escolhe um corte que tem `image_url`, a thumb aparece imediatamente na caixinha (já faz). Manter drag‑and‑drop para sobrescrever.
- **Hover preview (desktop)**: envolver a `.cov4-img-box` em `HoverCard`:
  - trigger = a caixinha (40×40);
  - content = imagem ampliada ~240×240 com nome do corte abaixo;
  - delay curto (~150ms), fecha ao sair.
- **Mobile**: hover não existe → ao **tap** na caixinha abre um pequeno `Dialog`/`Sheet` com a imagem ampliada e botão fechar. O upload por clique passa para um botão "Trocar foto" dentro desse diálogo (drag‑and‑drop continua funcionando no desktop).

## Detalhes técnicos

- Whitelist de principais em constante no arquivo da página:
  ```ts
  const PRIMARY_MARKETS = ["China","Hong Kong","Vietnam","Taiwan","Thailand","South Korea","Indonesia","Egypt","Russia","Jordan","United States","Canada","Mexico"];
  ```
  Split: `primary = MARKETS.filter(m => PRIMARY_MARKETS.includes(m.n))` ordenado pela whitelist; `others = MARKETS.filter(...)`.
- Usar componentes já no projeto: `Command`, `Popover`, `HoverCard`, `Dialog`/`Sheet`, `useIsMobile`. Sem novas deps.
- Estilos novos isolados em `mundus-create-offer-v2.css` (chips de mercado, combobox item com thumb, hover‑card image). Preserva layout e CSS atuais.
- i18n: adicionar strings em `supplier.createOffer.marketplace.*` (en/pt/es) para "More markets", placeholder de busca, tooltip de incoterm incompatível, "Trocar foto".

## Fora do escopo

- Schema do banco, RLS, ou alterar `useSupplierOfferData`.
- Mudanças no buyer / outras telas.
- Mudanças no fluxo de logística, AI import, ou Live Preview.
