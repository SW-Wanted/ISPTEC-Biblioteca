/**
 * Validações de formulários
 */

// Matrícula: 8 dígitos (ex: 00000001, 20230429)
export const MATRICULA_REGEX = /^[0-9]{8}$/;

// Telefone Angola: +244 seguido de 9 dígitos
// Formato: +244 933363523 ou +244933363523
export const TELEFONE_REGEX = /^\+244\s?[0-9]{9}$/;

// Email ISPTEC: nome@isptec.co.ao
export const EMAIL_ISPTEC_REGEX = /^[a-zA-Z0-9._-]+@isptec\.co\.ao$/;

/**
 * Valida número de matrícula
 */
export function validateMatricula(value: string): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: "Matrícula é obrigatória" };
  }
  
  if (!MATRICULA_REGEX.test(value)) {
    return { 
      valid: false, 
      error: "Matrícula deve ter exatamente 8 dígitos (ex: 20230429)" 
    };
  }
  
  return { valid: true };
}

/**
 * Valida número de telefone angolano
 */
export function validateTelefone(value: string): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: true }; // Telefone é opcional
  }
  
  if (!TELEFONE_REGEX.test(value)) {
    return { 
      valid: false, 
      error: "Telefone deve estar no formato +244 933363523 (9 dígitos)" 
    };
  }
  
  return { valid: true };
}

/**
 * Valida email ISPTEC
 */
export function validateEmailIsptec(value: string): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: "Email é obrigatório" };
  }
  
  if (!EMAIL_ISPTEC_REGEX.test(value)) {
    return { 
      valid: false, 
      error: "Email deve ser do domínio @isptec.co.ao" 
    };
  }
  
  return { valid: true };
}

/**
 * Formata telefone automaticamente enquanto o usuário digita
 */
export function formatTelefone(value: string): string {
  // Remove tudo exceto dígitos e o +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Se não começa com +244, adiciona
  if (!cleaned.startsWith('+244')) {
    if (cleaned.startsWith('244')) {
      return '+' + cleaned.slice(0, 12); // +244 + 9 dígitos = 13 caracteres
    }
    if (cleaned.startsWith('+')) {
      return cleaned.slice(0, 13);
    }
    return '+244' + cleaned.slice(0, 9);
  }
  
  // Limita a +244 + 9 dígitos
  return cleaned.slice(0, 13);
}

/**
 * Formata matrícula automaticamente (apenas dígitos, máximo 8)
 */
export function formatMatricula(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}
