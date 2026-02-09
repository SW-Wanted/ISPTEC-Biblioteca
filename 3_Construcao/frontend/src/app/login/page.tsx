"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Flag para habilitar/desabilitar Google OAuth (baseado em .env)
const GOOGLE_OAUTH_ENABLED =
  typeof window === "undefined"
    ? !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : true;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = () => {
    void signIn("google", { callbackUrl: "/" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    setEmail(emailValue);
    setPassword(passwordValue);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: emailValue,
        password: passwordValue,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        if (result.error.includes("AccountBlocked")) {
          setError("Conta bloqueada. Contacte a biblioteca.");
        } else if (result.error.includes("AccountInactive")) {
          setError(
            "A sua conta está desactivada. Contacte a biblioteca para mais informações.",
          );
        } else if (result.error.includes("InvalidCredentials")) {
          setError("Email ou palavra-passe incorrectos.");
        } else {
          setError("Email ou palavra-passe incorrectos.");
        }
        return;
      }

      // Verificar se o utilizador tem eliminação pendente
      const session = await getSession();
      if (session?.user?.deletionPending) {
        window.location.href = "/profile";
        return;
      }

      window.location.href = result?.url ?? "/";
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

              {/* Header */}
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Bem-vindo a Biblioteca
                </h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">
                  Inicie sessão para continuar
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="w-full flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="w-full">
                {/* Google Sign In */}
                {GOOGLE_OAUTH_ENABLED && (
                  <>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 px-5 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 font-medium text-[16px] h-auto"
                      >
                        <div className="transition-transform duration-200 -ml-4">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                        </div>
                        <span>Continuar com Google</span>
                      </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                          ou
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Email/Password Form */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 sm:space-y-5"
                >
                  <div className="space-y-3 sm:space-y-4">
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
                          name="email"
                          autoComplete="email"
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
                          name="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                      {isLoading ? "A entrar..." : "Entrar"}
                    </Button>

                    {/* Links */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                      <Link href="/forgot-password">
                        <button
                          type="button"
                          className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                        >
                          Esqueceu a palavra-passe?
                        </button>
                      </Link>
                      <Link href="/register">
                        <button
                          type="button"
                          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          Não tem conta?{" "}
                          <span className="font-medium text-slate-700">
                            Criar conta
                          </span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
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
