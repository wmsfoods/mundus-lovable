## Diagnóstico

O usuário `fernandonascimento4@hotmail.com` cadastrou-se como **buyer** (empresa "77 Meats US") e foi marcado como **approved** no painel admin. Mas:

- Em `auth.users` ele existe e o email já está confirmado.
- Em `public.users` **não há linha** para ele.
- Em `companies` **não existe** a empresa "77 Meats US".

Por isso, ao logar, o `RoleRedirect` chama `useCurrentCompany`, não encontra `public.users` → estado "no company linked" → cai no fallback `/dashboard` → tela "Dashboard — Coming Soon".

**Causa raiz:** o fluxo de aprovação em `src/pages/admin/AdminUserRequests.tsx` (`handleApprove`) apenas marca o request como `approved` e tenta vincular um `user_offices` já existente. Ele **nunca cria** a `company` solicitada nem a linha em `public.users` (nem `company_users`). Resultado: todo buyer/supplier aprovado fica sem empresa e sem acesso ao módulo correto.

## Correções

### 1) Data fix imediato para o Fernando

Migration que:
- Cria empresa `77 Meats US` com `is_buyer = true`, país `United States`, marcando como `headquarters`.
- Insere linha em `public.users` para `adc8fac9-935d-4b88-81c8-653739981b70` (nome "Fernando Hotmail", email, `company_id` = nova empresa, `user_type = 'buyer'`, `is_owner = true`, `status = 'active'`).
- Insere `company_users` (user_id + company_id, role owner) e `user_offices` (is_primary = true) para o switcher de escritório.

Resultado: ao logar, `RoleRedirect` detecta `is_buyer` e manda para `/buyer`, com acesso a todas as Available Offers (ofertas com `status` ativo/new/negotiating), exatamente como qualquer outro buyer da plataforma.

### 2) Corrigir o fluxo de aprovação (para próximos buyers/suppliers)

Atualizar `handleApprove` em `src/pages/admin/AdminUserRequests.tsx`:

1. Atualiza `user_requests.status = 'approved'` (já existe).
2. Verifica se existe `auth.users` para o email (via `verify-email` edge function ou consulta indireta — usaremos `company_users.email` + fallback). Se sim, captura `user_id`.
3. Verifica se já existe `companies` com o mesmo `name` + `registration_country`. Se não, **cria** com:
   - `name`, `country` (= `registration_country`)
   - `is_buyer = (role === 'buyer')`, `is_supplier = (role === 'supplier')`
   - `office_type = 'headquarters'`
   - `proteins`, `phone`, endereço (vindo do request)
4. Se temos `user_id`, faz upsert em:
   - `public.users` (id = user_id, company_id, name, email, user_type = role, is_owner = true, status = 'active')
   - `company_users` (user_id, company_id, email, role 'owner')
   - `user_offices` (user_id, company_id, role 'owner', is_primary = true)
5. Se ainda não houver `user_id` (usuário aprovado antes de confirmar o email), guardamos só a `company`; ao primeiro login, um trigger ou hook precisa vincular — mas hoje **todo** signup já cria `auth.users` antes da aprovação, então esse caminho é raro; logamos warning.

Toda essa parte 2 é "best-effort" com try/catch para não quebrar a aprovação caso permissões/edge case falhe; mas no caso normal o usuário aprovado sai já com empresa criada e vinculada.

### 3) Verificação

- Recarregar a página com o Fernando logado → deve redirecionar para `/buyer` e mostrar a lista de Available Offers (não as `closed`, conforme já filtra `useOffers`).
- Aprovar um novo buyer de teste no admin → conferir que `companies` + `public.users` são criadas automaticamente.

## Detalhes técnicos

- Tabelas tocadas: `companies` (insert), `public.users` (insert/upsert), `company_users` (insert), `user_offices` (insert), `user_requests` (já era atualizada).
- Tipos de `user_type`: usamos `'buyer'` / `'supplier'` baseado em `user_requests.role`.
- Não mudamos `useCurrentCompany` nem `RoleRedirect` — eles já funcionam, só faltava o dado.
- Migration de data fix referencia o `auth.users.id` específico do Fernando; nenhuma outra linha é afetada.
