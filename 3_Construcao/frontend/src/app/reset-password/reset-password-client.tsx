"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const canSubmit = token && password.length >= 8 && password === confirmPassword && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error("Token em falta")
      return
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const json = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null

      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao redefinir senha")
      }

      toast.success("Senha actualizada com sucesso")
      router.replace("/login")
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Falha ao redefinir senha"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col space-y-6 sm:space-y-8">
              <Link href="/login">
                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </Link>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">New password</h1>
                <p className="text-slate-500 text-sm sm:text-base">Define a tua nova senha.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      id="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirm password
                  </Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                >
                  {isLoading ? "Saving..." : "Save new password"}
                </Button>

                {!token && (
                  <p className="text-sm text-red-600">Token inválido. Volta a pedir um link de recuperação.</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
