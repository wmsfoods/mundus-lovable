## Problema

No screenshot (largura tipo iPad ~820px), a faixa de **pills do topo** ("FROM / TO COUNT / CONTA… / INCOT / CERTIFI / FREIGHT" + botão "Edit logistics") renderiza tudo numa linha só. Cada pill fica com ~110px de largura, e o label uppercase (`text-[10px] tracking-wider`) **transborda visualmente para fora** do pill — daí "TO COUNT", "CONTA…", "INCOT", "CERTIFI", "FREIGHT" aparecerem cortados/saindo da caixa.

Causa raiz (puramente CSS/layout, nenhuma regra de negócio envolvida):

- Componente `Pill` em `src/pages/supplier/SupplierCreateOfferV2Desktop.tsx` usa `flex-1 min-w-0`, então 6 pills + botão dividem a largura disponível igualmente.
- O `<span>` do label não tem `truncate`/`whitespace-nowrap` nem largura mínima — então o texto uppercase com `tracking-wider` (que é mais largo que o normal) escapa do container quando o pill é estreito demais.
- O valor (`<span className="truncate ...">`) já trunca corretamente, mas o label não.
- `SupplierCreateOfferV2.tsx` usa o desktop a partir de 768px (breakpoint do `useIsMobile`). Ou seja, iPad portrait (820px) cai no layout desktop e sofre o problema.

Nenhum outro card do screenshot (Products & pricing, Payment terms, Distribution) está com overflow real — apenas a faixa de pills do topo.

## Solução (somente front-end / Tailwind, nada de lógica)

**Arquivo único:** `src/pages/supplier/SupplierCreateOfferV2Desktop.tsx`

1. **Pill strip vira grid responsivo** (linhas 1252–1321):
   - Trocar `flex flex-wrap items-stretch gap-2` por um grid:  
     `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2`.
   - Em tablet (≤lg ≈1024px) → 3 colunas, cada pill ganha ~240px e o label cabe inteiro.
   - Em desktop largo → 6 colunas como hoje.
   - Em telas bem estreitas que ainda caem no desktop (768–639px) → 2 colunas.

2. **Botão "Edit logistics" ganha linha própria** quando o grid quebra:
   - Mover o `<Button Edit logistics>` para fora do grid, num bloco abaixo: `mt-2 flex justify-end`.
   - Em desktop largo continua visualmente alinhado à direita; em tablet aparece logo abaixo da grade de pills sem brigar por largura.

3. **Label do Pill protegido contra overflow** (componente `Pill`, linhas 134–182):
   - No `<span>` interno do label adicionar `min-w-0 truncate` (e manter `whitespace-nowrap` implícito por ser uma única linha de uppercase).
   - Garantir `min-w-0` no wrapper `flex flex-col` para o `truncate` funcionar.
   - Reduzir o `gap-3` interno para `gap-2` em telas estreitas (`gap-2 lg:gap-3`) para o ícone+texto caberem sem aperto.

4. **Não alterar:**
   - Nenhum hook, estado, lógica de negociação, ofertas, frete, status, validação, RLS, edge function, mobile (`SupplierCreateOfferV2Mobile.tsx`) ou demais componentes.
   - Apenas classes Tailwind nos arquivos listados acima.

## Verificação

Após implementar, validar visualmente no preview em três larguras: 768px (iPad portrait), 1024px (iPad landscape) e 1440px (desktop). Em todas, os 6 pills devem mostrar label completo ("FROM", "TO COUNTRIES", "CONTAINER", "INCOTERM", "CERTIFICATIONS", "FREIGHT") sem texto saindo da caixa, e o botão "Edit logistics" deve estar visível e acessível.
