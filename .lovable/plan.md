## Switch Buyer/Supplier no Profile

Adicionar um seletor de perfil ativo na tela de Profile, visível apenas quando a empresa do usuário tem `is_buyer` e `is_supplier` simultaneamente.

### Comportamento
- Empresa só-buyer ou só-supplier: nada muda, switch não aparece.
- Empresa dual: seção "Perfil ativo" com dois botões segmentados (Buyer | Supplier). Ao trocar, salva a preferência e navega para `/buyer` ou `/supplier`, fazendo o shell correto (sidebar, topbar e bottom nav daquele perfil) montar.
- A preferência fica salva em `localStorage` e é respeitada pelo `RoleRedirect` quando o usuário entra em `/`.

### UI (mobile-first)
- Nova seção no `Profile.tsx` acima da seção de Language.
- Segmented control horizontal full-width, botões com 44px de altura, estado ativo na cor primária. Reaproveita o padrão visual já usado em `md-lang-row`.

### Arquivos
- **novo** `src/lib/activeRole.ts` — `getActiveRole()` / `setActiveRole()` em `localStorage` (chave `mundus.activeRole`).
- **editar** `src/components/RoleRedirect.tsx` — quando `is_buyer && is_supplier`, usar `getActiveRole()` para decidir o destino (fallback: buyer).
- **editar** `src/pages/Profile.tsx` — nova seção condicional + handler que chama `setActiveRole` e `navigate('/' + role, { replace: true })`.
- **editar** `src/index.css` — estilos do segmented control (se os tokens existentes não bastarem).
- **editar** `src/i18n/locales/{en,es,pt}.json` — chaves `profile.activeRole`, `profile.buyer`, `profile.supplier`.

### Fora do escopo
- Não altera `users.active_company_id` nem qualquer tabela; é preferência client-side. Persistência server-side pode ser evolução futura.
