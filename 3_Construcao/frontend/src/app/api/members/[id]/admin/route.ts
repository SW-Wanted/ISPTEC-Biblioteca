import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AccountActivationStatus,
  FineType,
  UserStatus,
  UserType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_TYPES: UserType[] = [UserType.LIBRARIAN, UserType.SUPERVISOR];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, type: true, isBlocked: true, name: true },
  });

  if (!user || user.isBlocked) return null;
  if (!ADMIN_TYPES.includes(user.type)) return null;

  return user;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const adminUpdateSchema = z.object({
  action: z.enum([
    "activate",
    "deactivate",
    "block",
    "unblock",
    "change_role",
    "apply_fine",
  ]),

  // For change_role
  newRole: z
    .enum([
      "STUDENT",
      "TEACHER",
      "STAFF",
      "LIBRARIAN",
      "CATALOGER",
      "SUPERVISOR",
    ])
    .optional(),

  // For block
  reason: z.string().min(1).max(500).optional(),

  // For apply_fine
  fineAmount: z.number().positive().optional(),
  fineReason: z.string().min(1).max(500).optional(),
  fineType: z
    .enum([
      "LATE_RETURN",
      "LOCKER_OVERTIME",
      "LOST_CREDENTIAL",
      "DAMAGED_BOOK",
      "LOST_BOOK",
    ])
    .optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/members/[id]/admin — Admin member management
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id: memberId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  const validation = adminUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: validation.error.issues },
      { status: 400 },
    );
  }

  const { action, newRole, reason, fineAmount, fineReason, fineType } =
    validation.data;

  // Find target member
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      status: true,
      activationStatus: true,
      isBlocked: true,
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Membro não encontrado" },
      { status: 404 },
    );
  }

  // Prevent admin from modifying themselves
  if (member.id === admin.id) {
    return NextResponse.json(
      { error: "Não pode modificar a sua própria conta" },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case "activate": {
        await prisma.user.update({
          where: { id: memberId },
          data: {
            status: UserStatus.ACTIVE,
            activationStatus: AccountActivationStatus.ACTIVE,
            isBlocked: false,
            blockedReason: null,
            blockedAt: null,
          },
        });

        await logActivity(
          admin.id,
          "MEMBER_ACTIVATED",
          `Admin ${admin.name} activou a conta de ${member.name} (${member.email})`,
          memberId,
        );

        return NextResponse.json({
          message: `Conta de ${member.name} activada com sucesso`,
        });
      }

      case "deactivate": {
        await prisma.user.update({
          where: { id: memberId },
          data: {
            status: UserStatus.INACTIVE,
            activationStatus: AccountActivationStatus.PENDING_DOCUMENTS,
          },
        });

        await logActivity(
          admin.id,
          "MEMBER_DEACTIVATED",
          `Admin ${admin.name} desactivou a conta de ${member.name} (${member.email})`,
          memberId,
        );

        return NextResponse.json({
          message: `Conta de ${member.name} desactivada`,
        });
      }

      case "block": {
        if (!reason) {
          return NextResponse.json(
            { error: "Motivo do bloqueio é obrigatório" },
            { status: 400 },
          );
        }

        await prisma.user.update({
          where: { id: memberId },
          data: {
            isBlocked: true,
            blockedReason: reason,
            blockedAt: new Date(),
            status: UserStatus.BLOCKED,
            activationStatus: AccountActivationStatus.BLOCKED,
          },
        });

        await logActivity(
          admin.id,
          "MEMBER_BLOCKED",
          `Admin ${admin.name} bloqueou ${member.name}: ${reason}`,
          memberId,
        );

        return NextResponse.json({
          message: `${member.name} bloqueado: ${reason}`,
        });
      }

      case "unblock": {
        await prisma.user.update({
          where: { id: memberId },
          data: {
            isBlocked: false,
            blockedReason: null,
            blockedAt: null,
            status: UserStatus.ACTIVE,
            activationStatus: AccountActivationStatus.ACTIVE,
          },
        });

        await logActivity(
          admin.id,
          "MEMBER_UNBLOCKED",
          `Admin ${admin.name} desbloqueou ${member.name} (${member.email})`,
          memberId,
        );

        return NextResponse.json({
          message: `${member.name} desbloqueado com sucesso`,
        });
      }

      case "change_role": {
        if (!newRole) {
          return NextResponse.json(
            { error: "Novo cargo é obrigatório" },
            { status: 400 },
          );
        }

        // Only supervisors can promote to admin roles
        if (
          ["LIBRARIAN", "CATALOGER", "SUPERVISOR"].includes(newRole) &&
          admin.type !== UserType.SUPERVISOR
        ) {
          return NextResponse.json(
            {
              error:
                "Apenas supervisores podem atribuir cargos administrativos",
            },
            { status: 403 },
          );
        }

        await prisma.user.update({
          where: { id: memberId },
          data: { type: newRole as UserType },
        });

        await logActivity(
          admin.id,
          "MEMBER_ROLE_CHANGED",
          `Admin ${admin.name} alterou cargo de ${member.name}: ${member.type} → ${newRole}`,
          memberId,
        );

        return NextResponse.json({
          message: `Cargo de ${member.name} alterado para ${newRole}`,
        });
      }

      case "apply_fine": {
        if (!fineAmount || !fineReason) {
          return NextResponse.json(
            { error: "Valor e motivo da multa são obrigatórios" },
            { status: 400 },
          );
        }

        const fine = await prisma.fine.create({
          data: {
            userId: memberId,
            amount: fineAmount,
            reason: fineReason,
            type: (fineType as FineType) || FineType.LATE_RETURN,
            status: "PENDING",
          },
        });

        // Update user total fines
        await prisma.user.update({
          where: { id: memberId },
          data: {
            totalFines: { increment: fineAmount },
          },
        });

        await logActivity(
          admin.id,
          "FINE_APPLIED",
          `Admin ${admin.name} aplicou multa de ${fineAmount} Kz a ${member.name}: ${fineReason}`,
          memberId,
        );

        return NextResponse.json({
          message: `Multa de ${fineAmount} Kz aplicada a ${member.name}`,
          fine: { id: fine.id, amount: fineAmount },
        });
      }

      default:
        return NextResponse.json({ error: "Acção inválida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Erro na gestão de membro:", error);
    return NextResponse.json(
      { error: "Erro ao processar acção" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Activity logging helper
// ---------------------------------------------------------------------------

async function logActivity(
  userId: string,
  action: string,
  description: string,
  targetId: string,
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        description,
        entity: "User",
        entityId: targetId,
      },
    });
  } catch (err) {
    console.error("Erro ao registar log de actividade:", err);
  }
}
