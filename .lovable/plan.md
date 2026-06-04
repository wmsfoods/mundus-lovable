## Causa raiz

A edge function `send-team-invite` faz um `upsert` em `company_users` com `onConflict: 'company_id,email'`, mas **não existe esse índice/constraint único** na tabela. O único `UNIQUE` existente é `(company_id, user_id)` — e como o convidado ainda não tem `user_id`, o Postgres devolve erro do tipo "no unique or exclusion constraint matching the ON CONFLICT specification", a função estoura no `throw cuErr` e o cliente vê o famoso "edge function returned a non-2xx status code".

Por isso o admin Mundus consegue convidar normalmente (o caminho dele passa antes pelo `is_company_master` → tudo certo na autorização), mas qualquer master_buyer/master_supplier que tenta convidar **um e-mail novo** quebra ao gravar o registro.

A autorização em si está OK: `is_company_manager` chama `is_company_master`, que reconhece `master_buyer` / `master_supplier`. Confirmei que a Débora (master_buyer da Silva Foods) é elegível.

## Correção

1. **Migration** adicionando o índice único que o upsert exige:

   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS company_users_company_id_email_key
     ON public.company_users (company_id, email)
     WHERE email IS NOT NULL;
   ```

   - Mantém o `UNIQUE (company_id, user_id)` existente intacto.
   - `WHERE email IS NOT NULL` evita travar membros antigos sem e-mail preenchido.
   - Verifiquei que hoje não há duplicatas `(company_id, lower(email))` — a constraint sobe limpa.

2. **Sem mudança de código na edge function**: ela já normaliza `email.toLowerCase()` antes do upsert, então o índice em `(company_id, email)` resolve sozinho.

## Validação

Depois da migration:
- Testar via UI: Silva Foods → Users → Invite user → preencher e salvar (deve retornar `ok: true` e mostrar o convidado como "Invited").
- Reenviar convite para o mesmo e-mail deve fazer **update** (graças ao upsert) em vez de erro.
- Conferir log em `email_queue` para confirmar envio.
