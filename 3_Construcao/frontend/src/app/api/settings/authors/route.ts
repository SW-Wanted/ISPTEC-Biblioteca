import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const where = query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { biography: { contains: query, mode: "insensitive" as const } },
            { nationality: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {};

    const authors = await prisma.author.findMany({
      where,
      include: {
        _count: {
          select: {
            books: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      authors: authors.map((author) => ({
        id: author.id,
        name: author.name,
        biography: author.biography,
        nationality: author.nationality,
        birthDate: author.birthDate,
        booksCount: author._count.books,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar autores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar autores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, biography, nationality, birthDate } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const author = await prisma.author.create({
      data: {
        name: name.trim(),
        biography: biography?.trim() || null,
        nationality: nationality?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    return NextResponse.json({ success: true, author });
  } catch (error) {
    console.error("Erro ao criar autor:", error);
    return NextResponse.json(
      { error: "Erro ao criar autor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, biography, nationality, birthDate } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const author = await prisma.author.update({
      where: { id },
      data: {
        name: name.trim(),
        biography: biography?.trim() || null,
        nationality: nationality?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    return NextResponse.json({ success: true, author });
  } catch (error) {
    console.error("Erro ao atualizar autor:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar autor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // Verificar se o autor tem livros associados
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            books: true,
          },
        },
      },
    });

    if (!author) {
      return NextResponse.json(
        { error: "Autor não encontrado" },
        { status: 404 }
      );
    }

    if (author._count.books > 0) {
      return NextResponse.json(
        { error: "Não é possível eliminar autor com livros associados" },
        { status: 400 }
      );
    }

    await prisma.author.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao eliminar autor:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar autor" },
      { status: 500 }
    );
  }
}
