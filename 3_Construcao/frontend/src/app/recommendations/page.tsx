"use client";

import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BookLike = {
  id: string;
  title: string;
  cover_url?: string | null;
  authors?: string[];
  available_copies?: number;
  average_rating?: number;
} & Record<string, unknown>;

type BookCardProps = { book: BookLike };

function BookCard({ book }: BookCardProps) {
  return (
    <Link to={createPageUrl(`BookDetails?id=${book.id}`)}>
      <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer border-0 bg-white shadow-sm overflow-hidden h-full">
        <div className="aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-slate-300" />
            </div>
          )}
          {(book.available_copies ?? 0) > 0 && (
            <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px]">Disponível</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {book.authors?.join(', ') || 'Autor desconhecido'}
          </p>
          {(book.average_rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-slate-600">{book.average_rating!.toFixed(1)}</span>
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

function BookSection({ title, icon: Icon, books, isLoading, description }: BookSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="border-0 shadow-sm overflow-hidden">
                <Skeleton className="aspect-[2/3] w-full" />
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
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: popularBooks = [] } = useQuery({ queryKey: ['popular-recommendations'], queryFn: () => api.entities.Book.list('-total_loans', 8), initialData: [] });
  const { data: topRatedBooks = [] } = useQuery({ queryKey: ['top-rated-recommendations'], queryFn: async () => { const books = await api.entities.Book.list('-average_rating', 20); return books.filter(b => b.average_rating > 0).slice(0, 8); }, initialData: [] });
  const { data: newArrivals = [] } = useQuery({ queryKey: ['new-arrivals'], queryFn: () => api.entities.Book.list('-created_date', 8), initialData: [] });
  const { data: userLoans = [] } = useQuery({ queryKey: ['user-loans', user?.email], queryFn: () => api.entities.Loan.filter({ member_id: user?.email }), enabled: !!user?.email, initialData: [] });

  // AI-powered recommendations based on user history
  const { data: aiRecommendations = [], isLoading: aiLoading } = useQuery({
    queryKey: ['ai-recommendations', user?.email, userLoans],
    queryFn: async () => {
      if (userLoans.length === 0) return [];
      
      const borrowedTitles = userLoans.slice(0, 5).map(l => l.book_title).join(', ');
      const allBooks = await api.entities.Book.list('-average_rating', 50);
      const borrowedBookIds = userLoans.map(l => l.book_id);
      const availableBooks = allBooks.filter(b => !borrowedBookIds.includes(b.id) && b.available_copies > 0);
      
      if (availableBooks.length === 0) return [];
      
      const response = await api.integrations.Core.InvokeLLM<{
    		recommended_indices?: number[];
    		reasoning?: string;
    	}>({
        prompt: `Baseado no histórico de leitura do utilizador (livros: ${borrowedTitles}), recomende os 4 melhores livros da seguinte lista que seriam mais relevantes. Considere similaridade de temas, autores relacionados e progressão lógica de leitura.

Lista de livros disponíveis:
${availableBooks.slice(0, 20).map((b, i) => `${i + 1}. "${b.title}" por ${b.authors?.join(', ') || 'Desconhecido'} - Categoria: ${b.category || 'Geral'}`).join('\n')}

Retorne apenas os números dos livros recomendados (1-20) em ordem de relevância.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_indices: { type: "array", items: { type: "number" }, description: "Índices dos livros recomendados (1-20)" },
            reasoning: { type: "string", description: "Breve explicação das recomendações" }
          }
        }
      });

      const indices = response.recommended_indices || [];
    return indices
      .map((i) => availableBooks[i - 1])
      .filter((b): b is BookLike => Boolean(b))
      .slice(0, 4);
    },
    enabled: !!user?.email && userLoans.length > 0,
    initialData: [],
    staleTime: 1000 * 60 * 30 // Cache for 30 minutes
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center"><Sparkles className="w-7 h-7 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Recomendações para Você</h1>
              <p className="text-slate-500">Sugestões personalizadas baseadas no seu histórico de leitura</p>
            </div>
          </div>
        </div>

        {userLoans.length > 0 && (
          <BookSection 
            title="Recomendados para Você" 
            icon={Sparkles} 
            books={aiRecommendations} 
            isLoading={aiLoading}
            description="Baseado no seu histórico de leitura" 
          />
        )}
        <BookSection title="Novidades" icon={BookOpen} books={newArrivals} description="Adicionados recentemente ao acervo" />
        <BookSection title="Mais Populares" icon={TrendingUp} books={popularBooks} description="Os livros mais requisitados este mês" />
        <BookSection title="Melhor Avaliados" icon={Star} books={topRatedBooks} description="Os favoritos dos utilizadores" />
      </div>
    </div>
  );
}