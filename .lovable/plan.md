# Plano — Limpeza e ergonomia do CounterOfferModal

Arquivo único: `src/components/supplier/CounterOfferModal.tsx` (mesmo modal usado por supplier e buyer; lógica de cada lado é preservada via `perspective`).

## 1. Limpar a linha dos items (desktop e mobile)

Hoje cada linha mostra: input do preço final + toggle anchor (`− my asking` / `+ buyer bid`) + toggle `$/%` + input Δ. Isso polui.

**Mudança:** na linha, manter apenas:
- Checkbox de Accept
- Input editável do preço final (`YOUR COUNTER`)
- Mensagem de erro de validação (se houver)
- Coluna DIFF

Remover dos itens (desktop table e mobile card) os toggles de anchor, `$/%` e o input Δ. O ajuste fino por item passa a ser feito digitando direto o preço final na coluna `YOUR COUNTER`, que continua respeitando todas as validações de cada lado.

Estado `rowAnchor` / `rowMode` / `rowValue` e a função `updateRowDelta` deixam de ser necessários e serão removidos.

## 2. Reorganizar o bloco "Apply ... in all items"

Layout atual está embolado (Reference em uma linha, $/% + input + botão em outra, Accept all / Meet in middle em outra). Reorganizar em duas linhas claras:

```text
APPLY COUNTER IN ALL ITEMS
┌─────────────────────────────────────────────────────────────┐
│ Reference: [− my asking] [+ buyer bid]                       │
│                                                              │
│ Adjust by:  [$/kg|%]   [   0.10   ]   [ Apply to All ]      │
│                                                              │
│ Shortcuts:  [✅ Accept all]   [⇄ Meet in middle]            │
└─────────────────────────────────────────────────────────────┘
```

- Cada grupo com um micro-label (`Reference`, `Adjust by`, `Shortcuts`) à esquerda em `text-[11px] uppercase muted`.
- Espaçamento vertical consistente (`gap-3`) entre os três grupos.
- Mantém o `deductionFeedback` chip à direita do input quando `%` (buyer).

## 3. Atalhos toggleáveis (reverter ao desclicar)

Adicionar estado `activeShortcut: "accept_all" | "meet_middle" | null` e snapshot do estado anterior:

```ts
const [activeShortcut, setActiveShortcut] = useState<null|"accept_all"|"meet_middle">(null);
const [snapshot, setSnapshot] = useState<{counters: Record<string,number>; accepted: Record<string,boolean>} | null>(null);
```

Comportamento:

- **Accept all** (clique):
  - Se inativo: salva snapshot `{counters, accepted}`, aplica `accepted=true` em todos os `openItems`, vira `activeShortcut="accept_all"`, label muda para `↩ Unselect all`.
  - Se ativo: restaura snapshot, `activeShortcut=null`, label volta para `✅ Accept all`.

- **Meet in middle** (clique):
  - Se inativo: salva snapshot, aplica `(asking + their) / 2` em todos os items não aceitos (mesma fórmula atual), vira `activeShortcut="meet_middle"`, label muda para `↩ Undo meet in middle`.
  - Se ativo: restaura snapshot, `activeShortcut=null`.

- Apenas um shortcut ativo por vez. Aplicar um cancela/sobrescreve o outro (snapshot continua sendo o estado pré-shortcut anterior, não o pós).

- Qualquer interação manual depois disso (`Apply to All`, editar preço de uma linha, marcar/desmarcar checkbox) reseta `activeShortcut=null` e limpa o snapshot — pois o usuário deixou de estar em "modo shortcut".

Visual: quando ativo, o botão fica preenchido (`background: #8B2252; color: white`) em vez de outline, deixando claro que é um toggle.

## 4. Aplicar dos dois lados

A lógica por perspectiva (validação supplier não pode subir acima do counter anterior; buyer não pode cair abaixo do bid anterior, etc.) **não muda**. Só a UI muda — e os dois lados usam o mesmo modal, então a mudança vale para buyer e supplier automaticamente. `Meet in middle` continua usando `(asking + their)/2`, que faz sentido nas duas direções.

## Detalhes técnicos

- Remover do JSX da `<tbody>` desktop (linhas ~720–769) e do mobile cards o bloco de anchor/$%/Δ.
- Remover estados `rowAnchor`, `rowMode`, `rowValue`, função `updateRowDelta` e suas inicializações no `useEffect`.
- Atualizar `applyBulk` para também resetar `activeShortcut=null` e `snapshot=null` (é uma ação manual).
- `setAccepted` / `setCounters` chamados manualmente (não pelo shortcut) também resetam `activeShortcut`. Implementar via wrappers locais `handleManualCounterChange` / `handleManualAcceptToggle` para não vazar lógica de reset por todo o JSX.
- Sem mudanças em hooks, edge functions ou tipos.
