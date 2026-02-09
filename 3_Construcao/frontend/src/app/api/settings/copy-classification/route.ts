import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COPY_CLASSIFICATION_RULES } from "@/lib/sgbu-rules";
import type { CopyClassificationRule } from "@/lib/sgbu-rules";

const POLICY_KEY = "COPY_CLASSIFICATION_RULES";

/**
 * GET /api/settings/copy-classification
 * Returns copy classification rules
 */
export async function GET() {
  try {
    const policy = await prisma.systemPolicy.findUnique({
      where: { key: POLICY_KEY },
    });

    if (policy?.value) {
      try {
        const rules = JSON.parse(policy.value) as CopyClassificationRule[];
        return NextResponse.json({ rules });
      } catch {
        // Invalid JSON, return defaults
      }
    }

    return NextResponse.json({ rules: DEFAULT_COPY_CLASSIFICATION_RULES });
  } catch (error) {
    console.error("Erro ao buscar regras de classificação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar regras" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/copy-classification
 * Updates copy classification rules (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Check admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, type: true },
    });

    if (!user || !["SUPERVISOR", "LIBRARIAN", "STAFF"].includes(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const rules = body.rules as CopyClassificationRule[];

    // Validate rules
    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: "Regras inválidas" }, { status: 400 });
    }

    for (const rule of rules) {
      if (!rule.color || !rule.label || !rule.fromCopy || !rule.loanPolicy) {
        return NextResponse.json(
          {
            error:
              "Cada regra precisa ter cor, nome, número inicial e política",
          },
          { status: 400 },
        );
      }
    }

    // Save to SystemPolicy
    await prisma.systemPolicy.upsert({
      where: { key: POLICY_KEY },
      create: {
        key: POLICY_KEY,
        value: JSON.stringify(rules),
        description:
          "Regras de classificação de exemplares (Vermelho/Amarelo/Branco)",
        updatedById: user.id,
      },
      update: {
        value: JSON.stringify(rules),
        updatedById: user.id,
      },
    });

    // Audit log
    await prisma.configurationAudit.create({
      data: {
        configKey: POLICY_KEY,
        newValue: JSON.stringify(rules),
        changedBy: user.id,
        reason: "Atualização das regras de classificação de exemplares",
      },
    });

    return NextResponse.json({
      message: "Regras atualizadas com sucesso",
      rules,
    });
  } catch (error) {
    console.error("Erro ao atualizar regras:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar regras" },
      { status: 500 },
    );
  }
}
