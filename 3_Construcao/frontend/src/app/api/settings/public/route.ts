import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOAN_LIMITS } from "@/lib/sgbu-rules";
import {
  DEFAULT_FINE_CONFIGS,
  DEFAULT_SYSTEM_POLICIES,
} from "@/lib/settings-config";
import { Prisma } from "@prisma/client";

/**
 * GET /api/settings/public
 * Retorna configurações públicas para exibição nas páginas (Help, Home, etc.)
 * Não requer autenticação pois são informações públicas
 */
export async function GET(_request: NextRequest) {
  try {
    // Buscar políticas de empréstimo
    const loanPolicies: Record<
      string,
      { loanDays: number; maxBooks: number; maxRenewals: number }
    > = {};

    try {
      const dbPolicies = await prisma.loanPolicyConfig.findMany({
        select: {
          userType: true,
          loanDays: true,
          maxBooks: true,
          maxRenewals: true,
        },
      });

      // Converter array para objeto indexado por userType
      dbPolicies.forEach((policy) => {
        loanPolicies[policy.userType] = {
          loanDays: policy.loanDays,
          maxBooks: policy.maxBooks,
          maxRenewals: policy.maxRenewals,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        // Tabela não existe, usar fallback
        console.log("⚠️  LoanPolicyConfig não existe, usando LOAN_LIMITS");
      } else {
        throw error;
      }
    }

    // Merge com defaults
    const finalPolicies = {
      STUDENT: loanPolicies.STUDENT || LOAN_LIMITS.STUDENT,
      TEACHER: loanPolicies.TEACHER || LOAN_LIMITS.TEACHER,
      STAFF: loanPolicies.STAFF || LOAN_LIMITS.STAFF,
      LIBRARIAN: loanPolicies.LIBRARIAN || LOAN_LIMITS.LIBRARIAN,
      CATALOGER: loanPolicies.CATALOGER || LOAN_LIMITS.CATALOGER,
      SUPERVISOR: loanPolicies.SUPERVISOR || LOAN_LIMITS.SUPERVISOR,
    };

    // Buscar configurações do sistema
    const systemPolicies: Record<string, string> = {};

    try {
      const dbSystemPolicies = await prisma.systemPolicy.findMany({
        select: {
          key: true,
          value: true,
        },
      });

      dbSystemPolicies.forEach((policy) => {
        systemPolicies[policy.key] = policy.value;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        console.log(
          "⚠️  SystemPolicy não existe, usando DEFAULT_SYSTEM_POLICIES",
        );
      } else {
        throw error;
      }
    }

    // Merge com defaults
    const finalSystemPolicies = {
      ...DEFAULT_SYSTEM_POLICIES,
      ...systemPolicies,
    };

    // Buscar multas (opcional, apenas valores)
    const fines: Record<string, number> = {};

    try {
      const dbFines = await prisma.fineConfiguration.findMany({
        where: { isActive: true },
        select: {
          type: true,
          amount: true,
        },
      });

      dbFines.forEach((fine) => {
        fines[fine.type] = Number(fine.amount);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        console.log(
          "⚠️  FineConfiguration não existe, usando DEFAULT_FINE_CONFIGS",
        );
      } else {
        throw error;
      }
    }

    // Merge com defaults
    const finalFines = {
      ...DEFAULT_FINE_CONFIGS,
      ...fines,
    };

    // Buscar FAQs ativas
    let faqs: Array<{
      id: string;
      question: string;
      answer: string;
      order: number;
    }> = [];
    try {
      faqs = await prisma.fAQ.findMany({
        where: { isActive: true },
        select: {
          id: true,
          question: true,
          answer: true,
          order: true,
        },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.warn("Erro ao buscar FAQs, usando lista vazia:", error);
    }

    return NextResponse.json({
      loanPolicies: finalPolicies,
      systemPolicies: finalSystemPolicies,
      fines: finalFines,
      faqs: faqs,
      metadata: {
        source: "database_with_fallback",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar configurações públicas:", error);

    // Retornar valores padrão em caso de erro
    return NextResponse.json({
      loanPolicies: {
        STUDENT: LOAN_LIMITS.STUDENT,
        TEACHER: LOAN_LIMITS.TEACHER,
        STAFF: LOAN_LIMITS.STAFF,
        LIBRARIAN: LOAN_LIMITS.LIBRARIAN,
        CATALOGER: LOAN_LIMITS.CATALOGER,
        SUPERVISOR: LOAN_LIMITS.SUPERVISOR,
      },
      systemPolicies: DEFAULT_SYSTEM_POLICIES,
      fines: DEFAULT_FINE_CONFIGS,
      faqs: [],
      metadata: {
        source: "fallback_defaults",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
