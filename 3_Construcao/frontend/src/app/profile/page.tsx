"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  getUserTypeLabel,
  getUserStatusLabel,
  getLoanLimits,
  getNotificationTypeLabel,
  getNotificationTypeOptions,
} from "@/lib/user-helpers";
import { DocumentsManager } from "@/components/documents-manager";
import { QRCodeDisplay } from "@/components/qrcode-display";
import {
  Mail,
  Phone,
  Building2,
  GraduationCap,
  QrCode,
  CreditCard,
  Bell,
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Download,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type AuthState = "loading" | "auth" | "unauth";

interface AuthUser {
  email: string;
  full_name?: string | null;
}

interface Member {
  id: string;
  user_id?: string | null;
  phone?: string | null;
  preferred_notification?: "email" | "sms" | "push" | "in_app" | string | null;
  member_type?:
    | "STUDENT"
    | "TEACHER"
    | "STAFF"
    | "LIBRARIAN"
    | "CATALOGER"
    | "SUPERVISOR"
    | string
    | null;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED" | "PENDING" | string | null;
  activation_status?:
    | "ACTIVE"
    | "PENDING_DOCUMENTS"
    | "PENDING_TRAINING"
    | "TRAINING_SCHEDULED"
    | "BLOCKED"
    | string
    | null;
  is_blocked?: boolean | null;
  blocked_reason?: string | null;
  registration_number?: string | null;
  course?: string | null;
  department?: string | null;
  max_books?: number | null;
  loan_days?: number | null;
  qr_code?: string | null;
  total_fines?: number | null;
}

interface Fine {
  id: string;
  status?: "pending" | "paid" | string | null;
  amount?: number | null;
  type?:
    | "late_return"
    | "locker_overtime"
    | "lost_credential"
    | "damaged_book"
    | "lost_book"
    | string
    | null;
  generated_at?: string | null;
  created_date?: string | null;
  reason?: string | null;
}

interface Loan {
  id: string;
  status?: "active" | "returned" | string | null;
}

async function safeJsonFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toDate(value: unknown): Date | null {
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function Profile() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["info", "fines", "stats", "documents", "qrcode"];
  const defaultTab = validTabs.includes(tabParam || "") ? tabParam! : "info";

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    phone: string;
    preferred_notification: string;
  }>({
    phone: "",
    preferred_notification: "email",
  });
  const [showQRDialog, setShowQRDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      setAuthState("loading");

      // Tenta endpoints comuns (ajusta para o teu backend real)
      const me =
        (await safeJsonFetch<AuthUser>("/api/auth/me")) ??
        (await safeJsonFetch<AuthUser>("/api/me"));

      const nextUser = me?.email ? me : null;

      if (cancelled) return;

      setUser(nextUser);
      setAuthState(nextUser ? "auth" : "unauth");
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const { data: member, isLoading: memberLoading } = useQuery<Member | null>({
    queryKey: ["member", user?.email],
    enabled: authState === "auth" && !!user?.email,
    queryFn: async () => {
      // Ajusta para o teu endpoint real (ex.: /api/members/by-email)
      const url = `/api/members/by-email?email=${encodeURIComponent(user!.email)}`;
      return await safeJsonFetch<Member>(url);
    },
  });

  const { data: fines = [] } = useQuery<Fine[]>({
    queryKey: ["fines", user?.email],
    enabled: authState === "auth" && !!user?.email,
    queryFn: async () => {
      const url = `/api/fines?email=${encodeURIComponent(user!.email)}`;
      return (await safeJsonFetch<Fine[]>(url)) ?? [];
    },
    initialData: [],
  });

  const { data: loans = [] } = useQuery<Loan[]>({
    queryKey: ["all-loans", user?.email],
    enabled: authState === "auth" && !!user?.email,
    queryFn: async () => {
      const url = `/api/loans?email=${encodeURIComponent(user!.email)}`;
      return (await safeJsonFetch<Loan[]>(url)) ?? [];
    },
    initialData: [],
  });

  const { data: documents = [], refetch: refetchDocuments } = useQuery<any[]>({
    queryKey: ["user-documents"],
    enabled: authState === "auth",
    queryFn: async () => {
      const response = await fetch("/api/members/documents");
      if (!response.ok) return [];
      const data = await response.json();
      return data.documents || [];
    },
    initialData: [],
  });

  const pendingFines = fines.filter((f) => f.status === "pending");
  const totalPendingFines = pendingFines.reduce(
    (sum, f) => sum + (f.amount || 0),
    0,
  );

  const updateMemberMutation = useMutation({
    mutationFn: async (data: Partial<Member>) => {
      if (!member?.id) throw new Error("Member não carregado");
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", user?.email] });
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil");
    },
  });

  const handleStartEdit = () => {
    if (!member || !user) {
      toast.error("Não foi possível carregar os dados do perfil.");
      return;
    }
    setEditForm({
      phone: member.phone || "",
      preferred_notification: member.preferred_notification || "email",
    });
    setIsEditing(true);
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (authState === "unauth") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-semibold text-slate-800">
              Sessão não encontrada
            </h1>
            <p className="text-sm text-slate-600">
              Faça login para veres o teu perfil.
            </p>
            <div className="flex gap-2 justify-end">
              <Link to={createPageUrl("Home")}>
                <Button variant="outline">Voltar</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || memberLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-32 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl font-bold text-indigo-600">
                {user.full_name?.charAt(0) ||
                  user.email?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-slate-800">
                  {user.full_name || "Utilizador"}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {getUserTypeLabel(member?.member_type)}
                  </Badge>
                  {member?.activation_status === "ACTIVE" && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conta Ativa
                    </Badge>
                  )}
                  {member?.activation_status === "TRAINING_SCHEDULED" && (
                    <Badge className="bg-blue-100 text-blue-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Formação Agendada
                    </Badge>
                  )}
                  {member?.activation_status === "PENDING_TRAINING" && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Aguardando Formação
                    </Badge>
                  )}
                  {member?.activation_status === "PENDING_DOCUMENTS" && (
                    <Badge className="bg-orange-100 text-orange-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Documentos Pendentes
                    </Badge>
                  )}
                  {member?.is_blocked && (
                    <Badge className="bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Bloqueado
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowQRDialog(true)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Ver QR Code
                </Button>
                <Button onClick={handleStartEdit} disabled={!member}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs key={defaultTab} defaultValue={defaultTab}>
              <TabsList>
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="fines">
                  Multas ({pendingFines.length})
                </TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="mt-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6 space-y-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="+244 XXX XXX XXX"
                          />
                        </div>
                        <div>
                          <Label>Preferência de Notificação</Label>
                          <Select
                            value={editForm.preferred_notification}
                            onValueChange={(v) =>
                              setEditForm({
                                ...editForm,
                                preferred_notification: v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                              {getNotificationTypeOptions().map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() =>
                              updateMemberMutation.mutate(editForm)
                            }
                            disabled={updateMemberMutation.isPending}
                          >
                            {updateMemberMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Email</p>
                              <p className="font-medium text-slate-800">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Phone className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Telefone</p>
                              <p className="font-medium text-slate-800">
                                {member?.phone || "Não informado"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">
                                Matrícula/Nº
                              </p>
                              <p className="font-medium text-slate-800">
                                {member?.registration_number || "N/A"}
                              </p>
                            </div>
                          </div>
                          {member?.course && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Curso</p>
                                <p className="font-medium text-slate-800">
                                  {member.course}
                                </p>
                              </div>
                            </div>
                          )}
                          {member?.department && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">
                                  Departamento
                                </p>
                                <p className="font-medium text-slate-800">
                                  {member.department}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Bell className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">
                                Notificações via
                              </p>
                              <p className="font-medium text-slate-800">
                                {getNotificationTypeLabel(
                                  member?.preferred_notification,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-slate-800 mb-3">
                            Limites de Empréstimo
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-indigo-600">
                                {member?.max_books ||
                                  getLoanLimits(member?.member_type).maxBooks}
                              </p>
                              <p className="text-xs text-slate-500">
                                Livros máximo
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-indigo-600">
                                {member?.loan_days ||
                                  getLoanLimits(member?.member_type).loanDays}
                              </p>
                              <p className="text-xs text-slate-500">
                                Dias por empréstimo
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="fines" className="mt-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {pendingFines.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          Sem multas pendentes
                        </h3>
                        <p className="text-slate-500">
                          Continue assim! Você não tem nenhuma multa a pagar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm text-red-700">
                              Total pendente
                            </p>
                            <p className="text-2xl font-bold text-red-800">
                              {totalPendingFines.toLocaleString("pt-AO", {
                                style: "currency",
                                currency: "AOA",
                              })}
                            </p>
                          </div>
                          <Button className="bg-red-600 hover:bg-red-700">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar Todas
                          </Button>
                        </div>

                        {pendingFines.map((fine) => {
                          const d =
                            toDate(fine.generated_at) ??
                            toDate(fine.created_date) ??
                            new Date();
                          return (
                            <div
                              key={fine.id}
                              className="p-4 border border-slate-200 rounded-lg"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {fine.type === "late_return" &&
                                      "Atraso na devolução"}
                                    {fine.type === "locker_overtime" &&
                                      "Excesso de tempo no cacifo"}
                                    {fine.type === "lost_credential" &&
                                      "Perda de credencial"}
                                    {fine.type === "damaged_book" &&
                                      "Livro danificado"}
                                    {fine.type === "lost_book" &&
                                      "Livro perdido"}
                                    {!fine.type && "Multa"}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {format(d, "dd/MM/yyyy")}
                                  </p>
                                  {fine.reason && (
                                    <p className="text-sm text-slate-600 mt-1">
                                      {fine.reason}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-red-600">
                                    {fine.amount?.toLocaleString("pt-AO", {
                                      style: "currency",
                                      currency: "AOA",
                                    })}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                  >
                                    Pagar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="documents" className="mt-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Meus Documentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentsManager
                      documents={documents}
                      userType={member?.member_type}
                      onDocumentsChange={() => refetchDocuments()}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="qrcode" className="mt-6">
                <QRCodeDisplay />
              </TabsContent>
              <TabsContent value="stats" className="mt-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <BookOpen className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-indigo-700">
                          {loans.length}
                        </p>
                        <p className="text-sm text-indigo-600">
                          Total de empréstimos
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-emerald-700">
                          {loans.filter((l) => l.status === "returned").length}
                        </p>
                        <p className="text-sm text-emerald-600">Devolvidos</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-purple-700">
                          {loans.filter((l) => l.status === "active").length}
                        </p>
                        <p className="text-sm text-purple-600">Em andamento</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-800">
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("MyLoans")} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Meus Empréstimos
                  </Button>
                </Link>
                <Link to={createPageUrl("MyReservations")} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="w-4 h-4 mr-2" />
                    Minhas Reservas
                  </Button>
                </Link>
                <Link to={createPageUrl("Notifications")} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="w-4 h-4 mr-2" />
                    Notificações
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {member?.is_blocked && (
              <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800">
                        Conta Bloqueada
                      </p>
                      <p className="text-sm text-red-700">
                        {member.blocked_reason ||
                          "Entre em contato com a biblioteca."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sua Credencial Digital</DialogTitle>
            <DialogDescription>
              Use este QR Code para identificação na biblioteca
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              {member?.qr_code ? (
                <Image
                  src={member.qr_code}
                  alt="QR Code"
                  width={192}
                  height={192}
                  className="w-full h-full object-contain"
                  unoptimized
                  loader={({ src }) => src}
                />
              ) : (
                <QrCode className="w-24 h-24 text-slate-400" />
              )}
            </div>
            <p className="text-sm text-slate-600 text-center">
              {user.full_name}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {member?.registration_number}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              disabled={!member?.qr_code}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
