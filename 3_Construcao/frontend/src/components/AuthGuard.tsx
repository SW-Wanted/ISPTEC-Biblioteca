"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserType } from "@prisma/client";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireLibrarian?: boolean;
}

export function AuthGuard({
  children,
  requireAdmin = false,
  requireLibrarian = false,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    // Não autenticado
    if (!session) {
      console.log("AuthGuard: Sem sessão, redirecionando para /login");
      router.push("/login");
      return;
    }

    console.log("AuthGuard: Sessão encontrada", {
      userType: session.user?.type,
      requireAdmin,
      requireLibrarian,
    });

    // Verificar se é admin
    const isSettingsAdmin =
      session.user?.type === UserType.SUPERVISOR ||
      session.user?.type === UserType.LIBRARIAN ||
      session.user?.type === UserType.STAFF;

    if (requireAdmin && !isSettingsAdmin) {
      console.log("AuthGuard: Sem permissão admin, redirecionando para /");
      router.push("/");
      return;
    }

    // Verificar se é bibliotecário ou admin
    if (requireLibrarian) {
      const isLibrarian =
        session.user?.type === UserType.LIBRARIAN ||
        session.user?.type === UserType.SUPERVISOR;
      console.log("AuthGuard: Verificando bibliotecário", {
        userType: session.user?.type,
        isLibrarian,
      });
      if (!isLibrarian) {
        console.log(
          "AuthGuard: Não é bibliotecário nem admin, redirecionando para /",
        );
        router.push("/");
        return;
      }
    }
  }, [session, status, router, requireAdmin, requireLibrarian]);

  // Mostra loading enquanto verifica
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">A carregar...</p>
        </div>
      </div>
    );
  }

  // Não mostra nada se não autenticado ou sem permissão
  if (!session) {
    return null;
  }

  const isSettingsAdmin =
    session.user?.type === UserType.SUPERVISOR ||
    session.user?.type === UserType.LIBRARIAN ||
    session.user?.type === UserType.STAFF;

  if (requireAdmin && !isSettingsAdmin) {
    return null;
  }

  if (requireLibrarian) {
    const isLibrarian =
      session.user?.type === UserType.LIBRARIAN ||
      session.user?.type === UserType.SUPERVISOR;
    if (!isLibrarian) {
      return null;
    }
  }

  // Renderiza os filhos se tudo OK
  return <>{children}</>;
}
