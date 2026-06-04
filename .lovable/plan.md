# Rate Limiting — Fase 1 (Públicos + Reveal)

## Escopo

Adicionar rate-limiting ad-hoc apenas nos endpoints **públicos** e nos de **reveal pago** (Apollo). Sem mexer em negociação/criação de oferta nesta fase.

**Endpoints incluídos:**
- `prospect-enrich` — reveal de email/telefone (Apollo, custa $)
- `prospect-phone-webhook` — callback público do Apollo
- `public-lead-notify` — captura de lead público
- `shipping-instructions-validate` — validação de token público
- `shipping-instructions-submit` — submissão pública
- `shipping-instructions-send-link` — envio de link
- `verify-email` — verificação pública
- `send-password-reset` — reset de senha (alvo clássico de spam)

**Limites propostos (generosos, ajustáveis):**

| Endpoint | Chave | Janela | Limite |
|---|---|---|---|
| `prospect-enrich` (com reveal_phone) | user_id | 1 min | 10 |
| `prospect-enrich` (email only) | user_id | 1 min | 30 |
| `public-lead-notify` | IP | 1 min | 5 |
| `shipping-instructions-validate` | IP | 1 min | 20 |
| `shipping-instructions-submit` | IP | 5 min | 10 |
| `shipping-instructions-send-link` | IP | 1 min | 10 |
| `verify-email` | IP | 1 min | 10 |
| `send-password-reset` | IP+email | 5 min | 3 |
| `prospect-phone-webhook` | IP | 1 min | 60 (Apollo bursts) |

Admins (`has_role(uid, 'admin')`) são isentos.

## Arquitetura

### 1. Tabela `rate_limits`

```text
rate_limits
├─ key TEXT             ex: "prospect-enrich:user:<uuid>"
├─ bucket TIMESTAMPTZ   início da janela (truncado por minuto)
├─ count INT
├─ created_at TIMESTAMPTZ
└─ PK (key, bucket)
```

Índice em `bucket` para limpeza. Sem RLS — acessada só por `service_role` via função.

### 2. Função SQL `check_rate_limit`

```text
check_rate_limit(p_key TEXT, p_window_seconds INT, p_max INT)
  RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
  SECURITY DEFINER
```

Lógica:
- Trunca `now()` ao início da janela (`date_trunc` ou bucketing manual)
- `INSERT ... ON CONFLICT (key, bucket) DO UPDATE SET count = count + 1 RETURNING count`
- Se `count > p_max` → `allowed = false`
- **Fail-open**: se a função der erro (exception), libera a request e loga em `audit_log`

### 3. Helper compartilhado em edge functions

`supabase/functions/_shared/rateLimit.ts`:

```text
checkRateLimit(admin, { key, windowSeconds, max })
  → { allowed, remaining, resetAt, retryAfterSeconds }

rateLimitResponse(result)  // 429 padronizado com headers
```

Headers padronizados:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

Body 429:
```json
{ "error": "rate_limited", "message": "Too many requests. Try again in 45s.", "retry_after": 45 }
```

### 4. Integração nas Edge Functions

Em cada função listada, logo após CORS/auth, antes da lógica:

```text
const rl = await checkRateLimit(admin, {
  key: `prospect-enrich:user:${user.id}`,
  windowSeconds: 60,
  max: body.reveal_phone ? 10 : 30,
});
if (!rl.allowed) return rateLimitResponse(rl);
```

Para endpoints sem auth: chave = `endpoint:ip:<ip-from-cf-connecting-ip-or-x-forwarded-for>`.

Admin bypass: antes de checar, se autenticado e `has_role(uid, 'admin')` → skip.

### 5. Tratamento no Frontend

Wrapper genérico em `src/lib/`:
- Detecta status `429` em `fetch`/`supabase.functions.invoke`
- Lê `retry_after` do body
- Mostra `toast.error("Muitas tentativas. Tente novamente em Ns.")` traduzido
- Não tenta retry automático (evita loop)

Aplicar nos pontos de chamada das funções acima (basicamente: páginas admin de prospect, formulário público de shipping instructions, signup/login flows).

### 6. Limpeza automática

Cron diário (`pg_cron`) deletando `rate_limits` com `bucket < now() - interval '1 day'`.

## Plano de execução

1. **Migration**: tabela `rate_limits` + função `check_rate_limit` + grants + cron de limpeza
2. **Shared helper**: `_shared/rateLimit.ts` com `checkRateLimit` + `rateLimitResponse`
3. **Integração nos 8 endpoints** listados (mudança pequena: ~5 linhas por função)
4. **Frontend**: helper `handleRateLimit` + i18n (pt/en/es/fr/zh) + aplicar nos pontos de chamada
5. **Validação**: testar 1 endpoint com `curl_edge_functions` em loop para confirmar 429; confirmar admin bypass; confirmar fail-open derrubando a função SQL temporariamente

## Não-objetivos (ficam fora desta fase)

- Rate limit em `propose-counter`, `accept-counter`, `reject-counter` (fase 2)
- Rate limit em criação de oferta (precisaria de trigger no banco — fase 2)
- Rate limit em leitura de dados autenticados (RLS já protege)
- Captcha / WAF / Cloudflare Turnstile (camada externa, fora de escopo)

## Riscos residuais

- IP via `x-forwarded-for` pode ser falsificado em teoria, mas no edge runtime da Supabase o header vem do proxy (confiável o suficiente para prevenção)
- Usuários atrás de NAT corporativo compartilham IP nos endpoints públicos — limites foram dimensionados com folga para isso
- Em caso de pico legítimo (ex: campanha de email gera 50 leads em 30s), `public-lead-notify` pode estourar — se acontecer, subimos o limite
