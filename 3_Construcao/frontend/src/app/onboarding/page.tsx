"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  FileText,
  GraduationCap,
  AlertCircle,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data);

        // Se já está ativo, redirecionar para home
        if (data.activationStatus === "ACTIVE") {
          router.push("/home");
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const steps = [
    {
      id: "PENDING_DOCUMENTS",
      title: "1. Enviar Documentos",
      description: "Faça upload dos seus documentos de identificação",
      icon: FileText,
      action: () => router.push("/profile?tab=documents"),
      buttonText: "Enviar Documentos",
      completed: user?.activationStatus !== "PENDING_DOCUMENTS",
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

  const currentStepIndex = steps.findIndex(
    (step) => step.id === user?.activationStatus,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Bem-vindo ao Sistema de Biblioteca ISPTEC
          </h1>
          <p className="text-slate-600">
            Complete os passos abaixo para ativar sua conta
          </p>
        </div>

        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Sua conta foi criada com sucesso! Para acessar todos os serviços da
            biblioteca, você precisa completar o processo de ativação.
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
                    ? "border-indigo-500 shadow-lg"
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
                            ? "bg-indigo-500 text-white"
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
                    <Button
                      onClick={step.action}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {step.buttonText}
                    </Button>
                  )}
                  {isCompleted && (
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
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Contacte o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
