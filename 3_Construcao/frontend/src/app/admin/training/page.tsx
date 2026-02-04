"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Users, Plus, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function AdminTrainingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<TrainingSession | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const queryClient = useQueryClient();

  // Fetch training sessions
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["training-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/training/sessions?upcoming=true");
      if (!res.ok) throw new Error("Erro ao carregar sessões");
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    refetchOnWindowFocus: false,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/training/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar sessão");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setIsCreateDialogOpen(false);
      toast.success("Sessão de formação criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar sessão de formação");
    },
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
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
      if (!res.ok) throw new Error("Erro ao marcar presença");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setSelectedSession(null);
      setSelectedParticipants([]);
      toast.success("Presenças marcadas! Contas ativadas automaticamente.");
    },
    onError: () => {
      toast.error("Erro ao marcar presenças");
    },
  });

  const handleCreateSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createSessionMutation.mutate({
      title: formData.get("title"),
      description: formData.get("description"),
      location: formData.get("location"),
      maxParticipants: parseInt(formData.get("maxParticipants") as string),
      scheduledDate: new Date(
        formData.get("scheduledDate") as string,
      ).toISOString(),
      duration: parseInt(formData.get("duration") as string),
    });
  };

  const handleMarkAttendance = () => {
    if (!selectedSession || selectedParticipants.length === 0) {
      toast.error("Selecione pelo menos um participante");
      return;
    }

    markAttendanceMutation.mutate({
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const sessions: TrainingSession[] = sessionsData?.sessions || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Formações</h1>
          <p className="text-muted-foreground">
            Crie e gerencie sessões de formação para novos membros
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Sessão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Sessão de Formação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Formação Inicial - Uso da Biblioteca"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detalhes sobre o conteúdo da formação..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Local *</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Auditório Principal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="maxParticipants">Vagas Máximas *</Label>
                  <Input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    defaultValue={30}
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Data e Hora *</Label>
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="datetime-local"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duração (minutos) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    defaultValue={120}
                    min={30}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending
                    ? "Criando..."
                    : "Criar Sessão"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma sessão agendada</p>
              <p className="text-sm text-muted-foreground">
                Crie uma nova sessão de formação
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{session.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {session.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      session.status === "COMPLETED"
                        ? "default"
                        : session.status === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {session.status === "SCHEDULED" && "Agendada"}
                    {session.status === "IN_PROGRESS" && "Em Andamento"}
                    {session.status === "COMPLETED" && "Concluída"}
                    {session.status === "CANCELLED" && "Cancelada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(session.scheduledDate).toLocaleDateString(
                        "pt-AO",
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(session.scheduledDate).toLocaleTimeString(
                        "pt-AO",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {session.participants.length}/{session.maxParticipants}{" "}
                      inscritos
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Local:</span>{" "}
                    {session.location}
                  </div>
                </div>

                {session.participants.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">
                      Participantes ({session.participants.length})
                    </p>
                    {session.status === "SCHEDULED" ? (
                      <div className="space-y-2">
                        {session.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium">
                                {participant.user.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {participant.user.email}
                              </p>
                            </div>
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
                                "Marcar presença"
                              )}
                            </Button>
                          </div>
                        ))}
                        <Button
                          className="w-full mt-4"
                          disabled={
                            selectedParticipants.length === 0 ||
                            markAttendanceMutation.isPending
                          }
                          onClick={() => {
                            setSelectedSession(session);
                            handleMarkAttendance();
                          }}
                        >
                          {markAttendanceMutation.isPending
                            ? "Processando..."
                            : `Concluir Sessão (${selectedParticipants.length} presentes)`}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {session.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium">
                                {participant.user.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {participant.user.email}
                              </p>
                            </div>
                            {participant.attended ? (
                              <Badge variant="default">
                                <Check className="h-3 w-3 mr-1" />
                                Presente
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <X className="h-3 w-3 mr-1" />
                                Ausente
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Wrap with AuthGuard
function ProtectedAdminTrainingPage() {
  return (
    <AuthGuard requireLibrarian>
      <AdminTrainingPage />
    </AuthGuard>
  );
}

export default ProtectedAdminTrainingPage;
