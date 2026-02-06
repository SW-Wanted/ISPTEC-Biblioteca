"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SpecialRequest } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluida",
  cancelled: "Cancelada",
};

const TYPE_LABELS: Record<string, string> = {
  bibliography: "Levantamento Bibliografico",
  cataloging: "Catalogacao na Fonte",
  training: "Formacao",
};

function statusBadge(status?: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-100 text-blue-700">Em andamento</Badge>;
    case "completed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Concluida</Badge>
      );
    case "cancelled":
      return <Badge className="bg-slate-100 text-slate-700">Cancelada</Badge>;
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
}

function normalizeStatus(status?: string): string {
  return (status ?? "").toLowerCase();
}

export default function SpecialRequestsAdminPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(
    null,
  );
  const [responseText, setResponseText] = useState("");

  const { data: requests = [], isLoading } = useQuery<SpecialRequest[]>({
    queryKey: ["special-requests"],
    queryFn: () => api.entities.SpecialRequest.list(),
    initialData: [],
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: string;
      response?: string | null;
    }) => {
      await api.entities.SpecialRequest.update(payload.id, {
        status: payload.status,
        response: payload.response ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-requests"] });
      toast.success("Solicitacao actualizada");
      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setResponseText("");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao actualizar solicitacao");
    },
  });

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      const status = req.status ?? "";
      const matchesStatus =
        filterStatus === "all" ? true : status === filterStatus;
      const haystack = `${req.title ?? ""} ${req.description ?? ""} ${
        req.user_name ?? ""
      }`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, filterStatus, search]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600" />
            Solicitacoes Especiais
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie pedidos de levantamento bibliografico, catalogacao e
            formacao
          </p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:w-72">
                <Label>Pesquisar</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Titulo, descricao ou utilizador"
                />
              </div>
              <div className="w-full md:w-52">
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em andamento</SelectItem>
                    <SelectItem value="completed">Concluida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell>
                          <Skeleton className="h-5 w-32 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40 mb-1" />
                          <Skeleton className="h-3 w-56" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      Nenhuma solicitacao encontrada
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPE_LABELS[req.type ?? ""] ?? req.type ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {req.title}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {req.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{req.user_name ?? "—"}</div>
                      <div className="text-xs text-slate-500">
                        {req.user_id ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const status = normalizeStatus(req.status);
                        const canAccept = status === "pending";
                        const canComplete = status === "in_progress";
                        const canCancel =
                          status === "pending" || status === "in_progress";
                        const canReopen = status === "cancelled";

                        return (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: req.id,
                                  status: "in_progress",
                                })
                              }
                              disabled={!canAccept || updateMutation.isPending}
                            >
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(req);
                                setResponseText(req.response ?? "");
                                setResponseDialogOpen(true);
                              }}
                              disabled={
                                !canComplete || updateMutation.isPending
                              }
                            >
                              Concluir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: req.id,
                                  status: "cancelled",
                                })
                              }
                              disabled={!canCancel || updateMutation.isPending}
                            >
                              Cancelar
                            </Button>
                            {canReopen && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: req.id,
                                    status: "pending",
                                  })
                                }
                                disabled={updateMutation.isPending}
                              >
                                Reabrir
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={responseDialogOpen}
        onOpenChange={(open) => {
          setResponseDialogOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setResponseText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir solicitacao</DialogTitle>
            <DialogDescription>
              Registe a resposta que sera enviada ao utilizador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resposta</Label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResponseDialogOpen(false)}
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (!selectedRequest) return;
                updateMutation.mutate({
                  id: selectedRequest.id,
                  status: "completed",
                  response: responseText || null,
                });
              }}
              disabled={updateMutation.isPending}
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
