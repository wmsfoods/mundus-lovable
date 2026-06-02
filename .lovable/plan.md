## Objetivo

Aplicar o efeito "shining" (brilho passando) no botão **Sign in** da tela de Login (`src/pages/Login.tsx`), reaproveitando as cores da marca Mundus já usadas no botão de Signup (gradiente `#B64769 → #8E3653`).

## Implementação

### 1. Criar componente reutilizável
Criar `src/components/ui/shining-button.tsx` adaptado do snippet, mas com paleta Mundus:

- Gradiente base: `from-[#B64769] via-[#A03D5C] to-[#8E3653]` (em vez de azul).
- Hover: leve aumento de brilho (`hover:brightness-110`).
- Faixa branca animada (efeito "shine"): mantida com `before:bg-white before:blur-[8px]`, deslizando no hover.
- Forma: `rounded-full`, com props `className`, `children`, e demais props nativas de `<button>` (`type`, `disabled`, `onClick`, etc.) para permitir reuso.
- Acessível: mantém `disabled:opacity-60 disabled:cursor-not-allowed`.

### 2. Substituir o botão Sign in
Em `src/pages/Login.tsx`, trocar o `<button type="submit">` atual pelo novo `<ShiningButton>`, preservando:

- `type="submit"`, `disabled={submitting}`
- Texto: `submitting ? t("auth.signingIn") : t("auth.signIn")`
- Tamanho atual: `h-11 w-32` e fonte `text-sm font-medium`

Nenhuma outra mudança visual/lógica na tela de Login.

### 3. Escopo
- Apenas o botão Sign in nesta etapa.
- Componente fica pronto para reuso (ex.: botão Signup do header/home, CTA público) em pedidos futuros — não vou aplicar em outros lugares agora.

## Detalhes técnicos

Arquivos:
- **Criar**: `src/components/ui/shining-button.tsx`
- **Editar**: `src/pages/Login.tsx` (apenas o `<button type="submit">` do formulário)

Sem novas dependências. Sem mudanças em design tokens / `index.css` (cores hardcoded já são o padrão atual do botão de login).
