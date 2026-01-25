"use client";

import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, isPast } from 'date-fns';
import { BookMarked, Search, CheckCircle, AlertTriangle, MoreHorizontal, Undo2, Loader2, Clock, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ManageLoans() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: loans = [], isLoading } = useQuery({ queryKey: ['manage-loans'], queryFn: () => api.entities.Loan.list('-loan_date', 200), initialData: [] });
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');
  const overdueLoans = activeLoans.filter(l => isPast(new Date(l.due_date)));
  const returnedLoans = loans.filter(l => l.status === 'returned');

  const returnLoanMutation = useMutation({
    mutationFn: async (loan) => {
      const isOverdue = isPast(new Date(loan.due_date));
      const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(loan.due_date)) : 0;
      const finePerDay = 100; const fineAmount = daysOverdue * finePerDay;
      await api.entities.Loan.update(loan.id, { status: 'returned', return_date: new Date().toISOString(), days_overdue: daysOverdue, fine_amount: fineAmount });
      const books = await api.entities.Book.filter({ id: loan.book_id });
      if (books[0]) await api.entities.Book.update(loan.book_id, { available_copies: (books[0].available_copies || 0) + 1 });
      if (fineAmount > 0) await api.entities.Fine.create({ member_id: loan.member_id, loan_id: loan.id, member_name: loan.member_name, type: 'late_return', amount: fineAmount, status: 'pending', reason: `Atraso de ${daysOverdue} dia(s) na devolução de "${loan.book_title}"`, generated_at: new Date().toISOString() });
    },
    onSuccess: () => { queryClient.invalidateQueries(['manage-loans']); setShowReturnDialog(false); setSelectedLoan(null); toast.success('Devolução registrada!'); },
    onError: () => { toast.error('Erro ao registrar devolução'); }
  });

  const getLoanStatus = (loan) => {
    if (loan.status === 'returned') return { label: 'Devolvido', color: 'bg-slate-100 text-slate-700' };
    if (isPast(new Date(loan.due_date))) { const days = differenceInDays(new Date(), new Date(loan.due_date)); return { label: `${days} dia(s) atraso`, color: 'bg-red-100 text-red-700' }; }
    const daysLeft = differenceInDays(new Date(loan.due_date), new Date());
    if (daysLeft <= 2) return { label: `${daysLeft} dia(s) restante(s)`, color: 'bg-orange-100 text-orange-700' };
    return { label: `${daysLeft} dias restantes`, color: 'bg-emerald-100 text-emerald-700' };
  };

  const filteredLoans = (loansList) => { if (!searchQuery) return loansList; const query = searchQuery.toLowerCase(); return loansList.filter(loan => loan.book_title?.toLowerCase().includes(query) || loan.member_name?.toLowerCase().includes(query) || loan.member_id?.toLowerCase().includes(query)); };

  const LoanRow = ({ loan }) => {
    const status = getLoanStatus(loan);
    return <TableRow className="group"><TableCell><div><p className="font-medium text-slate-800">{loan.book_title}</p><p className="text-xs text-slate-500">ID: {loan.copy_id}</p></div></TableCell><TableCell><div><p className="text-slate-800">{loan.member_name}</p><p className="text-xs text-slate-500">{loan.member_id}</p></div></TableCell><TableCell className="text-slate-600">{format(new Date(loan.loan_date), 'dd/MM/yyyy')}</TableCell><TableCell className="text-slate-600">{format(new Date(loan.due_date), 'dd/MM/yyyy')}</TableCell><TableCell><Badge className={status.color}>{status.label}</Badge></TableCell><TableCell><span className="text-slate-600">{loan.renewal_count}/{loan.max_renewals}</span></TableCell><TableCell>{loan.status !== 'returned' && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedLoan(loan); setShowReturnDialog(true); }}><Undo2 className="w-4 h-4 mr-2" />Registrar Devolução</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</TableCell></TableRow>;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><BookMarked className="w-7 h-7 text-indigo-600" />Gestão de Empréstimos</h1><p className="text-slate-500 mt-1">{activeLoans.length} empréstimo(s) ativo(s)</p></div>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
        </div>

        <Card className="border-0 shadow-sm mb-6"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input placeholder="Pesquisar por livro ou membro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></CardContent></Card>

        <Tabs defaultValue="active">
          <TabsList className="mb-6"><TabsTrigger value="active"><Clock className="w-4 h-4 mr-2" />Ativos ({activeLoans.length})</TabsTrigger><TabsTrigger value="overdue"><AlertTriangle className="w-4 h-4 mr-2" />Em Atraso ({overdueLoans.length})</TabsTrigger><TabsTrigger value="returned"><CheckCircle className="w-4 h-4 mr-2" />Devolvidos ({returnedLoans.length})</TabsTrigger></TabsList>
          <Card className="border-0 shadow-sm"><CardContent className="p-0"><TabsContent value="active" className="m-0"><Table><TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>Membro</TableHead><TableHead>Data Empréstimo</TableHead><TableHead>Data Devolução</TableHead><TableHead>Status</TableHead><TableHead>Renovações</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{isLoading ? Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-10 w-48" /></TableCell><TableCell><Skeleton className="h-10 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell><TableCell><Skeleton className="h-8 w-8" /></TableCell></TableRow>) : filteredLoans(activeLoans).map(loan => <LoanRow key={loan.id} loan={loan} />)}</TableBody></Table></TabsContent><TabsContent value="overdue" className="m-0"><Table><TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>Membro</TableHead><TableHead>Data Empréstimo</TableHead><TableHead>Data Devolução</TableHead><TableHead>Status</TableHead><TableHead>Renovações</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{filteredLoans(overdueLoans).map(loan => <LoanRow key={loan.id} loan={loan} />)}</TableBody></Table></TabsContent><TabsContent value="returned" className="m-0"><Table><TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>Membro</TableHead><TableHead>Data Empréstimo</TableHead><TableHead>Data Devolução</TableHead><TableHead>Status</TableHead><TableHead>Renovações</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{filteredLoans(returnedLoans).map(loan => <LoanRow key={loan.id} loan={loan} />)}</TableBody></Table></TabsContent></CardContent></Card>
        </Tabs>
      </div>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
  		<DialogContent><DialogHeader><DialogTitle>Registrar Devolução</DialogTitle><DialogDescription>Confirmar a devolução do livro &quot;{selectedLoan?.book_title}&quot;.</DialogDescription></DialogHeader>{selectedLoan && <div className="py-4 space-y-4"><div className="p-4 bg-slate-50 rounded-lg space-y-2"><div className="flex justify-between"><span className="text-slate-500">Membro:</span><span className="font-medium">{selectedLoan.member_name}</span></div><div className="flex justify-between"><span className="text-slate-500">Data empréstimo:</span><span>{format(new Date(selectedLoan.loan_date), 'dd/MM/yyyy')}</span></div></div>{isPast(new Date(selectedLoan.due_date)) && <div className="p-4 bg-red-50 rounded-lg"><div className="flex items-center gap-2 text-red-700 mb-2"><AlertTriangle className="w-5 h-5" /><span className="font-medium">Devolução em atraso</span></div><p className="text-sm text-red-600">{differenceInDays(new Date(), new Date(selectedLoan.due_date))} dia(s) de atraso. Multa será gerada automaticamente.</p></div>}</div>}<DialogFooter><Button variant="outline" onClick={() => setShowReturnDialog(false)}>Cancelar</Button><Button onClick={() => returnLoanMutation.mutate(selectedLoan)} disabled={returnLoanMutation.isPending}>{returnLoanMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Devolução</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}