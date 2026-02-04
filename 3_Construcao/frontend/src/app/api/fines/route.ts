import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/fines?email=xxx
 * Lista multas de um utilizador por email
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

    // Buscar multas
    const fines = await prisma.fine.findMany({
      where: { userId: user.id },
      orderBy: { generatedAt: "desc" },
      include: {
        loan: {
          select: {
            copy: {
              select: {
                book: {
                  select: { title: true },
                },
              },
            },
          },
        },
      },
    });

    // Mapear para formato esperado
    const mappedFines = fines.map((fine) => ({
      id: fine.id,
      status: fine.status.toLowerCase(),
      amount: Number(fine.amount),
      type: fine.type.toLowerCase(),
      generated_at: fine.generatedAt.toISOString(),
      created_date: fine.createdAt.toISOString(),
      reason: fine.reason,
      book_title: fine.loan?.copy?.book?.title,
    }));

    return NextResponse.json(mappedFines, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar multas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar multas" },
      { status: 500 },
    );
  }
}
