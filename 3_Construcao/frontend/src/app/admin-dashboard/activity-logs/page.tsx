"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"

interface ActivityLog {
  id: string
  userId: string | null
  user: {
    id: string
    name: string
    email: string
    type: string
  } | null
  action: string
  entity: string
  entityId: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface ActivityLogsResponse {
  logs: ActivityLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action: "",
    entity: "",
    userId: "",
    startDate: "",
    endDate: "",
  })

  const { data, isLoading, error } = useQuery<ActivityLogsResponse>({
    queryKey: ["activity-logs", page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(filters.action && { action: filters.action }),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const response = await fetch(`/api/activity-logs?${params}`)
      if (!response.ok) {
        throw new Error("Falha ao carregar logs de atividade")
      }
      return response.json()
    },
  })

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      action: "",
      entity: "",
      userId: "",
      startDate: "",
      endDate: "",
    })
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Logs de Atividade</h1>
        <p className="text-muted-foreground mt-2">
          Visualize o histórico de ações críticas no sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-lg font-semibold">Filtros</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Ação</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="LOAN_CREATED">Empréstimo Criado</option>
              <option value="LOAN_RETURNED">Empréstimo Devolvido</option>
              <option value="LOAN_RENEWED">Empréstimo Renovado</option>
              <option value="RESERVATION_CREATED">Reserva Criada</option>
              <option value="RESERVATION_CANCELLED">Reserva Cancelada</option>
              <option value="FINE_PAID">Multa Paga</option>
              <option value="FINE_WAIVED">Multa Isenta</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Entidade</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={filters.entity}
              onChange={(e) => handleFilterChange("entity", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="LOAN">Empréstimo</option>
              <option value="RESERVATION">Reserva</option>
              <option value="FINE">Multa</option>
              <option value="BOOK">Livro</option>
              <option value="USER">Utilizador</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">ID do Utilizador</label>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              placeholder="ID do utilizador"
              value={filters.userId}
              onChange={(e) => handleFilterChange("userId", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Data Início</label>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Data Fim</label>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading && (
        <div className="text-center py-8">
          <p>Carregando logs...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
          <p>Erro ao carregar logs: {error instanceof Error ? error.message : "Erro desconhecido"}</p>
        </div>
      )}

      {data && (
        <>
          {/* Tabela de Logs */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Utilizador</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ação</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Entidade</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.user ? (
                          <div>
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-xs text-muted-foreground">{log.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.entity}</td>
                      <td className="px-4 py-3 text-sm">{log.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.ipAddress || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * 50 + 1} a {Math.min(page * 50, data.pagination.total)} de{" "}
                {data.pagination.total} registos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-input bg-background px-4 py-2 disabled:opacity-50 hover:bg-accent"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm">
                    Página {page} de {data.pagination.totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="rounded-md border border-input bg-background px-4 py-2 disabled:opacity-50 hover:bg-accent"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
