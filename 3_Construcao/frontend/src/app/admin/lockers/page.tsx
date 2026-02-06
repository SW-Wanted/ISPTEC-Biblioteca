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
import { KeyRound, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type LockerRow = {
  id: string;
  number?: string | number | null;
  location?: string | null;
  status?: string | null;
};

type LockerRentalRow = {
  id: string;
  locker_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  start_time?: string | null;
  expected_end?: string | null;
  end_time?: string | null;
};

type LockerReservationRow = {
  id: string;
  locker_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  status?: string | null;
  requested_at?: string | null;
};

function statusBadge(status?: string) {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Disponivel</Badge>
      );
    case "occupied":
      return <Badge className="bg-blue-100 text-blue-700">Ocupado</Badge>;
    case "reserved":
      return <Badge className="bg-amber-100 text-amber-700">Reservado</Badge>;
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

export default function AdminLockersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLocker, setEditingLocker] = useState<LockerRow | null>(null);
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

  const { data: lockers = [], isLoading: isLoadingLockers } = useQuery<
    LockerRow[]
  >({
    queryKey: ["admin-lockers"],
    queryFn: () => fetchJson<LockerRow[]>("/api/entities/Locker"),
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: rentals = [], isLoading: isLoadingRentals } = useQuery<
    LockerRentalRow[]
  >({
    queryKey: ["admin-locker-rentals"],
    queryFn: () =>
      fetchJson<LockerRentalRow[]>(
        "/api/entities/LockerRental?filter=" +
          encodeURIComponent(JSON.stringify({ endTime: null })),
      ),
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: reservations = [], isLoading: isLoadingReservations } =
    useQuery<LockerReservationRow[]>({
      queryKey: ["admin-locker-reservations"],
      queryFn: () =>
        fetchJson<LockerReservationRow[]>(
          "/api/entities/LockerReservation?filter=" +
            encodeURIComponent(JSON.stringify({ status: "pending" })),
        ),
      initialData: [],
      refetchInterval: 10000,
    });

  const rentalsByLocker = useMemo(() => {
    const map = new Map<string, LockerRentalRow>();
    for (const rental of rentals) {
      if (rental.locker_id) {
        map.set(rental.locker_id, rental);
      }
    }
    return map;
  }, [rentals]);

  const reservationsByLocker = useMemo(() => {
    const map = new Map<string, LockerReservationRow>();
    for (const reservation of reservations) {
      if (reservation.locker_id) {
        map.set(reservation.locker_id, reservation);
      }
    }
    return map;
  }, [reservations]);

  const filteredLockers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return lockers;
    return lockers.filter((locker) => {
      const rental = locker.id ? rentalsByLocker.get(locker.id) : undefined;
      const reservation = locker.id
        ? reservationsByLocker.get(locker.id)
        : undefined;
      const haystack = [
        locker.number,
        locker.location,
        locker.status,
        rental?.user_name,
        rental?.user_email,
        rental?.user_id,
        reservation?.user_name,
        reservation?.user_email,
        reservation?.user_id,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [lockers, searchQuery, rentalsByLocker, reservationsByLocker]);

  const releaseMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/lockers/${lockerId}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao libertar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locker-rentals"] });
      toast.success("Cacifo libertado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao libertar cacifo");
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/lockers/${lockerId}/renew`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao renovar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locker-rentals"] });
      toast.success("Cacifo renovado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao renovar cacifo");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/lockers/${lockerId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao aceitar reserva");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locker-rentals"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-locker-reservations"],
      });
      toast.success("Reserva aceite");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao aceitar reserva");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/lockers/${lockerId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao rejeitar reserva");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-locker-reservations"],
      });
      toast.success("Reserva rejeitada");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao rejeitar reserva");
    },
  });

  const summary = useMemo(() => {
    const total = lockers.length;
    const available = lockers.filter((l) => l.status === "available").length;
    const reserved = lockers.filter((l) => l.status === "reserved").length;
    const occupied = lockers.filter((l) => l.status === "occupied").length;
    const maintenance = lockers.filter(
      (l) => l.status === "maintenance",
    ).length;
    return { total, available, reserved, occupied, maintenance };
  }, [lockers]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/entities/Locker", {
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
        throw new Error(body?.error ?? "Erro ao adicionar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      setShowCreateDialog(false);
      setCreateForm({ number: "", location: "", status: "available" });
      toast.success("Cacifo adicionado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao adicionar cacifo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLocker?.id) return;
      const res = await fetch(`/api/entities/Locker/${editingLocker.id}`, {
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
        throw new Error(body?.error ?? "Erro ao actualizar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      setShowEditDialog(false);
      setEditingLocker(null);
      toast.success("Cacifo actualizado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao actualizar cacifo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lockerId: string) => {
      const res = await fetch(`/api/entities/Locker/${lockerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao eliminar cacifo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lockers"] });
      toast.success("Cacifo eliminado");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Erro ao eliminar cacifo");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <KeyRound className="w-7 h-7 text-indigo-600" />
              Gestao de Cacifos
            </h1>
            <p className="text-slate-500 mt-1">
              {summary.occupied} ocupado(s) • {summary.reserved} reservado(s) •{" "}
              {summary.available} disponivel(is) • {summary.maintenance} em
              manutencao
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-full sm:w-64">
              <Label>Pesquisar</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Numero, localizacao ou utilizador"
              />
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar cacifo
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Total: {summary.total}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">
              Disponiveis: {summary.available}
            </Badge>
            <Badge className="bg-amber-100 text-amber-700">
              Reservados: {summary.reserved}
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
                  <TableHead>Cacifo</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Termino</TableHead>
                  <TableHead className="text-right">Accoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoadingLockers ||
                  isLoadingRentals ||
                  isLoadingReservations) && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-14" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {!isLoadingLockers && filteredLockers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      {lockers.length === 0
                        ? "Nenhum cacifo encontrado"
                        : "Nenhum resultado para a pesquisa"}
                      {lockers.length === 0 && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => setShowCreateDialog(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar cacifo
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {filteredLockers.map((locker) => {
                  const rental = locker.id
                    ? rentalsByLocker.get(locker.id)
                    : undefined;
                  const reservation = locker.id
                    ? reservationsByLocker.get(locker.id)
                    : undefined;
                  const canAct = locker.status === "occupied" && rental;
                  const canAccept = locker.status === "reserved" && reservation;
                  const canEdit =
                    locker.status === "available" ||
                    locker.status === "maintenance";
                  const canDelete = canEdit;
                  const userLabel =
                    rental?.user_name ||
                    rental?.user_email ||
                    rental?.user_id ||
                    reservation?.user_name ||
                    reservation?.user_email ||
                    reservation?.user_id ||
                    "—";
                  const endLabel = rental?.expected_end
                    ? new Date(rental.expected_end).toLocaleTimeString(
                        "pt-AO",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : reservation
                      ? "Aguardando"
                      : "—";

                  return (
                    <TableRow key={locker.id}>
                      <TableCell>
                        <div className="font-medium">{locker.number}</div>
                      </TableCell>
                      <TableCell>{locker.location ?? "—"}</TableCell>
                      <TableCell>{statusBadge(locker.status ?? "")}</TableCell>
                      <TableCell>{userLabel}</TableCell>
                      <TableCell>{endLabel}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canAccept && locker.id && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acceptMutation.isPending}
                                onClick={() => acceptMutation.mutate(locker.id)}
                              >
                                Aceitar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={rejectMutation.isPending}
                                onClick={() => rejectMutation.mutate(locker.id)}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct || renewMutation.isPending}
                            onClick={() =>
                              locker.id && renewMutation.mutate(locker.id)
                            }
                          >
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            disabled={!canAct || releaseMutation.isPending}
                            onClick={() =>
                              locker.id && releaseMutation.mutate(locker.id)
                            }
                          >
                            Libertar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEdit}
                            onClick={() => {
                              setEditingLocker(locker);
                              setEditForm({
                                number: String(locker.number ?? ""),
                                location: String(locker.location ?? ""),
                                status: locker.status ?? "available",
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
                              if (!locker.id) return;
                              if (
                                !window.confirm(
                                  "Eliminar este cacifo? Esta acao nao pode ser desfeita.",
                                )
                              ) {
                                return;
                              }
                              deleteMutation.mutate(locker.id);
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
            <DialogTitle>Adicionar cacifo</DialogTitle>
            <DialogDescription>
              Registe um novo cacifo para a biblioteca.
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
                placeholder="Ex: Biblioteca principal"
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
          if (!open) setEditingLocker(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cacifo</DialogTitle>
            <DialogDescription>
              Actualize os dados do cacifo seleccionado.
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
