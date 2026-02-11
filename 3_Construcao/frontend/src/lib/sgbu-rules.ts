import { UserType, LoanPolicy, MaterialType } from "@prisma/client";

export const LOAN_LIMITS: Record<
  UserType,
  {
    maxBooks: number;
    loanDays: number;
  }
> = {
  STUDENT: { maxBooks: 2, loanDays: 5 },
  TEACHER: { maxBooks: 4, loanDays: 15 },
  STAFF: { maxBooks: 4, loanDays: 15 },
  LIBRARIAN: { maxBooks: 4, loanDays: 15 },
  CATALOGER: { maxBooks: 4, loanDays: 15 },
  SUPERVISOR: { maxBooks: 4, loanDays: 15 },
};

// 📚 SGBU-007: Políticas de Empréstimo por Tipo de Material (Artigo 10º)
export const LOAN_POLICY_DAYS: Record<LoanPolicy, number | null> = {
  STANDARD: null, // Usa LOAN_LIMITS por UserType
  DAILY: 1, // 1 dia útil (cedência diária)
  SHORT_TERM: 2, // 2 dias úteis (CD/DVD)
  NO_LOAN: 0, // Não empresta (livros de referência)
  EXTENDED: 30, // 30 dias (teses/dissertações)
};

// 🎯 SGBU-007: Mapear MaterialType para LoanPolicy padrão
export const MATERIAL_TYPE_DEFAULT_POLICY: Record<MaterialType, LoanPolicy> = {
  BOOK: LoanPolicy.STANDARD,
  DAILY_LOAN: LoanPolicy.DAILY,
  REFERENCE: LoanPolicy.NO_LOAN,
  CD_DVD: LoanPolicy.SHORT_TERM,
  MAGAZINE: LoanPolicy.DAILY,
  THESIS: LoanPolicy.EXTENDED,
};

export const FINE_PER_DAY_KZ = 50;

/**
 * 📅 SGBU-007: Calcula data de vencimento baseado em LoanPolicy e UserType
 *
 * Regras do Artigo 10º:
 * - STANDARD: Depende do tipo de utilizador (5 dias estudante, 15 dias docente)
 * - DAILY: 1 dia útil (livros de cedência diária)
 * - SHORT_TERM: 2 dias úteis (CD/DVD)
 * - NO_LOAN: Não permite empréstimo
 * - EXTENDED: 30 dias (teses/dissertações)
 *
 * @param userType - Tipo de utilizador
 * @param loanPolicy - Política de empréstimo do livro
 * @param fromDate - Data inicial (padrão: agora)
 * @returns Data de vencimento calculada
 */
export function calculateDueDate(
  userType: UserType,
  loanPolicy: LoanPolicy,
  fromDate: Date = new Date(),
  loanDaysOverride?: number,
): Date {
  let days: number;

  if (loanPolicy === LoanPolicy.NO_LOAN) {
    throw new Error("Material de referência não pode ser emprestado");
  }

  if (loanPolicy === LoanPolicy.STANDARD) {
    // Usa os limites padrão por tipo de utilizador
    days = loanDaysOverride ?? LOAN_LIMITS[userType].loanDays;
  } else {
    // Usa política específica do material
    const policyDays = LOAN_POLICY_DAYS[loanPolicy];
    if (policyDays === null || policyDays === 0) {
      throw new Error(
        `Política de empréstimo ${loanPolicy} não permite empréstimo`,
      );
    }
    days = policyDays;
  }

  // Adiciona dias à data inicial
  const dueDate = new Date(fromDate);
  dueDate.setDate(dueDate.getDate() + days);

  return dueDate;
}

/**
 * 🔢 SGBU-007: Calcula próximo dia útil (pula fins de semana)
 * Usado para políticas DAILY e SHORT_TERM
 */
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    // Pula sábado (6) e domingo (0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }

  return result;
}

export function normalizeEnum(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().toUpperCase();
}

export function toIso(value: Date | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.toISOString();
}

export function clampInt(value: unknown, min: number, max: number): number {
  const n =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// =====================================================
// 📕📒📓 COPY CLASSIFICATION SYSTEM (Red/Yellow/White)
// =====================================================

export interface CopyClassificationRule {
  color: "RED" | "YELLOW" | "WHITE";
  label: string;
  fromCopy: number;
  toCopy: number | null;
  loanPolicy: string;
  maxLoanDays: number | null;
  description: string;
}

/**
 * Default copy classification rules based on ISPTEC library practice:
 * - Red (exemplar 1): Reference copy, cannot be loaned
 * - Yellow (exemplars 2-3): Short-term loan (2 days)
 * - White (exemplars 4+): Standard loan (normal policy)
 */
export const DEFAULT_COPY_CLASSIFICATION_RULES: CopyClassificationRule[] = [
  {
    color: "RED",
    label: "Vermelho",
    fromCopy: 1,
    toCopy: 1,
    loanPolicy: "NO_LOAN",
    maxLoanDays: null,
    description: "Exemplar de referência - Não pode ser emprestado",
  },
  {
    color: "YELLOW",
    label: "Amarelo",
    fromCopy: 2,
    toCopy: 3,
    loanPolicy: "SHORT_TERM",
    maxLoanDays: 2,
    description: "Empréstimo curto - Máximo 2 dias",
  },
  {
    color: "WHITE",
    label: "Branco",
    fromCopy: 4,
    toCopy: null,
    loanPolicy: "STANDARD",
    maxLoanDays: null,
    description: "Empréstimo normal - Prazo conforme tipo de utilizador",
  },
];

export const COPY_CLASSIFICATION_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  RED: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  YELLOW: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  WHITE: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
};

/**
 * Determines the classification rule for a given copy number.
 */
export function getCopyClassification(
  copyNumber: number,
  rules: CopyClassificationRule[] | null | undefined = DEFAULT_COPY_CLASSIFICATION_RULES,
): CopyClassificationRule | null {
  // Garantir que rules é um array válido
  const validRules = Array.isArray(rules) && rules.length > 0 
    ? rules 
    : DEFAULT_COPY_CLASSIFICATION_RULES;

  for (const rule of validRules) {
    if (
      copyNumber >= rule.fromCopy &&
      (rule.toCopy === null || copyNumber <= rule.toCopy)
    ) {
      return rule;
    }
  }
  return validRules.find((r) => r.toCopy === null) || null;
}
