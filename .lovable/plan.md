## Goal

Transformar `/admin/companies` em uma **listagem em tabela** (sem cards de estatística por enquanto) e adicionar **CRUD completo** para admins editarem todos os campos de cada empresa.

## 1. Listagem — `/admin/companies`

**Remover:**
- Os 5 cards de estatística (`crm-funnel-tiles`).

**Manter:**
- Header com título.
- Toolbar com busca, filtro de status e filtro de país (já funciona bem).
- Tabela desktop **+ cards mobile** (regra do projeto: mobile precisa funcionar bem; tabelas complexas viram cards verticais em telas pequenas).

**Adicionar:**
- Botão **"+ New company"** no topo direito do header, abre o detalhe em modo criação (`/admin/companies/new`).
- Cada linha da tabela é clicável → navega para `/admin/companies/:id`.
- Coluna de ações com ícone de "edit" (atalho que também leva para o detalhe).

## 2. Detalhe / Edit — `/admin/companies/:id` (e `/new`)

Página única que cobre **view + edit + create + deactivate**, baseada no padrão de `AdminProspectDetail`.

**Layout (desktop):**
- Header: logo + nome + `#company_number` + chips (Type, Status, Verified) + botões `Save`, `Cancel`, `Deactivate` (ou `Activate`).
- 2 colunas:
  - **Esquerda — Identity**: name, tax_id, logo_url, website, phone, rating.
  - **Direita — Address**: address, city, state, country, zip_code.
- Bloco abaixo — **Classification**: toggles `is_buyer`, `is_supplier`, `is_verified`; campos `business_types`, `protein_profiles` (lista de tags).
- Bloco — **Onboarding (read-only)**: onboarded_at, onboarded_by, onboarded_from_prospect_id, created_at, updated_at.

**Mobile:**
- Layout em coluna única, seções colapsáveis, botões de ação fixos no rodapé (safe-area respeitada).

**Ações:**
- `Save` → `UPDATE companies SET ... WHERE id = :id` (ou `INSERT` no modo "new").
- `Deactivate` → `UPDATE companies SET status='inactive'`. `Activate` faz o inverso.
- **Não** expomos botão de delete físico — o trigger `crm_companies_prevent_delete_if_onboarded` bloqueia exclusão de empresas onboarded. Tratamos "delete" como deactivate (soft).
- Confirmação modal antes de Deactivate.

## 3. Hook — `useAdminCompany(id)`

Novo hook: carrega uma empresa pelo id, expõe `data`, `loading`, `error`, `save(patch)`, `setActive(boolean)`. Reutiliza supabase client com RLS `is_mundus_admin()`.

`useAdminCompanies` (listagem) continua igual — só não usaremos mais o objeto `counts` para tiles.

## 4. Rotas — `src/App.tsx`

Adicionar:
```
<Route path="companies/new" element={<AdminCompanyDetail mode="new" />} />
<Route path="companies/:id" element={<AdminCompanyDetail />} />
```

## 5. i18n — en/pt/es

Sob `admin.companies` adicionar:
- `actions.new`, `actions.save`, `actions.cancel`, `actions.deactivate`, `actions.activate`, `actions.edit`
- `sections.identity`, `sections.address`, `sections.classification`, `sections.onboarding`
- `fields.*` para todos os campos editáveis (name, taxId, website, phone, address, city, state, country, zipCode, logoUrl, rating, businessTypes, proteinProfiles, isBuyer, isSupplier, isVerified)
- `confirmDeactivate.title/body`, `toast.saved/deactivated/activated/error`

## 6. Arquivos

- **edit** `src/pages/admin/AdminCompanies.tsx` — remove tiles, adiciona botão "New" e onClick na linha.
- **new** `src/pages/admin/AdminCompanyDetail.tsx` — página de detalhe/edit/create.
- **new** `src/hooks/useAdminCompany.ts`
- **edit** `src/App.tsx` — 2 rotas.
- **edit** `src/i18n/locales/{en,pt,es}.json`.
- **edit** `src/styles/mundus-admin.css` — apenas se precisarmos de classes novas para o form (provável: `.adm-form-grid`, `.adm-field`, `.adm-actions-bar`).

Sem migrations: o schema atual de `companies` já tem todos os campos e o RLS `companies_admin_all` já dá CRUD pleno para admins.
