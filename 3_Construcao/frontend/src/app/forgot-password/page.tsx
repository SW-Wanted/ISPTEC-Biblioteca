"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          {/* Gradient Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-400 via-amber-500 to-amber-400" />

          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col space-y-6 sm:space-y-8">
              {/* Back Button */}
              <Link href="/login">
                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao início de sessão
                </button>
              </Link>

              {/* Logo */}
              <div className="flex justify-center">
                <Image
                  src="/isptec-logo-full.png"
                  alt="ISPTEC Logo"
                  width={128}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>

              {!isSuccess ? (
                <>
                  {/* Header */}
                  <div className="space-y-2 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      Recuperar palavra-passe
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base">
                      Insira o seu email e enviaremos um link para redefinir a
                      sua palavra-passe
                    </p>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4 sm:space-y-5"
                  >
                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700"
                      >
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          id="email"
                          placeholder="seunome@isptec.co.ao"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                    >
                      {isLoading ? "A enviar..." : "Enviar link de recuperação"}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  {/* Success Message */}
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        Verifique o seu email
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Enviámos um link de recuperação para
                      </p>
                      <p className="text-slate-700 font-medium">{email}</p>
                    </div>

                    <div className="pt-4">
                      <Link href="/login">
                        <Button className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
                          Voltar ao início de sessão
                        </Button>
                      </Link>
                    </div>

                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setEmail("");
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Não recebeu o email? Tente novamente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for mobile */}
        <div className="mt-8 text-center text-xs text-slate-400 sm:hidden">
          <p>&nbsp;</p>
        </div>

        {/* Help link */}
        <div className="mt-4 text-center">
          <Link
            href="/help"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Precisa de ajuda?
          </Link>
        </div>
      </div>
    </div>
  );
}
