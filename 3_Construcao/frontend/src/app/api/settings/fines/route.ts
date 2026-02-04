import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserType, FineType, Prisma } from "@prisma/client";
import { DEFAULT_FINE_CONFIGS } from "@/lib/settings-config";

// Validação de autorização: apenas SUPERVISOR, LIBRARIAN ou STAFF
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

// GET: Listar todas as configurações de multas
export async function GET(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Sem permissão para acessar configurações" },
        { status: 403 },
      );
    }

    let fineConfigs: Array<{
      id: string;
      type: FineType;
      amount: Prisma.Decimal;
      description: string | null;
      isActive: boolean;
      updatedAt: Date;
    }> = [];

    try {
      fineConfigs = await prisma.fineConfiguration.findMany({
        orderBy: { type: "asc" },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const fallback = Object.entries(DEFAULT_FINE_CONFIGS).map(
          ([type, amount]) => ({
            id: `default-${type}`,
            type: type as FineType,
            amount: new Prisma.Decimal(amount),
            description: null,
            isActive: true,
            updatedAt: new Date(0),
          }),
        );

        return NextResponse.json({
          fineConfigurations: fallback.map((fc) => ({
            id: fc.id,
            type: fc.type,
            amount: Number(fc.amount),
            description: fc.description,
            isActive: fc.isActive,
            updatedAt: null,
          })),
        });
      }
      throw error;
    }

    const byType = new Map(fineConfigs.map((fc) => [fc.type, fc]));
    const merged = Object.entries(DEFAULT_FINE_CONFIGS).map(
      ([type, amount]) =>
        byType.get(type as FineType) ?? {
          id: `default-${type}`,
          type: type as FineType,
          amount: new Prisma.Decimal(amount),
          description: null,
          isActive: true,
          updatedAt: new Date(0),
        },
    );

    return NextResponse.json({
      fineConfigurations: merged.map((fc) => ({
        id: fc.id,
        type: fc.type,
        amount: Number(fc.amount),
        description: fc.description,
        isActive: fc.isActive,
        updatedAt:
          fc.updatedAt.getTime() === 0 ? null : fc.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar configurações de multas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST: Criar nova configuração de multa
export async function POST(request: NextRequest) {
  try {
    const user = await requireSettingsAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Sem permissão para modificar configurações" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const schema = z.object({
      type: z.enum([
        "LATE_RETURN",
        "LOCKER_OVERTIME",
        "LOST_CREDENTIAL",
        "DAMAGED_BOOK",
        "LOST_BOOK",
      ] as const),
      amount: z.number().min(0),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    });

    const validated = schema.parse(body);

    const config = await prisma.fineConfiguration.upsert({
      where: { type: validated.type },
      update: {
        amount: validated.amount,
        description: validated.description,
        isActive: validated.isActive,
        updatedById: user.id,
        updatedAt: new Date(),
      },
      create: {
        type: validated.type,
        amount: validated.amount,
        description: validated.description,
        isActive: validated.isActive,
        updatedById: user.id,
      },
    });

    // Log da auditoria
    try {
      await prisma.configurationAudit.create({
        data: {
          configKey: `FINE_${validated.type}`,
          newValue: String(validated.amount),
          changedBy: user.id,
          reason: "Configuração de multa atualizada",
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
        id: config.id,
        type: config.type,
        amount: Number(config.amount),
        description: config.description,
        isActive: config.isActive,
        updatedAt: config.updatedAt.toISOString(),
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

    console.error("Erro ao criar configuração de multa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
