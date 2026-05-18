## Criar usuário de teste para login

Criar uma conta no backend com:
- **Email:** felipe.bastos3357@gmail.com
- **Senha:** Mundus@2026
- **Email confirmado:** sim (para login imediato sem precisar de verificação)

### Passos

1. Inserir o usuário diretamente em `auth.users` via migration, com senha criptografada (bcrypt) e `email_confirmed_at` preenchido.
2. Criar o registro correspondente em `public.users` (name, email, company_id) vinculado a uma `company` — criar uma company "Mundus Test" se não existir, já que `company_id` é NOT NULL.
3. Confirmar via query que o usuário foi criado e pode autenticar.

Após isso você poderá entrar na tela `/login` usando essas credenciais.
