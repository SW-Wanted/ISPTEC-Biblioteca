import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Biblioteca para exportação de relatórios em PDF
 * Suporta tabelas, cabeçalhos e rodapés profissionais
 */

export interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PDFOptions {
  title: string;
  filename?: string;
  orientation?: "portrait" | "landscape";
  subtitle?: string;
  footer?: string;
}

/**
 * Gera PDF com tabela de dados
 */
export function generateTablePDF(
  data: unknown[],
  columns: PDFColumn[],
  options: PDFOptions,
): void {
  const {
    title,
    subtitle,
    filename = `relatorio-${Date.now()}.pdf`,
    orientation = "portrait",
    footer = "Sistema de Gestão de Biblioteca Universitária - ISPTEC",
  } = options;

  // Criar documento
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Configurar fonte
  doc.setFont("helvetica", "normal");

  // Adicionar cabeçalho
  let yPosition = 20;

  // Logo/Título principal
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ISPTEC", pageWidth / 2, yPosition, { align: "center" });

  yPosition += 7;
  doc.setFontSize(14);
  doc.text("Biblioteca Universitária", pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition += 10;
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, yPosition, { align: "center" });

  // Subtítulo
  if (subtitle) {
    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, pageWidth / 2, yPosition, { align: "center" });
  }

  // Data de geração
  yPosition += 7;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const generatedAt = new Date().toLocaleString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Gerado em: ${generatedAt}`, pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition += 5;

  // Linha separadora
  doc.setDrawColor(200);
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 5;

  // Resetar cor do texto
  doc.setTextColor(0);

  // Gerar tabela
  autoTable(doc, {
    startY: yPosition,
    head: [columns.map((col) => col.header)],
    body: data.map((row) =>
      columns.map((col) => formatCellValue(row[col.dataKey])),
    ),
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: "helvetica",
    },
    headStyles: {
      fillColor: [41, 128, 185], // Azul ISPTEC
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce<Record<number, { cellWidth: number }>>((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {}),
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Rodapé em cada página
      const footerY = pageHeight - 15;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(footer, pageWidth / 2, footerY, { align: "center" });

      // Número da página
      const pageNumber = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.text(pageNumber, pageWidth - 15, footerY, { align: "right" });
    },
  });

  // Download
  doc.save(filename);
}

/**
 * Gera PDF com estatísticas e gráficos (resumo)
 */
export function generateStatisticsPDF(
  statistics: Record<string, unknown>,
  options: PDFOptions,
): void {
  const {
    title,
    filename = `estatisticas-${Date.now()}.pdf`,
    orientation = "portrait",
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ISPTEC", pageWidth / 2, yPosition, { align: "center" });

  yPosition += 7;
  doc.setFontSize(14);
  doc.text("Biblioteca Universitária", pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition += 10;
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, yPosition, { align: "center" });

  yPosition += 10;

  // Estatísticas principais
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral", 20, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const stats = [
    { label: "Total de Livros", value: statistics.summary?.totalBooks || 0 },
    {
      label: "Membros Ativos",
      value: statistics.summary?.totalMembers || 0,
    },
    {
      label: "Empréstimos Ativos",
      value: statistics.summary?.activeLoans || 0,
    },
    {
      label: "Empréstimos em Atraso",
      value: statistics.summary?.overdueLoans || 0,
    },
    {
      label: "Reservas Ativas",
      value: statistics.summary?.activeReservations || 0,
    },
    {
      label: "Total de Multas",
      value: `${statistics.summary?.totalFines || 0} Kz`,
    },
    {
      label: "Multas Pendentes",
      value: `${statistics.summary?.pendingFines || 0} Kz`,
    },
  ];

  for (const stat of stats) {
    doc.setFont("helvetica", "bold");
    doc.text(`${stat.label}:`, 25, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(String(stat.value), 80, yPosition);
    yPosition += 7;
  }

  yPosition += 5;

  // Top 10 Livros
  if (statistics.topBooks && statistics.topBooks.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 Livros Mais Emprestados", 20, yPosition);

    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [["#", "Título", "Autor", "Categoria", "Empréstimos"]],
      body: (statistics.topBooks as Array<Record<string, unknown>>)
        .slice(0, 10)
        .map((book, index: number) => [
          String(index + 1),
          String(book.title ?? ''),
          String(book.author ?? ''),
          String(book.category ?? ''),
          String(book.totalLoans ?? 0),
        ]),
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    yPosition = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Empréstimos por Categoria
  if (
    statistics.loansByCategory &&
    statistics.loansByCategory.length > 0 &&
    yPosition + 50 < pageHeight
  ) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Empréstimos por Categoria", 20, yPosition);

    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [["Categoria", "Total de Livros", "Total de Empréstimos"]],
      body: statistics.loansByCategory.map((cat: unknown) => [
        cat.category,
        String(cat.totalBooks),
        String(cat.totalLoans),
      ]),
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });
  }

  // Rodapé
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Sistema de Gestão de Biblioteca Universitária - ISPTEC",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  const generatedAt = new Date().toLocaleString("pt-AO");
  doc.text(`Gerado em: ${generatedAt}`, pageWidth - 20, footerY, {
    align: "right",
  });

  // Download
  doc.save(filename);
}

/**
 * Formata valor da célula para exibição
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return new Date(value).toLocaleString("pt-AO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value);
}

/**
 * Converte status em português para PDF
 */
export function translateStatus(status: string): string {
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
