"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    // Verificar domínio @isptec.co.ao para novos registos
    if (!email.endsWith("@isptec.co.ao")) {
      setError(
        "Apenas emails institucionais @isptec.co.ao são permitidos para novos registos.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Falha ao registar. Tente novamente.");
        return;
      }

      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (login?.error) {
        window.location.href = "/login";
        return;
      }
      window.location.href = login?.url ?? "/";
    } catch {
      setError("Ocorreu um erro inesperado. Tente novamente.");
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
                  width={144}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Header */}
              <div className="space-y-2 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Criar conta
                </h1>
                <p className="text-slate-500 text-sm">
                  Use o seu email institucional @isptec.co.ao
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-3 sm:space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700"
                    >
                      Email institucional
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

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Palavra-passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        id="password"
                        placeholder="Mín. 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Mín. 8 caracteres</p>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-slate-700"
                    >
                      Confirmar palavra-passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        id="confirmPassword"
                        placeholder="Repetir a palavra-passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                  >
                    {isLoading ? "A criar conta..." : "Criar conta"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

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
