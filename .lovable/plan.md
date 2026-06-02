## Objetivo

Todo email enviado pelo app sai de **`contact@mundustrade.com`** via **Resend** (sua conta, seu domínio já verificado lá). Nenhuma menção a Lovable ou Supabase para o usuário final.

## O que você já tem
- Domínio `mundustrade.com` verificado no Resend (DNS já ok do seu lado).
- API key do Resend pronta.

Ou seja: **não precisa mexer em DNS, não precisa Lovable Emails, não precisa setup de domínio aqui.**

## O que falta fazer

### 1. Guardar a API key do Resend como secret
Vou pedir via formulário seguro o `RESEND_API_KEY`. Você cola o valor uma vez, fica disponível para as edge functions.

### 2. Substituir o envio dos emails de autenticação do Supabase
Hoje quem manda os emails de auth (confirmação, recuperação de senha, magic link, convite, troca de email) é o Supabase com template default `no-reply@auth.lovable.cloud` — é por isso que o Gustavo viu remetente Lovable.

Vou criar uma edge function **`auth-email-hook`** que:
- Recebe o evento de auth do Supabase (Send Email Hook).
- Renderiza um template Mundus (HTML brandado: logo, cor `#B64769`, copy em PT-BR, sem qualquer referência a Lovable/Supabase).
- Envia via API do Resend a partir de `Mundus <contact@mundustrade.com>`.

Templates cobertos (6):
- Confirmação de cadastro
- Recuperação de senha (o que o Gustavo precisa)
- Magic link
- Convite de usuário
- Mudança de email
- Reautenticação / OTP

### 3. Ativar o hook no Supabase Auth
Configurar o Auth para usar o webhook acima como `send_email_hook`, com secret de assinatura — assim o Supabase para de mandar o template default e passa a chamar nossa função. A partir desse momento **todos** os emails de auth saem do Resend com remetente `contact@mundustrade.com`.

### 4. Infra pra emails transacionais do app (opcional, recomendado)
Mesma edge function ou uma segunda (`send-app-email`) usando Resend, para futuras notificações do app (negociação fechada, contraproposta, aprovação de cadastro etc.). Deixo a base pronta; os disparos específicos a gente conecta conforme você for pedindo.

### 5. Limpeza
- Garantir que `Site URL` e `Redirect URLs` do Auth contenham só `https://app.mundustrade.us/...` (quando migrar para `.com`, só atualizar essa lista).
- Nenhuma copy do app/email menciona Lovable ou Supabase.

## O que eu preciso de você agora

Só uma confirmação para eu prosseguir:

1. Pode pedir o **`RESEND_API_KEY`** via formulário? (você cola e segue)
2. Confirma o remetente exato: **`Mundus <contact@mundustrade.com>`** — ou prefere outro display name?

Com essas duas respostas eu: salvo a secret, crio a edge function `auth-email-hook` com os 6 templates Mundus, ativo o hook no Supabase Auth, faço deploy e te aviso quando o próximo "Redefinir senha" chegar saindo de `contact@mundustrade.com` com a cara da Mundus.