import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
  categoryId: z.string().cuid(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  location: z.string().optional(),
  totalCopies: z.number().int().min(1).default(1),
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

    if (entry.status !== "PENDING_REVIEW" && entry.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Entrada já foi processada (status: ${entry.status})` },
        { status: 400 },
      );
    }

    // 5. Verificar se livro já existe (por ISBN ou título exato)
    let book: Prisma.BookGetPayload<{
      select: { id: true; isbn: true };
    }> | null = null;

    if (data.isbn) {
      book = await prisma.book.findUnique({
        where: { isbn: data.isbn },
        select: { id: true, isbn: true },
      });
    }

    // Se não encontrou por ISBN, buscar por título exato
    if (!book) {
      book = await prisma.book.findFirst({
        where: {
          title: { equals: data.title, mode: "insensitive" },
        },
        select: { id: true, isbn: true },
      });
    }

    // 6. Transaction: criar/atualizar Book + Copies + atualizar Entry
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 6a. Criar ou atualizar livro
        if (book) {
          // Livro já existe, apenas atualizar totalCopies e availableCopies
          book = await tx.book.update({
            where: { id: book.id },
            data: {
              totalCopies: { increment: data.totalCopies },
              availableCopies: { increment: data.totalCopies },
            },
            select: { id: true, isbn: true },
          });
        } else {
          // Criar novo livro + autores
          // Parsear autores (separados por vírgula)
          const authorNames = data.authors
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean);

          // Criar publisher se necessário
          let publisherId: string | undefined;
          if (data.publisher) {
            const publisher = await tx.publisher.upsert({
              where: { name: data.publisher },
              create: { name: data.publisher },
              update: {},
            });
            publisherId = publisher.id;
          }

          // Criar livro
          book = await tx.book.create({
            data: {
              title: data.title,
              subtitle: data.subtitle,
              isbn: data.isbn,
              publisherId: publisherId,
              publicationYear: data.publicationYear,
              edition: data.edition,
              language: data.language,
              pages: data.pages,
              categoryId: data.categoryId,
              description: data.description,
              coverUrl: data.coverUrl || entry.imageUrl,
              totalCopies: data.totalCopies,
              availableCopies: data.totalCopies,
            },
            select: { id: true, isbn: true },
          });

          // Criar autores e relações
          for (const authorName of authorNames) {
            let author = await tx.author.findFirst({
              where: { name: authorName },
            });

            if (!author) {
              author = await tx.author.create({
                data: { name: authorName },
              });
            }

            await tx.bookAuthor.create({
              data: {
                bookId: book.id,
                authorId: author.id,
              },
            });
          }
        }

        // 6b. Criar cópias físicas
        const copies = [];
        for (let i = 0; i < data.totalCopies; i++) {
          const copy = await tx.copy.create({
            data: {
              bookId: book.id,
              barcode: `${book.isbn || book.id}-${String(i + 1).padStart(3, "0")}`,
              status: "AVAILABLE",
              location: data.location || "Acervo Geral",
              condition: "GOOD",
            },
          });
          copies.push(copy);
        }

        // 6c. Atualizar entry para APPROVED
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

        // 6d. Notificar catalogador
        await tx.notification.create({
          data: {
            userId: entry.catalogerId,
            type: "IN_APP",
            title: "Catalogação aprovada",
            message: `Sua catalogação "${data.title}" foi aprovada por ${user.type === "SUPERVISOR" ? "supervisor" : "bibliotecário"}.`,
            metadata: {
              entryId,
              bookId: book.id,
              reviewNotes: data.reviewNotes,
            },
          },
        });

        // 6e. Log de atividade
        await tx.activityLog.create({
          data: {
            user: { connect: { id: session.user.id } },
            action: "CATALOG_ENTRY_APPROVED",
            entity: "CatalogEntry",
            entityId: entryId,
            description: `Catalogação aprovada: "${data.title}" (${data.totalCopies} cópia${data.totalCopies > 1 ? "s" : ""})`,
            metadata: {
              bookId: book.id,
              title: data.title,
              copies: data.totalCopies,
            },
          },
        });

        return { entry: updatedEntry, book, copies };
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

    console.error("Erro ao aprovar catalogação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
