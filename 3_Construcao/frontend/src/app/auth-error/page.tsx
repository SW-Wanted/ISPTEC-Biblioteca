"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, { title: string; description: string }> = {
  OAuthCallback: {
    title: "Erro na Autenticação com Google",
    description:
      "Não foi possível completar o login com Google. Por favor, tente novamente ou use email e palavra-passe.",
  },
  OAuthAccountNotLinked: {
    title: "Conta Não Vinculada",
    description:
      "Este email já está registado com outro método de login. Por favor, use o método original.",
  },
  EmailSignin: {
    title: "Erro ao Enviar Email",
    description:
      "Não foi possível enviar o email de verificação. Tente novamente mais tarde.",
  },
  Callback: {
    title: "Erro de Callback",
    description:
      "Ocorreu um erro durante o processo de autenticação. Tente novamente.",
  },
  OAuthSignin: {
    title: "Erro ao Iniciar Sessão",
    description:
      "Não foi possível iniciar o processo de autenticação. Verifique sua conexão e tente novamente.",
  },
  OAuthCreateAccount: {
    title: "Erro ao Criar Conta",
    description:
      "Não foi possível criar sua conta. Entre em contacto com o suporte.",
  },
  EmailCreateAccount: {
    title: "Erro ao Criar Conta",
    description:
      "Não foi possível criar sua conta com este email. Tente outro método.",
  },
  SessionRequired: {
    title: "Sessão Necessária",
    description:
      "Você precisa estar autenticado para acessar esta página. Por favor, faça login.",
  },
  Default: {
    title: "Erro de Autenticação",
    description:
      "Ocorreu um erro inesperado. Por favor, tente novamente ou contacte o suporte.",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";

  const errorInfo = errorMessages[error] ?? errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          {/* Red Top Border for Error */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-400 via-red-500 to-red-400" />

          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              {/* Logo */}
              <div className="flex justify-center">
                <Image
                  src="/isptec-logo-full.png"
                  alt="ISPTEC Logo"
                  width={144}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Error Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>

              {/* Error Message */}
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {errorInfo.title}
                </h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
                  {errorInfo.description}
                </p>
              </div>

              {/* Additional Info for Google OAuth */}
              {error === "OAuthCallback" && (
                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <p className="font-medium mb-2">Dica:</p>
                  <ul className="text-left space-y-1 list-disc list-inside">
                    <li>Certifique-se de usar um email @isptec.co.ao</li>
                    <li>Verifique sua conexão com a internet</li>
                    <li>Tente limpar o cache do navegador</li>
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="w-full space-y-3">
                <Link href="/login" className="block">
                  <Button className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao Login
                  </Button>
                </Link>

                <Link href="/" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-11 sm:h-12 border-slate-200 hover:bg-slate-50 font-medium rounded-xl transition-all duration-200"
                  >
                    Ir para Página Inicial
                  </Button>
                </Link>
              </div>

              {/* Support Link */}
              <div className="text-sm text-slate-500">
                Continua com problemas?{" "}
                <Link
                  href="/help"
                  className="text-slate-700 hover:text-slate-900 font-medium underline"
                >
                  Contacte o suporte
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Error Code (for debugging) */}
        {error !== "Default" && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              Código do erro: <code className="font-mono">{error}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
