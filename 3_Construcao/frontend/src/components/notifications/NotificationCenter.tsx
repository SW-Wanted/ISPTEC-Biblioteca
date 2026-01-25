"use client"

import * as React from "react"
import Link from "next/link"

import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  message: string
  status: "unread" | "read"
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Bem-vindo ao SGBU",
    message: "A autenticação e notificações reais entram na próxima fase.",
    status: "unread",
  },
]

export default function NotificationCenter() {
  const [open, setOpen] = React.useState(false)

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.status === "unread").length

  return (
    <div className="relative">
      <button
        type="button"
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-sm font-medium text-slate-800">Notificações</p>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            {MOCK_NOTIFICATIONS.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "px-3 py-2 border-b last:border-b-0",
                  n.status === "unread" && "bg-indigo-50/50"
                )}
              >
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
            ))}
          </div>

          <div className="px-3 py-2">
            <Link
              href="/"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver mais
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
