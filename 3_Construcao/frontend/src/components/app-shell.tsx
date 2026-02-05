"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Menu,
  X,
  LayoutDashboard,
  Search,
  BookMarked,
  Clock,
  Bell,
  User,
  LogOut,
  MessageCircle,
  ChevronDown,
  Library,
  Users,
  FileText,
  BarChart3,
  Computer,
  KeyRound,
  DollarSign,
  HelpCircle,
  Sparkles,
  CheckCircle,
  FileCheck,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationCenter from "@/components/notifications/NotificationCenter";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const USER_NAV_ITEMS: NavItem[] = [
  { name: "Início", href: "/", icon: LayoutDashboard },
  { name: "Pesquisar Livros", href: "/search-books", icon: Search },
  { name: "Meus Empréstimos", href: "/my-loans", icon: BookMarked },
  { name: "Minhas Reservas", href: "/my-reservations", icon: Clock },
  { name: "Recomendações", href: "/recommendations", icon: Sparkles },
  { name: "Serviços", href: "/services", icon: Computer },
  { name: "Assistente", href: "/chatbot", icon: MessageCircle },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { name: "Painel de Controlo", href: "/admin-dashboard", icon: BarChart3 },
  { name: "Livros", href: "/manage-books", icon: Library },
  { name: "Membros", href: "/manage-members", icon: Users },
  { name: "Documentos", href: "/verify-documents", icon: FileCheck },
  { name: "Formações", href: "/admin/training", icon: CheckCircle },
  { name: "Empréstimos", href: "/manage-loans", icon: BookMarked },
  { name: "Cacifos", href: "/admin/lockers", icon: KeyRound },
  { name: "Multas", href: "/manage-fines", icon: DollarSign },
  { name: "Catalogação", href: "/cataloging", icon: FileText },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Políticas", href: "/admin/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Check if current page is an auth page (no layout)
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  // Carregar utilizador autenticado com React Query
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return null;
      const data = await response.json();
      console.log("📥 Dados do /api/auth/me:", data); // Debug
      return data;
    },
    enabled: !isAuthPage,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Verificar se é admin baseado no UserType
  const isAdmin =
    user?.type === "SUPERVISOR" ||
    user?.type === "LIBRARIAN" ||
    user?.type === "STAFF";

  const router = useRouter();

  // Redirecionar usuários PENDING para onboarding
  React.useEffect(() => {
    const isAuthPage = pathname === "/login" || pathname === "/register";
    const isOnboardingPage = pathname.startsWith("/onboarding");
    const isProfilePage = pathname.startsWith("/profile"); // Permitir acesso ao perfil para upload de documentos
    const isServicesPage = pathname.startsWith("/services"); // Permitir acesso a formações para PENDING_TRAINING
    const isNotificationsPage = pathname.startsWith("/notifications"); // Permitir acesso a notificações
    const isApiPage = pathname.startsWith("/api"); // Permitir chamadas API

    if (
      user &&
      user.activationStatus !== "ACTIVE" &&
      !isAuthPage &&
      !isOnboardingPage &&
      !isProfilePage &&
      !isServicesPage &&
      !isNotificationsPage &&
      !isApiPage
    ) {
      console.log(
        "🔀 Redirecting PENDING user to onboarding:",
        user.activationStatus,
      );
      router.push("/onboarding");
    }
  }, [user, pathname, router]);

  // Log para debug
  React.useEffect(() => {
    console.log("🔍 Debug AppShell:", {
      email: user?.email,
      name: user?.name,
      full_name: user?.full_name,
      type: user?.type,
      activationStatus: user?.activationStatus,
      isAdmin,
    });
  }, [user, isAdmin]);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count", user?.email],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (!res.ok) return { unreadCount: 0 };
      return (await res.json()) as { unreadCount: number };
    },
    enabled: !isAuthPage && !!user?.email,
    refetchInterval: 30_000,
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.href = "/login";
    }
  };

  // Render without layout for auth pages
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6 text-slate-700" />
        </button>

        <div className="flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-indigo-600" />
          <span className="font-bold text-lg text-slate-800">ISPTEC</span>
        </div>

        <div className="flex items-center gap-2">
          {isUserLoading ? (
            <Skeleton className="h-9 w-9 rounded-lg" />
          ) : user ? (
            <NotificationCenter user={user} />
          ) : (
            <Link
              href="/login"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Entrar"
            >
              <User className="w-5 h-5 text-slate-600" />
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-transform duration-300",
          "w-72 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">ISPTEC</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Biblioteca
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Principal
          </p>
          {USER_NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    active ? "text-indigo-600" : "text-slate-400",
                  )}
                />
                {item.name}
              </Link>
            );
          })}

          {isUserLoading && (
            <>
              <div className="pt-4 pb-2">
                <Skeleton className="h-3 w-28 mx-3" />
              </div>
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3">
                  Administração
                </p>
              </div>
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        active ? "text-indigo-600" : "text-slate-400",
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          {isUserLoading ? (
            <div className="w-full flex items-center gap-3 p-2 rounded-xl">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {user.full_name?.charAt(0) ||
                      user.email?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {user.full_name || "Utilizador"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 w-full"
                  >
                    <User className="w-4 h-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/notifications"
                    className="flex items-center gap-2 w-full"
                  >
                    <Bell className="w-4 h-4" />
                    Notificações
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto text-[10px] h-5"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem>
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 w-full"
                      >
                        <Settings className="w-4 h-4" />
                        Políticas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>
                  <Link href="/help" className="flex items-center gap-2 w-full">
                    <HelpCircle className="w-4 h-4" />
                    Ajuda
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="w-full">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn("transition-all duration-300 pt-16 lg:pt-0", "lg:ml-72")}
      >
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
