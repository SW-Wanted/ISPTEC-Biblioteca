"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/settings-labels";
import { Search, Download, X, Filter } from "lucide-react";
import { toast } from "sonner";

// Tipos de log
type UnifiedLogEntry = {
  id: string;
  timestamp: Date;
  category:
    | "Configurações"
    | "Empréstimos"
    | "Catalogação"
    | "Multas"
    | "Reservas"
    | "Sistema";
  type: string; // Ex: "FINE_CONFIG", "LOAN_CREATED", "CATALOG_ENTRY_APPROVED"
  action: string; // Descrição da ação
  userName: string;
  userEmail: string;
  details?: string | Record<string, unknown>;
};

// Mapear categorias baseado no tipo de atividade
function getCategoryFromType(
  type: string | null | undefined,
): UnifiedLogEntry["category"] {
  if (!type) return "Sistema";

  if (
    type.includes("LOAN") ||
    type.includes("RENEWAL") ||
    type.includes("RETURN")
  ) {
    return "Empréstimos";
  }
  if (type.includes("FINE")) {
    return "Multas";
  }
  if (type.includes("RESERVATION") || type.includes("RESERVE")) {
    return "Reservas";
  }
  if (
    type.includes("CATALOG") ||
    type.includes("BOOK") ||
    type.includes("COPY")
  ) {
    return "Catalogação";
  }
  if (
    type.includes("FINE_CONFIG") ||
    type.includes("LOAN_POLICY") ||
    type.includes("SYSTEM_POLICY")
  ) {
    return "Configurações";
  }
  return "Sistema";
}

// Função para exportar logs em CSV
function exportToCSV(logs: UnifiedLogEntry[]) {
  const headers = [
    "Data/Hora",
    "Categoria",
    "Tipo",
    "Ação",
    "Utilizador",
    "Email",
    "Detalhes",
  ];
  const csvContent = [
    headers.join(","),
    ...logs.map((log) => {
      const details =
        typeof log.details === "object"
          ? JSON.stringify(log.details).replace(/"/g, '""')
          : (log.details || "").replace(/"/g, '""');

      return [
        formatDate(log.timestamp),
        log.category,
        log.type,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.userName.replace(/"/g, '""')}"`,
        log.userEmail,
        `"${details}"`,
      ].join(",");
    }),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `logs-auditoria-${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Exportados ${logs.length} registros`);
}

export function ConsolidatedAuditLogs() {
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch Audit Logs (Configurações)
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const res = await fetch("/api/settings/audit-log?limit=50");
      if (!res.ok) throw new Error("Erro ao carregar histórico");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch Activity Logs (Operações do Sistema)
  const { data: activityLogsData, isLoading: activityLogsLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const res = await fetch("/api/activity-logs?limit=100");
      if (!res.ok) throw new Error("Erro ao carregar logs de atividade");
      return res.json();
    },
    staleTime: 1 * 60 * 1000,
  });

  // Consolidar logs em um único array
  const unifiedLogs = useMemo<UnifiedLogEntry[]>(() => {
    const logs: UnifiedLogEntry[] = [];

    // Adicionar audit logs (configurações)
    if (auditData?.audits) {
      auditData.audits.forEach((audit: unknown) => {
        logs.push({
          id: audit.id,
          timestamp: new Date(audit.changedAt),
          category: "Configurações",
          type: audit.configKey || "CONFIG_CHANGE",
          action: `Alteração: ${audit.configKey}${audit.reason ? " — " + audit.reason : ""}`,
          userName: audit.changedBy?.name || "Desconhecido",
          userEmail: audit.changedBy?.email || "—",
          details: audit.reason,
        });
      });
    }

    // Adicionar activity logs (operações)
    if (activityLogsData?.logs) {
      activityLogsData.logs.forEach((log: unknown) => {
        logs.push({
          id: log.id,
          timestamp: new Date(log.createdAt),
          category: getCategoryFromType(log.type),
          type: log.type || "UNKNOWN",
          action: log.action || "—",
          userName: log.userName || "Desconhecido",
          userEmail: log.userEmail || "—",
          details:
            log.metadata ||
            `${log.entityType || ""}${log.entityId ? ` (${log.entityId})` : ""}`,
        });
      });
    }

    // Ordenar por data (mais recente primeiro)
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [auditData, activityLogsData]);

  // Aplicar filtros
  const filteredLogs = useMemo(() => {
    let filtered = unifiedLogs;

    // Filtro de categoria
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Filtro de usuário (por email)
    if (selectedUserId.trim()) {
      const search = selectedUserId.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userEmail?.toLowerCase().includes(search) ||
          log.userName?.toLowerCase().includes(search),
      );
    }

    // Pesquisa global
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action?.toLowerCase().includes(search) ||
          log.type?.toLowerCase().includes(search) ||
          log.userName?.toLowerCase().includes(search) ||
          log.userEmail?.toLowerCase().includes(search) ||
          (typeof log.details === "string" &&
            log.details?.toLowerCase().includes(search)),
      );
    }

    return filtered;
  }, [unifiedLogs, selectedCategory, selectedUserId, searchQuery]);

  const isLoading = auditLoading || activityLogsLoading;

  // Limpar filtros
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedUserId("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl">Auditoria</CardTitle>
            <CardDescription className="mt-2">
              Registro completo de alterações de configurações e operações
              críticas do sistema
            </CardDescription>
          </div>
          <Button
            onClick={() => exportToCSV(filteredLogs)}
            disabled={filteredLogs.length === 0}
            size="sm"
            variant="outline"
            className="ml-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Painel de Filtros */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Pesquisa global */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">
              Pesquisar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Tipo, ação, utilizador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filtro de categoria */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Categoria
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="Configurações">Configurações</SelectItem>
                <SelectItem value="Empréstimos">Empréstimos</SelectItem>
                <SelectItem value="Catalogação">Catalogação</SelectItem>
                <SelectItem value="Multas">Multas</SelectItem>
                <SelectItem value="Reservas">Reservas</SelectItem>
                <SelectItem value="Sistema">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de utilizador */}
          <div className="space-y-2">
            <Label htmlFor="user" className="text-sm font-medium">
              Utilizador
            </Label>
            <Input
              id="user"
              placeholder="Nome ou email..."
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            />
          </div>
        </div>

        {/* Botão limpar filtros */}
        {(searchQuery || selectedCategory !== "all" || selectedUserId) && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                {filteredLogs.length} de {unifiedLogs.length} registros
              </span>
            </div>
            <Button onClick={clearFilters} variant="ghost" size="sm">
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead className="w-[130px]">Categoria</TableHead>
                  <TableHead className="w-[200px]">Tipo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[200px]">Utilizador</TableHead>
                  <TableHead className="w-[150px]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-12"
                    >
                      {isLoading
                        ? "A carregar logs..."
                        : searchQuery ||
                            selectedCategory !== "all" ||
                            selectedUserId
                          ? "Nenhum log encontrado com os filtros aplicados"
                          : "Nenhum log de auditoria disponível"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap font-mono">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.category === "Configurações"
                              ? "default"
                              : log.category === "Empréstimos"
                                ? "secondary"
                                : log.category === "Multas"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.type}
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        <p className="truncate" title={log.action}>
                          {log.action}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{log.userName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {log.userEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {typeof log.details === "object" &&
                        log.details !== null &&
                        Object.keys(log.details).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:underline">
                              Ver JSON
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-[300px]">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : log.details ? (
                          <span
                            className="text-muted-foreground"
                            title={log.details as string}
                          >
                            {(log.details as string).substring(0, 30)}
                            {(log.details as string).length > 30 ? "..." : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Info de resultados */}
            {filteredLogs.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  A mostrar {filteredLogs.length} registro
                  {filteredLogs.length !== 1 ? "s" : ""}
                </span>
                {unifiedLogs.length >= 100 && (
                  <span className="text-xs">
                    (Limitado aos 100 registos mais recentes)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
