import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserType, Prisma } from "@prisma/client";

// Validação de autorização
async function requireSettingsAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, type: true },
  });

  const isAdmin =
    user &&
    [UserType.SUPERVISOR, UserType.LIBRARIAN, UserType.STAFF].includes(
      user.type as any,
    );
  if (!isAdmin) return null;

  return user;
}

// GET: Listar histórico de alterações
export async function GET(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let audits: Array<{
      id: string;
      configKey: string;
      oldValue: string | null;
      newValue: string;
      changedAt: Date;
      ipAddress: string | null;
      reason: string | null;
      user: { id: string; name: string; email: string };
    }> = [];
    let total = 0;

    try {
      [audits, total] = await Promise.all([
        prisma.configurationAudit.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { changedAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.configurationAudit.count(),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        return NextResponse.json({
          audits: [],
          pagination: {
            limit,
            offset,
            total: 0,
            totalPages: 0,
          },
        });
      }
      throw error;
    }

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        configKey: a.configKey,
        oldValue: a.oldValue,
        newValue: a.newValue,
        changedBy: a.user,
        changedAt: a.changedAt.toISOString(),
        ipAddress: a.ipAddress,
        reason: a.reason,
      })),
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar histórico de auditoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
