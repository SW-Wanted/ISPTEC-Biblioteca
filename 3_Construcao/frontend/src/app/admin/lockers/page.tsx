"use client";

import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function AdminLockersPage() {
  const queryClient = useQueryClient();

  const { data: lockers = [], isLoading: isLoadingLockers } = useQuery<
    LockerRow[]
  >({
    queryKey: ["admin-lockers"],
    queryFn: () => fetchJson<LockerRow[]>("/api/entities/Locker"),
    initialData: [],
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

  const summary = useMemo(() => {
    const total = lockers.length;
    const available = lockers.filter((l) => l.status === "available").length;
    const occupied = lockers.filter((l) => l.status === "occupied").length;
    const maintenance = lockers.filter(
      (l) => l.status === "maintenance",
    ).length;
    return { total, available, occupied, maintenance };
  }, [lockers]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Cacifos</CardTitle>
          </CardHeader>
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
                  <TableHead>Cacifo</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Termino</TableHead>
                  <TableHead className="text-right">Accoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoadingLockers || isLoadingRentals) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      A carregar...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingLockers && lockers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Nenhum cacifo encontrado
                    </TableCell>
                  </TableRow>
                )}
                {lockers.map((locker) => {
                  const rental = locker.id
                    ? rentalsByLocker.get(locker.id)
                    : undefined;
                  const canAct = locker.status === "occupied" && rental;
                  const userLabel =
                    rental?.user_name ||
                    rental?.user_email ||
                    rental?.user_id ||
                    "—";
                  const endLabel = rental?.expected_end
                    ? new Date(rental.expected_end).toLocaleTimeString(
                        "pt-AO",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
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
    </div>
  );
}
