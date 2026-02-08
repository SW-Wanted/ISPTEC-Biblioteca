"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, addHours } from "date-fns";
import {
  Computer,
  KeyRound,
  FileText,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Loader2,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { TrainingRequestCard } from "@/components/training/TrainingRequestCard";
import { ActiveReservationsCard } from "@/components/reservations/ActiveReservationsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const TRAINING_MIN_DATE = format(addHours(new Date(), 24 * 7), "yyyy-MM-dd");

type LockerRow = {
  id: string;
  number?: string | number | null;
  status?: string | null;
  current_user_id?: string | null;
} & Record<string, unknown>;

type LockerReservationRow = {
  id: string;
  locker_id?: string | null;
  locker_number?: string | number | null;
  locker_location?: string | null;
  status?: string | null;
  requested_at?: string | null;
} & Record<string, unknown>;

type LockerRentalRow = {
  id: string;
  locker_id?: string | null;
  locker_number?: string | number | null;
  locker_location?: string | null;
  expected_end?: string | null;
} & Record<string, unknown>;

type ComputerRow = {
  id: string;
  number?: string | number | null;
  status?: string | null;
  location?: string | null;
  current_user_id?: string | null;
} & Record<string, unknown>;

type ComputerReservationRow = {
  id: string;
  computer_id?: string | null;
  computer_number?: string | number | null;
  computer_location?: string | null;
  status?: string | null;
  requested_at?: string | null;
} & Record<string, unknown>;

type ComputerSessionRow = {
  id: string;
  computer_id?: string | null;
  computer_number?: string | number | null;
  computer_location?: string | null;
  expected_end?: string | null;
} & Record<string, unknown>;

type SpecialRequestRow = {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_date?: string | null;
  scheduled_date?: string | null;
  response?: string | null;
} & Record<string, unknown>;

export default function Services() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    type: "",
    title: "",
    description: "",
    scheduled_date: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        window.location.href = createPageUrl("Home");
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: lockers = [] } = useQuery<LockerRow[]>({
    queryKey: ["lockers"],
    queryFn: () => api.entities.Locker.list(),
    initialData: [] as LockerRow[],
    refetchInterval: 15000,
  });
  const { data: computers = [] } = useQuery<ComputerRow[]>({
    queryKey: ["computers"],
    queryFn: () => api.entities.Computer.list(),
    initialData: [] as ComputerRow[],
    refetchInterval: 15000,
  });
  const { data: myRequests = [] } = useQuery<SpecialRequestRow[]>({
    queryKey: ["my-requests", user?.email],
    queryFn: () => api.entities.SpecialRequest.filter({ user_id: user?.email }),
    enabled: !!user?.email,
    initialData: [] as SpecialRequestRow[],
    refetchInterval: 15000,
  });

  const { data: lockerReservations = [] } = useQuery<LockerReservationRow[]>({
    queryKey: ["locker-reservations", user?.email],
    queryFn: () => api.entities.Locker.filter({ status: "pending" }),
    enabled: !!user?.email,
    initialData: [] as LockerReservationRow[],
    refetchInterval: 10000,
  });

  const { data: computerReservations = [] } = useQuery<
    ComputerReservationRow[]
  >({
    queryKey: ["computer-reservations", user?.email],
    queryFn: () =>
      api.entities.Computer.filter({ status: "pending" }),
    enabled: !!user?.email,
    initialData: [] as ComputerReservationRow[],
    refetchInterval: 10000,
  });

  const { data: lockerRentals = [] } = useQuery<LockerRentalRow[]>({
    queryKey: ["locker-rentals", user?.email],
    queryFn: () => api.entities.Locker.filter({ endTime: null }),
    enabled: !!user?.email,
    initialData: [] as LockerRentalRow[],
    refetchInterval: 10000,
  });

  const { data: computerSessions = [] } = useQuery<ComputerSessionRow[]>({
    queryKey: ["computer-sessions", user?.email],
    queryFn: () => api.entities.Computer.filter({ endTime: null }),
    enabled: !!user?.email,
    initialData: [] as ComputerSessionRow[],
    refetchInterval: 10000,
  });

  const availableLockers = lockers.filter((l) => l.status === "available");
  const availableComputers = computers.filter((c) => c.status === "available");

  const activeLockerReservation = lockerReservations[0];
  const activeComputerReservation = computerReservations[0];
  const activeLockerRental = lockerRentals[0];
  const activeComputerSession = computerSessions[0];

  const reserveLockerMutation = useMutation({
    mutationFn: async (locker: LockerRow) => {
      if (!user) return;
      const res = await fetch(`/api/lockers/${locker.id}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao reservar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lockers"] });
      queryClient.invalidateQueries({
        queryKey: ["locker-reservations", user?.email],
      });
      setActiveService(null);
      toast.success("Cacifo reservado com sucesso!");
    },
    onError: (error: any) => {
      const message = error?.message || "";
      if (message.includes("USER_HAS_ACTIVE_LOCKER")) {
        toast.error(
          "Você já possui um cacifo ativo. Devolva-o antes de reservar outro.",
        );
      } else if (message.includes("USER_HAS_PENDING_LOCKER")) {
        toast.error("Você já possui uma reserva pendente de cacifo.");
      } else if (message.includes("NOT_AVAILABLE")) {
        toast.error("Este cacifo não está disponível.");
      } else if (message.includes("LOCKER_ALREADY_RESERVED")) {
        toast.error("Este cacifo já está reservado.");
      } else {
        toast.error("Erro ao reservar cacifo");
      }
    },
  });

  const reserveComputerMutation = useMutation({
    mutationFn: async (computer: ComputerRow) => {
      if (!user) return;
      const res = await fetch(`/api/computers/${computer.id}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao reservar computador");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["computers"] });
      queryClient.invalidateQueries({
        queryKey: ["computer-reservations", user?.email],
      });
      setActiveService(null);
      toast.success("Computador reservado! Faça check-in no balcão.");
    },
    onError: (error: any) => {
      const message = error?.message || "";
      if (message.includes("USER_HAS_ACTIVE_SESSION")) {
        toast.error(
          "Você já possui uma sessão de computador ativa. Encerre-a antes de reservar outro.",
        );
      } else if (message.includes("USER_HAS_PENDING_SESSION")) {
        toast.error("Você já possui uma reserva pendente de computador.");
      } else if (message.includes("NOT_AVAILABLE")) {
        toast.error("Este computador não está disponível.");
      } else if (message.includes("COMPUTER_ALREADY_RESERVED")) {
        toast.error("Este computador já está reservado.");
      } else {
        toast.error("Erro ao reservar computador");
      }
    },
  });

  const cancelLockerReservationMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/lockers/${lockerId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao cancelar reserva");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lockers"] });
      queryClient.invalidateQueries({
        queryKey: ["locker-reservations", user?.email],
      });
      toast.success("Reserva de cacifo cancelada");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao cancelar reserva");
    },
  });

  const cancelComputerReservationMutation = useMutation({
    mutationFn: async (computerId: string) => {
      const res = await fetch(`/api/computers/${computerId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao cancelar reserva");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["computers"] });
      queryClient.invalidateQueries({
        queryKey: ["computer-reservations", user?.email],
      });
      toast.success("Reserva de computador cancelada");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao cancelar reserva");
    },
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await api.entities.SpecialRequest.create({
        type: requestForm.type,
        title: requestForm.title,
        description: requestForm.description,
        scheduled_date: requestForm.scheduled_date || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests", user?.email] });
      setActiveService(null);
      setRequestForm({
        type: "",
        title: "",
        description: "",
        scheduled_date: "",
      });
      toast.success("Solicitação enviada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar solicitação");
    },
  });

  const services = [
    {
      id: "locker",
      icon: KeyRound,
      title: "Guarda-Volumes",
      description: "Reserve um cacifo por 3 horas",
      available: availableLockers.length,
      total: lockers.length,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "computer",
      icon: Computer,
      title: "Computadores",
      description: "Reserve uma estação por 2 horas",
      available: availableComputers.length,
      total: computers.length,
      color: "from-orange-500 to-pink-500",
    },
    {
      id: "bibliography",
      icon: FileText,
      title: "Levantamento Bibliográfico",
      description: "Solicite pesquisa de bibliografia",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "cataloging",
      icon: BookOpen,
      title: "Catalogação na Fonte",
      description: "Solicite catalogação de sua obra",
      color: "from-orange-500 to-amber-500",
    },
    {
      id: "training",
      icon: GraduationCap,
      title: "Formações",
      description: "Agende formação em bases de dados",
      color: "from-amber-500 to-violet-500",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700">Em andamento</Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">Concluído</Badge>
        );
      case "cancelled":
        return <Badge className="bg-slate-100 text-slate-700">Cancelado</Badge>;
      default:
        return null;
    }
  };

   // Renderização de loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Computer className="w-7 h-7 text-amber-600" />
            Serviços da Biblioteca
          </h1>
          <p className="text-slate-500 mt-1">
            Reserve recursos e solicite serviços especiais
          </p>
        </div>

        {/* Componentes de Formação e Reservas Ativas */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <TrainingRequestCard
            user={{
              id: user.id ?? "",
              activationStatus: user.activationStatus || "ACTIVE",
            }}
          />
          <ActiveReservationsCard />
        </div>

        <Tabs defaultValue="services">
          <TabsList className="mb-6">
            <TabsTrigger value="services">Serviços Disponíveis</TabsTrigger>
            <TabsTrigger value="requests">
              Minhas Solicitações ({myRequests.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="services">
            {/* Alerta para usuários não ativos */}
            {user?.activationStatus !== "ACTIVE" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">
                    Conta em ativação
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Para aceder aos serviços da biblioteca, complete o processo
                    de ativação da sua conta em{" "}
                    <a
                      href="/onboarding"
                      className="underline hover:text-amber-900"
                    >
                      Ativação de Conta
                    </a>
                    . Se tiver dúvidas, consulte a página de{" "}
                    <a
                      href="/help"
                      className="underline hover:text-amber-900"
                    >
                      Ajuda
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service, index) => {
                const isLocker = service.id === "locker";
                const isComputer = service.id === "computer";
                const lockerBusy =
                  !!activeLockerReservation || !!activeLockerRental;
                const computerBusy =
                  !!activeComputerReservation || !!activeComputerSession;

                const statusLabel = isLocker
                  ? activeLockerRental
                    ? `Ocupado: Cacifo ${activeLockerRental.locker_number ?? ""}`
                    : activeLockerReservation
                      ? `Reserva pendente: Cacifo ${activeLockerReservation.locker_number ?? ""}`
                      : null
                  : isComputer
                    ? activeComputerSession
                      ? `Ocupado: PC ${activeComputerSession.computer_number ?? ""}`
                      : activeComputerReservation
                        ? `Reserva pendente: PC ${activeComputerReservation.computer_number ?? ""}`
                        : null
                    : null;

                const canReserve = isLocker
                  ? !lockerBusy
                  : isComputer
                    ? !computerBusy
                    : true;

                // Desabilitar serviços para usuários não ativos
                const isUserActive = user?.activationStatus === "ACTIVE";

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card
                      className={cn(
                        "border-0 shadow-sm transition-all duration-300 overflow-hidden",
                        isUserActive
                          ? "hover:shadow-md cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => isUserActive && setActiveService(service.id)}
                    >
                      <CardContent className="p-6">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl bg-linear-to-br flex items-center justify-center mb-4",
                            service.color,
                          )}
                        >
                          <service.icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1">
                          {service.title}
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">
                          {service.description}
                        </p>
                        {service.available !== undefined && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                service.available > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700",
                              )}
                            >
                              {service.available > 0
                                ? `${service.available} disponível(is)`
                                : "Todos ocupados"}
                            </Badge>
                          </div>
                        )}
                        {statusLabel && (
                          <p className="text-xs text-slate-500 mt-2">
                            {statusLabel}
                          </p>
                        )}
                        <Button
                          variant="link"
                          className="p-0 h-auto mt-3 text-amber-600"
                          disabled={!canReserve && (isLocker || isComputer)}
                        >
                          {service.id === "locker" || service.id === "computer"
                            ? canReserve
                              ? "Reservar"
                              : "Ver status"
                            : "Solicitar"}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="requests">
            {myRequests.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Nenhuma solicitação
                  </h3>
                  <p className="text-slate-500">
                    Suas solicitações de serviços especiais aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <Card key={request.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(request.status ?? "")}
                            <Badge variant="outline" className="text-xs">
                              {request.type === "bibliography" &&
                                "Levantamento Bibliográfico"}
                              {request.type === "cataloging" &&
                                "Catalogação na Fonte"}
                              {request.type === "training" && "Formação"}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-slate-800">
                            {request.title}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {request.description}
                          </p>
                          {request.created_date && (
                            <p className="text-xs text-slate-400 mt-2">
                              Solicitado em{" "}
                              {format(
                                new Date(request.created_date),
                                "dd/MM/yyyy",
                              )}
                            </p>
                          )}
                        </div>
                        {request.response && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Resposta:</p>
                            <p className="text-sm text-slate-700">
                              {request.response}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={activeService === "locker"}
        onOpenChange={() => setActiveService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeLockerRental
                ? "Cacifo em Uso"
                : activeLockerReservation
                  ? "Reserva Pendente"
                  : "Reservar Cacifo"}
            </DialogTitle>
            <DialogDescription>
              {activeLockerRental
                ? "Você já possui um cacifo em uso."
                : activeLockerReservation
                  ? "A sua reserva está aguardando aprovação do bibliotecário."
                  : "Escolha um cacifo disponível. Duração: 3 horas."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {activeLockerRental ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      Cacifo {activeLockerRental.locker_number ?? ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeLockerRental.locker_location ?? "Biblioteca"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-blue-100 text-blue-700">
                    Em uso
                  </Badge>
                </div>
                {activeLockerRental.expected_end && (
                  <p className="text-sm text-slate-600">
                    Término previsto:{" "}
                    {new Date(
                      activeLockerRental.expected_end,
                    ).toLocaleTimeString("pt-AO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Gerencie o seu cacifo no card &quot;Minhas Reservas
                  Ativas&quot;.
                </p>
              </div>
            ) : activeLockerReservation ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      Cacifo {activeLockerReservation.locker_number ?? ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeLockerReservation.locker_location ?? "Biblioteca"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-amber-100 text-amber-700">
                    Pendente
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Aguardando aprovação do bibliotecário.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={cancelLockerReservationMutation.isPending}
                  onClick={() => {
                    const lockerId = activeLockerReservation.locker_id;
                    if (lockerId) {
                      cancelLockerReservationMutation.mutate(lockerId);
                      setActiveService(null);
                    }
                  }}
                >
                  {cancelLockerReservationMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Cancelar Reserva
                </Button>
              </div>
            ) : availableLockers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                <p className="text-slate-600">
                  Todos os cacifos estão ocupados no momento.
                </p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <div className="grid grid-cols-4 gap-2">
                  {availableLockers.map((locker) => (
                    <Button
                      key={locker.id}
                      variant="outline"
                      className="h-16 flex flex-col"
                      onClick={() => reserveLockerMutation.mutate(locker)}
                      disabled={reserveLockerMutation.isPending}
                    >
                      <KeyRound className="w-5 h-5 mb-1" />
                      <span className="text-xs">{locker.number}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeService === "computer"}
        onOpenChange={() => setActiveService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeComputerSession
                ? "Computador em Uso"
                : activeComputerReservation
                  ? "Reserva Pendente"
                  : "Reservar Computador"}
            </DialogTitle>
            <DialogDescription>
              {activeComputerSession
                ? "Você já possui uma sessão de computador activa."
                : activeComputerReservation
                  ? "A sua reserva está aguardando aprovação do bibliotecário."
                  : "Escolha uma estação disponível. Sessão de 2 horas."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {activeComputerSession ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Computer className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      PC {activeComputerSession.computer_number ?? ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeComputerSession.computer_location ??
                        "Sala de Informática"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-blue-100 text-blue-700">
                    Em uso
                  </Badge>
                </div>
                {activeComputerSession.expected_end && (
                  <p className="text-sm text-slate-600">
                    Término previsto:{" "}
                    {new Date(
                      activeComputerSession.expected_end,
                    ).toLocaleTimeString("pt-AO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Gerencie a sua sessão no card &quot;Minhas Reservas
                  Ativas&quot;.
                </p>
              </div>
            ) : activeComputerReservation ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Computer className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      PC {activeComputerReservation.computer_number ?? ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeComputerReservation.computer_location ??
                        "Sala de Informática"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-amber-100 text-amber-700">
                    Pendente
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Aguardando aprovação do bibliotecário.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={cancelComputerReservationMutation.isPending}
                  onClick={() => {
                    const computerId = activeComputerReservation.computer_id;
                    if (computerId) {
                      cancelComputerReservationMutation.mutate(computerId);
                      setActiveService(null);
                    }
                  }}
                >
                  {cancelComputerReservationMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Cancelar Reserva
                </Button>
              </div>
            ) : availableComputers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                <p className="text-slate-600">
                  Todos os computadores estão ocupados.
                </p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <div className="space-y-3">
                  {[...new Set(availableComputers.map((c) => c.location))].map(
                    (location) => (
                      <div key={location}>
                        <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {location}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {availableComputers
                            .filter((c) => c.location === location)
                            .map((computer) => (
                              <Button
                                key={computer.id}
                                variant="outline"
                                className="h-14 flex flex-col"
                                onClick={() =>
                                  reserveComputerMutation.mutate(computer)
                                }
                                disabled={reserveComputerMutation.isPending}
                              >
                                <Computer className="w-4 h-4 mb-1" />
                                <span className="text-xs">
                                  PC {computer.number}
                                </span>
                              </Button>
                            ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={
          activeService === "bibliography" ||
          activeService === "cataloging" ||
          activeService === "training"
        }
        onOpenChange={() => setActiveService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeService === "bibliography" && "Levantamento Bibliográfico"}
              {activeService === "cataloging" && "Catalogação na Fonte"}
              {activeService === "training" && "Agendar Formação"}
            </DialogTitle>
            <DialogDescription>
              {activeService === "bibliography" &&
                "Solicite uma pesquisa bibliográfica sobre seu tema. Prazo: 5 dias úteis."}
              {activeService === "cataloging" &&
                "Solicite a catalogação da sua obra. Prazo: 5 dias úteis."}
              {activeService === "training" &&
                "Agende uma formação sobre acesso a bases de dados. Agende com 1 semana de antecedência."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Título / Assunto</Label>
              <Input
                value={requestForm.title}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    title: e.target.value,
                    type: activeService ?? "",
                  })
                }
                placeholder={
                  activeService === "bibliography"
                    ? "Ex: Inteligência Artificial na Educação"
                    : activeService === "cataloging"
                      ? "Nome da sua obra"
                      : "Tema da formação desejada"
                }
              />
            </div>
            <div>
              <Label>Descrição / Detalhes</Label>
              <Textarea
                value={requestForm.description}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    description: e.target.value,
                  })
                }
                placeholder={
                  activeService === "bibliography"
                    ? "Descreva os tópicos, palavras-chave e período de interesse..."
                    : activeService === "cataloging"
                      ? "Informações adicionais sobre a obra..."
                      : "Objetivos da formação, nível de conhecimento atual..."
                }
                rows={4}
              />
            </div>
            {activeService === "training" && (
              <div>
                <Label>Data pretendida</Label>
                <Input
                  type="date"
                  value={requestForm.scheduled_date}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      scheduled_date: e.target.value,
                    })
                  }
                  min={TRAINING_MIN_DATE}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Agende com pelo menos 1 semana de antecedência
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveService(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => submitRequestMutation.mutate()}
              disabled={
                submitRequestMutation.isPending ||
                !requestForm.title ||
                !requestForm.description
              }
            >
              {submitRequestMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
