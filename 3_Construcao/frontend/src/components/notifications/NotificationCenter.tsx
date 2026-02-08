"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CheckCheck,
  Clock,
  CreditCard,
  Settings,
  ChevronRight,
  FileText,
  KeyRound,
} from "lucide-react";

import type { Notification as ApiNotification } from "@/api/apiClient";
import { cn } from "@/lib/utils";
import {
  getNotificationActionUrl,
  getNotificationActionType,
} from "@/lib/notification-helpers";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type NotificationCenterProps = {
  user?: { email?: string | null } | null;
};

type UnreadCountResponse = { unreadCount: number };

async function httpJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

function getNotificationIcon(metadata: unknown) {
  const actionType = getNotificationActionType(metadata);

  switch (actionType) {
    case "document_review":
    case "document_approved":
    case "document_rejected":
      return <FileText className="w-4 h-4 text-purple-600" />;
    case "training_available":
    case "training_scheduled":
    case "training_reminder":
      return <KeyRound className="w-4 h-4 text-blue-600" />;
    case "account_activated":
      return <CheckCheck className="w-4 h-4 text-emerald-600" />;
    case "loan_due_soon":
    case "loan_overdue":
    case "loan_renewed":
      return <Clock className="w-4 h-4 text-orange-600" />;
    case "reservation_available":
    case "reservation_expired":
      return <BookOpen className="w-4 h-4 text-emerald-600" />;
    case "fine_issued":
    case "fine_paid":
      return <CreditCard className="w-4 h-4 text-red-600" />;
    case "locker_overtime":
    case "computer_session_ending":
      return <Clock className="w-4 h-4 text-orange-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-600" />;
  }
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const email = user?.email ?? null;

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count", email],
    queryFn: async () =>
      await httpJson<UnreadCountResponse>("/api/notifications/unread-count", {
        method: "GET",
      }),
    enabled: !!email,
    refetchInterval: 30_000,
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["notifications-center", email],
    queryFn: async (): Promise<ApiNotification[]> => {
      if (!email) return [];
      const url = new URL("/api/entities/Notification", window.location.origin);
      url.searchParams.set("take", "10");
      url.searchParams.set("filter", JSON.stringify({ user_id: email }));
      return await httpJson<ApiNotification[]>(url.toString(), {
        method: "GET",
      });
    },
    enabled: !!email,
    refetchInterval: 30_000,
    initialData: [],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await httpJson<{ ok: true }>(
        `/api/notifications/${encodeURIComponent(notificationId)}/mark-read`,
        {
          method: "POST",
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["notifications-center", email],
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications-unread-count", email],
        }),
      ]);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await httpJson<{ updated: number }>("/api/notifications/mark-all-read", {
        method: "POST",
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["notifications-center", email],
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications-unread-count", email],
        }),
      ]);
    },
  });

  // Browser notifications (best-effort): detect new latest item
  const lastSeenIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!email) return;
    if (typeof window === "undefined") return;

    const latest = recentNotifications[0];
    if (!latest?.id) return;

    const prev = lastSeenIdRef.current;
    lastSeenIdRef.current = latest.id;

    if (!prev || prev === latest.id) return;

    if (
      "Notification" in window &&
      window.Notification.permission === "default"
    ) {
      window.Notification.requestPermission().catch(() => null);
    }

    if (
      "Notification" in window &&
      window.Notification.permission === "granted"
    ) {
      try {
        new window.Notification(latest.title ?? "Nova notificação", {
          body: latest.message ?? "",
          icon: "/favicon.ico",
        });
      } catch {
        // ignore
      }
    }
  }, [email, recentNotifications]);

  // const handleNotificationClick = async (notification: ApiNotification) => {
  const handleNotificationClick = async (notification: ApiNotification) => {
    try {
      // Marcar como lida se ainda não foi
      const isRead =
        notification.status === "READ" || notification.status === "read";
      if (!isRead && notification.id) {
        await markAsReadMutation.mutateAsync(notification.id);
      }

      // Navegar para URL da metadata ou fallback para /notifications
      const actionUrl = getNotificationActionUrl(notification.metadata);
      const targetUrl = actionUrl || "/notifications";

      setIsOpen(false);
      router.push(targetUrl);
    } catch (error) {
      console.error("Erro ao processar notificação:", error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium px-1"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <Link
                  href="/notifications"
                  aria-label="Abrir centro de notificações"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-100">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left block p-4 hover:bg-slate-50 transition-colors",
                    notification.status !== "READ" &&
                      notification.status !== "read" &&
                      "bg-indigo-50/50",
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        notification.status !== "READ" &&
                          notification.status !== "read"
                          ? "bg-indigo-100"
                          : "bg-slate-100",
                      )}
                    >
                      {getNotificationIcon(notification.metadata)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm",
                          notification.status !== "READ" &&
                            notification.status !== "read"
                            ? "font-medium text-slate-800"
                            : "text-slate-600",
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.created_date && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatDistanceToNow(
                            new Date(notification.created_date),
                            { addSuffix: true },
                          )}
                        </p>
                      )}
                    </div>
                    {notification.status !== "READ" &&
                      notification.status !== "read" && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2" />
                      )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-slate-100">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => setIsOpen(false)}
          >
            <Link href="/notifications">
              Ver todas as notificações
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
