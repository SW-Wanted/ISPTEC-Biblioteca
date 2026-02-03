import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireStaffUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      type: true,
      isBlocked: true,
    },
  });

  if (!user) return null;
  if (user.isBlocked) return null;

  // Apenas staff, bibliotecários, catalogadores e supervisores podem verificar
  const allowedTypes: UserType[] = [
    UserType.LIBRARIAN,
    UserType.CATALOGER,
    UserType.SUPERVISOR,
    UserType.STAFF,
  ];

  if (!allowedTypes.includes(user.type)) {
    return null;
  }

  return user;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const verifyDocumentSchema = z.object({
  isVerified: z.boolean(),
});

// ---------------------------------------------------------------------------
// PATCH /api/members/documents/[id] - Verificar/Rejeitar documento
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const staff = await requireStaffUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Sem permissões para esta operação" },
      { status: 403 },
    );
  }

  const documentId = params.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  const validation = verifyDocumentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { isVerified } = validation.data;

  try {
    // Buscar documento
    const document = await prisma.userDocument.findUnique({
      where: { id: documentId },
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

    if (!document) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar documento
    const updatedDocument = await prisma.userDocument.update({
      where: { id: documentId },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        verifiedBy: isVerified ? staff.id : null,
      },
    });

    // TODO: Enviar notificação ao utilizador
    // Pode ser implementado com o sistema de notificações existente

    return NextResponse.json(
      {
        message: isVerified
          ? "Documento verificado com sucesso"
          : "Documento rejeitado",
        document: updatedDocument,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao atualizar documento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar documento" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/members/documents/[id] - Deletar documento
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const staff = await requireStaffUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Sem permissões para esta operação" },
      { status: 403 },
    );
  }

  const documentId = params.id;

  try {
    const document = await prisma.userDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 },
      );
    }

    await prisma.userDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json(
      { message: "Documento removido com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao remover documento:", error);
    return NextResponse.json(
      { error: "Erro ao remover documento" },
      { status: 500 },
    );
  }
}
