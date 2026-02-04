# SGBU-008: Implementação Completa - Documentos do Membro + QR Code

## ✅ Funcionalidades Implementadas

### 1. Backend - API Routes

#### `/api/members/documents` (GET/POST)

- **GET**: Obter documentos do utilizador autenticado
- **POST**: Adicionar ou atualizar documento do utilizador
- Suporta tipos: ID_CARD, STUDENT_CARD, ENROLLMENT, STAFF_CARD
- Validação com Zod
- Upload através do sistema existente `/api/uploads`

#### `/api/members/documents/[id]` (PATCH/DELETE)

- **PATCH**: Verificar ou rejeitar documentos (apenas staff)
- **DELETE**: Remover documento (apenas staff)
- Controle de permissões por UserType

#### `/api/members/documents/pending` (GET)

- Listar documentos por status (pending/verified/all)
- Apenas acessível por staff/bibliotecários
- Inclui informações do utilizador

#### `/api/members/qrcode` (GET/POST/DELETE)

- **GET**: Obter QR Code existente + imagem gerada
- **POST**: Gerar novo QR Code (apenas utilizadores ativos)
- **DELETE**: Invalidar QR Code
- QR Code formato: `ISPTEC-SGBU-{userId}-{timestamp}-{random}`
- Imagem gerada como Data URL (300x300px)

### 2. Frontend - Componentes

#### `DocumentsManager` (`@/components/documents-manager.tsx`)

- Upload de documentos por tipo
- Visualização de status (Verificado/Pendente)
- Substituição de documentos existentes
- Integração com toast notifications
- Suporte para imagens e PDFs

#### `QRCodeDisplay` (`@/components/qrcode-display.tsx`)

- Exibição do QR Code da credencial
- Geração de novo QR Code
- Download do QR Code como PNG
- Skeleton loading state
- Alertas informativos

#### `DocumentsVerification` (`@/components/documents-verification.tsx`)

- Listagem de documentos com filtros (pending/verified/all)
- Tabela responsiva com informações do utilizador
- Verificar/Rejeitar documentos
- Dialog de confirmação
- Visualização de documentos em nova aba

### 3. Integração com Páginas

#### Página de Perfil (`/profile`)

- Nova tab "Documentos"
- Nova tab "QR Code"
- Query para buscar documentos do utilizador
- Refetch automático após upload

#### Página de Verificação (`/verify-documents`)

- Dashboard para staff verificar documentos
- Acessível por staff, bibliotecários, catalogadores e supervisores

## 🔧 Dependências Adicionadas

```json
{
  "qrcode": "^1.5.4",
  "@types/qrcode": "^1.5.5"
}
```

## 📋 Checklist de Implementação

- [x] Schema Prisma verificado (UserDocument + qrCode em User)
- [x] Rotas de API para upload de documentos
- [x] Rotas de API para verificação de documentos (staff)
- [x] Rotas de API para geração/obtenção de QR Code
- [x] Componente de upload de documentos
- [x] Componente de exibição de QR Code
- [x] Componente de verificação para staff
- [x] Integração com página de perfil
- [x] Página dedicada para staff
- [x] Validação de permissões
- [x] Tratamento de erros
- [x] Feedback visual (loading, success, error)
- [x] Responsividade mobile/desktop
- [x] Correção de erros TypeScript/ESLint

## 🎯 Critérios de Aceitação (SGBU-008)

✅ **Utilizador consegue anexar documentos e ver estado**

- Upload funcional através de DocumentsManager
- Estados visíveis: Pendente/Verificado
- Substituição de documentos permitida

✅ **Staff consegue verificar e marcar `isVerified`**

- Rota PATCH `/api/members/documents/[id]`
- Componente DocumentsVerification
- Controle de permissões implementado

✅ **QR Code é gerado para utilizador activo**

- Geração de QR Code único
- Verificação de status ACTIVE
- Exibição e download funcionais

## 🔐 Segurança

- Autenticação obrigatória em todas as rotas
- Verificação de tipo de utilizador para operações de staff
- Validação de input com Zod
- QR Code único e irrepetível (timestamp + random)
- Controle de acesso baseado em UserType

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:

- `src/app/api/members/documents/route.ts`
- `src/app/api/members/documents/[id]/route.ts`
- `src/app/api/members/documents/pending/route.ts`
- `src/app/api/members/qrcode/route.ts`
- `src/components/documents-manager.tsx`
- `src/components/qrcode-display.tsx`
- `src/components/documents-verification.tsx`
- `src/app/verify-documents/page.tsx`

### Modificados:

- `src/app/profile/page.tsx` (adicionadas tabs Documentos e QR Code)
- `package.json` (adicionada biblioteca qrcode)

## 🧪 Como Testar

### 1. Upload de Documentos

1. Fazer login como utilizador
2. Ir para `/profile?tab=documents`
3. Enviar documentos para cada tipo
4. Verificar status "Pendente"

### 2. Verificação de Documentos (Staff)

1. Fazer login como bibliotecário/staff
2. Ir para `/verify-documents`
3. Ver documentos pendentes
4. Verificar ou rejeitar documentos
5. Verificar mudança de status

### 3. QR Code

1. Fazer login como utilizador ativo
2. Ir para `/profile?tab=qrcode`
3. Gerar QR Code
4. Verificar exibição da imagem
5. Descarregar QR Code
6. Gerar novo QR Code (invalidar anterior)

## 📝 Notas de Implementação

- O upload de ficheiros utiliza o sistema existente `/api/uploads` que suporta Cloudinary ou fallback para Data URL
- QR Code é gerado no backend usando a biblioteca `qrcode`
- Todos os componentes usam shadcn/ui para consistência visual
- Notificações usam o sistema de toast existente
- Integração com React Query para cache e refetch

## 🚀 Próximos Passos

1. Testes E2E com Playwright
2. Adicionar notificações por email quando documentos são verificados
3. Implementar sistema de rejeição com motivo
4. Adicionar histórico de QR Codes gerados
5. Implementar leitor de QR Code para staff (check-in na biblioteca)

---

**Implementação completa da issue SGBU-008**
**Data:** 3 de Fevereiro de 2026
**Branch:** `issue/sgbu-008-member-docs-qr`
