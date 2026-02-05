import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  FineStatus,
  LoanStatus,
  NotificationStatus,
  NotificationType,
  ReservationStatus,
  UserStatus,
  UserType,
} from "@prisma/client";
import { LOAN_LIMITS, toIso } from "@/lib/sgbu-rules";
import { logLoanRenewed } from "@/lib/activity-logger";

function lowerEnum(value: string): string {
  return value.toLowerCase();
}

function canManageLoans(type: UserType) {
  return type === UserType.SUPERVISOR || type === UserType.LIBRARIAN;
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
      isBlocked: true,
    },
  });

  if (!user) return null;
  if (user.status !== UserStatus.ACTIVE || user.isBlocked) return null;

  return user;
}

type RenewErrorCode =
  | "NOT_FOUND"
  | "NOT_ALLOWED"
  | "NOT_ACTIVE"
  | "OVERDUE"
  | "MAX_RENEWALS"
  | "PENDING_RESERVATION"
  | "PENDING_FINES";

function errorMessage(code: RenewErrorCode): string {
  switch (code) {
    case "NOT_FOUND":
      return "Empréstimo não encontrado";
    case "NOT_ALLOWED":
      return "Sem permissão";
    case "NOT_ACTIVE":
      return "Empréstimo não está activo";
    case "OVERDUE":
      return "Empréstimo em atraso não pode ser renovado";
    case "MAX_RENEWALS":
      return "Limite de renovações atingido";
    case "PENDING_RESERVATION":
      return "Este livro tem reservas pendentes";
    case "PENDING_FINES":
      return "Regularize suas multas antes de renovar";
  }
}

function asRenewErrorCode(value: unknown): RenewErrorCode | null {
  if (!(value instanceof Error)) return null;
  const msg = value.message;
  const codes: RenewErrorCode[] = [
    "NOT_FOUND",
    "NOT_ALLOWED",
    "NOT_ACTIVE",
    "OVERDUE",
    "MAX_RENEWALS",
    "PENDING_RESERVATION",
    "PENDING_FINES",
  ];
  return codes.includes(msg as RenewErrorCode) ? (msg as RenewErrorCode) : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await requireUser();
  if (!requester)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Preload to enforce permission and allow refusal notifications
  const preload = await prisma.loan.findUnique({
    where: { id },
    include: {
      copy: { include: { book: { select: { id: true, title: true } } } },
      user: { select: { id: true } },
    },
  });

  if (!preload) {
    return NextResponse.json(
      { error: errorMessage("NOT_FOUND") },
      { status: 404 },
    );
  }

  if (!canManageLoans(requester.type) && preload.userId !== requester.id) {
    return NextResponse.json(
      { error: errorMessage("NOT_ALLOWED") },
      { status: 403 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const loan = await tx.loan.findUnique({
        where: { id },
        include: {
          copy: { include: { book: { select: { id: true, title: true } } } },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              type: true,
              totalFines: true,
            },
          },
        },
      });

      if (!loan) throw new Error("NOT_FOUND");

      if (!canManageLoans(requester.type) && loan.userId !== requester.id) {
        throw new Error("NOT_ALLOWED");
      }

      if (loan.returnDate) throw new Error("NOT_ACTIVE");

      if (loan.status !== LoanStatus.ACTIVE) {
        // Treat OVERDUE as a separate message
        if (loan.status === LoanStatus.OVERDUE) throw new Error("OVERDUE");
        throw new Error("NOT_ACTIVE");
      }

      if (loan.dueDate.getTime() < now.getTime()) {
        throw new Error("OVERDUE");
      }

      if (loan.renewalCount >= loan.maxRenewals) {
        throw new Error("MAX_RENEWALS");
      }

      const pendingReservation = await tx.reservation.findFirst({
        where: {
          bookId: loan.copy.book.id,
          status: {
            in: [ReservationStatus.ACTIVE, ReservationStatus.AVAILABLE],
          },
          userId: { not: loan.userId },
        },
        select: { id: true },
      });

      if (pendingReservation) {
        throw new Error("PENDING_RESERVATION");
      }

      // Prefer aggregated check to avoid relying on possibly stale user.totalFines
      const pendingFines = await tx.fine.aggregate({
        where: { userId: loan.userId, status: FineStatus.PENDING },
        _sum: { amount: true },
      });
      const totalPending = Number(pendingFines._sum.amount ?? 0);

      if (totalPending > 0) {
        throw new Error("PENDING_FINES");
      }

      const loanDays = LOAN_LIMITS[loan.user.type].loanDays;
      const newDueDate = new Date(
        now.getTime() + loanDays * 24 * 60 * 60 * 1000,
      );

      const updated = await tx.loan.update({
        where: { id: loan.id },
        data: {
          dueDate: newDueDate,
          renewalCount: loan.renewalCount + 1,
          status: LoanStatus.ACTIVE,
        },
        include: {
          user: { select: { email: true, name: true } },
          copy: { include: { book: { select: { id: true, title: true } } } },
        },
      });

      await tx.notification.create({
        data: {
          userId: loan.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Renovação realizada!",
          message: `O empréstimo de "${loan.copy.book.title}" foi renovado até ${newDueDate.toISOString().slice(0, 10)}.`,
          loanId: loan.id,
        },
      });

      // ✅ SGBU-011: Log de atividade crítica (renovação)
      await logLoanRenewed({
        userId: loan.userId,
        loanId: loan.id,
        bookTitle: loan.copy.book.title,
        newDueDate,
        renewalCount: updated.renewalCount,
      }).catch((err) => console.error("Erro ao logar renovação:", err));

      return {
        id: updated.id,
        status: lowerEnum(updated.status),
        loan_date: toIso(updated.loanDate),
        due_date: toIso(updated.dueDate),
        return_date: toIso(updated.returnDate) ?? null,
        member_id: updated.user.email,
        member_name: updated.user.name,
        book_id: updated.copy.book.id,
        book_title: updated.copy.book.title,
        copy_id: updated.copyId,
        renewal_count: updated.renewalCount,
        max_renewals: updated.maxRenewals,
        days_overdue: updated.daysOverdue,
        fine_amount: Number(updated.fineAmount),
        created_date: toIso(updated.createdAt),
        updated_date: toIso(updated.updatedAt),
      };
    });

    return NextResponse.json({ ok: true, loan: result });
  } catch (caught: unknown) {
    const code = asRenewErrorCode(caught) ?? null;
    if (!code) {
      return NextResponse.json(
        { error: "Erro ao renovar empréstimo" },
        { status: 500 },
      );
    }

    // Register refusal notification (best-effort, outside tx)
    try {
      await prisma.notification.create({
        data: {
          userId: preload.userId,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Renovação recusada",
          message: `${errorMessage(code)}. Livro: "${preload.copy.book.title}".`,
          loanId: preload.id,
        },
      });
    } catch {
      // ignore notification failures
    }

    const httpStatus =
      code === "NOT_ALLOWED" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: errorMessage(code) },
      { status: httpStatus },
    );
  }
}
