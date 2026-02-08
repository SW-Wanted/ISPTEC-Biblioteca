import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Helper to check if user is settings admin
async function requireSettingsAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Não autenticado", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { type: true, status: true },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !["SUPERVISOR", "LIBRARIAN", "STAFF"].includes(user.type)
  ) {
    return { error: "Acesso negado", status: 403 };
  }

  return { userId: session.user.id };
}

// GET - List all FAQs (public or admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const faqs = await prisma.fAQ.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ faqs }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching FAQs:", error);

    // Se a tabela não existir, retornar array vazio ao invés de erro
    if (error?.code === "P2021" || error?.code === "42P01") {
      console.warn("⚠️  Tabela FAQ não existe ainda. Retornando lista vazia.");
      return NextResponse.json({ faqs: [] }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Erro ao carregar perguntas frequentes" },
      { status: 500 },
    );
  }
}

// POST - Create new FAQ
export async function POST(request: NextRequest) {
  const authCheck = await requireSettingsAdmin();
  if ("error" in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  try {
    const body = await request.json();

    const schema = z.object({
      question: z.string().min(10, "Pergunta deve ter no mínimo 10 caracteres"),
      answer: z.string().min(20, "Resposta deve ter no mínimo 20 caracteres"),
      order: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(body);

    // If no order specified, get max order + 1
    if (data.order === undefined) {
      const maxOrder = await prisma.fAQ.aggregate({
        _max: { order: true },
      });
      data.order = (maxOrder._max.order || 0) + 1;
    }

    const faq = await prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        order: data.order,
        isActive: data.isActive ?? true,
        createdById: authCheck.userId,
        updatedById: authCheck.userId,
      },
    });

    // Log audit
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "FAQ_CREATED",
          oldValue: null,
          newValue: JSON.stringify({ id: faq.id, question: faq.question }),
          changedBy: authCheck.userId,
        },
      });
    } catch (auditError) {
      console.warn("Failed to log FAQ creation audit:", auditError);
    }

    return NextResponse.json(faq, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    // Se a tabela não existir
    if (error?.code === "P2021" || error?.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Tabela FAQ não existe. Execute a migration: npx prisma migrate deploy",
          hint: "A tabela FAQ ainda não foi criada no banco de dados.",
        },
        { status: 503 },
      );
    }

    console.error("Error creating FAQ:", error);
    return NextResponse.json(
      { error: "Erro ao criar pergunta frequente" },
      { status: 500 },
    );
  }
}

// PATCH - Update FAQ
export async function PATCH(request: NextRequest) {
  const authCheck = await requireSettingsAdmin();
  if ("error" in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  try {
    const body = await request.json();

    // Schema mais permissivo: valida apenas se o campo estiver presente
    const schema = z
      .object({
        id: z.string().min(1),
        question: z.string().min(10).optional(),
        answer: z.string().min(20).optional(),
        order: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
      .refine(
        (data) => {
          // Pelo menos um campo além de 'id' deve estar presente
          const hasUpdate =
            data.question !== undefined ||
            data.answer !== undefined ||
            data.order !== undefined ||
            data.isActive !== undefined;
          return hasUpdate;
        },
        { message: "Pelo menos um campo deve ser fornecido para atualização" },
      );

    const data = schema.parse(body);

    const existingFAQ = await prisma.fAQ.findUnique({
      where: { id: data.id },
    });

    if (!existingFAQ) {
      return NextResponse.json(
        { error: "Pergunta frequente não encontrada" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {
      updatedById: authCheck.userId,
    };

    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const faq = await prisma.fAQ.update({
      where: { id: data.id },
      data: updateData,
    });

    // Log audit
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "FAQ_UPDATED",
          oldValue: JSON.stringify(existingFAQ),
          newValue: JSON.stringify(faq),
          changedBy: authCheck.userId,
        },
      });
    } catch (auditError) {
      console.warn("Failed to log FAQ update audit:", auditError);
    }

    return NextResponse.json(faq, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "❌ Zod validation error:",
        JSON.stringify(error.errors, null, 2),
      );
      const errorMessage =
        error.errors && error.errors.length > 0
          ? error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")
          : error.message || "Dados inválidos";

      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors || [],
          message: errorMessage,
        },
        { status: 400 },
      );
    }

    console.error("Error updating FAQ:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pergunta frequente" },
      { status: 500 },
    );
  }
}

// DELETE - Delete FAQ
export async function DELETE(request: NextRequest) {
  const authCheck = await requireSettingsAdmin();
  if ("error" in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  try {
    const body = await request.json();

    const schema = z.object({
      id: z.string().cuid(),
    });

    const { id } = schema.parse(body);

    const existingFAQ = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!existingFAQ) {
      return NextResponse.json(
        { error: "Pergunta frequente não encontrada" },
        { status: 404 },
      );
    }

    await prisma.fAQ.delete({
      where: { id },
    });

    // Log audit
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: "FAQ_DELETED",
          oldValue: JSON.stringify(existingFAQ),
          newValue: null,
          changedBy: authCheck.userId,
        },
      });
    } catch (auditError) {
      console.warn("Failed to log FAQ deletion audit:", auditError);
    }

    return NextResponse.json(
      { message: "Pergunta frequente eliminada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error deleting FAQ:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar pergunta frequente" },
      { status: 500 },
    );
  }
}
