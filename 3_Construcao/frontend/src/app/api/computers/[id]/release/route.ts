import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  AccountActivationStatus,
  ComputerStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
} from "@prisma/client";

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

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.computerSession.findFirst({
        where: { computerId: id, endTime: null },
        select: {
          id: true,
          userId: true,
          computer: { select: { id: true, number: true } },
        },
      });

      if (!session) {
        throw new Error("NOT_FOUND");
      }

      const isOwner = session.userId === user.id;
      if (!isOwner && !canManageMembers(user.type)) {
        throw new Error("FORBIDDEN");
      }

      await tx.computerSession.update({
        where: { id: session.id },
        data: { endTime: new Date() },
      });

      await tx.computer.update({
        where: { id: session.computer.id },
        data: { status: ComputerStatus.AVAILABLE },
      });

      await tx.notification.create({
        data: {
          userId: session.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Sessao encerrada",
          message: `A sua sessao no computador ${session.computer.number} foi encerrada.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = String(error?.message ?? "");
    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao encerrar sessao" },
      { status: 500 },
    );
  }
}
