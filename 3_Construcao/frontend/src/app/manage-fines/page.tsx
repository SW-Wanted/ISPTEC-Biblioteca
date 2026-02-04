"use client";

import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import type { Fine as FineBase } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DollarSign, Search, CheckCircle, XCircle, MoreHorizontal, Loader2, Filter, Download, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { downloadCSV, type CSVColumn } from "@/lib/csv-export";

type FineRow = FineBase & {
  member_id?: string;
  member_name?: string;
  type?: string;
  reason?: string;
  generated_at?: string;
  paid_at?: string;
  waived_by?: string;
  waiver_reason?: string;
  payment_method?: string;
  payment_reference?: string;
};

export default function ManageFines() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'waived'>('pending');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [selectedFine, setSelectedFine] = useState<FineRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [waiverReason, setWaiverReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        window.location.href = createPageUrl('Home');
      }
    };
    loadUser();
  }, []);

  const { data: fines = [], isLoading } = useQuery<FineRow[]>({ 
    queryKey: ['manage-fines'], 
    queryFn: async () => (await api.entities.Fine.list('-created_date', 200)) as FineRow[], 
    initialData: [] as FineRow[] 
  });

  const pendingFines = fines.filter(f => f.status === 'pending');
  const paidFines = fines.filter(f => f.status === 'paid');
  const waivedFines = fines.filter(f => f.status === 'waived' || f.status === 'cancelled');

  const totalPending = pendingFines.reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalPaid = paidFines.reduce((sum, f) => sum + (f.amount || 0), 0);

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const fine = selectedFine;
      if (!fine?.id) throw new Error('Nenhuma multa selecionada');

      await api.entities.Fine.update(fine.id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_reference: paymentReference
      });

      await api.entities.Notification.create({
        user_id: fine.member_id,
        type: 'in_app',
        status: 'pending',
        title: 'Pagamento confirmado',
        message: `Seu pagamento de ${fine.amount?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} foi confirmado.`,
        action_type: 'none'
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manage-fines'] });
      setShowPaymentDialog(false);
      setSelectedFine(null);
      setPaymentMethod('cash');
      setPaymentReference('');
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: () => { toast.error('Erro ao registrar pagamento'); }
  });

  const waiveFinesMutation = useMutation({
    mutationFn: async () => {
      const fine = selectedFine;
      const actorEmail = user?.email;
      if (!fine?.id) throw new Error('Nenhuma multa selecionada');
      if (!actorEmail) throw new Error('Utilizador não autenticado');

      await api.entities.Fine.update(fine.id, {
        status: 'waived',
        waived_by: actorEmail,
        waiver_reason: waiverReason
      });

      await api.entities.Notification.create({
        user_id: fine.member_id,
        type: 'in_app',
        status: 'pending',
        title: 'Multa dispensada',
        message: `Sua multa de ${fine.amount?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} foi dispensada. Motivo: ${waiverReason}`,
        action_type: 'none'
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manage-fines'] });
      setShowWaiverDialog(false);
      setSelectedFine(null);
      setWaiverReason('');
      toast.success('Multa dispensada com sucesso!');
    },
    onError: () => { toast.error('Erro ao dispensar multa'); }
  });

  const getFineTypeLabel = (type?: string) => {
    switch (type) {
      case 'late_return': return 'Atraso na devolução';
      case 'damaged_book': return 'Livro danificado';
      case 'lost_book': return 'Livro perdido';
      case 'locker_overtime': return 'Excesso de tempo no cacifo';
      case 'lost_credential': return 'Perda de credencial';
      default: return type;
    }
  };

  const getFineStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'paid':
        return 'Pago';
      case 'waived':
        return 'Dispensado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status ?? '';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>;
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-700">Pago</Badge>;
      case 'waived': return <Badge className="bg-slate-100 text-slate-700">Dispensado</Badge>;
      case 'cancelled': return <Badge className="bg-slate-100 text-slate-700">Cancelado</Badge>;
      default: return null;
    }
  };

  const filteredFines = (finesList: FineRow[]) => {
    return finesList.filter(fine => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!fine.member_name?.toLowerCase().includes(query) && 
            !fine.member_id?.toLowerCase().includes(query)) return false;
      }
      if (filterType !== 'all' && fine.type !== filterType) return false;
      return true;
    });
  };

  const handleExport = () => {
    const baseList = activeTab === 'pending' ? pendingFines : activeTab === 'paid' ? paidFines : waivedFines;
    const rows = filteredFines(baseList);

    if (rows.length === 0) {
      toast.error('Não há multas para exportar com os filtros atuais');
      return;
    }

    const tabLabel = activeTab === 'pending' ? 'pendentes' : activeTab === 'paid' ? 'pagas' : 'dispensadas';
    const filename = `multas-${tabLabel}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;

    const columns: CSVColumn[] = [
      {
        key: 'member_id',
        label: 'ID do Membro',
        formatter: (v) => String(v ?? ''),
      },
      {
        key: 'member_id',
        label: 'Nome do Membro',
        formatter: (_v, row) => String(row.member_name ?? row.member_id ?? ''),
      },
      {
        key: 'type',
        label: 'Tipo',
        formatter: (v) => getFineTypeLabel(String(v ?? '')) ?? '',
      },
      {
        key: 'amount',
        label: 'Valor (AOA)',
        formatter: (v) => {
          const n = Number(v ?? 0);
          return Number.isFinite(n) ? n.toLocaleString('pt-AO') : '0';
        },
      },
      {
        key: 'status',
        label: 'Status',
        formatter: (v) => getFineStatusLabel(String(v ?? '')),
      },
      {
        key: 'created_date',
        label: 'Data',
        formatter: (_v, row) => {
          const dateStr = String(row.generated_at ?? row.created_date ?? '');
          if (!dateStr) return '';
          const d = new Date(dateStr);
          return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM/yyyy');
        },
      },
      {
        key: 'reason',
        label: 'Motivo',
        formatter: (v) => String(v ?? ''),
      },
      {
        key: 'paid_at',
        label: 'Pago em',
        formatter: (v) => {
          if (!v) return '';
          const d = new Date(String(v));
          return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM/yyyy');
        },
      },
      {
        key: 'payment_method',
        label: 'Método de Pagamento',
        formatter: (v) => String(v ?? ''),
      },
      {
        key: 'payment_reference',
        label: 'Referência',
        formatter: (v) => String(v ?? ''),
      },
      {
        key: 'waived_by',
        label: 'Dispensado por',
        formatter: (v) => String(v ?? ''),
      },
      {
        key: 'waiver_reason',
        label: 'Motivo da Dispensa',
        formatter: (v) => String(v ?? ''),
      },
    ];

    downloadCSV(rows, columns, { filename });
    toast.success('CSV exportado com sucesso');
  };

  const FineRow = ({ fine }: { fine: FineRow }) => (
    <TableRow className="group">
      <TableCell>
        <div>
          <p className="font-medium text-slate-800">{fine.member_name || fine.member_id}</p>
          <p className="text-xs text-slate-500">{fine.member_id}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{getFineTypeLabel(fine.type)}</Badge>
      </TableCell>
      <TableCell className="font-semibold text-slate-800">
        {fine.amount?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
      </TableCell>
      <TableCell>{getStatusBadge(fine.status)}</TableCell>
      <TableCell className="text-slate-600 text-sm">
        {(() => {
          const dateStr = fine.generated_at ?? fine.created_date;
          if (!dateStr) return '-';
          return format(new Date(dateStr), 'dd/MM/yyyy');
        })()}
      </TableCell>
      <TableCell className="text-slate-500 text-sm max-w-50 truncate">
        {fine.reason || '-'}
      </TableCell>
      <TableCell>
        {fine.status === 'pending' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelectedFine(fine); setShowPaymentDialog(true); }}>
                <CreditCard className="w-4 h-4 mr-2" />
                Registrar Pagamento
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedFine(fine); setShowWaiverDialog(true); }}>
                <XCircle className="w-4 h-4 mr-2" />
                Dispensar Multa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-indigo-600" />
              Gestão de Multas
            </h1>
            <p className="text-slate-500 mt-1">{pendingFines.length} multa(s) pendente(s)</p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {totalPending.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">{pendingFines.length} multa(s)</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-emerald-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700">Arrecadado</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {totalPaid.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">{paidFines.length} pagamento(s)</p>
                </div>
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-slate-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">Dispensadas</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{waivedFines.length}</p>
                  <p className="text-xs text-slate-600 mt-1">multa(s)</p>
                </div>
                <XCircle className="w-10 h-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-50 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  placeholder="Pesquisar por membro..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10" 
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo de multa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="late_return">Atraso na devolução</SelectItem>
                  <SelectItem value="damaged_book">Livro danificado</SelectItem>
                  <SelectItem value="lost_book">Livro perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'paid' | 'waived')}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Pendentes ({pendingFines.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              <CheckCircle className="w-4 h-4 mr-2" />
              Pagas ({paidFines.length})
            </TabsTrigger>
            <TabsTrigger value="waived">
              <XCircle className="w-4 h-4 mr-2" />
              Dispensadas ({waivedFines.length})
            </TabsTrigger>
          </TabsList>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <TabsContent value="pending" className="m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredFines(pendingFines).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                          <p className="text-slate-500">Nenhuma multa pendente</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFines(pendingFines).map(fine => <FineRow key={fine.id} fine={fine} />)
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="paid" className="m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFines(paidFines).map(fine => <FineRow key={fine.id} fine={fine} />)}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="waived" className="m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFines(waivedFines).map(fine => <FineRow key={fine.id} fine={fine} />)}
                  </TableBody>
                </Table>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Confirme o pagamento da multa de {selectedFine?.member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Valor da multa:</span>
                <span className="text-xl font-bold text-slate-800">
                  {selectedFine?.amount?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                </span>
              </div>
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="multicaixa">Multicaixa Express</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referência / Comprovante (opcional)</Label>
              <Input 
                value={paymentReference} 
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Nº do recibo ou referência"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button onClick={() => markAsPaidMutation.mutate()} disabled={markAsPaidMutation.isPending}>
              {markAsPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiver Dialog */}
      <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar Multa</DialogTitle>
            <DialogDescription>
              Esta ação irá cancelar a multa de {selectedFine?.member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Atenção</span>
              </div>
              <p className="text-sm text-amber-600">
                Valor: {selectedFine?.amount?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
              </p>
            </div>
            <div>
              <Label>Motivo da dispensa *</Label>
              <Textarea 
                value={waiverReason} 
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="Explique o motivo da dispensa..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaiverDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => waiveFinesMutation.mutate()} 
              disabled={waiveFinesMutation.isPending || !waiverReason.trim()}
              variant="destructive"
            >
              {waiveFinesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Dispensar Multa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}