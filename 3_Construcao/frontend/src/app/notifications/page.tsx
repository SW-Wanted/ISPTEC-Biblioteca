"use client";

import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { api, type Notification } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BookOpen,
  Clock,
  RefreshCw,
  CreditCard,
  Trash2,
  CheckCheck,
  Filter,
  Settings,
  Loader2,
  KeyRound,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";

async function postJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export default function Notifications() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    [],
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => api.entities.Notification.filter({ user_id: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: member } = useQuery({
    queryKey: ["member-prefs", user?.email],
    queryFn: async () => {
      const members = await api.entities.Member.filter({
        user_id: user?.email,
      });
      return members[0] || null;
    },
    enabled: !!user?.email,
    initialData: null,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;

    type NotificationRecord = {
      user_id?: string;
      title?: string;
      message?: string;
    } & Record<string, unknown>;

    const unsubscribe = api.entities.Notification.subscribe((event) => {
      if (event.type === "refetch") {
        queryClient.invalidateQueries({
          queryKey: ["notifications", user.email],
        });
        return;
      }

      if (event.type !== "create" && event.type !== "update") return;
      const data = event.record as NotificationRecord;
      if (data.user_id !== user.email) return;

      queryClient.invalidateQueries({
        queryKey: ["notifications", user.email],
      });
      if (event.type === "create") {
        toast.info(data.title ?? "Nova notificação", {
          description: data.message,
        });
      }
    });

    return () => unsubscribe();
  }, [user?.email, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await Promise.all(
        notificationIds.map(async (id) => {
          await postJson<{ ok: true }>(
            `/api/notifications/${encodeURIComponent(id)}/mark-read`,
          );
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-center", user?.email],
      });
      setSelectedNotifications([]);
      toast.success("Notificações marcadas como lidas");
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await postJson<{ updated: number }>("/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-center", user?.email],
      });
      setSelectedNotifications([]);
      toast.success("Notificações marcadas como lidas");
    },
  });

  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      for (const id of notificationIds) {
        await api.entities.Notification.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count", user?.email],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-center", user?.email],
      });
      setSelectedNotifications([]);
      toast.success("Notificações excluídas");
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs: Record<string, unknown>) => {
      if (member) {
        await api.entities.Member.update(member.id, {
          notification_preferences: prefs,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["member-prefs", user?.email],
      });
      toast.success("Preferências salvas");
    },
  });

  const filteredNotifications = notifications
    .filter((n) => {
      if (filter === "unread") return n.status !== "read";
      if (filter === "read") return n.status === "read";
      return true;
    })
    .sort((a: Notification, b: Notification) => {
      const bTime = b.created_date ? new Date(b.created_date).getTime() : 0;
      const aTime = a.created_date ? new Date(a.created_date).getTime() : 0;
      return bTime - aTime;
    });

  const unreadCount = notifications.filter((n) => n.status !== "read").length;

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.action_type) {
      case "renew":
        return <RefreshCw className="w-5 h-5 text-amber-600" />;
      case "pay_fine":
        return <CreditCard className="w-5 h-5 text-red-600" />;
      case "collect_reservation":
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case "view_loan":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "view_services":
        return <KeyRound className="w-5 h-5 text-blue-600" />;
      case "view_documents":
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getActionUrl = (notification: Notification) => {
    switch (notification.action_type) {
      case "renew":
      case "view_loan":
        return createPageUrl("MyLoans");
      case "collect_reservation":
        return createPageUrl("MyReservations");
      case "pay_fine":
        return createPageUrl("Profile?tab=fines");
      case "view_services":
        return createPageUrl("Services");
      case "view_documents":
        return createPageUrl("Profile?tab=documents");
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status !== "read") {
      await markAsReadMutation.mutateAsync([notification.id]);
    }
    const url = getActionUrl(notification);
    if (url) window.location.href = url;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Bell className="w-7 h-7 text-amber-600" />
              Notificações
            </h1>
            <p className="text-slate-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} não lida(s)`
                : "Todas as notificações lidas"}
            </p>
          </div>
        </div>

        <Tabs defaultValue="notifications">
          <TabsList className="mb-6">
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-2" />
              Preferências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            {/* Actions Bar */}
            {selectedNotifications.length > 0 && (
              <Card className="border-0 shadow-sm mb-4 bg-amber-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm text-amber-700">
                    {selectedNotifications.length} selecionada(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        markAsReadMutation.mutate(selectedNotifications)
                      }
                      disabled={markAsReadMutation.isPending}
                    >
                      {markAsReadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCheck className="w-4 h-4 mr-1" />
                      )}
                      Marcar como lidas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() =>
                        deleteNotificationsMutation.mutate(
                          selectedNotifications,
                        )
                      }
                      disabled={deleteNotificationsMutation.isPending}
                    >
                      {deleteNotificationsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filter and Mark All */}
            <div className="flex items-center justify-between mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    {filter === "all"
                      ? "Todas"
                      : filter === "unread"
                        ? "Não lidas"
                        : "Lidas"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilter("all")}>
                    Todas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("unread")}>
                    Não lidas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("read")}>
                    Lidas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>

            {/* Notifications List */}
            {isLoading ? (
              <div className="space-y-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {filter === "unread"
                      ? "Nenhuma notificação não lida"
                      : "Nenhuma notificação"}
                  </h3>
                  <p className="text-slate-500">
                    {filter === "unread"
                      ? "Você está em dia com todas as suas notificações!"
                      : "Suas notificações aparecerão aqui."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center gap-3 px-2">
                    <Checkbox
                      checked={
                        selectedNotifications.length ===
                          filteredNotifications.length &&
                        filteredNotifications.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNotifications(
                            filteredNotifications.map((n) => n.id),
                          );
                        } else {
                          setSelectedNotifications([]);
                        }
                      }}
                    />
                    <span className="text-sm text-slate-600">
                      Selecionar todas
                    </span>
                  </div>

                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card
                        className={cn(
                          "border-0 shadow-sm transition-all duration-300 hover:shadow-md",
                          notification.status !== "read" &&
                            "bg-amber-50/50 ring-1 ring-amber-100",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedNotifications.includes(
                                notification.id,
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedNotifications([
                                    ...selectedNotifications,
                                    notification.id,
                                  ]);
                                } else {
                                  setSelectedNotifications(
                                    selectedNotifications.filter(
                                      (i) => i !== notification.id,
                                    ),
                                  );
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              className="flex-1 flex gap-3 cursor-pointer"
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                  notification.status !== "read"
                                    ? "bg-amber-100"
                                    : "bg-slate-100",
                                )}
                              >
                                {getNotificationIcon(notification)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3
                                    className={cn(
                                      "text-sm",
                                      notification.status !== "read"
                                        ? "font-semibold text-slate-800"
                                        : "font-medium text-slate-600",
                                    )}
                                  >
                                    {notification.title}
                                  </h3>
                                  <span className="text-xs text-slate-400 shrink-0">
                                    {notification.created_date
                                      ? formatDistanceToNow(
                                          new Date(notification.created_date),
                                          { addSuffix: true },
                                        )
                                      : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                {notification.action_type !== "none" && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 mt-2 text-amber-600"
                                  >
                                    {notification.action_type === "renew" &&
                                      "Renovar agora"}
                                    {notification.action_type === "pay_fine" &&
                                      "Pagar multa"}
                                    {notification.action_type ===
                                      "collect_reservation" && "Ver reserva"}
                                    {notification.action_type === "view_loan" &&
                                      "Ver empréstimo"}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {notification.status !== "read" && (
                              <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-2" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="preferences">
            <NotificationPreferences
              preferences={member?.notification_preferences || {}}
              onUpdate={(prefs: Record<string, unknown>) =>
                updatePreferencesMutation.mutate(prefs)
              }
              isUpdating={updatePreferencesMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
