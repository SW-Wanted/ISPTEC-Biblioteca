import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserType } from "@prisma/client";

/**
 * POST /api/cataloging/entries
 * Cria uma nova entrada de catalogação
 */

const createEntrySchema = z.object({
  imageUrl: z.string(),
  extractedTitle: z.string().optional(),
  extractedAuthor: z.string().optional(),
  extractedISBN: z.string().optional(),
  extractedPublisher: z.string().optional(),
  extractedYear: z.number().optional(),
  enrichedData: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, type: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Utilizador inválido" },
        { status: 403 },
      );
    }

    const allowedTypes = [
      UserType.LIBRARIAN,
      UserType.CATALOGER,
      UserType.SUPERVISOR,
    ];
    if (!allowedTypes.includes(user.type)) {
      return NextResponse.json(
        { error: "Sem permissão para catalogar" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = createEntrySchema.parse(body);

    // Criar entrada de catalogação
    const entry = await prisma.catalogEntry.create({
      data: {
        catalogerId: user.id,
        imageUrl: data.imageUrl,
        extractedTitle: data.extractedTitle,
        extractedAuthor: data.extractedAuthor,
        extractedISBN: data.extractedISBN,
        extractedPublisher: data.extractedPublisher,
        extractedYear: data.extractedYear,
        enrichedData: data.enrichedData as any,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao criar entrada de catalogação:", error);
    return NextResponse.json(
      { error: "Erro ao criar entrada de catalogação" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cataloging/entries
 * Lista entradas de catalogação pendentes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, type: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Utilizador inválido" },
        { status: 403 },
      );
    }

    const allowedTypes = [
      UserType.LIBRARIAN,
      UserType.CATALOGER,
      UserType.SUPERVISOR,
    ];
    if (!allowedTypes.includes(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const entries = await prisma.catalogEntry.findMany({
      where: {
        status: status as any,
      },
      include: {
        cataloger: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar entradas:", error);
    return NextResponse.json(
      { error: "Erro ao listar entradas de catalogação" },
      { status: 500 },
    );
  }
}
