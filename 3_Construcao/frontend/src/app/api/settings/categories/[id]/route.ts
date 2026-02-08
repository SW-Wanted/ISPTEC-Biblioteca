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
      user.type as UserType,
    );
  if (!isAdmin) return null;

  return user;
}

/**
 * PATCH /api/settings/categories/[id]
 * Atualiza uma categoria existente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      parentId: z.string().nullable().optional(),
    });

    const validated = schema.parse(body);

    // Verificar se categoria existe
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }

    // Se mudou o nome, verificar duplicata
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: { name: validated.name },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Já existe uma categoria com este nome" },
          { status: 409 },
        );
      }
    }

    // Se mudou o parent, validar que não cria ciclo
    if (
      validated.parentId !== undefined &&
      validated.parentId !== existing.parentId
    ) {
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

        // Verificar se não está tentando fazer uma categoria ser pai de si mesma
        if (validated.parentId === id) {
          return NextResponse.json(
            { error: "Uma categoria não pode ser pai de si mesma" },
            { status: 400 },
          );
        }
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    // Registar auditoria (soft fail se tabela não existir)
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "CATEGORY_UPDATED",
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updated),
          changedBy: user.id,
          reason: `Categoria "${updated.name}" atualizada`,
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

    return NextResponse.json({ category: updated });
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

/**
 * DELETE /api/settings/categories/[id]
 * Elimina uma categoria
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Verificar se categoria existe
    const existing = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            books: true,
            children: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }

    // Verificar se tem livros associados
    if (existing._count.books > 0) {
      return NextResponse.json(
        {
          error: "Não é possível eliminar categoria com livros associados",
          booksCount: existing._count.books,
        },
        { status: 409 },
      );
    }

    // Verificar se tem subcategorias
    if (existing._count.children > 0) {
      return NextResponse.json(
        {
          error: "Não é possível eliminar categoria com subcategorias",
          childrenCount: existing._count.children,
        },
        { status: 409 },
      );
    }

    // Eliminar categoria
    const deleted = await prisma.category.delete({
      where: { id },
      select: { id: true, name: true },
    });

    // Registar auditoria (soft fail se tabela não existir)
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "CATEGORY_DELETED",
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify({ deleted: true }),
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

    return NextResponse.json({
      success: true,
      id: deleted.id,
      name: deleted.name,
    });
  } catch (error) {
    console.error("Erro ao eliminar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
