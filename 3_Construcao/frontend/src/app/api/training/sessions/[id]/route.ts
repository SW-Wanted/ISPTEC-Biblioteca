import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para atualizar sessão
const updateSessionSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  location: z.string().min(2).optional(),
  maxParticipants: z.number().int().positive().optional(),
  scheduledDate: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
});

async function requireAdminUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, type: true },
  });

  if (!user || !["SUPERVISOR", "LIBRARIAN"].includes(user.type)) return null;
  return user;
}

/**
 * GET /api/training/sessions/[id]
 * Obtém detalhes de uma sessão específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const trainingSession = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        trainer: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                registrationNumber: true,
                course: true,
                department: true,
              },
            },
          },
          orderBy: { user: { name: "asc" } },
        },
      },
    });

    if (!trainingSession) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(trainingSession);
  } catch (error) {
    console.error("Erro ao obter sessão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/training/sessions/[id]
 * Atualiza uma sessão de formação (apenas admin/formador)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const body = await request.json();
    const validatedData = updateSessionSchema.parse(body);

    const existing = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    // Não permitir editar sessões concluídas ou canceladas (exceto status)
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Não é possível editar sessão concluída ou cancelada" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.location) updateData.location = validatedData.location;
    if (validatedData.maxParticipants)
      updateData.maxParticipants = validatedData.maxParticipants;
    if (validatedData.scheduledDate)
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    if (validatedData.duration) updateData.duration = validatedData.duration;
    if (validatedData.status) updateData.status = validatedData.status;

    const updated = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Erro ao atualizar sessão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/training/sessions/[id]
 * Elimina uma sessão de formação (apenas admin)
 * Se a sessão tem participantes, reverte o activationStatus deles para PENDING_TRAINING
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: sessionId } = await params;

    const existing = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Se sessão não está concluída, reverter activationStatus dos participantes
      if (existing.status !== "COMPLETED") {
        for (const participant of existing.participants) {
          await tx.user.update({
            where: { id: participant.userId },
            data: { activationStatus: "PENDING_TRAINING" },
          });
        }
      }

      // Eliminar participantes primeiro (FK constraint)
      await tx.trainingParticipant.deleteMany({
        where: { sessionId },
      });

      // Eliminar sessão
      await tx.trainingSession.delete({
        where: { id: sessionId },
      });
    });

    return NextResponse.json({ message: "Sessão eliminada com sucesso" });
  } catch (error) {
    console.error("Erro ao eliminar sessão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
