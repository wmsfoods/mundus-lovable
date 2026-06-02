## Adicionar seção "How it works" na Home pública

Vou criar um novo componente animado e adicioná-lo no `PublicHome.tsx`, logo abaixo da seção de "Live offers".

### O que será feito

1. **Instalar dependência**
   - `framer-motion` (se ainda não estiver instalado — usado em outros pontos do projeto, vou confirmar)

2. **Criar `src/components/ui/feature-highlight.tsx`**
   - Componente baseado no exemplo enviado, em TypeScript + Tailwind
   - Animação de entrada com stagger (icon → title → cada linha → footer) usando `framer-motion`
   - Efeito ao passar o mouse em cada linha:
     - Leve translateX + mudança suave de cor para o vinho da Mundus (`#8B2E4F`)
     - Emoji com `scale` sutil
     - Linha inteira destacada quando hover, demais ficam com opacidade reduzida (efeito "spotlight"), padrão usado em sites tipo Linear / Vercel

3. **Usar o componente em `src/pages/public/PublicHome.tsx`**
   - Nova seção entre "Live offers" e o final do layout
   - Título: "How it works"
   - Conteúdo (linhas exatamente como pediu):
     ```
     ☕ Grab a coffee from the corner cafe.
     📱 Load up your Mundus app.
     🚢 Order new containers online.
     🏭 Have it produced and delivered.
     📢 Suppliers post new offers.
     🛒 Buyers create new demands.
     🔗 All from a single source of truth.
     🤝 Directly with each other.
     ```
   - Footer: `🥩⚡ Just look at Mundus for instant meat B2B deals.`
   - Paleta Mundus: fundo claro (`bg-white` ou `bg-[#FAF7F5]`), título em `#1A1A2E`, accent em `#8B2E4F`, footer em chip com fundo `#8B2E4F`/branco

4. **Responsivo (mobile-first, conforme regra do projeto)**
   - Texto centralizado, tipografia escalando (`text-xl sm:text-2xl md:text-3xl`)
   - Padding lateral confortável, respeitando safe-area
   - Hover desativado em touch (`@media (hover: hover)`), animação de entrada continua funcionando ao entrar no viewport (`whileInView`)

### Detalhes técnicos

- Animações puramente CSS/framer-motion, sem libs adicionais
- Sem mudanças em backend, rotas, ou lógica de negócio
- Apenas 1 arquivo novo (`feature-highlight.tsx`) e 1 edição (`PublicHome.tsx`)
- Sem alterar o componente em outras telas — fica disponível em `@/components/ui/feature-highlight` caso queira reutilizar depois

### Pergunta rápida antes de implementar

A seção deve aparecer **logo abaixo do hero** (antes da grid de ofertas, para servir de "pitch") ou **abaixo da grid de ofertas** (no final da página, como fechamento)?
