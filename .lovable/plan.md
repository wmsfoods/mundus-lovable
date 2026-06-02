## Contexto

- `RESEND_API_KEY` agora está configurada (confirmado em secrets).
- `mundustrade.com` está verificado no Resend, então `from: noreply@mundustrade.com` é válido.
- O código de `verify-email` e `send-email` já estavam corretos — só faltava o secret. **Nenhum bug de código a corrigir.**

## O que fazer

### 1. Validação manual (sem código)
- Você (ou eu via teste) faz um signup de teste em `/signup` com um email real.
- Conferimos:
  - Email chega na caixa de entrada
  - Aparece no dashboard do Resend (Logs)
  - Tabela `email_verifications` tem o registro com `verified=false` até o usuário digitar o código

### 2. Pequeno hardening no `verify-email` (opcional mas recomendado)
Atualmente, se o Resend retornar erro (ex: rate limit, domínio temporariamente inválido), o usuário **recebe `sent: true` mesmo assim** — não fica sabendo. Vou ajustar para:

- Se `RESEND_API_KEY` estiver setada e o envio falhar → retornar `sent: false` + mensagem clara
- Logar o `id` retornado pelo Resend (para correlacionar com o painel)
- Remover o fallback `_dev_code` quando estamos em produção com Resend ativo (atualmente nunca acontece, mas garante)

### 3. Limpar referência morta a `resend_mundus`
O `send-email/index.ts` lê `RESEND_API_KEY || resend_mundus`. Como `resend_mundus` não existe mais e estamos padronizando em `RESEND_API_KEY`, remover o fallback para evitar confusão futura.

## Arquivos afetados
- `supabase/functions/verify-email/index.ts` — melhor tratamento de erro do Resend
- `supabase/functions/send-email/index.ts` — remover fallback `resend_mundus`

## Fora de escopo
- Não vou mexer em templates, domínios, ou migrar para Lovable Emails.
- Não vou alterar nada relacionado a "wms foods" (já confirmado: aqui é só Mundus).
