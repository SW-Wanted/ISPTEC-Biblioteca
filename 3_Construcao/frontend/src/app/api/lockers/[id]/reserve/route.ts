import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  LockerStatus,
  ServiceReservationStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
  AccountActivationStatus,
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
      const existingRental = await tx.lockerRental.findFirst({
        where: { userId: user.id, endTime: null },
        select: { id: true },
      });

      if (existingRental) {
        throw new Error("USER_HAS_ACTIVE_LOCKER");
      }

      const existingReservation = await tx.lockerReservation.findFirst({
        where: { userId: user.id, status: ServiceReservationStatus.PENDING },
        select: { id: true },
      });

      if (existingReservation) {
        throw new Error("USER_HAS_PENDING_LOCKER");
      }

      const locker = await tx.locker.findUnique({
        where: { id },
        select: { id: true, status: true, number: true, location: true },
      });

      if (!locker) throw new Error("NOT_FOUND");
      if (locker.status !== LockerStatus.AVAILABLE) {
        throw new Error("NOT_AVAILABLE");
      }

      const lockerReserved = await tx.lockerReservation.findFirst({
        where: {
          lockerId: locker.id,
          status: ServiceReservationStatus.PENDING,
        },
        select: { id: true },
      });

      if (lockerReserved) {
        throw new Error("LOCKER_ALREADY_RESERVED");
      }

      await tx.lockerReservation.create({
        data: {
          lockerId: locker.id,
          userId: user.id,
          status: ServiceReservationStatus.PENDING,
        },
      });

      await tx.locker.update({
        where: { id: locker.id },
        data: { status: LockerStatus.RESERVED },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Cacifo reservado!",
          message: `Reserva do cacifo ${locker.number} enviada. Aguarde a confirmacao do bibliotecario.`,
          metadata: { actionType: "view_services" },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("USER_HAS_ACTIVE_LOCKER")) {
      return NextResponse.json(
        { error: "USER_HAS_ACTIVE_LOCKER" },
        { status: 409 },
      );
    }
    if (message.includes("USER_HAS_PENDING_LOCKER")) {
      return NextResponse.json(
        { error: "USER_HAS_PENDING_LOCKER" },
        { status: 409 },
      );
    }
    if (message.includes("NOT_AVAILABLE")) {
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
    }
    if (message.includes("LOCKER_ALREADY_RESERVED")) {
      return NextResponse.json(
        { error: "LOCKER_ALREADY_RESERVED" },
        { status: 409 },
      );
    }
    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Erro ao reservar cacifo" },
      { status: 500 },
    );
  }
}
