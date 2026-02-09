import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  BookStatus,
  CopyCondition,
  LoanStatus,
  FineType,
  FineStatus,
  UserType,
} from "@prisma/client";
import { getFineAmount } from "@/lib/settings-config";

/**
 * POST /api/loans/[id]/damaged
 * Marca o livro do empréstimo como danificado
 * - Altera condição do exemplar para POOR
 * - Altera status do exemplar para DAMAGED
 * - Aplica multa ao membro
 * - Registra devolução do empréstimo
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, type: true },
    });

    if (
      !user ||
      ![UserType.SUPERVISOR, UserType.LIBRARIAN, UserType.STAFF].includes(
        user.type,
      )
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: loanId } = await context.params;

    // Buscar empréstimo
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        copy: {
          include: {
            book: {
              select: { id: true, title: true },
            },
          },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }

    if (loan.status === LoanStatus.RETURNED) {
      return NextResponse.json(
        { error: "Empréstimo já foi devolvido" },
        { status: 400 },
      );
    }

    // Obter valor da multa para livro danificado
    const fineAmount = await getFineAmount(FineType.DAMAGED_BOOK);

    // Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar exemplar (condição POOR + status DAMAGED)
      await tx.copy.update({
        where: { id: loan.copyId },
        data: {
          condition: CopyCondition.POOR,
          status: BookStatus.DAMAGED,
        },
      });

      // 2. Registrar devolução do empréstimo
      await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.RETURNED,
          returnDate: new Date(),
        },
      });

      // 3. Criar multa
      await tx.fine.create({
        data: {
          userId: loan.userId,
          loanId: loan.id,
          type: FineType.DAMAGED_BOOK,
          amount: fineAmount,
          status: FineStatus.PENDING,
          reason: `Exemplar danificado: ${loan.copy.book.title} (${loan.copy.barcode})`,
        },
      });

      // 4. Atualizar contadores do livro
      const availableCopies = await tx.copy.count({
        where: {
          bookId: loan.copy.bookId,
          status: BookStatus.AVAILABLE,
        },
      });

      await tx.book.update({
        where: { id: loan.copy.bookId },
        data: { availableCopies },
      });

      // 5. Notificar membro
      await tx.notification.create({
        data: {
          userId: loan.userId,
          type: "IN_APP",
          status: "PENDING",
          title: "Livro marcado como danificado",
          message: `O livro "${loan.copy.book.title}" foi marcado como danificado. Multa de ${fineAmount} Kz aplicada. Regularize suas pendências.`,
          loanId: loan.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Livro marcado como danificado. Multa aplicada.",
    });
  } catch (error) {
    console.error("Erro ao marcar livro como danificado:", error);
    return NextResponse.json(
      { error: "Erro ao processar operação" },
      { status: 500 },
    );
  }
}
