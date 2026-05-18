## Ajustes na tela de Login

### 1. Carrossel — usar imagens enviadas como estão

Copiar as 7 imagens enviadas para `src/assets/` e importá-las em `src/pages/Login.tsx`.

Mapeamento slide → imagem:

| Slide | Tema | Imagem |
|---|---|---|
| 1 | Global Reach / Premium Protein | `Screenshot_2026-05-17_at_23.58.51.png` |
| 2 | Global Protein Trading | `Screenshot_2026-05-17_at_23.58.19.png` |
| 3 | From Trusted Sources to Global Markets | `Screenshot_2026-05-17_at_23.58.59.png` |
| 4 | Quality products / Rigorous standards | `Screenshot_2026-05-17_at_23.58.43.png` |
| 5 | Premium proteins | `Screenshot_2026-05-17_at_23.58.38.png` |
| 6 | Local Presence / Global Connections | `Screenshot_2026-05-17_at_23.59.03.png` |
| 7 | Global reach / Trusted partner | `Screenshot_2026-05-17_at_23.58.29.png` |

Como cada imagem já traz logo, gradiente e texto embutidos, vou **remover** do código:
- O gradiente sobreposto
- O `<Logo variant="white">` no canto superior esquerdo
- O bloco de texto (`s.render()`) no canto inferior esquerdo

Mantém: fade 5s, auto-advance, dots de progresso embaixo, imagem em `bg-cover bg-center`.

Também simplifica o array `slides` — vira só uma lista de imagens, sem `render()`.

### 2. Logo Mundus Trade acima do "Log in"

No painel direito do `Login.tsx`, o `<Logo />` hoje só aparece em mobile. Vou:
- Tornar o logo (versão colorida) visível em **todos os tamanhos**, posicionado acima do título "Log in".
- Centralizar horizontalmente sobre o formulário (max-width 420px) com `mb-8`.

### Arquivos afetados
- `src/assets/login-carousel-{1..7}.png` (novos)
- `src/pages/Login.tsx` (slides simplificados, overlays removidos, logo sempre visível)
