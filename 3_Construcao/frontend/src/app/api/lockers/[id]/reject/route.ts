import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  AccountActivationStatus,
  LockerStatus,
  NotificationStatus,
  NotificationType,
  ServiceReservationStatus,
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

  if (!canManageMembers(user.type)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.lockerReservation.findFirst({
        where: {
          lockerId: id,
          status: ServiceReservationStatus.PENDING,
        },
        orderBy: { requestedAt: "asc" },
        select: {
          id: true,
          userId: true,
          locker: { select: { id: true, number: true, status: true } },
        },
      });

      if (!reservation) {
        throw new Error("NO_PENDING_RESERVATION");
      }

      const updateResult = await tx.lockerReservation.updateMany({
        where: {
          id: reservation.id,
          status: ServiceReservationStatus.PENDING,
        },
        data: {
          status: ServiceReservationStatus.REJECTED,
          rejectedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("RESERVATION_NOT_PENDING");
      }

      if (reservation.locker.status === LockerStatus.RESERVED) {
        await tx.locker.update({
          where: { id: reservation.locker.id },
          data: { status: LockerStatus.AVAILABLE },
        });
      }

      await tx.notification.create({
        data: {
          userId: reservation.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Reserva de cacifo rejeitada",
          message: `A tua reserva do cacifo ${reservation.locker.number} foi rejeitada.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = String(error?.message ?? "");
    if (message.includes("NO_PENDING_RESERVATION")) {
      return NextResponse.json(
        { error: "NO_PENDING_RESERVATION" },
        { status: 404 },
      );
    }
    if (message.includes("RESERVATION_NOT_PENDING")) {
      return NextResponse.json(
        { error: "RESERVATION_NOT_PENDING" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao rejeitar reserva" },
      { status: 500 },
    );
  }
}
