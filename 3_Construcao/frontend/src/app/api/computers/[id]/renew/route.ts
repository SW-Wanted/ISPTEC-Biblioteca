import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  AccountActivationStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
} from "@prisma/client";
import { getSystemPolicyNumber } from "@/lib/settings-config";

function canManageMembers(type: string | null | undefined) {
  return type === "SUPERVISOR" || type === "LIBRARIAN" || type === "STAFF";
}

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      type: true,
      status: true,
      activationStatus: true,
      isBlocked: true,
    },
  });

  if (!user) return null;
  const isBlocked =
    user.isBlocked ||
    user.status === UserStatus.BLOCKED ||
    user.status === UserStatus.INACTIVE ||
    user.activationStatus === AccountActivationStatus.BLOCKED;
  if (isBlocked) return null;

  return user;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const sessionHours = await getSystemPolicyNumber("COMPUTER_SESSION_HOURS", 2);

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.computerSession.findFirst({
        where: { computerId: id, endTime: null },
        select: {
          id: true,
          userId: true,
          expectedEnd: true,
          renewalCount: true,
          maxRenewals: true,
          computer: { select: { number: true } },
        },
      });

      if (!session) throw new Error("NOT_FOUND");

      const isOwner = session.userId === user.id;
      if (!isOwner && !canManageMembers(user.type)) {
        throw new Error("FORBIDDEN");
      }

      if (session.renewalCount >= session.maxRenewals) {
        throw new Error("Limite máximo de renovação do computador atingido!");
      }

      const newExpectedEnd = new Date(
        session.expectedEnd.getTime() + sessionHours * 60 * 60 * 1000,
      );

      await tx.computerSession.update({
        where: { id: session.id },
        data: {
          expectedEnd: newExpectedEnd,
          renewalCount: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: session.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Sessao renovada",
          message: `A sua sessao foi renovada por mais ${sessionHours} horas. Novo termino: ${newExpectedEnd.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (message.includes("RENEWAL_LIMIT")) {
      return NextResponse.json({ error: "RENEWAL_LIMIT" }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Erro ao renovar sessao" },
      { status: 500 },
    );
  }
}
