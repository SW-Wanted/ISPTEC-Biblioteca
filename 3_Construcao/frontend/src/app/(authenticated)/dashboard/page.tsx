"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  summary: {
    totalBooks: number;
    totalMembers: number;
    activeLoans: number;
    overdueLoans: number;
    activeReservations: number;
    totalFines: number;
    pendingFines: number;
  };
  topBooks: Array<{
    title: string;
    author: string;
    category: string;
    totalLoans: number;
  }>;
  loansByCategory: Array<{
    category: string;
    totalBooks: number;
    totalLoans: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/reports?type=statistics");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Erro ao carregar estatísticas</p>
        </div>
      </div>
    );
  }

  const occupancyRate =
    stats.summary.totalBooks > 0
      ? ((stats.summary.activeLoans / stats.summary.totalBooks) * 100).toFixed(
          1,
        )
      : "0";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Estatísticas em tempo real da biblioteca
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total de Livros"
          value={stats.summary.totalBooks}
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
          description="No acervo"
        />
        <StatCard
          title="Membros Ativos"
          value={stats.summary.totalMembers}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Cadastrados"
        />
        <StatCard
          title="Empréstimos Ativos"
          value={stats.summary.activeLoans}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description={`${occupancyRate}% de ocupação`}
        />
        <StatCard
          title="Em Atraso"
          value={stats.summary.overdueLoans}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          description="Requerem atenção"
          variant="destructive"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Reservas Ativas"
          value={stats.summary.activeReservations}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          description="Na fila"
        />
        <StatCard
          title="Multas Pendentes"
          value={`${stats.summary.pendingFines.toLocaleString("pt-AO")} Kz`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description={`Total: ${stats.summary.totalFines.toLocaleString("pt-AO")} Kz`}
        />
        <StatCard
          title="Taxa de Devolução"
          value={calculateReturnRate(stats)}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          description="Pontualidade"
        />
      </div>

      {/* Top 10 Livros Mais Emprestados */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Livros Mais Emprestados</CardTitle>
            <CardDescription>Obras mais requisitadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topBooks.slice(0, 10).map((book, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {book.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {book.author} · {book.category}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {book.totalLoans} emp.
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Empréstimos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Empréstimos por Categoria</CardTitle>
            <CardDescription>Distribuição por área</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.loansByCategory.slice(0, 10).map((category, index) => {
                const maxLoans = Math.max(
                  ...stats.loansByCategory.map((c) => c.totalLoans),
                );
                const percentage = (category.totalLoans / maxLoans) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-muted-foreground">
                        {category.totalLoans} empréstimos
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Avisos */}
      {stats.summary.overdueLoans > 0 && (
        <Card className="mt-4 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Atenção Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Existem{" "}
              <strong>
                {stats.summary.overdueLoans} empréstimos em atraso
              </strong>
              . Considere enviar notificações aos utilizadores ou aplicar multas
              conforme o regulamento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  variant,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "destructive";
}) {
  return (
    <Card className={variant === "destructive" ? "border-destructive" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function calculateReturnRate(stats: DashboardStats): string {
  const totalReturned =
    stats.summary.activeLoans + stats.summary.overdueLoans > 0
      ? (
          (stats.summary.activeLoans /
            (stats.summary.activeLoans + stats.summary.overdueLoans)) *
          100
        ).toFixed(1)
      : "100";
  return `${totalReturned}%`;
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
