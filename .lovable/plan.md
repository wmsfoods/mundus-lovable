## Objetivo

Transformar a página de detalhe do Prospect (`/admin/crm/prospects/:id`) em um registro completo, editável, com ações de salvar, desativar e excluir — respeitando o ciclo de vida da empresa (prospect → onboarded → buyer/supplier ativo da Mundus). Persistência real em banco (substituindo o mock `useAdminProspects` para este detalhe), 3 idiomas (en/pt/es) e mobile-first.

> Escopo desta entrega: apenas Admin → CRM/Prospect. O painel do "user master" de cada empresa fica para um próximo passo (mas a modelagem já o suporta).

---

## 1. Modelo de dados (migration)

Estendemos as tabelas existentes `crm_companies` e `crm_contacts` e criamos uma tabela de vínculo com a empresa Mundus quando ela se onboarda.

### `crm_companies` — adicionar
- `lead_type` text — `buyer` | `supplier` | `buyer_supplier`
- `street`, `address_number`, `address_complement` text (city/state/country/postal_code já existem)
- `is_active` boolean default true
- `deactivated_at` timestamptz, `deactivated_by` uuid, `deactivation_reason` text
- `onboarded_at` timestamptz — quando virou cliente Mundus
- `mundus_company_id` já existe → usado como "está onboarded?" (not null = onboarded)
- Trigger `updated_at`

### `crm_contacts` — adicionar
- `is_primary` boolean default false (1 principal por company)
- `additional_email` text (renomear/usar `secondary_email` existente)
- `is_active` boolean default true
- Campos pedidos já existem: `email`, `phone`, `mobile`, `personal_linkedin`, `decision_level`, `role`, `full_name`
- Índice único parcial: 1 contato principal por `company_id` ativo

### Regras (no banco e/ou app)
- DELETE em `crm_companies` permitido apenas se `mundus_company_id IS NULL` (nunca foi onboarded). Caso contrário, apenas `is_active = false`.
- Ao desativar empresa: marcar todos `crm_contacts` da empresa com `is_active = false`. Quando existir um `users.master` na `mundus_company_id`, também desativar o login (passo futuro — deixar gancho).
- RLS: já existe `crm_*_admin_all` via `is_mundus_admin()`. Mantemos. (Quando o painel do user master existir, adicionaremos policies para `current_user_company_id() = mundus_company_id`.)

### Apollo cache
- Reaproveitar `apollo_cache` já existente para "Search more people" (TTL 30d).

---

## 2. Backend: edge function

Criar `supabase/functions/prospect-apollo-people/index.ts` (verify_jwt = true, exige admin):
- Input: `{ company_id }`
- Lê `crm_companies` (domain, name, linkedin_url, country)
- Chama Apollo `mixed_people/search` via secret `apollo` já configurado
- Cache em `apollo_cache` (entity_type='people_by_company', apollo_id=domain)
- Resposta: lista de pessoas com `name, title, seniority, department, linkedin, email_status, phone_status` (sem revelar emails/telefones — apenas status para o botão Reveal usar depois)
- Botão "Search more people" só habilitado se `mundus_company_id IS NULL` (ainda não é cliente)

---

## 3. Frontend

### 3.1 Trocar o store mock pelo Supabase no detalhe
Novo hook `src/hooks/useCrmCompanyDetail.ts`:
- `useCrmCompany(id)` → busca `crm_companies` + `crm_contacts` (ordenados, principal primeiro)
- `updateCrmCompany(id, patch)`, `deactivateCrmCompany(id, reason)`, `deleteCrmCompany(id)`
- `upsertCrmContact(...)`, `deleteCrmContact(id)`
- Realtime opcional (`postgres_changes`) — fica como nice-to-have.

A rota `/admin/crm/prospects/:id` passa a usar este hook (mantendo `AdminProspects` listagem por enquanto, em paralelo, até a migração da lista — fora deste escopo).

### 3.2 Página `AdminProspectDetail.tsx` — refatorada

Layout mobile-first (1 coluna < 900px, 2 colunas no desktop).

**Header**
- Nome da empresa, badges: `Lead type`, `Stage`, `Active/Inactive`, `Onboarded` (se for o caso)
- Botões: `Edit` / `Save` / `Cancel`, `Deactivate`, `Delete` (desabilitado se onboarded — tooltip), `Search more people` (oculto/desabilitado se onboarded)

**Seção 1: Empresa** (edit-in-place)
- Company Name, Lead type (select: Buyer / Supplier / Buyer & Supplier)
- Address: Street, City, State, Zip, Country
- Industry, Website, Company LinkedIn

**Seção 2: Main contact**
- Full name, Email, Additional email, Phone, Mobile, Personal LinkedIn, Decision level

**Seção 3: Additional contacts**
- Mini-tabela editável (Full name, Role, Email, Additional email, Phone, Mobile, LinkedIn)
- Botão `+ Add contact`
- Trash por linha

**Seção 4: Search more people (Apollo)** — só admin, só se não onboarded
- Drawer/modal lista pessoas retornadas pela edge function
- Cada linha: nome + cargo + botões `Reveal email`, `Reveal phone`, `Reveal mobile`, `Add as contact` (faz upsert em `crm_contacts` desse company)

**Seção 5: Activity & Notes** (mantém visual atual)

**Modal de desativação**
Texto fixo nos 3 idiomas:
- "Você está desativando a empresa. O usuário não poderá mais entrar. Os dados existentes são preservados."
- Confirma com botão vermelho "Deactivate".

**Modal de exclusão**
- Só aparece se `mundus_company_id IS NULL`. Caso contrário, mostra mensagem explicando por que não pode.

### 3.3 i18n
Adicionar chaves em `src/i18n/locales/{en,pt,es}.json` em `admin.crm.detail.*`:
- `leadType.buyer | supplier | both`
- `decisionLevel.{c_level|vp|director|manager|specialist|other}`
- `actions.edit | save | cancel | deactivate | delete | searchMorePeople | addContact | reveal`
- `deactivate.title | deactivate.body | deactivate.confirm`
- `delete.cannotOnboarded`
- `contacts.main | contacts.additional | contacts.empty`
- `apollo.title | apollo.empty | apollo.added`

### 3.4 Componentes/arquivos
- `src/components/prospect/CompanyEditForm.tsx`
- `src/components/prospect/MainContactForm.tsx`
- `src/components/prospect/AdditionalContactsTable.tsx`
- `src/components/prospect/DeactivateCompanyModal.tsx`
- `src/components/prospect/SearchMorePeopleDrawer.tsx`
- Estilos em `src/styles/mundus-prospect.css` (estende; mobile-first, breakpoint 900px já existe)

### 3.5 Mobile
- Header colapsado, ações em bottom-sheet
- Cada seção como `<details>` colapsável, padrão aberto na principal
- Inputs full-width 44px de altura mínima

---

## 4. Pensando no futuro (modelagem, não implementação agora)

- Quando admin clica "Onboard" (futuro): cria `companies` (já existe), seta `crm_companies.mundus_company_id`, `onboarded_at = now()`, cria `users` master + `company_users` com `role = company_master`. A partir daí o user master enxerga via futuras RLS `company_id = current_user_company_id()`.
- Desativar empresa onboarded → desativar `company_users.status='disabled'` (gancho deixado, ação real depois).

---

## 5. Entregáveis nesta tarefa

1. Migration estendendo `crm_companies` e `crm_contacts` + check function para impedir delete de onboarded.
2. Edge function `prospect-apollo-people`.
3. Hook `useCrmCompanyDetail`.
4. Refator de `AdminProspectDetail.tsx` + 5 componentes novos.
5. Chaves i18n nos 3 idiomas.
6. Estilos mobile-first em `mundus-prospect.css`.

Fora de escopo: migração da listagem `/admin/crm/prospects` para Supabase, painel do user master, integração Apollo real para reveal de email/phone (mantemos mock no botão Reveal por enquanto, igual ao restante do módulo).

Confirma que posso seguir com essa abordagem? Em especial:
- (a) o detalhe lê de `crm_companies` (Supabase) e a listagem segue no mock por enquanto — ok?
- (b) ativar agora a edge function Apollo real para "Search more people" (você tem o secret `apollo`), ou deixar mock também?