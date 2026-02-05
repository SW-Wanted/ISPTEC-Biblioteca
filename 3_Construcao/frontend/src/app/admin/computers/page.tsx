"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Computer, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ComputerRow = {
  id: string;
  number?: string | number | null;
  location?: string | null;
  status?: string | null;
};

type ComputerSessionRow = {
  id: string;
  computer_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  start_time?: string | null;
  expected_end?: string | null;
  end_time?: string | null;
};

function statusBadge(status?: string) {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Disponivel</Badge>
      );
    case "occupied":
      return <Badge className="bg-blue-100 text-blue-700">Ocupado</Badge>;
    case "maintenance":
      return <Badge className="bg-slate-100 text-slate-700">Manutencao</Badge>;
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Erro ao carregar dados");
  }
  return (await res.json()) as T;
}

export default function AdminComputersPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingComputer, setEditingComputer] = useState<ComputerRow | null>(
    null,
  );
  const [createForm, setCreateForm] = useState({
    number: "",
    location: "",
    status: "available",
  });
  const [editForm, setEditForm] = useState({
    number: "",
    location: "",
    status: "available",
  });

  const { data: computers = [], isLoading: isLoadingComputers } = useQuery<
    ComputerRow[]
  >({
    queryKey: ["admin-computers"],
    queryFn: () => fetchJson<ComputerRow[]>("/api/entities/Computer"),
    initialData: [],
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<
    ComputerSessionRow[]
  >({
    queryKey: ["admin-computer-sessions"],
    queryFn: () =>
      fetchJson<ComputerSessionRow[]>(
        "/api/entities/ComputerSession?filter=" +
          encodeURIComponent(JSON.stringify({ endTime: null })),
      ),
    initialData: [],
  });

  const sessionsByComputer = useMemo(() => {
    const map = new Map<string, ComputerSessionRow>();
    for (const session of sessions) {
      if (session.computer_id) {
        map.set(session.computer_id, session);
      }
    }
    return map;
  }, [sessions]);

  const releaseMutation = useMutation({
    mutationFn: async (computerId: string) => {
      const res = await fetch(`/api/computers/${computerId}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao libertar computador");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-computers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-computer-sessions"] });
      toast.success("Computador libertado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao libertar computador");
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (computerId: string) => {
      const res = await fetch(`/api/computers/${computerId}/renew`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao renovar sessao");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-computer-sessions"] });
      toast.success("Sessao renovada");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao renovar sessao");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/entities/Computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: createForm.number,
          location: createForm.location,
          status: createForm.status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao adicionar computador");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-computers"] });
      setShowCreateDialog(false);
      setCreateForm({ number: "", location: "", status: "available" });
      toast.success("Computador adicionado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao adicionar computador");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingComputer?.id) return;
      const res = await fetch(`/api/entities/Computer/${editingComputer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: editForm.number,
          location: editForm.location,
          status: editForm.status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao actualizar computador");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-computers"] });
      setShowEditDialog(false);
      setEditingComputer(null);
      toast.success("Computador actualizado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao actualizar computador");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (computerId: string) => {
      const res = await fetch(`/api/entities/Computer/${computerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao eliminar computador");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-computers"] });
      toast.success("Computador eliminado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao eliminar computador");
    },
  });

  const summary = useMemo(() => {
    const total = computers.length;
    const available = computers.filter((c) => c.status === "available").length;
    const occupied = computers.filter((c) => c.status === "occupied").length;
    const maintenance = computers.filter(
      (c) => c.status === "maintenance",
    ).length;
    return { total, available, occupied, maintenance };
  }, [computers]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Computer className="w-7 h-7 text-indigo-600" />
              Gestao de Computadores
            </h1>
            <p className="text-slate-500 mt-1">
              {summary.occupied} ocupado(s) • {summary.available} disponivel(is)
              • {summary.maintenance} em manutencao
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar computador
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Total: {summary.total}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">
              Disponiveis: {summary.available}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              Ocupados: {summary.occupied}
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              Manutencao: {summary.maintenance}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Computador</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Termino</TableHead>
                  <TableHead className="text-right">Accoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoadingComputers || isLoadingSessions) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      A carregar...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingComputers && computers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Nenhum computador encontrado
                      <div className="mt-3">
                        <Button
                          size="sm"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar computador
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {computers.map((computer) => {
                  const session = computer.id
                    ? sessionsByComputer.get(computer.id)
                    : undefined;
                  const canAct = computer.status === "occupied" && session;
                  const canEdit = computer.status !== "occupied";
                  const canDelete = computer.status !== "occupied";
                  const userLabel =
                    session?.user_name ||
                    session?.user_email ||
                    session?.user_id ||
                    "—";
                  const endLabel = session?.expected_end
                    ? new Date(session.expected_end).toLocaleTimeString(
                        "pt-AO",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "—";

                  return (
                    <TableRow key={computer.id}>
                      <TableCell>
                        <div className="font-medium">{computer.number}</div>
                      </TableCell>
                      <TableCell>{computer.location ?? "—"}</TableCell>
                      <TableCell>
                        {statusBadge(computer.status ?? "")}
                      </TableCell>
                      <TableCell>{userLabel}</TableCell>
                      <TableCell>{endLabel}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct || renewMutation.isPending}
                            onClick={() =>
                              computer.id && renewMutation.mutate(computer.id)
                            }
                          >
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            disabled={!canAct || releaseMutation.isPending}
                            onClick={() =>
                              computer.id && releaseMutation.mutate(computer.id)
                            }
                          >
                            Libertar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEdit}
                            onClick={() => {
                              setEditingComputer(computer);
                              setEditForm({
                                number: String(computer.number ?? ""),
                                location: String(computer.location ?? ""),
                                status: computer.status ?? "available",
                              });
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!canDelete || deleteMutation.isPending}
                            onClick={() => {
                              if (!computer.id) return;
                              if (
                                !window.confirm(
                                  "Eliminar este computador? Esta acao nao pode ser desfeita.",
                                )
                              ) {
                                return;
                              }
                              deleteMutation.mutate(computer.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => setShowCreateDialog(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar computador</DialogTitle>
            <DialogDescription>
              Registe um novo computador para uso na biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Numero</Label>
              <Input
                value={createForm.number}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    number: e.target.value,
                  }))
                }
                placeholder="Ex: 12"
              />
            </div>
            <div>
              <Label>Localizacao</Label>
              <Input
                value={createForm.location}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="Ex: Sala 1"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={createForm.status}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponivel</SelectItem>
                  <SelectItem value="maintenance">Manutencao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !createForm.number}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingComputer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar computador</DialogTitle>
            <DialogDescription>
              Actualize os dados do computador seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Numero</Label>
              <Input
                value={editForm.number}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    number: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Localizacao</Label>
              <Input
                value={editForm.location}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponivel</SelectItem>
                  <SelectItem value="maintenance">Manutencao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editForm.number}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
