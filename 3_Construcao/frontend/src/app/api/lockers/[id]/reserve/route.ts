import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  LockerStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
  AccountActivationStatus,
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

  const durationHours = await getSystemPolicyNumber("LOCKER_DURATION_HOURS", 3);

  try {
    await prisma.$transaction(async (tx) => {
      const existingRental = await tx.lockerRental.findFirst({
        where: { userId: user.id, endTime: null },
        select: { id: true },
      });

      if (existingRental) {
        throw new Error("USER_HAS_ACTIVE_LOCKER");
      }

      const locker = await tx.locker.findUnique({
        where: { id },
        select: { id: true, status: true, number: true, location: true },
      });

      if (!locker) throw new Error("NOT_FOUND");
      if (locker.status !== LockerStatus.AVAILABLE) {
        throw new Error("NOT_AVAILABLE");
      }

      const expectedEnd = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      await tx.lockerRental.create({
        data: {
          lockerId: locker.id,
          userId: user.id,
          expectedEnd,
        },
      });

      await tx.locker.update({
        where: { id: locker.id },
        data: { status: LockerStatus.OCCUPIED },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Cacifo reservado!",
          message: `Cacifo ${locker.number} reservado por ${durationHours} horas. Libere ate ${expectedEnd.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}.`,
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
    if (message.includes("NOT_AVAILABLE")) {
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
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
