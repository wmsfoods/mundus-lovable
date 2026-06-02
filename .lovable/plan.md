## Diagnóstico

O problema do Gustavo não foi o mesmo cenário do Denys apenas parcialmente:

- O usuário de login do Gustavo existe em `auth.users` com e-mail `gustavo.agostinho.candido@gmail.com`.
- A solicitação dele está `approved`, com `company_id` da empresa Frigorinthians (`a93d960e-31fa-4c08-b15a-550a40adf587`), mas `created_user_id` ainda está vazio.
- Não existe linha correspondente em `public.users` nem em `company_users` para esse e-mail.
- O trigger atual existe, mas só roda `AFTER INSERT ON auth.users`. Como o Gustavo criou o auth user antes da aprovação, o trigger nunca rodou depois que a request virou `approved`.

Ou seja: o fluxo estrutural atual cobre “aprovação antes do primeiro signup”, mas falha em “signup primeiro, aprovação depois”. Esse é exatamente o caso que precisa ser corrigido para não depender de ação manual da Mundus.

## Plano de correção

### 1. Hotfix imediato para Gustavo

Vincular o usuário já existente `gustavo.agostinho.candido@gmail.com` à empresa Frigorinthians:

- Criar/atualizar `public.users` com:
  - `id` do auth user do Gustavo
  - `email`, `name`
  - `company_id` e `active_company_id` apontando para Frigorinthians
  - `user_type = 'Master'`, `is_owner = true`, `status = 'active'`
- Criar/atualizar `user_offices` para a empresa dele como principal.
- Atualizar `user_requests.created_user_id` com o id do auth user.
- Criar/atualizar também `company_users` para esse usuário, para manter consistência com permissões, diretórios e lógica de acesso por empresa.

### 2. Fix estrutural no banco

Adicionar uma função central, por exemplo `public.link_approved_user_request_by_email(email)`, que faça o vínculo completo de forma idempotente:

- Localiza `auth.users` pelo e-mail.
- Localiza `user_requests` aprovada, ainda sem `created_user_id`.
- Cria/atualiza `public.users`.
- Cria/atualiza `company_users`.
- Cria/atualiza `user_offices`.
- Marca `user_requests.created_user_id`.

Essa função deve funcionar tanto para:

- usuário que já existe e é aprovado depois;
- usuário aprovado primeiro e que cria login depois;
- login via Google;
- login via e-mail/senha.

### 3. Corrigir o trigger existente

Atualizar o trigger `AFTER INSERT ON auth.users` para chamar a função central acima.

Assim, se o usuário criar conta depois de já ter uma request aprovada, o vínculo acontece automaticamente.

### 4. Criar trigger também em `user_requests`

Adicionar trigger `AFTER UPDATE OF status, company_id ON public.user_requests`.

Quando uma request virar `approved`, ele chama a mesma função central.

Assim, se o usuário já tinha criado conta antes da aprovação, como Gustavo, o vínculo acontece no momento da aprovação.

### 5. Reforçar o RPC de login

Atualizar `claim_pending_invites()` para também tentar vincular `user_requests` aprovadas por e-mail, além de `company_users` pendentes.

Isso cria uma terceira camada de segurança: mesmo que algo passe despercebido no momento da aprovação, no próximo login o sistema corrige sozinho.

### 6. Ajustar AdminUserRequests

Trocar a lógica “best-effort” client-side atual por uma chamada ao RPC central após aprovar.

Hoje a página tenta fazer parte do provisionamento no frontend e engole erro como não fatal. Isso é frágil. O correto é o banco ser a fonte da verdade e a tela apenas aprovar a request.

### 7. Validação final

Depois de aplicar:

- Confirmar Gustavo vinculado à Frigorinthians.
- Confirmar `user_requests.created_user_id` preenchido.
- Confirmar `public.users`, `company_users` e `user_offices` consistentes.
- Conferir que o trigger em `auth.users` e o trigger em `user_requests` existem e estão ativos.

## Resultado esperado

Nenhum usuário aprovado deve cair numa tela sem empresa ou depender da Mundus fazer vínculo manual. O sistema passa a corrigir automaticamente nos três pontos críticos: criação da conta, aprovação da request e login.