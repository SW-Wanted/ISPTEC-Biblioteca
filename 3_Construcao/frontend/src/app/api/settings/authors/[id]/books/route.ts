import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const books = await prisma.book.findMany({
      where: {
        authors: {
          some: {
            authorId: id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        isbn: true,
        coverUrl: true,
        publicationYear: true,
        authors: {
          select: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json({
      books: books.map((book) => ({
        ...book,
        authorsCount: book.authors.length,
        authors: book.authors.map((ba) => ba.author),
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar livros do autor:", error);
    return NextResponse.json(
      { error: "Erro ao buscar livros" },
      { status: 500 }
    );
  }
}

// Desassociar autor de um livro
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: authorId } = await params;
    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json(
        { error: "bookId é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar quantos autores o livro tem
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        authors: true,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 }
      );
    }

    const willDeleteBook = book.authors.length === 1;

    if (willDeleteBook) {
      // Se é o último autor, eliminar o livro completamente
      await prisma.$transaction([
        // Eliminar associações de autores
        prisma.bookAuthor.deleteMany({
          where: { bookId },
        }),
        // Eliminar cópias
        prisma.copy.deleteMany({
          where: { bookId },
        }),
        // Eliminar empréstimos
        prisma.loan.deleteMany({
          where: { copyId: { in: book.authors.map(() => bookId) } },
        }),
        // Eliminar reservas
        prisma.reservation.deleteMany({
          where: { bookId },
        }),
        // Eliminar avaliações
        prisma.bookReview.deleteMany({
          where: { bookId },
        }),
        // Eliminar o livro
        prisma.book.delete({
          where: { id: bookId },
        }),
      ]);

      return NextResponse.json({
        success: true,
        bookDeleted: true,
        message: "Autor desassociado e livro eliminado (era o único autor)",
      });
    } else {
      // Apenas remover a associação
      await prisma.bookAuthor.deleteMany({
        where: {
          bookId,
          authorId,
        },
      });

      return NextResponse.json({
        success: true,
        bookDeleted: false,
        message: "Autor desassociado do livro",
      });
    }
  } catch (error) {
    console.error("Erro ao desassociar autor:", error);
    return NextResponse.json(
      { error: "Erro ao desassociar autor" },
      { status: 500 }
    );
  }
}
