"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getUserTypeLabel } from "@/lib/user-helpers";
import {
  Search,
  BookOpen,
  BookMarked,
  Clock,
  ArrowRight,
  TrendingUp,
  Star,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MemberRow = {
  member_type?: string | null;
  course?: string | null;
  status?: string | null;
  is_blocked?: boolean | null;
} & Record<string, unknown>;

export default function Home() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  const { data: member, isLoading: memberLoading } = useQuery<MemberRow | null>(
    {
      queryKey: ["member", user?.email],
      queryFn: async () => {
        if (!user?.email) return null;
        try {
          console.log("🔍 Buscando membro para email:", user.email);
          const response = await fetch(
            `/api/members/by-email?email=${encodeURIComponent(user.email)}`,
          );
          if (!response.ok) {
            console.error("❌ Erro na resposta:", response.status);
            return null;
          }
          const data = await response.json();
          console.log("✅ Dados do membro recebidos:", data);
          return data;
        } catch (error) {
          console.error("Erro ao buscar membro:", error);
          return null;
        }
      },
      enabled: !!user?.email,
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    },
  );

  // Debug: Verificar estado do user e member
  useEffect(() => {
    console.log("🎯 Estado atual:", {
      hasUser: !!user,
      userEmail: user?.email,
      userFullName: user?.full_name,
      hasMember: !!member,
      memberType: member?.member_type,
      memberLoading,
      shouldShowCard: !!(user && member),
    });
  }, [user, member, memberLoading]);

  const { data: activeLoans = [] } = useQuery({
    queryKey: ["active-loans", user?.email],
    queryFn: () =>
      api.entities.Loan.filter({ member_id: user?.email, status: "active" }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: activeReservations = [] } = useQuery({
    queryKey: ["active-reservations", user?.email],
    queryFn: () =>
      api.entities.Reservation.filter({
        member_id: user?.email,
        status: "active",
      }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: popularBooks = [] } = useQuery({
    queryKey: ["popular-books"],
    queryFn: () => api.entities.Book.list("-total_loans", 6),
    initialData: [],
  });

  useQuery({
    queryKey: ["new-books"],
    queryFn: () => api.entities.Book.list("-created_date", 4),
    initialData: [],
  });

  // Buscar configurações públicas (disponível para todos os usuários)
  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings-home"],
    queryFn: async () => {
      const res = await fetch("/api/settings/public");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Obter políticas específicas
  const studentPolicy = publicSettings?.loanPolicies?.STUDENT;
  const teacherPolicy = publicSettings?.loanPolicies?.TEACHER;

  // Horários dinâmicos do banco de dados
  const weekdayHours =
    publicSettings?.systemPolicies?.LIBRARY_HOURS_WEEKDAY || "07:30-17:00";

  const saturdayHoursRaw =
    publicSettings?.systemPolicies?.LIBRARY_HOURS_SATURDAY || "08:00-12:30";

  const saturdayNote =
    publicSettings?.systemPolicies?.LIBRARY_SATURDAY_NOTE || "";

  // Formatar horários para exibição
  const openingHours = `Segunda a Sexta: ${weekdayHours}`;
  const saturdayHours = `Sábados${saturdayNote && saturdayNote.trim() !== "" ? ` (${saturdayNote})` : ""}: ${saturdayHoursRaw}`;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = createPageUrl(
        `SearchBooks?q=${encodeURIComponent(searchQuery)}`,
      );
    }
  };

  const getDaysUntilDue = (dueDate: string | Date): number => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const urgentLoans = activeLoans.filter((loan) => {
    if (!loan.due_date) return false;
    const days = getDaysUntilDue(loan.due_date);
    return days <= 2;
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-indigo-800" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Biblioteca Universitária
                <span className="block text-indigo-200">ISPTEC</span>
              </h1>
              <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
                Acesse milhares de livros, faça empréstimos online e gerencie
                suas leituras de forma simples e moderna.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Pesquisar por título, autor ou ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-32 py-6 text-lg rounded-2xl border-0 shadow-xl shadow-black/10 focus-visible:ring-2 focus-visible:ring-white/50"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6"
                >
                  Pesquisar
                </Button>
              </div>
            </motion.form>

            {/* Quick Stats */}
            {user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 flex flex-wrap justify-center gap-4"
              >
                <Link to={createPageUrl("MyLoans")}>
                  <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-white/20 transition-colors">
                    <BookMarked className="w-5 h-5 text-indigo-200" />
                    <span className="text-white font-medium">
                      {activeLoans.length} Empréstimos ativos
                    </span>
                  </div>
                </Link>
                <Link to={createPageUrl("MyReservations")}>
                  <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-white/20 transition-colors">
                    <Clock className="w-5 h-5 text-indigo-200" />
                    <span className="text-white font-medium">
                      {activeReservations.length} Reservas
                    </span>
                  </div>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Alerts */}
        {urgentLoans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-800">
                      Atenção! Devolução próxima
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      Você tem {urgentLoans.length} livro(s) com prazo de
                      devolução em até 2 dias.
                    </p>
                    <Link to={createPageUrl("MyLoans")}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Ver empréstimos
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Welcome Card for logged in users */}
        {user && member && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-linear-to-r from-indigo-500 to-purple-600 border-0 text-white overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <p className="text-indigo-100 text-sm">Bem-vindo de volta,</p>
                  <h2 className="text-2xl font-bold mt-1">
                    {user.full_name || "Utilizador"}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      {getUserTypeLabel(user.type)}
                    </Badge>
                    {member.course && typeof member.course === "string" && (
                      <Badge className="bg-white/20 text-white hover:bg-white/30">
                        {String(member.course)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            {
              icon: Search,
              label: "Pesquisar",
              desc: "Encontre livros",
              page: "SearchBooks",
              color: "from-blue-500 to-blue-600",
            },
            {
              icon: BookMarked,
              label: "Empréstimos",
              desc: "Meus livros",
              page: "MyLoans",
              color: "from-emerald-500 to-emerald-600",
            },
            {
              icon: Clock,
              label: "Reservas",
              desc: "Fila de espera",
              page: "MyReservations",
              color: "from-amber-500 to-orange-500",
            },
            {
              icon: Sparkles,
              label: "Recomendações",
              desc: "Para você",
              page: "Recommendations",
              color: "from-purple-500 to-pink-500",
            },
          ].map((action, index) => (
            <motion.div
              key={action.page}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link to={createPageUrl(action.page)}>
                <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl bg-linear-to-br flex items-center justify-center mb-4",
                        action.color,
                      )}
                    >
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{action.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Popular Books */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Livros Populares
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Os mais requisitados este mês
              </p>
            </div>
            <Link to={createPageUrl("SearchBooks?sort=popular")}>
              <Button
                variant="ghost"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Ver todos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularBooks.slice(0, 6).map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={createPageUrl(`BookDetails?id=${book.id}`)}>
                  <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer border-0 bg-white shadow-sm overflow-hidden">
                    <div className="aspect-2/3 bg-linear-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          unoptimized
                          loader={({ src }) => src}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                      {book.available_copies != null &&
                        book.available_copies > 0 && (
                          <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px]">
                            Disponível
                          </Badge>
                        )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {book.authors?.join(", ") || "Autor desconhecido"}
                      </p>
                      {book.average_rating != null &&
                        book.average_rating > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-slate-600">
                              {book.average_rating?.toFixed(1)}
                            </span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Info Cards */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 bg-linear-to-br from-blue-50 to-indigo-50 shadow-sm">
            <CardContent className="p-6">
              <Calendar className="w-10 h-10 text-indigo-600 mb-4" />
              <h3 className="font-semibold text-slate-800">
                Horário de Funcionamento
              </h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{openingHours}</p>
                <p>{saturdayHours}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-linear-to-br from-emerald-50 to-teal-50 shadow-sm">
            <CardContent className="p-6">
              <TrendingUp className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="font-semibold text-slate-800">
                Limites de Empréstimo
              </h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  Estudantes: {studentPolicy?.maxBooks || 2} livros /{" "}
                  {studentPolicy?.loanDays || 5} dias
                </p>
                <p>
                  Docentes: {teacherPolicy?.maxBooks || 4} livros /{" "}
                  {teacherPolicy?.loanDays || 15} dias
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-linear-to-br from-purple-50 to-pink-50 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <Sparkles className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-slate-800">
                Precisa de Ajuda?
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                Use nosso assistente virtual para tirar dúvidas ou falar com a
                equipe.
              </p>
              <Link to={createPageUrl("Chatbot")}>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  Iniciar Conversa
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
