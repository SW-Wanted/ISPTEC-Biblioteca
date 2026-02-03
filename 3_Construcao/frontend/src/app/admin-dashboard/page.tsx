"use client";

import React, { useEffect } from "react";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart3,
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Activity,
  BookMarked,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";

const DASHBOARD_NOW = new Date();
const DASHBOARD_TODAY_LABEL = format(DASHBOARD_NOW, "dd 'de' MMMM 'de' yyyy");

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  link?: string;
  tab?: string; // Tab específica para navegar
};

function StatCard({ title, value, icon: Icon, color, link, tab }: StatCardProps) {
  const linkUrl = link ? (tab ? `${createPageUrl(link)}#${tab}` : createPageUrl(link)) : null;
  
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              color,
            )}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {linkUrl && (
          <a href={linkUrl} className="block mt-3">
            <Button variant="link" className="p-0 h-auto text-indigo-600">
              Ver detalhes <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const isClient = useIsClient();

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

  const { data: books = [] } = useQuery({
    queryKey: ["admin-books"],
    queryFn: () => api.entities.Book.list(),
    initialData: [],
  });
  const { data: members = [] } = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => api.entities.Member.list(),
    initialData: [],
  });
  const { data: loans = [] } = useQuery({
    queryKey: ["admin-loans"],
    queryFn: () => api.entities.Loan.list(),
    initialData: [],
  });
  const { data: reservations = [] } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => api.entities.Reservation.list(),
    initialData: [],
  });
  const { data: fines = [] } = useQuery({
    queryKey: ["admin-fines"],
    queryFn: () => api.entities.Fine.list(),
    initialData: [],
  });

  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueLoans = loans.filter(
    (l) =>
      l.status === "overdue" ||
      (l.status === "active" &&
        l.due_date &&
        new Date(l.due_date) < new Date()),
  );
  const activeReservations = reservations.filter(
    (r) => r.status === "active" || r.status === "available",
  );
  const pendingFines = fines.filter((f) => f.status === "pending");
  const totalPendingFinesAmount = pendingFines.reduce(
    (sum, f) => sum + (f.amount || 0),
    0,
  );
  const activeMembers = members.filter((m) => m.status === "active");
  const availableBooks = books.reduce(
    (sum, b) => sum + (b.available_copies || 0),
    0,
  );
  const totalCopies = books.reduce((sum, b) => sum + (b.total_copies || 0), 0);

  const loanChartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(DASHBOARD_NOW, 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayLoans = loans.filter((l) => {
      if (!l.loan_date) return false;
      const loanDate = new Date(l.loan_date);
      return loanDate >= dayStart && loanDate <= dayEnd;
    });

    const dayReturns = loans.filter((l) => {
      if (l.status !== "returned" || !l.return_date) return false;
      const returnDate = new Date(l.return_date);
      return returnDate >= dayStart && returnDate <= dayEnd;
    });

    return {
      date: format(date, "EEE"),
      emprestimos: dayLoans.length,
      devolucoes: dayReturns.length,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              Visão geral do sistema • {DASHBOARD_TODAY_LABEL}
            </p>
          </div>
          <Link to={createPageUrl("Reports")}>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Empréstimos Ativos"
            value={activeLoans.length}
            icon={BookMarked}
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            link="ManageLoans"
            tab="loans"
          />
          <StatCard
            title="Em Atraso"
            value={overdueLoans.length}
            icon={AlertTriangle}
            color="bg-gradient-to-br from-red-500 to-red-600"
            link="ManageLoans"
            tab="loans"
          />
          <StatCard
            title="Reservas"
            value={activeReservations.length}
            icon={Clock}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            link="ManageLoans"
            tab="process"
          />
          <StatCard
            title="Multas Pendentes"
            value={totalPendingFinesAmount.toLocaleString("pt-AO", {
              style: "currency",
              currency: "AOA",
            })}
            icon={Activity}
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Total de Livros</span>
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {books.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {totalCopies} exemplares • {availableBooks} disponíveis
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Membros Ativos</span>
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {activeMembers.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                de {members.length} cadastrados
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Taxa de Ocupação</span>
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {totalCopies > 0
                  ? Math.round(
                      ((totalCopies - availableBooks) / totalCopies) * 100,
                    )
                  : 0}
                %
              </p>
              <Progress
                value={
                  totalCopies > 0
                    ? ((totalCopies - availableBooks) / totalCopies) * 100
                    : 0
                }
                className="mt-2"
              />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Empréstimos Hoje</span>
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {
                  loans.filter((l) => {
                    if (!l.loan_date) return false;
                    const loanDate = new Date(l.loan_date);
                    return (
                      loanDate >= startOfDay(DASHBOARD_NOW) &&
                      loanDate <= endOfDay(DASHBOARD_NOW)
                    );
                  }).length
                }
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-800">
                Movimentação da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {isClient ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={loanChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="emprestimos"
                        stackId="1"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.6}
                        name="Empréstimos"
                      />
                      <Area
                        type="monotone"
                        dataKey="devolucoes"
                        stackId="2"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.6}
                        name="Devoluções"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-md bg-slate-100" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-800">
                Empréstimos em Atraso
              </CardTitle>
              <Badge className="bg-red-100 text-red-700">
                {overdueLoans.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {overdueLoans.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Nenhum empréstimo em atraso
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueLoans.slice(0, 5).map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-800 text-sm">
                          {loan.book_title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {loan.member_name}
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {loan.due_date
                          ? Math.abs(
                              Math.floor(
                                (new Date().getTime() -
                                  new Date(loan.due_date).getTime()) /
                                  (1000 * 60 * 60 * 24),
                              ),
                            )
                          : 0}{" "}
                        dias
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
