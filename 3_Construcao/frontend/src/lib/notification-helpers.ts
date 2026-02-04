/**
 * Helpers para notificações com navegação contextual
 *
 * Sistema de metadata para direcionar usuários às páginas corretas
 * conforme o tipo/contexto da notificação.
 */

export interface NotificationMetadata {
  /**
   * URL de ação para onde o usuário deve ser redirecionado
   * Ex: "/manage-members/documents", "/loans", "/services"
   */
  actionUrl?: string;

  /**
   * Tipo de ação (para filtros/categorização)
   * Ex: "document_review", "training_confirmation", "loan_overdue"
   */
  actionType?: string;

  /**
   * ID da entidade relacionada (para navegação direta)
   * Ex: documentId, loanId, sessionId
   */
  entityId?: string;

  /**
   * Tipo de entidade
   * Ex: "document", "loan", "training_session"
   */
  entityType?: string;

  /**
   * Dados adicionais contextuais
   */
  [key: string]: any;
}

/**
 * Tipos de ação de notificação com suas URLs padrão
 */
export const NOTIFICATION_ACTIONS = {
  // Documentos
  DOCUMENT_REVIEW: {
    actionType: "document_review",
    actionUrl: "/manage-members/documents",
    label: "Revisar Documento",
  },
  DOCUMENT_APPROVED: {
    actionType: "document_approved",
    actionUrl: "/onboarding",
    label: "Ver Status",
  },
  DOCUMENT_REJECTED: {
    actionType: "document_rejected",
    actionUrl: "/onboarding",
    label: "Enviar Novamente",
  },

  // Formação
  TRAINING_AVAILABLE: {
    actionType: "training_available",
    actionUrl: "/services",
    label: "Ver Formações",
  },
  TRAINING_SCHEDULED: {
    actionType: "training_scheduled",
    actionUrl: "/services",
    label: "Detalhes da Formação",
  },
  TRAINING_REMINDER: {
    actionType: "training_reminder",
    actionUrl: "/services",
    label: "Ver Formação",
  },

  // Ativação de conta
  ACCOUNT_ACTIVATED: {
    actionType: "account_activated",
    actionUrl: "/home",
    label: "Explorar Biblioteca",
  },

  // Empréstimos
  LOAN_DUE_SOON: {
    actionType: "loan_due_soon",
    actionUrl: "/loans",
    label: "Ver Empréstimos",
  },
  LOAN_OVERDUE: {
    actionType: "loan_overdue",
    actionUrl: "/loans",
    label: "Renovar/Devolver",
  },
  LOAN_RENEWED: {
    actionType: "loan_renewed",
    actionUrl: "/loans",
    label: "Ver Empréstimo",
  },

  // Reservas
  RESERVATION_AVAILABLE: {
    actionType: "reservation_available",
    actionUrl: "/reservations",
    label: "Levantar Livro",
  },
  RESERVATION_EXPIRED: {
    actionType: "reservation_expired",
    actionUrl: "/reservations",
    label: "Ver Reservas",
  },

  // Multas
  FINE_ISSUED: {
    actionType: "fine_issued",
    actionUrl: "/fines",
    label: "Ver Multas",
  },
  FINE_PAID: {
    actionType: "fine_paid",
    actionUrl: "/fines",
    label: "Ver Comprovante",
  },

  // Cacifos
  LOCKER_OVERTIME: {
    actionType: "locker_overtime",
    actionUrl: "/services",
    label: "Ver Cacifo",
  },

  // Computadores
  COMPUTER_SESSION_ENDING: {
    actionType: "computer_session_ending",
    actionUrl: "/services",
    label: "Estender Sessão",
  },

  // Sistema
  SYSTEM_ANNOUNCEMENT: {
    actionType: "system_announcement",
    actionUrl: "/home",
    label: "Ver Anúncio",
  },
} as const;

/**
 * Cria metadata para notificação de documento enviado para revisão (admin)
 */
export function createDocumentReviewMetadata(
  documentId: string,
  userId: string,
  userName: string,
  documentType: string,
): NotificationMetadata {
  return {
    actionUrl: `/manage-members/documents?userId=${userId}`,
    actionType: NOTIFICATION_ACTIONS.DOCUMENT_REVIEW.actionType,
    entityId: documentId,
    entityType: "document",
    userId,
    userName,
    documentType,
  };
}

/**
 * Cria metadata para notificação de documento aprovado (usuário)
 */
export function createDocumentApprovedMetadata(
  documentId: string,
): NotificationMetadata {
  return {
    actionUrl: NOTIFICATION_ACTIONS.DOCUMENT_APPROVED.actionUrl,
    actionType: NOTIFICATION_ACTIONS.DOCUMENT_APPROVED.actionType,
    entityId: documentId,
    entityType: "document",
  };
}

/**
 * Cria metadata para notificação de documento rejeitado (usuário)
 */
export function createDocumentRejectedMetadata(
  documentId: string,
  reason: string,
): NotificationMetadata {
  return {
    actionUrl: NOTIFICATION_ACTIONS.DOCUMENT_REJECTED.actionUrl,
    actionType: NOTIFICATION_ACTIONS.DOCUMENT_REJECTED.actionType,
    entityId: documentId,
    entityType: "document",
    rejectionReason: reason,
  };
}

/**
 * Cria metadata para notificação de formação disponível
 */
export function createTrainingAvailableMetadata(
  sessionId: string,
  sessionTitle: string,
  sessionDate: Date,
): NotificationMetadata {
  return {
    actionUrl: `/services?tab=training&sessionId=${sessionId}`,
    actionType: NOTIFICATION_ACTIONS.TRAINING_AVAILABLE.actionType,
    entityId: sessionId,
    entityType: "training_session",
    sessionTitle,
    sessionDate: sessionDate.toISOString(),
  };
}

/**
 * Cria metadata para notificação de formação agendada
 */
export function createTrainingScheduledMetadata(
  sessionId: string,
  sessionTitle: string,
  sessionDate: Date,
): NotificationMetadata {
  return {
    actionUrl: `/services?tab=training&sessionId=${sessionId}`,
    actionType: NOTIFICATION_ACTIONS.TRAINING_SCHEDULED.actionType,
    entityId: sessionId,
    entityType: "training_session",
    sessionTitle,
    sessionDate: sessionDate.toISOString(),
  };
}

/**
 * Cria metadata para notificação de conta ativada
 */
export function createAccountActivatedMetadata(): NotificationMetadata {
  return {
    actionUrl: NOTIFICATION_ACTIONS.ACCOUNT_ACTIVATED.actionUrl,
    actionType: NOTIFICATION_ACTIONS.ACCOUNT_ACTIVATED.actionType,
  };
}

/**
 * Cria metadata para notificação de empréstimo vencendo
 */
export function createLoanDueSoonMetadata(
  loanId: string,
  bookTitle: string,
  dueDate: Date,
): NotificationMetadata {
  return {
    actionUrl: `/loans?loanId=${loanId}`,
    actionType: NOTIFICATION_ACTIONS.LOAN_DUE_SOON.actionType,
    entityId: loanId,
    entityType: "loan",
    bookTitle,
    dueDate: dueDate.toISOString(),
  };
}

/**
 * Cria metadata para notificação de empréstimo atrasado
 */
export function createLoanOverdueMetadata(
  loanId: string,
  bookTitle: string,
  daysOverdue: number,
): NotificationMetadata {
  return {
    actionUrl: `/loans?loanId=${loanId}`,
    actionType: NOTIFICATION_ACTIONS.LOAN_OVERDUE.actionType,
    entityId: loanId,
    entityType: "loan",
    bookTitle,
    daysOverdue,
  };
}

/**
 * Cria metadata para notificação de reserva disponível
 */
export function createReservationAvailableMetadata(
  reservationId: string,
  bookTitle: string,
  expiryDate: Date,
): NotificationMetadata {
  return {
    actionUrl: `/reservations?reservationId=${reservationId}`,
    actionType: NOTIFICATION_ACTIONS.RESERVATION_AVAILABLE.actionType,
    entityId: reservationId,
    entityType: "reservation",
    bookTitle,
    expiryDate: expiryDate.toISOString(),
  };
}

/**
 * Cria metadata para notificação de multa emitida
 */
export function createFineIssuedMetadata(
  fineId: string,
  amount: number,
  reason: string,
): NotificationMetadata {
  return {
    actionUrl: `/fines?fineId=${fineId}`,
    actionType: NOTIFICATION_ACTIONS.FINE_ISSUED.actionType,
    entityId: fineId,
    entityType: "fine",
    amount,
    reason,
  };
}

/**
 * Extrai URL de ação da metadata da notificação
 */
export function getNotificationActionUrl(metadata: any): string | null {
  if (!metadata) return null;

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed.actionUrl || null;
    } catch {
      return null;
    }
  }

  return metadata.actionUrl || null;
}

/**
 * Extrai tipo de ação da metadata da notificação
 */
export function getNotificationActionType(metadata: any): string | null {
  if (!metadata) return null;

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed.actionType || null;
    } catch {
      return null;
    }
  }

  return metadata.actionType || null;
}

/**
 * Verifica se notificação tem ação configurada
 */
export function hasNotificationAction(metadata: any): boolean {
  const actionUrl = getNotificationActionUrl(metadata);
  return !!actionUrl;
}

/**
 * Obtém label do botão de ação baseado no tipo
 */
export function getNotificationActionLabel(metadata: any): string {
  const actionType = getNotificationActionType(metadata);

  if (!actionType) return "Ver Detalhes";

  // Procurar label correspondente
  const action = Object.values(NOTIFICATION_ACTIONS).find(
    (a) => a.actionType === actionType,
  );

  return action?.label || "Ver Detalhes";
}
