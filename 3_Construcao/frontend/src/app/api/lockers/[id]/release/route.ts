import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  AccountActivationStatus,
  FineStatus,
  FineType,
  LockerStatus,
  NotificationStatus,
  NotificationType,
  UserStatus,
} from "@prisma/client";
import { getFineAmount } from "@/lib/settings-config";

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

function calculateOvertimeMinutes(expectedEnd: Date, releasedAt: Date): number {
  const diffMs = releasedAt.getTime() - expectedEnd.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
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
      const rental = await tx.lockerRental.findFirst({
        where: { lockerId: id, endTime: null },
        select: {
          id: true,
          userId: true,
          expectedEnd: true,
          locker: { select: { id: true, number: true } },
        },
      });

      if (!rental) {
        throw new Error("NOT_FOUND");
      }

      const isOwner = rental.userId === user.id;
      if (!isOwner && !canManageMembers(user.type)) {
        throw new Error("FORBIDDEN");
      }

      const releasedAt = new Date();
      const overtimeMinutes = calculateOvertimeMinutes(
        rental.expectedEnd,
        releasedAt,
      );
      const overtimeHours = Math.ceil(overtimeMinutes / 60);

      let fineAmount = 0;
      if (overtimeHours > 0) {
        const finePerHour = await getFineAmount(FineType.LOCKER_OVERTIME);
        fineAmount = overtimeHours * finePerHour;
      }

      await tx.lockerRental.update({
        where: { id: rental.id },
        data: {
          endTime: releasedAt,
          overtimeMinutes,
          fineAmount,
        },
      });

      await tx.locker.update({
        where: { id: rental.locker.id },
        data: { status: LockerStatus.AVAILABLE },
      });

      if (fineAmount > 0) {
        await tx.fine.create({
          data: {
            userId: rental.userId,
            type: FineType.LOCKER_OVERTIME,
            amount: fineAmount,
            status: FineStatus.PENDING,
            reason: `Cacifo ${rental.locker.number} devolvido com ${overtimeHours}h de atraso.`,
          },
        });

        const sum = await tx.fine.aggregate({
          where: { userId: rental.userId, status: FineStatus.PENDING },
          _sum: { amount: true },
        });

        await tx.user.update({
          where: { id: rental.userId },
          data: { totalFines: sum._sum.amount ?? 0 },
        });
      }

      await tx.notification.create({
        data: {
          userId: rental.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Cacifo libertado",
          message:
            fineAmount > 0
              ? `O seu cacifo foi libertado. Foi aplicada multa de ${fineAmount} Kz.`
              : "O seu cacifo foi libertado com sucesso.",
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
      { error: "Erro ao libertar cacifo" },
      { status: 500 },
    );
  }
}
