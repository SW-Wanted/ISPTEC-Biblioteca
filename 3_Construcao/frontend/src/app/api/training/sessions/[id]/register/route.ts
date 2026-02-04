import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  UserStatus,
  UserType,
  AccountActivationStatus,
  NotificationType,
  NotificationStatus,
} from "@prisma/client";
import { createTrainingScheduledMetadata } from "@/lib/notification-helpers";

const registerSchema = z.object({
  userId: z.string().optional(), // Admin pode inscrever outros usuários
});

/**
 * POST /api/training/sessions/[id]/register
 * Inscreve um usuário em uma sessão de formação
 *
 * - Usuário pode se inscrever a si mesmo
 * - Admin pode inscrever outros usuários
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ✅ Next.js 15+: params é uma Promise
    const { id: sessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        type: true,
        status: true,
        isBlocked: true,
        activationStatus: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // ✅ Permitir PENDING para inscrição em formação (onboarding)
    // ❌ Bloquear apenas INACTIVE e bloqueados
    if (currentUser.status === UserStatus.INACTIVE || currentUser.isBlocked) {
      return NextResponse.json(
        { error: "Usuário inativo ou bloqueado" },
        { status: 403 },
      );
    }

    // Parse body (pode ter userId se admin estiver inscrevendo outro usuário)
    const body = await request.json().catch(() => ({}));
    const { userId: targetUserId } = registerSchema.parse(body);

    // Determinar quem está sendo inscrito (usar 'type' ao invés de 'role')
    const isAdmin =
      currentUser.type === UserType.SUPERVISOR ||
      currentUser.type === UserType.LIBRARIAN;
    const userToRegister =
      targetUserId && isAdmin ? targetUserId : currentUser.id;

    // Buscar sessão de formação
    const trainingSession = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!trainingSession) {
      return NextResponse.json(
        { error: "Sessão de formação não encontrada" },
        { status: 404 },
      );
    }

    // Validações
    if (trainingSession.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Esta sessão foi cancelada" },
        { status: 400 },
      );
    }

    if (trainingSession.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Esta sessão já foi concluída" },
        { status: 400 },
      );
    }

    if (trainingSession.scheduledDate < new Date()) {
      return NextResponse.json(
        { error: "Não é possível inscrever-se em sessões passadas" },
        { status: 400 },
      );
    }

    // Verificar limite de participantes
    if (
      trainingSession.participants.length >= trainingSession.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Sessão está lotada" },
        { status: 400 },
      );
    }

    // Verificar se já está inscrito
    const alreadyRegistered = trainingSession.participants.some(
      (p) => p.userId === userToRegister,
    );

    if (alreadyRegistered) {
      return NextResponse.json(
        { error: "Usuário já está inscrito nesta sessão" },
        { status: 400 },
      );
    }

    // Inscrever usuário
    const participant = await prisma.$transaction(async (tx) => {
      const newParticipant = await tx.trainingParticipant.create({
        data: {
          userId: userToRegister,
          sessionId: trainingSession.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Se usuário estava PENDING_TRAINING, muda para TRAINING_SCHEDULED
      await tx.user.update({
        where: { id: userToRegister },
        data: {
          activationStatus: AccountActivationStatus.TRAINING_SCHEDULED,
        },
      });

      // Criar notificação com metadata para navegação
      const metadata = createTrainingScheduledMetadata(
        trainingSession.id,
        trainingSession.title,
        trainingSession.scheduledDate,
      );

      await tx.notification.create({
        data: {
          userId: userToRegister,
          type: NotificationType.EMAIL,
          status: NotificationStatus.PENDING,
          title: "Inscrição em formação confirmada",
          message: `Você foi inscrito na formação "${trainingSession.title}" agendada para ${trainingSession.scheduledDate.toLocaleDateString("pt-AO")}. Local: ${trainingSession.location}.`,
          metadata: metadata as any,
        },
      });

      return newParticipant;
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao inscrever em formação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/training/sessions/[id]/register
 * Cancela inscrição em uma sessão de formação
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Buscar participação
    const participant = await prisma.trainingParticipant.findFirst({
      where: {
        sessionId: params.id,
        userId: user.id,
      },
      include: {
        session: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Inscrição não encontrada" },
        { status: 404 },
      );
    }

    // Não permitir cancelar se sessão já iniciou
    if (participant.session.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Não é possível cancelar inscrição após início da sessão" },
        { status: 400 },
      );
    }

    // Remover inscrição
    await prisma.$transaction(async (tx) => {
      await tx.trainingParticipant.delete({
        where: { id: participant.id },
      });

      // Voltar status para PENDING_TRAINING
      await tx.user.update({
        where: { id: user.id },
        data: {
          activationStatus: "PENDING_TRAINING",
        },
      });

      // Notificar cancelamento
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "EMAIL",
          status: "PENDING",
          title: "Inscrição cancelada",
          message: `Sua inscrição na formação "${participant.session.title}" foi cancelada com sucesso.`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao cancelar inscrição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
