# SGBU-017: Melhorias Sistêmicas e Fluxo de Ativação de Conta

**Data:** 03 de Fevereiro de 2026  
**Status:** Em Progresso  
**Prioridade:** ALTA  
**Tipo:** Enhancement

---

## 📋 Visão Geral

Implementação de melhorias críticas identificadas durante testes do sistema:

- Fluxo de ativação de conta (Documentos → Formação → Ativo)
- Visualização de reservas do usuário
- Gestão administrativa de serviços
- Configurações de regras de negócio
- Extração automática de dados do QR Code
- Limpeza de rotas e páginas órfãs

---

## ✅ CONCLUÍDO

### 1. Notificações Duplicadas

- **Problema:** Reserva de cacifo criava 2 notificações (frontend + backend)
- **Solução:** Removida criação de notificações do frontend
- **Arquivos:**
  - `src/app/services/page.tsx`
  - `src/app/api/entities/[entity]/[id]/route.ts`

### 2. Redirecionamento de Notificações

- **Problema:** Notificações não tinham ações específicas
- **Solução:** Implementados action_types:
  ```typescript
  view_services → /services
  view_documents → /profile?tab=documents
  renew → /my-loans
  collect_reservation → /my-reservations
  pay_fine → /profile?tab=fines
  ```
- **Arquivos:**
  - `src/components/notifications/NotificationCenter.tsx`
  - `src/app/notifications/page.tsx`

### 3. Limite de Reservas

- **Problema:** Usuário podia reservar múltiplos cacifos/computadores
- **Solução:** Validação no backend antes de criar reserva
  ```typescript
  // Verifica se já tem cacifo ativo
  const existingRental = await tx.lockerRental.findFirst({
    where: { userId: user.id, actualEnd: null },
  });
  if (existingRental) throw new Error("USER_HAS_ACTIVE_LOCKER");
  ```
- **Mensagens de erro:** Claras e específicas no frontend
- **Arquivos:**
  - `src/app/api/entities/[entity]/[id]/route.ts`
  - `src/app/services/page.tsx`

---

## 🔴 PRIORIDADE ALTA (Próximos Passos)

### 4. Fluxo de Ativação de Conta

**Problema:** Novos usuários ficam ativos imediatamente após cadastro.

**Solução Proposta:**

#### 4.1 Estados de Conta

```prisma
enum AccountActivationStatus {
  PENDING_DOCUMENTS    // Aguardando validação de documentos
  PENDING_TRAINING     // Docs validados, aguardando formação
  TRAINING_SCHEDULED   // Formação agendada
  ACTIVE               // Formação concluída, conta ativa
  BLOCKED              // Bloqueado por multas/violações
}
```

#### 4.2 Fluxo Completo

```
1. CADASTRO
   └─> Status: PENDING_DOCUMENTS
   └─> Acesso: Apenas upload de documentos

2. DOCUMENTOS APROVADOS
   └─> Status: PENDING_TRAINING
   └─> Acesso: Solicitar formação

3. FORMAÇÃO SOLICITADA
   └─> Status: TRAINING_SCHEDULED
   └─> Admin agenda data/hora

4. FORMAÇÃO REALIZADA
   └─> Status: ACTIVE
   └─> Acesso total: empréstimos, reservas, etc.
```

#### 4.3 Implementação

**Backend:**

- [ ] Adicionar campo `activationStatus` ao modelo `User`
- [ ] Criar modelo `TrainingSession`:

  ```prisma
  model TrainingSession {
    id              String   @id @default(cuid())
    trainerId       String   // Bibliotecário responsável
    scheduledDate   DateTime
    actualDate      DateTime?
    location        String   // Sala/local
    maxParticipants Int      @default(20)
    participants    TrainingParticipant[]
    status          TrainingStatus // SCHEDULED, COMPLETED, CANCELLED
    notes           String?
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }

  model TrainingParticipant {
    id              String         @id @default(cuid())
    userId          String
    sessionId       String
    attended        Boolean        @default(false)
    certificateUrl  String?       // PDF do certificado
    user            User           @relation(fields: [userId], references: [id])
    session         TrainingSession @relation(fields: [sessionId], references: [id])
    createdAt       DateTime       @default(now())

    @@unique([userId, sessionId])
  }
  ```

**Frontend:**

- [ ] Página de gestão de formações (admin): `/admin/training-sessions`
- [ ] Formulário de solicitação de formação (user): `/services` (já existe)
- [ ] Lista de participantes e presença
- [ ] Geração de certificados PDF

**Validações:**

- [ ] Bloquear empréstimos se `activationStatus !== ACTIVE`
- [ ] Bloquear reservas se `activationStatus !== ACTIVE`
- [ ] Permitir apenas solicitação de formação se `PENDING_TRAINING`

---

### 5. Visualização de Reservas do Usuário

**Problema:** Usuário não consegue ver suas reservas ativas de cacifos/computadores.

**Solução:**

#### 5.1 Nova seção em `/services`

```tsx
// Adicionar tab "Minhas Reservas"
<Tabs defaultValue="available">
  <TabsList>
    <TabsTrigger value="available">Disponíveis</TabsTrigger>
    <TabsTrigger value="my-reservations">Minhas Reservas</TabsTrigger>
  </TabsList>

  <TabsContent value="my-reservations">
    <MyActiveReservations />
  </TabsContent>
</Tabs>
```

#### 5.2 Componente `MyActiveReservations`

**Funcionalidades:**

- [ ] Listar cacifos ativos com countdown de tempo restante
- [ ] Listar sessões de computador ativas
- [ ] Botão "Devolver Cacifo" (atualiza `actualEnd`)
- [ ] Botão "Encerrar Sessão" (atualiza `endTime`)
- [ ] Cálculo de multas por atraso em tempo real

**Queries:**

```typescript
// Cacifos ativos
const activeLockers = await prisma.lockerRental.findMany({
  where: { userId: user.id, actualEnd: null },
  include: { locker: true },
});

// Computadores ativos
const activeSessions = await prisma.computerSession.findMany({
  where: { userId: user.id, endTime: null },
  include: { computer: true },
});
```

---

### 6. Gestão Administrativa de Serviços

**Problema:** Admin não tem onde gerenciar cacifos/computadores/formações.

**Solução:**

#### 6.1 Dashboard Administrativo

Adicionar cards em `/admin-dashboard`:

```tsx
<Card>
  <CardTitle>Cacifos</CardTitle>
  <p>{occupiedLockers}/{totalLockers} ocupados</p>
  <Button onClick={() => router.push('/admin/lockers')}>Gerenciar</Button>
</Card>

<Card>
  <CardTitle>Computadores</CardTitle>
  <p>{activeSessions}/{totalComputers} em uso</p>
  <Button onClick={() => router.push('/admin/computers')}>Gerenciar</Button>
</Card>

<Card>
  <CardTitle>Formações</CardTitle>
  <p>{upcomingSessions} agendadas</p>
  <Button onClick={() => router.push('/admin/training')}>Gerenciar</Button>
</Card>
```

#### 6.2 Páginas de Gestão

**`/admin/lockers`:**

- [ ] Lista de todos os cacifos com status
- [ ] Filtros: disponível, ocupado, manutenção
- [ ] Ações: liberar manualmente, marcar manutenção
- [ ] Ver histórico de uso

**`/admin/computers`:**

- [ ] Lista de todos os computadores
- [ ] Sessões ativas com tempo decorrido
- [ ] Encerrar sessão manualmente
- [ ] Adicionar/remover computadores

**`/admin/training`:**

- [ ] Criar nova sessão de formação
- [ ] Ver solicitações pendentes
- [ ] Agendar usuários para sessões
- [ ] Registrar presença pós-formação
- [ ] Gerar certificados

---

## 🟡 PRIORIDADE MÉDIA

### 7. Configurações de Regras de Negócio

**Problema:** Regras estão hardcoded no código.

**Solução:**

#### 7.1 Interface de Configurações

Adicionar dropdown no AppShell (só para SUPERVISOR):

```tsx
{
  user?.type === "SUPERVISOR" && (
    <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
      <Settings className="mr-2 h-4 w-4" />
      Configurações do Sistema
    </DropdownMenuItem>
  );
}
```

#### 7.2 Página `/admin/settings`

**Configurações Disponíveis:**

```typescript
// Empréstimos
STUDENT_LOAN_DAYS: 5;
TEACHER_LOAN_DAYS: 15;
MAX_RENEWALS: 2;
MAX_BOOKS_STUDENT: 2;
MAX_BOOKS_TEACHER: 4;

// Multas
LATE_FEE_PER_DAY_KZ: 50;
LOCKER_OVERTIME_FEE_KZ: 200;
LOST_BOOK_MULTIPLIER: 3;

// Reservas
RESERVATION_EXPIRY_HOURS: 48;
QUEUE_NOTIFICATION_HOURS: 2;

// Serviços
LOCKER_RENTAL_HOURS: 3;
COMPUTER_SESSION_HOURS: 2;
```

**Implementação:**

```prisma
model SystemConfiguration {
  key          String   @id
  value        String
  valueType    String   // INT, DECIMAL, STRING, BOOLEAN
  description  String
  category     String   // LOANS, FINES, RESERVATIONS, SERVICES
  updatedBy    String
  updatedAt    DateTime @updatedAt
}
```

**Helper Function:**

```typescript
export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const config = await prisma.systemConfiguration.findUnique({
    where: { key },
  });
  if (!config) return defaultValue;

  switch (config.valueType) {
    case "INT":
      return parseInt(config.value) as T;
    case "DECIMAL":
      return parseFloat(config.value) as T;
    case "BOOLEAN":
      return (config.value === "true") as T;
    default:
      return config.value as T;
  }
}
```

---

### 8. Extração Automática de Dados do QR Code

**Problema:** Após aprovar Cartão de Estudante, dados do QR não são extraídos.

**Solução:**

#### 8.1 Processar QR ao Aprovar Documento

**Workflow:**

```
1. Admin clica "Aprovar" em Cartão de Estudante
2. Backend chama função extractQRData(documentUrl)
3. Extrai: UID (matrícula), FN (nome completo), NICKNAME (curso)
4. Atualiza perfil do usuário automaticamente
5. Notifica usuário: "Seus dados foram atualizados!"
```

**Implementação:**

`/api/members/documents/[id]/route.ts` (PATCH - approve):

```typescript
if (doc.documentType === "STUDENT_CARD") {
  // Extrair dados do QR Code
  const qrData = await extractStudentDataFromQR(doc.documentUrl);

  if (qrData) {
    await prisma.user.update({
      where: { id: doc.userId },
      data: {
        registrationNumber: qrData.uid, // 20230429
        course: qrData.nickname, // EINF
        // name já existe, mas podemos validar
      },
    });

    await prisma.notification.create({
      data: {
        userId: doc.userId,
        type: "IN_APP",
        status: "PENDING",
        title: "Perfil Atualizado!",
        message:
          "Seus dados foram extraídos do cartão e atualizados automaticamente.",
        actionType: "view_profile",
      },
    });
  }
}
```

---

## 🟢 PRIORIDADE BAIXA

### 9. Limpeza de Rotas e Páginas Órfãs

**Problema:** Muitas páginas/rotas existem mas não são acessíveis.

**Solução:**

#### 9.1 Auditoria Completa

Criar script para identificar:

```bash
# Páginas sem links
npm run audit:pages

# Rotas API não utilizadas
npm run audit:routes
```

#### 9.2 Páginas Órfãs Identificadas

**Remover se não utilizadas:**

- `/cataloging` - Substituída por modal no admin
- `/search-books` - Já tem em `/home` com busca
- `/recommendations` - Integrar no dashboard

**Adicionar links se necessárias:**

- `/help` - Adicionar no AppShell dropdown
- `/reports` - Adicionar no admin (se supervisor)

---

### 10. Remover Campo de Matrícula para Estudantes

**Problema:** Email já contém a matrícula (20230429@isptec.co.ao).

**Solução:**

#### 10.1 Extrair Matrícula do Email

```typescript
function extractRegistrationNumber(email: string): string | null {
  if (email.endsWith("@isptec.co.ao")) {
    const match = email.match(/^(\d{8})@/);
    return match ? match[1] : null;
  }
  return null;
}

// No cadastro de estudantes
if (userType === "STUDENT") {
  data.registrationNumber = extractRegistrationNumber(email);
}
```

#### 10.2 Remover Campo do Formulário

- [x] Ocultar campo "Número de Matrícula" se `userType === STUDENT`
- [x] Preencher automaticamente do email
- [x] Manter campo para docentes/funcionários (opcional)

---

## 📊 Progresso Geral

### Prioridade ALTA

- [x] Notificações duplicadas (3/3)
- [ ] Fluxo de ativação de conta (0/4)
- [ ] Visualização de reservas (0/2)
- [ ] Gestão administrativa (0/3)

### Prioridade MÉDIA

- [ ] Configurações de sistema (0/3)
- [ ] Extração de QR Code (0/1)

### Prioridade BAIXA

- [ ] Limpeza de rotas (0/2)
- [ ] Campo de matrícula (0/2)

**Total:** 3/20 (15%)

---

## 🚀 Próximas Ações Imediatas

1. **Criar migration para `activationStatus`**

   ```bash
   npx prisma migrate dev --name add_activation_status
   ```

2. **Implementar modelo `TrainingSession`**
   - Schema Prisma
   - Seed data (1 sessão exemplo)

3. **Criar API routes de formação**
   - POST `/api/training/sessions` - Criar sessão
   - GET `/api/training/sessions` - Listar sessões
   - POST `/api/training/sessions/[id]/register` - Registrar presença
   - GET `/api/training/my-sessions` - Sessões do usuário

4. **Criar página admin `/admin/training`**
   - Formulário de nova sessão
   - Lista de sessões agendadas
   - Registrar presença

5. **Adicionar validações de conta ativa**
   - Middleware em `/api/loans`
   - Middleware em `/api/reservations`
   - Mensagem clara: "Complete sua formação para acessar este serviço"

---

## 📝 Notas Adicionais

### Documentos Requeridos por Tipo

✅ Já implementado em `DocumentsManager`:

- **Estudantes:** Cartão de Estudante OU Ficha de Matrícula
- **Professores:** Cartão de Professor
- **Staff:** Cartão de Colaborador

### Dados Extraíveis do QR Code

```
BEGIN:VCARD
VERSION:3.0
UID:20230429                          → registrationNumber
EMAIL:secretaria.academica@isptec.co.ao  → (ignorar)
FN:Emanuel Carneiro dos Santos        → name (validar)
NICKNAME:EINF                         → course
TEL:+244226690449                     → (não é do aluno, ignorar)
END:VCARD
```

---

**Última atualização:** 03/02/2026 22:10  
**Responsável:** Grupo 04 - Engenharia de Software I
