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
  Pencil,
  Trash2,
  Download,
  CheckCircle,
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
import { format } from "date-fns";
import { downloadCSV, type CSVColumn } from "@/lib/csv-export";
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
  const [showEditDialog, setShowEditDialog] = useState(false);
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
  const [editForm, setEditForm] = useState({
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
      const res = await fetch("/api/training/sessions?limit=100");
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

  const editMutation = useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/training/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar sessao");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setShowEditDialog(false);
      setSelectedSession(null);
      toast.success("Sessao atualizada com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/training/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao eliminar sessao");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast.success("Sessao eliminada com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const completeMutation = useMutation({
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
      if (!res.ok) throw new Error("Erro ao concluir sessao");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setShowDetailsDialog(false);
      setSelectedSession(null);
      setSelectedParticipants([]);
      toast.success("Sessao concluida! Contas activadas automaticamente.");
    },
    onError: () => {
      toast.error("Erro ao concluir sessao");
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
    if (selectedSession.status === "IN_PROGRESS") {
      completeMutation.mutate({
        sessionId: selectedSession.id,
        participantIds: selectedParticipants,
      });
    } else {
      attendanceMutation.mutate({
        sessionId: selectedSession.id,
        participantIds: selectedParticipants,
      });
    }
  };

  const handleOpenEdit = (session: TrainingSession) => {
    setSelectedSession(session);
    const d = new Date(session.scheduledDate);
    const localDatetime = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      : "";
    setEditForm({
      title: session.title,
      description: session.description || "",
      location: session.location,
      maxParticipants: String(session.maxParticipants),
      scheduledDate: localDatetime,
      duration: String(session.duration),
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSession) return;
    if (!editForm.title || !editForm.location || !editForm.scheduledDate) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }
    editMutation.mutate({
      sessionId: selectedSession.id,
      data: {
        title: editForm.title,
        description: editForm.description || null,
        location: editForm.location,
        maxParticipants: parseInt(editForm.maxParticipants),
        scheduledDate: new Date(editForm.scheduledDate).toISOString(),
        duration: parseInt(editForm.duration),
      },
    });
  };

  const handleExportSessions = () => {
    if (filtered.length === 0) {
      toast.error("Nenhuma sessao para exportar");
      return;
    }
    const columns: CSVColumn[] = [
      { key: "title", label: "Titulo", formatter: (v) => String(v ?? "") },
      {
        key: "scheduledDate",
        label: "Data",
        formatter: (v) => {
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm");
        },
      },
      { key: "location", label: "Local", formatter: (v) => String(v ?? "") },
      {
        key: "duration",
        label: "Duracao (min)",
        formatter: (v) => String(v ?? ""),
      },
      { key: "status", label: "Estado", formatter: (v) => String(v ?? "") },
      {
        key: "maxParticipants",
        label: "Vagas",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "participants",
        label: "Inscritos",
        formatter: (v) => String(Array.isArray(v) ? v.length : 0),
      },
      {
        key: "trainer",
        label: "Formador",
        formatter: (v: any) => v?.name ?? "",
      },
    ];
    downloadCSV(filtered as any, columns, {
      filename: `formacoes-${format(new Date(), "yyyyMMdd-HHmm")}.csv`,
    });
    toast.success("CSV exportado com sucesso");
  };

  const handleExportParticipants = (session: TrainingSession) => {
    if (session.participants.length === 0) {
      toast.error("Nenhum participante nesta sessao");
      return;
    }
    const rows = session.participants.map((p) => ({
      name: p.user.name,
      email: p.user.email,
      attended: p.attended ? "Sim" : "Nao",
      session_title: session.title,
      session_date: session.scheduledDate,
    }));
    const columns: CSVColumn[] = [
      { key: "name", label: "Nome", formatter: (v) => String(v ?? "") },
      { key: "email", label: "Email", formatter: (v) => String(v ?? "") },
      { key: "attended", label: "Presente", formatter: (v) => String(v ?? "") },
      {
        key: "session_title",
        label: "Sessao",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "session_date",
        label: "Data",
        formatter: (v) => {
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm");
        },
      },
    ];
    downloadCSV(rows as any, columns, {
      filename: `participantes-${session.title.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyyMMdd")}.csv`,
    });
    toast.success("Lista de participantes exportada");
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
              <GraduationCap className="w-7 h-7 text-amber-600" />
              Gestao de Formacoes
            </h1>
            <p className="text-slate-500 mt-1">
              {summary.scheduled} agendada(s) • {summary.inProgress} em
              andamento • {summary.completed} concluida(s) •{" "}
              {summary.totalParticipants} participante(s) total
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportSessions}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Sessao
            </Button>
          </div>
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
                    const canEdit =
                      session.status === "SCHEDULED" ||
                      session.status === "IN_PROGRESS";
                    const canDelete = session.status !== "COMPLETED";
                    const canComplete = session.status === "IN_PROGRESS";
                    const canCancel = session.status === "SCHEDULED";
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
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSession(session);
                                setSelectedParticipants([]);
                                setShowDetailsDialog(true);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEdit(session)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canComplete && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 hover:text-emerald-700"
                                onClick={() => {
                                  setSelectedSession(session);
                                  // Pre-select all participants
                                  setSelectedParticipants(
                                    session.participants.map((p) => p.id),
                                  );
                                  setShowDetailsDialog(true);
                                }}
                                title="Concluir sessao"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-500 hover:text-slate-700"
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
                                title="Cancelar sessao"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                disabled={deleteMutation.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Eliminar permanentemente esta sessao? Esta accao nao pode ser revertida.",
                                    )
                                  ) {
                                    deleteMutation.mutate(session.id);
                                  }
                                }}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
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

                {selectedSession.participants.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportParticipants(selectedSession)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Exportar Participantes
                  </Button>
                )}

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
                          {selectedSession.status === "SCHEDULED" ||
                          selectedSession.status === "IN_PROGRESS" ? (
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

              {(selectedSession.status === "SCHEDULED" ||
                selectedSession.status === "IN_PROGRESS") &&
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
                        attendanceMutation.isPending ||
                        completeMutation.isPending
                      }
                      onClick={handleMarkAttendance}
                    >
                      {attendanceMutation.isPending ||
                      completeMutation.isPending
                        ? "A processar..."
                        : `Concluir Sessao (${selectedParticipants.length} presente(s))`}
                    </Button>
                  </DialogFooter>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setSelectedSession(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Sessao de Formacao</DialogTitle>
            <DialogDescription>
              Altere os dados da sessao de formacao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulo *</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Local *</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Vagas Maximas *</Label>
                <Input
                  type="number"
                  value={editForm.maxParticipants}
                  onChange={(e) =>
                    setEditForm((p) => ({
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
                  value={editForm.scheduledDate}
                  onChange={(e) =>
                    setEditForm((p) => ({
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
                  value={editForm.duration}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, duration: e.target.value }))
                  }
                  min={30}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
              {editMutation.isPending ? "A guardar..." : "Guardar Alteracoes"}
            </Button>
          </DialogFooter>
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
