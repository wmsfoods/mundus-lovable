# Filtros inteligentes de proteína no Marketplace

## Objetivo
Modernizar a navegação por proteína (Beef, Pork, Poultry, Ovine) nos módulos onde existem ofertas, com pills visuais (ícone + nome + contador), filtros adicionais inteligentes e busca rápida.

## Escopo por módulo

### 1. Supplier — `/supplier/offers`
Hoje já existe uma fileira de pills básica (`all / beef / pork / poultry / ovine`) com texto puro. Vamos substituir por:
- **Pills modernas com ícone de proteína** (🥩 Beef, 🐖 Pork, 🐓 Poultry, 🐑 Ovine) seguindo o estilo da imagem enviada.
- **Filtrar dinamicamente as proteínas exibidas** com base no que o supplier exporta. Origem: `company_proteins`/`supplier_proteins` derivado das ofertas existentes do supplier ou do cadastro de espécies no perfil (`CompanyProfileSections` usa `SPECIES = ["Beef","Pork","Poultry","Lamb"]`). Vou ler do cadastro do supplier (production capacities/species) — se vazio, fallback para o conjunto que aparece nas próprias offers dele.
- **Contador por proteína** na própria pill (ex.: `Beef · 12`).
- Demais filtros existentes (status, sort, view) ficam.

### 2. Buyer — `/buyer/offers`
Hoje **não existe nenhum filtro**. Adicionar barra de filtros nova:
- **Pills de proteína** (Beef, Pork, Poultry, Ovine) — calculadas a partir das offers retornadas (categorias presentes no marketplace), com contador.
- **Busca rápida** por nome de corte / origem.
- **Filtros secundários** (collapsible "Mais filtros"): origem (país), destino, incoterm, mês de shipment, condição (Chilled/Frozen), faixa de volume.
- **Sort**: mais recente, preço asc/desc, volume.
- **Chips de filtros ativos** com botão "limpar tudo".

### 3. Buyer — `/buyer` (Home)
Hoje só tem hero + stats + recent. Adicionar:
- **Bloco "Explore by protein"** acima de "Recent Offers": 4 cards visuais (ícone + nome + contagem de ofertas ativas no marketplace daquela proteína) que navegam para `/buyer/offers?protein=beef` etc.
- A página `/buyer/offers` lê o query param e pré-seleciona a pill correspondente.

### 4. Admin
**Observação:** não existe página `Admin Offers` no projeto hoje (só `AdminNegotiations`, `AdminCompanies`, etc.). Confirme se deseja:
(a) que eu crie uma nova página `Admin → Offers` listando todas as offers do marketplace com os mesmos filtros, ou
(b) que eu aplique os filtros somente nas duas telas existentes (supplier + buyer) por enquanto.

## Detalhes técnicos

### Componente novo: `src/components/marketplace/ProteinFilter.tsx`
- Recebe `availableProteins: ("Beef"|"Pork"|"Poultry"|"Ovine")[]`, `counts: Record<protein, number>`, `value`, `onChange`.
- Renderiza pills com ícone emoji/svg, label, contador. Estilo arredondado, com borda suave, estado ativo com fundo escuro (como na imagem).
- Animação de transição via CSS (sem framer-motion novo).
- Acessível (botões com `aria-pressed`).

### CSS novo: `src/styles/mundus-protein-filter.css`
Pills modernas, responsivas (scroll horizontal em mobile).

### Lógica de "proteínas do supplier"
Função utilitária `useSupplierProteins()` (hook):
1. Tenta ler do perfil da empresa (`company_profile` / `production_capacities` se existir).
2. Fallback: deriva do conjunto distinto de `category` das ofertas do supplier.

### Lógica de "proteínas no marketplace" (buyer)
Hook `useMarketplaceProteins()`:
- Agrega `count` de offers ativas por categoria a partir de `useOffers()`.
- Memoizado.

### Filtros buyer
Refactor `BuyerOffers` para incluir estado de filtros (protein, search, origin, destination, incoterm, shipmentMonth, condition, sort) com `useMemo` sobre `offers`.

### Query param na Home → Offers
`useSearchParams` em `BuyerOffers` para pré-selecionar protein.

## Arquivos a criar / editar

**Criar**
- `src/components/marketplace/ProteinFilter.tsx`
- `src/hooks/useSupplierProteins.ts`
- `src/hooks/useMarketplaceProteins.ts`
- `src/styles/mundus-protein-filter.css`

**Editar**
- `src/pages/supplier/Offers.tsx` — trocar pills atuais pelo novo componente, filtrar lista de proteínas pela do supplier.
- `src/pages/buyer/Offers.tsx` — adicionar barra de filtros completa.
- `src/pages/buyer/Home.tsx` — adicionar seção "Explore by protein".
- `src/i18n/locales/{en,es,pt}.json` — strings novas.
- `src/main.tsx` (ou onde os CSS são importados) — importar o novo CSS.

## Mobile
Pills com scroll horizontal suave, snap-x, sem corte de safe-area. Filtros secundários em bottom sheet no buyer offers.

## Fora de escopo
- Criar nova página Admin Offers (depende da resposta acima).
- Mudanças nos detalhes da oferta.
- Backend novo — tudo é client-side a partir das queries já existentes.
