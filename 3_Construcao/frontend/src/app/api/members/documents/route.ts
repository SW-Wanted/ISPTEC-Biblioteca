import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      status: true,
      isBlocked: true,
      type: true,
    },
  });

  if (!user) return null;
  if (user.isBlocked) return null;

  return user;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uploadDocumentSchema = z.object({
  documentType: z.enum(["ID_CARD", "STUDENT_CARD", "ENROLLMENT", "STAFF_CARD"]),
  documentUrl: z.string().url(),
});

// ---------------------------------------------------------------------------
// GET /api/members/documents - Obter documentos do utilizador
// ---------------------------------------------------------------------------

export async function GET() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const documents = await prisma.userDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Erro ao obter documentos:", error);
    return NextResponse.json(
      { error: "Erro ao obter documentos" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/members/documents - Adicionar documento
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  const validation = uploadDocumentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { documentType, documentUrl } = validation.data;

  try {
    // Verificar se já existe documento do mesmo tipo
    const existingDocument = await prisma.userDocument.findFirst({
      where: {
        userId: user.id,
        documentType,
      },
    });

    if (existingDocument) {
      // Atualizar documento existente
      const updatedDocument = await prisma.userDocument.update({
        where: { id: existingDocument.id },
        data: {
          documentUrl,
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          updatedAt: new Date(),
        },
      });

      // Notificar bibliotecários sobre documento atualizado
      try {
        const librarians = await prisma.user.findMany({
          where: {
            type: {
              in: [UserType.LIBRARIAN, UserType.CATALOGER, UserType.SUPERVISOR],
            },
            isBlocked: false,
          },
          select: { id: true },
        });

        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true },
        });

        const documentTypeLabels: Record<string, string> = {
          ID_CARD: "Cartão de Identidade",
          STUDENT_CARD: "Cartão de Estudante",
          ENROLLMENT: "Ficha de Matrícula",
          STAFF_CARD: "Cartão de Colaborador",
        };

        if (librarians.length > 0) {
          await prisma.notification.createMany({
            data: librarians.map((lib) => ({
              userId: lib.id,
              type: "IN_APP",
              title: "Documento Atualizado",
              message: `${userData?.name || "Um utilizador"} atualizou ${documentTypeLabels[documentType] || documentType} para verificação.`,
              status: "PENDING",
            })),
          });
        }
      } catch (notificationError) {
        console.error("Erro ao enviar notificações:", notificationError);
      }

      return NextResponse.json(
        {
          message: "Documento atualizado com sucesso",
          document: updatedDocument,
        },
        { status: 200 },
      );
    }

    // Criar novo documento
    const newDocument = await prisma.userDocument.create({
      data: {
        userId: user.id,
        documentType,
        documentUrl,
        isVerified: false,
      },
    });

    // Notificar bibliotecários sobre novo documento
    try {
      // Buscar todos os bibliotecários e staff
      const librarians = await prisma.user.findMany({
        where: {
          type: {
            in: [UserType.LIBRARIAN, UserType.CATALOGER, UserType.SUPERVISOR],
          },
          isBlocked: false,
        },
        select: { id: true },
      });

      // Obter nome do utilizador
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });

      const documentTypeLabels: Record<string, string> = {
        ID_CARD: "Cartão de Identidade",
        STUDENT_CARD: "Cartão de Estudante",
        ENROLLMENT: "Ficha de Matrícula",
        STAFF_CARD: "Cartão de Colaborador",
      };

      // Criar notificações para cada bibliotecário
      if (librarians.length > 0) {
        await prisma.notification.createMany({
          data: librarians.map((lib) => ({
            userId: lib.id,
            type: "IN_APP",
            title: "Novo Documento para Verificação",
            message: `${userData?.name || "Um utilizador"} enviou ${documentTypeLabels[documentType] || documentType} para verificação.`,
            status: "PENDING",
          })),
        });
      }
    } catch (notificationError) {
      console.error("Erro ao enviar notificações:", notificationError);
      // Não falhar o request se notificações falharem
    }

    return NextResponse.json(
      {
        message: "Documento enviado com sucesso",
        document: newDocument,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar documento:", error);
    return NextResponse.json(
      { error: "Erro ao enviar documento" },
      { status: 500 },
    );
  }
}
