import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserType, Prisma } from "@prisma/client";

// Validação de autorização
async function requireSettingsAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, type: true },
  });

  const isAdmin =
    user &&
    [UserType.SUPERVISOR, UserType.LIBRARIAN, UserType.STAFF].includes(
      user.type as any,
    );
  if (!isAdmin) return null;

  return user;
}

// GET: Listar todas as categorias
export async function GET(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get("q")?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined;

    let categories: Array<{
      id: string;
      name: string;
      description: string | null;
      parentId: string | null;
      parent: { id: string; name: string } | null;
      _count: { children: number };
    }> = [];

    try {
      categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          parentId: true,
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true } },
        },
        where,
        orderBy: { name: "asc" },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const fallback = await prisma.category.findMany({
          select: {
            id: true,
            name: true,
            description: true,
            parentId: true,
          },
          where,
          orderBy: { name: "asc" },
        });

        return NextResponse.json({
          categories: fallback.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            parentId: c.parentId,
            parent: null,
            childrenCount: 0,
            createdBy: null,
          })),
        });
      }
      throw error;
    }

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        parentId: c.parentId,
        parent: c.parent,
        childrenCount: c._count.children,
        createdBy: null,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST: Criar nova categoria
export async function POST(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      parentId: z.string().optional(),
    });

    const validated = schema.parse(body);

    // Validar duplicata (case-insensitive)
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Categoria com este nome já existe" },
        { status: 409 },
      );
    }

    // Validar se parent existe
    if (validated.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: validated.parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Categoria pai não encontrada" },
          { status: 404 },
        );
      }
    }

    let category: {
      id: string;
      name: string;
      description: string | null;
      parentId: string | null;
      parent?: { id: string; name: string } | null;
      createdBy?: { id: string; name: string } | null;
    };

    try {
      category = await prisma.category.create({
        data: {
          name: validated.name,
          description: validated.description,
          parentId: validated.parentId,
          createdById: user.id,
        },
        include: {
          parent: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        category = await prisma.category.create({
          data: {
            name: validated.name,
            description: validated.description,
            parentId: validated.parentId,
          },
          include: {
            parent: { select: { id: true, name: true } },
          },
        });
      } else {
        throw error;
      }
    }

    // Log de auditoria
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "CATEGORY_CREATED",
          newValue: JSON.stringify({
            categoryId: category.id,
            name: category.name,
            parentId: category.parentId,
          }),
          changedBy: user.id,
          reason: `Nova categoria "${category.name}" criada`,
        },
      });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2021" || error.code === "P2022")
        )
      ) {
        throw error;
      }
    }

    return NextResponse.json(
      {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        parent: category.parent ?? null,
        createdBy: category.createdBy ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// PATCH: Atualizar categoria
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(255),
      description: z.string().optional().nullable(),
      parentId: z.string().optional().nullable(),
    });

    const validated = schema.parse(body);

    if (validated.parentId && validated.parentId === validated.id) {
      return NextResponse.json(
        { error: "Categoria não pode ser pai de si mesma" },
        { status: 400 },
      );
    }

    const existingCategory = await prisma.category.findUnique({
      where: { id: validated.id },
      select: { id: true },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: "insensitive" },
        NOT: { id: validated.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Categoria com este nome já existe" },
        { status: 409 },
      );
    }

    if (validated.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: validated.parentId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Categoria pai não encontrada" },
          { status: 404 },
        );
      }
    }

    const category = await prisma.category.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        description: validated.description ?? null,
        parentId: validated.parentId ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        parent: { select: { id: true, name: true } },
      },
    });

    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "CATEGORY_UPDATED",
          newValue: JSON.stringify({
            categoryId: category.id,
            name: category.name,
            parentId: category.parentId,
          }),
          changedBy: user.id,
          reason: `Categoria "${category.name}" atualizada`,
        },
      });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2021" || error.code === "P2022")
        )
      ) {
        throw error;
      }
    }

    return NextResponse.json({
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      parent: category.parent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// DELETE: Eliminar categoria
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const schema = z.object({ id: z.string().min(1) });
    const validated = schema.parse(
      body?.id ? body : { id: request.nextUrl.searchParams.get("id") },
    );

    const [booksCount, childrenCount] = await Promise.all([
      prisma.book.count({ where: { categoryId: validated.id } }),
      prisma.category.count({ where: { parentId: validated.id } }),
    ]);

    if (booksCount > 0) {
      return NextResponse.json(
        { error: "Categoria já está associada a livros" },
        { status: 409 },
      );
    }

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: "Categoria possui subcategorias" },
        { status: 409 },
      );
    }

    const deleted = await prisma.category.delete({
      where: { id: validated.id },
      select: { id: true, name: true },
    });

    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "CATEGORY_DELETED",
          newValue: JSON.stringify({
            categoryId: deleted.id,
            name: deleted.name,
          }),
          changedBy: user.id,
          reason: `Categoria "${deleted.name}" eliminada`,
        },
      });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2021" || error.code === "P2022")
        )
      ) {
        throw error;
      }
    }

    return NextResponse.json({ id: deleted.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao eliminar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
