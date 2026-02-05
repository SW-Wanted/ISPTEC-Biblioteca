/**
 * Helper centralizado para Activity Logging - SGBU-011
 * Sistema de Gestão de Biblioteca Universitária - ISPTEC
 *
 * Registra operações críticas para auditoria e rastreabilidade
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Tipos de atividades críticas que devem ser logadas
 */
export type ActivityType =
  | "LOAN_CREATED" // Empréstimo criado
  | "LOAN_RETURNED" // Devolução realizada
  | "LOAN_RENEWED" // Renovação realizada
  | "RESERVATION_CREATED" // Reserva criada
  | "RESERVATION_COLLECTED" // Reserva levantada
  | "RESERVATION_CANCELLED" // Reserva cancelada
  | "FINE_GENERATED" // Multa gerada
  | "FINE_PAID" // Multa paga
  | "FINE_WAIVED" // Multa isentada
  | "FINE_CANCELLED" // Multa cancelada
  | "USER_BLOCKED" // Usuário bloqueado
  | "USER_UNBLOCKED" // Usuário desbloqueado
  | "CATALOG_APPROVED" // Catalogação aprovada
  | "CATALOG_REJECTED"; // Catalogação rejeitada

/**
 * Interface para dados do log de atividade
 */
export interface ActivityLogData {
  userId: string;
  activityType: ActivityType;
  description: string;
  entityType?: string; // "Loan", "Fine", "Reservation", etc
  entityId?: string; // ID da entidade relacionada
  metadata?: Record<string, any>; // Dados adicionais (sem dados sensíveis!)
  ipAddress?: string;
}

/**
 * Cria um registro de atividade no banco de dados
 *
 * **IMPORTANTE:**
 * - NÃO inclua dados sensíveis no metadata (senhas, tokens, etc)
 * - Use descriptions claras e em português
 * - Sempre passe userId do usuário que executou a ação
 *
 * @param data - Dados da atividade a ser logada
 * @returns Promise com o log criado ou null se falhar
 */
export async function logActivity(data: ActivityLogData): Promise<{
  id: string;
  timestamp: Date;
} | null> {
  try {
    // Sanitizar metadata para remover dados sensíveis
    const sanitizedMetadata = sanitizeMetadata(data.metadata || {});

    const log = await prisma.activityLog.create({
      data: {
        userId: data.userId,
        activityType: data.activityType,
        description: data.description,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: sanitizedMetadata as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      },
      select: {
        id: true,
        timestamp: true,
      },
    });

    return log;
  } catch (error) {
    // Não propagar erro para não quebrar a operação principal
    console.error("❌ Erro ao criar activity log:", error);
    return null;
  }
}

/**
 * Remove dados sensíveis do metadata antes de salvar
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
    "ssn",
    "taxId",
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // Remover chaves sensíveis
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Sanitizar recursivamente objetos aninhados
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Helper para logar criação de empréstimo
 */
export async function logLoanCreated(params: {
  userId: string;
  loanId: string;
  bookTitle: string;
  dueDate: Date;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "LOAN_CREATED",
    description: `Empréstimo criado: "${params.bookTitle}" (vencimento: ${params.dueDate.toLocaleDateString("pt-AO")})`,
    entityType: "Loan",
    entityId: params.loanId,
    metadata: {
      bookTitle: params.bookTitle,
      dueDate: params.dueDate.toISOString(),
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper para logar devolução
 */
export async function logLoanReturned(params: {
  userId: string;
  loanId: string;
  bookTitle: string;
  returnDate: Date;
  wasOverdue: boolean;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "LOAN_RETURNED",
    description: `Devolução realizada: "${params.bookTitle}"${params.wasOverdue ? " (estava em atraso)" : ""}`,
    entityType: "Loan",
    entityId: params.loanId,
    metadata: {
      bookTitle: params.bookTitle,
      returnDate: params.returnDate.toISOString(),
      wasOverdue: params.wasOverdue,
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper para logar renovação
 */
export async function logLoanRenewed(params: {
  userId: string;
  loanId: string;
  bookTitle: string;
  newDueDate: Date;
  renewalCount: number;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "LOAN_RENEWED",
    description: `Renovação ${params.renewalCount}: "${params.bookTitle}" (novo vencimento: ${params.newDueDate.toLocaleDateString("pt-AO")})`,
    entityType: "Loan",
    entityId: params.loanId,
    metadata: {
      bookTitle: params.bookTitle,
      newDueDate: params.newDueDate.toISOString(),
      renewalCount: params.renewalCount,
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper para logar reserva
 */
export async function logReservationCreated(params: {
  userId: string;
  reservationId: string;
  bookTitle: string;
  queuePosition: number;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "RESERVATION_CREATED",
    description: `Reserva criada: "${params.bookTitle}" (posição na fila: ${params.queuePosition})`,
    entityType: "Reservation",
    entityId: params.reservationId,
    metadata: {
      bookTitle: params.bookTitle,
      queuePosition: params.queuePosition,
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper para logar multa paga
 */
export async function logFinePaid(params: {
  userId: string;
  fineId: string;
  amount: number;
  paymentMethod?: string;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "FINE_PAID",
    description: `Multa paga: ${params.amount} Kz${params.paymentMethod ? ` (${params.paymentMethod})` : ""}`,
    entityType: "Fine",
    entityId: params.fineId,
    metadata: {
      amount: params.amount,
      paymentMethod: params.paymentMethod,
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper para logar multa isentada
 */
export async function logFineWaived(params: {
  userId: string; // Usuário que executou a isenção (admin)
  targetUserId: string; // Usuário que tinha a multa
  fineId: string;
  amount: number;
  reason: string;
  ipAddress?: string;
}) {
  return logActivity({
    userId: params.userId,
    activityType: "FINE_WAIVED",
    description: `Multa isentada para usuário ${params.targetUserId}: ${params.amount} Kz (motivo: ${params.reason})`,
    entityType: "Fine",
    entityId: params.fineId,
    metadata: {
      targetUserId: params.targetUserId,
      amount: params.amount,
      reason: params.reason,
    },
    ipAddress: params.ipAddress,
  });
}

/**
 * Helper genérico para outras atividades
 */
export async function logGenericActivity(params: {
  userId: string;
  type: ActivityType;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}) {
  return logActivity(params);
}

/**
 * Busca logs de atividade com filtros
 */
export async function getActivityLogs(params: {
  userId?: string;
  activityTypes?: ActivityType[];
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.ActivityLogWhereInput = {};

  if (params.userId) where.userId = params.userId;
  if (params.activityTypes && params.activityTypes.length > 0) {
    where.activityType = { in: params.activityTypes };
  }
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) where.timestamp.gte = params.startDate;
    if (params.endDate) where.timestamp.lte = params.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, total };
}
