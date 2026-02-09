"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Book } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBookPolicyBadge } from "@/hooks/use-book-policy-badge";

type BookLike = {
  id: string;
  title: string;
  cover_url?: string | null;
  authors?: string[];
  available_copies?: number;
  total_copies?: number;
  average_rating?: number;
} & Record<string, unknown>;

type BookCardProps = { book: BookLike };

function BookCard({ book }: BookCardProps) {
  const getPolicyBadge = useBookPolicyBadge();
  return (
    <Link to={createPageUrl(`BookDetails?id=${book.id}`)}>
      <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer border-0 bg-white shadow-sm overflow-hidden h-full">
        <div className="aspect-2/3 bg-linear-to-br from-slate-100 to-slate-200 relative overflow-hidden">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
              loader={({ src }) => src}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-slate-300" />
            </div>
          )}
          {(() => {
            const available = book.available_copies ?? 0;
            const total = book.total_copies ?? 0;
            const policy = getPolicyBadge(available, total);
            return (
              <Badge
                className={cn(
                  "absolute top-2 right-2 text-[10px]",
                  available > 0 ? policy.className : "bg-red-500 text-white",
                )}
              >
                {available > 0
                  ? `${available} disp. • ${policy.label}`
                  : "Indisponível"}
              </Badge>
            );
          })()}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm text-slate-800 line-clamp-2 group-hover:text-amber-600 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {book.authors?.join(", ") || "Autor desconhecido"}
          </p>
          {(book.average_rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-slate-600">
                {book.average_rating!.toFixed(1)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

type BookSectionProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  books: BookLike[];
  isLoading?: boolean;
  description?: string;
};

function BookSection({
  title,
  icon: Icon,
  books,
  isLoading,
  description,
}: BookSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="border-0 shadow-sm overflow-hidden">
                <Skeleton className="aspect-2/3 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
        </div>
      ) : books.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma recomendação disponível</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Recommendations() {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof api.auth.me>
  > | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  const { data: popularBooks = [] } = useQuery({
    queryKey: ["popular-recommendations"],
    queryFn: () => api.entities.Book.list("-total_loans", 8),
    initialData: [],
  });
  const { data: topRatedBooks = [] } = useQuery({
    queryKey: ["top-rated-recommendations"],
    queryFn: async () => {
      const books = await api.entities.Book.list("-average_rating", 20);
      return books.filter((b: Book) => (b.average_rating ?? 0) > 0).slice(0, 8);
    },
    initialData: [],
  });
  const { data: newArrivals = [] } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: () => api.entities.Book.list("-created_date", 8),
    initialData: [],
  });
  // Recomendações personalizadas usando o novo endpoint RF026
  const { data: personalRecommendations, isLoading: personalLoading } =
    useQuery({
      queryKey: ["personal-recommendations", user?.email],
      queryFn: async () => {
        try {
          const response = await fetch(`/api/recommendations?limit=8`);
          if (!response.ok) {
            console.error(
              "Erro ao buscar recomendações:",
              await response.text(),
            );
            return { recommendations: [] };
          }
          const data = await response.json();
          if (!data.success) return { recommendations: [] };

          // Normalizar campos snake_case esperados pelo BookCard
          return {
            ...data.data,
            recommendations: (data.data?.recommendations ?? []).map(
              (b: any) => ({
                id: b.id,
                title: b.title,
                cover_url: b.coverUrl ?? b.cover_url ?? null,
                authors: b.authors,
                available_copies: b.availableCopies ?? b.available_copies,
                average_rating: b.averageRating ?? b.average_rating,
              }),
            ),
          };
        } catch (error) {
          console.error("Erro ao buscar recomendações:", error);
          return { recommendations: [] };
        }
      },
      enabled: !!user?.email,
      staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    });

  const aiRecommendations = personalRecommendations?.recommendations || [];
  const aiLoading = personalLoading;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-linear-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Recomendações para Você
              </h1>
              <p className="text-slate-500">
                Sugestões personalizadas baseadas no seu histórico de leitura
              </p>
            </div>
          </div>
        </div>

        {aiRecommendations.length > 0 && (
          <BookSection
            title="Recomendados para Você"
            icon={Sparkles}
            books={aiRecommendations}
            isLoading={aiLoading}
            description="Baseado no seu histórico de leitura"
          />
        )}
        <BookSection
          title="Novidades"
          icon={BookOpen}
          books={newArrivals}
          description="Adicionados recentemente ao acervo"
        />
        <BookSection
          title="Mais Populares"
          icon={TrendingUp}
          books={popularBooks}
          description="Os livros mais requisitados este mês"
        />
        <BookSection
          title="Melhor Avaliados"
          icon={Star}
          books={topRatedBooks}
          description="Os favoritos dos utilizadores"
        />
      </div>
    </div>
  );
}
