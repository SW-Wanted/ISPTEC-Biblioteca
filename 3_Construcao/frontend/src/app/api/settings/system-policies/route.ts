import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserType, Prisma } from "@prisma/client";
import { DEFAULT_SYSTEM_POLICIES } from "@/lib/settings-config";

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

// GET: Listar todas as políticas do sistema
export async function GET(_request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    let policies: Array<{
      id: string;
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date;
    }> = [];

    try {
      policies = await prisma.systemPolicy.findMany({
        orderBy: { key: "asc" },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacy = await prisma.systemConfiguration.findMany({
          orderBy: { key: "asc" },
        });

        if (legacy.length > 0) {
          return NextResponse.json({
            systemPolicies: legacy.map((p) => ({
              id: p.id,
              key: p.key,
              value: p.value,
              description: p.description,
              updatedAt: p.updatedAt.toISOString(),
            })),
          });
        }

        const fallback = Object.entries(DEFAULT_SYSTEM_POLICIES).map(
          ([key, value]) => ({
            id: `default-${key}`,
            key,
            value,
            description: null,
            updatedAt: new Date(0),
          }),
        );

        return NextResponse.json({
          systemPolicies: fallback.map((p) => ({
            id: p.id,
            key: p.key,
            value: p.value,
            description: p.description,
            updatedAt: null,
          })),
        });
      }
      throw error;
    }

    const byKey = new Map(policies.map((p) => [p.key, p]));
    const merged = Object.entries(DEFAULT_SYSTEM_POLICIES).map(
      ([key, value]) =>
        byKey.get(key) ?? {
          id: `default-${key}`,
          key,
          value,
          description: null,
          updatedAt: new Date(0),
        },
    );

    return NextResponse.json({
      systemPolicies: merged.map((p) => ({
        id: p.id,
        key: p.key,
        value: p.value,
        description: p.description,
        updatedAt:
          p.updatedAt.getTime() === 0 ? null : p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar políticas do sistema:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST/PATCH: Criar ou atualizar política do sistema
export async function POST(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      key: z.string().min(1).max(255),
      value: z.string(),
      description: z.string().optional(),
    });

    const validated = schema.parse(body);

    let oldPolicy: { value: string | null } | null = null;
    let policy: {
      id: string;
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date;
    };

    try {
      // Buscar valor anterior para auditoria
      oldPolicy = await prisma.systemPolicy.findUnique({
        where: { key: validated.key },
      });

      policy = await prisma.systemPolicy.upsert({
        where: { key: validated.key },
        update: {
          value: validated.value,
          description: validated.description,
          updatedById: user.id,
          updatedAt: new Date(),
        },
        create: {
          key: validated.key,
          value: validated.value,
          description: validated.description,
          updatedById: user.id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        oldPolicy = await prisma.systemConfiguration.findUnique({
          where: { key: validated.key },
        });

        const legacy = await prisma.systemConfiguration.upsert({
          where: { key: validated.key },
          update: {
            value: validated.value,
            description: validated.description,
            updatedBy: user.id,
          },
          create: {
            key: validated.key,
            value: validated.value,
            description: validated.description,
            updatedBy: user.id,
          },
        });

        policy = {
          id: legacy.id,
          key: legacy.key,
          value: legacy.value,
          description: legacy.description,
          updatedAt: legacy.updatedAt,
        };
      } else {
        throw error;
      }
    }

    // Log da auditoria
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: validated.key,
          oldValue: oldPolicy?.value ?? undefined,
          newValue: validated.value,
          changedBy: user.id,
          reason: `Política ${validated.key} atualizada`,
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
        key: policy.key,
        value: policy.value,
        description: policy.description,
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

    console.error("Erro ao atualizar política do sistema:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
