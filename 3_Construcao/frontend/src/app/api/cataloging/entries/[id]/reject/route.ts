import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/cataloging/entries/{id}/reject
 * Rejeita uma entrada de catalogação
 */

const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .min(10, "Motivo deve ter pelo menos 10 caracteres"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: entryId } = await params;

    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Verificar permissões
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { type: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Utilizador inválido" },
        { status: 403 },
      );
    }

    if (!["SUPERVISOR", "LIBRARIAN"].includes(user.type)) {
      return NextResponse.json(
        { error: "Apenas supervisores podem rejeitar catalogações" },
        { status: 403 },
      );
    }

    // 3. Validar input
    const body = await request.json();
    const { rejectionReason } = rejectSchema.parse(body);

    // 4. Buscar entry
    const entry = await prisma.catalogEntry.findUnique({
      where: { id: entryId },
      include: { cataloger: true },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Entrada não encontrada" },
        { status: 404 },
      );
    }

    if (entry.status === "APPROVED") {
      return NextResponse.json(
        { error: "Não é possível rejeitar entrada já aprovada" },
        { status: 400 },
      );
    }

    // 5. Transaction: atualizar entry + notificar
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 5a. Atualizar entry
        const updatedEntry = await tx.catalogEntry.update({
          where: { id: entryId },
          data: {
            status: "REJECTED",
            supervisorId: session.user.id,
            rejectionReason,
          },
          include: {
            cataloger: {
              select: { id: true, name: true, email: true },
            },
            supervisor: {
              select: { id: true, name: true },
            },
          },
        });

        // 5b. Notificar catalogador
        await tx.notification.create({
          data: {
            userId: entry.catalogerId,
            type: "IN_APP",
            title: "Catalogação rejeitada",
            message: `Sua catalogação "${entry.extractedTitle || "Sem título"}" foi rejeitada.`,
            metadata: {
              entryId,
              rejectionReason,
            },
          },
        });

        // 5c. Log de atividade
        await tx.activityLog.create({
          data: {
            user: { connect: { id: session.user.id } },
            action: "CATALOG_ENTRY_REJECTED",
            entity: "CatalogEntry",
            entityId: entryId,
            description: `Catalogação rejeitada: "${entry.extractedTitle || "Sem título"}" - Motivo: ${rejectionReason}`,
            metadata: {
              title: entry.extractedTitle,
              reason: rejectionReason,
            },
          },
        });

        return updatedEntry;
      },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Erro ao rejeitar catalogação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
