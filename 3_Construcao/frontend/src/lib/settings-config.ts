import { FineType, UserType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { LOAN_LIMITS } from "@/lib/sgbu-rules";

export const DEFAULT_FINE_CONFIGS: Record<FineType, number> = {
  LATE_RETURN: 50,
  LOCKER_OVERTIME: 50,
  LOST_CREDENTIAL: 0,
  DAMAGED_BOOK: 0,
  LOST_BOOK: 0,
};

export const DEFAULT_SYSTEM_POLICIES: Record<string, string> = {
  RESERVATION_COLLECTION_HOURS: "48",
  LOCKER_DURATION_HOURS: "3",
  COMPUTER_SESSION_HOURS: "2",
  MAX_RENEWALS: "2",
  TRAINING_MAX_SLOTS: "30",
  TRAINING_DEFAULT_DURATION: "120",
  TRAINING_MIN_ADVANCE_DAYS: "7",
  BOOK_LANGUAGES: "pt,en,es,fr",
  LIBRARY_HOURS_WEEKDAY: "07:30-17:00",
  LIBRARY_HOURS_SATURDAY: "08:00-12:30",
  LIBRARY_HOURS_SUNDAY: "Fechado",
  LIBRARY_SATURDAY_NOTE: "época de provas",
  CONTACT_PHONE: "+244 XXX XXX XXX",
  CONTACT_EMAIL: "biblioteca@isptec.ao",
  CONTACT_LOCATION: "Campus ISPTEC, Luanda",
};

export async function getFineAmount(
  type: FineType,
  fallback: number = DEFAULT_FINE_CONFIGS[type],
): Promise<number> {
  try {
    const config = await prisma.fineConfiguration.findUnique({
      where: { type },
      select: { amount: true, isActive: true },
    });
    if (!config || !config.isActive) return fallback;
    return Number(config.amount);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return fallback;
    }
    throw error;
  }
}

export async function getLoanPolicyConfig(userType: UserType): Promise<{
  loanDays: number;
  maxBooks: number;
  maxRenewals: number;
}> {
  try {
    const config = await prisma.loanPolicyConfig.findUnique({
      where: { userType },
      select: { loanDays: true, maxBooks: true, maxRenewals: true },
    });
    if (!config) {
      const fallback = LOAN_LIMITS[userType];
      return {
        loanDays: fallback.loanDays,
        maxBooks: fallback.maxBooks,
        maxRenewals: 2,
      };
    }
    return config;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      const fallback = LOAN_LIMITS[userType];
      return {
        loanDays: fallback.loanDays,
        maxBooks: fallback.maxBooks,
        maxRenewals: 2,
      };
    }
    throw error;
  }
}

export async function getSystemPolicyValue(
  key: string,
  fallback = DEFAULT_SYSTEM_POLICIES[key] ?? "",
): Promise<string> {
  try {
    const policy = await prisma.systemPolicy.findUnique({
      where: { key },
      select: { value: true },
    });
    return policy?.value ?? fallback;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      const legacy = await prisma.systemConfiguration.findUnique({
        where: { key },
        select: { value: true },
      });
      return legacy?.value ?? fallback;
    }
    throw error;
  }
}

export async function getSystemPolicyNumber(
  key: string,
  fallback: number,
): Promise<number> {
  const value = await getSystemPolicyValue(key, String(fallback));
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function getReservationCollectionHours(): Promise<number> {
  return getSystemPolicyNumber("RESERVATION_COLLECTION_HOURS", 48);
}

export async function getBookLanguages(): Promise<string[]> {
  const value = await getSystemPolicyValue("BOOK_LANGUAGES", "pt,en,es,fr");
  return value
    .split(",")
    .map((lang) => lang.trim())
    .filter(Boolean);
}
