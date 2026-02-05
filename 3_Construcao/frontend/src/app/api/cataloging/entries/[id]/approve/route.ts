import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma, MaterialType, LoanPolicy } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/cataloging/entries/{id}/approve
 * Aprova uma entrada de catalogação e cria o livro + cópias
 *
 * Fluxo:
 * 1. Valida permissões (SUPERVISOR ou LIBRARIAN)
 * 2. Valida entrada existe e está em REVIEW
 * 3. Cria Book e BookCopy baseado nos dados da entry
 * 4. Atualiza entry para APPROVED
 * 5. Notifica catalogador
 */

const approveSchema = z.object({
  // Dados finais do livro (podem ser editados pelo supervisor)
  title: z.string().min(1),
  subtitle: z.string().optional(),
  isbn: z.string().optional(),
  authors: z.string().min(1),
  publisher: z.string().optional(),
  publicationYear: z.number().int().optional(),
  edition: z.string().optional(),
  language: z.string().default("pt"),
  pages: z.number().int().optional(),
  categoryId: z.string().min(1), // Aceita CUID ou nome de categoria
  description: z.string().optional(),
  coverUrl: z.string().optional(), // URL pode ser opcional
  location: z.string().optional(),
  totalCopies: z.number().int().min(1).default(1),
  materialType: z
    .enum(["BOOK", "DAILY_LOAN", "REFERENCE", "CD_DVD", "MAGAZINE", "THESIS"])
    .default("BOOK"),
  loanPolicy: z
    .enum(["STANDARD", "DAILY", "SHORT_TERM", "NO_LOAN", "EXTENDED"])
    .default("STANDARD"),
  reviewNotes: z.string().optional(),
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

    // 2. Verificar permissões (apenas SUPERVISOR ou LIBRARIAN)
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
        { error: "Apenas supervisores podem aprovar catalogações" },
        { status: 403 },
      );
    }

    // 3. Validar input
    const body = await request.json();
    console.log("📥 Dados para aprovação:", JSON.stringify(body, null, 2));

    const data = approveSchema.parse(body);

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

    console.log("📋 Status da entrada:", entry.status);

    // Aceitar PENDING ou PENDING_REVIEW (modo simplificado para catalogação direta)
    if (!["PENDING", "PENDING_REVIEW", "DRAFT"].includes(entry.status)) {
      return NextResponse.json(
        { error: `Entrada já foi processada (status: ${entry.status})` },
        { status: 400 },
      );
    }

    // 5. Transaction: criar Book + Authors + Publisher + Copies
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 5a. Buscar ou criar categoria
        let finalCategoryId = data.categoryId;

        // Se não for um CUID válido, buscar ou criar por nome
        if (!/^c[a-z0-9]{24,25}$/i.test(data.categoryId)) {
          const category = await tx.category.upsert({
            where: { name: data.categoryId },
            create: { name: data.categoryId },
            update: {},
          });
          finalCategoryId = category.id;
          console.log(
            `📁 Categoria '${data.categoryId}' → ID: ${finalCategoryId}`,
          );
        }

        // 5b. Criar/conectar Publisher (se fornecido)
        let publisherId: string | undefined;
        if (data.publisher) {
          const publisher = await tx.publisher.upsert({
            where: { name: data.publisher },
            create: { name: data.publisher },
            update: {},
          });
          publisherId = publisher.id;
        }

        // 5c. Processar autores (split por vírgula)
        const authorNames = data.authors
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);

        // 5c. Criar livro com relações corretas
        const book = await tx.book.create({
          data: {
            title: data.title,
            subtitle: data.subtitle,
            isbn: data.isbn,
            publicationYear: data.publicationYear,
            edition: data.edition,
            language: data.language,
            pages: data.pages,
            categoryId: finalCategoryId,
            description: data.description,
            coverUrl: data.coverUrl || entry.imageUrl,
            materialType: data.materialType as MaterialType,
            loanPolicy: data.loanPolicy as LoanPolicy,
            totalCopies: data.totalCopies,
            availableCopies: data.totalCopies,
            publisherId,
            extractedByOCR: true,
            ocrConfidence: entry.enrichedData
              ? (entry.enrichedData as any).confidence
              : null,
            // Criar relações BookAuthor (criar novos autores sempre)
            authors: {
              create: authorNames.map((name, index) => ({
                order: index + 1,
                author: {
                  create: { name },
                },
              })),
            },
          },
          include: {
            authors: {
              include: {
                author: true,
              },
            },
            publisher: true,
          },
        });

        // 5d. Criar cópias físicas com barcode único (bulk insert para performance)
        const copiesData = Array.from({ length: data.totalCopies }, (_, i) => ({
          bookId: book.id,
          barcode: `${book.isbn || book.id}-${String(i + 1).padStart(3, "0")}`,
          status: "AVAILABLE" as const,
          location: data.location || "Acervo Geral",
          condition: "GOOD",
        }));

        await tx.copy.createMany({
          data: copiesData,
        });

        // 5e. Atualizar entry para APPROVED
        const updatedEntry = await tx.catalogEntry.update({
          where: { id: entryId },
          data: {
            status: "APPROVED",
            supervisorId: session.user.id,
            reviewNotes: data.reviewNotes,
            approvedAt: new Date(),
            bookId: book.id,
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

        // 5f. Notificar catalogador
        await tx.notification.create({
          data: {
            userId: entry.catalogerId,
            type: "IN_APP",
            title: "Catalogação aprovada",
            message: `Sua catalogação "${data.title}" foi aprovada por ${user.type === "SUPERVISOR" ? "supervisor" : "bibliotecário"}.`,
            status: "PENDING",
            metadata: {
              entryId,
              bookId: book.id,
              reviewNotes: data.reviewNotes,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // 5g. Log de atividade
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "CATALOG_ENTRY_APPROVED",
            entity: "CatalogEntry",
            entityId: entryId,
            description: `Catalogação aprovada: ${data.title}`,
            metadata: {
              bookId: book.id,
              title: data.title,
              copies: data.totalCopies,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        return {
          entry: updatedEntry,
          book,
          copiesCount: data.totalCopies,
        };
      },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Erro de validação:", error.errors);
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("❌ Erro ao aprovar catalogação:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
