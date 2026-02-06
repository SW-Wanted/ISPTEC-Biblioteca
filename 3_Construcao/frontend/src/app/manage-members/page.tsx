"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Search,
  Download,
  MoreHorizontal,
  ShieldOff,
  UserX,
  UserCog,
  BadgeDollarSign,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Estudante",
  TEACHER: "Docente",
  STAFF: "Funcionário",
  LIBRARIAN: "Bibliotecário",
  CATALOGER: "Catalogador",
  SUPERVISOR: "Supervisor",
};

export default function ManageMembers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialog states
  const [blockDialog, setBlockDialog] = useState(false);
  const [fineDialog, setFineDialog] = useState(false);
  const [roleDialog, setRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [fineType, setFineType] = useState("OTHER");
  const [newRole, setNewRole] = useState("");

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
    refetchInterval: 30000,
  });

  // Admin action mutation
  const adminAction = useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/members/${memberId}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar acção");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manage-members"] });
      toast.success(data.message || "Acção realizada com sucesso");
      closeDialogs();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function closeDialogs() {
    setBlockDialog(false);
    setFineDialog(false);
    setRoleDialog(false);
    setSelectedMember(null);
    setBlockReason("");
    setFineAmount("");
    setFineReason("");
    setFineType("OTHER");
    setNewRole("");
  }

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

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
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
          const filterStatusUpper = filterStatus.toUpperCase();

          // Priorizar activation_status — é mais preciso que status
          if (filterStatusUpper === "ACTIVE") {
            // Só mostrar se activation_status é ACTIVE
            if (activationStatus !== "ACTIVE") return false;
          } else if (activationStatus !== filterStatusUpper) {
            return false;
          }
        }
      }
      return true;
    });
  }, [members, searchQuery, filterType, filterStatus]);

  const summary = useMemo(() => {
    const total = members.length;
    const active = members.filter(
      (m) => m.activation_status?.toUpperCase() === "ACTIVE",
    ).length;
    const blocked = members.filter((m) => m.is_blocked).length;
    const pending = members.filter((m) => {
      const s = m.activation_status?.toUpperCase();
      return (
        s === "PENDING_DOCUMENTS" ||
        s === "PENDING_TRAINING" ||
        s === "TRAINING_SCHEDULED"
      );
    }).length;
    return { total, active, blocked, pending };
  }, [members]);

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
              {summary.total} membro(s) • {summary.active} ativo(s) •{" "}
              {summary.pending} pendente(s) • {summary.blocked} bloqueado(s)
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="PENDING_DOCUMENTS">
                    Documentos Pendentes
                  </SelectItem>
                  <SelectItem value="PENDING_TRAINING">
                    Aguardando Formação
                  </SelectItem>
                  <SelectItem value="TRAINING_SCHEDULED">
                    Formação Agendada
                  </SelectItem>
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
                  <TableHead>Cargo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Multas</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
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
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-24 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhum membro encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => {
                    const isBlocked = !!member.is_blocked;
                    const isActive =
                      member.activation_status?.toUpperCase() === "ACTIVE";
                    const fines = Number(member.total_fines ?? 0);

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
                              {member.registration_number && (
                                <p className="text-xs text-slate-500">
                                  {member.registration_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[
                              member.member_type?.toUpperCase() ?? ""
                            ] ||
                              member.member_type ||
                              "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(member)}</TableCell>
                        <TableCell>
                          {fines > 0 ? (
                            <span className="text-sm font-medium text-red-600">
                              {fines.toLocaleString("pt-AO")} Kz
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">0 Kz</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {member.created_date &&
                            format(new Date(member.created_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isActive && !isBlocked && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    adminAction.mutate({
                                      memberId: member.id,
                                      payload: { action: "activate" },
                                    })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                                  Activar conta
                                </DropdownMenuItem>
                              )}
                              {isActive && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    adminAction.mutate({
                                      memberId: member.id,
                                      payload: { action: "deactivate" },
                                    })
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2 text-slate-600" />
                                  Desactivar conta
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {!isBlocked ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setBlockDialog(true);
                                  }}
                                >
                                  <Ban className="h-4 w-4 mr-2 text-red-600" />
                                  Bloquear
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    adminAction.mutate({
                                      memberId: member.id,
                                      payload: { action: "unblock" },
                                    })
                                  }
                                >
                                  <ShieldOff className="h-4 w-4 mr-2 text-emerald-600" />
                                  Desbloquear
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member);
                                  setNewRole(
                                    member.member_type?.toUpperCase() ?? "",
                                  );
                                  setRoleDialog(true);
                                }}
                              >
                                <UserCog className="h-4 w-4 mr-2 text-indigo-600" />
                                Alterar cargo
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member);
                                  setFineDialog(true);
                                }}
                              >
                                <BadgeDollarSign className="h-4 w-4 mr-2 text-amber-600" />
                                Aplicar multa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Block Dialog */}
      <Dialog
        open={blockDialog}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
          else setBlockDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Bloquear {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>
              O membro não poderá usar a biblioteca enquanto estiver bloqueado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo do bloqueio *</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Multas pendentes, violação do regulamento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!blockReason.trim() || adminAction.isPending}
              onClick={() => {
                if (!selectedMember) return;
                adminAction.mutate({
                  memberId: selectedMember.id,
                  payload: { action: "block", reason: blockReason },
                });
              }}
            >
              {adminAction.isPending ? "A processar..." : "Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog
        open={roleDialog}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
          else setRoleDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-indigo-600" />
              Alterar cargo de {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>
              Cargo actual:{" "}
              {ROLE_LABELS[selectedMember?.member_type?.toUpperCase() ?? ""] ||
                "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo cargo</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Estudante</SelectItem>
                  <SelectItem value="TEACHER">Docente</SelectItem>
                  <SelectItem value="STAFF">Funcionário</SelectItem>
                  <SelectItem value="LIBRARIAN">Bibliotecário</SelectItem>
                  <SelectItem value="CATALOGER">Catalogador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              Cancelar
            </Button>
            <Button
              disabled={
                !newRole ||
                newRole === selectedMember?.member_type?.toUpperCase() ||
                adminAction.isPending
              }
              onClick={() => {
                if (!selectedMember) return;
                adminAction.mutate({
                  memberId: selectedMember.id,
                  payload: { action: "change_role", newRole },
                });
              }}
            >
              {adminAction.isPending ? "A processar..." : "Alterar cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fine Dialog */}
      <Dialog
        open={fineDialog}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
          else setFineDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-amber-600" />
              Aplicar multa a {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>
              Multas pendentes actuais:{" "}
              {Number(selectedMember?.total_fines ?? 0).toLocaleString("pt-AO")}{" "}
              Kz
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de multa</Label>
              <Select value={fineType} onValueChange={setFineType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LATE_RETURN">
                    Devolução em atraso
                  </SelectItem>
                  <SelectItem value="DAMAGED_BOOK">Livro danificado</SelectItem>
                  <SelectItem value="LOST_BOOK">Livro perdido</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (Kz) *</Label>
              <Input
                type="number"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                placeholder="Ex: 500"
                min={1}
              />
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea
                value={fineReason}
                onChange={(e) => setFineReason(e.target.value)}
                placeholder="Descreva o motivo da multa..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              Cancelar
            </Button>
            <Button
              disabled={
                !fineAmount ||
                !fineReason.trim() ||
                Number(fineAmount) <= 0 ||
                adminAction.isPending
              }
              onClick={() => {
                if (!selectedMember) return;
                adminAction.mutate({
                  memberId: selectedMember.id,
                  payload: {
                    action: "apply_fine",
                    fineAmount: Number(fineAmount),
                    fineReason,
                    fineType,
                  },
                });
              }}
            >
              {adminAction.isPending ? "A processar..." : "Aplicar multa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
