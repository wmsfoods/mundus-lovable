## Mudanças em `src/pages/supplier/SupplierCreateOffer.tsx`

### 1) Validação ask ≥ floor

Regra: `ask` nunca pode ser menor que `floor`, e `floor` nunca pode ser maior que `ask`.

**Onde aplicar:**

a) **Add-row** (campos de novo corte):
- Ao digitar em `ask`: se já existe `floor` preenchido e `ask < floor`, marcar input com borda vermelha + helper text discreto abaixo ("Asking must be ≥ floor").
- Ao digitar em `floor`: mesma regra invertida ("Floor must be ≤ asking").
- Bloquear o botão `+` (`addCut`) enquanto houver inconsistência.

b) **Linhas já adicionadas** na tabela de cortes — hoje são read-only (`{Number(c.ask).toFixed(2)}`), então não há como digitar inválido. Sem mudança necessária aqui.

c) **Override de preços secundários** (`SecondaryPriceCell`): a regra vale por incoterm. Para cada secondary, comparar o `ask` (override ou calculado) com o `floor` (override ou calculado) do mesmo incoterm. Se inválido, borda vermelha no input que estiver sendo editado + tooltip explicando.

**Implementação:** função utilitária `validatePricePair(ask, floor)` que retorna `{ ok, msg }`. Usar nos dois pontos acima. Não bloquear digitação — só sinalizar visualmente e bloquear o submit (add cut).

### 2) Carrossel automático no Live Preview

Componente `PreviewImages` (já existe no arquivo, com scroll-snap + dots + setas).

**Adicionar:**
- `useEffect` que dispara `setInterval` a cada ~3.5s avançando para o próximo índice (volta ao 0 no final). Só roda quando `images.length > 1`.
- **Pausar** o auto-play quando o usuário interage: ao tocar/clicar em uma seta, dot, ou fazer swipe/scroll manual. Implementação: state `userPaused` que vira `true` no primeiro `onScroll` causado por interação ou em qualquer click dos controles. Retoma após X segundos de inatividade (resetTimeout) — ou fica pausado permanentemente (mais simples e previsível). **Vou ficar pausado permanentemente** depois que o usuário interagir, evitando "briga" entre user e timer.
- Respeitar `prefers-reduced-motion`: se ativo, não auto-avançar.
- Cleanup do interval no unmount.

Sem mudanças visuais — só comportamento.

## Arquivos tocados

- `src/pages/supplier/SupplierCreateOffer.tsx` (state da validação no add-row, helper `validatePricePair`, props/lógica no `SecondaryPriceCell`, auto-play no `PreviewImages`).

Nenhum CSS novo necessário — uso inline style com `borderColor` vermelho para o estado inválido, consistente com o padrão de inline styles já adotado no arquivo.
