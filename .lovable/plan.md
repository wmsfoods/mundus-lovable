## Reformatar a tela de Login para layout "card"

Mudar de painéis full-height (70/30) para um layout centralizado com:

- Fundo branco em toda a tela, com bastante respiro nas laterais e topo/base.
- **Esquerda**: carrossel como um **card quadrado com cantos arredondados** (~600x600px, `rounded-2xl overflow-hidden`), não mais cobrindo a tela inteira. Mantém fade entre slides + dots na base, dentro do card.
- **Direita**: formulário de login alinhado verticalmente ao centro do card, mais compacto. Logo Mundus **removida do topo do form** (já aparece no card do carrossel e no footer). Título "Log in" fica no topo do form.
- **Footer**: barra no rodapé com logo pequena Mundus + texto "© Copyright 2025 – All rights reserved." centralizado.
- Remover links "Terms and Condition / Privacy Policy" do bloco abaixo do form (vão pro footer? — manter como estão por enquanto, só ajustar espaçamento).

### Estrutura

```text
┌──────────────────────────────────────────────┐
│                                              │
│    ┌───────────┐      Log in                 │
│    │           │      E-mail   [______]      │
│    │  carousel │      Password [______]      │
│    │   (card)  │      [ ] Remember  [Sign in]│
│    │           │      Don't have? Sign up    │
│    │   • • •   │      Terms | Privacy        │
│    └───────────┘                             │
│                                              │
├──────────────────────────────────────────────┤
│        [M] Mundu  © Copyright 2025 …         │
└──────────────────────────────────────────────┘
```

### Arquivos afetados
- `src/pages/Login.tsx` — refazer wrapper para `flex items-center justify-center` com gap, carrossel vira card quadrado fixo (~560–620px), form fica ao lado com largura ~380px, adicionar footer fixo na base.
