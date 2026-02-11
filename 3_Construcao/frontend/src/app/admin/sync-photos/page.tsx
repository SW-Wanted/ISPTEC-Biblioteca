"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PhotoStats {
  total: number;
  withPhoto: number;
  withoutPhoto: number;
  percentage: number;
}

interface UserWithoutPhoto {
  id: string;
  email: string;
  name: string;
  type: string;
  lastLoginAt: string | null;
}

export default function SyncPhotosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [users, setUsers] = useState<UserWithoutPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Redirecionar se não for supervisor
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.type !== "SUPERVISOR") {
      router.push("/");
    }
  }, [session, status, router]);

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sync-google-photos");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  // Carregar usuários sem foto
  const loadUsers = async () => {
    try {
      const response = await fetch("/api/members?withoutPhoto=true");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  useEffect(() => {
    if (session?.user?.type === "SUPERVISOR") {
      loadStats();
      loadUsers();
    }
  }, [session]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/sync-google-photos", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await loadStats();
        await loadUsers();
      } else {
        toast.error("Erro ao sincronizar fotos");
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar fotos");
    } finally {
      setSyncing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session?.user || session.user.type !== "SUPERVISOR") {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Sincronização de Fotos do Google
          </h1>
          <p className="text-slate-600 mt-2">
            Gerencie as fotos de perfil dos usuários que fazem login com Google
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-400" />
                <span className="text-2xl font-bold">{stats?.total ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Com Foto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-600">
                  {stats?.withPhoto ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Sem Foto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold text-amber-600">
                  {stats?.withoutPhoto ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Percentagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">
                  {stats?.percentage ?? 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informação */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Captura Automática:</strong> Quando um usuário faz login com Google,
              o sistema captura automaticamente a foto do perfil do Google.
            </p>
            <p>
              <strong>Atualização:</strong> Se o usuário já existe mas não tem foto,
              a foto será adicionada no próximo login.
            </p>
            <p>
              <strong>Preservação:</strong> Se o usuário já tem uma foto (do Cloudinary ou Google),
              ela não será substituída automaticamente.
            </p>
          </CardContent>
        </Card>

        {/* Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronizar Fotos</CardTitle>
            <CardDescription>
              As fotos serão atualizadas automaticamente no próximo login de cada usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="w-full sm:w-auto"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Sincronização
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de usuários sem foto */}
        {users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Usuários Sem Foto ({users.length})</CardTitle>
              <CardDescription>
                Estes usuários terão suas fotos atualizadas no próximo login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-slate-200 text-slate-600">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.type}</Badge>
                      {user.lastLoginAt ? (
                        <span className="text-xs text-slate-500">
                          Último login: {new Date(user.lastLoginAt).toLocaleDateString("pt-PT")}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Nunca fez login</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
