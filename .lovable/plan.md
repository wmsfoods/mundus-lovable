## Bug

O botão **"🔄 Reset Product / Cuts"** abre o `window.confirm()` nativo do navegador (texto em inglês, visual fora do padrão Mundus). Precisa virar um modal profissional, traduzido nos 5 idiomas (en / pt / es / fr / zh), com a pergunta certa baseada na região atual.

## Comportamento desejado

Quando o supplier clica em **Reset Product / Cuts**:

- Abre um **AlertDialog** Mundus (shadcn `AlertDialog`, já disponível em `src/components/ui/alert-dialog.tsx`).
- Título: **Switch cut catalog?** (traduzido).
- Mensagem dinâmica conforme `cutRegion` atual:
  - Se `cutRegion === "us"` →
  "Do you want to switch to **🌐 Global Beef & Pork Cuts** instead of 🇺🇸 US Beef & Pork Cuts (IMPS)? All added cuts will be removed."
  - Se `cutRegion === "global"` →
  "Do you want to switch to **🇺🇸 US Beef & Pork Cuts (IMPS)** instead of 🌐 Global Beef & Pork Cuts? All added cuts will be removed."
- O nome do protein vem de `usToggleProteinLabel` (já existe no componente). Mantemos a placeholder `{{p}}` nas strings.
- Botões: **No** (cancela, fecha modal, nada muda) e **Yes** (estilo primário Mundus borgonha).

Ao clicar **Yes**:

1. `setCuts([])`, `setCutImgs({})`, `setAddRow(false)`, `setNf({ ...EMPTY_NF })` (limpa cortes).
2. `setCutRegion(cutRegion === "us" ? "global" : "us")` — já alterna a região para a oposta, conforme pedido ("já marca a opção").
3. Fecha o modal.

Ao clicar **No**: só fecha o modal, tudo permanece.

## Arquivos

- `src/pages/supplier/SupplierCreateOffer.tsx` — trocar `window.confirm` por `<AlertDialog>` controlado por `useState(false)`; substituir a chamada do botão por abrir o modal; renderizar o dialog no final do bloco.
- `src/i18n/locales/{en,pt,es,fr,zh}.json` — adicionar 4 chaves dentro de `supplier.createOffer.screen`:
  - `resetCutsTitle` → "Switch cut catalog?" / "Trocar catálogo de cortes?" / "¿Cambiar catálogo de cortes?" / "Changer le catalogue de découpes ?" / "切换切割目录？"
  - `resetCutsMsgToGlobal` → "Do you want to switch to 🌐 Global {{p}}Cuts instead of 🇺🇸 US {{p}}Cuts (IMPS)? All added cuts will be removed."
  - `resetCutsMsgToUs` → versão espelhada.
  - `resetCutsYes` / `resetCutsNo`.

## Escopo / não-escopo

- Mantém a lógica atual dos botões Global/US (continuam desabilitados quando há cortes — o modal cuida do switch via Reset).
- Não muda nada de backend.
- Admin on-behalf usa a mesma tela → herda.

Tudo certo para implementar? SIM