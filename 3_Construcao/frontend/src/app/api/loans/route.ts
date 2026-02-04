import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/loans?email=xxx
 * Lista empréstimos de um utilizador por email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    // Buscar utilizador
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    // Buscar empréstimos
    const loans = await prisma.loan.findMany({
      where: { userId: user.id },
      orderBy: { loanDate: "desc" },
      include: {
        copy: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Mapear para formato esperado
    const mappedLoans = loans.map((loan) => ({
      id: loan.id,
      status: loan.status.toLowerCase(),
      loan_date: loan.loanDate.toISOString(),
      due_date: loan.dueDate.toISOString(),
      return_date: loan.returnDate?.toISOString() || null,
      book_id: loan.copy.book.id,
      book_title: loan.copy.book.title,
      copy_id: loan.copyId,
      renewal_count: loan.renewalCount,
      days_overdue: loan.daysOverdue,
      fine_amount: Number(loan.fineAmount),
    }));

    return NextResponse.json(mappedLoans, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar empréstimos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empréstimos" },
      { status: 500 },
    );
  }
}
