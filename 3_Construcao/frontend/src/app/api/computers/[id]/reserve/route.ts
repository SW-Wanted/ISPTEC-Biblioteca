import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  AccountActivationStatus,
  ComputerStatus,
  ServiceReservationStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
} from "@prisma/client";

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
      const existingSession = await tx.computerSession.findFirst({
        where: { userId: user.id, endTime: null },
        select: { id: true },
      });
      if (existingSession) {
        throw new Error("USER_HAS_ACTIVE_SESSION");
      }

      const existingReservation = await tx.computerReservation.findFirst({
        where: { userId: user.id, status: ServiceReservationStatus.PENDING },
        select: { id: true },
      });
      if (existingReservation) {
        throw new Error("USER_HAS_PENDING_SESSION");
      }

      const computer = await tx.computer.findUnique({
        where: { id },
        select: { id: true, status: true, location: true, number: true },
      });
      if (!computer) throw new Error("NOT_FOUND");
      if (computer.status !== ComputerStatus.AVAILABLE) {
        throw new Error("NOT_AVAILABLE");
      }

      const computerReserved = await tx.computerReservation.findFirst({
        where: {
          computerId: computer.id,
          status: ServiceReservationStatus.PENDING,
        },
        select: { id: true },
      });
      if (computerReserved) {
        throw new Error("COMPUTER_ALREADY_RESERVED");
      }

      await tx.computerReservation.create({
        data: {
          computerId: computer.id,
          userId: user.id,
          status: ServiceReservationStatus.PENDING,
        },
      });

      await tx.computer.update({
        where: { id: computer.id },
        data: { status: ComputerStatus.RESERVED },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Computador reservado!",
          message: `Reserva do computador ${computer.number} enviada. Aguarde a confirmacao do bibliotecario.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = String(error?.message ?? "");
    if (message.includes("USER_HAS_ACTIVE_SESSION")) {
      return NextResponse.json(
        { error: "USER_HAS_ACTIVE_SESSION" },
        { status: 409 },
      );
    }
    if (message.includes("USER_HAS_PENDING_SESSION")) {
      return NextResponse.json(
        { error: "USER_HAS_PENDING_SESSION" },
        { status: 409 },
      );
    }
    if (message.includes("NOT_AVAILABLE")) {
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
    }
    if (message.includes("COMPUTER_ALREADY_RESERVED")) {
      return NextResponse.json(
        { error: "COMPUTER_ALREADY_RESERVED" },
        { status: 409 },
      );
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
