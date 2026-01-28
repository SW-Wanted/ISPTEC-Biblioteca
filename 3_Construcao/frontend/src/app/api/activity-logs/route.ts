import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { UserStatus, UserType } from "@prisma/client"
import { toIso } from "@/lib/sgbu-rules"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, type: true, status: true, isBlocked: true },
  })

  if (!user) return null
  if (user.status !== UserStatus.ACTIVE || user.isBlocked) return null
  if (user.type !== UserType.SUPERVISOR && user.type !== UserType.LIBRARIAN) return null

  return user
}

export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  
  // Parâmetros de filtro
  const userId = searchParams.get("userId") || undefined
  const action = searchParams.get("action") || undefined
  const entity = searchParams.get("entity") || undefined
  const startDate = searchParams.get("startDate") || undefined
  const endDate = searchParams.get("endDate") || undefined
  
  // Parâmetros de paginação
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
  const skip = (page - 1) * limit

  // Construir filtros
  const where: Record<string, unknown> = {}
  
  if (userId) {
    where.userId = userId
  }
  
  if (action) {
    where.action = action
  }
  
  if (entity) {
    where.entity = entity
  }
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    }
  }

  // Buscar logs
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            type: log.user.type.toLowerCase(),
          }
        : null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: toIso(log.createdAt),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
