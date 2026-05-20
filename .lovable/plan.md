## Adicionar opção "Admin" no switch do Profile

Hoje o switch no Profile mostra **Buyer | Supplier** apenas para empresas com `is_buyer && is_supplier`. Vou estender para incluir **Admin** quando o usuário logado tiver o papel `mundus_admin` (papel de sistema já existente em `public.roles`, vinculado via `public.company_users.role_id`).

### Comportamento

- Buscar uma vez se o usuário tem `mundus_admin` em qualquer `company_users` ativo (`deleted_at is null`).
- Montar o switch de forma dinâmica com as opções disponíveis:
  - Buyer — se `company.is_buyer`
  - Supplier — se `company.is_supplier`
  - Admin — se usuário tem `mundus_admin`
- Mostrar o switch sempre que houver **2 ou mais** opções (hoje só aparece quando dual buyer+supplier; vai passar a aparecer também para buyer-only+admin, supplier-only+admin, etc.).
- Trocar para Admin navega para `/admin` (e idem buyer→`/buyer`, supplier→`/supplier`).
- Preferência salva em `localStorage` (`mundus.activeRole`) — chave passa a aceitar `"admin"`.
- `RoleRedirect` ao entrar em `/` respeita o `activeRole` salvo, caindo em buyer→supplier→admin como fallback se o salvo não estiver mais disponível.

### Arquivos

- **editar** `src/lib/activeRole.ts` — tipo `ActiveRole = "buyer" | "supplier" | "admin"`.
- **novo** `src/hooks/useIsMundusAdmin.ts` — query simples em `company_users` + join `roles.name = 'mundus_admin'`, retorna `{ isAdmin, loading }`.
- **editar** `src/pages/Profile.tsx` — renderiza os botões a partir de uma lista dinâmica de roles disponíveis; layout do `.role-switch` continua um grid, agora com `grid-template-columns: repeat(N, 1fr)` baseado na quantidade.
- **editar** `src/components/RoleRedirect.tsx` — considera admin no roteamento inicial quando o usuário tem o papel e tem preferência salva como `"admin"`.
- **editar** `src/styles/mundus-shell.css` — ajuste do grid para N colunas.
- **editar** `src/i18n/locales/{pt,en,es}.json` — adicionar `profile.admin`.

### Fora do escopo

- Não vou implementar gating real do `/admin` (continua com o `TODO` atual no `AdminShell`). Apenas exponho a navegação para quem é admin no banco. Posso adicionar o gate em seguida se quiser.
- Sem mudanças de schema; uso a tabela `company_users` + `roles` que já existem.
