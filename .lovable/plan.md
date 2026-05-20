
# Admin > Companies (Mundus companies)

Goal: substituir o placeholder em `/admin/companies` por uma página real de listagem das empresas que já entraram na Mundus (buyers, suppliers e buyer+supplier), restrita a admins da Mundus, com a base de dados pronta para receber novas conversões vindas do CRM de prospects.

## 1. Banco de dados (migration)

A tabela `public.companies` já existe com os campos necessários (`name`, `tax_id`, `country`, `state`, `city`, `is_buyer`, `is_supplier`, `is_verified`, `status`, `logo_url`, `phone`, `website`, `company_number`, etc.) — porém está **sem RLS**, o que é um problema de segurança.

Mudanças:

- Adicionar colunas auxiliares para rastrear a origem do onboarding:
  - `onboarded_at timestamptz`
  - `onboarded_from_prospect_id uuid` (referência lógica para `crm_companies.id`)
  - `onboarded_by uuid`
- Adicionar `index` em `(is_buyer, is_supplier, status, country)` para filtros.
- Habilitar RLS em `companies` e criar políticas:
  - `companies_admin_all`: ALL para `is_mundus_admin()` (admins veem/editam tudo).
  - `companies_member_select`: SELECT quando `id = current_user_company_id()` (usuário vê a própria empresa — necessário para o `useCurrentCompany`).
- Sem políticas de INSERT/UPDATE/DELETE para não-admins (a conversão de prospect será feita server-side mais tarde).

Tabelas relacionadas (`company_users`, `company_buyer_ratings`) ficam fora do escopo desta entrega — manter como estão.

## 2. Frontend

### Rota
- Em `src/App.tsx`, trocar `<AdminComingSoon section="companies" />` por `<AdminCompanies />`.

### Novo hook `src/hooks/useAdminCompanies.ts`
- Carrega `companies` via Supabase (`select id, company_number, name, country, state, city, phone, website, logo_url, is_buyer, is_supplier, is_verified, status, onboarded_at, created_at`).
- Retorna `{ rows, loading, error, refresh }`.
- Sem mock — usa o banco real (admin já tem RLS allow).

### Nova página `src/pages/admin/AdminCompanies.tsx`
Estrutura inspirada em `AdminProspects.tsx` para manter consistência visual (`adm-body`, `adm-page-header`, `crm-toolbar`, `adm-table`):

- Header: título "Companies" + subtítulo `· {active}/{total}`.
- Tiles resumo: Total · Buyers · Suppliers · Buyer+Supplier · Inactive (clicáveis para filtrar).
- Toolbar: busca (nome, país, tax_id), filtro de tipo (All / Buyer Mundus / Supplier Mundus / Buyer+Supplier), filtro de status (active/inactive), filtro de país.
- Tabela com colunas:
  - Company (logo+nome+`#company_number`)
  - Type (chip Buyer / Supplier / Buyer+Supplier)
  - Country / City
  - Verified (badge)
  - Onboarded at
  - Status
  - Ações (ver detalhe — placeholder)
- Estado vazio com call-to-action "Convert a prospect" (link para `/admin/crm`).
- Mobile: cards verticais (lista) em vez de tabela, padrão já usado nos outros admin lists (respeita Core memory de mobile-first).

### i18n
Adicionar em `en/pt/es`:
- `admin.companies.title`, `admin.companies.subtitle`
- `admin.companies.tiles.{total,buyers,suppliers,both,inactive}`
- `admin.companies.filters.{search,allTypes,buyer,supplier,both,allStatuses,active,inactive,allCountries}`
- `admin.companies.cols.{company,type,location,verified,onboarded,status,actions}`
- `admin.companies.empty.{title,body,cta}`

### CSS
Reaproveitar `mundus-admin.css` (classes `adm-*`, `crm-tile`, `crm-toolbar`, `crm-btn-*`, `adm-table`). Sem novo arquivo CSS necessário.

## 3. Fora do escopo (próximo passo)
- Página de detalhe de Mundus Company (`/admin/companies/:id`).
- Ligar o `convertProspectToMundus` para realmente inserir em `public.companies` (hoje é mock).
- CRUD de usuários (master user) e plantas/certificações da empresa.

## Detalhes técnicos

```text
DB migration
  ALTER TABLE public.companies
    ADD COLUMN onboarded_at        timestamptz,
    ADD COLUMN onboarded_from_prospect_id uuid,
    ADD COLUMN onboarded_by        uuid;
  CREATE INDEX ON public.companies (is_buyer, is_supplier, status);
  CREATE INDEX ON public.companies (country);
  ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
  CREATE POLICY companies_admin_all   ON public.companies FOR ALL TO authenticated
    USING (is_mundus_admin())          WITH CHECK (is_mundus_admin());
  CREATE POLICY companies_member_select ON public.companies FOR SELECT TO authenticated
    USING (id = current_user_company_id());
```

Arquivos:
- supabase migration (novo)
- src/App.tsx (1 linha)
- src/hooks/useAdminCompanies.ts (novo)
- src/pages/admin/AdminCompanies.tsx (novo)
- src/i18n/locales/{en,pt,es}.json
