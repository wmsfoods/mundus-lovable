## Objetivo
Adicionar fluxo padrão enterprise de "Esqueci minha senha" e "Redefinir senha" a partir da tela de Login, com boas práticas de segurança (resposta neutra, rate-limit visual, expiração, força de senha, audit log).

## Escopo

### 1. Login (`src/pages/Login.tsx`)
- Adicionar link **"Forgot password?"** abaixo do campo de senha, alinhado à direita (padrão enterprise).
- i18n: `auth.forgotPassword` em todos os locales já existentes (en/pt/es/zh).

### 2. Nova página: `/forgot-password` (`src/pages/auth/ForgotPassword.tsx`)
- Layout idêntico ao Login (mesmo `auth-screen`, carrossel desktop, logo mobile, footer).
- Campo: email + botão "Send reset link".
- Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/reset-password\` })`.
- **Resposta neutra (enterprise)**: sempre mostra "If an account exists for this email, you'll receive a reset link shortly." — nunca confirma se o email existe (anti-enumeration).
- Botão "Back to login".
- Cooldown de 60s no botão após envio (evita spam).
- Audit log: `auth.password_reset_requested`.

### 3. Nova página: `/reset-password` (`src/pages/auth/ResetPassword.tsx`)
- Rota **pública** (fora do `RequireAuth`).
- Detecta `type=recovery` no hash da URL (Supabase preenche sessão temporária automaticamente via `onAuthStateChange` event `PASSWORD_RECOVERY`).
- Se não houver sessão de recovery válida → mostra erro "Link expired or invalid" + link para `/forgot-password`.
- Form: Nova senha + Confirmar senha, com indicador de força reutilizando `checkPassword`/`allRulesMet` de `src/pages/signup/passwordRules.ts` e componente `PasswordRequirements` já existente.
- Toggle show/hide via `PasswordField` existente.
- Submit: `supabase.auth.updateUser({ password })` → toast sucesso → `supabase.auth.signOut()` (força login com nova senha, padrão enterprise) → redirect `/login`.
- Audit log: `auth.password_reset_completed`.

### 4. Roteamento (`src/App.tsx`)
- Registrar `/forgot-password` e `/reset-password` como rotas públicas, fora de qualquer guard.

### 5. Email de recovery
- Supabase Auth já envia email de recovery default. **Não** vou trocar para template custom nesta task (manter escopo). Se quiser branding via `auth-email-hook`, abro como follow-up.

### 6. i18n
Adicionar chaves em `src/i18n/locales/{en,pt,es,zh}.json`:
- `auth.forgotPassword`, `auth.forgotPasswordTitle`, `auth.forgotPasswordSubtitle`
- `auth.sendResetLink`, `auth.resetLinkSent`, `auth.backToLogin`
- `auth.resetPasswordTitle`, `auth.newPassword`, `auth.confirmPassword`
- `auth.passwordsDontMatch`, `auth.passwordUpdated`, `auth.invalidResetLink`

### 7. Mobile
Seguir core memory: full responsivo, safe-area, toques confortáveis, card vertical único.

## Não incluído
- Forgot **username**: o sistema usa email como identificador único (não há username separado), então "forgot username" não se aplica. Posso adicionar uma nota "Use o email cadastrado" se desejar.
- Template de email custom (branding via auth-email-hook) — fica como follow-up opcional.
- Habilitar HIBP (leaked password check) — recomendo ativar; confirmo se quer que eu inclua nesta entrega.

## Confirmar antes de implementar
1. OK manter o email default do Supabase nesta entrega, ou já quer template branded Mundus?
2. Ativar HIBP (bloqueia senhas vazadas) junto?
