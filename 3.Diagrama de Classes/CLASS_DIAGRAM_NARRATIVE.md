# 📊 Narrativa para Diagrama de Classes - SGBU
**Sistema de Gestão de Biblioteca Universitária - ISPTEC**

---

## 📌 INTRODUÇÃO

Este documento fornece uma narrativa estruturada de todas as classes principais, enums e interfaces necessários para modelar o diagrama de classes do Sistema de Gestão de Biblioteca Universitária no Visual Paradigm.

O modelo segue os princípios do schema Prisma definido e incorpora as regras de negócio essenciais do SGBU.

---

## 🏗️ ESTRUTURA DO DIAGRAMA

O diagrama de classes é organizado por **módulos de negócio**:

1. **Módulo de Utilizadores** - Gestão de utilizadores e documentos
2. **Módulo de Catálogo** - Livros, autores, categorias, editoras
3. **Módulo de Empréstimos** - Empréstimos, devoluções, renovações
4. **Módulo de Reservas** - Reservas com fila FIFO
5. **Módulo de Multas** - Gestão de multas e penalidades
6. **Módulo de Notificações** - Comunicação automática
7. **Módulo de Serviços Especiais** - Cacifos, computadores
8. **Módulo de IA** - Recomendações, reviews, chat
9. **Módulo de Auditoria** - Logs e relatórios

---

# 📋 ENUMS (Tipos de Dados Enumerados)

## Enum: UserType
**Descrição:** Define o tipo/perfil de utilizador no sistema.

```
Valores:
├─ STUDENT      (Estudante)
├─ TEACHER      (Docente)
├─ STAFF        (Funcionário)
├─ LIBRARIAN    (Bibliotecário)
├─ CATALOGER    (Catalogador)
└─ SUPERVISOR   (Supervisor)
```

---

## Enum: UserStatus
**Descrição:** Estado de atividade do utilizador.

```
Valores:
├─ ACTIVE       (Ativo)
├─ INACTIVE     (Inativo)
├─ BLOCKED      (Bloqueado)
└─ PENDING      (Pendente)
```

---

## Enum: BookStatus
**Descrição:** Estado de cada cópia de livro.

```
Valores:
├─ AVAILABLE    (Disponível)
├─ BORROWED     (Emprestado)
├─ RESERVED     (Reservado)
├─ MAINTENANCE  (Manutenção)
├─ LOST         (Perdido)
└─ DAMAGED      (Danificado)
```

---

## Enum: LoanStatus
**Descrição:** Estado de um empréstimo.

```
Valores:
├─ ACTIVE       (Ativo)
├─ RETURNED     (Devolvido)
├─ OVERDUE      (Vencido)
└─ CANCELLED    (Cancelado)
```

---

## Enum: ReservationStatus
**Descrição:** Estado de uma reserva.

```
Valores:
├─ ACTIVE       (À espera)
├─ AVAILABLE    (Disponível para levantamento)
├─ COLLECTED    (Levantado)
├─ EXPIRED      (Expirado)
└─ CANCELLED    (Cancelado)
```

---

## Enum: FineStatus
**Descrição:** Estado de pagamento de uma multa.

```
Valores:
├─ PENDING      (Pendente)
├─ PAID         (Paga)
├─ CANCELLED    (Cancelada)
└─ WAIVED       (Perdoada)
```

---

## Enum: FineType
**Descrição:** Tipo de multa.

```
Valores:
├─ LATE_RETURN      (Atraso na devolução)
├─ LOCKER_OVERTIME  (Uso prolongado de cacifo)
├─ LOST_CREDENTIAL  (Perda de credencial)
├─ DAMAGED_BOOK     (Livro danificado)
└─ LOST_BOOK        (Livro perdido)
```

---

## Enum: NotificationType
**Descrição:** Canal de notificação.

```
Valores:
├─ EMAIL    (Correio eletrónico)
├─ SMS      (Mensagem de texto)
├─ PUSH     (Notificação push)
└─ IN_APP   (Na aplicação)
```

---

## Enum: NotificationStatus
**Descrição:** Estado de entrega de notificação.

```
Valores:
├─ PENDING      (Pendente)
├─ SENT         (Enviada)
├─ DELIVERED    (Entregue)
├─ FAILED       (Falhada)
└─ READ         (Lida)
```

---

## Enum: CatalogStatus
**Descrição:** Estado de entry de catálogo.

```
Valores:
├─ DRAFT          (Rascunho)
├─ PENDING_REVIEW (Aguardando aprovação)
├─ APPROVED       (Aprovada)
└─ REJECTED       (Rejeitada)
```

---

## Enum: LockerStatus
**Descrição:** Estado de cacifo.

```
Valores:
├─ AVAILABLE    (Disponível)
├─ OCCUPIED     (Ocupado)
└─ MAINTENANCE  (Manutenção)
```

---

## Enum: ComputerStatus
**Descrição:** Estado de computador.

```
Valores:
├─ AVAILABLE    (Disponível)
├─ OCCUPIED     (Ocupado)
└─ MAINTENANCE  (Manutenção)
```

---

## Enum: RequestStatus
**Descrição:** Estado de pedido especial.

```
Valores:
├─ PENDING      (Pendente)
├─ IN_PROGRESS  (Em andamento)
├─ COMPLETED    (Concluído)
└─ CANCELLED    (Cancelado)
```

---

# 🎯 CLASSES PRINCIPAIS

## Classe 1: User
**Módulo:** Utilizadores  
**Descrição:** Representa um utilizador do sistema (estudante, docente, funcionário, etc.)

### Atributos
```
- id: String (PK)
- email: String (UNIQUE)
- password: String (hash)
- name: String
- phone: String [0..1]
- type: UserType
- status: UserStatus
- registrationNumber: String [0..1] (UNIQUE)
- course: String [0..1]
- department: String [0..1]
- qrCode: String [0..1] (UNIQUE)
- qrCodeGeneratedAt: DateTime [0..1]
- totalFines: Decimal
- isBlocked: Boolean
- blockedReason: String [0..1]
- blockedAt: DateTime [0..1]
- preferredNotification: NotificationType
- language: String
- createdAt: DateTime
- updatedAt: DateTime
- lastLoginAt: DateTime [0..1]
```

### Operações
```
+ validateLogin(email: String, password: String): Boolean
+ blockUser(reason: String): void
+ unblockUser(): void
+ getActiveLoans(): List<Loan>
+ getActiveReservations(): List<Reservation>
+ calculateTotalFines(): Decimal
+ isBlockedFromOperations(): Boolean
+ generateQRCode(): String
+ getPreferredNotificationMethod(): NotificationType
```

### Multiplicidades de Relacionamento
```
User 1 ──── * Loan
User 1 ──── * Reservation
User 1 ──── * Fine
User 1 ──── * Notification
User 1 ──── * UserDocument
User 1 ──── * LockerRental
User 1 ──── * ComputerSession
User 1 ──── * SpecialRequest
User 1 ──── * ActivityLog
User 1 ──── * ChatMessage
User 1 ──── * BookReview
User 1 ──── * CatalogEntry (como catalogador)
User 1 ──── * CatalogEntry (como supervisor)
```

---

## Classe 2: UserDocument
**Módulo:** Utilizadores  
**Descrição:** Documentos de verificação associados a um utilizador.

### Atributos
```
- id: String (PK)
- userId: String (FK)
- documentType: String
- documentUrl: String
- isVerified: Boolean
- verifiedAt: DateTime [0..1]
- verifiedBy: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ verify(verifiedBy: String): void
+ getDownloadUrl(): String
+ isExpired(): Boolean
```

### Multiplicidades
```
UserDocument N ──── 1 User
```

---

## Classe 3: Category
**Módulo:** Catálogo  
**Descrição:** Categoria de classificação de livros (estrutura hierárquica).

### Atributos
```
- id: String (PK)
- name: String (UNIQUE)
- description: String [0..1]
- parentId: String [0..1] (FK)
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getSubcategories(): List<Category>
+ getParentCategory(): Category [0..1]
+ getAllBooks(): List<Book>
+ isRootCategory(): Boolean
```

### Multiplicidades
```
Category 1 ──── * Category (auto-relacionamento - hierarquia)
Category 1 ──── * Book
```

---

## Classe 4: Author
**Módulo:** Catálogo  
**Descrição:** Autor de livros.

### Atributos
```
- id: String (PK)
- name: String
- biography: String [0..1]
- birthDate: DateTime [0..1]
- nationality: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getBooks(): List<Book>
+ getNumberOfWorks(): Integer
```

### Multiplicidades
```
Author 1 ──── * BookAuthor
```

---

## Classe 5: Publisher
**Módulo:** Catálogo  
**Descrição:** Editora/Publicadora de livros.

### Atributos
```
- id: String (PK)
- name: String (UNIQUE)
- country: String [0..1]
- website: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getBooks(): List<Book>
+ getTotalPublications(): Integer
```

### Multiplicidades
```
Publisher 1 ──── * Book
```

---

## Classe 6: Book
**Módulo:** Catálogo  
**Descrição:** Descrição bibliográfica de uma obra.

### Atributos
```
- id: String (PK)
- isbn: String [0..1] (UNIQUE)
- title: String
- subtitle: String [0..1]
- edition: String [0..1]
- publicationYear: Integer [0..1]
- language: String
- pages: Integer [0..1]
- description: String [0..1]
- coverUrl: String [0..1]
- categoryId: String (FK)
- keywords: List<String>
- deweyDecimal: String [0..1]
- totalCopies: Integer
- availableCopies: Integer
- extractedByOCR: Boolean
- ocrConfidence: Decimal [0..1]
- autoClassified: Boolean
- publisherId: String [0..1] (FK)
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getAvailableCopies(): List<Copy>
+ getAllCopies(): List<Copy>
+ getAuthors(): List<Author>
+ addCopy(copy: Copy): void
+ hasAvailableCopies(): Boolean
+ getTotalReservations(): Integer
+ getRecommendations(): List<Book>
+ getReviews(): List<BookReview>
+ getAverageRating(): Decimal
+ updateAvailableCopiesCount(): void
```

### Multiplicidades
```
Book N ──── 1 Category
Book N ──── 1 Publisher [0..1]
Book 1 ──── * Copy (composição)
Book 1 ──── * Reservation
Book 1 ──── * BookAuthor
Book 1 ──── * BookRecommendation
Book 1 ──── * BookReview
```

---

## Classe 7: BookAuthor
**Módulo:** Catálogo  
**Descrição:** Relacionamento entre livros e autores com ordem.

### Atributos
```
- bookId: String (PK, FK)
- authorId: String (PK, FK)
- order: Integer
```

### Operações
```
+ swapOrder(other: BookAuthor): void
```

### Multiplicidades
```
BookAuthor N ──── 1 Book
BookAuthor N ──── 1 Author
```

---

## Classe 8: Copy
**Módulo:** Catálogo  
**Descrição:** Exemplar físico de um livro.

### Atributos
```
- id: String (PK)
- bookId: String (FK)
- barcode: String (UNIQUE)
- rfidTag: String [0..1] (UNIQUE)
- status: BookStatus
- condition: String [0..1]
- location: String
- notes: String [0..1]
- acquisitionDate: DateTime
- acquisitionPrice: Decimal [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isAvailable(): Boolean
+ getBook(): Book
+ getActiveLoans(): List<Loan>
+ markAsLost(): void
+ markAsDamaged(): void
+ getLastLoan(): Loan [0..1]
+ updateStatus(status: BookStatus): void
+ transferLocation(newLocation: String): void
```

### Multiplicidades
```
Copy N ──── 1 Book (composição)
Copy 1 ──── * Loan
```

---

## Classe 9: Loan
**Módulo:** Empréstimos  
**Descrição:** Transação de empréstimo de uma cópia.

### Atributos
```
- id: String (PK)
- copyId: String (FK)
- userId: String (FK)
- status: LoanStatus
- loanDate: DateTime
- dueDate: DateTime
- returnDate: DateTime [0..1]
- renewalCount: Integer
- maxRenewals: Integer
- fineAmount: Decimal
- daysOverdue: Integer
- notes: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isActive(): Boolean
+ isOverdue(): Boolean
+ canBeRenewed(): Boolean
+ renewLoan(): Boolean
+ returnLoan(returnDate: DateTime): void
+ calculateFine(): Decimal
+ getDaysOverdue(): Integer
+ extendDueDate(days: Integer): void
+ getAssociatedFines(): List<Fine>
+ getNotifications(): List<Notification>
```

### Multiplicidades
```
Loan N ──── 1 Copy
Loan N ──── 1 User
Loan 1 ──── * Fine
Loan 1 ──── * Notification
```

---

## Classe 10: Reservation
**Módulo:** Reservas  
**Descrição:** Reserva de um livro com fila FIFO.

### Atributos
```
- id: String (PK)
- bookId: String (FK)
- userId: String (FK)
- status: ReservationStatus
- reservationDate: DateTime
- availableDate: DateTime [0..1]
- expiryDate: DateTime [0..1]
- collectionDate: DateTime [0..1]
- queuePosition: Integer
- notifiedAt: DateTime [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isActive(): Boolean
+ isExpired(): Boolean
+ getQueuePosition(): Integer
+ moveToFront(): void
+ notifyUser(): void
+ markAsCollected(collectionDate: DateTime): void
+ markAsExpired(): void
+ calculateExpiryDate(): DateTime
+ getEstimatedAvailableDate(): DateTime
```

### Multiplicidades
```
Reservation N ──── 1 User
Reservation N ──── 1 Book
Reservation 1 ──── * Notification
```

---

## Classe 11: Fine
**Módulo:** Multas  
**Descrição:** Multa ou penalidade associada a um utilizador.

### Atributos
```
- id: String (PK)
- userId: String (FK)
- loanId: String [0..1] (FK)
- type: FineType
- amount: Decimal
- status: FineStatus
- reason: String [0..1]
- generatedAt: DateTime
- paidAt: DateTime [0..1]
- paymentMethod: String [0..1]
- paymentReference: String [0..1]
- waivedAt: DateTime [0..1]
- waivedBy: String [0..1]
- waiverReason: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isPending(): Boolean
+ isPaid(): Boolean
+ markAsPaid(paymentMethod: String, reference: String): void
+ waiveFine(waivedBy: String, reason: String): void
+ getAssociatedLoan(): Loan [0..1]
+ getUser(): User
+ calculateInterest(): Decimal
```

### Multiplicidades
```
Fine N ──── 1 User
Fine N ──── 1 Loan [0..1]
```

---

## Classe 12: Notification
**Módulo:** Notificações  
**Descrição:** Notificação automática enviada a utilizadores.

### Atributos
```
- id: String (PK)
- userId: String (FK)
- type: NotificationType
- status: NotificationStatus
- title: String
- message: String
- loanId: String [0..1] (FK)
- reservationId: String [0..1] (FK)
- sentAt: DateTime [0..1]
- deliveredAt: DateTime [0..1]
- readAt: DateTime [0..1]
- metadata: Json [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ sendNotification(): Boolean
+ markAsSent(): void
+ markAsDelivered(): void
+ markAsRead(): void
+ isDelivered(): Boolean
+ resendNotification(): Boolean
+ getMetadataValue(key: String): String
```

### Multiplicidades
```
Notification N ──── 1 User
Notification N ──── 1 Loan [0..1]
Notification N ──── 1 Reservation [0..1]
```

---

## Classe 13: CatalogEntry
**Módulo:** Catalogação  
**Descrição:** Entry de catalogação extraída via OCR ou criada manualmente.

### Atributos
```
- id: String (PK)
- bookId: String [0..1] (FK)
- extractedTitle: String [0..1]
- extractedAuthor: String [0..1]
- extractedISBN: String [0..1]
- extractedPublisher: String [0..1]
- extractedYear: Integer [0..1]
- imageUrl: String [0..1]
- enrichedData: Json [0..1]
- status: CatalogStatus
- catalogerId: String (FK)
- supervisorId: String [0..1] (FK)
- reviewNotes: String [0..1]
- rejectionReason: String [0..1]
- createdAt: DateTime
- updatedAt: DateTime
- approvedAt: DateTime [0..1]
```

### Operações
```
+ submitForReview(): void
+ approveEntry(supervisorId: String): void
+ rejectEntry(reason: String): void
+ createBookFromEntry(): Book
+ enrich Metadata(): void
+ getOCRConfidence(): Decimal
+ isReadyForApproval(): Boolean
```

### Multiplicidades
```
CatalogEntry N ──── 1 User (catalogador)
CatalogEntry N ──── 1 User (supervisor) [0..1]
```

---

## Classe 14: Locker
**Módulo:** Serviços Especiais  
**Descrição:** Cacifo para armazenamento de pertences.

### Atributos
```
- id: String (PK)
- number: String (UNIQUE)
- location: String
- status: LockerStatus
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isAvailable(): Boolean
+ occupy(userId: String): LockerRental
+ vacate(): void
+ getLatestRental(): LockerRental [0..1]
+ markForMaintenance(): void
+ isUnderMaintenance(): Boolean
```

### Multiplicidades
```
Locker 1 ──── * LockerRental
```

---

## Classe 15: LockerRental
**Módulo:** Serviços Especiais  
**Descrição:** Registro de utilização de cacifo.

### Atributos
```
- id: String (PK)
- lockerId: String (FK)
- userId: String (FK)
- startTime: DateTime
- endTime: DateTime [0..1]
- expectedEnd: DateTime
- overtimeMinutes: Integer
- fineAmount: Decimal
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ endRental(): void
+ calculateOvertimeCharge(): Decimal
+ isOvertime(): Boolean
+ getUser(): User
+ getLocker(): Locker
+ getDurationMinutes(): Integer
```

### Multiplicidades
```
LockerRental N ──── 1 Locker
LockerRental N ──── 1 User
```

---

## Classe 16: Computer
**Módulo:** Serviços Especiais  
**Descrição:** Computador disponível para uso na biblioteca.

### Atributos
```
- id: String (PK)
- number: String (UNIQUE)
- location: String
- status: ComputerStatus
- specifications: Json [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isAvailable(): Boolean
+ startSession(userId: String): ComputerSession
+ endSession(sessionId: String): void
+ getActiveSessions(): List<ComputerSession>
+ markForMaintenance(): void
```

### Multiplicidades
```
Computer 1 ──── * ComputerSession
```

---

## Classe 17: ComputerSession
**Módulo:** Serviços Especiais  
**Descrição:** Sessão de utilização de computador.

### Atributos
```
- id: String (PK)
- computerId: String (FK)
- userId: String (FK)
- startTime: DateTime
- endTime: DateTime [0..1]
- expectedEnd: DateTime
- renewalCount: Integer
- maxRenewals: Integer
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ isActive(): Boolean
+ endSession(): void
+ renewSession(): Boolean
+ extendSession(minutes: Integer): void
+ getDurationMinutes(): Integer
+ canRenew(): Boolean
```

### Multiplicidades
```
ComputerSession N ──── 1 Computer
ComputerSession N ──── 1 User
```

---

## Classe 18: SpecialRequest
**Módulo:** Pedidos Especiais  
**Descrição:** Pedido especial de utilizador (bibliografia, formação, etc.).

### Atributos
```
- id: String (PK)
- userId: String (FK)
- type: String
- title: String
- description: String
- status: RequestStatus
- requestedAt: DateTime
- completedAt: DateTime [0..1]
- response: String [0..1]
- responseAt: DateTime [0..1]
- scheduledDate: DateTime [0..1]
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ submitRequest(): void
+ completeRequest(response: String): void
+ cancelRequest(): void
+ isCompleted(): Boolean
+ getUser(): User
```

### Multiplicidades
```
SpecialRequest N ──── 1 User
```

---

## Classe 19: BookRecommendation
**Módulo:** IA e Recomendações  
**Descrição:** Recomendações de livros similares.

### Atributos
```
- id: String (PK)
- bookId: String (FK)
- recommendedBooks: List<String>
- algorithm: String
- confidence: Decimal
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getRecommendedBooks(): List<Book>
+ getConfidencePercentage(): Decimal
+ recalculateRecommendations(): void
+ getAlgorithmName(): String
```

### Multiplicidades
```
BookRecommendation N ──── 1 Book
```

---

## Classe 20: BookReview
**Módulo:** IA e Recomendações  
**Descrição:** Avaliação e comentário de um livro por utilizador.

### Atributos
```
- id: String (PK)
- bookId: String (FK)
- userId: String (FK)
- rating: Integer (1-5)
- review: String [0..1]
- isVerifiedRead: Boolean
- helpfulCount: Integer
- createdAt: DateTime
- updatedAt: DateTime
```

### Operações
```
+ getRatingStars(): Integer
+ isFromVerifiedReader(): Boolean
+ incrementHelpfulCount(): void
+ getBook(): Book
+ getUser(): User
+ isEditableByUser(userId: String): Boolean
```

### Multiplicidades
```
BookReview N ──── 1 Book
BookReview N ──── 1 User
```

---

## Classe 21: ChatMessage
**Módulo:** IA e Chatbot  
**Descrição:** Mensagem em conversa de chatbot.

### Atributos
```
- id: String (PK)
- userId: String [0..1] (FK)
- sessionId: String
- message: String
- isBot: Boolean
- intent: String [0..1]
- confidence: Decimal [0..1]
- metadata: Json [0..1]
- createdAt: DateTime
```

### Operações
```
+ isFromBot(): Boolean
+ isFromUser(): Boolean
+ getIntent(): String
+ getConfidenceScore(): Decimal
+ isIntentionHighConfidence(): Boolean
```

### Multiplicidades
```
ChatMessage N ──── 1 User [0..1]
```

---

## Classe 22: ActivityLog
**Módulo:** Auditoria  
**Descrição:** Log de atividades para auditoria do sistema.

### Atributos
```
- id: String (PK)
- userId: String [0..1] (FK)
- action: String
- entity: String
- entityId: String [0..1]
- description: String
- ipAddress: String [0..1]
- userAgent: String [0..1]
- metadata: Json [0..1]
- createdAt: DateTime
```

### Operações
```
+ getUser(): User [0..1]
+ getDescription(): String
+ isLoginAction(): Boolean
+ isCriticalAction(): Boolean
+ logAction(action: String, entity: String, description: String): void
```

### Multiplicidades
```
ActivityLog N ──── 1 User [0..1]
```

---

## Classe 23: Report
**Módulo:** Relatórios e Analytics  
**Descrição:** Relatório gerado dinamicamente.

### Atributos
```
- id: String (PK)
- name: String
- type: String
- filters: Json [0..1]
- generatedBy: String [0..1]
- generatedAt: DateTime
- fileUrl: String [0..1]
- format: String
- isScheduled: Boolean
- schedule: String [0..1]
```

### Operações
```
+ generateReport(): String
+ downloadReport(): ByteArray
+ isScheduled(): Boolean
+ executeScheduledGeneration(): void
+ getReportType(): String
+ applyFilters(filters: Json): void
```

---

## Classe 24: SystemMetrics
**Módulo:** Relatórios e Analytics  
**Descrição:** Métricas do sistema recolhidas diariamente.

### Atributos
```
- id: String (PK)
- date: Date (UNIQUE)
- totalLoans: Integer
- totalReturns: Integer
- totalReservations: Integer
- newUsers: Integer
- newBooks: Integer
- overdueLoans: Integer
- finesCollected: Decimal
- lockerUsage: Integer
- computerUsage: Integer
- createdAt: DateTime
```

### Operações
```
+ recordLoan(): void
+ recordReturn(): void
+ recordReservation(): void
+ getDailyMetrics(): Map<String, Object>
+ calculateAverageLoansPerDay(): Decimal
+ getOccupancyRate(): Decimal
```

---

## Classe 25: SystemConfiguration
**Módulo:** Configuração  
**Descrição:** Configurações do sistema ajustáveis.

### Atributos
```
- id: String (PK)
- key: String (UNIQUE)
- value: String
- description: String [0..1]
- updatedAt: DateTime
- updatedBy: String [0..1]
```

### Operações
```
+ getValue(): String
+ setValue(value: String, updatedBy: String): void
+ isConfigKey(key: String): Boolean
+ getConfigValue(key: String): String [0..1]
```

---

# 📊 DIAGRAMA DE RELACIONAMENTOS (Texto)

```
┌─────────────────────────────────────────────────────────────────┐
│                      MÓDULO DE UTILIZADORES                     │
├─────────────────────────────────────────────────────────────────┤
│  User                                                            │
│  ├── (1) ──────────────────── (*) UserDocument                 │
│  ├── (1) ──────────────────── (*) Loan                         │
│  ├── (1) ──────────────────── (*) Reservation                  │
│  ├── (1) ──────────────────── (*) Fine                         │
│  ├── (1) ──────────────────── (*) Notification                 │
│  ├── (1) ──────────────────── (*) LockerRental                 │
│  ├── (1) ──────────────────── (*) ComputerSession              │
│  ├── (1) ──────────────────── (*) SpecialRequest               │
│  ├── (1) ──────────────────── (*) ActivityLog                  │
│  ├── (1) ──────────────────── (*) ChatMessage                  │
│  ├── (1) ──────────────────── (*) BookReview                   │
│  ├── (1) ──────────────────── (*) CatalogEntry (Catalogador)   │
│  └── (1) ──────────────────── (*) CatalogEntry (Supervisor)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MÓDULO DE CATÁLOGO                         │
├─────────────────────────────────────────────────────────────────┤
│  Category                                                        │
│  ├── (1) ──────────────────── (*) Category (Hierarquia)        │
│  └── (1) ──────────────────── (*) Book                         │
│                                                                 │
│  Author                                                         │
│  └── (1) ──────────────────── (*) BookAuthor                   │
│                                                                 │
│  Publisher                                                      │
│  └── (1) ──────────────────── (*) Book                         │
│                                                                 │
│  Book                                                           │
│  ├── (N) ──────────────────── (1) Category                     │
│  ├── (N) ──────────────────── (1) Publisher [0..1]             │
│  ├── COMPOSIÇÃO │ (1) ──────────────────── (*) Copy            │
│  ├── (1) ──────────────────── (*) BookAuthor                   │
│  ├── (1) ──────────────────── (*) Reservation                  │
│  ├── (1) ──────────────────── (*) BookRecommendation           │
│  └── (1) ──────────────────── (*) BookReview                   │
│                                                                 │
│  Copy                                                           │
│  ├── (N) ──────────────────── (1) Book [Composição]            │
│  └── (1) ──────────────────── (*) Loan                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   MÓDULO DE EMPRÉSTIMOS                         │
├─────────────────────────────────────────────────────────────────┤
│  Loan                                                            │
│  ├── (N) ──────────────────── (1) Copy                         │
│  ├── (N) ──────────────────── (1) User                         │
│  ├── (1) ──────────────────── (*) Fine                         │
│  └── (1) ──────────────────── (*) Notification                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   MÓDULO DE RESERVAS (FIFO)                     │
├─────────────────────────────────────────────────────────────────┤
│  Reservation                                                     │
│  ├── (N) ──────────────────── (1) User                         │
│  ├── (N) ──────────────────── (1) Book                         │
│  └── (1) ──────────────────── (*) Notification                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     MÓDULO DE MULTAS                            │
├─────────────────────────────────────────────────────────────────┤
│  Fine                                                            │
│  ├── (N) ──────────────────── (1) User                         │
│  └── (N) ──────────────────── (1) Loan [0..1]                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 MÓDULO DE NOTIFICAÇÕES                          │
├─────────────────────────────────────────────────────────────────┤
│  Notification                                                    │
│  ├── (N) ──────────────────── (1) User                         │
│  ├── (N) ──────────────────── (1) Loan [0..1]                  │
│  └── (N) ──────────────────── (1) Reservation [0..1]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 MÓDULO DE SERVIÇOS ESPECIAIS                    │
├─────────────────────────────────────────────────────────────────┤
│  Locker                                                          │
│  └── (1) ──────────────────── (*) LockerRental                 │
│                                                                 │
│  LockerRental                                                    │
│  ├── (N) ──────────────────── (1) Locker                       │
│  └── (N) ──────────────────── (1) User                         │
│                                                                 │
│  Computer                                                        │
│  └── (1) ──────────────────── (*) ComputerSession              │
│                                                                 │
│  ComputerSession                                                │
│  ├── (N) ──────────────────── (1) Computer                     │
│  └── (N) ──────────────────── (1) User                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  MÓDULO DE IA E RECOMENDAÇÕES                   │
├─────────────────────────────────────────────────────────────────┤
│  BookRecommendation                                              │
│  └── (N) ──────────────────── (1) Book                         │
│                                                                 │
│  BookReview                                                      │
│  ├── (N) ──────────────────── (1) Book                         │
│  └── (N) ──────────────────── (1) User                         │
│                                                                 │
│  ChatMessage                                                     │
│  └── (N) ──────────────────── (1) User [0..1]                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULO DE AUDITORIA                          │
├─────────────────────────────────────────────────────────────────┤
│  ActivityLog                                                     │
│  └── (N) ──────────────────── (1) User [0..1]                  │
│                                                                 │
│  CatalogEntry                                                    │
│  ├── (N) ──────────────────── (1) User [FK - Catalogador]      │
│  └── (N) ──────────────────── (1) User [FK - Supervisor][0..1] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 MÓDULO DE RELATÓRIOS                            │
├─────────────────────────────────────────────────────────────────┤
│  Report (Classe independente)                                   │
│  SystemMetrics (Classe independente)                            │
│  SystemConfiguration (Classe independente)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# 🔑 CHAVES E RELACIONAMENTOS (Mapeamento Rápido)

## Chaves Primárias
Todas as classes utilizam `id: String (PK)` com `CUID()` como valor padrão, exceto:
- `BookAuthor`: Chave composta `(bookId, authorId)`
- `SystemMetrics`: Chave única `date`
- `SystemConfiguration`: Chave única `key`

## Relacionamentos Críticos (Negócio)

| De | Para | Multiplicidade | Tipo | Descrição |
|---|---|---|---|---|
| User | Loan | 1:N | Agregação | Utilizador tem empréstimos |
| User | Reservation | 1:N | Agregação | Utilizador tem reservas |
| User | Fine | 1:N | Agregação | Utilizador tem multas |
| Book | Copy | 1:N | **Composição** | Livro tem cópias físicas |
| Copy | Loan | 1:N | Agregação | Cópia é emprestada |
| Loan | Fine | 1:N | Agregação | Empréstimo gera multas |
| Book | Reservation | 1:N | Agregação | Livro tem reservas (FIFO) |
| Category | Category | 1:N | Hierarquia | Categorias aninhadas |
| Author | Book | N:M | Associação | Múltiplos autores por livro |
| Publisher | Book | 1:N | Associação | Uma editora, vários livros |

---

# 🎨 NOTAS SOBRE O DIAGRAMA

## Convenções Utilizadas

1. **Multiplicidades:**
   - `1` = Um
   - `*` = Muitos (zero ou mais)
   - `0..1` = Opcional (zero ou um)
   - `N` = Muitos (notation alternativa)

2. **Tipos de Relacionamentos:**
   - **Agregação** (linha com losango vazio): "tem um"
   - **Composição** (linha com losango cheio): "é parte de" (obrigatório)
   - **Herança** (seta vazia): "é um"
   - **Associação** (linha simples): Relacionamento genérico

3. **Atributos:**
   - Atributos normais sem prefixo
   - `(PK)` = Primary Key (Chave Primária)
   - `(FK)` = Foreign Key (Chave Estrangeira)
   - `(UNIQUE)` = Restrição de unicidade
   - `[0..1]` = Atributo opcional
   - `List<T>` = Array/Coleção

4. **Operações:**
   - Operações públicas começam com `+`
   - Operações privadas começam com `-`
   - Operações protegidas começam com `#`

---

# 📥 INSTRUÇÕES PARA VISUAL PARADIGM

## Passo 1: Criar Classes Base

1. Abrir novo Diagrama de Classes (Diagram > New > Class Diagram)
2. Criar as 25 classes principais listadas acima
3. Para cada classe, adicionar:
   - Nome (PascalCase)
   - Atributos (com tipos e visibilidade)
   - Operações/Métodos

## Passo 2: Modelar Enums

1. Criar 10 enumerações (UserType, BookStatus, LoanStatus, etc.)
2. Adicionar valores discretos para cada enum
3. Conectar aos atributos que as utilizam (ex: `status: BookStatus`)

## Passo 3: Desenhar Relacionamentos

1. Usar **Association** para relacionamentos genéricos
2. Usar **Aggregation** para relacionamentos"tem um"
3. Usar **Composition** para relacionamentos obrigatórios (ex: Book-Copy)
4. Adicionar **multiplicidades** nas extremidades dos relacionamentos
5. Adicionar **Labels** nos relacionamentos para maior clareza

## Passo 4: Organizar por Módulos

1. Criar **Packages** (módulos) no diagrama:
   - `usuarios`
   - `catalogo`
   - `emprestimos`
   - `reservas`
   - `multas`
   - `notificacoes`
   - `serviços_especiais`
   - `ia_recomendacoes`
   - `auditoria`
   - `configuracao`

2. Mover classes para seus pacotes correspondentes

## Passo 5: Validações

- Verificar que todas as FK estão representadas
- Confirmar que composições têm setas apropriadas
- Validar multiplicidades (são coerentes com o negócio?)
- Testar geração de código (Code > Generate Code)

---

# 📝 EXEMPLO DE MODELAÇÃO EM VISUAL PARADIGM

### Classe User (exemplo completo):

```
┌─────────────────────────────────────────┐
│  <<Class>>                              │
│  User                                   │
├─────────────────────────────────────────┤
│ - id: String {PK}                       │
│ - email: String {UNIQUE}                │
│ - password: String                      │
│ - name: String                          │
│ - phone: String {optional}              │
│ - type: UserType                        │
│ - status: UserStatus                    │
│ - registrationNumber: String {optional} │
│ - totalFines: Decimal                   │
│ - isBlocked: Boolean                    │
│ - createdAt: DateTime                   │
│ - updatedAt: DateTime                   │
├─────────────────────────────────────────┤
│ + validateLogin(email, password): Bool  │
│ + blockUser(reason: String): void       │
│ + getActiveLoans(): List<Loan>          │
│ + calculateTotalFines(): Decimal        │
│ + isBlockedFromOperations(): Boolean    │
└─────────────────────────────────────────┘
```

### Relacionamento User-Loan (exemplo):

```
User ────────────────1:N────────────── Loan

Multiplicidade:
  - 1 User pode ter múltiplos Loans (1:N)
  - Tipo: Agregação
  - Label: "têm"
```

---

# ✅ CHECKLIST FINAL

Antes de exportar o diagrama:

- [ ] 25 classes principais criadas
- [ ] 10 enums definidos
- [ ] Todos os atributos com tipos
- [ ] Operações básicas em cada classe
- [ ] Relacionamentos conectados
- [ ] Multiplicidades corretas
- [ ] Classes organizadas por módulos
- [ ] Nomes seguem convenções (PascalCase)
- [ ] Código gera sem erros (verificar via Code > Generate Code)
- [ ] Diagrama exportado em PDF/PNG para documentação

---

# 🔗 REFERÊNCIAS

- Schema Prisma: `2_Elaboracao/Schema Prisma.md`
- Modelo de Domínio: `2.Modelo de Domínio/DOMAIN-MODEL-NARRATIVE.md`
- PRD: `2_Elaboracao/PRD.md`
- FlowChart: `2_Elaboracao/FlowChart.md`

---

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Grupo 04 - ISPTEC**  
**Disciplina:** Engenharia de Software I  

Última atualização: 08 de Fevereiro de 2026
