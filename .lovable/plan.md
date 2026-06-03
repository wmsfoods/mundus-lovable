## Goal
Aprimorar os filtros da aba **Users** em `/admin/companies?tab=users` para nível enterprise: multi-seleção em todos os filtros, busca tipada no select de empresas, e bandeiras + multi-seleção nos países.

## Mudanças

### 1. Filtro **Company** — combobox com busca
- Substituir o `<select>` por um popover com:
  - Input de busca (debounce 150ms) filtrando por nome da empresa
  - Lista virtualizada simples com checkbox por empresa
  - Mostra logo/bandeira do país + nome
  - Chips das empresas selecionadas no topo do popover (removíveis)
  - Label do botão: "All companies" / "Acme Foods" / "3 companies"
- Estado passa de `companyF: string` para `companyF: string[]`

### 2. Filtro **Country** — multi-select com bandeiras
- Reutilizar o componente existente `CountryMultiFilter` (`src/components/admin/CountryMultiFilter.tsx`) que já tem busca, bandeiras e multi-seleção
- Passar `available` = Set dos países que aparecem nas linhas atuais
- Estado passa de `countryF: string` para `countryF: string[]`

### 3. Demais filtros — multi-seleção
Converter para multi-select (mesmo padrão de popover com checkboxes, mais leve sem busca):
- **Type**: Buyer / Supplier / Both (array)
- **Status**: Active / Invited / Inactive (array)
- **Role**: lista dinâmica de roles existentes (array)

Quando vazio = "All …". Quando 1 = mostra o valor. Quando 2+ = "N selected".

### 4. Lógica de filtro
Atualizar `filtered` em `CompanyUsersView.tsx`:
- Cada filtro array vazio = sem restrição
- Caso contrário: `arr.includes(row.value)`
- Country: comparar com `row.company_country`
- Company: `arr.includes(row.company_id)`
- Type: derivar de `companyType(r)` e checar inclusão

### 5. Chips de filtros ativos
- Atualizar a barra de chips para refletir multi-seleção:
  - "Type: Buyer, Supplier"
  - "Companies: 3"
  - "Countries: 🇧🇷 🇺🇸 +2"
- Botão "Clear all" mantém comportamento

### 6. Mobile
- Popovers permanecem usáveis em mobile (já testados no `CountryMultiFilter`)
- Garantir `width: 100%` nos triggers dentro do `crm-toolbar` quando empilhado

## Arquivos a editar
- `src/components/admin/companies/CompanyUsersView.tsx` — trocar selects por popovers multi-select, ajustar estado e lógica
- `src/components/admin/MultiSelectPopover.tsx` *(novo)* — componente genérico reutilizável (trigger + popover + checkbox list + opcional search) para Type/Status/Role/Company
- Reuso direto de `CountryMultiFilter` para países

## Fora de escopo
- Sem mudanças no hook `useAdminCompanyUsers` (já retorna `companies` e `company_country`)
- Sem mudanças de banco
- Sem alteração nos demais filtros do tab Companies
