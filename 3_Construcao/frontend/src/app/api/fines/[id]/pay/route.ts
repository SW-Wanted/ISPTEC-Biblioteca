import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/fines/[id]/pay
 * Registers payment for a fine. If the fine is for a lost book (LOST_BOOK),
 * restores the book's totalCopies and availableCopies.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: fineId } = await params;
    const body = await request.json();
    const { paymentMethod, paymentReference } = body;

    // Fetch fine
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: { book: true, user: true },
    });

    if (!fine) {
      return NextResponse.json(
        { error: "Multa não encontrada" },
        { status: 404 },
      );
    }

    if (fine.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta multa já foi processada" },
        { status: 400 },
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update fine status
      const updatedFine = await tx.fine.update({
        where: { id: fineId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentMethod: paymentMethod || "cash",
          paymentReference: paymentReference || null,
        },
      });

      // 2. Decrement user total fines
      await tx.user.update({
        where: { id: fine.userId },
        data: {
          totalFines: { decrement: Number(fine.amount) },
        },
      });

      // 3. LOST_BOOK fine: payment is monetary compensation only.
      // The physical book is still lost — do NOT restore totalCopies or availableCopies.
      // Inventory should only be updated when a replacement copy is actually catalogued.

      // 4. Create notification
      await tx.notification.create({
        data: {
          userId: fine.userId,
          type: "IN_APP",
          status: "PENDING",
          title: "Pagamento confirmado",
          message: `Seu pagamento de ${Number(fine.amount).toLocaleString("pt-AO", { style: "currency", currency: "AOA" })} foi confirmado.`,
        },
      });

      // 5. Activity log
      await tx.activityLog.create({
        data: {
          userId: session.user.id!,
          action: "FINE_PAID",
          description: `Pagamento de multa ${fineId} registrado (${Number(fine.amount)} Kz)${fine.bookId ? ` - Livro: ${fine.bookId}` : ""}`,
          entity: "Fine",
          entityId: fineId,
        },
      });

      return updatedFine;
    });

    return NextResponse.json({
      message: "Pagamento registrado com sucesso",
      fine: result,
    });
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 },
    );
  }
}
