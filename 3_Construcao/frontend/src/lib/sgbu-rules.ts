import { UserType } from "@prisma/client"

export const LOAN_LIMITS: Record<
  UserType,
  {
    maxBooks: number
    loanDays: number
  }
> = {
  STUDENT: { maxBooks: 2, loanDays: 5 },
  TEACHER: { maxBooks: 4, loanDays: 15 },
  STAFF: { maxBooks: 4, loanDays: 15 },
  LIBRARIAN: { maxBooks: 4, loanDays: 15 },
  CATALOGER: { maxBooks: 4, loanDays: 15 },
  SUPERVISOR: { maxBooks: 4, loanDays: 15 },
}

export const FINE_PER_DAY_KZ = 50

export function normalizeEnum(value: unknown): string | null {
  if (typeof value !== "string") return null
  return value.trim().toUpperCase()
}

export function toIso(value: Date | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toISOString()
}

export function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.trunc(n)))
}
