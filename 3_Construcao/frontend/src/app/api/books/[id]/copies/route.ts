import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserType, BookStatus } from "@prisma/client";

function canManageBooks(type: UserType) {
  return (
    type === UserType.SUPERVISOR ||
    type === UserType.LIBRARIAN ||
    type === UserType.CATALOGER
  );
}

// Schema for creating a new individual copy
const createCopySchema = z.object({
  action: z.literal("create"),
  barcode: z.string().min(1, "Código de barras obrigatório"),
  location: z.string().min(1, "Localização obrigatória"),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).default("GOOD"),
  rfidTag: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for updating an existing copy
const updateCopySchema = z.object({
  action: z.literal("update"),
  copyId: z.string().min(1),
  barcode: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  status: z.nativeEnum(BookStatus).optional(),
  rfidTag: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for deleting a copy
const deleteCopySchema = z.object({
  action: z.literal("delete"),
  copyId: z.string().min(1),
});

// Schema for archiving the entire book (soft delete)
const archiveSchema = z.object({
  action: z.literal("archive"),
});

// Schema for syncing book counters
const syncSchema = z.object({
  action: z.literal("sync"),
});

const bodySchema = z.discriminatedUnion("action", [
  createCopySchema,
  updateCopySchema,
  deleteCopySchema,
  archiveSchema,
  syncSchema,
]);

// GET: List all copies for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const copies = await prisma.copy.findMany({
    where: { bookId },
    include: {
      loans: {
        where: { status: { in: ["ACTIVE", "OVERDUE"] } },
        select: {
          id: true,
          status: true,
          dueDate: true,
          user: { select: { name: true, email: true } },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Para exemplares com estado RESERVED, buscar quem reservou
  const reservedCopyIds = copies
    .filter((c) => c.status === "RESERVED")
    .map((c) => c.id);

  const reservationMap: Record<
    string,
    { userName: string; userEmail: string }
  > = {};
  if (reservedCopyIds.length > 0) {
    // Buscar reservas AVAILABLE (cópia já atribuída) para este livro
    const reservations = await prisma.reservation.findMany({
      where: {
        bookId,
        status: "AVAILABLE",
      },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
    });
    // Mapear para os exemplares reservados (pode haver 1:1 entre cópia reservada e reserva)
    for (
      let i = 0;
      i < Math.min(reservedCopyIds.length, reservations.length);
      i++
    ) {
      reservationMap[reservedCopyIds[i]] = {
        userName: reservations[i].user.name,
        userEmail: reservations[i].user.email,
      };
    }
  }

  const copiesWithReservation = copies.map((c) => ({
    ...c,
    reservation: reservationMap[c.id] || null,
  }));

  return NextResponse.json({ copies: copiesWithReservation });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, type: true },
  });

  if (!user || !canManageBooks(user.type)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      totalCopies: true,
      availableCopies: true,
    },
  });

  if (!book) {
    return NextResponse.json(
      { error: "Livro não encontrado" },
      { status: 404 },
    );
  }

  const data = parsed.data;

  // CREATE: Add a new individual copy
  if (data.action === "create") {
    // Check if barcode already exists
    const existingCopy = await prisma.copy.findUnique({
      where: { barcode: data.barcode },
    });
    if (existingCopy) {
      return NextResponse.json(
        { error: `Código de barras "${data.barcode}" já está em uso.` },
        { status: 400 },
      );
    }

    const [newCopy] = await prisma.$transaction([
      prisma.copy.create({
        data: {
          bookId,
          barcode: data.barcode,
          location: data.location,
          condition: data.condition,
          rfidTag: data.rfidTag || null,
          notes: data.notes || null,
          status: BookStatus.AVAILABLE,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          totalCopies: { increment: 1 },
          availableCopies: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: `Exemplar "${data.barcode}" criado com sucesso.`,
      copy: newCopy,
    });
  }

  // UPDATE: Modify an existing copy
  if (data.action === "update") {
    const copy = await prisma.copy.findUnique({
      where: { id: data.copyId },
    });
    if (!copy || copy.bookId !== bookId) {
      return NextResponse.json(
        { error: "Exemplar não encontrado" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.rfidTag !== undefined) updateData.rfidTag = data.rfidTag || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Handle status changes with availability tracking
    if (data.status !== undefined && data.status !== copy.status) {
      const wasAvailable = copy.status === BookStatus.AVAILABLE;
      const willBeAvailable = data.status === BookStatus.AVAILABLE;

      updateData.status = data.status;

      if (wasAvailable && !willBeAvailable) {
        // Was available, now not → decrease available
        await prisma.book.update({
          where: { id: bookId },
          data: { availableCopies: { decrement: 1 } },
        });
      } else if (!wasAvailable && willBeAvailable) {
        // Was not available, now is → increase available
        await prisma.book.update({
          where: { id: bookId },
          data: { availableCopies: { increment: 1 } },
        });
      }
    }

    const updatedCopy = await prisma.copy.update({
      where: { id: data.copyId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "Exemplar atualizado.",
      copy: updatedCopy,
    });
  }

  // DELETE: Remove a copy
  if (data.action === "delete") {
    // Verificar se há qualquer loan relacionado (independente do status)
    const anyLoan = await prisma.loan.findFirst({
      where: { copyId: data.copyId },
    });

    if (anyLoan) {
      return NextResponse.json(
        {
          error:
            "Não é possível eliminar. Exemplar tem histórico de empréstimos.",
        },
        { status: 400 },
      );
    }

    const copy = await prisma.copy.findUnique({
      where: { id: data.copyId },
    });
    if (!copy || copy.bookId !== bookId) {
      return NextResponse.json(
        { error: "Exemplar não encontrado" },
        { status: 404 },
      );
    }

    const wasAvailable = copy.status === BookStatus.AVAILABLE;

    await prisma.$transaction([
      prisma.copy.delete({ where: { id: data.copyId } }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          totalCopies: { decrement: 1 },
          ...(wasAvailable ? { availableCopies: { decrement: 1 } } : {}),
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: `Exemplar "${copy.barcode}" eliminado.`,
    });
  }

  // ARCHIVE: Soft delete the entire book
  if (data.action === "archive") {
    const activeLoans = await prisma.loan.count({
      where: {
        copy: { bookId },
        status: { in: ["ACTIVE", "OVERDUE"] },
      },
    });

    if (activeLoans > 0) {
      return NextResponse.json(
        {
          error: `Não é possível arquivar. ${activeLoans} empréstimo(s) activo(s). Aguarde a devolução.`,
        },
        { status: 400 },
      );
    }

    // Cancel active reservations
    await prisma.reservation.updateMany({
      where: { bookId, status: { in: ["ACTIVE", "AVAILABLE"] } },
      data: { status: "CANCELLED" },
    });

    // Mark all copies as MAINTENANCE (withdrawn)
    await prisma.copy.updateMany({
      where: { bookId },
      data: { status: BookStatus.MAINTENANCE },
    });

    // Zero out available copies
    await prisma.book.update({
      where: { id: bookId },
      data: { availableCopies: 0 },
    });

    return NextResponse.json({
      ok: true,
      message: "Livro arquivado. Todos os exemplares foram desactivados.",
    });
  }

  // SYNC: Recalculate totalCopies and availableCopies based on actual copies
  if (data.action === "sync") {
    const copies = await prisma.copy.findMany({
      where: { bookId },
    });

    const totalCopies = copies.length;
    const availableCopies = copies.filter(
      (c) => c.status === BookStatus.AVAILABLE,
    ).length;

    await prisma.book.update({
      where: { id: bookId },
      data: { totalCopies, availableCopies },
    });

    return NextResponse.json({
      ok: true,
      message: "Contadores sincronizados.",
      totalCopies,
      availableCopies,
    });
  }

  return NextResponse.json({ error: "Acção inválida" }, { status: 400 });
}
