"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  FileText,
  GraduationCap,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  // Usar React Query para atualização automática
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Não autenticado");
      }
      return res.json();
    },
    refetchInterval: 5000, // Recarrega a cada 5 segundos
    refetchOnWindowFocus: true, // Recarrega quando a janela ganha foco
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    // Se já está ativo, redirecionar para home
    if (user?.activationStatus === "ACTIVE") {
      router.push("/home");
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const steps = [
    {
      id: "PENDING_DOCUMENTS",
      title: "1. Enviar Documentos",
      description: "Faça upload dos seus documentos de identificação",
      icon: FileText,
      action: () => router.push("/profile?tab=documents"),
      buttonText: "Enviar Documentos",
      completed: 
        user?.activationStatus === "PENDING_TRAINING" ||
        user?.activationStatus === "TRAINING_SCHEDULED" ||
        user?.activationStatus === "ACTIVE",
    },
    {
      id: "PENDING_TRAINING",
      title: "2. Formação Obrigatória",
      description: "Complete a formação sobre uso da biblioteca",
      icon: GraduationCap,
      action: () => router.push("/services"),
      buttonText: "Ver Formações",
      completed:
        user?.activationStatus === "TRAINING_SCHEDULED" ||
        user?.activationStatus === "ACTIVE",
    },
    {
      id: "ACTIVE",
      title: "3. Conta Ativa",
      description: "Acesso completo aos serviços da biblioteca",
      icon: CheckCircle,
      action: () => router.push("/home"),
      buttonText: "Acessar Sistema",
      completed: user?.activationStatus === "ACTIVE",
    },
  ];

  // Determinar o passo atual baseado no status
  let currentStepIndex = 0;
  if (user?.activationStatus === "PENDING_DOCUMENTS") {
    currentStepIndex = 0;
  } else if (user?.activationStatus === "PENDING_TRAINING") {
    currentStepIndex = 1;
  } else if (user?.activationStatus === "TRAINING_SCHEDULED") {
    currentStepIndex = 1; // Ainda no passo de formação, mas agendado
  } else if (user?.activationStatus === "ACTIVE") {
    currentStepIndex = 2;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Bem-vindo ao Sistema de Biblioteca ISPTEC
          </h1>
          <p className="text-slate-600">
            Complete os passos abaixo para ativar sua conta
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            Atualizar Status
          </Button>
        </div>

        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {user?.activationStatus === "PENDING_DOCUMENTS" && (
              <>
                Sua conta foi criada com sucesso! Para acessar todos os serviços da
                biblioteca, você precisa completar o processo de ativação.
              </>
            )}
            {user?.activationStatus === "PENDING_TRAINING" && (
              <>
                Seus documentos foram aprovados! Agora você precisa agendar e completar
                a formação obrigatória sobre o uso da biblioteca.
              </>
            )}
            {user?.activationStatus === "TRAINING_SCHEDULED" && (
              <>
                Formação agendada com sucesso! Aguarde a data da formação para ativar
                completamente sua conta.
              </>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isCompleted = step.completed;
            const isLocked = index > currentStepIndex;

            return (
              <Card
                key={step.id}
                className={`${
                  isCurrent
                    ? "border-amber-500 shadow-lg"
                    : isCompleted
                      ? "border-green-200 bg-green-50"
                      : "border-slate-200 opacity-60"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="text-sm text-slate-600 font-normal">
                        {step.description}
                      </p>
                    </div>
                    {isCompleted && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCurrent && !isLocked && (
                    <>
                      {user?.activationStatus === "TRAINING_SCHEDULED" ? (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Formação agendada! Aguarde a data da formação para ativar sua conta.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Button
                          onClick={step.action}
                          className="w-full bg-amber-600 hover:bg-amber-700"
                        >
                          {step.buttonText}
                        </Button>
                      )}
                    </>
                  )}
                  {isCompleted && user?.activationStatus !== "TRAINING_SCHEDULED" && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Etapa concluída
                    </p>
                  )}
                  {isLocked && (
                    <p className="text-sm text-slate-400">
                      Disponível após completar a etapa anterior
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Precisa de ajuda?{" "}
            <a
              href="/help"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Contacte o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
