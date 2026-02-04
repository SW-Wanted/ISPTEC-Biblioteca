/**
 * Helpers para mapear tipos do Prisma para labels legíveis
 * e garantir consistência entre backend e frontend
 */

import { UserType, UserStatus, AccountActivationStatus } from "@prisma/client";

/**
 * Mapeia UserType do Prisma para label em português
 */
export function getUserTypeLabel(type?: string | UserType | null): string {
  if (!type) return "";

  const typeUpper = typeof type === "string" ? type.toUpperCase() : type;

  const labels: Record<string, string> = {
    STUDENT: "Estudante",
    TEACHER: "Docente",
    STAFF: "Funcionário",
    LIBRARIAN: "Bibliotecário",
    CATALOGER: "Catalogador",
    SUPERVISOR: "Supervisor",
  };

  return labels[typeUpper] || String(type);
}

/**
 * Mapeia UserStatus do Prisma para label em português
 */
export function getUserStatusLabel(
  status?: string | UserStatus | null,
): string {
  if (!status) return "";

  const statusUpper =
    typeof status === "string" ? status.toUpperCase() : status;

  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    BLOCKED: "Bloqueado",
    PENDING: "Pendente",
  };

  return labels[statusUpper] || String(status);
}

/**
 * Mapeia AccountActivationStatus para label
 */
export function getActivationStatusLabel(
  status?: string | AccountActivationStatus | null,
): string {
  if (!status) return "";

  const statusUpper =
    typeof status === "string" ? status.toUpperCase() : status;

  const labels: Record<string, string> = {
    PENDING_DOCUMENTS: "Aguardando Documentos",
    PENDING_TRAINING: "Aguardando Formação",
    TRAINING_SCHEDULED: "Formação Agendada",
    ACTIVE: "Ativa",
    BLOCKED: "Bloqueada",
  };

  return labels[statusUpper] || String(status);
}

/**
 * Verifica se é estudante
 */
export function isStudent(type?: string | UserType | null): boolean {
  if (!type) return false;
  const typeUpper = typeof type === "string" ? type.toUpperCase() : type;
  return typeUpper === "STUDENT";
}

/**
 * Verifica se é docente
 */
export function isTeacher(type?: string | UserType | null): boolean {
  if (!type) return false;
  const typeUpper = typeof type === "string" ? type.toUpperCase() : type;
  return typeUpper === "TEACHER";
}

/**
 * Verifica se é admin (SUPERVISOR ou LIBRARIAN)
 */
export function isAdmin(type?: string | UserType | null): boolean {
  if (!type) return false;
  const typeUpper = typeof type === "string" ? type.toUpperCase() : type;
  return typeUpper === "SUPERVISOR" || typeUpper === "LIBRARIAN";
}

/**
 * Retorna limites de empréstimo baseado no tipo de usuário
 */
export function getLoanLimits(type?: string | UserType | null): {
  maxBooks: number;
  loanDays: number;
} {
  if (isTeacher(type)) {
    return { maxBooks: 4, loanDays: 15 };
  }
  return { maxBooks: 2, loanDays: 5 }; // Padrão para estudantes
}

/**
 * Mapeia NotificationType para labels em português
 */
export function getNotificationTypeLabel(type?: string | null): string {
  if (!type) return "Não definido";

  const typeUpper = type.toUpperCase();
  const labels: Record<string, string> = {
    EMAIL: "Email",
    SMS: "SMS",
    PUSH: "Notificação Push",
    IN_APP: "Notificação no App",
  };

  return labels[typeUpper] || type;
}

/**
 * Obtém todas as opções de notificação disponíveis
 */
export function getNotificationTypeOptions() {
  return [
    { value: "EMAIL", label: "Email" },
    { value: "SMS", label: "SMS" },
    { value: "PUSH", label: "Notificação Push" },
    { value: "IN_APP", label: "Notificação no App" },
  ];
}
