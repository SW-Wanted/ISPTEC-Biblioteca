/**
 * Biblioteca para exportação de dados em formato CSV
 * Compatível com Excel e LibreOffice
 */

export interface CSVColumn {
  key: string;
  label: string;
  formatter?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface CSVOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
  bom?: boolean; // Byte Order Mark para compatibilidade com Excel
}

/**
 * Converte array de objetos em string CSV
 */
export function convertToCSV(
  data: Array<Record<string, unknown>>,
  columns: CSVColumn[],
  options: CSVOptions = {},
): string {
  const { delimiter = ",", includeHeaders = true, bom = true } = options;

  if (!data || data.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Adicionar cabeçalhos
  if (includeHeaders) {
    const headers = columns.map((col) => escapeCSVValue(col.label));
    lines.push(headers.join(delimiter));
  }

  // Adicionar dados
  for (const row of data) {
    const values = columns.map((col) => {
      let value = row[col.key];

      // Aplicar formatador customizado
      if (col.formatter && value !== null && value !== undefined) {
        value = col.formatter(value, row);
      }

      // Formatar datas automaticamente
      if (value instanceof Date) {
        value = formatDate(value);
      }

      // Converter booleanos
      if (typeof value === "boolean") {
        value = value ? "Sim" : "Não";
      }

      // Converter null/undefined para string vazia
      if (value === null || value === undefined) {
        value = "";
      }

      return escapeCSVValue(String(value), delimiter);
    });

    lines.push(values.join(delimiter));
  }

  let csvContent = lines.join("\n");

  // Adicionar BOM UTF-8 para Excel
  if (bom) {
    csvContent = "\uFEFF" + csvContent;
  }

  return csvContent;
}

/**
 * Faz download de CSV no navegador
 */
export function downloadCSV(
  data: Array<Record<string, unknown>>,
  columns: CSVColumn[],
  options: CSVOptions = {},
): void {
  const { filename = `relatorio-${Date.now()}.csv` } = options;

  const csvContent = convertToCSV(data, columns, options);

  // Criar blob
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // Criar link temporário e fazer download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Escapa valores para formato CSV
 * - Adiciona aspas se contém delimiter, quebras de linha ou aspas
 * - Duplica aspas internas
 */
function escapeCSVValue(value: string, delimiter = ","): string {
  const needsEscaping =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (needsEscaping) {
    // Duplicar aspas internas e envolver em aspas
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Formata data no padrão pt-AO (DD/MM/YYYY HH:MM)
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata moeda para Kwanza (AOA)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte status em português
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    PENDING: "Pendente",
    RETURNED: "Devolvido",
    OVERDUE: "Em atraso",
    CANCELLED: "Cancelado",
    PAID: "Pago",
    UNPAID: "Não pago",
    AVAILABLE: "Disponível",
    BORROWED: "Emprestado",
    RESERVED: "Reservado",
    MAINTENANCE: "Manutenção",
    LOST: "Perdido",
  };

  return statusMap[status] || status;
}

/**
 * Converte tipo de utilizador em português
 */
export function formatUserType(type: string): string {
  const typeMap: Record<string, string> = {
    STUDENT: "Estudante",
    TEACHER: "Docente",
    STAFF: "Funcionário",
    LIBRARIAN: "Bibliotecário",
    CATALOGER: "Catalogador",
    SUPERVISOR: "Supervisor",
  };

  return typeMap[type] || type;
}
