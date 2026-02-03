"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Reservation } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, differenceInHours } from "date-fns";
import {
  CheckCircle,
  Clock,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProcessLoans() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);

        // Verificar permissão de funcionário
        if (userData.type !== "LIBRARIAN" && userData.type !== "STAFF") {
          toast.error(
            "Acesso negado: Apenas funcionários podem processar empréstimos",
          );
          window.location.href = createPageUrl("Home");
          return;
        }
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  // Buscar reservas disponíveis para levantamento
  const { data: availableReservations = [], isLoading } = useQuery({
    queryKey: ["available-reservations"],
    queryFn: () => api.entities.Reservation.filter({ status: "available" }),
    enabled: !!user,
    refetchInterval: 30000, // Atualizar a cada 30s
    initialData: [],
  });

  // Mutation para aprovar empréstimo
  const approveMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      // A API já faz todas as validações e criação do empréstimo
      // Apenas chamamos a API com member_id e book_id
      const loan = await api.entities.Loan.create({
        member_id: reservation.member_id,
        book_id: reservation.book_id,
      });

      // Atualizar status da reserva para COLLECTED
      await api.entities.Reservation.update(reservation.id, {
        status: "collected",
      });

      return { loan, reservation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-reservations"] });
      setShowConfirmDialog(false);
      setSelectedReservation(null);
      toast.success(`✅ Empréstimo aprovado! Notificação enviada ao membro.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar empréstimo");
    },
  });

  // Mutation para rejeitar (expirar a reserva)
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

  const getTimeRemaining = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const hours = differenceInHours(new Date(expiryDate), new Date());
    if (hours < 0) return { text: "Expirado", urgent: true };
    if (hours < 6) return { text: `${hours}h restantes`, urgent: true };
    if (hours < 24) return { text: `${hours}h restantes`, urgent: false };
    return { text: `${Math.ceil(hours / 24)} dias restantes`, urgent: false };
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
              {/* Thumbnail do livro */}
              <div className="w-20 h-28 bg-linear-to-br from-indigo-100 to-indigo-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-indigo-400" />
              </div>

              {/* Informações */}
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

                {/* Informações adicionais */}
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

                {/* Ações */}
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Processar Empréstimos
        </h1>
        <p className="text-slate-600">
          Aprove reservas confirmando a presença física do membro na biblioteca
        </p>
      </div>

      {/* Aviso informativo */}
      <Card className="mb-6 border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-900">
              <p className="font-semibold mb-1">Fluxo de Empréstimo:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Verificar identidade física do membro</li>
                <li>Confirmar que o livro está disponível fisicamente</li>
                <li>Clicar em &quot;Confirmar Empréstimo&quot;</li>
                <li>Sistema criará o empréstimo e notificará o membro</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Aguardando Aprovação</p>
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
                <p className="text-sm text-slate-500">Urgentes (&lt; 6h)</p>
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
                <p className="text-2xl font-bold text-emerald-600">-</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de reservas */}
      {isLoading ? (
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
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}

      {/* Dialog de confirmação */}
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

      {/* Dialog de rejeição */}
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
