# 📚 SGBU

**ISPTEC | Biblioteca**
**Data:** Fevereiro 2026 | **Versão:** 1.0 | **Grupo 04**

---

## Índice
****
1. Visão Geral do Sistema
2. Schema de Dados Completo
3. Funcionalidades Implementadas
4. Componentes UI
5. API Endpoints
6. Lógica de Negócio Crítica
7. Integrações IA
8. Autenticação e Segurança
9. Configurações e Variáveis
10. Workflows e Processos
11. Estados e Transições
12. Testes Implementados
13. Seeds e Dados Iniciais
14. Melhorias e Decisões Técnicas

---

## 1. Visão Geral do Sistema

### 1.1 Stack Tecnológico

| Camada | Tecnologia | Versão / Detalhes |
|--------|-----------|-------------------|
| **Runtime** | Node.js | 20+ |
| **Linguagem** | TypeScript | 5+ |
| **Framework Full-Stack** | Next.js | 14+ (App Router) |
| **ORM** | Prisma | 5.x com PostgreSQL |
| **Banco de Dados** | PostgreSQL | 15+ |
| **Autenticação** | NextAuth.js | v4 (getServerSession) |
| **Validação** | Zod | Schema validation em todas as rotas |
| **UI Components** | shadcn/ui | Baseado em Radix UI |
| **Styling** | Tailwind CSS | 3+ |
| **Icons** | Lucide React | — |
| **State/Fetching** | React Query / fetch | Client-side data fetching |
| **IA — OCR** | Tesseract.js / Google Cloud Vision | Extração de texto de capas |
| **IA — LLM** | Google Gemini 2.0 Flash | Enriquecimento e classificação |
| **IA — Chatbot** | OpenAI GPT-4 | Assistente da biblioteca |
| **Storage** | Cloudinary | Upload de imagens/documentos |
| **QR Code** | `qrcode` (npm) | Geração server-side |
| **PDF** | jsPDF + jsPDF-AutoTable | Exportação de relatórios |
| **Email** | Resend (planejado) | Notificações |

### 1.2 Arquitectura de Pastas

```
3_Construcao/frontend/
├── prisma/
│   ├── schema.prisma            # Schema completo do BD
│   ├── migrations/              # Migrations Prisma
│   └── seed.ts                  # Script de seed/reset
├── scripts/
│   └── reset-database.sh        # Script de reset via CLI
├── src/
│   ├── app/
│   │   ├── (auth)/              # Grupo de rotas autenticadas
│   │   ├── (public)/            # Grupo de rotas públicas
│   │   ├── admin-dashboard/     # Dashboard administrativo
│   │   ├── admin/
│   │   │   ├── documents/       # Gestão de documentos (staff)
│   │   │   └── training/        # Gestão de formações (staff)
│   │   ├── api/                 # API Routes (Next.js)
│   │   │   ├── ai/invoke/       # Endpoint IA (Gemini)
│   │   │   ├── auth/            # Auth endpoints (NextAuth + /me)
│   │   │   ├── entities/        # CRUD genérico multi-entidade
│   │   │   │   ├── [entity]/
│   │   │   │   │   ├── route.ts       # GET list + POST create
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts   # GET one + PATCH + DELETE
│   │   │   ├── members/
│   │   │   │   ├── route.ts           # Lista membros
│   │   │   │   ├── by-email/          # Busca por email
│   │   │   │   ├── documents/         # Upload/listagem docs
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/route.ts  # Verificar/deletar
│   │   │   │   │   └── pending/       # Docs pendentes
│   │   │   │   └── [id]/route.ts      # Membro individual
│   │   │   ├── notifications/         # CRUD notificações
│   │   │   ├── recommendations/       # Recomendações IA
│   │   │   ├── reports/               # Relatórios
│   │   │   ├── settings/
│   │   │   │   ├── loan-policies/     # Config políticas empréstimo
│   │   │   │   ├── system-policies/   # Config sistema
│   │   │   │   └── public/            # Configs públicas (sem auth)
│   │   │   ├── training/sessions/     # CRUD formações
│   │   │   └── uploads/               # Upload ficheiros (Cloudinary)
│   │   ├── cataloging/          # Página de catalogação OCR
│   │   ├── chatbot/             # Página do assistente IA
│   │   ├── help/                # Página de ajuda
│   │   ├── manage-books/        # Gestão de livros (admin)
│   │   ├── manage-members/      # Gestão de membros (admin)
│   │   ├── my-loans/            # Meus empréstimos (user)
│   │   ├── my-reservations/     # Minhas reservas (user)
│   │   ├── onboarding/          # Fluxo de onboarding
│   │   ├── profile/             # Perfil do utilizador
│   │   ├── recommendations/     # Recomendações
│   │   ├── reports/             # Relatórios (admin)
│   │   ├── search-books/        # Pesquisa de livros
│   │   └── services/            # Serviços (cacifos, PCs, formação)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── app-shell.tsx        # Layout principal com nav
│   │   ├── AuthGuard.tsx        # Guarda de autenticação
│   │   ├── documents-manager.tsx # Upload/gestão docs
│   │   ├── notifications/
│   │   │   └── NotificationCenter.tsx
│   │   ├── training/
│   │   │   └── TrainingRequestCard.tsx
│   │   └── reservations/
│   │       └── ActiveReservationsCard.tsx
│   ├── lib/
│   │   ├── prisma.ts            # Prisma Client singleton
│   │   ├── auth.ts              # NextAuth config (authOptions)
│   │   ├── utils.ts             # Utilitários gerais (cn, etc.)
│   │   ├── sgbu-rules.ts        # Regras de negócio centralizadas
│   │   ├── settings-config.ts   # Leitura de SystemConfiguration
│   │   ├── settings-labels.ts   # Labels das configurações
│   │   ├── activity-logger.ts   # Logger de atividades
│   │   ├── activation-middleware.ts # Middleware ativação de conta
│   │   ├── notification-helpers.ts  # Helpers de notificação
│   │   ├── user-helpers.ts      # Helpers de utilizador
│   │   ├── recommendations.ts   # Serviço de recomendações
│   │   └── __tests__/
│   │       └── recommendations.test.ts
│   └── types/
│       └── next-auth.d.ts       # Extensão tipos NextAuth
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 1.3 Integrações Externas

| Serviço | Propósito | Credencial Env |
|---------|-----------|----------------|
| **Google OAuth** | Login @isptec.co.ao | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Cloudinary** | Storage de imagens/docs | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Google Gemini** | OCR + enriquecimento | `GOOGLE_AI_API_KEY` |
| **OpenAI GPT-4** | Chatbot | `OPENAI_API_KEY` |
| **Google Books API** | Enriquecimento ISBN | Pública (sem chave) |
| **PostgreSQL** | Banco de dados | `DATABASE_URL` |

---

## 2. Schema de Dados Completo

### 2.1 Enums

```mermaid
graph LR
    subgraph "Enums de Utilizador"
        UT[UserType] --> STUDENT & TEACHER & STAFF & LIBRARIAN & CATALOGER & SUPERVISOR
        US[UserStatus] --> ACTIVE_U[ACTIVE] & INACTIVE & BLOCKED & PENDING
        AAS[AccountActivationStatus] --> PD[PENDING_DOCUMENTS] & PT[PENDING_TRAINING] & TS[TRAINING_SCHEDULED] & ACTIVE_A[ACTIVE] & BLOCKED_A[BLOCKED]
    end

    subgraph "Enums de Livro"
        BS[BookStatus] --> AVAILABLE & BORROWED & RESERVED & MAINTENANCE_B[MAINTENANCE] & LOST & DAMAGED
        MT[MaterialType] --> BOOK & DAILY_LOAN & REFERENCE & CD_DVD & MAGAZINE & THESIS
        LP[LoanPolicy] --> STANDARD & DAILY & SHORT_TERM & NO_LOAN & EXTENDED
    end

    subgraph "Enums de Operações"
        LS[LoanStatus] --> ACTIVE_L[ACTIVE] & RETURNED & OVERDUE & CANCELLED_L[CANCELLED]
        RS[ReservationStatus] --> ACTIVE_R[ACTIVE] & AVAILABLE_R[AVAILABLE] & COLLECTED & EXPIRED & CANCELLED_R[CANCELLED]
        FS[FineStatus] --> PENDING_F[PENDING] & PAID & CANCELLED_F[CANCELLED] & WAIVED
        FT[FineType] --> LATE_RETURN & LOCKER_OVERTIME & LOST_CREDENTIAL & DAMAGED_BOOK & LOST_BOOK
    end

    subgraph "Enums de Notificação"
        NT[NotificationType] --> EMAIL & SMS & PUSH & IN_APP
        NS[NotificationStatus] --> PENDING_N[PENDING] & SENT & DELIVERED & FAILED & READ
    end

    subgraph "Enums de Infraestrutura"
        CS[CatalogStatus] --> DRAFT & PENDING_REVIEW & APPROVED & REJECTED
        LKS[LockerStatus] --> AVAILABLE_LK[AVAILABLE] & OCCUPIED & MAINTENANCE_LK[MAINTENANCE]
        CPS[ComputerStatus] --> AVAILABLE_CP[AVAILABLE] & OCCUPIED_CP[OCCUPIED] & MAINTENANCE_CP[MAINTENANCE]
        RQS[RequestStatus] --> PENDING_RQ[PENDING] & IN_PROGRESS & COMPLETED & CANCELLED_RQ[CANCELLED]
        SRS[ServiceReservationStatus] --> ACTIVE_SR[ACTIVE] & COMPLETED_SR[COMPLETED] & CANCELLED_SR[CANCELLED] & OVERTIME
        TRS[TrainingStatus] --> SCHEDULED & IN_PROGRESS_TR[IN_PROGRESS] & COMPLETED_TR[COMPLETED] & CANCELLED_TR[CANCELLED]
    end
```

### 2.2 Models e Relacionamentos

#### User

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `email` | String | `@unique` |
| `name` | String | — |
| `password` | String? | Nullable (OAuth users) |
| `type` | UserType | STUDENT, TEACHER, STAFF, LIBRARIAN, CATALOGER, SUPERVISOR |
| `status` | UserStatus | ACTIVE, INACTIVE, BLOCKED, PENDING |
| `activationStatus` | AccountActivationStatus | PENDING_DOCUMENTS, PENDING_TRAINING, TRAINING_SCHEDULED, ACTIVE, BLOCKED |
| `registrationNumber` | String? | Matrícula/nº colaborador |
| `department` | String? | Departamento |
| `phone` | String? | Telefone |
| `qrCode` | String? | Código QR gerado |
| `profileImageUrl` | String? | Foto de perfil |
| `lastLoginAt` | DateTime? | Último login |

**Relações:**
- `loans` → Loan[]
- `reservations` → Reservation[]
- `fines` → Fine[]
- `notifications` → Notification[]
- `catalogEntries` → CatalogEntry[] (como catalogador)
- `approvedEntries` → CatalogEntry[] (como supervisor)
- `classroomLoans` → ClassroomLoan[]
- `lockerRentals` → LockerRental[]
- `computerSessions` → ComputerSession[]
- `specialRequests` → SpecialRequest[]
- `userDocuments` → UserDocument[]
- `activityLogs` → ActivityLog[]
- `chatMessages` → ChatMessage[]
- `bookReviews` → BookReview[]
- `trainingParticipants` → TrainingParticipant[]

**Índices:** `@@index([email])`, `@@index([registrationNumber])`, `@@index([type, status])`

---

#### Book

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `title` | String | — |
| `subtitle` | String? | — |
| `isbn` | String? | `@unique` |
| `authors` | String | Autores (string, separados por vírgula) |
| `publisher` | String? | Editora (nome) |
| `publicationYear` | Int? | Ano de publicação |
| `edition` | String? | Edição |
| `language` | String? | Idioma |
| `pages` | Int? | Nº de páginas |
| `description` | String? | Sinopse |
| `coverUrl` | String? | URL da capa (Cloudinary) |
| `location` | String? | Localização na biblioteca |
| `totalCopies` | Int | `@default(1)` |
| `availableCopies` | Int | `@default(1)` |
| `materialType` | MaterialType | `@default(BOOK)` — SGBU-007 |
| `loanPolicy` | LoanPolicy | `@default(STANDARD)` — SGBU-007 |
| `keywords` | String[] | Array de palavras-chave |
| `deweyDecimal` | String? | Classificação Dewey |
| `categoryId` | String? | FK → Category |
| `publisherId` | String? | FK → Publisher (tabela) |
| `status` | BookStatus | `@default(AVAILABLE)` |

**Relações:** `copies` → Copy[], `category` → Category?, `reviews` → BookReview[], `reservations` → Reservation[], `recommendations` → BookRecommendation[]

---

#### Copy

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `bookId` | String | FK → Book |
| `barcode` | String? | `@unique` |
| `status` | BookStatus | `@default(AVAILABLE)` |
| `condition` | String? | Condição física |
| `location` | String? | Posição específica |

**Relações:** `book` → Book, `loans` → Loan[]

---

#### Loan

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `userId` | String | FK → User |
| `copyId` | String | FK → Copy |
| `loanDate` | DateTime | `@default(now())` |
| `dueDate` | DateTime | Calculado por `calculateDueDate()` |
| `returnDate` | DateTime? | Data real de devolução |
| `renewalCount` | Int | `@default(0)` |
| `maxRenewals` | Int | `@default(2)` |
| `status` | LoanStatus | ACTIVE, RETURNED, OVERDUE, CANCELLED |
| `fineAmount` | Decimal? | Valor da multa incorrida |

**Relações:** `member` → User, `copy` → Copy, `fines` → Fine[]

**Índices:** `@@index([userId])`, `@@index([status])`, `@@index([dueDate])`

---

#### Reservation

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `bookId` | String | FK → Book |
| `userId` | String | FK → User |
| `queuePosition` | Int | Posição na fila FIFO |
| `status` | ReservationStatus | ACTIVE, AVAILABLE, COLLECTED, EXPIRED, CANCELLED |
| `reservedAt` | DateTime | `@default(now())` |
| `availableDate` | DateTime? | Quando ficou disponível |
| `expiryDate` | DateTime? | 48h após disponibilização |

**Relações:** `book` → Book, `user` → User

**Índices:** `@@index([bookId])`, `@@index([userId])`, `@@index([status])`

---

#### Fine

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `userId` | String | FK → User |
| `loanId` | String? | FK → Loan |
| `type` | FineType | LATE_RETURN, LOCKER_OVERTIME, etc. |
| `amount` | Decimal | `@db.Decimal(10, 2)` |
| `status` | FineStatus | PENDING, PAID, CANCELLED, WAIVED |
| `reason` | String? | — |
| `generatedAt` | DateTime | `@default(now())` |
| `paidAt` | DateTime? | — |
| `paymentMethod` | String? | — |
| `paymentReference` | String? | — |
| `waivedAt` | DateTime? | — |
| `waivedBy` | String? | — |
| `waiverReason` | String? | — |

**Relações:** `user` → User, `loan` → Loan?

---

#### Notification

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `userId` | String | FK → User |
| `type` | NotificationType | EMAIL, SMS, PUSH, IN_APP |
| `title` | String | — |
| `message` | String | — |
| `status` | NotificationStatus | — |
| `metadata` | Json? | `{ actionUrl, actionType, entityId }` |
| `readAt` | DateTime? | — |

**Nota:** O campo `metadata` permite notificações contextuais com navegação inteligente (15+ tipos de acção: DOCUMENT_REVIEW, TRAINING_SCHEDULED, LOAN_DUE, etc.).

---

#### Category, Publisher, Author

Models auxiliares para dados bibliográficos:

| Model | Campos principais |
|-------|------------------|
| `Category` | id, name, description |
| `Publisher` | id, name |
| `Author` | id, name |

---

#### UserDocument

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `userId` | String | FK → User |
| `documentType` | String | "ID_CARD", "STUDENT_CARD", "ENROLLMENT", "STAFF_CARD" |
| `documentUrl` | String | URL no Cloudinary |
| `isVerified` | Boolean | `@default(false)` |
| `verifiedAt` | DateTime? | — |
| `verifiedBy` | String? | ID do staff que verificou |
| `rejectionReason` | String? | — |

---

#### TrainingSession

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `title` | String? | — |
| `date` | DateTime | Data/hora da sessão |
| `location` | String | Local |
| `capacity` | Int | Capacidade máxima |
| `description` | String? | — |
| `status` | TrainingStatus | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| `instructorId` | String? | — |

**Relações:** `participants` → TrainingParticipant[]

---

#### TrainingParticipant

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `userId` | String | FK → User |
| `sessionId` | String | FK → TrainingSession |
| `attended` | Boolean | `@default(false)` |
| `certificateUrl` | String? | — |

**Constraint:** `@@unique([userId, sessionId])`

---

#### CatalogEntry

| Campo | Tipo | Detalhes |
|-------|------|----------|
| `id` | String | `@id @default(cuid())` |
| `extractedTitle` | String? | De OCR |
| `extractedAuthor` | String? | — |
| `extractedISBN` | String? | — |
| `extractedPublisher` | String? | — |
| `extractedYear` | Int? | — |
| `imageUrl` | String? | Foto da capa |
| `enrichedData` | Json? | Dados de APIs externas |
| `status` | CatalogStatus | DRAFT → PENDING_REVIEW → APPROVED/REJECTED |
| `catalogerId` | String | FK → User (catalogador) |
| `supervisorId` | String? | FK → User (supervisor) |
| `reviewNotes` | String? | — |
| `rejectionReason` | String? | — |

---

#### Outros Models

| Model | Propósito |
|-------|-----------|
| `ClassroomLoan` | Empréstimo para sala de aula (Art. 14º) |
| `LockerRental` | Aluguer de cacifos (Art. 5º) |
| `ComputerSession` | Sessão de computador (Art. 17º) |
| `SpecialRequest` | Pedidos especiais (Art. 16º) |
| `ChatMessage` | Histórico do chatbot |
| `BookReview` | Avaliações de livros (`@@unique([bookId, userId])`) |
| `BookRecommendation` | Recomendações calculadas |
| `ActivityLog` | Auditoria de ações |
| `SystemConfiguration` | Config chave-valor (`@@unique([key])`) |
| `LoanPolicyConfig` | Config editável de políticas por UserType |
| `SystemPolicy` | Políticas gerais do sistema |
| `Report` | Relatórios gerados |
| `SystemMetrics` | Métricas diárias (`@@unique([date])`) |
| `Locker` | Cacifos físicos |
| `Computer` | Computadores do laboratório |
| `PasswordResetToken` | Tokens de reset de senha |

### 2.3 Migrations Executadas (ordem cronológica)

1. Migration inicial — Schema base completo
2. `20260203_add_material_type_and_loan_policy` — Enums MaterialType e LoanPolicy no Book (SGBU-007)
3. `20260203221247_training_system` — TrainingSession, TrainingParticipant, AccountActivationStatus, campo `activationStatus` no User

---

## 3. Funcionalidades Implementadas

### 3.1 Sistema de Empréstimos (SGBU-007)

**Arquivos:**
- [`src/app/api/entities/[entity]/route.ts`](3_Construcao/frontend/src/app/api/entities/[entity]/route.ts) — POST (criar empréstimo)
- [`src/app/api/entities/[entity]/[id]/route.ts`](3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts) — PATCH (devolver/renovar)
- `src/lib/sgbu-rules.ts` — Regras e constantes
- `src/lib/settings-config.ts` — Leitura de configs do BD
- `src/app/my-loans/page.tsx` — UI do utilizador

**Fluxo de criação:**

```mermaid
sequenceDiagram
    participant U as Utilizador/Funcionário
    participant API as POST /api/entities/Loan
    participant Rules as sgbu-rules.ts
    participant DB as PostgreSQL

    U->>API: { userId, copyId, bookId }
    API->>DB: Verificar status do utilizador (ACTIVE)
    API->>DB: Contar empréstimos activos do utilizador
    API->>Rules: LOAN_LIMITS[userType].maxBooks
    alt Limite atingido
        API-->>U: 400 "Limite de empréstimos atingido"
    end
    API->>DB: Verificar livro (materialType, loanPolicy)
    alt loanPolicy === NO_LOAN
        API-->>U: 400 "Material de referência, não empresta"
    end
    API->>DB: Verificar se já tem empréstimo activo do mesmo título
    alt Já tem
        API-->>U: 400 "1 obra por título"
    end
    API->>DB: Verificar cópia disponível
    API->>Rules: calculateDueDate(loanPolicy, userType)
    API->>DB: $transaction: criar Loan + atualizar Copy status
    API->>DB: logLoanCreated()
    API-->>U: 201 { loan }
```

**Validações Zod (no POST):** O corpo é validado com `z.object()` contendo `userId`, `copyId` e `bookId`.

**Regras implementadas em sgbu-rules.ts:**

```typescript
export const LOAN_LIMITS = {
  STUDENT:    { maxBooks: 2, loanDays: 5, maxRenewals: 2 },
  TEACHER:    { maxBooks: 4, loanDays: 15, maxRenewals: 2 },
  STAFF:      { maxBooks: 3, loanDays: 10, maxRenewals: 2 },
  LIBRARIAN:  { maxBooks: 4, loanDays: 15, maxRenewals: 2 },
  CATALOGER:  { maxBooks: 4, loanDays: 15, maxRenewals: 2 },
  SUPERVISOR: { maxBooks: 4, loanDays: 15, maxRenewals: 2 },
} as const;

export const LOAN_POLICY_DAYS = {
  STANDARD:   null,  // usa LOAN_LIMITS[userType].loanDays
  DAILY:      1,
  SHORT_TERM: 2,
  NO_LOAN:    0,
  EXTENDED:   30,
} as const;

export const MATERIAL_TYPE_DEFAULT_POLICY = {
  BOOK:       'STANDARD',
  DAILY_LOAN: 'DAILY',
  REFERENCE:  'NO_LOAN',
  CD_DVD:     'SHORT_TERM',
  MAGAZINE:   'DAILY',
  THESIS:     'EXTENDED',
} as const;

export function calculateDueDate(
  loanPolicy: LoanPolicy,
  userType: UserType,
  startDate?: Date
): Date { /* ... */ }

export function addBusinessDays(date: Date, days: number): Date { /* ... */ }
```

**Função `getLoanPolicyConfig()`** em settings-config.ts: Tenta ler de `LoanPolicyConfig` no BD; se tabela não existir (P2021/P2022), faz fallback para `LOAN_LIMITS`.

---

### 3.2 Sistema de Renovações (SGBU-001)

**Arquivo:** [`src/app/api/entities/[entity]/[id]/route.ts`](3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts) — PATCH com status `"renew"` ou flag de renovação.

**Validações antes de renovar:**

1. `renewalCount < maxRenewals` (máx. 2)
2. Não existem reservas activas (`ACTIVE`) para o mesmo `bookId`
3. Utilizador sem multas pendentes (verificação de `fines` com `status: PENDING`)
4. Empréstimo em status `ACTIVE`

**Cálculo:** Novo `dueDate` = `calculateDueDate()` a partir de `now()`.

**Activity Log:** `logLoanRenewed()` chamado via activity-logger.ts.

---

### 3.3 Sistema de Reservas FIFO (SGBU-006)

**Arquivo:** [`src/app/api/entities/[entity]/route.ts`](3_Construcao/frontend/src/app/api/entities/[entity]/route.ts) — POST para `Reservation`

**Fluxo:**

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Utilizador reserva livro
    ACTIVE --> AVAILABLE: Cópia devolvida + próximo na fila
    AVAILABLE --> COLLECTED: Levantamento em 48h
    AVAILABLE --> EXPIRED: 48h sem levantar
    ACTIVE --> CANCELLED: Cancelado pelo utilizador
    COLLECTED --> [*]
    EXPIRED --> [*]: Notifica próximo na fila
    CANCELLED --> [*]
```

**Regras implementadas:**
- **FIFO:** `queuePosition` calculado como `MAX(queuePosition) + 1` para o mesmo `bookId`
- **Sem duplicados:** Verifica se utilizador já tem reserva `ACTIVE` para o mesmo livro
- **Limite:** 1 reserva activa por utilizador por livro
- **Notificação:** Quando cópia fica disponível → notifica primeiro da fila com 48h de prazo
- **Expiração:** Se não levantar em 48h → `EXPIRED` → notifica próximo

**Activity Log:** `logReservationCreated()`.

---

### 3.4 Sistema de Devoluções

**Arquivo:** [`src/app/api/entities/[entity]/[id]/route.ts`](3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts) — PATCH no Loan com `status: "RETURNED"`

**Fluxo em transaction:**
1. Atualizar Loan: `status = RETURNED`, `returnDate = now()`
2. Atualizar Copy: `status = AVAILABLE`
3. Atualizar Book: `availableCopies += 1`
4. Calcular multa se `OVERDUE` → criar Fine com tipo `LATE_RETURN`
5. Verificar fila de reservas → `notifyNextInQueue(bookId)`
6. `logLoanReturned()`

---

### 3.5 Sistema de Multas

**Cálculo:**

```typescript
const FINE_PER_DAY = await getFineAmount("FINE_LATE_RETURN"); // default: 50 Kz
const daysOverdue = Math.floor(
  (Date.now() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)
);
const fineAmount = daysOverdue * FINE_PER_DAY;
```

**Tipos de multa (`FineType`):**

| Tipo | Gatilho |
|------|---------|
| `LATE_RETURN` | Devolução após `dueDate` |
| `LOCKER_OVERTIME` | Excesso de tempo no cacifo |
| `LOST_CREDENTIAL` | Perda de credencial |
| `DAMAGED_BOOK` | Livro danificado |
| `LOST_BOOK` | Livro perdido |

**Operações (PATCH `/api/entities/Fine/{id}`):**
- Pagamento: `status = PAID`, regista `paidAt`, `paymentMethod`, `paymentReference` → `logFinePaid()`
- Isenção: `status = WAIVED`, regista `waivedAt`, `waivedBy`, `waiverReason` → `logFineWaived()`

**Função `getFineAmount()`** em settings-config.ts: Lê de `SystemPolicy` no BD; fallback para `DEFAULT_SYSTEM_POLICIES`.

---

### 3.6 Sistema de Onboarding (SGBU-008 + PR #50)

**Fluxo completo:**

```mermaid
graph TD
    A[OAuth Login @isptec.co.ao] -->|Criar utilizador| B[PENDING + PENDING_DOCUMENTS]
    B -->|Upload docs| C[Admin aprova ≥1 doc]
    C --> D[PENDING_TRAINING]
    D -->|Inscrição em formação| E[TRAINING_SCHEDULED]
    E -->|Admin marca presença| F[ACTIVE]
    F --> G[Acesso total ao sistema]
```

**Arquivos envolvidos:**
- `src/app/onboarding/page.tsx` — Wizard de onboarding
- `src/components/documents-manager.tsx` — Upload de documentos
- `src/app/api/members/documents/route.ts` — GET/POST documentos
- [`src/app/api/members/documents/[id]/route.ts`](3_Construcao/frontend/src/app/api/members/documents/) — PATCH (verificar) / DELETE
- `src/app/api/members/documents/pending/route.ts` — Listar pendentes (staff)
- `src/app/api/training/sessions/route.ts` — CRUD sessões
- [`src/app/api/training/sessions/[id]/register/route.ts`](3_Construcao/frontend/src/app/api/training/sessions/) — POST/DELETE inscrição
- [`src/app/api/training/sessions/[id]/attendance/route.ts`](3_Construcao/frontend/src/app/api/training/sessions/) — PATCH presença
- `src/lib/activation-middleware.ts` — Guards de permissão

**Documentos requeridos por tipo de utilizador (em documents-manager.tsx):**

```typescript
const DOCUMENT_TYPES = {
  ID_CARD: "Cartão de Identidade",
  STUDENT_CARD: "Cartão de Estudante",
  ENROLLMENT: "Ficha de Matrícula",
  STAFF_CARD: "Cartão de Colaborador",
  TEACHER_CARD: "Cartão de Professor",
} as const;
```

Requer apenas **1 documento aprovado** para avançar para `PENDING_TRAINING`.

---

### 3.7 Sistema de Catalogação com OCR (SGBU-005)

**Arquivos:**
- `src/app/cataloging/page.tsx` — UI de catalogação
- `src/app/api/ai/invoke/route.ts` — Endpoint IA (Gemini 2.0 Flash)

**Fluxo:**
1. Funcionário fotografa capa/folha de rosto
2. Upload para Cloudinary
3. Envio para endpoint `/api/ai/invoke` com imagem
4. Gemini extrai: título, autores, ISBN, editora, ano
5. Se ISBN encontrado → consulta Google Books API para enriquecimento
6. Sugestão automática de categoria
7. Workflow: DRAFT → PENDING_REVIEW → APPROVED/REJECTED

**Regex de extração ISBN:**
```typescript
const isbnMatch = text.match(/ISBN[:\s-]*(\d{13}|\d{10})/i);
```

---

### 3.8 Sistema de Recomendações (SGBU-010)

**Arquivos:**
- `src/lib/recommendations.ts` — Serviço principal
- `src/app/api/recommendations/route.ts` — Endpoint REST
- `src/app/recommendations/page.tsx` — UI
- `src/lib/__tests__/recommendations.test.ts` — Testes

**Algoritmo híbrido com scoring:**

```typescript
// Critérios de scoring (conceptual)
Score = (categorySimilarity * 0.4)   // Categorias dos livros já lidos
      + (authorSimilarity * 0.3)     // Mesmos autores
      + (popularity * 0.2)           // Nº de empréstimos do livro
      + (availability * 0.1)         // Cópias disponíveis
```

**Endpoint:** `GET /api/recommendations?userId=X&limit=5&type=personal|similar&bookId=Y`

**Regras:**
- Mínimo 5 recomendações (conforme RF026)
- Exclusão de livros já lidos pelo utilizador
- Ordenação por `availableCopies` (preferir disponíveis)
- Cache opcional em `BookRecommendation`

---

### 3.9 Chatbot Inteligente

**Arquivo:** `src/app/chatbot/page.tsx`

**Integração:**
- OpenAI GPT-4 API
- System prompt configura o bot como assistente da Biblioteca do ISPTEC
- Histórico de mensagens guardado em `ChatMessage`
- Contexto: consulta de disponibilidade, empréstimos, renovações, reservas, regulamento

```typescript
const systemPrompt = `Você é um assistente da Biblioteca do ISPTEC. 
Ajude os utilizadores com: consulta de disponibilidade, 
informações sobre empréstimos, renovações, reservas e regulamento.
Seja sempre educado e responda em português de Angola.`;
```

---

### 3.10 Relatórios com Exportação (SGBU-009)

**Arquivos:**
- `src/app/api/reports/route.ts` — API de relatórios
- `src/app/reports/page.tsx` — UI com exportação

**Tipos de relatório (`ReportType`):**

| Tipo | Dados |
|------|-------|
| `loans` | Empréstimos com filtros de período, status, tipo de membro |
| `books` | Catálogo com categorias, disponibilidade |
| `members` | Membros por tipo, status, actividade |
| `fines` | Multas por tipo, status, período |
| `reservations` | Reservas por status |
| `lockers` | Utilização de cacifos |
| `computers` | Sessões de computador |
| `training` | Formações e participações |
| `statistics` | Métricas agregadas |

**Formatos de exportação:**
- **JSON** — resposta directa da API
- **CSV** — geração server-side
- **PDF** — geração client-side com jsPDF + jsPDF-AutoTable

**Query params:** `type`, `format`, `startDate`, `endDate`, `category`, `memberType`, `status`

**Otimizações Prisma:**
```typescript
// Select específico para evitar over-fetching
include: {
  copy: {
    include: {
      book: { include: { category: true } },
    },
  },
  member: {
    select: { id: true, full_name: true, email: true, type: true },
  },
}
```

---

### 3.11 Gestão de Livros (Formulário Completo)

**Arquivo:** `src/app/manage-books/page.tsx` — ~949 linhas

**18 campos implementados:**
title, subtitle, isbn, authors, publisher, publicationYear, edition, language, pages, description, coverUrl, location, totalCopies, availableCopies, materialType, loanPolicy, keywords, deweyDecimal, categoryId

**Schema Zod do backend (`bookPatchSchema`):**
```typescript
const bookPatchSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  isbn: z.string().optional(),
  authors: z.string().optional(),
  publisher: z.string().optional(),
  publication_year: z.string().optional(),
  edition: z.string().optional(),
  language: z.string().optional(),
  pages: z.string().optional(),
  total_copies: z.number().int().min(1).optional(),
  available_copies: z.number().int().min(0).optional(),
  material_type: z.enum(["BOOK","DAILY_LOAN","REFERENCE","CD_DVD","MAGAZINE","THESIS"]).optional(),
  loan_policy: z.enum(["STANDARD","DAILY","SHORT_TERM","NO_LOAN","EXTENDED"]).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  cover_url: z.string().url().optional(),
});
```

---

### 3.12 Activity Logs (SGBU-011)

**Arquivo:** `src/lib/activity-logger.ts`

**Funções disponíveis:**

| Função | Gatilho |
|--------|---------|
| `logLoanCreated()` | Novo empréstimo |
| `logLoanReturned()` | Devolução |
| `logLoanRenewed()` | Renovação |
| `logReservationCreated()` | Nova reserva |
| `logFinePaid()` | Pagamento de multa |
| `logFineWaived()` | Isenção de multa |

**Padrão soft-failure:** Logs nunca interrompem a operação principal (try-catch interno).

**Dados sanitizados:** Não regista dados sensíveis (passwords, tokens).

---

### 3.13 Serviços (Cacifos + Computadores)

**Página:** `src/app/services/page.tsx`

**Funcionalidades:**
- Reservar cacifo → `LockerRental` com `ServiceReservationStatus`
- Reservar computador → `ComputerSession`
- Countdown timer em tempo real
- Alertas de overtime
- Cards de formação integrados (via `TrainingRequestCard`)
- Cards de reservas activas (via `ActiveReservationsCard`)

---

## 4. Componentes UI

### 4.1 Layout Principal

**app-shell.tsx:**
- Sidebar com navegação condicional (USER vs ADMIN)
- Navbar com NotificationCenter
- Redirecionamento baseado em `activationStatus`
- Utilizadores PENDING acedem apenas: `/services`, `/notifications`, `/onboarding`

**Navegação USER:**

```typescript
const USER_NAV_ITEMS: NavItem[] = [
  { name: "Início",           href: "/",                icon: LayoutDashboard },
  { name: "Pesquisar Livros", href: "/search-books",    icon: Search },
  { name: "Meus Empréstimos", href: "/my-loans",        icon: BookMarked },
  { name: "Minhas Reservas",  href: "/my-reservations",  icon: Clock },
  { name: "Recomendações",    href: "/recommendations",  icon: Sparkles },
  { name: "Serviços",         href: "/services",         icon: Computer },
  { name: "Assistente",       href: "/chatbot",          icon: MessageCircle },
];
```

**Navegação ADMIN:**

```typescript
const ADMIN_NAV_ITEMS: NavItem[] = [
  { name: "Painel de Controlo", href: "/admin-dashboard", icon: BarChart3 },
  // + gestão de livros, membros, documentos, formações, relatórios, configurações
];
```

### 4.2 Lista de Componentes

| Componente | Caminho | Propósito |
|-----------|---------|-----------|
| `AppShell` | app-shell.tsx | Layout principal com sidebar + nav |
| `AuthGuard` | `components/AuthGuard.tsx` | HOC de protecção de rotas |
| `DocumentsManager` | documents-manager.tsx | Upload e gestão de documentos |
| `NotificationCenter` | `components/notifications/NotificationCenter.tsx` | Centro de notificações com contagem |
| `TrainingRequestCard` | `components/training/TrainingRequestCard.tsx` | Card de solicitar formação |
| `ActiveReservationsCard` | `components/reservations/ActiveReservationsCard.tsx` | Cacifos/PCs activos com timer |

### 4.3 shadcn/ui Components Instalados

- `Button`, `Input`, `Label`, `Textarea`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
- `Dialog`, `AlertDialog`
- `Table`, `TableHeader`, `TableRow`, `TableCell`
- `Badge`, `Avatar`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Select`, `Combobox`, `DatePicker`
- `Toast` (via `useToast`)
- `Alert`, `AlertDescription`
- `Skeleton` (loading states)
- `Loader2` (spinning icon)

### 4.4 Páginas e Rotas

| Rota | Arquivo | Público | Tipo |
|------|---------|---------|------|
| `/` | `app/page.tsx` | Auth | Dashboard home |
| `/search-books` | `app/search-books/` | Auth | Pesquisa de livros |
| `/my-loans` | `app/my-loans/` | Auth | Meus empréstimos |
| `/my-reservations` | `app/my-reservations/` | Auth | Minhas reservas |
| `/recommendations` | `app/recommendations/` | Auth | Recomendações IA |
| `/services` | `app/services/` | Auth+PENDING | Cacifos, PCs, formação |
| `/chatbot` | `app/chatbot/` | Auth | Assistente IA |
| `/profile` | `app/profile/` | Auth | Perfil + QR Code |
| `/onboarding` | `app/onboarding/` | Auth+PENDING | Fluxo de onboarding |
| `/help` | `app/help/` | Auth | Ajuda e regulamento |
| `/admin-dashboard` | `app/admin-dashboard/` | Admin | Dashboard admin |
| `/manage-books` | `app/manage-books/` | Admin | CRUD de livros |
| `/manage-members` | `app/manage-members/` | Admin | CRUD de membros |
| `/cataloging` | `app/cataloging/` | Admin | Catalogação OCR |
| `/admin/training` | `app/admin/training/` | Admin | Gestão de formações |
| `/admin/documents` | `app/admin/documents/` | Admin | Verificação de docs |
| `/reports` | `app/reports/` | Admin | Relatórios |

---

## 5. API Endpoints

### 5.1 CRUD Genérico Multi-Entidade

A API genérica [`/api/entities/[entity]`](3_Construcao/frontend/src/app/api/entities/[entity]/route.ts) suporta múltiplas entidades via parâmetro de rota.

#### `GET /api/entities/[entity]`

| Entity | Descrição | Filtros especiais |
|--------|-----------|-------------------|
| `Book` | Lista livros | include: category, copies, reviews |
| `Copy` | Lista cópias | — |
| `Loan` | Lista empréstimos | Self-service: só do próprio utilizador |
| `Reservation` | Lista reservas | Self-service |
| `Fine` | Lista multas | Self-service |
| `Notification` | Lista notificações | Self-service |
| `User` | Lista utilizadores | Admin only |
| `Category` | Lista categorias | — |
| `Locker` | Lista cacifos | — |
| `Computer` | Lista computadores | — |

**Status codes:** 200, 401 (não autenticado), 400 (entity inválida)

---

#### `POST /api/entities/[entity]`

**Loan:**

```typescript
// Request
POST /api/entities/Loan
{
  "userId": "cuid...",
  "copyId": "cuid...",
  "bookId": "cuid..."
}

// Response 201
{
  "id": "cuid...",
  "userId": "...",
  "copyId": "...",
  "loanDate": "2026-01-15T...",
  "dueDate": "2026-01-20T...",
  "status": "ACTIVE",
  "renewalCount": 0
}

// Errors
400 "COPY_NOT_AVAILABLE"
400 "LOAN_LIMIT_REACHED"
400 "NO_LOAN_REFERENCE"
400 "DUPLICATE_TITLE_LOAN"
401 "Não autenticado"
```

**Reservation:**

```typescript
// Request
POST /api/entities/Reservation
{
  "bookId": "cuid...",
  "userId": "cuid..."
}

// Response 201
{
  "id": "cuid...",
  "bookId": "...",
  "userId": "...",
  "queuePosition": 1,
  "status": "ACTIVE"
}

// Errors
400 "DUPLICATE_RESERVATION"
400 "BOOK_AVAILABLE" (se ainda tem cópias disponíveis)
```

---

#### `GET /api/entities/[entity]/[id]`

Retorna entidade por ID com includes relevantes.

#### `PATCH /api/entities/[entity]/[id]`

| Entity | Operações |
|--------|-----------|
| `Loan` | Renovar (`renewalCount++`, novo `dueDate`) ou Devolver (`RETURNED`) |
| `Reservation` | Cancelar (`CANCELLED`) ou Levantar (`COLLECTED`) |
| `Fine` | Pagar (`PAID`) ou Isentar (`WAIVED`) |
| `Book` | Atualizar campos (via `bookPatchSchema`) |
| `User` | Atualizar perfil, status, tipo |

---

### 5.2 Documentos de Membro

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/members/documents` | GET | User | Obter meus documentos |
| `/api/members/documents` | POST | User | Upload documento |
| `/api/members/documents/[id]` | PATCH | Staff | Verificar/rejeitar documento |
| `/api/members/documents/[id]` | DELETE | Staff | Remover documento |
| `/api/members/documents/pending` | GET | Staff | Listar docs pendentes |

**Schema de upload:**
```typescript
const uploadDocumentSchema = z.object({
  documentType: z.enum(["ID_CARD", "STUDENT_CARD", "ENROLLMENT", "STAFF_CARD"]),
  documentUrl: z.string().url(),
});
```

---

### 5.3 Formações

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/training/sessions` | POST | Admin | Criar sessão |
| `/api/training/sessions` | GET | Auth | Listar sessões |
| `/api/training/sessions/[id]/register` | POST | User | Inscrever-se |
| `/api/training/sessions/[id]/register` | DELETE | User | Cancelar inscrição |
| `/api/training/sessions/[id]/attendance` | PATCH | Admin | Marcar presença |
| `/api/training/sessions/[id]/attendance` | GET | Admin | Ver lista presença |

**Efeito colateral da presença:** Quando `attended = true`, se for o único passo restante, o `activationStatus` do utilizador passa para `ACTIVE`.

---

### 5.4 Notificações

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/notifications/unread-count` | GET | Auth+PENDING | Contagem de não lidas |
| `/api/notifications/[id]/mark-read` | PATCH | Auth+PENDING | Marcar como lida |
| `/api/notifications/mark-all-read` | POST | Auth+PENDING | Marcar todas como lidas |

---

### 5.5 Recomendações

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/recommendations` | GET | Auth | Recomendações personalizadas |

**Query params:** `userId`, `limit` (default 5, min 5), `type` (personal/similar), `bookId`

---

### 5.6 Relatórios

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/reports` | GET | Admin | Gerar relatório |

**Query params:** `type`, `format`, `startDate`, `endDate`, `category`, `memberType`, `status`

---

### 5.7 Configurações

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/settings/loan-policies` | GET/POST | Admin | CRUD políticas de empréstimo |
| `/api/settings/system-policies` | GET/POST | Admin | CRUD políticas do sistema |
| `/api/settings/public` | GET | Público | Configs públicas (sem auth) |

---

### 5.8 Uploads

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/uploads` | POST | Auth+PENDING | Upload para Cloudinary |

Retorna `{ url: string }` com URL do ficheiro no Cloudinary. Fallback para Data URL se Cloudinary não configurado.

---

### 5.9 IA

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/ai/invoke` | POST | Admin | OCR + enriquecimento com Gemini |
| `/api/auth/me` | GET | Auth | Dados da sessão actual |

---

## 6. Lógica de Negócio Crítica

### 6.1 Limites de Empréstimo (Artigo 10º)

```typescript
// Implementado em src/lib/sgbu-rules.ts
const LOAN_LIMITS = {
  STUDENT:    { maxBooks: 2,  loanDays: 5,  maxRenewals: 2 },
  TEACHER:    { maxBooks: 4,  loanDays: 15, maxRenewals: 2 },
  STAFF:      { maxBooks: 3,  loanDays: 10, maxRenewals: 2 },
  LIBRARIAN:  { maxBooks: 4,  loanDays: 15, maxRenewals: 2 },
  CATALOGER:  { maxBooks: 4,  loanDays: 15, maxRenewals: 2 },
  SUPERVISOR: { maxBooks: 4,  loanDays: 15, maxRenewals: 2 },
};
```

**Validações no momento do empréstimo:**

| # | Validação | Erro |
|---|-----------|------|
| 1 | Utilizador existe e está ACTIVE | 401/403 |
| 2 | `activeLoans.count < LOAN_LIMITS[userType].maxBooks` | "LOAN_LIMIT_REACHED" |
| 3 | `book.loanPolicy !== NO_LOAN` | "NO_LOAN_REFERENCE" |
| 4 | Não tem empréstimo activo do mesmo título | "DUPLICATE_TITLE_LOAN" |
| 5 | Cópia está AVAILABLE | "COPY_NOT_AVAILABLE" |

### 6.2 Cálculo de `dueDate`

```typescript
function calculateDueDate(loanPolicy: LoanPolicy, userType: UserType, startDate?: Date): Date {
  const start = startDate || new Date();
  const policyDays = LOAN_POLICY_DAYS[loanPolicy];
  
  if (policyDays !== null) {
    // Política específica do material
    if (loanPolicy === 'SHORT_TERM') {
      return addBusinessDays(start, policyDays); // CD/DVD: dias úteis
    }
    return addDays(start, policyDays);
  }
  
  // Política STANDARD: usa dias por tipo de utilizador
  const userDays = LOAN_LIMITS[userType].loanDays;
  return addDays(start, userDays);
}
```

### 6.3 Condições de Renovação (Artigo 15º)

| Condição | Verificação |
|----------|-------------|
| Limite de renovações | `loan.renewalCount < loan.maxRenewals` (máx 2) |
| Sem reservas pendentes | `Reservation.count({ bookId, status: ACTIVE }) === 0` |
| Sem multas pendentes | `Fine.count({ userId, status: PENDING }) === 0` |
| Empréstimo activo | `loan.status === ACTIVE` |

### 6.4 Permissões por Tipo de Utilizador

```mermaid
graph TD
    subgraph "STUDENT / TEACHER / STAFF"
        S1[Pesquisar livros]
        S2[Meus empréstimos]
        S3[Minhas reservas]
        S4[Recomendações]
        S5[Serviços]
        S6[Chatbot]
        S7[Perfil]
    end

    subgraph "LIBRARIAN"
        L1[+ Criar empréstimos]
        L2[+ Devolver livros]
        L3[+ Gerir reservas]
    end

    subgraph "CATALOGER"
        C1[+ Catalogação OCR]
        C2[+ Adicionar livros]
    end

    subgraph "SUPERVISOR"
        V1[+ Dashboard admin]
        V2[+ Gerir membros]
        V3[+ Relatórios]
        V4[+ Configurações]
        V5[+ Aprovar documentos]
        V6[+ Gerir formações]
        V7[+ Gerir multas]
    end
```

### 6.5 Middleware de Activação

**Arquivo:** activation-middleware.ts

```typescript
function canBorrowBooks(user: User): boolean {
  return user.status === 'ACTIVE' && user.activationStatus === 'ACTIVE';
}

function canMakeReservations(user: User): boolean {
  return user.status === 'ACTIVE' && user.activationStatus === 'ACTIVE';
}

function canUseLockers(user: User): boolean {
  return user.status === 'ACTIVE' && user.activationStatus === 'ACTIVE';
}

function canUseComputers(user: User): boolean {
  return user.status === 'ACTIVE' && user.activationStatus === 'ACTIVE';
}

function canRequestTraining(user: User): boolean {
  return user.activationStatus === 'PENDING_TRAINING';
}

function getActivationStatusMessage(status: AccountActivationStatus): string { /* ... */ }
function getAvailableActions(status: AccountActivationStatus): string[] { /* ... */ }
```

---

## 7. Integrações IA

### 7.1 OCR (Catalogação)

| Aspecto | Detalhe |
|---------|---------|
| **Modelo** | Google Gemini 2.0 Flash |
| **Endpoint** | `POST /api/ai/invoke` |
| **Input** | URL da imagem (Cloudinary) |
| **Output** | JSON com título, autores, ISBN, editora, ano |
| **Fallback** | Tesseract.js (offline, menor precisão) |
| **Enriquecimento** | Google Books API via ISBN |

### 7.2 Chatbot

| Aspecto | Detalhe |
|---------|---------|
| **Modelo** | OpenAI GPT-4 |
| **System Prompt** | Assistente da Biblioteca ISPTEC, português de Angola |
| **Histórico** | Guardado em `ChatMessage` por `sessionId` |
| **Capacidades** | Consulta disponibilidade, empréstimos, regulamento |

### 7.3 Recomendações

| Aspecto | Detalhe |
|---------|---------|
| **Tipo** | Filtragem colaborativa + baseada em conteúdo |
| **Scoring** | Categoria (40%) + Autor (30%) + Popularidade (20%) + Disponibilidade (10%) |
| **Exclusão** | Livros já lidos |
| **Mínimo** | 5 recomendações |
| **Cache** | Opcional em `BookRecommendation` |

---

## 8. Autenticação e Segurança

### 8.1 NextAuth.js v4

**Arquivo:** `src/lib/auth.ts` — Exporta `authOptions`

**Providers:**
1. **Google OAuth** — domínio restrito a `@isptec.co.ao`
2. **Credentials** — email + password (bcrypt) para admin/test

**JWT Token — campos customizados:**
```typescript
// Em src/types/next-auth.d.ts
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    type: UserType;
    status: UserStatus;
    activationStatus: AccountActivationStatus;
  }
}
```

**Callbacks:**
- `signIn`: Cria utilizador se não existe (Google OAuth) com `status: PENDING`, `activationStatus: PENDING_DOCUMENTS`
- `jwt`: Adiciona `id`, `type`, `status`, `activationStatus` ao token
- `session`: Propaga campos do token para a sessão

### 8.2 Protecção de Rotas

**API Routes:** Todas usam `getServerSession(authOptions)` no início:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
```

**Admin routes:** Verificação adicional de `UserType`:
```typescript
if (user.type !== UserType.SUPERVISOR && user.type !== UserType.LIBRARIAN) {
  return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
}
```

**Utilizadores PENDING:** Endpoints que permitem PENDING:
- `/api/uploads`
- `/api/notifications/[id]/mark-read`
- `/api/notifications/mark-all-read`
- `/api/members/documents`
- `/api/members/documents/[id]`

### 8.3 Middleware de Segurança

**Filosofia:** De "apenas ACTIVE" para "**não INACTIVE**" — permite interacção durante onboarding.

**Dados sensíveis:**
- Passwords nunca em logs
- Tokens não expostos nas respostas
- Activity logs sanitizados

---

## 9. Configurações e Variáveis

### 9.1 Variáveis de Ambiente (`.env`)

```bash
# Base de Dados
DATABASE_URL="postgresql://user:pass@localhost:5432/sgbu_isptec"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# IA
GOOGLE_AI_API_KEY="..."    # Gemini
OPENAI_API_KEY="..."       # Chatbot

# Opcional
LOG_LEVEL="info"
```

### 9.2 SystemConfiguration (BD)

Tabela `SystemConfiguration` com pares chave-valor:

| Chave | Default | Descrição |
|-------|---------|-----------|
| `MAX_LOAN_DAYS_STUDENT` | "5" | Dias de empréstimo para estudantes |
| `MAX_LOAN_DAYS_TEACHER` | "15" | Dias de empréstimo para docentes |
| `MAX_LOANS_STUDENT` | "2" | Max empréstimos simultâneos (estudante) |
| `MAX_LOANS_TEACHER` | "4" | Max empréstimos simultâneos (docente) |
| `FINE_PER_DAY` | "50" | Multa por dia de atraso (Kz) |

### 9.3 SystemPolicy (BD)

Tabela `SystemPolicy` para configurações editáveis pelo admin:

| Chave | Descrição |
|-------|-----------|
| `FINE_LATE_RETURN` | Valor multa atraso |
| `FINE_LOCKER_OVERTIME` | Multa excesso cacifo |
| `FINE_LOST_CREDENTIAL` | Multa perda credencial |
| `FINE_DAMAGED_BOOK` | Multa livro danificado |
| `FINE_LOST_BOOK` | Multa livro perdido |
| `SYSTEM_RESERVATION_COLLECTION_HOURS` | Prazo levantamento (48h) |
| `SYSTEM_LOCKER_DURATION_HOURS` | Duração cacifo |

**Labels:** Definidos em settings-labels.ts

### 9.4 LoanPolicyConfig (BD)

Tabela editável com políticas por `UserType`:

```typescript
// Campos: userType, loanDays, maxBooks, maxRenewals
// Se tabela não existir: fallback para LOAN_LIMITS constante
```

---

## 10. Workflows e Processos

### 10.1 Fluxo de Cadastro

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant Auth as Google OAuth
    participant API as NextAuth Callback
    participant DB as Database

    U->>Auth: Login @isptec.co.ao
    Auth->>API: Token OAuth
    API->>DB: User exists?
    alt Novo utilizador
        API->>DB: CREATE User(status:PENDING, activation:PENDING_DOCUMENTS)
        API->>DB: CREATE Notification("Complete o seu registo")
        API-->>U: Redirect → /onboarding
    else Existe
        API-->>U: Redirect → /
    end
```

### 10.2 Fluxo de Empréstimo

```mermaid
sequenceDiagram
    participant F as Funcionário
    participant API as POST /api/entities/Loan
    participant DB as PostgreSQL

    F->>API: { userId, copyId, bookId }
    API->>DB: Validar utilizador (status ACTIVE)
    API->>DB: Contar empréstimos activos
    API->>DB: Verificar limites por UserType
    API->>DB: Verificar loanPolicy ≠ NO_LOAN
    API->>DB: Verificar 1 obra por título
    API->>DB: Verificar cópia AVAILABLE
    API->>DB: $transaction:
    Note over DB: 1. Criar Loan<br>2. Copy.status = BORROWED<br>3. Book.availableCopies -= 1<br>4. ActivityLog
    DB-->>API: Loan criado
    API-->>F: 201 { loan }
```

### 10.3 Fluxo de Renovação

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant API as PATCH /api/entities/Loan/{id}
    participant DB as PostgreSQL

    U->>API: { action: "renew" }
    API->>DB: Carregar loan + copy + book
    API->>DB: renewalCount < maxRenewals?
    API->>DB: Reservas activas para bookId?
    API->>DB: Multas pendentes do userId?
    alt Pode renovar
        API->>DB: renewalCount++, novo dueDate
        API->>DB: ActivityLog
        API-->>U: 200 { updatedLoan }
    else Não pode
        API-->>U: 400 { reason }
    end
```

### 10.4 Fluxo de Reserva + Fila FIFO

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant API as API
    participant DB as PostgreSQL

    U->>API: POST /api/entities/Reservation
    API->>DB: Verificar se já não tem reserva activa
    API->>DB: Calcular queuePosition (MAX + 1)
    API->>DB: Criar Reservation(status: ACTIVE)
    
    Note over DB: Quando cópia é devolvida...
    
    API->>DB: Buscar próximo na fila (ORDER BY queuePosition ASC)
    API->>DB: Reservation.status = AVAILABLE
    API->>DB: availableDate = now(), expiryDate = now() + 48h
    API->>DB: Criar Notification("Livro disponível, 48h para levantar")
    
    alt Levanta em 48h
        API->>DB: Reservation.status = COLLECTED
        API->>DB: Criar Loan
    else Não levanta
        API->>DB: Reservation.status = EXPIRED
        Note over DB: Repetir para próximo na fila
    end
```

### 10.5 Sistema de Notificações

**Triggers de notificação:**

| Evento | Tipo | Mensagem |
|--------|------|----------|
| Documento aprovado | IN_APP | "Documento aprovado, inscreva-se numa formação" |
| Documento rejeitado | IN_APP | "Documento rejeitado: {motivo}" |
| Formação agendada | IN_APP | "Inscrição confirmada em {data}" |
| Conta activada | IN_APP | "Conta activada! Acesso completo" |
| Reserva disponível | IN_APP + EMAIL | "Livro disponível, 48h para levantar" |
| Empréstimo próximo do prazo | IN_APP | "Empréstimo vence em {dias} dias" |
| Empréstimo atrasado | IN_APP | "Empréstimo atrasado! Devolva já" |
| Multa gerada | IN_APP | "Multa de {valor} Kz gerada" |
| Renovação realizada | IN_APP | "Empréstimo renovado até {data}" |

**Metadata para navegação contextual:**
```typescript
{
  actionUrl: "/my-loans",
  actionType: "LOAN_DUE",
  entityId: "loan-cuid..."
}
```

**Arquivo de helpers:** notification-helpers.ts (~381 linhas)

---

## 11. Estados e Transições

### 11.1 User Status

```mermaid
stateDiagram-v2
    [*] --> PENDING: OAuth signup
    PENDING --> ACTIVE: Onboarding completo
    ACTIVE --> BLOCKED: Admin bloqueia / multas excessivas
    BLOCKED --> ACTIVE: Admin desbloqueia
    ACTIVE --> INACTIVE: Admin desactiva
    INACTIVE --> ACTIVE: Admin reactiva
```

### 11.2 AccountActivationStatus

```mermaid
stateDiagram-v2
    [*] --> PENDING_DOCUMENTS: OAuth signup
    PENDING_DOCUMENTS --> PENDING_TRAINING: ≥1 doc aprovado
    PENDING_TRAINING --> TRAINING_SCHEDULED: Inscrição em formação
    TRAINING_SCHEDULED --> ACTIVE: Presença marcada
    ACTIVE --> BLOCKED: Admin bloqueia
    BLOCKED --> ACTIVE: Admin desbloqueia
```

### 11.3 Loan Status

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Empréstimo criado
    ACTIVE --> RETURNED: Devolvido
    ACTIVE --> OVERDUE: dueDate ultrapassado
    OVERDUE --> RETURNED: Devolvido (com multa)
    ACTIVE --> CANCELLED: Cancelado
```

### 11.4 Reservation Status

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Reserva criada
    ACTIVE --> AVAILABLE: Cópia disponível
    AVAILABLE --> COLLECTED: Levantado em 48h
    AVAILABLE --> EXPIRED: 48h sem levantar
    ACTIVE --> CANCELLED: Cancelado
```

### 11.5 Fine Status

```mermaid
stateDiagram-v2
    [*] --> PENDING: Multa gerada
    PENDING --> PAID: Paga
    PENDING --> WAIVED: Isenta
    PENDING --> CANCELLED: Cancelada
```

### 11.6 CatalogEntry Status

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Catalogador cria
    DRAFT --> PENDING_REVIEW: Submetido
    PENDING_REVIEW --> APPROVED: Supervisor aprova
    PENDING_REVIEW --> REJECTED: Supervisor rejeita
    REJECTED --> DRAFT: Catalogador edita
```

### 11.7 TrainingSession Status

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Admin cria
    SCHEDULED --> IN_PROGRESS: Início da sessão
    IN_PROGRESS --> COMPLETED: Admin conclui
    SCHEDULED --> CANCELLED: Admin cancela
```

---

## 12. Testes Implementados

### 12.1 Testes Unitários

| Arquivo | Framework | Cobertura |
|---------|-----------|-----------|
| `src/lib/__tests__/recommendations.test.ts` | Vitest | 12/12 testes ✅ |

**Casos testados (recomendações):**
- Retorna mínimo 5 recomendações
- Não recomenda livros já lidos
- Prioriza categoria do histórico
- Prioriza mesmo autor
- Pontuação por popularidade
- Pontuação por disponibilidade
- Edge case: utilizador sem histórico (retorna populares)
- Edge case: todos livros já lidos (retorna lista vazia)
- Mocks Prisma completos e isolados

**Execução:**
```bash
cd 3_Construcao/frontend
npm test recommendations.test.ts
```

### 12.2 Testes Manuais Documentados

Os seguintes fluxos foram testados manualmente e documentados:

- ✅ Fluxo completo de onboarding (12 steps)
- ✅ Notificações contextuais (clique navega para página correcta)
- ✅ Gestão de membros
- ✅ CRUD de livros
- ✅ Empréstimo → Devolução → Multa
- ✅ Reserva → Fila → Levantamento
- ✅ Renovação com validações

### 12.3 Testes E2E

**Status:** ⚠️ Pendente (Playwright configurado mas sem suites completas)

---

## 13. Seeds e Dados Iniciais

**Arquivo:** `prisma/seed.ts`

### 13.1 Reset Completo

O seed faz **DELETE ALL** na seguinte ordem (dependências):

```typescript
await prisma.chatMessage.deleteMany({});
await prisma.bookRecommendation.deleteMany({});
await prisma.bookReview.deleteMany({});
await prisma.notification.deleteMany({});
await prisma.activityLog.deleteMany({});
await prisma.specialRequest.deleteMany({});
await prisma.computerSession.deleteMany({});
await prisma.lockerRental.deleteMany({});
await prisma.fine.deleteMany({});
await prisma.classroomLoan.deleteMany({});
await prisma.loan.deleteMany({});
await prisma.reservation.deleteMany({});
await prisma.userDocument.deleteMany({});
await prisma.passwordResetToken.deleteMany({});
// + Copy, Book, User, Category, Publisher, Author...
```

### 13.2 Dados Criados

| Entidade | Quantidade | Detalhes |
|----------|-----------|----------|
| **Administrador** | 1 | admin@isptec.co.ao / password123 / SUPERVISOR |
| **Categorias** | 13 | Ficção, Ciência, Informática, etc. |
| **Editoras** | 14 | Porto Editora, Leya, etc. |
| **Autores** | 10 | — |
| **Cacifos** | 50 | Numerados L-001 a L-050 |
| **Computadores** | 20 | Numerados PC-01 a PC-20 |
| **SystemConfiguration** | 5+ | MAX_LOAN_DAYS, FINE_PER_DAY, etc. |

**Credenciais de teste:**
- 📧 Email: `admin@isptec.co.ao`
- 🔑 Password: `password123`
- 👤 Tipo: `SUPERVISOR`

**Script de reset:**
```bash
cd 3_Construcao/frontend
./scripts/reset-database.sh
# ou
npx dotenvx run -- tsx prisma/seed.ts
```

---

## 14. Melhorias e Decisões Técnicas

### 14.1 Otimizações

| Otimização | Implementação |
|-----------|---------------|
| **Prisma select/include** | Apenas campos necessários em cada query |
| **Transactions** | `$transaction` para operações multi-tabela (empréstimo, devolução) |
| **Pagination** | `skip` + `take` em listagens |
| **Fallback configs** | BD → constantes (LoanPolicyConfig → LOAN_LIMITS) |
| **Soft-failure logs** | Activity logs nunca interrompem operação principal |
| **Lazy loading** | Imagens com `loading="lazy"` |
| **Enum imports** | `@prisma/client` directamente (evita string comparison bugs) |

### 14.2 Padrões de Código

| Padrão | Aplicação |
|--------|-----------|
| **Validação Zod** | Todas as API routes |
| **Server Components** | Páginas estáticas (listagens) |
| **Client Components** | Interactividade (`'use client'`) |
| **Centralização de regras** | `sgbu-rules.ts` para TODAS as regras de negócio |
| **Activity logging** | `activity-logger.ts` centralizado |
| **Notification helpers** | `notification-helpers.ts` com 15+ tipos |
| **Conventional Commits** | `feat(loans):`, `fix(auth):`, `docs(readme):` |

### 14.3 Decisões Arquitecturais

| Decisão | Razão |
|---------|-------|
| **API genérica `/entities/[entity]`** | Evitar duplicação de CRUD para 10+ entidades |
| **NextAuth v4 (não v5)** | Estabilidade e documentação madura |
| **Cloudinary (não S3)** | Transformações de imagem incluídas + free tier |
| **Gemini Flash (não GPT-4 Vision)** | Custo menor para OCR |
| **jsPDF client-side** | Evitar dependências nativas no servidor Vercel |
| **`activationStatus` separado de `status`** | Permitir PENDING com activação progressiva sem perder o status geral |

### 14.4 Problemas Resolvidos

| Problema | Solução | Issue |
|----------|---------|-------|
| Next.js 15+ params como Promise | `const { id } = await params;` em todos route handlers | PR #50 |
| String vs Enum comparison | `status === UserStatus.ACTIVE` (import directo do Prisma) | PR #50 |
| BookReview duplicate | `upsert` em vez de `create` para evitar P2002 | Status fix |
| N+1 queries | `include` e `select` em todas as listagens | Geral |
| Ratings fake no seed | Removidos; estrelas só com reviews reais | Status fix |
| ClientFetchError NextAuth | Corrigido JSON/HTML em responses | Status fix |
| Overlay de permissões PENDING | Mudança de "apenas ACTIVE" para "não INACTIVE" | PR #50 |

### 14.5 Formatação e Localização (pt-AO)

```typescript
// Datas
const dateFormatter = new Intl.DateTimeFormat('pt-AO', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

// Moeda (Kwanza)
const currencyFormatter = new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA',
});
```

**Termos específicos:** Utilizador (não "usuário"), Cacifo (não "armário"), Levantamento (não "retirada").

---

## Diagrama de Arquitectura Geral

```mermaid
graph TB
    subgraph "Frontend (Next.js App Router)"
        Pages[Páginas React]
        Components[Componentes UI]
        Lib[Lib: rules, auth, utils]
    end

    subgraph "API Layer (Next.js API Routes)"
        Entities["/api/entities/[entity]"]
        Members["/api/members/*"]
        Training["/api/training/*"]
        Notifications["/api/notifications/*"]
        Reports["/api/reports"]
        Settings["/api/settings/*"]
        Recommendations["/api/recommendations"]
        AI["/api/ai/invoke"]
        Uploads["/api/uploads"]
    end

    subgraph "Business Logic"
        Rules["sgbu-rules.ts"]
        SettingsConfig["settings-config.ts"]
        ActLogger["activity-logger.ts"]
        NotifHelpers["notification-helpers.ts"]
        ActivMiddle["activation-middleware.ts"]
        RecoService["recommendations.ts"]
    end

    subgraph "Data Layer"
        Prisma["Prisma ORM"]
        PG[(PostgreSQL)]
    end

    subgraph "External Services"
        GoogleOAuth[Google OAuth]
        Cloudinary[Cloudinary CDN]
        Gemini[Google Gemini]
        OpenAI[OpenAI GPT-4]
        GoogleBooks[Google Books API]
    end

    Pages --> Components
    Pages --> Lib
    Components --> Entities & Members & Training
    Entities --> Rules & SettingsConfig & ActLogger
    Members --> NotifHelpers
    Training --> ActivMiddle & NotifHelpers
    AI --> Gemini
    AI --> GoogleBooks
    Uploads --> Cloudinary
    
    Rules & SettingsConfig --> Prisma
    ActLogger --> Prisma
    Prisma --> PG
```

---

**Documento gerado a partir da análise completa do workspace.**
**Grupo 04 — Engenharia Informática ISPTEC — Engenharia de Software I**
**Carlos Tchípia • Emanuel Santos • José Tala • Líria Bá**
**Docente: Judson Quissanga Coge Paiva**