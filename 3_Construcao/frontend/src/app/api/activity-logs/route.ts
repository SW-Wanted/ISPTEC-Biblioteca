import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivityLogs } from "@/lib/activity-logger";
import { UserType } from "@prisma/client";

/**
 * GET /api/activity-logs
 *
 * Retorna logs de atividade do sistema (audit trail).
 * Apenas ADMIN e LIBRARIAN podem acessar.
 *
 * Query params:
 * - userId: Filtrar por usuário específico
 * - type: Filtrar por tipo de atividade (ActivityType enum)
 * - startDate: Data inicial (ISO string)
 * - endDate: Data final (ISO string)
 * - limit: Limite de registros (padrão: 50, máx: 500)
 * - offset: Paginação offset (padrão: 0)
 *
 * @returns Lista de ActivityLog com metadados
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação e autorização
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Apenas LIBRARIAN, CATALOGER e SUPERVISOR podem ver logs de atividade
    const user = await prisma?.user.findUnique({
      where: { id: session.user.id },
      select: { type: true },
    });

    if (!user || ![UserType.LIBRARIAN, UserType.CATALOGER, UserType.SUPERVISOR].includes(user.type)) {
      return NextResponse.json(
        { error: "Sem permissão para acessar logs de atividade" },
        { status: 403 },
      );
    }

    // 2. Validar query parameters
    const searchParams = request.nextUrl.searchParams;

    const querySchema = z.object({
      userId: z.string().optional(),
      type: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    });

    const parsed = querySchema.safeParse({
      userId: searchParams.get("userId") || undefined,
      type: searchParams.get("type") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const filters = parsed.data;

    // 3. Buscar logs com helper
    const logs = await getActivityLogs({
      userId: filters.userId,
      type: filters.type,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit,
      offset: filters.offset,
    });

    // 4. Retornar resposta
    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user.name,
        userEmail: log.user.email,
        type: log.type,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: {
        limit: filters.limit,
        offset: filters.offset,
        count: logs.length,
        hasMore: logs.length === filters.limit,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar logs de atividade:", error);
    return NextResponse.json(
      { error: "Erro ao buscar logs de atividade" },
      { status: 500 },
    );
  }
}

/**
 * Tipos exportados para o frontend
 */
export type ActivityLogDTO = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ActivityLogsResponse = {
  logs: ActivityLogDTO[];
  meta: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};
