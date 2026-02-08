import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserType, Prisma } from "@prisma/client";
import { LOAN_LIMITS } from "@/lib/sgbu-rules";

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
      user.type,
    );
  if (!isAdmin) return null;

  return user;
}

// GET: Listar todas as políticas de empréstimo
export async function GET(_request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    let policies: Array<{
      id: string;
      userType: UserType;
      loanDays: number;
      maxBooks: number;
      maxRenewals: number;
      updatedAt: Date;
    }> = [];

    try {
      policies = await prisma.loanPolicyConfig.findMany({
        orderBy: { userType: "asc" },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const fallback = Object.entries(LOAN_LIMITS).map(
          ([userType, limits]) => ({
            id: `default-${userType}`,
            userType: userType as UserType,
            loanDays: limits.loanDays,
            maxBooks: limits.maxBooks,
            maxRenewals: 2,
            updatedAt: new Date(0),
          }),
        );

        return NextResponse.json({
          loanPolicies: fallback.map((p) => ({
            id: p.id,
            userType: p.userType,
            loanDays: p.loanDays,
            maxBooks: p.maxBooks,
            maxRenewals: p.maxRenewals,
            updatedAt: null,
          })),
        });
      }
      throw error;
    }

    const byType = new Map(policies.map((p) => [p.userType, p]));
    const merged = Object.entries(LOAN_LIMITS).map(
      ([userType, limits]) =>
        byType.get(userType as UserType) ?? {
          id: `default-${userType}`,
          userType: userType as UserType,
          loanDays: limits.loanDays,
          maxBooks: limits.maxBooks,
          maxRenewals: 2,
          updatedAt: new Date(0),
        },
    );

    return NextResponse.json({
      loanPolicies: merged.map((p) => ({
        id: p.id,
        userType: p.userType,
        loanDays: p.loanDays,
        maxBooks: p.maxBooks,
        maxRenewals: p.maxRenewals,
        updatedAt:
          p.updatedAt.getTime() === 0 ? null : p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar políticas de empréstimo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST/PATCH: Atualizar política de empréstimo
export async function POST(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      userType: z.enum([
        "STUDENT",
        "TEACHER",
        "STAFF",
        "LIBRARIAN",
        "CATALOGER",
        "SUPERVISOR",
      ] as const),
      loanDays: z.number().int().min(1),
      maxBooks: z.number().int().min(1),
      maxRenewals: z.number().int().min(0).default(2),
    });

    const validated = schema.parse(body);

    const policy = await prisma.loanPolicyConfig.upsert({
      where: { userType: validated.userType },
      update: {
        loanDays: validated.loanDays,
        maxBooks: validated.maxBooks,
        maxRenewals: validated.maxRenewals,
        updatedById: user.id,
        updatedAt: new Date(),
      },
      create: {
        userType: validated.userType,
        loanDays: validated.loanDays,
        maxBooks: validated.maxBooks,
        maxRenewals: validated.maxRenewals,
        updatedById: user.id,
      },
    });

    // Log da auditoria
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: `LOAN_POLICY_${validated.userType}`,
          newValue: JSON.stringify({
            loanDays: validated.loanDays,
            maxBooks: validated.maxBooks,
            maxRenewals: validated.maxRenewals,
          }),
          changedBy: user.id,
          reason: `Política de empréstimo para ${validated.userType} atualizada`,
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
        id: policy.id,
        userType: policy.userType,
        loanDays: policy.loanDays,
        maxBooks: policy.maxBooks,
        maxRenewals: policy.maxRenewals,
        updatedAt: policy.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao atualizar política de empréstimo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
