# Remover URLs Lovable de todos os links públicos

## Problema

Ao clicar **PDF** em Shipping Instructions, abre nova aba com URL:
`https://170ae70f-...lovableproject.com/shipping-instructions/print/...`

A rota usa caminho relativo, então herda a origem atual (preview Lovable). Em produção (`app.mundustrade.com`) já funcionaria, mas o usuário quer garantir que **nunca** apareça `lovable` em nenhum link gerado/compartilhado pelo sistema.

## Solução

Criar helper único `getPublicAppUrl()` em `src/lib/publicUrl.ts`:

```ts
// Domínio público canônico do app. Nunca usar window.location.origin
// para links compartilhados, redirects de auth ou URLs de impressão,
// pois o preview rodando em *.lovableproject.com vazaria a marca.
export const PUBLIC_APP_URL = "https://app.mundustrade.com";

export function publicUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_APP_URL}${p}`;
}
```

## Pontos a corrigir

| Arquivo | Linha | Uso atual | Correção |
|---|---|---|---|
| `src/components/shipping/ShippingInstructionsCard.tsx` | 226, 440 | `window.open('/shipping-instructions/print/...')` (relativo → preview) | `window.open(publicUrl('/shipping-instructions/print/' + id))` |
| `src/components/shipping/ShippingInstructionsCard.tsx` | 78 | `${window.location.origin}/shipping-instructions/${token}` (link copiado para buyer) | `publicUrl('/shipping-instructions/' + token)` |
| `src/components/shipping/ShippingInstructionsCard.tsx` | 302 | `origin: window.location.origin` enviado para edge function | `origin: PUBLIC_APP_URL` |
| `src/pages/signup/Signup.tsx` | 137 | `emailRedirectTo: ${window.location.origin}/dashboard` | `publicUrl('/dashboard')` |
| `src/pages/signup/PartnerSignup.tsx` | 42 | idem | `publicUrl('/dashboard')` |
| `src/pages/supplier/OfferDetail.tsx` | 159 | `marketplace_link: ${window.location.origin}/buyer/marketplace` | `publicUrl('/buyer/marketplace')` |

## Verificação adicional

Após editar, rodar busca por `lovable` e `window.location.origin` em `src/` e `supabase/functions/` para garantir que nada que gere link compartilhável ainda dependa da origem do preview. Edge functions (`shipping-instructions-send-link`) já têm fallback `https://app.mundustrade.com` — manter, mas ignorar o `origin` recebido se contiver `lovable`.

## Não muda

- Navegação interna do app (router `<Link>`) continua relativa — não afeta a URL exibida no browser do usuário logado.
- Apenas URLs **abertas em nova aba**, **enviadas por email**, **copiadas** ou usadas em **redirect de auth** passam pelo helper.
