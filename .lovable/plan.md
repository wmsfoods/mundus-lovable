## Glow/Spotlight effect nos cards de Offers (Mundus tones)

### 1. Novo componente `src/components/ui/spotlight-card.tsx`
- Baseado no `GlowCard` enviado, mas adaptado:
  - Nova paleta `mundus` (wine/rose Mundus) → base hue ~335, spread ~25 (varia só dentro da família wine/pink, sem virar azul/verde).
  - Variantes extras: `mundus-soft` (rose claro) e `neutral` (cinza), todas suaves.
  - Glow muito sutil: `--bg-spot-opacity 0.06`, `--border-spot-opacity 0.35`, `--border-light-opacity 0.18`, `--size 180`.
  - **Não impõe layout/tamanho/fundo próprios** — o componente vira só um wrapper transparente que adiciona o spotlight + border-glow por cima do card existente (sem `aspect-ratio`, sem `grid-rows`, sem `p-4`, sem `shadow`, sem `backdrop-blur`, sem `rounded` forçado). O card filho mantém todo o estilo atual.
  - Pointer listener mantido (segue o mouse globalmente, igual ao original).

### 2. Aplicar em todos os cards de offer
Wrappar o conteúdo atual de cada card com `<GlowCard glowColor="mundus">` sem alterar layout interno, paddings, fontes ou tamanhos:

- `src/components/supplier/OfferCard.tsx` (supplier > My Offers, grid)
- `src/pages/buyer/Offers.tsx` (buyer > Offers, grid view inline)
- `src/components/public/PublicOfferCard.tsx` (public marketplace)
- `src/pages/admin/AdminOffers.tsx` → bloco `adm-cards-stack` (cards no mobile do admin; a tabela desktop continua igual, pois lá não há card)

### O que NÃO muda
- Nenhuma lógica, filtros, dados, navegação ou estilos atuais dos cards.
- List view e tabelas continuam intactas.
- Sem novos tokens globais no `index.css` / `tailwind.config.ts` — as cores Mundus ficam encapsuladas dentro do `spotlight-card.tsx`.
