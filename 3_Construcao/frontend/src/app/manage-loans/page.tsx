"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Loan, type Reservation } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  format,
  differenceInDays,
  differenceInHours,
  isPast,
  startOfDay,
} from "date-fns";
import {
  BookMarked,
  Search,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Undo2,
  Loader2,
  Clock,
  Download,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  XCircle,
  ClipboardCheck,
  Bell,
  RefreshCw,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadCSV, type CSVColumn } from "@/lib/csv-export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ManageLoans() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [showDamagedDialog, setShowDamagedDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  // Sempre inicializar com "loans" para SSR
  const [activeTab, setActiveTab] = useState<"loans" | "process">("loans");
  const [loanSubTab, setLoanSubTab] = useState<
    "active" | "overdue" | "returned"
  >("active");
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const queryClient = useQueryClient();
  const maxBooksFallback: Record<string, number> = {
    student: 2,
    teacher: 4,
    staff: 4,
    librarian: 4,
    cataloger: 4,
    supervisor: 4,
  };

  // Detectar hash da URL e query params após montagem
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const [tab, query] = hash.split("?");

    if (tab === "loans" || tab === "process") {
      setTimeout(() => setActiveTab(tab), 0);
    }

    // Detectar subtab do query param
    if (query) {
      const params = new URLSearchParams(query);
      const subtab = params.get("subtab");
      if (
        subtab === "active" ||
        subtab === "overdue" ||
        subtab === "returned"
      ) {
        setTimeout(() => setLoanSubTab(subtab), 10);
      }
    }
  }, []);

  useEffect(() => {
    const subtab = activeTab === "loans" ? `?subtab=${loanSubTab}` : "";
    const nextHash = `#${activeTab}${subtab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextHash}`,
      );
    }
  }, [activeTab, loanSubTab]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  // Queries
  const { data: loans = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: ["manage-loans"],
    queryFn: () => api.entities.Loan.list("-loan_date", 200),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: allReservations = [], isLoading: isLoadingReservations } =
    useQuery({
      queryKey: ["all-reservations"],
      queryFn: () => api.entities.Reservation.list("-reservation_date", 100),
      enabled: !!user,
      refetchInterval: 30000,
      initialData: [],
    });

  const { data: loanPolicies = [] } = useQuery({
    queryKey: ["loan-policies"],
    queryFn: async () => {
      const res = await fetch("/api/settings/loan-policies");
      if (!res.ok) throw new Error("Erro ao carregar políticas");
      const data = await res.json();
      return data.loanPolicies ?? [];
    },
    enabled: !!user,
    initialData: [],
    refetchInterval: 60000,
  });

  // Filtrar reservas pendentes (AVAILABLE ou ACTIVE)
  const pendingReservations = allReservations.filter(
    (r) => r.status === "available" || r.status === "active",
  );

  const processedReservations = allReservations.filter(
    (r) =>
      r.status === "collected" ||
      r.status === "expired" ||
      r.status === "cancelled",
  );

  // Separar por disponibilidade
  const availableReservations = pendingReservations.filter(
    (r) => r.status === "available",
  );

  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "overdue",
  );
  const activeLoansByMember = activeLoans.reduce((acc, loan) => {
    const key = (loan.member_id ?? "").toLowerCase();
    if (!key) return acc;
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  const safeLoanPolicies = Array.isArray(loanPolicies) ? loanPolicies : [];
  const maxBooksByType = safeLoanPolicies.reduce(
    (acc: Map<string, number>, policy: any) => {
      if (!policy?.userType) return acc;
      const key = String(policy.userType).toLowerCase();
      acc.set(key, Number(policy.maxBooks) || maxBooksFallback[key] || 2);
      return acc;
    },
    new Map<string, number>(),
  );
  const overdueLoans = activeLoans.filter((l) =>
    l.due_date ? isPast(new Date(l.due_date)) : false,
  );
  const returnedLoans = loans.filter((l) => l.status === "returned");
  // Contar empréstimos processados hoje
  const processedToday = loans.filter((l) => {
    if (!l.loan_date) return false;
    const loanDate = new Date(l.loan_date);
    const today = new Date();
    return (
      loanDate.getDate() === today.getDate() &&
      loanDate.getMonth() === today.getMonth() &&
      loanDate.getFullYear() === today.getFullYear()
    );
  }).length;
  // Mutations
  const returnLoanMutation = useMutation<void, Error, Loan>({
    mutationFn: async (loan) => {
      await api.entities.Loan.update(loan.id, { status: "returned" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      setShowReturnDialog(false);
      setSelectedLoan(null);
      toast.success("Devolução registrada!");
    },
    onError: () => {
      toast.error("Erro ao registrar devolução");
    },
  });

  const renewLoanMutation = useMutation<void, Error, Loan>({
    mutationFn: async (loan) => {
      const renewalCount = loan.renewal_count ?? 0;
      const maxRenewals = loan.max_renewals ?? 0;
      if (renewalCount >= maxRenewals) {
        throw new Error("Limite de renovações atingido (máx: 2)");
      }
      await api.loans.renew(loan.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      setShowRenewDialog(false);
      setSelectedLoan(null);
      toast.success("Empréstimo renovado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao renovar empréstimo");
    },
  });

  const markDamagedMutation = useMutation<void, Error, Loan>({
    mutationFn: async (loan) => {
      const res = await fetch(`/api/loans/${loan.id}/damaged`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao marcar como danificado");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setShowDamagedDialog(false);
      setSelectedLoan(null);
      toast.success("Livro marcado como danificado. Multa aplicada.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const markLostMutation = useMutation<void, Error, Loan>({
    mutationFn: async (loan) => {
      const res = await fetch(`/api/loans/${loan.id}/lost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao marcar como perdido");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setShowLostDialog(false);
      setSelectedLoan(null);
      toast.success("Livro marcado como perdido. Multa aplicada.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      const loan = await api.entities.Loan.create({
        member_id: reservation.member_id,
        book_id: reservation.book_id,
        reservation_id: reservation.id,
      });

      return { loan, reservation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      setShowConfirmDialog(false);
      setSelectedReservation(null);
      toast.success(`Empréstimo aprovado! Notificação enviada ao membro.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar empréstimo");
    },
  });

  const processReservationMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      await api.entities.Reservation.update(reservation.id, {
        status: "available",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      setShowProcessDialog(false);
      setSelectedReservation(null);
      toast.success("Reserva processada! Utilizador será notificado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar reserva");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      await api.entities.Reservation.update(reservation.id, {
        status: "expired",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
      setShowRejectDialog(false);
      setSelectedReservation(null);
      toast.success("Reserva marcada como expirada");
    },
    onError: () => {
      toast.error("Erro ao processar rejeição");
    },
  });

  // Helper functions
  const getLoanStatus = (loan: Loan) => {
    if (loan.status === "returned")
      return { label: "Devolvido", color: "bg-slate-100 text-slate-700" };
    if (!loan.due_date)
      return { label: "Sem data", color: "bg-slate-100 text-slate-700" };

    // Normalizar datas para início do dia
    const dueDate = startOfDay(new Date(loan.due_date));
    const today = startOfDay(new Date());

    if (isPast(dueDate)) {
      const days = differenceInDays(today, dueDate);
      return {
        label: `${days} dia(s) atraso`,
        color: "bg-red-100 text-red-700",
      };
    }
    const daysLeft = differenceInDays(dueDate, today);
    if (daysLeft <= 2)
      return {
        label: `${daysLeft} dia(s) restante(s)`,
        color: "bg-orange-100 text-orange-700",
      };
    return {
      label: `${daysLeft} dias restantes`,
      color: "bg-emerald-100 text-emerald-700",
    };
  };

  const getTimeRemaining = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const hours = differenceInHours(new Date(expiryDate), new Date());
    if (hours < 0) return { text: "Expirado", urgent: true };
    if (hours < 6) return { text: `${hours}h restantes`, urgent: true };
    if (hours < 24) return { text: `${hours}h restantes`, urgent: false };
    return { text: `${Math.ceil(hours / 24)} dias restantes`, urgent: false };
  };

  const filteredLoans = (loansList: Loan[]) => {
    if (!searchQuery) return loansList;
    const query = searchQuery.toLowerCase();
    return loansList.filter(
      (loan) =>
        loan.book_title?.toLowerCase().includes(query) ||
        loan.member_name?.toLowerCase().includes(query) ||
        loan.member_id?.toLowerCase().includes(query),
    );
  };

  const filteredReservations = (reservationsList: Reservation[]) => {
    if (!searchQuery) return reservationsList;
    const query = searchQuery.toLowerCase();
    return reservationsList.filter(
      (reservation) =>
        reservation.book_title?.toLowerCase().includes(query) ||
        reservation.member_id?.toLowerCase().includes(query),
    );
  };

  const filteredPendingReservations = filteredReservations(pendingReservations);
  const filteredProcessedReservations = filteredReservations(
    processedReservations,
  );

  const translateLoanStatus = (status: unknown) => {
    const s = String(status ?? "").toLowerCase();
    const map: Record<string, string> = {
      active: "Ativo",
      overdue: "Em atraso",
      returned: "Devolvido",
      cancelled: "Cancelado",
    };
    return map[s] || s || "-";
  };

  const translateReservationStatus = (status: unknown) => {
    const s = String(status ?? "").toLowerCase();
    const map: Record<string, string> = {
      active: "Ativo",
      available: "Disponível",
      collected: "Levantado",
      expired: "Expirado",
      cancelled: "Cancelado",
    };
    return map[s] || s || "-";
  };

  const handleExport = () => {
    const date = new Date().toISOString().split("T")[0];

    if (activeTab === "process") {
      if (pendingReservations.length === 0) {
        toast.error("Sem reservas para exportar");
        return;
      }

      const columns: CSVColumn[] = [
        {
          key: "book_title",
          label: "Livro",
          formatter: (v) => String(v ?? ""),
        },
        {
          key: "member_id",
          label: "Membro (Email)",
          formatter: (v) => String(v ?? ""),
        },
        {
          key: "reservation_date",
          label: "Data Reserva",
          formatter: (v) =>
            v ? format(new Date(String(v)), "dd/MM/yyyy") : "",
        },
        {
          key: "queue_position",
          label: "Posição",
          formatter: (v) => String(v ?? ""),
        },
        {
          key: "status",
          label: "Status",
          formatter: (v) => translateReservationStatus(v),
        },
        {
          key: "expiry_date",
          label: "Expira Em",
          formatter: (v) =>
            v ? format(new Date(String(v)), "dd/MM/yyyy") : "",
        },
      ];

      downloadCSV(
        pendingReservations as unknown as Array<Record<string, unknown>>,
        columns,
        {
          filename: `reservas-pendentes-${date}.csv`,
        },
      );
      toast.success("CSV exportado: Reservas pendentes");
      return;
    }

    const sourceLoans =
      loanSubTab === "active"
        ? activeLoans
        : loanSubTab === "overdue"
          ? overdueLoans
          : returnedLoans;

    const exportLoans = filteredLoans(sourceLoans);
    if (exportLoans.length === 0) {
      toast.error("Sem empréstimos para exportar");
      return;
    }

    const columns: CSVColumn[] = [
      {
        key: "book_title",
        label: "Livro",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "member_name",
        label: "Membro",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "member_id",
        label: "Membro (Email)",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "loan_date",
        label: "Data Empréstimo",
        formatter: (v) => (v ? format(new Date(String(v)), "dd/MM/yyyy") : ""),
      },
      {
        key: "due_date",
        label: "Vencimento",
        formatter: (v) => (v ? format(new Date(String(v)), "dd/MM/yyyy") : ""),
      },
      {
        key: "status",
        label: "Status",
        formatter: (v) => translateLoanStatus(v),
      },
      {
        key: "renewal_count",
        label: "Renovações",
        formatter: (_v, row) =>
          `${Number(row.renewal_count ?? 0)}/${Number(row.max_renewals ?? 0)}`,
      },
    ];

    downloadCSV(
      exportLoans as unknown as Array<Record<string, unknown>>,
      columns,
      {
        filename: `emprestimos-${loanSubTab}-${date}.csv`,
      },
    );
    toast.success("CSV exportado: Empréstimos");
  };

  // Components
  const LoanRow = ({ loan }: { loan: Loan }) => {
    const status = getLoanStatus(loan);
    return (
      <TableRow className="group">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-md bg-slate-100 overflow-hidden shrink-0">
              {loan.cover_url ? (
                <Image
                  src={loan.cover_url}
                  alt={loan.book_title ?? "Capa do livro"}
                  width={40}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-slate-300" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-slate-800">{loan.book_title}</p>
              <p className="text-xs text-slate-500">ID: {loan.copy_id}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="text-slate-800">{loan.member_name}</p>
            <p className="text-xs text-slate-500">{loan.member_id}</p>
          </div>
        </TableCell>
        <TableCell className="text-slate-600">
          {loan.loan_date
            ? format(new Date(loan.loan_date), "dd/MM/yyyy")
            : "-"}
        </TableCell>
        <TableCell className="text-slate-600">
          {loan.due_date ? format(new Date(loan.due_date), "dd/MM/yyyy") : "-"}
        </TableCell>
        <TableCell>
          <Badge className={status.color}>{status.label}</Badge>
        </TableCell>
        <TableCell>
          <span className="text-slate-600">
            {loan.renewal_count}/{loan.max_renewals}
          </span>
        </TableCell>
        <TableCell>
          {loan.status !== "returned" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowReturnDialog(true);
                  }}
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Registrar Devolução
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowRenewDialog(true);
                  }}
                  disabled={
                    (loan.renewal_count ?? 0) >= (loan.max_renewals ?? 0)
                  }
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renovar Empréstimo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowDamagedDialog(true);
                  }}
                  className="text-orange-600"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Marcar como Danificado
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowLostDialog(true);
                  }}
                  className="text-red-600"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Marcar como Perdido
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
    const timeInfo = getTimeRemaining(reservation.expiry_date);
    const memberKey = (reservation.member_id ?? "").toLowerCase();
    const memberType = (reservation.member_type ?? "student").toLowerCase();
    const memberLoans = activeLoansByMember.get(memberKey) ?? 0;
    const maxBooks =
      maxBooksByType.get(memberType) ?? maxBooksFallback[memberType] ?? 2;
    const isLoanLimitReached = memberLoans >= maxBooks;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <Card
          className={cn(
            "border-0 shadow-sm hover:shadow-md transition-all duration-300",
            timeInfo?.urgent && "ring-2 ring-amber-200",
          )}
        >
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="w-20 h-28 bg-linear-to-br from-amber-100 to-amber-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                {reservation.cover_url ? (
                  <Image
                    src={reservation.cover_url}
                    alt={reservation.book_title ?? "Capa do livro"}
                    width={80}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-10 h-10 text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={createPageUrl(
                        `BookDetails?id=${reservation.book_id}`,
                      )}
                    >
                      <h3 className="font-semibold text-slate-800 hover:text-amber-600 transition-colors line-clamp-2">
                        {reservation.book_title || "Título não disponível"}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {reservation.member_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {timeInfo && (
                      <Badge
                        className={cn(
                          "shrink-0",
                          timeInfo.urgent
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {timeInfo.text}
                      </Badge>
                    )}
                    {isLoanLimitReached && (
                      <Badge className="bg-red-100 text-red-700">
                        Limite atingido ({memberLoans}/{maxBooks})
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Reservado em{" "}
                      {reservation.reservation_date
                        ? format(
                            new Date(reservation.reservation_date),
                            "dd/MM/yy",
                          )
                        : "-"}
                    </span>
                  </div>
                  {reservation.queue_position && (
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                      Posição: {reservation.queue_position}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {reservation.status === "active" ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowProcessDialog(true);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              isLoanLimitReached ||
                              processReservationMutation.isPending ||
                              rejectMutation.isPending ||
                              approveMutation.isPending
                            }
                          >
                            {processReservationMutation.isPending &&
                            selectedReservation?.id === reservation.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4 mr-2" />
                                Disponibilizar Livro
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        {isLoanLimitReached && (
                          <TooltipContent>
                            <p>Limite de empréstimos atingido</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowConfirmDialog(true);
                            }}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              isLoanLimitReached ||
                              approveMutation.isPending ||
                              rejectMutation.isPending ||
                              processReservationMutation.isPending ||
                              reservation.status !== "available"
                            }
                          >
                            {approveMutation.isPending &&
                            selectedReservation?.id === reservation.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {reservation.status === "available"
                                  ? "Aprovar"
                                  : "Aguardando Livro"}
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        {isLoanLimitReached && (
                          <TooltipContent>
                            <p>Limite de empréstimos atingido</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setShowRejectDialog(true);
                          }}
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending ||
                            processReservationMutation.isPending
                          }
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Marcar como expirada</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const ProcessedReservationCard = ({
    reservation,
  }: {
    reservation: Reservation;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="w-16 h-22 bg-linear-to-br from-slate-100 to-slate-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                {reservation.cover_url ? (
                  <Image
                    src={reservation.cover_url}
                    alt={reservation.book_title ?? "Capa do livro"}
                    width={64}
                    height={88}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={createPageUrl(
                        `BookDetails?id=${reservation.book_id}`,
                      )}
                    >
                      <h3 className="font-semibold text-slate-800 hover:text-amber-600 transition-colors line-clamp-2">
                        {reservation.book_title || "Título não disponível"}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {reservation.member_id}
                      </span>
                    </div>
                  </div>

                  <Badge className="bg-slate-100 text-slate-700 shrink-0">
                    {translateReservationStatus(reservation.status)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>
                    Reservado em{" "}
                    {reservation.reservation_date
                      ? format(
                          new Date(reservation.reservation_date),
                          "dd/MM/yy",
                        )
                      : "-"}
                  </span>
                  <span>
                    Atualizado em{" "}
                    {reservation.updated_date
                      ? format(new Date(reservation.updated_date), "dd/MM/yy")
                      : "-"}
                  </span>
                  {reservation.collection_date && (
                    <span>
                      Levantado em{" "}
                      {format(
                        new Date(reservation.collection_date),
                        "dd/MM/yy",
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Render
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BookMarked className="w-7 h-7 text-amber-600" />
              Gestão de Empréstimos
            </h1>
            <p className="text-slate-500 mt-1">
              {activeLoans.length} empréstimo(s) ativo(s) •{" "}
              {availableReservations.length} reserva(s) aguardando
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Pesquisar por livro ou membro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "loans" | "process")}
          className="space-y-6"
          suppressHydrationWarning
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">
              <BookMarked className="w-4 h-4 mr-2" />
              Empréstimos ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="process">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Processar Reservas ({pendingReservations.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Empréstimos */}
          <TabsContent value="loans" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Ativos</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {activeLoans.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Em Atraso</p>
                      <p className="text-2xl font-bold text-red-600">
                        {overdueLoans.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Devolvidos</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {returnedLoans.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Nested Tabs */}
            <Tabs
              value={loanSubTab}
              onValueChange={(v) =>
                setLoanSubTab(v as "active" | "overdue" | "returned")
              }
            >
              <TabsList className="mb-6">
                <TabsTrigger value="active">
                  <Clock className="w-4 h-4 mr-2" />
                  Ativos ({activeLoans.length})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Em Atraso ({overdueLoans.length})
                </TabsTrigger>
                <TabsTrigger value="returned">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Devolvidos ({returnedLoans.length})
                </TabsTrigger>
              </TabsList>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <TabsContent value="active" className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Livro</TableHead>
                          <TableHead>Membro</TableHead>
                          <TableHead>Data Empréstimo</TableHead>
                          <TableHead>Data Devolução</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Renovações</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingLoans
                          ? Array(5)
                              .fill(0)
                              .map((_, i) => (
                                <TableRow key={i}>
                                  <TableCell>
                                    <Skeleton className="h-10 w-48" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-10 w-32" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-4 w-24" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-4 w-24" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-4 w-12" />
                                  </TableCell>
                                  <TableCell>
                                    <Skeleton className="h-8 w-8" />
                                  </TableCell>
                                </TableRow>
                              ))
                          : filteredLoans(activeLoans).map((loan) => (
                              <LoanRow key={loan.id} loan={loan} />
                            ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="overdue" className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Livro</TableHead>
                          <TableHead>Membro</TableHead>
                          <TableHead>Data Empréstimo</TableHead>
                          <TableHead>Data Devolução</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Renovações</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoans(overdueLoans).map((loan) => (
                          <LoanRow key={loan.id} loan={loan} />
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="returned" className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Livro</TableHead>
                          <TableHead>Membro</TableHead>
                          <TableHead>Data Empréstimo</TableHead>
                          <TableHead>Data Devolução</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Renovações</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoans(returnedLoans).map((loan) => (
                          <LoanRow key={loan.id} loan={loan} />
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </TabsContent>

          {/* Tab 2: Processar Reservas */}
          <TabsContent value="process" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Aguardando Aprovação
                      </p>
                      <p className="text-2xl font-bold text-slate-800">
                        {pendingReservations.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Urgentes</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {
                          availableReservations.filter((r) => {
                            const info = getTimeRemaining(r.expiry_date);
                            return info?.urgent;
                          }).length
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Processados Hoje</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {processedToday}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reservations List */}
            {isLoadingReservations ? (
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : filteredPendingReservations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhuma reserva pendente
                  </h3>
                  <p className="text-slate-500">
                    {searchQuery
                      ? "Nenhuma reserva corresponde a sua pesquisa."
                      : "Não há reservas aguardando aprovação no momento."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPendingReservations
                  .sort((a, b) => {
                    // Prioridade: AVAILABLE primeiro, depois por data de expiração
                    if (a.status === "available" && b.status !== "available")
                      return -1;
                    if (a.status !== "available" && b.status === "available")
                      return 1;

                    if (!a.expiry_date) return 1;
                    if (!b.expiry_date) return -1;
                    return (
                      new Date(a.expiry_date).getTime() -
                      new Date(b.expiry_date).getTime()
                    );
                  })
                  .map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                    />
                  ))}
              </div>
            )}

            {/* Processed Reservations */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Reservas processadas
                </h3>
                <Badge className="bg-slate-100 text-slate-700">
                  {processedReservations.length}
                </Badge>
              </div>

              {filteredProcessedReservations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {searchQuery
                        ? "Nenhuma reserva processada corresponde a sua pesquisa."
                        : "Nenhuma reserva processada ainda."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredProcessedReservations
                    .sort((a, b) => {
                      if (!a.updated_date) return 1;
                      if (!b.updated_date) return -1;
                      return (
                        new Date(b.updated_date).getTime() -
                        new Date(a.updated_date).getTime()
                      );
                    })
                    .slice(0, 10)
                    .map((reservation) => (
                      <ProcessedReservationCard
                        key={reservation.id}
                        reservation={reservation}
                      />
                    ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Confirmar a devolução do livro &quot;{selectedLoan?.book_title}
              &quot;.
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Membro:</span>
                  <span className="font-medium">
                    {selectedLoan.member_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data empréstimo:</span>
                  <span>
                    {selectedLoan.loan_date
                      ? format(new Date(selectedLoan.loan_date), "dd/MM/yyyy")
                      : "-"}
                  </span>
                </div>
              </div>
              {selectedLoan.due_date &&
                isPast(new Date(selectedLoan.due_date)) && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Devolução em atraso</span>
                    </div>
                    <p className="text-sm text-red-600">
                      {differenceInDays(
                        new Date(),
                        new Date(selectedLoan.due_date),
                      )}{" "}
                      dia(s) de atraso. Multa será gerada automaticamente.
                    </p>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedLoan) returnLoanMutation.mutate(selectedLoan);
              }}
              disabled={returnLoanMutation.isPending || !selectedLoan}
            >
              {returnLoanMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Renovar Empr\u00e9stimo */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Empr\u00e9stimo</DialogTitle>
            <DialogDescription>
              Confirmar renova\u00e7\u00e3o do empr\u00e9stimo de &quot;
              {selectedLoan?.book_title}&quot;.
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Membro:</span>
                  <span className="font-medium">
                    {selectedLoan.member_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Renova\u00e7\u00f5es:</span>
                  <span>
                    {(selectedLoan.renewal_count ?? 0) + 1} de{" "}
                    {selectedLoan.max_renewals ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Novo prazo:</span>
                  <span className="font-medium">
                    +{selectedLoan.copy_id?.includes("TEACHER") ? 15 : 5}{" "}
                    dias
                  </span>
                </div>
              </div>
              {(selectedLoan.renewal_count ?? 0) + 1 >=
                (selectedLoan.max_renewals ?? 0) && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">
                      \u00daltima renova\u00e7\u00e3o
                    </span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">
                    Esta ser\u00e1 a \u00faltima renova\u00e7\u00e3o permitida
                    para este empr\u00e9stimo (m\u00e1x: 2).
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedLoan) renewLoanMutation.mutate(selectedLoan);
              }}
              disabled={renewLoanMutation.isPending || !selectedLoan}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {renewLoanMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar Renova\u00e7\u00e3o
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar como Danificado */}
      <AlertDialog open={showDamagedDialog} onOpenChange={setShowDamagedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Marcar Livro como Danificado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar o livro &quot;
              {selectedLoan?.book_title}&quot; como <strong>danificado</strong>?
              <br />
              <br />
              <strong>A\u00e7\u00f5es autom\u00e1ticas:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Condi\u00e7\u00e3o do exemplar: <strong>MAU</strong>
                </li>
                <li>
                  Status do exemplar: <strong>DANIFICADO</strong>
                </li>
                <li>
                  Multa aplicada ao membro: <strong>500 Kz</strong>
                </li>
                <li>
                  Exemplar enviado para manuten\u00e7\u00e3o (indispon\u00edvel
                  para empr\u00e9stimo)
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedLoan) markDamagedMutation.mutate(selectedLoan);
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={markDamagedMutation.isPending}
            >
              {markDamagedMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar - Danificado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Marcar como Perdido */}
      <AlertDialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="w-5 h-5" />
              Marcar Livro como Perdido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar o livro &quot;
              {selectedLoan?.book_title}&quot; como <strong>perdido</strong>?
              <br />
              <br />
              <strong>Ações automáticas:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  EStado do exemplar: <strong>PERDIDO</strong>
                </li>
                <li>
                  Multa aplicada ao membro: <strong>1.500 Kz</strong>
                </li>
                <li>
                  Exemplar permanentemente removido do acervo disponível
                </li>
                <li>Contador de cópias totais será decrementado</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedLoan) markLostMutation.mutate(selectedLoan);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={markLostMutation.isPending}
            >
              {markLostMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar - Perdido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Empréstimo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que o membro{" "}
              <strong>{selectedReservation?.member_id}</strong> está presente
              fisicamente e deseja criar o empréstimo do livro{" "}
              <strong>&quot;{selectedReservation?.book_title}&quot;</strong>?
              <br />
              <br />
              Esta ação criará um empréstimo ativo e notificará o membro sobre a
              data de devolução.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation && !approveMutation.isPending) {
                  approveMutation.mutate(selectedReservation);
                }
              }}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Empréstimo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Expirada</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar esta reserva como expirada? O membro não compareceu
              no prazo de 48h para levantar o livro.
              <br />
              <br />
              Esta ação liberará o livro para o próximo na fila (se houver).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation && !rejectMutation.isPending) {
                  rejectMutation.mutate(selectedReservation);
                }
              }}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Marcar como Expirada"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disponibilizar Livro</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja processar esta reserva e notificar o membro{" "}
              <strong>{selectedReservation?.member_id}</strong> que o livro{" "}
              <strong>&quot;{selectedReservation?.book_title}&quot;</strong>{" "}
              está disponível para levantamento?
              <br />
              <br />O membro terá <strong>48 horas</strong> para comparecer e
              levantar o livro. Uma cópia será automaticamente reservada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processReservationMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation && !processReservationMutation.isPending) {
                  processReservationMutation.mutate(selectedReservation);
                }
              }}
              disabled={processReservationMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processReservationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Notificar e Disponibilizar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
