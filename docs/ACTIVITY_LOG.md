# ActivityLog / Auditoria - SGBU

## Visão Geral

O sistema de ActivityLog (Auditoria) implementa rastreabilidade completa de ações críticas no Sistema de Gestão de Biblioteca Universitária (SGBU) do ISPTEC.

## Funcionalidades

### 1. Rastreamento Automático

Todas as operações críticas são automaticamente registadas:

- ✅ **Empréstimos** - Criação, devolução e renovação
- ✅ **Reservas** - Criação e cancelamento
- ✅ **Multas** - Pagamento e isenção

### 2. Segurança e Privacidade

- Dados sensíveis são automaticamente redactados (`[REDACTED]`)
- Campos protegidos: `password`, `token`, `secret`, `apiKey`, `qrCode`
- Sanitização recursiva de objetos aninhados

### 3. Interface Administrativa

Acesso em: `/admin-dashboard/activity-logs`

**Permissões**: Apenas SUPERVISOR e LIBRARIAN

**Filtros disponíveis**:
- Por tipo de ação
- Por entidade
- Por utilizador
- Por intervalo de datas

**Paginação**: 50 registos por página

## Uso Programático

### Helper Function

```typescript
import { logActivity, getRequestMetadata } from "@/lib/activity-log"

// Exemplo básico
await logActivity({
  userId: user.id,
  action: "LOAN_CREATED",
  entity: "LOAN",
  entityId: loan.id,
  description: "Empréstimo criado para o livro 'Clean Code'",
  metadata: {
    bookId: book.id,
    bookTitle: book.title,
    dueDate: loan.dueDate,
  },
})

// Com informações de request (Next.js API Route)
const { ipAddress, userAgent } = getRequestMetadata(request)
await logActivity({
  userId: user.id,
  action: "FINE_PAID",
  entity: "FINE",
  entityId: fineId,
  description: "Multa paga",
  ipAddress,
  userAgent,
  metadata: {
    amount: fineAmount,
    paymentMethod: "CASH",
  },
})
```

### Tipos de Ação Disponíveis

```typescript
type ActivityAction =
  | "LOAN_CREATED"       // Empréstimo criado
  | "LOAN_RETURNED"      // Empréstimo devolvido
  | "LOAN_RENEWED"       // Empréstimo renovado
  | "RESERVATION_CREATED" // Reserva criada
  | "RESERVATION_CANCELLED" // Reserva cancelada
  | "FINE_PAID"          // Multa paga
  | "FINE_WAIVED"        // Multa isenta
  | "USER_LOGIN"         // Login de utilizador
  | "USER_LOGOUT"        // Logout de utilizador
  | "BOOK_CREATED"       // Livro criado
  | "BOOK_UPDATED"       // Livro atualizado
  | "BOOK_DELETED"       // Livro eliminado
```

### Tipos de Entidade

```typescript
type ActivityEntity = 
  | "LOAN"           // Empréstimo
  | "RESERVATION"    // Reserva
  | "FINE"           // Multa
  | "BOOK"           // Livro
  | "USER"           // Utilizador
  | "NOTIFICATION"   // Notificação
```

## API Endpoints

### GET /api/activity-logs

Consulta logs de atividade com filtros e paginação.

**Query Parameters**:
- `page` (number): Número da página (padrão: 1)
- `limit` (number): Registos por página (padrão: 50, máx: 100)
- `userId` (string): Filtrar por ID do utilizador
- `action` (string): Filtrar por tipo de ação
- `entity` (string): Filtrar por tipo de entidade
- `startDate` (ISO string): Data inicial
- `endDate` (ISO string): Data final

**Resposta**:
```json
{
  "logs": [
    {
      "id": "cm81gk5ko0001lct4gjlozalp",
      "userId": "cm7x...",
      "user": {
        "id": "cm7x...",
        "name": "João Silva",
        "email": "joao.silva@isptec.ao",
        "type": "student"
      },
      "action": "LOAN_CREATED",
      "entity": "LOAN",
      "entityId": "cm81...",
      "description": "Empréstimo criado para o livro ID book-123",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "metadata": {
        "bookId": "book-123",
        "dueDate": "2026-02-05T19:10:00.000Z"
      },
      "createdAt": "2026-01-28T19:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Estrutura do Banco de Dados

### Modelo ActivityLog (Prisma)

```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String?
  
  action      String   // Tipo de ação
  entity      String   // Tipo de entidade
  entityId    String?  // ID da entidade afetada
  
  description String   // Descrição legível
  ipAddress   String?  // IP do cliente
  userAgent   String?  // User-Agent do navegador
  
  metadata    Json?    // Dados adicionais (sanitizados)
  
  createdAt   DateTime @default(now())
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
}
```

## Boas Práticas

### 1. Sempre registar operações críticas
```typescript
// ✅ BOM
await logActivity({
  userId: user.id,
  action: "LOAN_RETURNED",
  entity: "LOAN",
  entityId: loanId,
  description: "Devolução de empréstimo realizada",
  metadata: { daysOverdue: 3 }
})

// ❌ EVITAR - Não registar operações críticas
await prisma.loan.update({ where: { id }, data: { status: "RETURNED" } })
// Sem log!
```

### 2. Incluir contexto relevante nos metadados
```typescript
// ✅ BOM - Metadados úteis
metadata: {
  bookId: book.id,
  bookTitle: book.title,
  userId: user.id,
  userName: user.name,
  dueDate: loan.dueDate.toISOString()
}

// ⚠️ OK - Metadados básicos
metadata: {
  bookId: book.id,
  userId: user.id
}

// ❌ EVITAR - Metadados inúteis ou sensíveis
metadata: {
  password: user.password,  // Será redactado automaticamente
  unnecessary: "data"
}
```

### 3. Usar descrições claras
```typescript
// ✅ BOM
description: "Empréstimo renovado pela 2ª vez"

// ⚠️ OK
description: "Renovação de empréstimo"

// ❌ EVITAR
description: "Update"
```

### 4. Não interromper operações principais
```typescript
// A função logActivity() captura erros internamente
// e retorna null em caso de falha, para não interromper
// o fluxo principal da aplicação

const logId = await logActivity({ /* ... */ })
// logId será null se falhar, mas a operação principal continua
```

## Manutenção

### Limpeza de Logs Antigos

Para manter a performance do banco de dados, considere implementar uma rotina de limpeza de logs antigos (ex: após 1 ano).

```typescript
// Exemplo de limpeza (executar via cron job)
await prisma.activityLog.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 ano atrás
    }
  }
})
```

### Monitoramento

Monitore regularmente:
- Volume de logs por dia
- Tipos de ação mais comuns
- Utilizadores com mais atividade
- Tentativas de acesso não autorizado

## Conformidade RUPE

Este sistema de auditoria está alinhado com as boas práticas da metodologia RUPE:
- ✅ Rastreabilidade completa
- ✅ Segurança e privacidade
- ✅ Documentação técnica
- ✅ Interface administrativa

## Suporte

Para questões ou problemas relacionados ao sistema de ActivityLog:
- **Equipa**: Grupo 04 - Engenharia Informática ISPTEC
- **Disciplina**: Engenharia de Software I
- **Docente**: Judson Quissanga Coge Paiva

---

**Última atualização**: Janeiro 2026  
**Versão**: 1.0
