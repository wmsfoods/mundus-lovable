
## Objetivo
Após o cadastro, o usuário não deve ver "código de verificação enviado". O cadastro fica **em análise** pelo admin. Quando aprovado, recebe um email de boas-vindas e faz login normalmente com o email/senha que criou.

## Mudanças

### 1. `src/pages/signup/SignupSuccess.tsx`
Reescrever o conteúdo da tela:
- **Título:** "Cadastro recebido!" / "Registration received!"
- **Mensagem:** "Seu cadastro está em análise pela equipe Mundus. Assim que for aprovado, você receberá um email de confirmação no endereço `f******@hotmail.com` e poderá acessar a plataforma com o email e senha que criou."
- **Remover** os botões "Resend code" e "Enter code".
- **Manter** apenas um botão "Voltar para login" → navega para `/login`.
- Manter o ícone de envelope + check (visual atual).
- Remover a função `resend()` e o import de `supabase` (não é mais usado aqui).

### 2. i18n — `src/i18n/locales/{en,pt,es,fr,zh}.json`
Atualizar as chaves em `signup.success.*`:
- `title` → "Cadastro recebido!" / "Registration received!" / etc.
- `body` → nova mensagem de análise (com `{{email}}` mascarado)
- Trocar/remover `resend` e `enterCode`; adicionar `backToLogin`
- `navTitle` pode permanecer

### 3. Email de boas-vindas (aprovação do admin)
**Não implementar agora** — o fluxo de aprovação do admin (`AdminUserRequests`) já existe. Quando for hora de disparar o email de boas-vindas, criaremos um template transacional ("welcome-approved") e chamaremos `send-transactional-email` no momento em que o admin aprovar o request. Fica registrado como próximo passo, fora do escopo desta correção.

## Fora de escopo
- Edge functions
- Lógica de aprovação do admin
- Qualquer mudança no fluxo de auth/Supabase
