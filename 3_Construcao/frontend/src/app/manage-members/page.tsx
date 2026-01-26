"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Users, Search, Edit2, Ban, CheckCircle, MoreHorizontal, Loader2, Filter, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

type MemberRow = {
  id: string;
  user_id?: string | null;
  registration_number?: string | null;
  member_type?: string | null;
  status?: string | null;
  is_blocked?: boolean | null;
  total_fines?: number | null;
  created_date?: string | null;
} & Record<string, unknown>;

export default function ManageMembers() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: members = [], isLoading } = useQuery<MemberRow[]>({
    queryKey: ['manage-members'],
    queryFn: () => api.entities.Member.list('-created_date', 200),
    initialData: [] as MemberRow[],
  });

  const getMemberTypeLabel = (type: MemberRow['member_type']) => { switch (type) { case 'student': return 'Estudante'; case 'teacher': return 'Docente'; case 'staff': return 'Funcionário'; case 'librarian': return 'Bibliotecário'; default: return type ?? '-'; } };
  const getMemberTypeColor = (type: MemberRow['member_type']) => { switch (type) { case 'student': return 'bg-blue-100 text-blue-700'; case 'teacher': return 'bg-purple-100 text-purple-700'; default: return 'bg-slate-100 text-slate-700'; } };
  const getStatusBadge = (member: MemberRow) => { if (member.is_blocked) return <Badge className="bg-red-100 text-red-700">Bloqueado</Badge>; switch (member.status) { case 'active': return <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>; case 'pending': return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>; default: return null; } };

  const filteredMembers = members.filter((member) => {
    if (searchQuery) { const query = searchQuery.toLowerCase(); const matchesName = member.user_id?.toLowerCase().includes(query); const matchesReg = member.registration_number?.toLowerCase().includes(query); if (!matchesName && !matchesReg) return false; }
    if (filterType !== 'all' && member.member_type !== filterType) return false;
    if (filterStatus !== 'all') { if (filterStatus === 'blocked' && !member.is_blocked) return false; if (filterStatus !== 'blocked' && member.status !== filterStatus) return false; }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Users className="w-7 h-7 text-indigo-600" />Gestão de Membros</h1><p className="text-slate-500 mt-1">{members.length} membro(s) cadastrado(s)</p></div>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
        </div>

        <Card className="border-0 shadow-sm mb-6"><CardContent className="p-4"><div className="flex flex-wrap gap-4"><div className="flex-1 min-w-50 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input placeholder="Pesquisar por email ou matrícula..." value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} className="pl-10" /></div><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="student">Estudantes</SelectItem><SelectItem value="teacher">Docentes</SelectItem><SelectItem value="staff">Funcionários</SelectItem></SelectContent></Select><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="blocked">Bloqueados</SelectItem></SelectContent></Select></div></CardContent></Card>

        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>Tipo</TableHead><TableHead>Matrícula/Nº</TableHead><TableHead>Status</TableHead><TableHead>Multas</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader><TableBody>{isLoading ? Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-10 w-48" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell></TableRow>) : filteredMembers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Nenhum membro encontrado</p></TableCell></TableRow> : filteredMembers.map((member) => { const totalFines = member.total_fines ?? 0; return (<TableRow key={member.id} className="group"><TableCell><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-medium text-indigo-600">{member.user_id?.charAt(0)?.toUpperCase() || 'U'}</div><div><p className="font-medium text-slate-800">{member.user_id}</p></div></div></TableCell><TableCell><Badge className={getMemberTypeColor(member.member_type)}>{getMemberTypeLabel(member.member_type)}</Badge></TableCell><TableCell className="font-mono text-sm text-slate-600">{member.registration_number || '-'}</TableCell><TableCell>{getStatusBadge(member)}</TableCell><TableCell>{totalFines > 0 ? <span className="text-red-600 font-medium">{totalFines.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span> : <span className="text-slate-400">-</span>}</TableCell><TableCell className="text-sm text-slate-500">{member.created_date && format(new Date(member.created_date), 'dd/MM/yyyy')}</TableCell></TableRow>); })}</TableBody></Table></CardContent></Card>
      </div>
    </div>
  );
}