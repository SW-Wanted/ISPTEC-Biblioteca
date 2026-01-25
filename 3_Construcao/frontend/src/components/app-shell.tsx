"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Menu,
  X,
  LayoutDashboard,
  Search,
  BookMarked,
  Clock,
  Bell,
  KeyRound,
  HelpCircle,
  Shield,
} from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { name: "Início", href: "/", icon: LayoutDashboard },
  { name: "Pesquisar Livros", href: "/search-books", icon: Search },
  { name: "Meus Empréstimos", href: "/my-loans", icon: BookMarked },
  { name: "Minhas Reservas", href: "/my-reservations", icon: Clock },
  { name: "Notificações", href: "/notifications", icon: Bell },
  { name: "Serviços", href: "/services", icon: KeyRound },
  { name: "Ajuda", href: "/help", icon: HelpCircle },
  { name: "Admin", href: "/admin-dashboard", icon: Shield },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

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
          <span className="font-bold text-lg text-slate-800">SGBU</span>
        </div>

        <div className="w-10" />
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
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
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
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-64px)]">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Principal
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    active ? "text-indigo-600" : "text-slate-400"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={cn("transition-all duration-300 pt-16 lg:pt-0", "lg:ml-72")}>
        <div className="min-h-screen p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
