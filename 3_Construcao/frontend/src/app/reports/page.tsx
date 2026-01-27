"use client";

import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { BarChart3, Download, Calendar, BookOpen, Users, DollarSign, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useIsClient } from "@/lib/use-is-client";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');
  const isClient = useIsClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        await api.auth.me();
      } catch {
        window.location.href = createPageUrl('Home');
      }
    };
    loadUser();
  }, []);

  const { data: books = [] } = useQuery({ queryKey: ['report-books'], queryFn: () => api.entities.Book.list(), initialData: [] });
  const { data: members = [] } = useQuery({ queryKey: ['report-members'], queryFn: () => api.entities.Member.list(), initialData: [] });
  const { data: loans = [] } = useQuery({ queryKey: ['report-loans'], queryFn: () => api.entities.Loan.list(), initialData: [] });
  const { data: fines = [] } = useQuery({ queryKey: ['report-fines'], queryFn: () => api.entities.Fine.list(), initialData: [] });
  const { data: categories = [] } = useQuery({ queryKey: ['report-categories'], queryFn: () => api.entities.Category.list(), initialData: [] });

  // Estatísticas gerais
  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, b) => sum + (b.total_copies || 0), 0);
  const availableCopies = books.reduce((sum, b) => sum + (b.available_copies || 0), 0);
  const activeMembers = members.filter(m => m.status === 'active').length;
  const activeLoans = loans.filter(l => l.status === 'active').length;
  const overdueLoans = loans.filter(l => l.status === 'active' && (l.due_date ? new Date(l.due_date) < new Date() : false)).length;
  const pendingFines = fines.filter(f => f.status === 'pending');
  const totalPendingFines = pendingFines.reduce((sum, f) => sum + (f.amount || 0), 0);
  const paidFines = fines.filter(f => f.status === 'paid');
  const totalPaidFines = paidFines.reduce((sum, f) => sum + (f.amount || 0), 0);

  // Dados para gráficos
  const loansByDay = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayLoans = loans.filter(l => {
      if (!l.loan_date) return false;
      const loanDate = new Date(l.loan_date);
      return loanDate.toDateString() === date.toDateString();
    });
    const dayReturns = loans.filter(l => {
      if (!l.return_date) return false;
      const returnDate = new Date(l.return_date);
      return returnDate.toDateString() === date.toDateString();
    });
    return { date: format(date, 'EEE'), emprestimos: dayLoans.length, devolucoes: dayReturns.length };
  });

  const booksByCategory = categories.map(cat => ({
    name: cat.name,
    value: books.filter(b => b.category === cat.name).length
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  const membersByType = [
    { name: 'Estudantes', value: members.filter(m => m.member_type === 'student').length },
    { name: 'Docentes', value: members.filter(m => m.member_type === 'teacher').length },
    { name: 'Funcionários', value: members.filter(m => m.member_type === 'staff').length },
    { name: 'Bibliotecários', value: members.filter(m => m.member_type === 'librarian').length },
  ].filter(m => m.value > 0);

  const topBorrowedBooks = [...books].sort((a, b) => (b.total_loans || 0) - (a.total_loans || 0)).slice(0, 10);

  const finesByType = [
    { name: 'Atraso', value: fines.filter(f => f.type === 'late_return').length },
    { name: 'Livro Danificado', value: fines.filter(f => f.type === 'damaged_book').length },
    { name: 'Livro Perdido', value: fines.filter(f => f.type === 'lost_book').length },
    { name: 'Outros', value: fines.filter(f => !['late_return', 'damaged_book', 'lost_book'].includes(String(f.type ?? ''))).length },
  ].filter(f => f.value > 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              Relatórios e Estatísticas
            </h1>
            <p className="text-slate-500 mt-1">Análise detalhada do sistema de biblioteca</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
                <SelectItem value="all">Todo Período</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total de Livros" value={totalBooks} subtitle={`${totalCopies} exemplares`} icon={BookOpen} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
          <StatCard title="Membros Ativos" value={activeMembers} subtitle={`de ${members.length} cadastrados`} icon={Users} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <StatCard title="Empréstimos Ativos" value={activeLoans} subtitle={`${overdueLoans} em atraso`} icon={Clock} color="bg-gradient-to-br from-amber-500 to-orange-500" />
          <StatCard title="Multas Pendentes" value={totalPendingFines.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} subtitle={`${pendingFines.length} multas`} icon={DollarSign} color="bg-gradient-to-br from-red-500 to-red-600" />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="loans">Empréstimos</TabsTrigger>
            <TabsTrigger value="collection">Acervo</TabsTrigger>
            <TabsTrigger value="fines">Multas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Movimentação Semanal */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Movimentação Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {isClient ? (
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loansByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="emprestimos" name="Empréstimos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="devolucoes" name="Devoluções" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full rounded-md bg-slate-100" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Membros por Tipo */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Membros por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {isClient ? (
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={membersByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={false}>
                          {membersByType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full rounded-md bg-slate-100" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Livros Mais Emprestados */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top 10 Livros Mais Emprestados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor(es)</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Empréstimos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topBorrowedBooks.map((book, index) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{book.title}</TableCell>
                        <TableCell className="text-slate-600">{book.authors?.join(', ') || '-'}</TableCell>
                        <TableCell>{book.category && <Badge variant="secondary">{book.category}</Badge>}</TableCell>
                        <TableCell className="text-right font-semibold text-indigo-600">{book.total_loans || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-6 text-center">
                  <p className="text-4xl font-bold text-emerald-700">{loans.filter(l => l.status === 'returned').length}</p>
                  <p className="text-sm text-emerald-600 mt-1">Devolvidos</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-indigo-50">
                <CardContent className="p-6 text-center">
                  <p className="text-4xl font-bold text-indigo-700">{activeLoans}</p>
                  <p className="text-sm text-indigo-600 mt-1">Em Andamento</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-6 text-center">
                  <p className="text-4xl font-bold text-red-700">{overdueLoans}</p>
                  <p className="text-sm text-red-600 mt-1">Em Atraso</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Taxa de Devolução no Prazo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${loans.length > 0 ? ((loans.filter(l => l.status === 'returned' && !l.days_overdue).length / loans.filter(l => l.status === 'returned').length) * 100) : 0}%` }} />
                  </div>
                  <span className="font-semibold text-slate-800">
                    {loans.length > 0 ? Math.round((loans.filter(l => l.status === 'returned' && !l.days_overdue).length / Math.max(1, loans.filter(l => l.status === 'returned').length)) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Livros por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {isClient ? (
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={booksByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={100} />
                        <Tooltip />
                        <Bar dataKey="value" name="Livros" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full rounded-md bg-slate-100" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Disponibilidade do Acervo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Exemplares Disponíveis</span>
                        <span className="font-medium">{availableCopies} de {totalCopies}</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalCopies > 0 ? (availableCopies / totalCopies) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Taxa de Ocupação</span>
                        <span className="font-medium">{totalCopies > 0 ? Math.round(((totalCopies - availableCopies) / totalCopies) * 100) : 0}%</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${totalCopies > 0 ? ((totalCopies - availableCopies) / totalCopies) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fines" className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-bold text-red-700">{totalPendingFines.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
                  <p className="text-sm text-red-600 mt-1">Pendentes ({pendingFines.length})</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{totalPaidFines.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
                  <p className="text-sm text-emerald-600 mt-1">Arrecadadas ({paidFines.length})</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-slate-50">
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-bold text-slate-700">{(totalPendingFines + totalPaidFines).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
                  <p className="text-sm text-slate-600 mt-1">Total Geral</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Multas por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {isClient ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={finesByType} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {finesByType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded-md bg-slate-100" />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}