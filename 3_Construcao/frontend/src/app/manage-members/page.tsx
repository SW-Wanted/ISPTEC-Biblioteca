"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { getUserTypeLabel, getUserStatusLabel } from "@/lib/user-helpers";
import { downloadCSV, type CSVColumn } from "@/lib/csv-export";
import { toast } from "sonner";

type MemberRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  user_id?: string | null;
  registration_number?: string | null;
  member_type?: string | null;
  status?: string | null;
  activation_status?: string | null;
  is_blocked?: boolean | null;
  total_fines?: number | null;
  created_date?: string | null;
} & Record<string, unknown>;

export default function ManageMembers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const loadUser = async () => {
      try {
        await api.auth.me();
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  const { data: members = [], isLoading } = useQuery<MemberRow[]>({
    queryKey: ["manage-members"],
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Erro ao buscar membros");
      return response.json();
    },
    initialData: [] as MemberRow[],
  });

  const getStatusBadge = (member: MemberRow) => {
    if (member.is_blocked)
      return <Badge className="bg-red-100 text-red-700">Bloqueado</Badge>;

    // Priorizar activation_status para status mais preciso
    const activationStatus = member.activation_status?.toUpperCase();

    switch (activationStatus) {
      case "ACTIVE":
        return <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>;
      case "TRAINING_SCHEDULED":
        return (
          <Badge className="bg-blue-100 text-blue-700">Formação Agendada</Badge>
        );
      case "PENDING_TRAINING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            Aguardando Formação
          </Badge>
        );
      case "PENDING_DOCUMENTS":
        return (
          <Badge className="bg-orange-100 text-orange-700">
            Documentos Pendentes
          </Badge>
        );
      default:
        const status = member.status?.toUpperCase();
        switch (status) {
          case "ACTIVE":
            return (
              <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
            );
          case "PENDING":
            return (
              <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>
            );
          case "INACTIVE":
            return <Badge className="bg-gray-100 text-gray-700">Inativo</Badge>;
          default:
            return <Badge className="bg-slate-100 text-slate-700">-</Badge>;
        }
    }
  };

  const filteredMembers = members.filter((member) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesEmail = member.email?.toLowerCase().includes(query);
      const matchesName = member.name?.toLowerCase().includes(query);
      const matchesReg = member.registration_number
        ?.toLowerCase()
        .includes(query);
      if (!matchesEmail && !matchesName && !matchesReg) return false;
    }

    if (filterType !== "all") {
      const memberTypeUpper = member.member_type?.toUpperCase();
      const filterTypeUpper = filterType.toUpperCase();
      if (memberTypeUpper !== filterTypeUpper) return false;
    }

    if (filterStatus !== "all") {
      if (filterStatus === "blocked" && !member.is_blocked) return false;
      if (filterStatus !== "blocked") {
        const activationStatus = member.activation_status?.toUpperCase();
        const status = member.status?.toUpperCase();
        const filterStatusUpper = filterStatus.toUpperCase();

        // Se filtrar por ACTIVE, aceitar activation_status ACTIVE ou status ACTIVE
        if (filterStatusUpper === "ACTIVE") {
          if (activationStatus !== "ACTIVE" && status !== "ACTIVE")
            return false;
        } else if (
          activationStatus !== filterStatusUpper &&
          status !== filterStatusUpper
        ) {
          return false;
        }
      }
    }
    return true;
  });

  const handleExport = () => {
    if (filteredMembers.length === 0) {
      toast.error("Sem dados para exportar");
      return;
    }

    const date = new Date().toISOString().split("T")[0];
    const filename = `membros-${date}.csv`;

    const columns: CSVColumn[] = [
      {
        key: "name",
        label: "Nome",
        formatter: (v) => String(v ?? "Sem nome"),
      },
      {
        key: "email",
        label: "Email",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "member_type",
        label: "Tipo",
        formatter: (v) => getUserTypeLabel(String(v ?? "")),
      },
      {
        key: "activation_status",
        label: "Status",
        formatter: (_v, row) => {
          const activation = String(row.activation_status ?? "");
          const status = String(row.status ?? "");
          return getUserStatusLabel(activation || status);
        },
      },
      {
        key: "registration_number",
        label: "Matrícula",
        formatter: (v) => String(v ?? ""),
      },
      {
        key: "is_blocked",
        label: "Bloqueado",
        formatter: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "total_fines",
        label: "Total Multas (Kz)",
        formatter: (v) => {
          const n = Number(v ?? 0);
          return Number.isFinite(n) ? n.toLocaleString("pt-AO") : "0";
        },
      },
      {
        key: "created_date",
        label: "Cadastro",
        formatter: (v) => {
          if (!v) return "";
          const d = new Date(String(v));
          return Number.isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy");
        },
      },
    ];

    downloadCSV(filteredMembers, columns, { filename });
    toast.success("CSV exportado com sucesso");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-600" />
              Gestão de Membros
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredMembers.length === members.length
                ? `${members.length} membro(s) cadastrado(s)`
                : `${filteredMembers.length} de ${members.length} membro(s)`}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-50 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por nome, email ou matrícula..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="STUDENT">Estudantes</SelectItem>
                  <SelectItem value="TEACHER">Docentes</SelectItem>
                  <SelectItem value="STAFF">Funcionários</SelectItem>
                  <SelectItem value="LIBRARIAN">Bibliotecários</SelectItem>
                  <SelectItem value="CATALOGER">Catalogadores</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisores</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="BLOCKED">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-10 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhum membro encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => {
                    return (
                      <TableRow key={member.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-medium text-indigo-600">
                              {member.name?.charAt(0)?.toUpperCase() ||
                                member.email?.charAt(0)?.toUpperCase() ||
                                "U"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {member.name || "Sem nome"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {getUserTypeLabel(member.member_type)}
                                {member.registration_number &&
                                  ` • ${member.registration_number}`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {member.email}
                        </TableCell>
                        <TableCell>{getStatusBadge(member)}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {member.created_date &&
                            format(new Date(member.created_date), "dd/MM/yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
