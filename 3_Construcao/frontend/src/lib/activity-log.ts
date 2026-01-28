import { prisma } from "@/lib/prisma"

/**
 * Tipos de ação para o log de atividades
 */
export type ActivityAction =
  | "LOAN_CREATED"
  | "LOAN_RETURNED"
  | "LOAN_RENEWED"
  | "RESERVATION_CREATED"
  | "RESERVATION_CANCELLED"
  | "FINE_PAID"
  | "FINE_WAIVED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "BOOK_CREATED"
  | "BOOK_UPDATED"
  | "BOOK_DELETED"

/**
 * Tipos de entidade no sistema
 */
export type ActivityEntity = "LOAN" | "RESERVATION" | "FINE" | "BOOK" | "USER" | "NOTIFICATION"

/**
 * Interface para os dados de log de atividade
 */
export interface ActivityLogData {
  userId?: string | null
  action: ActivityAction
  entity: ActivityEntity
  entityId?: string | null
  description: string
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Campos sensíveis que não devem ser incluídos nos logs
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "qrCode",
]

/**
 * Remove campos sensíveis de um objeto recursivamente
 */
function sanitizeMetadata(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata)
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      // Verifica se a chave contém algum campo sensível
      const isSensitive = SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))

      if (isSensitive) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = sanitizeMetadata(value)
      }
    }
    return sanitized
  }

  return data
}

/**
 * Registra uma atividade no log de auditoria
 * 
 * @param data - Dados da atividade a ser registrada
 * @returns Promise com o ID do log criado ou null em caso de erro
 * 
 * @example
 * ```typescript
 * await logActivity({
 *   userId: user.id,
 *   action: "LOAN_CREATED",
 *   entity: "LOAN",
 *   entityId: loan.id,
 *   description: "Empréstimo criado para o livro 'Clean Code'",
 *   metadata: {
 *     bookId: book.id,
 *     bookTitle: book.title,
 *     dueDate: loan.dueDate,
 *   },
 * })
 * ```
 */
export async function logActivity(data: ActivityLogData): Promise<string | null> {
  try {
    // Sanitiza metadata para remover dados sensíveis
    const sanitizedMetadata = data.metadata ? sanitizeMetadata(data.metadata) : null

    // Cria o registro no banco
    const log = await prisma.activityLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        description: data.description,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: sanitizedMetadata as Record<string, unknown> | null,
      },
    })

    return log.id
  } catch (error) {
    // Log do erro sem interromper o fluxo principal
    console.error("Failed to log activity:", error)
    return null
  }
}

/**
 * Helper para extrair IP e User-Agent do request (Next.js)
 */
export function getRequestMetadata(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const headers = request.headers

  // Tenta obter o IP real do cliente (considerando proxies)
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null

  const userAgent = headers.get("user-agent") || null

  return { ipAddress, userAgent }
}
