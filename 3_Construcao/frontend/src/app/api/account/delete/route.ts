import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserStatus } from "@prisma/client";

async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      isBlocked: true,
      status: true,
      deletionScheduledAt: true,
    },
  });

  if (!user || user.isBlocked) return null;
  return user;
}

const deleteAccountSchema = z.object({
  action: z.enum(["request_deletion", "cancel_deletion"]),
});

// ---------------------------------------------------------------------------
// POST /api/account/delete — Request or cancel account deletion
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const currentUser = await requireAuthenticatedUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const validation = deleteAccountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: validation.error.issues },
      { status: 400 },
    );
  }

  const { action } = validation.data;

  try {
    if (action === "request_deletion") {
      // Get deletion grace period from system config (default: 30 days)
      let graceDays = 30;
      try {
        const config = await prisma.systemPolicy.findFirst({
          where: { key: "account_deletion_grace_days" },
          select: { value: true },
        });
        if (config?.value) {
          const parsed = parseInt(String(config.value), 10);
          if (!isNaN(parsed) && parsed > 0) graceDays = parsed;
        }
      } catch {
        // Use default
      }

      const now = new Date();
      const scheduledAt = new Date(
        now.getTime() + graceDays * 24 * 60 * 60 * 1000,
      );

      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          status: UserStatus.INACTIVE,
          deletionRequestedAt: now,
          deletionScheduledAt: scheduledAt,
        },
      });

      // Log activity
      try {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: "ACCOUNT_DELETION_REQUESTED",
            description: `Utilizador solicitou eliminação da conta. Prevista para ${scheduledAt.toISOString()}`,
            entity: "User",
            entityId: currentUser.id,
          },
        });
      } catch {
        // Non-critical
      }

      return NextResponse.json({
        message: `Pedido de eliminação registado. A conta será eliminada em ${graceDays} dias.`,
        deletionScheduledAt: scheduledAt.toISOString(),
        graceDays,
      });
    }

    if (action === "cancel_deletion") {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          status: UserStatus.ACTIVE,
          deletionRequestedAt: null,
          deletionScheduledAt: null,
        },
      });

      try {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: "ACCOUNT_DELETION_CANCELLED",
            description: "Utilizador cancelou o pedido de eliminação da conta.",
            entity: "User",
            entityId: currentUser.id,
          },
        });
      } catch {
        // Non-critical
      }

      return NextResponse.json({
        message:
          "Pedido de eliminação cancelado. A sua conta está activa novamente.",
      });
    }

    return NextResponse.json({ error: "Acção inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na gestão de eliminação:", error);
    return NextResponse.json(
      { error: "Erro ao processar pedido" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/account/delete — Check deletion status
// ---------------------------------------------------------------------------
export async function GET() {
  const currentUser = await requireAuthenticatedUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      deletionRequestedAt: true,
      deletionScheduledAt: true,
    },
  });

  return NextResponse.json({
    deletionRequested: !!user?.deletionRequestedAt,
    deletionRequestedAt: user?.deletionRequestedAt?.toISOString() ?? null,
    deletionScheduledAt: user?.deletionScheduledAt?.toISOString() ?? null,
  });
}
