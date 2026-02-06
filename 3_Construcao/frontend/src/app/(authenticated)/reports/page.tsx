"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateTablePDF,
  generateStatisticsPDF,
  PDFColumn,
} from "@/lib/pdf-export";

type ReportType =
  | "loans"
  | "books"
  | "members"
  | "fines"
  | "reservations"
  | "lockers"
  | "computers"
  | "training"
  | "statistics";

interface ReportFilters {
  type: ReportType;
  startDate: string;
  endDate: string;
  category: string;
  memberType: string;
  status: string;
}

type CategoryOption = { id: string; name: string };

type StatisticsReportData = {
  type: "statistics";
  summary: {
    totalBooks: number;
    totalMembers: number;
    activeLoans: number;
    overdueLoans: number;
    activeReservations: number;
    totalFines: number;
    pendingFines: number;
  };
  topBooks?: Array<{
    title: string;
    author: string;
    category: string;
    totalLoans: number;
  }>;
  loansByCategory?: Array<{
    category: string;
    totalBooks: number;
    totalLoans: number;
  }>;
};

type ListReportData = {
  type: "loans" | "books" | "members" | "fines" | "reservations";
  total: number;
  data: Array<Record<string, unknown>>;
};

type ReportData = StatisticsReportData | ListReportData;

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-AO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseDateInput(dateOnly: string): Date {
  // Evita shift de timezone ao usar YYYY-MM-DD
  return new Date(`${dateOnly}T00:00:00`);
}

function formatDatePtAO(value: unknown): string {
  if (!value) return "-";

  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) return "-";
  return DATE_FORMATTER.format(date);
}

function translateStatus(status: unknown): string {
  const s = String(status ?? "");
  const map: Record<string, string> = {
    ACTIVE: "Ativo",
    RETURNED: "Devolvido",
    OVERDUE: "Em atraso",
    CANCELLED: "Cancelado",
    PENDING: "Pendente",
    PAID: "Pago",
    WAIVED: "Perdoado",
    AVAILABLE: "Disponível",
    COLLECTED: "Levantado",
    EXPIRED: "Expirado",
    STUDENT: "Estudante",
    TEACHER: "Docente",
    STAFF: "Funcionário",
  };
  return map[s] || s || "-";
}

function shouldFormatAsDateKey(key: string): boolean {
  return [
    "loanDate",
    "dueDate",
    "returnDate",
    "createdAt",
    "paidAt",
    "availableDate",
    "expiryDate",
    "startDate",
    "endDate",
    "scheduledDate",
  ].includes(key);
}

function formatPreviewCell(value: unknown, key: string): string {
  if (shouldFormatAsDateKey(key)) return formatDatePtAO(value);
  if (key === "status" || key === "memberType" || key === "type")
    return translateStatus(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>({
    type: "loans",
    startDate: "",
    endDate: "",
    category: "",
    memberType: "",
    status: "",
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const activeStatusOptions = useMemo(() => {
    if (filters.type === "loans") {
      return [
        { value: "ACTIVE", label: "Ativo" },
        { value: "RETURNED", label: "Devolvido" },
        { value: "OVERDUE", label: "Em atraso" },
        { value: "CANCELLED", label: "Cancelado" },
      ];
    }

    if (filters.type === "fines") {
      return [
        { value: "PENDING", label: "Pendente" },
        { value: "PAID", label: "Pago" },
        { value: "WAIVED", label: "Perdoado" },
        { value: "CANCELLED", label: "Cancelado" },
      ];
    }

    if (filters.type === "reservations") {
      return [
        { value: "ACTIVE", label: "Ativo" },
        { value: "AVAILABLE", label: "Disponível" },
        { value: "COLLECTED", label: "Levantado" },
        { value: "EXPIRED", label: "Expirado" },
        { value: "CANCELLED", label: "Cancelado" },
      ];
    }

    return [];
  }, [filters.type]);

  const showStatusFilter =
    filters.type === "loans" ||
    filters.type === "fines" ||
    filters.type === "reservations";

  const showMemberTypeFilter =
    filters.type === "loans" ||
    filters.type === "members" ||
    filters.type === "fines" ||
    filters.type === "reservations";

  const showCategoryFilter =
    filters.type === "loans" || filters.type === "books";

  useEffect(() => {
    if (!showCategoryFilter) return;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const resp = await fetch("/api/entities/Category?take=200");
        if (!resp.ok) return;
        const data = (await resp.json()) as Array<{ id: string; name: string }>;
        setCategories(
          data
            .filter((c) => typeof c.name === "string" && c.name.trim())
            .map((c) => ({ id: c.id, name: c.name })),
        );
      } catch {
        // Silencioso; filtro é opcional
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [showCategoryFilter]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "__all__" ? "" : value,
    }));
  };

  const generateReport = async () => {
    if (filters.startDate && filters.endDate) {
      const start = parseDateInput(filters.startDate);
      const end = parseDateInput(filters.endDate);
      if (start.getTime() > end.getTime()) {
        toast({
          title: "Intervalo de datas inválido",
          description:
            "A data de início deve ser anterior ou igual à data de fim.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", filters.type);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.category && filters.category !== "__all__")
        params.append("category", filters.category);
      if (filters.memberType && filters.memberType !== "__all__")
        params.append("memberType", filters.memberType);
      if (filters.status && filters.status !== "__all__")
        params.append("status", filters.status);

      const response = await fetch(`/api/reports?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar relatório");
      }

      const data = await response.json();
      setReportData(data as ReportData);

      toast({
        title: "Relatório gerado",
        description:
          data?.type === "statistics"
            ? "Estatísticas carregadas com sucesso"
            : `${data.total || 0} registos encontrados`,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao gerar relatório",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      if (filters.startDate && filters.endDate) {
        const start = parseDateInput(filters.startDate);
        const end = parseDateInput(filters.endDate);
        if (start.getTime() > end.getTime()) {
          toast({
            title: "Intervalo de datas inválido",
            description:
              "A data de início deve ser anterior ou igual à data de fim.",
            variant: "destructive",
          });
          return;
        }
      }

      const params = new URLSearchParams();
      params.append("type", filters.type);
      params.append("format", "csv");
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.category && filters.category !== "__all__")
        params.append("category", filters.category);
      if (filters.memberType && filters.memberType !== "__all__")
        params.append("memberType", filters.memberType);
      if (filters.status && filters.status !== "__all__")
        params.append("status", filters.status);

      const response = await fetch(`/api/reports?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao exportar CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${filters.type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "CSV exportado",
        description: "Relatório exportado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar CSV",
        variant: "destructive",
      });
    }
  };

  const exportPDF = () => {
    if (!reportData) {
      toast({
        title: "Erro",
        description: "Gere um relatório primeiro",
        variant: "destructive",
      });
      return;
    }

    if (filters.type !== "statistics" && reportData.type === "statistics") {
      toast({
        title: "Erro",
        description: "Gere um relatório primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      const title = getReportTitle(filters.type);
      const subtitle = buildSubtitle();

      if (filters.type === "statistics") {
        generateStatisticsPDF(reportData, {
          title,
          filename: `estatisticas-${new Date().toISOString().split("T")[0]}.pdf`,
        });
      } else {
        const columns = getPDFColumns(filters.type);
        generateTablePDF((reportData as ListReportData).data, columns, {
          title,
          subtitle,
          filename: `relatorio-${filters.type}-${new Date().toISOString().split("T")[0]}.pdf`,
          orientation: filters.type === "loans" ? "landscape" : "portrait",
        });
      }

      toast({
        title: "PDF exportado",
        description: "Relatório exportado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar PDF",
        variant: "destructive",
      });
    }
  };

  const getReportTitle = (type: ReportType): string => {
    const titles: Record<ReportType, string> = {
      loans: "Relatório de Empréstimos",
      books: "Relatório de Livros",
      members: "Relatório de Membros",
      fines: "Relatório de Multas",
      reservations: "Relatório de Reservas",
      lockers: "Relatório de Cacifos",
      computers: "Relatório de Computadores",
      training: "Relatório de Formações",
      statistics: "Estatísticas Gerais",
    };
    return titles[type];
  };

  const buildSubtitle = (): string => {
    const parts: string[] = [];
    if (filters.startDate)
      parts.push(`De: ${formatDatePtAO(parseDateInput(filters.startDate))}`);
    if (filters.endDate)
      parts.push(`Até: ${formatDatePtAO(parseDateInput(filters.endDate))}`);
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.memberType) parts.push(`Tipo: ${filters.memberType}`);
    return parts.join(" | ");
  };

  const getPDFColumns = (type: ReportType): PDFColumn[] => {
    switch (type) {
      case "loans":
        return [
          { header: "Livro", dataKey: "bookTitle" },
          { header: "Membro", dataKey: "memberName" },
          { header: "Data Empréstimo", dataKey: "loanDate" },
          { header: "Vencimento", dataKey: "dueDate" },
          { header: "Status", dataKey: "status" },
        ];
      case "books":
        return [
          { header: "Título", dataKey: "title" },
          { header: "Autor", dataKey: "author" },
          { header: "ISBN", dataKey: "isbn" },
          { header: "Categoria", dataKey: "category" },
          { header: "Disponíveis", dataKey: "availableCopies" },
        ];
      case "members":
        return [
          { header: "Nome", dataKey: "fullName" },
          { header: "Email", dataKey: "email" },
          { header: "Tipo", dataKey: "type" },
          { header: "Empréstimos", dataKey: "totalLoans" },
        ];
      case "fines":
        return [
          { header: "Membro", dataKey: "memberName" },
          { header: "Valor (Kz)", dataKey: "amount" },
          { header: "Motivo", dataKey: "reason" },
          { header: "Status", dataKey: "status" },
        ];
      case "reservations":
        return [
          { header: "Livro", dataKey: "bookTitle" },
          { header: "Membro", dataKey: "memberName" },
          { header: "Status", dataKey: "status" },
          { header: "Posição", dataKey: "queuePosition" },
        ];
      case "lockers":
        return [
          { header: "Cacifo", dataKey: "lockerName" },
          { header: "Membro", dataKey: "memberName" },
          { header: "Data Início", dataKey: "startDate" },
          { header: "Data Fim", dataKey: "endDate" },
          { header: "Status", dataKey: "status" },
        ];
      case "computers":
        return [
          { header: "Computador", dataKey: "computerName" },
          { header: "Membro", dataKey: "memberName" },
          { header: "Data Início", dataKey: "startDate" },
          { header: "Data Fim", dataKey: "endDate" },
          { header: "Status", dataKey: "status" },
        ];
      case "training":
        return [
          { header: "Título", dataKey: "title" },
          { header: "Data", dataKey: "scheduledDate" },
          { header: "Local", dataKey: "location" },
          { header: "Participantes", dataKey: "participantCount" },
          { header: "Status", dataKey: "status" },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="w-7 h-7 text-indigo-600" />
              Relatórios
            </h1>
            <p className="text-slate-500 mt-1">
              Gere e exporte relatórios detalhados da biblioteca
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setFilters({
                type: filters.type,
                startDate: "",
                endDate: "",
                category: "",
                memberType: "",
                status: "",
              });
              setReportData(null);
            }}
          >
            Limpar filtros
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Filtros */}
          <Card className="border-0 shadow-sm lg:sticky lg:top-6 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Filter className="h-5 w-5 text-slate-600" />
                Filtros
              </CardTitle>
              <CardDescription>
                Configure os parâmetros do relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Relatório</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loans">Empréstimos</SelectItem>
                    <SelectItem value="books">Livros</SelectItem>
                    <SelectItem value="members">Membros</SelectItem>
                    <SelectItem value="fines">Multas</SelectItem>
                    <SelectItem value="reservations">Reservas</SelectItem>
                    <SelectItem value="lockers">Cacifos</SelectItem>
                    <SelectItem value="computers">Computadores</SelectItem>
                    <SelectItem value="training">Formacoes</SelectItem>
                    <SelectItem value="statistics">Estatísticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                </div>
              </div>

              {(showStatusFilter ||
                showMemberTypeFilter ||
                showCategoryFilter) && <div className="pt-2 border-t" />}

              {showStatusFilter && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status || undefined}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {activeStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showMemberTypeFilter && (
                <div className="space-y-2">
                  <Label htmlFor="memberType">Tipo de Membro</Label>
                  <Select
                    value={filters.memberType || undefined}
                    onValueChange={(value) =>
                      handleFilterChange("memberType", value)
                    }
                  >
                    <SelectTrigger id="memberType">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="STUDENT">Estudante</SelectItem>
                      <SelectItem value="TEACHER">Docente</SelectItem>
                      <SelectItem value="STAFF">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCategoryFilter && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={filters.category || undefined}
                    onValueChange={(value) =>
                      handleFilterChange("category", value)
                    }
                    disabled={isLoadingCategories}
                  >
                    <SelectTrigger id="category">
                      <SelectValue
                        placeholder={
                          isLoadingCategories ? "A carregar..." : "Todas"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={generateReport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "A gerar..." : "Gerar Relatório"}
              </Button>
            </CardContent>
          </Card>

          {/* Resultados */}
          <div className="space-y-6">
            {reportData && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-slate-800">
                        {getReportTitle(filters.type)}
                      </CardTitle>
                      <CardDescription>
                        {reportData.type === "statistics"
                          ? "Resumo geral"
                          : `${reportData.total || 0} registo(s) encontrado(s)`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={exportCSV}
                        variant="outline"
                        size="sm"
                        disabled={
                          !reportData || reportData.type === "statistics"
                        }
                        title={
                          reportData.type === "statistics"
                            ? "Exportação CSV indisponível para estatísticas"
                            : undefined
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button onClick={exportPDF} variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData.type === "statistics" ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                          title="Total de Livros"
                          value={reportData.summary.totalBooks || 0}
                        />
                        <StatCard
                          title="Membros Ativos"
                          value={reportData.summary.totalMembers || 0}
                        />
                        <StatCard
                          title="Empréstimos Ativos"
                          value={reportData.summary.activeLoans || 0}
                        />
                        <StatCard
                          title="Empréstimos em Atraso"
                          value={reportData.summary.overdueLoans || 0}
                        />
                        <StatCard
                          title="Reservas Ativas"
                          value={reportData.summary.activeReservations || 0}
                        />
                        <StatCard
                          title="Multas Pendentes"
                          value={`${Number(reportData.summary.pendingFines || 0).toLocaleString("pt-AO")} Kz`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border bg-white overflow-hidden">
                      <div className="relative w-full overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              {getPDFColumns(filters.type).map((col) => (
                                <TableHead key={col.dataKey}>
                                  {col.header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.data.slice(0, 50).map((row, index) => (
                              <TableRow key={index}>
                                {getPDFColumns(filters.type).map((col) => (
                                  <TableCell key={col.dataKey}>
                                    {formatPreviewCell(
                                      row[col.dataKey],
                                      col.dataKey,
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {reportData.data.length > 50 && (
                        <p className="text-sm text-slate-500 py-3 text-center border-t bg-white">
                          A mostrar 50 de {reportData.data.length} registos.
                          Exporte para ver todos.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!reportData && (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-16 w-16 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">
                    Configure os filtros e gere um relatório
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Datas e valores são mostrados em formato pt-AO.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
