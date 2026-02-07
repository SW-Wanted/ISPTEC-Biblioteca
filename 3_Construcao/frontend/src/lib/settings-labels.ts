/**
 * Traduções e labels para configurações do sistema
 * Converte enums e chaves técnicas para texto legível em português
 */

import { UserType, FineType } from "@prisma/client";

// ============================================
// TIPOS DE USUÁRIO
// ============================================
export const USER_TYPE_LABELS: Record<UserType, string> = {
  STUDENT: "Estudante",
  TEACHER: "Docente",
  STAFF: "Funcionário",
  LIBRARIAN: "Bibliotecário",
  CATALOGER: "Catalogador",
  SUPERVISOR: "Supervisor",
};

export function formatUserType(type: UserType | string): string {
  return USER_TYPE_LABELS[type as UserType] || type;
}

// ============================================
// TIPOS DE MULTA
// ============================================
export const FINE_TYPE_LABELS: Record<FineType, string> = {
  LATE_RETURN: "Atraso na Devolução",
  LOCKER_OVERTIME: "Excesso de Tempo no Cacifo",
  LOST_CREDENTIAL: "Perda de Credencial",
  DAMAGED_BOOK: "Livro Danificado",
  LOST_BOOK: "Livro Perdido",
};

export const FINE_TYPE_DESCRIPTIONS: Record<FineType, string> = {
  LATE_RETURN: "Multa por dia de atraso na devolução de livros",
  LOCKER_OVERTIME: "Multa por hora excedente no aluguel de cacifo",
  LOST_CREDENTIAL: "Multa por perda da credencial da biblioteca",
  DAMAGED_BOOK: "Multa por dano em livro emprestado",
  LOST_BOOK: "Multa por perda de livro emprestado",
};

export function formatFineType(type: FineType | string): string {
  return FINE_TYPE_LABELS[type as FineType] || type;
}

export function getFineTypeDescription(type: FineType | string): string {
  return FINE_TYPE_DESCRIPTIONS[type as FineType] || "";
}

// ============================================
// POLÍTICAS DO SISTEMA
// ============================================
export const SYSTEM_POLICY_LABELS: Record<string, string> = {
  RESERVATION_COLLECTION_HOURS: "Prazo de Levantamento de Reserva",
  LOCKER_DURATION_HOURS: "Duração Máxima de Aluguel de Cacifo",
  COMPUTER_SESSION_HOURS: "Duração Máxima de Sessão de Computador",
  MAX_RENEWALS: "Máximo de Renovações",
  TRAINING_MAX_SLOTS: "Vagas Máximas por Formação",
  TRAINING_DEFAULT_DURATION: "Duração Padrão da Formação",
  TRAINING_MIN_ADVANCE_DAYS: "Antecedência Mínima para Formação",
  BOOK_LANGUAGES: "Idiomas de Livros Aceites",
  LIBRARY_HOURS_WEEKDAY: "Horário de Segunda a Sexta",
  LIBRARY_HOURS_SATURDAY: "Horário aos Sábados",
  LIBRARY_HOURS_SUNDAY: "Horário aos Domingos",
  LIBRARY_SATURDAY_NOTE: "Nota sobre Sábados",
  CONTACT_PHONE: "Telefone de Contacto",
  CONTACT_EMAIL: "Email de Contacto",
  CONTACT_LOCATION: "Localização",
  account_deletion_grace_days: "Prazo de Eliminação de Conta",
};

export const SYSTEM_POLICY_DESCRIPTIONS: Record<string, string> = {
  RESERVATION_COLLECTION_HOURS:
    "Tempo em horas que o utilizador tem para levantar um livro reservado",
  LOCKER_DURATION_HOURS: "Tempo máximo em horas de aluguel de cacifo",
  COMPUTER_SESSION_HOURS: "Tempo máximo em horas de uso de computador",
  MAX_RENEWALS: "Número máximo de renovações de empréstimo",
  TRAINING_MAX_SLOTS: "Número máximo de participantes por sessão de formação",
  TRAINING_DEFAULT_DURATION: "Duração padrão em minutos de uma formação",
  TRAINING_MIN_ADVANCE_DAYS:
    "Dias mínimos de antecedência para agendar formação",
  BOOK_LANGUAGES: "Idiomas aceites para catalogação (separados por vírgula)",
  LIBRARY_HOURS_WEEKDAY:
    "Horário de funcionamento de segunda a sexta-feira (formato: HH:MM-HH:MM)",
  LIBRARY_HOURS_SATURDAY:
    "Horário de funcionamento aos sábados (formato: HH:MM-HH:MM ou 'Fechado')",
  LIBRARY_HOURS_SUNDAY:
    "Horário de funcionamento aos domingos e feriados (formato: HH:MM-HH:MM ou 'Fechado')",
  LIBRARY_SATURDAY_NOTE:
    "Nota adicional sobre horário de sábado (ex: 'época de provas')",
  CONTACT_PHONE: "Número de telefone para contacto com a biblioteca",
  CONTACT_EMAIL: "Endereço de email para contacto com a biblioteca",
  CONTACT_LOCATION: "Localização física da biblioteca",
  account_deletion_grace_days:
    "Número de dias de carência antes da eliminação definitiva da conta após pedido",
};

export const SYSTEM_POLICY_UNITS: Record<string, string> = {
  RESERVATION_COLLECTION_HOURS: "horas",
  LOCKER_DURATION_HOURS: "horas",
  COMPUTER_SESSION_HOURS: "horas",
  MAX_RENEWALS: "renovações",
  TRAINING_MAX_SLOTS: "vagas",
  TRAINING_DEFAULT_DURATION: "minutos",
  TRAINING_MIN_ADVANCE_DAYS: "dias",
  BOOK_LANGUAGES: "",
  LIBRARY_HOURS_WEEKDAY: "",
  LIBRARY_HOURS_SATURDAY: "",
  LIBRARY_HOURS_SUNDAY: "",
  LIBRARY_SATURDAY_NOTE: "",
  CONTACT_PHONE: "",
  CONTACT_EMAIL: "",
  CONTACT_LOCATION: "",
  account_deletion_grace_days: "dias",
};

export function formatSystemPolicyKey(key: string): string {
  return SYSTEM_POLICY_LABELS[key] || key;
}

export function getSystemPolicyDescription(key: string): string {
  return SYSTEM_POLICY_DESCRIPTIONS[key] || "";
}

export function getSystemPolicyUnit(key: string): string {
  return SYSTEM_POLICY_UNITS[key] || "";
}

// ============================================
// CHAVES DE AUDITORIA
// ============================================
export const AUDIT_CONFIG_KEY_LABELS: Record<string, string> = {
  // Multas
  FINE_LATE_RETURN: "Multa: Atraso na Devolução",
  FINE_LOCKER_OVERTIME: "Multa: Excesso no Cacifo",
  FINE_LOST_CREDENTIAL: "Multa: Perda de Credencial",
  FINE_DAMAGED_BOOK: "Multa: Livro Danificado",
  FINE_LOST_BOOK: "Multa: Livro Perdido",

  // Políticas de Empréstimo
  LOAN_POLICY_STUDENT: "Política: Estudante",
  LOAN_POLICY_TEACHER: "Política: Docente",
  LOAN_POLICY_STAFF: "Política: Funcionário",
  LOAN_POLICY_LIBRARIAN: "Política: Bibliotecário",
  LOAN_POLICY_CATALOGER: "Política: Catalogador",
  LOAN_POLICY_SUPERVISOR: "Política: Supervisor",

  // Sistema
  SYSTEM_RESERVATION_COLLECTION_HOURS: "Sistema: Prazo de Reserva",
  SYSTEM_LOCKER_DURATION_HOURS: "Sistema: Duração de Cacifo",
  SYSTEM_COMPUTER_SESSION_HOURS: "Sistema: Sessão de Computador",
  SYSTEM_MAX_RENEWALS: "Sistema: Máx. Renovações",
  SYSTEM_TRAINING_MAX_SLOTS: "Sistema: Vagas de Formação",
  SYSTEM_TRAINING_DEFAULT_DURATION: "Sistema: Duração de Formação",
  SYSTEM_TRAINING_MIN_ADVANCE_DAYS: "Sistema: Antecedência de Formação",
  SYSTEM_BOOK_LANGUAGES: "Sistema: Idiomas de Livros",

  // Categorias
  CATEGORY_CREATED: "Categoria Criada",
  CATEGORY_UPDATED: "Categoria Atualizada",
  CATEGORY_DELETED: "Categoria Eliminada",

  // FAQs
  FAQ_CREATED: "Pergunta Frequente Criada",
  FAQ_UPDATED: "Pergunta Frequente Atualizada",
  FAQ_DELETED: "Pergunta Frequente Eliminada",
};

export function formatAuditConfigKey(key: string): string {
  return AUDIT_CONFIG_KEY_LABELS[key] || key;
}

// ============================================
// FORMATAÇÃO DE VALORES
// ============================================
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

// ============================================
// VALIDAÇÃO
// ============================================
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Formato Angola: +244 XXX XXX XXX ou 9XX XXX XXX
  return /^(\+244)?[9]\d{8}$/.test(phone.replace(/\s/g, ""));
}
