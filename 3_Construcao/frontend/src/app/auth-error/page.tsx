"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ShieldX, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<
  string,
  { title: string; description: string; icon: React.ReactNode }
> = {
  AccessDenied: {
    title: "Acesso negado",
    description:
      "Apenas emails institucionais com o domínio @isptec.co.ao são permitidos para autenticação. Se é membro do ISPTEC e está com dificuldades, contacte a biblioteca.",
    icon: <ShieldX className="w-12 h-12 text-red-500" />,
  },
  Configuration: {
    title: "Erro de configuração",
    description:
      "Ocorreu um problema na configuração do sistema de autenticação. Por favor, contacte o suporte técnico.",
    icon: <ShieldX className="w-12 h-12 text-amber-500" />,
  },
  Verification: {
    title: "Erro de verificação",
    description:
      "Não foi possível verificar as suas credenciais. Tente novamente ou utilize outro método de autenticação.",
    icon: <ShieldX className="w-12 h-12 text-amber-500" />,
  },
  Default: {
    title: "Erro de autenticação",
    description:
      "Ocorreu um erro inesperado durante o processo de autenticação. Tente novamente.",
    icon: <ShieldX className="w-12 h-12 text-slate-500" />,
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") || "Default";

  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          {/* Gradient Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-400 via-red-500 to-red-400" />

          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Logo */}
              <Image
                src="/isptec-logo.png"
                alt="ISPTEC Logo"
                width={60}
                height={60}
                className="object-contain"
                priority
              />

              {/* Error Icon */}
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                {errorInfo.icon}
              </div>

              {/* Error Info */}
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {errorInfo.title}
                </h1>
                <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                  {errorInfo.description}
                </p>
              </div>

              {/* Hint for AccessDenied */}
              {errorCode === "AccessDenied" && (
                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-1">
                        Email institucional obrigatório
                      </p>
                      <p className="text-amber-700">
                        Certifique-se de que está a usar a sua conta Google do
                        ISPTEC (ex:{" "}
                        <span className="font-medium">nome@isptec.co.ao</span>).
                        Contas pessoais (Gmail, Hotmail, etc.) não são aceites.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 w-full pt-2">
                <Link href="/login" className="w-full">
                  <Button className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao início de sessão
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
          <div className="animate-pulse text-slate-400">A carregar...</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
