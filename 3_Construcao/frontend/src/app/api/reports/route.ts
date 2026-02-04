import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FineStatus,
  LoanStatus,
  Prisma,
  ReservationStatus,
  UserType,
} from "@prisma/client";

type ReportType =
  | "loans"
  | "books"
  | "members"
  | "fines"
  | "reservations"
  | "statistics";

type DateFilter = Prisma.DateTimeFilter;

type ReportFilters = {
  dateFilter: DateFilter;
  status: string | null;
  memberType: UserType | null;
  category: string | null;
};

type LoansReportRow = {
  id: string;
  bookTitle: string;
  bookISBN: string | null;
  category: string;
  memberName: string;
  memberEmail: string;
  memberType: UserType;
  loanDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  status: LoanStatus;
  renewalCount: number;
  maxRenewals: number;
};

type BooksReportRow = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string;
  publishedYear: number | null;
  category: string;
  totalCopies: number;
  availableCopies: number;
  totalLoans: number;
  createdAt: Date;
};

type MembersReportRow = {
  id: string;
  fullName: string;
  email: string;
  type: UserType;
  activationStatus: string;
  createdAt: Date;
  totalLoans: number;
  totalReservations: number;
  totalFines: number;
};

type FinesReportRow = {
  id: string;
  memberName: string;
  memberEmail: string;
  memberType: UserType;
  amount: number;
  reason: string | null;
  status: FineStatus;
  bookTitle: string | undefined;
  createdAt: Date;
  paidAt: Date | null;
};

type ReservationsReportRow = {
  id: string;
  bookTitle: string;
  bookISBN: string | null;
  category: string;
  memberName: string;
  memberEmail: string;
  memberType: UserType;
  status: ReservationStatus;
  queuePosition: number;
  createdAt: Date;
  availableDate: Date | null;
  expiryDate: Date | null;
};

type StatisticsReport = {
  type: "statistics";
  filters: { dateFilter: DateFilter };
  summary: {
    totalBooks: number;
    totalMembers: number;
    activeLoans: number;
    overdueLoans: number;
    activeReservations: number;
    totalFines: number;
    pendingFines: number;
  };
  topBooks: Array<{
    title: string;
    author: string;
    category: string;
    totalLoans: number;
  }>;
  loansByCategory: Array<{
    category: string;
    totalBooks: number;
    totalLoans: number;
  }>;
};

type ListReport<TType extends Exclude<ReportType, "statistics">, TRow> = {
  type: TType;
  total: number;
  filters: ReportFilters;
  data: TRow[];
};

type FinesReport = ListReport<"fines", FinesReportRow> & {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
};

type ReportsResponse =
  | ListReport<"loans", LoansReportRow>
  | ListReport<"books", BooksReportRow>
  | ListReport<"members", MembersReportRow>
  | FinesReport
  | ListReport<"reservations", ReservationsReportRow>
  | StatisticsReport;

const REPORT_TYPES: readonly ReportType[] = [
  "loans",
  "books",
  "members",
  "fines",
  "reservations",
  "statistics",
];

const LOAN_STATUS_VALUES: readonly LoanStatus[] = [
  "ACTIVE",
  "RETURNED",
  "OVERDUE",
  "CANCELLED",
];

const FINE_STATUS_VALUES: readonly FineStatus[] = [
  "PENDING",
  "PAID",
  "CANCELLED",
  "WAIVED",
];

const RESERVATION_STATUS_VALUES: readonly ReservationStatus[] = [
  "ACTIVE",
  "AVAILABLE",
  "COLLECTED",
  "EXPIRED",
  "CANCELLED",
];

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function parseUserType(value: string | null): UserType | null {
  if (!value) return null;
  return (Object.values(UserType) as string[]).includes(value)
    ? (value as UserType)
    : null;
}

/**
 * GET /api/reports
 * Gera relatórios com filtros e retorna dados em JSON
 *
 * Query params:
 * - type: loans | books | members | fines | reservations
 * - format: json | csv | pdf (default: json)
 * - startDate: ISO date
 * - endDate: ISO date
 * - category: category ID
 * - memberType: STUDENT | TEACHER | STAFF
 * - status: ACTIVE | RETURNED | OVERDUE, etc
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, type: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Utilizador inválido" },
        { status: 403 },
      );
    }

    // Apenas admin pode gerar relatórios
    const allowedTypes: UserType[] = [
      UserType.LIBRARIAN,
      UserType.CATALOGER,
      UserType.SUPERVISOR,
    ];
    if (!allowedTypes.includes(user.type)) {
      return NextResponse.json(
        { error: "Sem permissão para gerar relatórios" },
        { status: 403 },
      );
    }

    // Obter parâmetros
    const searchParams = request.nextUrl.searchParams;
    const reportTypeParam = searchParams.get("type") || "loans";
    if (!REPORT_TYPES.includes(reportTypeParam as ReportType)) {
      return NextResponse.json(
        { error: `Tipo de relatório inválido: ${reportTypeParam}` },
        { status: 400 },
      );
    }
    const reportType = reportTypeParam as ReportType;
    const format = searchParams.get("format") || "json";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const memberType = parseUserType(searchParams.get("memberType"));
    const status = searchParams.get("status");

    // Construir filtros de data
    const dateFilter: DateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const filters: ReportFilters = {
      dateFilter,
      status,
      memberType,
      category,
    };

    let data: ReportsResponse;
    const filename = `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}`;

    switch (reportType) {
      case "loans":
        data = await generateLoansReport(filters);
        break;

      case "books":
        data = await generateBooksReport(filters);
        break;

      case "members":
        data = await generateMembersReport(filters);
        break;

      case "fines":
        data = await generateFinesReport(filters);
        break;

      case "reservations":
        data = await generateReservationsReport(filters);
        break;

      case "statistics":
        data = await generateStatisticsReport({ dateFilter });
        break;

      default:
        return NextResponse.json(
          { error: `Tipo de relatório inválido: ${reportType}` },
          { status: 400 },
        );
    }

    // Retornar no formato solicitado
    if (format === "json") {
      return NextResponse.json(data, { status: 200 });
    }

    if (format === "csv") {
      const csv = convertDataToCSV(data, reportType);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv;charset=utf-8;",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // PDF não suportado server-side (usar client-side)
    return NextResponse.json(
      { error: "Formato PDF deve ser gerado no cliente" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar relatório",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ==================== FUNÇÕES GERADORAS DE RELATÓRIOS ====================

async function generateLoansReport(
  filters: ReportFilters,
): Promise<ListReport<"loans", LoansReportRow>> {
  const { dateFilter, status, memberType, category } = filters;

  const where: Prisma.LoanWhereInput = {};

  if (Object.keys(dateFilter).length > 0) {
    where.loanDate = dateFilter;
  }

  if (status && isOneOf(status, LOAN_STATUS_VALUES)) where.status = status;

  if (memberType) where.user = { type: memberType };

  if (category) {
    where.copy = {
      book: { categoryId: category },
    };
  }

  const loans = await prisma.loan.findMany({
    where,
    include: {
      copy: {
        include: {
          book: {
            include: {
              category: true,
              publisher: true,
              authors: {
                include: {
                  author: true,
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          activationStatus: true,
        },
      },
    },
    orderBy: { loanDate: "desc" },
  });

  return {
    type: "loans",
    total: loans.length,
    filters,
    data: loans.map((loan) => ({
      id: loan.id,
      bookTitle: loan.copy.book.title,
      bookISBN: loan.copy.book.isbn,
      category: loan.copy.book.category?.name || "Sem categoria",
      memberName: loan.user.name,
      memberEmail: loan.user.email,
      memberType: loan.user.type,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnDate: loan.returnDate,
      status: loan.status,
      renewalCount: loan.renewalCount,
      maxRenewals: loan.maxRenewals,
    })),
  };
}

async function generateBooksReport(
  filters: ReportFilters,
): Promise<ListReport<"books", BooksReportRow>> {
  const { category } = filters;

  const where: Prisma.BookWhereInput = {};
  if (category) {
    where.categoryId = category;
  }

  const books = await prisma.book.findMany({
    where,
    include: {
      category: true,
      publisher: true,
      authors: {
        include: {
          author: true,
        },
        orderBy: {
          order: "asc",
        },
      },
      copies: {
        include: {
          _count: {
            select: { loans: true },
          },
        },
      },
      _count: {
        select: {
          copies: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const formatAuthors = (
    bookAuthors: Array<{ author: { name: string } | null }>,
  ): string => {
    if (!bookAuthors || bookAuthors.length === 0) return "";
    return bookAuthors
      .map((ba) => ba.author?.name)
      .filter(Boolean)
      .join(", ");
  };

  return {
    type: "books",
    total: books.length,
    filters,
    data: books.map((book) => ({
      id: book.id,
      title: book.title,
      author: formatAuthors(book.authors),
      isbn: book.isbn,
      publisher: book.publisher?.name || "",
      publishedYear: book.publicationYear,
      category: book.category?.name || "Sem categoria",
      totalCopies: book._count.copies,
      availableCopies: book.availableCopies,
      totalLoans: book.copies.reduce((sum, copy) => sum + copy._count.loans, 0),
      createdAt: book.createdAt,
    })),
  };
}

async function generateMembersReport(
  filters: ReportFilters,
): Promise<ListReport<"members", MembersReportRow>> {
  const { memberType, dateFilter } = filters;

  const where: Prisma.UserWhereInput = {};
  // "Membros" = utilizadores finais (não staff). Por padrão, inclui STUDENT/TEACHER/STAFF.
  if (memberType) {
    where.type = memberType;
  } else {
    where.type = { in: [UserType.STUDENT, UserType.TEACHER, UserType.STAFF] };
  }
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter;
  }

  const members = await prisma.user.findMany({
    where,
    include: {
      _count: {
        select: {
          loans: true,
          reservations: true,
          fines: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    type: "members",
    total: members.length,
    filters,
    data: members.map((member) => ({
      id: member.id,
      fullName: member.name,
      email: member.email,
      type: member.type,
      activationStatus: member.activationStatus,
      createdAt: member.createdAt,
      totalLoans: member._count.loans,
      totalReservations: member._count.reservations,
      totalFines: member._count.fines,
    })),
  };
}

async function generateFinesReport(
  filters: ReportFilters,
): Promise<FinesReport> {
  const { dateFilter, memberType, status } = filters;

  const where: Prisma.FineWhereInput = {};

  if (Object.keys(dateFilter).length > 0) {
    where.generatedAt = dateFilter;
  }

  if (status && isOneOf(status, FINE_STATUS_VALUES)) where.status = status;

  if (memberType) {
    where.user = { type: memberType };
  }

  const fines = await prisma.fine.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          activationStatus: true,
        },
      },
      loan: {
        include: {
          copy: {
            include: {
              book: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  });

  const totalAmount = fines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const totalPaid = fines
    .filter((f) => f.status === "PAID")
    .reduce((sum, fine) => sum + Number(fine.amount), 0);

  return {
    type: "fines",
    total: fines.length,
    totalAmount,
    totalPaid,
    totalPending: totalAmount - totalPaid,
    filters,
    data: fines.map((fine) => ({
      id: fine.id,
      memberName: fine.user.name,
      memberEmail: fine.user.email,
      memberType: fine.user.type,
      amount: Number(fine.amount),
      reason: fine.reason,
      status: fine.status,
      bookTitle: fine.loan?.copy.book.title,
      createdAt: fine.generatedAt,
      paidAt: fine.paidAt,
    })),
  };
}

async function generateReservationsReport(
  filters: ReportFilters,
): Promise<ListReport<"reservations", ReservationsReportRow>> {
  const { dateFilter, status, memberType } = filters;

  const where: Prisma.ReservationWhereInput = {};

  if (Object.keys(dateFilter).length > 0) {
    where.reservationDate = dateFilter;
  }

  if (status && isOneOf(status, RESERVATION_STATUS_VALUES))
    where.status = status;

  if (memberType) {
    where.user = { type: memberType };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      book: {
        include: {
          category: true,
          publisher: true,
          authors: {
            include: {
              author: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          activationStatus: true,
        },
      },
    },
    orderBy: { reservationDate: "desc" },
  });

  return {
    type: "reservations",
    total: reservations.length,
    filters,
    data: reservations.map((reservation) => ({
      id: reservation.id,
      bookTitle: reservation.book.title,
      bookISBN: reservation.book.isbn,
      category: reservation.book.category?.name || "Sem categoria",
      memberName: reservation.user.name,
      memberEmail: reservation.user.email,
      memberType: reservation.user.type,
      status: reservation.status,
      queuePosition: reservation.queuePosition,
      createdAt: reservation.reservationDate,
      availableDate: reservation.availableDate,
      expiryDate: reservation.expiryDate,
    })),
  };
}

async function generateStatisticsReport(filters: {
  dateFilter: DateFilter;
}): Promise<StatisticsReport> {
  const { dateFilter } = filters;

  const memberWhere: Prisma.UserWhereInput = {
    type: { in: [UserType.STUDENT, UserType.TEACHER, UserType.STAFF] },
    activationStatus: "ACTIVE",
  };

  // Estatísticas gerais
  const [
    totalBooks,
    totalMembers,
    activeLoans,
    overdueLoans,
    activeReservations,
    totalFines,
    pendingFines,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.user.count({ where: memberWhere }),
    prisma.loan.count({
      where: {
        status: "ACTIVE",
        ...(Object.keys(dateFilter).length > 0 ? { loanDate: dateFilter } : {}),
      },
    }),
    prisma.loan.count({
      where: {
        status: "OVERDUE",
        ...(Object.keys(dateFilter).length > 0 ? { loanDate: dateFilter } : {}),
      },
    }),
    prisma.reservation.count({ where: { status: "ACTIVE" } }),
    prisma.fine.aggregate({ _sum: { amount: true } }),
    prisma.fine.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  const start = Object.keys(dateFilter).length > 0 ? dateFilter.gte : undefined;
  const end = Object.keys(dateFilter).length > 0 ? dateFilter.lte : undefined;

  const topBooks = await prisma.$queryRaw<
    Array<{
      title: string;
      author: string | null;
      category: string;
      totalLoans: number;
    }>
  >`
    SELECT
      b.title AS title,
      COALESCE(string_agg(DISTINCT a.name, ', '), '') AS author,
      c.name AS category,
      COUNT(l.id)::int AS "totalLoans"
    FROM "Loan" l
    JOIN "Copy" cp ON cp.id = l."copyId"
    JOIN "Book" b ON b.id = cp."bookId"
    JOIN "Category" c ON c.id = b."categoryId"
    LEFT JOIN "BookAuthor" ba ON ba."bookId" = b.id
    LEFT JOIN "Author" a ON a.id = ba."authorId"
    WHERE (${start}::timestamptz IS NULL OR l."loanDate" >= ${start})
      AND (${end}::timestamptz IS NULL OR l."loanDate" <= ${end})
    GROUP BY b.id, c.name
    ORDER BY "totalLoans" DESC
    LIMIT 10
  `;

  const loansByCategory = await prisma.$queryRaw<
    Array<{ category: string; totalBooks: number; totalLoans: number }>
  >`
    SELECT
      c.name AS category,
      COUNT(DISTINCT b.id)::int AS "totalBooks",
      COUNT(l.id)::int AS "totalLoans"
    FROM "Category" c
    LEFT JOIN "Book" b ON b."categoryId" = c.id
    LEFT JOIN "Copy" cp ON cp."bookId" = b.id
    LEFT JOIN "Loan" l ON l."copyId" = cp.id
      AND (${start}::timestamptz IS NULL OR l."loanDate" >= ${start})
      AND (${end}::timestamptz IS NULL OR l."loanDate" <= ${end})
    GROUP BY c.id
    ORDER BY "totalLoans" DESC
  `;

  return {
    type: "statistics",
    filters,
    summary: {
      totalBooks,
      totalMembers,
      activeLoans,
      overdueLoans,
      activeReservations,
      totalFines: Number(totalFines._sum.amount || 0),
      pendingFines: Number(pendingFines._sum.amount || 0),
    },
    topBooks: topBooks.map((book) => ({
      title: book.title,
      author: book.author || "",
      category: book.category || "Sem categoria",
      totalLoans: book.totalLoans,
    })),
    loansByCategory: loansByCategory
      .map((row) => ({
        category: row.category,
        totalBooks: row.totalBooks,
        totalLoans: row.totalLoans,
      }))
      .sort((a, b) => b.totalLoans - a.totalLoans),
  };
}

// ==================== CONVERSÃO CSV ====================

function convertDataToCSV(
  data: ReportsResponse,
  reportType: ReportType,
): string {
  if (data.type !== "statistics" && data.data.length === 0) {
    return "";
  }

  const BOM = "\uFEFF";
  let headers: string[] = [];
  let rows: string[][] = [];

  switch (reportType) {
    case "loans":
      if (data.type !== "loans") return "";
      headers = [
        "ID",
        "Livro",
        "ISBN",
        "Categoria",
        "Membro",
        "Email",
        "Tipo",
        "Data Empréstimo",
        "Data Vencimento",
        "Data Devolução",
        "Status",
        "Renovações",
        "Max Renovações",
      ];
      rows = data.data.map((loan) => [
        loan.id,
        escapeCSV(loan.bookTitle),
        loan.bookISBN || "",
        escapeCSV(loan.category),
        escapeCSV(loan.memberName),
        loan.memberEmail,
        loan.memberType,
        formatDateCSV(loan.loanDate),
        formatDateCSV(loan.dueDate),
        loan.returnDate ? formatDateCSV(loan.returnDate) : "",
        translateStatusCSV(loan.status),
        loan.renewalCount.toString(),
        loan.maxRenewals.toString(),
      ]);
      break;

    case "books":
      if (data.type !== "books") return "";
      headers = [
        "ID",
        "Título",
        "Autor",
        "ISBN",
        "Editora",
        "Ano",
        "Categoria",
        "Cópias Totais",
        "Cópias Disponíveis",
        "Total Empréstimos",
        "Data Criação",
      ];
      rows = data.data.map((book) => [
        book.id,
        escapeCSV(book.title),
        escapeCSV(book.author),
        book.isbn || "",
        escapeCSV(book.publisher || ""),
        book.publishedYear?.toString() || "",
        escapeCSV(book.category),
        book.totalCopies.toString(),
        book.availableCopies.toString(),
        book.totalLoans.toString(),
        formatDateCSV(book.createdAt),
      ]);
      break;

    case "members":
      if (data.type !== "members") return "";
      headers = [
        "ID",
        "Nome Completo",
        "Email",
        "Tipo",
        "Status",
        "Data Criação",
        "Total Empréstimos",
        "Total Reservas",
        "Total Multas",
      ];
      rows = data.data.map((member) => [
        member.id,
        escapeCSV(member.fullName),
        member.email,
        translateUserTypeCSV(member.type),
        translateStatusCSV(member.activationStatus),
        formatDateCSV(member.createdAt),
        member.totalLoans.toString(),
        member.totalReservations.toString(),
        member.totalFines.toString(),
      ]);
      break;

    case "fines":
      if (data.type !== "fines") return "";
      headers = [
        "ID",
        "Membro",
        "Email",
        "Tipo",
        "Valor (Kz)",
        "Motivo",
        "Status",
        "Livro",
        "Data Criação",
        "Data Pagamento",
      ];
      rows = data.data.map((fine) => [
        fine.id,
        escapeCSV(fine.memberName),
        fine.memberEmail,
        translateUserTypeCSV(fine.memberType),
        fine.amount.toString(),
        escapeCSV(fine.reason || ""),
        translateStatusCSV(fine.status),
        escapeCSV(fine.bookTitle || ""),
        formatDateCSV(fine.createdAt),
        fine.paidAt ? formatDateCSV(fine.paidAt) : "",
      ]);
      break;

    case "reservations":
      if (data.type !== "reservations") return "";
      headers = [
        "ID",
        "Livro",
        "ISBN",
        "Categoria",
        "Membro",
        "Email",
        "Tipo",
        "Status",
        "Posição Fila",
        "Data Criação",
        "Data Disponível",
        "Data Expiração",
      ];
      rows = data.data.map((reservation) => [
        reservation.id,
        escapeCSV(reservation.bookTitle),
        reservation.bookISBN || "",
        escapeCSV(reservation.category),
        escapeCSV(reservation.memberName),
        reservation.memberEmail,
        translateUserTypeCSV(reservation.memberType),
        translateStatusCSV(reservation.status),
        reservation.queuePosition?.toString() || "",
        formatDateCSV(reservation.createdAt),
        reservation.availableDate
          ? formatDateCSV(reservation.availableDate)
          : "",
        reservation.expiryDate ? formatDateCSV(reservation.expiryDate) : "",
      ]);
      break;

    case "statistics":
      if (data.type !== "statistics") return "";
      // Para estatísticas, criar CSV com resumo
      headers = ["Métrica", "Valor"];
      rows = [
        ["Total de Livros", data.summary.totalBooks.toString()],
        ["Membros Ativos", data.summary.totalMembers.toString()],
        ["Empréstimos Ativos", data.summary.activeLoans.toString()],
        ["Empréstimos em Atraso", data.summary.overdueLoans.toString()],
        ["Reservas Ativas", data.summary.activeReservations.toString()],
        ["Total de Multas (Kz)", data.summary.totalFines.toString()],
        ["Multas Pendentes (Kz)", data.summary.pendingFines.toString()],
      ];
      break;

    default:
      return "";
  }

  // Montar CSV
  const csvLines = [headers.join(",")];
  rows.forEach((row) => {
    csvLines.push(row.join(","));
  });

  return BOM + csvLines.join("\n");
}

function escapeCSV(value: string): string {
  if (!value) return "";

  const stringValue = String(value);

  // Se contém vírgula, aspas ou quebra de linha, precisa escapar
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatDateCSV(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function translateStatusCSV(status: string): string {
  const map: Record<string, string> = {
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
  return map[status] || status;
}

function translateUserTypeCSV(type: string): string {
  const map: Record<string, string> = {
    STUDENT: "Estudante",
    TEACHER: "Docente",
    STAFF: "Funcionário",
    LIBRARIAN: "Bibliotecário",
    CATALOGER: "Catalogador",
    SUPERVISOR: "Supervisor",
  };
  return map[type] || type;
}
