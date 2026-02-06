"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Users,
  Plus,
  Check,
  X,
  Clock,
  MapPin,
  GraduationCap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";

interface TrainingSession {
  id: string;
  title: string;
  description?: string;
  location: string;
  maxParticipants: number;
  scheduledDate: string;
  actualDate?: string;
  duration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    id: string;
    attended: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

function formatDatePt(value: string | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimePt(value: string | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimePt(value: string | undefined | null): string {
  if (!value) return "—";
  return `${formatDatePt(value)} ${formatTimePt(value)}`;
}

function statusBadge(status?: string) {
  switch (status) {
    case "SCHEDULED":
      return <Badge className="bg-amber-100 text-amber-700">Agendada</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-blue-100 text-blue-700">Em Andamento</Badge>;
    case "COMPLETED":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Concluida</Badge>
      );
    case "CANCELLED":
      return <Badge className="bg-slate-100 text-slate-700">Cancelada</Badge>;
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
}

function AdminTrainingPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<TrainingSession | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    location: "",
    maxParticipants: "30",
    scheduledDate: "",
    duration: "120",
  });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["training-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/training/sessions?upcoming=true");
      if (!res.ok) throw new Error("Erro ao carregar sessoes");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/training/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar sessao");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        description: "",
        location: "",
        maxParticipants: "30",
        scheduledDate: "",
        duration: "120",
      });
      toast.success("Sessao de formacao criada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar sessao de formacao");
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({
      sessionId,
      participantIds,
    }: {
      sessionId: string;
      participantIds: string[];
    }) => {
      const res = await fetch(
        `/api/training/sessions/${sessionId}/attendance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds,
            status: "COMPLETED",
            actualDate: new Date().toISOString(),
          }),
        },
      );
      if (!res.ok) throw new Error("Erro ao marcar presenca");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setShowDetailsDialog(false);
      setSelectedSession(null);
      setSelectedParticipants([]);
      toast.success("Presencas marcadas! Contas activadas automaticamente.");
    },
    onError: () => {
      toast.error("Erro ao marcar presencas");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(
        `/api/training/sessions/${sessionId}/attendance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );
      if (!res.ok) throw new Error("Erro ao cancelar sessao");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast.success("Sessao cancelada");
    },
    onError: () => {
      toast.error("Erro ao cancelar sessao");
    },
  });

  const sessions: TrainingSession[] = sessionsData?.sessions || [];

  const summary = useMemo(() => {
    const total = sessions.length;
    const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
    const inProgress = sessions.filter(
      (s) => s.status === "IN_PROGRESS",
    ).length;
    const completed = sessions.filter((s) => s.status === "COMPLETED").length;
    const cancelled = sessions.filter((s) => s.status === "CANCELLED").length;
    const totalParticipants = sessions.reduce(
      (acc, s) => acc + s.participants.length,
      0,
    );
    return {
      total,
      scheduled,
      inProgress,
      completed,
      cancelled,
      totalParticipants,
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus =
        filterStatus === "all" ? true : s.status === filterStatus;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus;
      const haystack =
        `${s.title} ${s.description ?? ""} ${s.location} ${s.trainer?.name ?? ""}`.toLowerCase();
      return matchesStatus && haystack.includes(query);
    });
  }, [sessions, filterStatus, searchQuery]);

  const handleCreate = () => {
    if (
      !createForm.title ||
      !createForm.location ||
      !createForm.scheduledDate
    ) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }
    createMutation.mutate({
      title: createForm.title,
      description: createForm.description || undefined,
      location: createForm.location,
      maxParticipants: parseInt(createForm.maxParticipants),
      scheduledDate: new Date(createForm.scheduledDate).toISOString(),
      duration: parseInt(createForm.duration),
    });
  };

  const handleMarkAttendance = () => {
    if (!selectedSession || selectedParticipants.length === 0) {
      toast.error("Seleccione pelo menos um participante");
      return;
    }
    attendanceMutation.mutate({
      sessionId: selectedSession.id,
      participantIds: selectedParticipants,
    });
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId],
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
              Gestao de Formacoes
            </h1>
            <p className="text-slate-500 mt-1">
              {summary.scheduled} agendada(s) • {summary.inProgress} em
              andamento • {summary.completed} concluida(s) •{" "}
              {summary.totalParticipants} participante(s) total
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessao
          </Button>
        </div>

        {/* Summary badges */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-wrap gap-2 text-sm py-4">
            <Badge variant="outline">Total: {summary.total}</Badge>
            <Badge className="bg-amber-100 text-amber-700">
              Agendadas: {summary.scheduled}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              Em Andamento: {summary.inProgress}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700">
              Concluidas: {summary.completed}
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              Canceladas: {summary.cancelled}
            </Badge>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="w-full md:w-72">
                <Label>Pesquisar</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titulo, local ou formador"
                />
              </div>
              <div className="w-full md:w-52">
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SCHEDULED">Agendada</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="COMPLETED">Concluida</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-40 mb-1" />
                          <Skeleton className="h-3 w-56" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">
                        {sessions.length === 0
                          ? "Nenhuma sessao de formacao encontrada"
                          : "Nenhum resultado para os filtros aplicados"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  filtered.map((session) => {
                    const canManage = session.status === "SCHEDULED";
                    const participantCount = session.participants.length;
                    const attendedCount = session.participants.filter(
                      (p) => p.attended,
                    ).length;

                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {session.title}
                          </div>
                          {session.description && (
                            <div className="text-xs text-slate-500 line-clamp-1">
                              {session.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDatePt(session.scheduledDate)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatTimePt(session.scheduledDate)} •{" "}
                            {session.duration}min
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {session.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {participantCount}/{session.maxParticipants}
                          </div>
                          {session.status === "COMPLETED" && (
                            <div className="text-xs text-emerald-600">
                              {attendedCount} presente(s)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(session.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSession(session);
                                setSelectedParticipants([]);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                            {canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={cancelMutation.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Cancelar esta sessao de formacao?",
                                    )
                                  ) {
                                    cancelMutation.mutate(session.id);
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Sessao de Formacao</DialogTitle>
            <DialogDescription>
              Agende uma nova sessao de formacao para membros da biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulo *</Label>
              <Input
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Formacao Inicial - Uso da Biblioteca"
              />
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Detalhes sobre o conteudo da formacao..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Local *</Label>
                <Input
                  value={createForm.location}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="Auditorio Principal"
                />
              </div>
              <div>
                <Label>Vagas Maximas *</Label>
                <Input
                  type="number"
                  value={createForm.maxParticipants}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      maxParticipants: e.target.value,
                    }))
                  }
                  min={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledDate}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      scheduledDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Duracao (minutos) *</Label>
                <Input
                  type="number"
                  value={createForm.duration}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, duration: e.target.value }))
                  }
                  min={30}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "A criar..." : "Criar Sessao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details / Attendance Dialog */}
      <Dialog
        open={showDetailsDialog}
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          if (!open) {
            setSelectedSession(null);
            setSelectedParticipants([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSession.title}</DialogTitle>
                <DialogDescription>
                  {selectedSession.description || "Sem descricao"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>
                      {formatDateTimePt(selectedSession.scheduledDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{selectedSession.duration} minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{selectedSession.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>
                      {selectedSession.participants.length}/
                      {selectedSession.maxParticipants} inscritos
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Estado:</span>
                  {statusBadge(selectedSession.status)}
                </div>

                {selectedSession.participants.length > 0 ? (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">
                      Participantes ({selectedSession.participants.length})
                    </p>
                    <div className="space-y-2 max-h-75 overflow-y-auto">
                      {selectedSession.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {participant.user.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {participant.user.email}
                            </p>
                          </div>
                          {selectedSession.status === "SCHEDULED" ? (
                            <Button
                              size="sm"
                              variant={
                                selectedParticipants.includes(participant.id)
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => toggleParticipant(participant.id)}
                            >
                              {selectedParticipants.includes(participant.id) ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Presente
                                </>
                              ) : (
                                "Marcar presenca"
                              )}
                            </Button>
                          ) : participant.attended ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <Check className="h-3 w-3 mr-1" />
                              Presente
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">
                              <X className="h-3 w-3 mr-1" />
                              Ausente
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4 text-center">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Nenhum participante inscrito
                    </p>
                  </div>
                )}
              </div>

              {selectedSession.status === "SCHEDULED" &&
                selectedSession.participants.length > 0 && (
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsDialog(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      disabled={
                        selectedParticipants.length === 0 ||
                        attendanceMutation.isPending
                      }
                      onClick={handleMarkAttendance}
                    >
                      {attendanceMutation.isPending
                        ? "A processar..."
                        : `Concluir Sessao (${selectedParticipants.length} presente(s))`}
                    </Button>
                  </DialogFooter>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProtectedAdminTrainingPage() {
  return (
    <AuthGuard requireLibrarian>
      <AdminTrainingPage />
    </AuthGuard>
  );
}

export default ProtectedAdminTrainingPage;
