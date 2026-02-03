import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
