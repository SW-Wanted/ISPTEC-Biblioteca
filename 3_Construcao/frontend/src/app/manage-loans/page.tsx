"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Loan, type Reservation } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, differenceInDays, differenceInHours, isPast } from "date-fns";
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
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  // Lazy initialization para evitar erro de hidratação
  const [activeTab, setActiveTab] = useState<"loans" | "process">(() => {
    // Durante SSR, sempre retorna "loans"
    // No cliente, lê o hash da URL
    if (typeof window === "undefined") return "loans";
    const hash = window.location.hash.slice(1);
    return hash === "loans" || hash === "process" ? hash : "loans";
  });
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const queryClient = useQueryClient();

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
  });

  const { data: availableReservations = [], isLoading: isLoadingReservations } =
    useQuery({
      queryKey: ["available-reservations"],
      queryFn: () => api.entities.Reservation.filter({ status: "available" }),
      enabled: !!user,
      refetchInterval: 30000,
      initialData: [],
    });

  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "overdue",
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

  const approveMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      const loan = await api.entities.Loan.create({
        member_id: reservation.member_id,
        book_id: reservation.book_id,
      });

      await api.entities.Reservation.update(reservation.id, {
        status: "collected",
      });

      return { loan, reservation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["manage-loans"] });
      setShowConfirmDialog(false);
      setSelectedReservation(null);
      toast.success(`✅ Empréstimo aprovado! Notificação enviada ao membro.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar empréstimo");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      await api.entities.Reservation.update(reservation.id, {
        status: "expired",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-reservations"] });
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
    if (isPast(new Date(loan.due_date))) {
      const days = differenceInDays(new Date(), new Date(loan.due_date));
      return {
        label: `${days} dia(s) atraso`,
        color: "bg-red-100 text-red-700",
      };
    }
    const daysLeft = differenceInDays(new Date(loan.due_date), new Date());
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

  // Components
  const LoanRow = ({ loan }: { loan: Loan }) => {
    const status = getLoanStatus(loan);
    return (
      <TableRow className="group">
        <TableCell>
          <div>
            <p className="font-medium text-slate-800">{loan.book_title}</p>
            <p className="text-xs text-slate-500">ID: {loan.copy_id}</p>
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowReturnDialog(true);
                  }}
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Registrar Devolução
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
              <div className="w-20 h-28 bg-linear-to-br from-indigo-100 to-indigo-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={createPageUrl(
                        `BookDetails?id=${reservation.book_id}`,
                      )}
                    >
                      <h3 className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2">
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
                  <Button
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setShowConfirmDialog(true);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
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
                        Confirmar Empréstimo
                      </>
                    )}
                  </Button>

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
                            rejectMutation.isPending
                          }
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

  // Render
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BookMarked className="w-7 h-7 text-indigo-600" />
              Gestão de Empréstimos
            </h1>
            <p className="text-slate-500 mt-1">
              {activeLoans.length} empréstimo(s) ativo(s) •{" "}
              {availableReservations.length} reserva(s) aguardando
            </p>
          </div>
          <Button variant="outline">
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
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">
              <BookMarked className="w-4 h-4 mr-2" />
              Empréstimos ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="process">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Processar Reservas ({availableReservations.length})
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
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-indigo-600" />
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
            <Tabs defaultValue="active">
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
                        {availableReservations.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-indigo-600" />
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
            ) : availableReservations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhuma reserva pendente
                  </h3>
                  <p className="text-slate-500">
                    Não há reservas aguardando aprovação no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                ))}
              </div>
            )}
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation) {
                  approveMutation.mutate(selectedReservation);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation) {
                  rejectMutation.mutate(selectedReservation);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Marcar como Expirada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
