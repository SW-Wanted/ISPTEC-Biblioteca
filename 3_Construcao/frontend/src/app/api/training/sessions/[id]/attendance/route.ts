import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserType,
  AccountActivationStatus,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { z } from "zod";
import { createAccountActivatedMetadata } from "@/lib/notification-helpers";

const attendanceSchema = z.object({
  participantIds: z
    .array(z.string())
    .min(1, "Deve marcar pelo menos um participante"),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  actualDate: z.string().datetime().optional(),
});

/**
 * PATCH /api/training/sessions/[id]/attendance
 * Marca presença dos participantes e atualiza status da sessão
 *
 * Apenas formador ou admin podem marcar presença
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ⚙️ Next.js 15+ requer await em params
    const { id: sessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, type: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Verificar se é formador ou admin
    const trainingSession = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!trainingSession) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    // Apenas o formador responsável ou admin pode marcar presença
    const isAuthorized =
      user.type === UserType.SUPERVISOR ||
      user.type === UserType.LIBRARIAN ||
      trainingSession.trainerId === user.id;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Sem permissão para marcar presença nesta sessão" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = attendanceSchema.parse(body);

    // Marcar presença e atualizar status da sessão
    const updatedSession = await prisma.$transaction(async (tx) => {
      // Marcar presença dos participantes
      await Promise.all(
        validatedData.participantIds.map((participantId) =>
          tx.trainingParticipant.update({
            where: { id: participantId },
            data: {
              attended: true,
              attendedAt: new Date(),
            },
          }),
        ),
      );

      // Atualizar status da sessão se fornecido
      const updateData: any = {};
      if (validatedData.status) {
        updateData.status = validatedData.status;
      }
      if (validatedData.actualDate) {
        updateData.actualDate = new Date(validatedData.actualDate);
      }

      // Se mudou para COMPLETED, gerar certificados e ativar contas
      if (validatedData.status === "COMPLETED") {
        // Buscar participantes que compareceram
        const attendedParticipants = trainingSession.participants.filter((p) =>
          validatedData.participantIds.includes(p.id),
        );

        // Ativar contas dos que compareceram
        await Promise.all(
          attendedParticipants.map(async (participant) => {
            // Gerar URL do certificado (pode ser implementado com PDF generator)
            const certificateUrl = `/certificates/${trainingSession.id}/${participant.userId}.pdf`;

            // Atualizar participante com certificado
            await tx.trainingParticipant.update({
              where: { id: participant.id },
              data: {
                certificateUrl,
                certificateGeneratedAt: new Date(),
              },
            });

            // Ativar conta do usuário
            await tx.user.update({
              where: { id: participant.userId },
              data: {
                activationStatus: AccountActivationStatus.ACTIVE,
              },
            });

            // Notificar usuário com metadata para navegação
            const metadata = createAccountActivatedMetadata();

            await tx.notification.create({
              data: {
                userId: participant.userId,
                type: NotificationType.EMAIL,
                status: NotificationStatus.PENDING,
                title: "Conta ativada! 🎉",
                message: `Parabéns! Você completou a formação "${trainingSession.title}". Sua conta está agora ativa e você pode usar todos os serviços da biblioteca.`,
                metadata: metadata as any,
              },
            });
          }),
        );
      }

      // Atualizar sessão
      return tx.trainingSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  activationStatus: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao marcar presença:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/training/sessions/[id]/attendance
 * Obtém lista de presenças de uma sessão
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const trainingSession = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                activationStatus: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
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
    console.error("Erro ao buscar presenças:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
