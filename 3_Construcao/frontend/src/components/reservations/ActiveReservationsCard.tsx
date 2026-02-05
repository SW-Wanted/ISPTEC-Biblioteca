"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, Monitor, Clock, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveReservation {
  type: "locker" | "computer";
  id: string;
  resourceId?: string;
  number: string;
  location: string;
  startTime: string;
  expectedEnd: string;
  remainingMinutes: number;
}

async function postAction(url: string): Promise<void> {
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Erro ao processar acao");
  }
}

export function ActiveReservationsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["active-reservations"],
    queryFn: async () => {
      const reservations: ActiveReservation[] = [];

      try {
        // Buscar cacifos ativos
        const lockersRes = await fetch(
          "/api/entities/LockerRental?filter=" +
            encodeURIComponent(JSON.stringify({ endTime: null })),
        );
        if (lockersRes.ok) {
          const lockersData = await lockersRes.json();

          // Processar cacifos
          const rentals = Array.isArray(lockersData)
            ? lockersData
            : (lockersData.data ?? []);
          if (rentals.length > 0) {
            for (const rental of rentals) {
              const expectedEndRaw =
                rental.expected_end ?? rental.expectedEnd ?? null;
              const startTimeRaw =
                rental.start_time ?? rental.startTime ?? null;
              const now = new Date();
              const expectedEnd = expectedEndRaw
                ? new Date(expectedEndRaw)
                : new Date();
              const remainingMs = expectedEnd.getTime() - now.getTime();
              const remainingMinutes = Math.max(
                0,
                Math.floor(remainingMs / 60000),
              );

              reservations.push({
                type: "locker",
                id: rental.id,
                resourceId: rental.locker_id ?? rental.lockerId,
                number: rental.locker_number || "N/A",
                location: rental.locker_location || "Biblioteca",
                startTime: startTimeRaw
                  ? String(startTimeRaw)
                  : new Date().toISOString(),
                expectedEnd: expectedEndRaw
                  ? String(expectedEndRaw)
                  : new Date().toISOString(),
                remainingMinutes,
              });
            }
          }
        }
      } catch (error) {
        console.warn("LockerRental API não disponível:", error);
      }

      try {
        // Buscar sessões de computador ativas
        const computersRes = await fetch(
          "/api/entities/ComputerSession?filter=" +
            encodeURIComponent(JSON.stringify({ endTime: null })),
        );
        if (computersRes.ok) {
          const computersData = await computersRes.json();

          // Processar computadores
          const sessions = Array.isArray(computersData)
            ? computersData
            : (computersData.data ?? []);
          if (sessions.length > 0) {
            for (const session of sessions) {
              const expectedEndRaw =
                session.expected_end ?? session.expectedEnd ?? null;
              const startTimeRaw =
                session.start_time ?? session.startTime ?? null;
              const startTimeRaw =
                session.start_time ?? session.startTime ?? null;
              const now = new Date();
              const expectedEnd = expectedEndRaw
                ? new Date(expectedEndRaw)
                : new Date();
              const remainingMs = expectedEnd.getTime() - now.getTime();
              const remainingMinutes = Math.max(
                0,
                Math.floor(remainingMs / 60000),
              );

              reservations.push({
                type: "computer",
                id: session.id,
                resourceId: session.computer_id ?? session.computerId,
                number: session.computer_number || "N/A",
                location: session.computer_location || "Sala de Informatica",
                startTime: startTimeRaw
                startTime: startTimeRaw
                  ? String(startTimeRaw)
                  : new Date().toISOString(),
                expectedEnd: expectedEndRaw
                  ? String(expectedEndRaw)
                  : new Date().toISOString(),
                remainingMinutes,
              });
            }
          }
        }
      } catch (error) {
        console.warn("ComputerSession API não disponível:", error);
      }

      return reservations;
    },
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Minhas Reservas Ativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const reservations = data || [];

  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Minhas Reservas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Você não tem reservas ativas no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {reservations[0].type === "locker" ? (
            <KeyRound className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
          Minhas Reservas Ativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reservations.map((reservation) => {
          const isOvertime = reservation.remainingMinutes <= 0;
          const isClosing = reservation.remainingMinutes <= 30 && !isOvertime;

          return (
            <div
              key={reservation.id}
              className={`border rounded-lg p-4 ${
                isOvertime
                  ? "border-destructive bg-destructive/5"
                  : isClosing
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {reservation.type === "locker" ? (
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {reservation.type === "locker" ? "Cacifo" : "Computador"}{" "}
                      {reservation.number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.location}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    isOvertime
                      ? "destructive"
                      : isClosing
                        ? "secondary"
                        : "default"
                  }
                >
                  {isOvertime
                    ? "Tempo esgotado!"
                    : `${reservation.remainingMinutes}min restantes`}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>
                    Início:{" "}
                    {new Date(reservation.startTime).toLocaleTimeString(
                      "pt-AO",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>
                    Término:{" "}
                    {new Date(reservation.expectedEnd).toLocaleTimeString(
                      "pt-AO",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
              </div>

              {isOvertime && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Multa aplicada! Devolva o mais rápido possível.
                </p>
              )}

              {reservation.type === "locker" && reservation.resourceId && (
              {reservation.type === "locker" && reservation.resourceId && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void postAction(
                        `/api/lockers/${reservation.resourceId}/renew`,
                      )
                    }
                  >
                    Renovar
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void postAction(
                        `/api/lockers/${reservation.resourceId}/release`,
                      )
                    }
                  >
                    Libertar
                  </button>
                </div>
              )}

              {reservation.type === "computer" && reservation.resourceId && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void postAction(
                        `/api/computers/${reservation.resourceId}/renew`,
                      )
                    }
                  >
                    Renovar
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void postAction(
                        `/api/computers/${reservation.resourceId}/release`,
                      )
                    }
                  >
                    Libertar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
