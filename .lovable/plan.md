## Visão geral
Sub-tab **Users** dentro de `/admin/companies` (sem novo item de menu), com lista global de membros de todas as empresas, CRUD completo, links cruzados e filtros enterprise-level.

## Estrutura
```text
/admin/companies?tab=companies   ← view atual, sem mudanças
/admin/companies?tab=users       ← nova view
```
Seletor de tabs no topo (pill style), abaixo do header existente. Estado persiste na URL.

## Tab "Users" — colunas
| Coluna | Fonte |
|---|---|
| User | Avatar + `full_name` |
| Email | `company_users.email` |
| Company | Logo + nome — link para `/admin/companies/:id` |
| Role | role chip (master_buyer, procurement, etc) |
| Onboarded | `joined_at` ‖ `accepted_at` ‖ `created_at` |
| Status | chip active / invited / inactive |
| Last Modified | `updated_at` |
| Modified By | nome do `updated_by` (nova coluna) |
| ✏️ | abre modal de edição |

Linha inteira clicável → modal de edição. Nome da empresa escapa para `/admin/companies/:id`.

## Filtros (enterprise-level)
- **Global search** (debounced 250ms) — busca em paralelo por: nome do user, email, nome da empresa, role, job_title. Resultados ranqueados por relevância (match exato > prefixo > contém).
- **Company Type**: All / Buyer / Supplier / Both
- **Role**: multi-select agrupado por tipo (Buyer roles / Supplier roles / Mundus roles)
- **Status**: All / Active / Invited / Inactive
- **Country** (da empresa): multi-select com bandeiras
- **Company**: multi-select com search interno (combobox)
- Botão "Clear all filters" + contador "X of Y users"

Filtros aplicados ficam visíveis como chips removíveis abaixo da toolbar.

## CRUD (modal compartilhado)
Modal único para Edit/Create:
- Campos: `full_name`, `email`, `role` (select filtrado pelo tipo da empresa: buyer roles se `is_buyer`, supplier roles se `is_supplier`), `status`, `job_title`, `phone`, `notes`, `language`.
- **Save** → `update` em `company_users` (trigger preenche `updated_by` automaticamente).
- **Delete** (canto inferior esquerdo, vermelho):
  - Só visível se o user logado for **master_buyer / master_supplier / mundus_admin** da empresa em questão.
  - **Guard**: se o membro a deletar é o último com role `master_buyer` ou `master_supplier` ativo na empresa, bloqueia com toast "Cannot delete the last master of the company. Promote another member first."
  - Remove só o vínculo em `company_users`. Preserva `auth.users`, `public.users` e `user_offices` (se o user pertencer a outras empresas, mantém acesso).
  - Confirmação dupla obrigatória.
- **Create new user** no topo da tab → mesmo modal vazio + combobox de empresa obrigatório.

## "Modified By" — nova coluna + trigger
Migration:
1. `ALTER TABLE company_users ADD COLUMN updated_by uuid` (FK → `public.users.id`, ON DELETE SET NULL).
2. Trigger `BEFORE INSERT OR UPDATE` que seta `updated_by = auth.uid()` (e mantém `updated_at = now()` já existente).
3. Linhas pré-migration ficam com `updated_by` NULL → UI mostra "—". Vai popular naturalmente conforme edições rodarem.

## Guard: "sempre tem que ficar um master na empresa"
Função SQL helper `public.is_last_master(p_company_user_id uuid) returns boolean` consultada antes do delete, e também rodada como `BEFORE DELETE` trigger pra garantir no banco (defesa em profundidade). Se for o último master ativo, levanta exceção `last_master_protected`.

UI captura a exception e mostra mensagem clara.

## Arquivos a criar/editar
**Frontend**
- `src/pages/admin/AdminCompanies.tsx` — adiciona seletor de tabs + roteamento entre `<CompaniesListView />` e `<CompanyUsersView />`.
- `src/components/admin/companies/CompaniesListView.tsx` (novo) — refator: extrai a tabela/cards/toolbar atuais sem mudar comportamento.
- `src/components/admin/companies/CompanyUsersView.tsx` (novo) — nova lista, toolbar de filtros, paginação.
- `src/components/admin/companies/CompanyUserEditModal.tsx` (novo) — modal CRUD compartilhado, com guard do último master.
- `src/hooks/useAdminCompanyUsers.ts` (novo) — fetch com join `companies` + `users` (modified_by), suporte a filtros e search.

**Backend**
- Migration:
  - `ADD COLUMN updated_by` em `company_users`.
  - Trigger `tg_company_users_set_updated_by` (BEFORE INSERT/UPDATE).
  - Função `is_last_master(p_company_id uuid, p_excluding_user_id uuid)` + trigger `BEFORE DELETE` que bloqueia se for o último master ativo.

## Mobile (pocket)
- Sem tabela. Lista de cards verticais com avatar grande, nome, email, chip da empresa (link), chip de status + role, "Onboarded · Modified by".
- Filtros em bottom-sheet (botão "Filters" no topo, com badge contador).
- Search bar sticky no topo.
- ✏️ abre full-screen modal com mesmo CRUD, respeitando safe-area.
- Sem overflow horizontal; toques generosos (44px+).

## Pronto para implementar?
Posso prosseguir com a migration + UI nesta ordem:
1. Migration (`updated_by` + triggers + `is_last_master`).
2. Refator do `AdminCompanies` em duas views.
3. Nova tab Users com filtros + modal CRUD.
4. Mobile.
