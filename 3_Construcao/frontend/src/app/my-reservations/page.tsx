"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Reservation } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInHours } from "date-fns";
import {
  Clock,
  BookOpen,
  AlertCircle,
  CheckCircle,
  X,
  ChevronRight,
  Calendar,
  Users,
  Loader2,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MyReservations() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
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

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["my-reservations", user?.email],
    queryFn: () => api.entities.Reservation.filter({ member_id: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const activeReservations = reservations.filter(
    (r) => r.status === "active" || r.status === "available",
  );
  const historyReservations = reservations.filter(
    (r) =>
      r.status === "collected" ||
      r.status === "expired" ||
      r.status === "cancelled",
  );

  const cancelMutation = useMutation<void, Error, Reservation>({
    mutationFn: async (reservation) => {
      await api.entities.Reservation.update(reservation.id, {
        status: "cancelled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-reservations", user?.email],
      });
      setShowCancelDialog(false);
      setSelectedReservation(null);
      toast.success("Reserva cancelada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao cancelar reserva");
    },
  });

  // 🔒 SGBU-006: Apenas staff marca levantamento. Removido do self-service para evitar 403.

  const getReservationStatus = (reservation: Reservation) => {
    switch (reservation.status) {
      case "available":
        return {
          label: "Disponível para retirada",
          color: "bg-emerald-100 text-emerald-700",
          icon: CheckCircle,
          urgent: true,
        };
      case "active":
        return {
          label: `Posição ${reservation.queue_position} na fila`,
          color: "bg-amber-100 text-amber-700",
          icon: Clock,
        };
      case "collected":
        return {
          label: "Retirado",
          color: "bg-slate-100 text-slate-700",
          icon: CheckCircle,
        };
      case "expired":
        return {
          label: "Expirado",
          color: "bg-red-100 text-red-700",
          icon: AlertCircle,
        };
      case "cancelled":
        return {
          label: "Cancelado",
          color: "bg-slate-100 text-slate-700",
          icon: X,
        };
      default:
        return {
          label: reservation.status,
          color: "bg-slate-100 text-slate-700",
          icon: Clock,
        };
    }
  };

  const getTimeRemaining = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const hours = differenceInHours(new Date(expiryDate), new Date());
    if (hours < 0) return "Expirado";
    if (hours < 24) return `${hours}h restantes`;
    return `${Math.ceil(hours / 24)} dias restantes`;
  };

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
    const status = getReservationStatus(reservation);
    const StatusIcon = status.icon;
    const timeRemaining = getTimeRemaining(reservation.expiry_date);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card
          className={cn(
            "border-0 shadow-sm hover:shadow-md transition-all duration-300",
            status.urgent && "ring-2 ring-emerald-200",
          )}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-20 h-28 bg-linear-to-br from-slate-100 to-slate-200 rounded-lg shrink-0 overflow-hidden">
                {reservation.cover_url ? (
                  <Image
                    src={reservation.cover_url}
                    alt={reservation.book_title || "Capa do livro"}
                    width={80}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-full h-full p-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={createPageUrl(
                        `BookDetails?id=${reservation.book_id}`,
                      )}
                    >
                      <h3 className="font-semibold text-slate-800 hover:text-amber-600 transition-colors line-clamp-2">
                        {reservation.book_title || "Título não disponível"}
                      </h3>
                    </Link>
                    <p className="text-sm text-slate-500 mt-1">
                      Reservado em{" "}
                      {reservation.reservation_date
                        ? format(
                            new Date(reservation.reservation_date),
                            "dd/MM/yyyy",
                          )
                        : "-"}
                    </p>
                  </div>
                  <Badge className={cn("shrink-0", status.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                {reservation.status === "available" && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-emerald-800">
                        Retire até:{" "}
                        {reservation.expiry_date
                          ? format(
                              new Date(reservation.expiry_date),
                              "dd/MM 'às' HH:mm",
                            )
                          : "-"}
                      </span>
                      <span className="text-sm text-emerald-700">
                        {timeRemaining}
                      </span>
                    </div>
                    <Progress
                      value={
                        reservation.expiry_date
                          ? Math.max(
                              0,
                              (differenceInHours(
                                new Date(reservation.expiry_date),
                                new Date(),
                              ) /
                                48) *
                                100,
                            )
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                )}
                {reservation.status === "active" && (
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-400" />
                      Posição {reservation.queue_position} na fila
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell className="w-4 h-4 text-slate-400" />
                      Notificaremos quando disponível
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  {/* Levantamento é feito pelo staff na biblioteca; botão oculto para estudantes */}
                  {(reservation.status === "active" ||
                    reservation.status === "available") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReservation(reservation);
                        setShowCancelDialog(true);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                  <Link
                    to={createPageUrl(`BookDetails?id=${reservation.book_id}`)}
                  >
                    <Button variant="outline" size="sm">
                      Ver livro
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Clock className="w-7 h-7 text-amber-600" />
            Minhas Reservas
          </h1>
          <p className="text-slate-500 mt-1">
            Acompanhe suas reservas e fila de espera
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">
                {activeReservations.filter((r) => r.status === "active").length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Na Fila</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {
                  activeReservations.filter((r) => r.status === "available")
                    .length
                }
              </p>
              <p className="text-xs text-slate-500 mt-1">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-600">
                {
                  historyReservations.filter((r) => r.status === "collected")
                    .length
                }
              </p>
              <p className="text-xs text-slate-500 mt-1">Retirados</p>
            </CardContent>
          </Card>
        </div>

        {activeReservations.filter((r) => r.status === "available").length >
          0 && (
          <Card className="border-2 border-emerald-200 bg-emerald-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800">
                    Você tem{" "}
                    {
                      activeReservations.filter((r) => r.status === "available")
                        .length
                    }{" "}
                    livro(s) disponível(is) para retirada!
                  </p>
                  <p className="text-sm text-emerald-700">
                    Retire na biblioteca dentro do prazo para não perder a
                    reserva.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ativas ({activeReservations.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico ({historyReservations.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {isLoading ? (
              <div className="space-y-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex gap-4">
                        <Skeleton className="w-20 h-28 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : activeReservations.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhuma reserva ativa
                  </h3>
                  <p className="text-slate-500 mb-4">
                    Reserve livros que não estão disponíveis para entrar na fila
                    de espera.
                  </p>
                  <Link to={createPageUrl("SearchBooks")}>
                    <Button>Pesquisar Livros</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                  {activeReservations
                    .sort((a, b) => {
                      if (a.status === "available" && b.status !== "available")
                        return -1;
                      if (b.status === "available" && a.status !== "available")
                        return 1;
                      return (
                        (a.queue_position ?? Number.MAX_SAFE_INTEGER) -
                        (b.queue_position ?? Number.MAX_SAFE_INTEGER)
                      );
                    })
                    .map((reservation) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                      />
                    ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
          <TabsContent value="history">
            {historyReservations.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhum histórico
                  </h3>
                  <p className="text-slate-500">
                    Seu histórico de reservas aparecerá aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {historyReservations
                  .sort((a, b) => {
                    const bTime = b.reservation_date
                      ? new Date(b.reservation_date).getTime()
                      : 0;
                    const aTime = a.reservation_date
                      ? new Date(a.reservation_date).getTime()
                      : 0;
                    return bTime - aTime;
                  })
                  .map((reservation) => (
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

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a reserva de &quot;
              {selectedReservation?.book_title}&quot;?
              {selectedReservation?.status === "available" && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Atenção: O livro já está disponível para retirada!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReservation)
                  cancelMutation.mutate(selectedReservation);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending || !selectedReservation}
            >
              {cancelMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
