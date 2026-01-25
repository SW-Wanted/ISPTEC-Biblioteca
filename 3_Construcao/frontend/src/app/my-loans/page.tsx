"use client";

import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { BookMarked, Clock, AlertTriangle, CheckCircle, RefreshCw, History, ChevronRight, Calendar, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MyLoans() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: member } = useQuery({
    queryKey: ['member', user?.email],
    queryFn: async () => { const members = await api.entities.Member.filter({ user_id: user?.email }); return members[0]; },
    enabled: !!user?.email
  });

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['my-loans', user?.email],
    queryFn: () => api.entities.Loan.filter({ member_id: user?.email }),
    enabled: !!user?.email, initialData: []
  });

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');
  const historyLoans = loans.filter(l => l.status === 'returned' || l.status === 'cancelled');

  const checkReservationsMutation = useMutation({ mutationFn: async (bookId) => { const reservations = await api.entities.Reservation.filter({ book_id: bookId, status: 'active' }); return reservations.length > 0; } });

  const renewMutation = useMutation({
    mutationFn: async (loan) => {
      if (loan.renewal_count >= loan.max_renewals) throw new Error('Limite de renovações atingido');
      const hasReservations = await checkReservationsMutation.mutateAsync(loan.book_id);
      if (hasReservations) throw new Error('Este livro tem reservas pendentes');
      if (member?.total_fines > 0) throw new Error('Regularize suas multas antes de renovar');
      const loanDays = member?.member_type === 'teacher' ? 15 : 5;
      const newDueDate = addDays(new Date(), loanDays);
      await api.entities.Loan.update(loan.id, { due_date: newDueDate.toISOString(), renewal_count: loan.renewal_count + 1, status: 'active' });
      await api.entities.Notification.create({ user_id: user.email, type: 'in_app', status: 'pending', title: 'Renovação realizada!', message: `O empréstimo de "${loan.book_title}" foi renovado até ${format(newDueDate, "dd 'de' MMMM", { locale: { code: 'pt' } })}.`, loan_id: loan.id, action_type: 'view_loan' });
    },
    onSuccess: () => { queryClient.invalidateQueries(['my-loans', user?.email]); setShowRenewDialog(false); setSelectedLoan(null); toast.success('Renovação realizada com sucesso!'); },
    onError: (error) => { toast.error(error.message || 'Erro ao renovar empréstimo'); }
  });

  const getLoanStatus = (loan) => {
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    const daysLeft = differenceInDays(dueDate, today);
    if (loan.status === 'returned') return { label: 'Devolvido', color: 'bg-slate-100 text-slate-700', icon: CheckCircle };
    if (isPast(dueDate)) return { label: 'Em atraso', color: 'bg-red-100 text-red-700', icon: AlertTriangle, urgent: true };
    if (daysLeft <= 2) return { label: `${daysLeft} dia(s) restante(s)`, color: 'bg-orange-100 text-orange-700', icon: Clock, warning: true };
    return { label: `${daysLeft} dias restantes`, color: 'bg-emerald-100 text-emerald-700', icon: Calendar };
  };

  const canRenew = (loan) => loan.status === 'active' && loan.renewal_count < loan.max_renewals && !isPast(new Date(loan.due_date));

  const LoanCard = ({ loan }) => {
    const status = getLoanStatus(loan);
    const StatusIcon = status.icon;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <Card className={cn("border-0 shadow-sm hover:shadow-md transition-all duration-300", status.urgent && "ring-2 ring-red-200", status.warning && "ring-2 ring-orange-200")}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-20 h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex-shrink-0 overflow-hidden"><BookOpen className="w-full h-full p-6 text-slate-300" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={createPageUrl(`BookDetails?id=${loan.book_id}`)}><h3 className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2">{loan.book_title || 'Título não disponível'}</h3></Link>
                    <p className="text-sm text-slate-500 mt-1">Emprestado em {format(new Date(loan.loan_date), "dd/MM/yyyy")}</p>
                  </div>
                  <Badge className={cn("flex-shrink-0", status.color)}><StatusIcon className="w-3 h-3 mr-1" />{status.label}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" />Devolução: {format(new Date(loan.due_date), "dd/MM/yyyy")}</div>
                  <div className="flex items-center gap-1"><RefreshCw className="w-4 h-4 text-slate-400" />{loan.renewal_count}/{loan.max_renewals} renovações</div>
                </div>
                {loan.fine_amount > 0 && <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center justify-between"><span className="text-sm text-red-700">Multa: {loan.fine_amount.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span><Button variant="link" size="sm" className="text-red-700 h-auto p-0">Pagar</Button></div>}
                <div className="flex gap-2 mt-4">
                  {canRenew(loan) && <Button size="sm" onClick={() => { setSelectedLoan(loan); setShowRenewDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700"><RefreshCw className="w-4 h-4 mr-2" />Renovar</Button>}
                  <Link to={createPageUrl(`BookDetails?id=${loan.book_id}`)}><Button variant="outline" size="sm">Ver livro<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><BookMarked className="w-7 h-7 text-indigo-600" />Meus Empréstimos</h1>
          <p className="text-slate-500 mt-1">Gerencie seus livros emprestados e renovações</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-indigo-600">{activeLoans.length}</p><p className="text-xs text-slate-500 mt-1">Empréstimos Ativos</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-orange-600">{activeLoans.filter(l => { const days = differenceInDays(new Date(l.due_date), new Date()); return days <= 2 && days >= 0; }).length}</p><p className="text-xs text-slate-500 mt-1">Próx. Vencimento</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-red-600">{activeLoans.filter(l => isPast(new Date(l.due_date))).length}</p><p className="text-xs text-slate-500 mt-1">Em Atraso</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-slate-600">{historyLoans.length}</p><p className="text-xs text-slate-500 mt-1">Total Devolvidos</p></CardContent></Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2"><BookMarked className="w-4 h-4" />Ativos ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2"><History className="w-4 h-4" />Histórico ({historyLoans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4 flex gap-4"><Skeleton className="w-20 h-28 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></CardContent></Card>)}</div>
            ) : activeLoans.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhum empréstimo ativo</h3><p className="text-slate-500 mb-4">Explore nosso catálogo e encontre sua próxima leitura!</p><Link to={createPageUrl('SearchBooks')}><Button>Pesquisar Livros</Button></Link></CardContent></Card>
            ) : (
              <AnimatePresence mode="popLayout"><div className="space-y-4">{activeLoans.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(loan => <LoanCard key={loan.id} loan={loan} />)}</div></AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="history">
            {historyLoans.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><History className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhum histórico</h3><p className="text-slate-500">Seu histórico de empréstimos aparecerá aqui.</p></CardContent></Card>
            ) : (
              <div className="space-y-4">{historyLoans.sort((a, b) => new Date(b.return_date || b.loan_date) - new Date(a.return_date || a.loan_date)).map(loan => <LoanCard key={loan.id} loan={loan} />)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Renovação</DialogTitle><DialogDescription>O empréstimo será renovado por mais {member?.loan_days || (member?.member_type === 'teacher' ? 15 : 5)} dias.</DialogDescription></DialogHeader>
          {selectedLoan && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"><BookOpen className="w-12 h-12 text-slate-400" /><div><p className="font-medium text-slate-800">{selectedLoan.book_title}</p><p className="text-sm text-slate-500">Renovação {selectedLoan.renewal_count + 1} de {selectedLoan.max_renewals}</p></div></div>
              {selectedLoan.renewal_count + 1 === selectedLoan.max_renewals && <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-start gap-2"><AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><p className="text-sm text-orange-700">Esta será sua última renovação permitida para este empréstimo.</p></div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowRenewDialog(false)}>Cancelar</Button><Button onClick={() => renewMutation.mutate(selectedLoan)} disabled={renewMutation.isPending}>{renewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Renovação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}