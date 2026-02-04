/**
 * Middleware para validar status de ativação da conta
 *
 * Bloqueia acesso a funcionalidades baseado no AccountActivationStatus
 */

export type AccountActivationStatus =
  | "PENDING_DOCUMENTS"
  | "PENDING_TRAINING"
  | "TRAINING_SCHEDULED"
  | "ACTIVE"
  | "BLOCKED";

export interface ActivationCheckResult {
  allowed: boolean;
  reason?: string;
  actionRequired?: string;
}

/**
 * Verifica se usuário pode fazer empréstimos
 */
export function canBorrowBooks(
  status: AccountActivationStatus,
): ActivationCheckResult {
  if (status === "ACTIVE") {
    return { allowed: true };
  }

  if (status === "BLOCKED") {
    return {
      allowed: false,
      reason: "Conta bloqueada",
      actionRequired: "Regularize suas pendências no balcão",
    };
  }

  return {
    allowed: false,
    reason: "Conta não ativada",
    actionRequired: "Complete a formação obrigatória para emprestar livros",
  };
}

/**
 * Verifica se usuário pode fazer reservas
 */
export function canMakeReservations(
  status: AccountActivationStatus,
): ActivationCheckResult {
  if (status === "ACTIVE") {
    return { allowed: true };
  }

  if (status === "BLOCKED") {
    return {
      allowed: false,
      reason: "Conta bloqueada",
      actionRequired: "Regularize suas pendências no balcão",
    };
  }

  return {
    allowed: false,
    reason: "Conta não ativada",
    actionRequired: "Complete a formação obrigatória para fazer reservas",
  };
}

/**
 * Verifica se usuário pode usar cacifos
 */
export function canUseLockers(
  status: AccountActivationStatus,
): ActivationCheckResult {
  if (status === "ACTIVE") {
    return { allowed: true };
  }

  if (status === "BLOCKED") {
    return {
      allowed: false,
      reason: "Conta bloqueada",
      actionRequired: "Regularize suas pendências",
    };
  }

  return {
    allowed: false,
    reason: "Conta não ativada",
    actionRequired: "Complete a formação obrigatória para usar cacifos",
  };
}

/**
 * Verifica se usuário pode usar computadores
 */
export function canUseComputers(
  status: AccountActivationStatus,
): ActivationCheckResult {
  if (status === "ACTIVE") {
    return { allowed: true };
  }

  if (status === "BLOCKED") {
    return {
      allowed: false,
      reason: "Conta bloqueada",
      actionRequired: "Regularize suas pendências",
    };
  }

  return {
    allowed: false,
    reason: "Conta não ativada",
    actionRequired: "Complete a formação obrigatória para usar computadores",
  };
}

/**
 * Verifica se usuário pode solicitar formação
 */
export function canRequestTraining(
  status: AccountActivationStatus,
): ActivationCheckResult {
  if (status === "PENDING_TRAINING") {
    return { allowed: true };
  }

  if (status === "PENDING_DOCUMENTS") {
    return {
      allowed: false,
      reason: "Documentos pendentes",
      actionRequired: "Envie todos os documentos obrigatórios para validação",
    };
  }

  if (status === "TRAINING_SCHEDULED") {
    return {
      allowed: false,
      reason: "Formação já agendada",
      actionRequired: "Compareça na data agendada",
    };
  }

  if (status === "ACTIVE") {
    return {
      allowed: false,
      reason: "Formação já concluída",
      actionRequired: "Sua conta está ativa",
    };
  }

  return {
    allowed: false,
    reason: "Conta bloqueada",
    actionRequired: "Entre em contato com a biblioteca",
  };
}

/**
 * Obtém mensagem de status para exibir ao usuário
 */
export function getActivationStatusMessage(
  status: AccountActivationStatus,
): string {
  switch (status) {
    case "PENDING_DOCUMENTS":
      return "📄 Aguardando validação de documentos";
    case "PENDING_TRAINING":
      return "🎓 Pronto para solicitar formação";
    case "TRAINING_SCHEDULED":
      return "📅 Formação agendada";
    case "ACTIVE":
      return "✅ Conta ativa";
    case "BLOCKED":
      return "🚫 Conta bloqueada";
    default:
      return "❓ Status desconhecido";
  }
}

/**
 * Obtém lista de ações disponíveis baseado no status
 */
export function getAvailableActions(
  status: AccountActivationStatus,
): Array<{ label: string; action: string; variant: "default" | "secondary" }> {
  switch (status) {
    case "PENDING_DOCUMENTS":
      return [
        {
          label: "Enviar Documentos",
          action: "/profile?tab=documents",
          variant: "default",
        },
      ];

    case "PENDING_TRAINING":
      return [
        {
          label: "Solicitar Formação",
          action: "/services#training",
          variant: "default",
        },
      ];

    case "TRAINING_SCHEDULED":
      return [
        {
          label: "Ver Detalhes",
          action: "/services#training",
          variant: "secondary",
        },
      ];

    case "BLOCKED":
      return [
        {
          label: "Regularizar Pendências",
          action: "/profile?tab=fines",
          variant: "default",
        },
      ];

    case "ACTIVE":
      return [];

    default:
      return [];
  }
}
