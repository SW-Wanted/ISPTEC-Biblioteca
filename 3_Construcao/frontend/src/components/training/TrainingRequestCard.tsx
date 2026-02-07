"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Calendar, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TrainingSession {
  id: string;
  title: string;
  description?: string;
  location: string;
  maxParticipants: number;
  scheduledDate: string;
  duration: number;
  status: string;
  participants: Array<{ id: string; userId: string }>;
}

interface TrainingRequestCardProps {
  user: {
    id: string;
    activationStatus: string;
  };
}

export function TrainingRequestCard({ user }: TrainingRequestCardProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();

  // Fetch available sessions - for PENDING_TRAINING and ACTIVE users
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["available-training-sessions"],
    queryFn: async () => {
      const res = await fetch(
        "/api/training/sessions?status=SCHEDULED&upcoming=true",
      );
      if (!res.ok) throw new Error("Erro ao carregar sessões");
      return res.json();
    },
    enabled:
      user.activationStatus === "PENDING_TRAINING" ||
      user.activationStatus === "ACTIVE",
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/training/sessions/${sessionId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao inscrever");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["available-training-sessions"],
      });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      toast.success("Inscrição realizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (user.activationStatus === "ACTIVE") {
    const upcomingSessions: TrainingSession[] = sessionsData?.sessions || [];
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <GraduationCap className="h-5 w-5" />
            Formações da Biblioteca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-600">
            Sua conta está ativa! Confira as próximas formações disponíveis.
          </p>
          {isLoading ? (
            <p className="text-xs text-green-500">Carregando...</p>
          ) : upcomingSessions.length === 0 ? (
            <p className="text-xs text-green-500">
              Nenhuma formação agendada de momento.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="bg-white/70 border border-green-100 rounded-lg p-3"
                >
                  <h4 className="text-sm font-medium text-slate-800">
                    {session.title}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.scheduledDate).toLocaleDateString(
                        "pt-AO",
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.scheduledDate).toLocaleTimeString(
                        "pt-AO",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {session.participants.length}/{session.maxParticipants}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (user.activationStatus === "TRAINING_SCHEDULED") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Calendar className="h-5 w-5" />
            Formação Agendada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-600">
            Você está inscrito em uma sessão de formação. Compareça no dia e
            horário agendados para ativar sua conta.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (user.activationStatus === "PENDING_DOCUMENTS") {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <GraduationCap className="h-5 w-5" />
            Aguardando Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-600">
            Faça upload de todos os documentos obrigatórios e aguarde a
            validação para poder solicitar a formação.
          </p>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <a href="/profile?tab=documents">Ver Meus Documentos</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (user.activationStatus !== "PENDING_TRAINING") {
    return null;
  }

  const sessions: TrainingSession[] = sessionsData?.sessions || [];
  const availableSessions = sessions.filter(
    (s) => s.participants.length < s.maxParticipants,
  );

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Solicitar Formação Obrigatória
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Para ativar sua conta e usar os serviços da biblioteca, você precisa
          participar de uma formação inicial.
        </p>

        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Carregando sessões disponíveis...
          </div>
        ) : availableSessions.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhuma sessão disponível no momento. Entre em contato com a
            biblioteca.
          </div>
        ) : (
          <div className="space-y-3">
            {availableSessions.map((session) => (
              <div
                key={session.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedSessionId === session.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{session.title}</h4>
                  <Badge variant="secondary">
                    {session.participants.length}/{session.maxParticipants}{" "}
                    vagas
                  </Badge>
                </div>
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {session.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {new Date(session.scheduledDate).toLocaleDateString(
                        "pt-AO",
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{session.duration} minutos</span>
                  </div>
                </div>
              </div>
            ))}

            <Button
              className="w-full"
              disabled={!selectedSessionId || registerMutation.isPending}
              onClick={() => {
                if (selectedSessionId) {
                  registerMutation.mutate(selectedSessionId);
                }
              }}
            >
              {registerMutation.isPending ? "Inscrevendo..." : "Inscrever-me"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
