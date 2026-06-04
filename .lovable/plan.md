## Like, Favorite e Share nos cards de Offers (buyer + admin)

### 1. Banco (1 migration)

Duas tabelas novas — escopo por **buyer company** (não por usuário):

- `offer_likes` — `id, offer_id, company_id, user_id, created_at` · UNIQUE (offer_id, company_id)
- `offer_favorites` — `id, offer_id, company_id, user_id, created_at` · UNIQUE (offer_id, company_id)
- `offer_shares` — `id, offer_id, company_id (null se anônimo), user_id (null), channel, created_at` (sem unique — conta cada share)

**RLS:**
- `INSERT/DELETE`: user autenticado de um buyer company só insere/remove a linha onde `company_id = active_company_id` do user.
- `SELECT`: todos autenticados podem ler (precisamos dos contadores em buyer + supplier + admin).
- Admin role pode ler tudo (já coberto pelo SELECT amplo).
- GRANTs padrão pra `authenticated` + `service_role` (sem anon).

Para contadores agregados na vitrine pública (não logado), criar uma RPC `get_offer_social_counts(offer_ids uuid[])` SECURITY DEFINER que retorna `(offer_id, likes, favorites, shares)` sem expor as linhas individuais.

### 2. Hook compartilhado `src/hooks/useOfferSocial.ts`

API:
```
const { likes, favorites, shares, isLiked, isFavorited,
        toggleLike, toggleFavorite, recordShare } = useOfferSocial(offerId)
```
- Resolve company_id via `useCurrentCompany`.
- Optimistic update no toggle.
- Refresh leve via single query batch quando a página carrega vários cards (usar a RPC para evitar N+1).

### 3. UI nos cards

Novo componente `src/components/offers/OfferSocialBar.tsx`:
- Linha compacta: ❤ + count · 🔖 + count · ↗ + count (lucide: `Heart`, `Bookmark`, `Share2`)
- Estilo discreto (cinza), ícone enche quando ativo (Mundus wine).
- Click no card NÃO dispara toggle (stopPropagation).
- Share: tenta `navigator.share` no mobile, senão copia link público da offer e mostra toast.

Inserir a barra no rodapé dos seguintes cards (mesma posição em todos):
- `src/pages/buyer/Offers.tsx` (card grid do buyer)
- `src/components/supplier/OfferCard.tsx` (supplier — **só leitura, sem toggle**, pra ele ver tração)
- `src/components/public/PublicOfferCard.tsx` (vitrine — só counts, sem toggle se não logado)
- `src/pages/admin/AdminOffers.tsx` (mobile cards stack) + nova **coluna "Social"** na tabela desktop com os 3 counters

### 4. Filtros (dentro do dropdown atual)

No `OffersFilterBar` (buyer + admin):
- Adicionar seção "Engagement" com 2 checkboxes:
  - Liked by my company
  - Favorited by my company
- No admin (que não é buyer), mostrar como:
  - Has likes (≥ 1)
  - Has favorites (≥ 1)
- Os filtros aplicam via where adicional na query de offers (subselect/exists nas novas tabelas).

### 5. O que NÃO muda
- Nada nos cards de supplier/admin além de adicionar a barra e (no admin) uma coluna.
- Nada na lógica de negociação, pricing, status, RLS de offers.
- Glow/spotlight atual permanece.
- Nenhum campo novo em `offers`.
