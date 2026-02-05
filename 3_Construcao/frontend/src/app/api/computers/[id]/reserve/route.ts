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
import { getSystemPolicyNumber } from "@/lib/settings-config";

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
      const existingSession = await tx.computerSession.findFirst({
        where: { userId: user.id, endTime: null },
        select: { id: true },
      });
      if (existingSession) {
        throw new Error("USER_HAS_ACTIVE_SESSION");
      }

      const computer = await tx.computer.findUnique({
        where: { id },
        select: { id: true, status: true, location: true, number: true },
      });
      if (!computer) throw new Error("NOT_FOUND");
      if (computer.status !== ComputerStatus.AVAILABLE) {
        throw new Error("NOT_AVAILABLE");
      }

      const expectedEnd = new Date(Date.now() + sessionHours * 60 * 60 * 1000);

      await tx.computerSession.create({
        data: {
          computerId: computer.id,
          userId: user.id,
          expectedEnd,
        },
      });

      await tx.computer.update({
        where: { id: computer.id },
        data: { status: ComputerStatus.OCCUPIED },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Computador reservado!",
          message: `Computador ${computer.number} no ${computer.location} reservado por ${sessionHours} horas. Faca check-in no balcao.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("USER_HAS_ACTIVE_SESSION")) {
      return NextResponse.json(
        { error: "USER_HAS_ACTIVE_SESSION" },
        { status: 409 },
      );
    }
    if (message.includes("NOT_AVAILABLE")) {
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
    }
    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Erro ao reservar computador" },
      { status: 500 },
    );
  }
}
