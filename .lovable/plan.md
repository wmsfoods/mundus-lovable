## Problema

O `CompanyProfilePage` unificado não tem onde subir/trocar o **logo da empresa**. A funcionalidade existia só no antigo `AdminCompanyDetail` e ficou de fora ao migrar para o layout unificado — então hoje admin (em `/admin/companies/:id`), buyer e supplier (em `/(buyer|supplier)/company`) não conseguem mais alterar o logo.

## Solução

Trazer o mesmo padrão do `AdminCompanyDetail.uploadLogo` para dentro do `CompanyProfilePage`, exibido no card de identidade da empresa (onde já mostramos nome + tax id), funcionando para todas as 3 visões.

### Comportamento

- Logo redondo (96px) no topo do card de identidade, com clique para abrir file picker.
- Placeholder com iniciais da empresa quando não houver `logo_url`.
- Botão "Trocar logo" / overlay com ícone de câmera no hover.
- Upload via `supabase.storage.from("avatars")` com processamento opcional por `@/lib/logoProcessor` (remove fundo, recorta para 400px quadrado, PNG).
- Valida: precisa ser imagem, máx 5MB.
- Após upload bem-sucedido: persiste `logo_url` em `companies` via `update().eq("id", companyId)` e atualiza estado local.
- Estado `uploadingLogo` desabilita o botão e mostra spinner.

### Permissões

- Admin Mundus (`isAdminView`): sempre pode trocar.
- Buyer/Supplier: pode trocar se for master da empresa (já é a regra existente em outros campos do `CompanyProfilePage` via RLS); botão sempre visível, e o backend retorna erro se sem permissão (toast trata).

### Arquivos

- `src/components/company/CompanyProfilePage.tsx`
  - Adiciona `logoInputRef`, `uploadingLogo`, função `uploadLogo` (cópia do padrão admin, usando `companyId` como folder).
  - Renderiza bloco de logo dentro de `.cprofile-namecard` (ou logo acima dele), substituindo só a parte visual atual.
- `src/styles/mundus-company.css` (ou CSS já existente do componente): pequenos ajustes para o avatar circular + overlay de hover.

### Fora de escopo

- Não mexer no fluxo "new company" do `AdminCompanyDetailLegacy` (ele já tem o upload próprio).
- Não alterar policies — assumimos que as RLS de `companies` e do bucket `avatars` já estão corretas (eram usadas pelo admin antes).

## Confirmação

Posso seguir nesse formato (logo circular no topo do card de identidade, clicável, com auto-process via `logoProcessor`)? Se quiser, posso também adicionar um botão "Remover logo" — me diga se sim.