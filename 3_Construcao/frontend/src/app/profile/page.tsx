"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
import { 
  validateMatricula, 
  validateTelefone, 
  validateEmailIsptec,
  formatTelefone,
  formatMatricula 
} from "@/lib/validation";
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
  Camera,
  ImageIcon,
  Trash2,
  X,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  name?: string | null;
  email?: string | null;
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
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_at?: string | null;
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
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando perfil...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const userEmailParam = searchParams.get("user"); // Email do usuário a visualizar
  const validTabs = ["info", "fines", "stats", "documents", "qrcode"];
  const defaultTab = validTabs.includes(tabParam || "") ? tabParam! : "info";

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    registration_number: string;
    phone: string;
    preferred_notification: string;
  }>({
    name: "",
    registration_number: "",
    phone: "",
    preferred_notification: "push",
  });
  const [validationErrors, setValidationErrors] = useState<{
    registration_number?: string;
    phone?: string;
    email?: string;
  }>({});
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<
    "profile" | "cover" | null
  >(null);
  // Password management state
  const [passwordInfo, setPasswordInfo] = useState<{
    hasUserDefinedPassword: boolean;
    isGoogleOnly: boolean;
    isGoogleEligible: boolean;
    canChangePassword: boolean;
    canCreatePassword: boolean;
  } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Determinar qual email buscar: parâmetro da URL ou usuário logado
  const isViewingOtherProfile = !!userEmailParam;
  const targetEmail = userEmailParam || user?.email;

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
    queryKey: ["member", targetEmail],
    enabled: authState === "auth" && !!targetEmail,
    queryFn: async () => {
      // Ajusta para o teu endpoint real (ex.: /api/members/by-email)
      const url = `/api/members/by-email?email=${encodeURIComponent(targetEmail!)}`;
      return await safeJsonFetch<Member>(url);
    },
  });

  const { data: fines = [] } = useQuery<Fine[]>({
    queryKey: ["fines", targetEmail],
    enabled: authState === "auth" && !!targetEmail && !isViewingOtherProfile,
    queryFn: async () => {
      const url = `/api/fines?email=${encodeURIComponent(targetEmail!)}`;
      return (await safeJsonFetch<Fine[]>(url)) ?? [];
    },
    initialData: [],
  });

  const { data: loans = [] } = useQuery<Loan[]>({
    queryKey: ["all-loans", targetEmail],
    enabled: authState === "auth" && !!targetEmail && !isViewingOtherProfile,
    queryFn: async () => {
      const url = `/api/loans?email=${encodeURIComponent(targetEmail!)}`;
      return (await safeJsonFetch<Loan[]>(url)) ?? [];
    },
    initialData: [],
  });

  // Fetch password provider info
  const { data: passwordData } = useQuery({
    queryKey: ["password-info"],
    enabled: authState === "auth" && !isViewingOtherProfile,
    queryFn: async () => {
      const res = await fetch("/api/auth/password");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (passwordData) setPasswordInfo(passwordData);
  }, [passwordData]);

  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: async (payload: {
      action: string;
      currentPassword?: string;
      newPassword: string;
    }) => {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Senha atualizada!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordError("");
      queryClient.invalidateQueries({ queryKey: ["password-info"] });
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
      toast.error(err.message);
    },
  });

  const handlePasswordSubmit = () => {
    setPasswordError("");
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("As senhas não coincidem");
      return;
    }
    if (passwordInfo?.canChangePassword) {
      if (!passwordForm.currentPassword) {
        setPasswordError("Senha atual é obrigatória");
        return;
      }
      passwordMutation.mutate({
        action: "change",
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
    } else if (passwordInfo?.canCreatePassword) {
      passwordMutation.mutate({
        action: "create",
        newPassword: passwordForm.newPassword,
      });
    }
  };

  const { data: documents = [], refetch: refetchDocuments } = useQuery<any[]>({
    queryKey: ["user-documents", targetEmail],
    enabled: authState === "auth" && !isViewingOtherProfile,
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
      name: member.name || "",
      registration_number: member.registration_number || "",
      phone: member.phone || "",
      preferred_notification: member.preferred_notification || "push",
    });
    setIsEditing(true);
  };

  // ---- Image upload helper ----
  const handleImageUpload = async (
    file: File,
    field: "profileImageUrl" | "coverImageUrl",
  ) => {
    if (!member?.id) return;
    const which = field === "profileImageUrl" ? "profile" : "cover";
    setUploadingImage(which);
    try {
      // 1. Upload to Cloudinary via uploads API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Falha no upload");
      const uploadData = await uploadRes.json();
      const url = uploadData.url || uploadData.file_url;

      // 2. Save URL to user profile
      const patchRes = await fetch(`/api/members/${member.id}/profile-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, url }),
      });
      if (!patchRes.ok) throw new Error("Falha ao guardar imagem");

      queryClient.invalidateQueries({ queryKey: ["member", user?.email] });
      toast.success(
        which === "profile"
          ? "Foto de perfil atualizada!"
          : "Imagem de fundo atualizada!",
      );
    } catch {
      toast.error("Erro ao carregar imagem. Tente novamente.");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleRemoveImage = async (
    field: "profileImageUrl" | "coverImageUrl",
  ) => {
    if (!member?.id) return;
    const which = field === "profileImageUrl" ? "profile" : "cover";
    setUploadingImage(which);
    try {
      const res = await fetch(`/api/members/${member.id}/profile-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, url: null }),
      });
      if (!res.ok) throw new Error("Falha ao remover imagem");
      queryClient.invalidateQueries({ queryKey: ["member", user?.email] });
      toast.success("Imagem removida.");
    } catch {
      toast.error("Erro ao remover imagem.");
    } finally {
      setUploadingImage(null);
    }
  };

  const onFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "profileImageUrl" | "coverImageUrl",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem válido.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }
    handleImageUpload(file, field);
    e.target.value = "";
  };

  // ---- Account deletion ----
  const deleteAccountMutation = useMutation({
    mutationFn: async (action: "request_deletion" | "cancel_deletion") => {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar pedido");
      }
      return res.json();
    },
    onSuccess: (data, action) => {
      if (action === "request_deletion") {
        setDeletionPending(true);
        toast.success(data.message || "Pedido de eliminação registado.");
      } else {
        setDeletionPending(false);
        toast.success(data.message || "Pedido cancelado.");
      }
      queryClient.invalidateQueries({ queryKey: ["member", user?.email] });
      setShowDeleteAccountDialog(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Check if deletion is already pending
  useEffect(() => {
    if (member?.deletion_requested_at) {
      setDeletionPending(true);
    }
  }, [member?.deletion_requested_at]);

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-0 shadow-sm overflow-hidden">
          {/* ---- Cover image (LinkedIn-style) ---- */}
          <div className="relative h-32 sm:h-40 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 group/cover">
            {member?.cover_image_url && (
              <Image
                src={member.cover_image_url}
                alt="Capa"
                fill
                className="object-cover"
                unoptimized
                loader={({ src }) => src}
              />
            )}
            {/* Cover edit overlay */}
            {!isViewingOtherProfile && (
              <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/cover:opacity-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingImage === "cover"}
                    className="rounded-full bg-white/90 p-2 shadow hover:bg-white transition-colors"
                    title="Alterar imagem de fundo"
                  >
                    {uploadingImage === "cover" ? (
                      <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-700" />
                    )}
                  </button>
                  {member?.cover_image_url && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage("coverImageUrl")}
                      disabled={uploadingImage === "cover"}
                      className="rounded-full bg-white/90 p-2 shadow hover:bg-white transition-colors"
                      title="Remover imagem de fundo"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileSelected(e, "coverImageUrl")}
            />
          </div>

          <CardContent className="relative pt-0 pb-6">
            {/* Row: photo + badges (right) + action buttons (far right) */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              {/* Photo */}
              <div className="relative group/avatar shrink-0">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                  {member?.profile_image_url ? (
                    <Image
                      src={member.profile_image_url}
                      alt="Foto de perfil"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                      loader={({ src }) => src}
                    />
                  ) : (
                    <span className="text-3xl font-bold text-amber-600">
                      {(isViewingOtherProfile
                        ? member?.name
                        : user.full_name
                      )?.charAt(0) ||
                        (isViewingOtherProfile ? member?.email : user.email)
                          ?.charAt(0)
                          ?.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Avatar edit overlay */}
                {!isViewingOtherProfile && (
                  <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover/avatar:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover/avatar:opacity-100">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        disabled={uploadingImage === "profile"}
                        className="rounded-full bg-white/90 p-1.5 shadow hover:bg-white transition-colors"
                        title="Alterar foto de perfil"
                      >
                        {uploadingImage === "profile" ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        ) : (
                          <Camera className="w-4 h-4 text-slate-700" />
                        )}
                      </button>
                      {member?.profile_image_url && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("profileImageUrl")}
                          disabled={uploadingImage === "profile"}
                          className="rounded-full bg-white/90 p-1.5 shadow hover:bg-white transition-colors"
                          title="Remover foto de perfil"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileSelected(e, "profileImageUrl")}
                />
              </div>

              {/* Badges to the right of photo */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <Badge className="bg-amber-100 text-amber-700">
                  {getUserTypeLabel(member?.member_type)}
                </Badge>
                {member?.activation_status === "ACTIVE" &&
                  member?.status !== "INACTIVE" && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conta Ativa
                    </Badge>
                  )}
                {member?.status === "INACTIVE" && (
                  <Badge className="bg-gray-100 text-gray-700">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Conta Inativa
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

              <div className="flex-1" />
              {!isViewingOtherProfile && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowQRDialog(true)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Ver QR Code
                  </Button>
                  <Button onClick={handleStartEdit} disabled={!member}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              )}
            </div>

            {/* Name below the photo */}
            <h1 className="text-2xl font-bold text-slate-800 mt-3 text-center sm:text-left">
              {isViewingOtherProfile
                ? member?.name || "Utilizador"
                : user.full_name || "Utilizador"}
            </h1>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs key={defaultTab} defaultValue={defaultTab}>
              <TabsList>
                <TabsTrigger value="info">Informações</TabsTrigger>
                {!isViewingOtherProfile && (
                  <>
                    <TabsTrigger value="fines">
                      Multas ({pendingFines.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                    <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                    <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                  </>
                )}
              </TabsList>
              <TabsContent value="info" className="mt-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6 space-y-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Nome Completo</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="Nome completo"
                          />
                        </div>
                        <div>
                          <Label>Nº de Matrícula</Label>
                          <Input
                            value={editForm.registration_number}
                            onChange={(e) => {
                              const formatted = formatMatricula(e.target.value);
                              setEditForm({
                                ...editForm,
                                registration_number: formatted,
                              });
                              // Validar em tempo real
                              const validation = validateMatricula(formatted);
                              setValidationErrors(prev => ({
                                ...prev,
                                registration_number: validation.error
                              }));
                            }}
                            placeholder="Ex: 20230001"
                            maxLength={8}
                            className={validationErrors.registration_number ? "border-red-500" : ""}
                          />
                          {validationErrors.registration_number && (
                            <p className="text-xs text-red-500 mt-1">
                              {validationErrors.registration_number}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) => {
                              const formatted = formatTelefone(e.target.value);
                              setEditForm({
                                ...editForm,
                                phone: formatted,
                              });
                              // Validar em tempo real
                              const validation = validateTelefone(formatted);
                              setValidationErrors(prev => ({
                                ...prev,
                                phone: validation.error
                              }));
                            }}
                            placeholder="+244 933363523"
                            maxLength={13}
                            className={validationErrors.phone ? "border-red-500" : ""}
                          />
                          {validationErrors.phone && (
                            <p className="text-xs text-red-500 mt-1">
                              {validationErrors.phone}
                            </p>
                          )}
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
                        {/* Password Management Section */}
                        <Separator className="my-4" />
                        <div>
                          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-600" />
                            Segurança — Senha
                          </h4>

                          {passwordInfo?.isGoogleOnly ? (
                            // Cenário 1: Google-only
                            <div className="space-y-3">
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 mb-2">
                                  Está conectado via <strong>Google</strong>.
                                  Pode gerir a segurança da sua conta
                                  diretamente na sua Conta Google.
                                </p>
                                <a
                                  href="https://myaccount.google.com/security"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
                                >
                                  Gerir Conta Google
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <p className="text-xs text-slate-500">
                                Quer criar uma senha para login directo (sem
                                Google)?
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Transitar para cenário "criar senha"
                                  setPasswordInfo((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          isGoogleOnly: false,
                                          canCreatePassword: true,
                                        }
                                      : prev,
                                  );
                                }}
                              >
                                <Lock className="w-3.5 h-3.5 mr-1" />
                                Criar Senha Local
                              </Button>
                            </div>
                          ) : passwordInfo?.canCreatePassword ? (
                            // Cenário 2: Híbrido (criar senha nova sem pedir antiga)
                            <div className="space-y-3">
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                  Crie uma senha para poder fazer login
                                  directamente com email e senha, sem depender
                                  do Google.
                                </p>
                              </div>
                              <div>
                                <Label>Nova Senha</Label>
                                <div className="relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                      setPasswordForm((prev) => ({
                                        ...prev,
                                        newPassword: e.target.value,
                                      }))
                                    }
                                    placeholder="Mínimo 8 caracteres"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowNewPassword(!showNewPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <Label>Confirmar Senha</Label>
                                <div className="relative">
                                  <Input
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                      setPasswordForm((prev) => ({
                                        ...prev,
                                        confirmPassword: e.target.value,
                                      }))
                                    }
                                    placeholder="Repita a senha"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowConfirmPassword(
                                        !showConfirmPassword,
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {passwordError && (
                                <p className="text-sm text-red-600">
                                  {passwordError}
                                </p>
                              )}
                              <Button
                                size="sm"
                                onClick={handlePasswordSubmit}
                                disabled={passwordMutation.isPending}
                              >
                                {passwordMutation.isPending && (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                )}
                                Criar Senha
                              </Button>
                            </div>
                          ) : passwordInfo?.canChangePassword ? (
                            // Cenário 3: Tradicional (pedir senha atual)
                            <div className="space-y-3">
                              <div>
                                <Label>Senha Actual</Label>
                                <div className="relative">
                                  <Input
                                    type={
                                      showCurrentPassword ? "text" : "password"
                                    }
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                      setPasswordForm((prev) => ({
                                        ...prev,
                                        currentPassword: e.target.value,
                                      }))
                                    }
                                    placeholder="Introduza a senha actual"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowCurrentPassword(
                                        !showCurrentPassword,
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showCurrentPassword ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <Label>Nova Senha</Label>
                                <div className="relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                      setPasswordForm((prev) => ({
                                        ...prev,
                                        newPassword: e.target.value,
                                      }))
                                    }
                                    placeholder="Mínimo 8 caracteres"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowNewPassword(!showNewPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <Label>Confirmar Nova Senha</Label>
                                <div className="relative">
                                  <Input
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                      setPasswordForm((prev) => ({
                                        ...prev,
                                        confirmPassword: e.target.value,
                                      }))
                                    }
                                    placeholder="Repita a nova senha"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowConfirmPassword(
                                        !showConfirmPassword,
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {passwordError && (
                                <p className="text-sm text-red-600">
                                  {passwordError}
                                </p>
                              )}
                              <Button
                                size="sm"
                                onClick={handlePasswordSubmit}
                                disabled={passwordMutation.isPending}
                              >
                                {passwordMutation.isPending && (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                )}
                                Alterar Senha
                              </Button>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-500">
                                A carregar informação de segurança...
                              </p>
                            </div>
                          )}
                        </div>

                        <Separator className="my-4" />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setValidationErrors({});
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              // Validar todos os campos antes de salvar
                              const matriculaValidation = validateMatricula(editForm.registration_number);
                              const telefoneValidation = validateTelefone(editForm.phone);
                              
                              const errors: typeof validationErrors = {};
                              if (!matriculaValidation.valid) {
                                errors.registration_number = matriculaValidation.error;
                              }
                              if (!telefoneValidation.valid) {
                                errors.phone = telefoneValidation.error;
                              }
                              
                              setValidationErrors(errors);
                              
                              // Se houver erros, não submeter
                              if (Object.keys(errors).length > 0) {
                                return;
                              }
                              
                              updateMemberMutation.mutate(editForm);
                            }}
                            disabled={updateMemberMutation.isPending}
                          >
                            {updateMemberMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Salvar Perfil
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                              <Mail className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Email</p>
                              <p className="font-medium text-slate-800">
                                {isViewingOtherProfile
                                  ? member?.email || targetEmail
                                  : user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                              <Phone className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Telefone</p>
                              <p className="font-medium text-slate-800">
                                {member?.phone || "Não informado"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-amber-600" />
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
                              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-amber-600" />
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
                              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-amber-600" />
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
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                              <Bell className="w-5 h-5 text-amber-600" />
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
                              <p className="text-2xl font-bold text-amber-600">
                                {member?.max_books ||
                                  getLoanLimits(member?.member_type).maxBooks}
                              </p>
                              <p className="text-xs text-slate-500">
                                Livros máximo
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-amber-600">
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
                      <div className="p-4 bg-amber-50 rounded-lg text-center">
                        <BookOpen className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-amber-700">
                          {loans.length}
                        </p>
                        <p className="text-sm text-amber-600">
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
                      <div className="p-4 bg-orange-50 rounded-lg text-center">
                        <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-orange-700">
                          {loans.filter((l) => l.status === "active").length}
                        </p>
                        <p className="text-sm text-orange-600">Em andamento</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {!isViewingOtherProfile && (
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
            )}
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

            {/* Deletion pending banner */}
            {!isViewingOtherProfile &&
              deletionPending &&
              member?.deletion_scheduled_at && (
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-6 h-6 text-orange-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-orange-800">
                          Eliminação agendada
                        </p>
                        <p className="text-sm text-orange-700">
                          A sua conta será eliminada a{" "}
                          {format(
                            new Date(member.deletion_scheduled_at),
                            "dd/MM/yyyy",
                          )}
                          .
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                      disabled={deleteAccountMutation.isPending}
                      onClick={() =>
                        deleteAccountMutation.mutate("cancel_deletion")
                      }
                    >
                      {deleteAccountMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Cancelar eliminação
                    </Button>
                  </CardContent>
                </Card>
              )}

            {/* Delete account card */}
            {!deletionPending && !isViewingOtherProfile && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeleteAccountDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar conta
                  </Button>
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

      {/* Account deletion confirmation */}
      <AlertDialog
        open={showDeleteAccountDialog}
        onOpenChange={setShowDeleteAccountDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar conta
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Tem a certeza de que deseja eliminar a sua conta? Esta acção é
                irreversível após o período de carência.
              </span>
              <span className="block text-sm text-slate-500">
                A sua conta será desactivada imediatamente e eliminada
                definitivamente após o período de carência configurado pelo
                sistema. Pode cancelar o pedido a qualquer momento antes da
                eliminação efectiva.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteAccountMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteAccountMutation.mutate("request_deletion");
              }}
            >
              {deleteAccountMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar eliminação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
