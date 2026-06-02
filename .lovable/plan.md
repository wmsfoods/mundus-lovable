## Objetivo

Hoje o componente `FlagSVG` (`src/components/icons.tsx`) renderiza bandeiras desenhadas à mão num viewBox 16×12, com várias delas visivelmente incorretas (ex.: AU sem Union Jack, KR sem trigramas, MA com pentagrama errado, EG sem águia, etc.). Vamos trocar a fonte por bandeiras reais do `flagcdn.com`, mantendo a mesma API do componente — nenhum call site precisa mudar.

## O que muda

1. **Reescrever `FlagSVG`** em `src/components/icons.tsx`:
   - Mesma assinatura: `<FlagSVG code={code} size={n} />`.
   - Renderiza `<img src="https://flagcdn.com/w{bucket}/{code-lower}.png" srcSet="...2x" />` com `width=size`, `height=round(size*12/16)`, `loading="lazy"`, `decoding="async"`, `alt=""`, `aria-hidden`.
   - `bucket` escolhido em degraus (20, 40, 80, 160, 320) conforme `size * dpr`, para nitidez sem baixar SVG inteiro.
   - Mantém o mesmo estilo visual: `borderRadius: 2`, `boxShadow: 0 0 0 0.5px rgba(0,0,0,0.18)`, `objectFit: cover`, `flexShrink: 0`, `display: inline-block`.
   - Fallback: se `code` faltar/ inválido, exibe um placeholder cinza (mesma caixa) — sem quebrar layout.
   - Remover o objeto `flagPalettes` e o tipo `FlagPalette` (não usados em mais lugar nenhum — confirmado no grep).
   - Manter o `USFlag` standalone como está (é usado fora do `FlagSVG`).

2. **Pré-conectar o CDN** em `index.html`:
   - Adicionar `<link rel="preconnect" href="https://flagcdn.com" crossorigin>` no `<head>` para reduzir latência da 1ª bandeira.

3. **Auditoria de call sites** (somente leitura, sem mudança de código):
   - `OfferDetailCards.tsx` (size 36) — bandeiras grandes no card de rota.
   - `OfferDetailLayout.tsx` (14), `OfferCard.tsx` supplier (12–13), `Offers.tsx` buyer (12–13), `PublicOfferCard.tsx` (12–13), `PublicOfferModal.tsx` (11–14), `OffersFilterBar.tsx` (14), `CompanyProfileSections.tsx` (14), `SupplierAuctions.tsx` (13).
   - Confirmar que todos passam `code` em ISO-2 (já passam — vêm de `countryToCode` / `country_code`).

4. **Sem mudar**:
   - `countryFlag()` (emoji) — continua existindo para e-mails e legendas em texto.
   - Lógica de negócio, filtros, queries, layouts.
   - Tokens de design / CSS.

## Detalhes técnicos

- URL do CDN: `https://flagcdn.com/w{20|40|80|160|320}/{cc}.png` + `2x` no `srcSet` (PNG é mais leve que o SVG completo e suficiente para tamanhos pequenos).
- Para `size ≤ 16` → bucket 40 (2x: 80). Para `size ≤ 24` → 80/160. Para `size ≤ 48` → 160/320. Acima disso → 320/320.
- `flagcdn.com` aceita códigos ISO-2 em minúsculo; vamos normalizar `code.toLowerCase()`.
- Aspect ratio 4:3 mantido por `width`/`height` explícitos — bandeiras do CDN são 4:3, igual ao viewBox atual (16/12).
- Sem dependências novas no `package.json`.

## Arquivos a editar

- `src/components/icons.tsx` — substituir `FlagSVG` e remover `flagPalettes`.
- `index.html` — adicionar `<link rel="preconnect">` para `flagcdn.com`.

## Validação

- Abrir `/supplier/offers/...`, `/buyer/offers`, `/supplier/auctions`, modal pública e perfil de empresa, conferindo visualmente AU, GB, KR, JP, MA, EG, BR, AR, US — todas devem aparecer com o desenho real.
- Verificar fallback (código inválido) e tamanhos extremos (12 e 36).
