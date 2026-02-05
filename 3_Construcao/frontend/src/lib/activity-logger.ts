import { prisma } from "./prisma";

/**
 * SGBU-011: Sistema centralizado de logging de atividades
 *
 * Este módulo fornece funções helpers para registrar atividades críticas
 * do sistema, conforme especificado na issue SGBU-011.
 *
 * Operações críticas logadas:
 * - Empréstimo de livros (LOAN_CREATED)
 * - Devolução de livros (LOAN_RETURNED)
 * - Renovação de empréstimos (LOAN_RENEWED)
 * - Criação de reservas (RESERVATION_CREATED)
 * - Pagamento de multas (FINE_PAID)
 * - Isenção de multas (FINE_WAIVED)
 *
 * @module activity-logger
 */

/**
 * Interface para dados de log de atividade  * Schema ActivityLog fields:
 * - action: String (CREATE, UPDATE, DELETE)
 * - entity: String (Books, LOAN, USER, RESERVATION, FINE)
 * - entityId: String?
 * - description: String
 * - metadata: Json?
 * - createdAt: DateTime
 */
interface ActivityLogData {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Sanitiza metadados para remover informações sensíveis
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ["password", "token", "secret", "apiKey", "creditCard"];
  const sanitized = { ...metadata };

  for (const key in sanitized) {
    if (
      sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))
    ) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Função genérica para criar log de atividade
 */
async function logActivity(data: ActivityLogData) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        description: data.description,
        metadata: data.metadata ? sanitizeMetadata(data.metadata) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return log;
  } catch (error) {
    console.error("Erro ao criar log de atividade:", error);
    // Não propagar erro para não quebrar operação principal
    return null;
  }
}

// ========================================
// EMPRÉSTIMOS
// ========================================

/**
 * Loga criação de empréstimo
 */
export async function logLoanCreated(params: {
  userId: string;
  loanId: string;
  copyId: string;
  bookTitle: string;
  dueDate: Date;
}) {
  return logActivity({
    userId: params.userId,
    action: "CREATE",
    entity: "LOAN",
    entityId: params.loanId,
    description: `Empréstimo criado: "${params.bookTitle}"`,
    metadata: {
      copyId: params.copyId,
      bookTitle: params.bookTitle,
      dueDate: params.dueDate.toISOString(),
    },
  });
}

/**
 * Loga devolução de livro
 */
export async function logLoanReturned(params: {
  userId: string;
  loanId: string;
  copyId: string;
  wasOverdue: boolean;
  daysOverdue?: number;
}) {
  return logActivity({
    userId: params.userId,
    action: "UPDATE",
    entity: "LOAN",
    entityId: params.loanId,
    description: params.wasOverdue
      ? `Livro devolvido com atraso (${params.daysOverdue} dia(s))`
      : "Livro devolvido dentro do prazo",
    metadata: {
      copyId: params.copyId,
      wasOverdue: params.wasOverdue,
      daysOverdue: params.daysOverdue || 0,
    },
  });
}

/**
 * Loga renovação de empréstimo
 */
export async function logLoanRenewed(params: {
  userId: string;
  loanId: string;
  renewalCount: number;
  newDueDate: Date;
}) {
  return logActivity({
    userId: params.userId,
    action: "UPDATE",
    entity: "LOAN",
    entityId: params.loanId,
    description: `Empréstimo renovado (${params.renewalCount}ª renovação)`,
    metadata: {
      renewalCount: params.renewalCount,
      newDueDate: params.newDueDate.toISOString(),
    },
  });
}

// ========================================
// RESERVAS
// ========================================

/**
 * Loga criação de reserva
 */
export async function logReservationCreated(params: {
  userId: string;
  reservationId: string;
  bookId: string;
  bookTitle: string;
  queuePosition: number;
}) {
  return logActivity({
    userId: params.userId,
    action: "CREATE",
    entity: "RESERVATION",
    entityId: params.reservationId,
    description: `Reserva criada: "${params.bookTitle}" (posição na fila: ${params.queuePosition})`,
    metadata: {
      bookId: params.bookId,
      bookTitle: params.bookTitle,
      queuePosition: params.queuePosition,
    },
  });
}

/**
 * Loga cancelamento de reserva
 */
export async function logReservationCancelled(params: {
  userId: string;
  reservationId: string;
  reason: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "DELETE",
    entity: "RESERVATION",
    entityId: params.reservationId,
    description: `Reserva cancelada: ${params.reason}`,
    metadata: {
      reason: params.reason,
    },
  });
}

// ========================================
// MULTAS
// ========================================

/**
 * Loga pagamento de multa
 */
export async function logFinePaid(params: {
  userId: string;
  fineId: string;
  amount: number;
  paymentMethod?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "UPDATE",
    entity: "FINE",
    entityId: params.fineId,
    description: `Multa paga: ${params.amount.toFixed(2)} Kz`,
    metadata: {
      amount: params.amount,
      paymentMethod: params.paymentMethod || "Não especificado",
    },
  });
}

/**
 * Loga isenção de multa
 */
export async function logFineWaived(params: {
  userId: string; // Admin que isentou
  targetUserId: string; // Utilizador que tinha a multa
  fineId: string;
  amount: number;
  reason: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "UPDATE",
    entity: "FINE",
    entityId: params.fineId,
    description: `Multa isentada para utilizador ${params.targetUserId}: ${params.reason}`,
    metadata: {
      targetUserId: params.targetUserId,
      amount: params.amount,
      reason: params.reason,
    },
  });
}

// ========================================
// QUERY HELPER
// ========================================

/**
 * Busca logs de atividade com filtros
 */
export async function getActivityLogs(params?: {
  userId?: string;
  type?: string; // filter action field
  entityType?: string; // filter entity field
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (params?.userId) where.userId = params.userId;
  if (params?.type)
    where.action = { contains: params.type, mode: "insensitive" };
  if (params?.entityType) where.entity = params.entityType;

  if (params?.startDate || params?.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  try {
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: params?.limit || 50,
      skip: params?.offset || 0,
    });

    return logs;
  } catch (error) {
    console.error("Erro ao buscar logs de atividade:", error);
    return [];
  }
}
