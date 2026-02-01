import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/cataloging/entries
 * Cria uma nova entrada de catalogação com dados extraídos por OCR
 *
 * Fluxo:
 * 1. Valida permissões (CATALOGER ou superior)
 * 2. Cria CatalogEntry com status DRAFT
 * 3. Retorna entry com dados extraídos
 */

const createEntrySchema = z.object({
  imageUrl: z.string().url(),
  extractedTitle: z.string().optional(),
  extractedAuthor: z.string().optional(),
  extractedISBN: z.string().optional(),
  extractedPublisher: z.string().optional(),
  extractedYear: z.number().int().optional(),
  enrichedData: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Verificar permissões (CATALOGER, SUPERVISOR, LIBRARIAN)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { type: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Utilizador inválido ou inativo" },
        { status: 403 },
      );
    }

    const allowedTypes = ["CATALOGER", "SUPERVISOR", "LIBRARIAN"];
    if (!allowedTypes.includes(user.type)) {
      return NextResponse.json(
        { error: "Sem permissão para catalogar" },
        { status: 403 },
      );
    }

    // 3. Validar input
    const body = await request.json();
    const data = createEntrySchema.parse(body);

    // 4. Criar CatalogEntry
    const entry = await prisma.catalogEntry.create({
      data: {
        imageUrl: data.imageUrl,
        extractedTitle: data.extractedTitle,
        extractedAuthor: data.extractedAuthor,
        extractedISBN: data.extractedISBN,
        extractedPublisher: data.extractedPublisher,
        extractedYear: data.extractedYear,
        enrichedData: data.enrichedData
          ? (data.enrichedData as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        status: "DRAFT",
        catalogerId: session.user.id,
      },
      include: {
        cataloger: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 5. Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CATALOG_ENTRY_CREATED",
        entity: "CatalogEntry",
        entityId: entry.id,
        description: `Entrada de catalogação criada: ${data.extractedTitle || "Sem título"}`,
        metadata: data.extractedTitle ? { title: data.extractedTitle } : null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Erro ao criar entrada de catalogação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cataloging/entries
 * Lista entradas de catalogação
 *
 * Query params:
 * - status: DRAFT | REVIEW | APPROVED | REJECTED
 * - catalogerId: filtrar por catalogador
 * - page: número da página (padrão 1)
 * - limit: itens por página (padrão 20)
 */
export async function GET(request: NextRequest) {
  try {
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

    const allowedTypes = ["CATALOGER", "SUPERVISOR", "LIBRARIAN"];
    if (!allowedTypes.includes(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const catalogerId = searchParams.get("catalogerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // 4. Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (catalogerId) where.catalogerId = catalogerId;

    // Catalogadores veem apenas suas próprias entradas (exceto supervisores)
    if (user.type === "CATALOGER") {
      where.catalogerId = session.user.id;
    }

    // 5. Buscar entradas
    const [entries, total] = await Promise.all([
      prisma.catalogEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          cataloger: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          supervisor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.catalogEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar entradas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
