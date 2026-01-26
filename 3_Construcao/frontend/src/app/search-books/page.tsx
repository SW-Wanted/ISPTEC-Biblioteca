"use client";

import React, { useState } from 'react';
import { Link, useSearchParams } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  BookOpen,
  Star,
  X,
  Grid3X3,
  List,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type FiltersState = {
  category: string;
  language: string;
  available: boolean;
  year: string;
};

type FilterSidebarProps = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  categories: Array<{ id: string; name: string }>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
};

function FilterSidebar({
  filters,
  setFilters,
  categories,
  hasActiveFilters,
  clearFilters,
}: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-slate-800 mb-3">Categoria</h4>
        <Select value={filters.category || 'all'} onValueChange={(v) => setFilters({ ...filters, category: v === 'all' ? '' : v })}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h4 className="font-medium text-slate-800 mb-3">Idioma</h4>
        <Select value={filters.language || 'all'} onValueChange={(v) => setFilters({ ...filters, language: v === 'all' ? '' : v })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os idiomas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os idiomas</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="en">Inglês</SelectItem>
            <SelectItem value="es">Espanhol</SelectItem>
            <SelectItem value="fr">Francês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="available"
          checked={filters.available}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onCheckedChange={(checked: any) => setFilters({ ...filters, available: Boolean(checked) })}
        />
        <label htmlFor="available" className="text-sm text-slate-700 cursor-pointer">
          Apenas disponíveis
        </label>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export default function SearchBooks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState<FiltersState>({
    category: searchParams.get('category') || '',
    language: searchParams.get('language') || '',
    available: searchParams.get('available') === 'true',
    year: searchParams.get('year') || ''
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.entities.Category.list(),
    initialData: []
  });

  const categoryOptions = categories.filter(
    (c): c is { id: string; name: string } => typeof c.name === 'string' && c.name.trim().length > 0
  );

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books', searchQuery, filters, sortBy],
    queryFn: async () => {
      let sortField = '-created_date';
      if (sortBy === 'popular') sortField = '-total_loans';
      if (sortBy === 'newest') sortField = '-created_date';
      if (sortBy === 'title') sortField = 'title';
      if (sortBy === 'rating') sortField = '-average_rating';

      const allBooks = await api.entities.Book.list(sortField, 100);
      
      return allBooks.filter(book => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = book.title?.toLowerCase().includes(query);
          const matchesAuthor = book.authors?.some(a => a.toLowerCase().includes(query));
          const matchesISBN = book.isbn?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesAuthor && !matchesISBN) return false;
        }
        if (filters.category && book.category !== filters.category) return false;
        if (filters.language && book.language !== filters.language) return false;
        if (filters.available && (book.available_copies ?? 0) === 0) return false;
        if (filters.year && book.publication_year?.toString() !== filters.year) return false;
        return true;
      });
    },
    initialData: []
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.language) params.set('language', filters.language);
    if (filters.available) params.set('available', 'true');
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({ category: '', language: '', available: false, year: '' });
    setSearchQuery('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(filters.category || filters.language || filters.available || filters.year || searchQuery);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Pesquisar por título, autor ou ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <Button type="submit" className="px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              Pesquisar
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterSidebar filters={filters} setFilters={setFilters} categories={categoryOptions} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="p-6 border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </h3>
              <FilterSidebar filters={filters} setFilters={setFilters} categories={categoryOptions} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} />
            </Card>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {isLoading ? 'Pesquisando...' : `${books.length} resultado(s)`}
                </h2>
                {searchQuery && (
                  <p className="text-sm text-slate-500 mt-1">para &quot;{searchQuery}&quot;</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="popular">Mais populares</SelectItem>
                    <SelectItem value="newest">Mais recentes</SelectItem>
                    <SelectItem value="title">Título A-Z</SelectItem>
                    <SelectItem value="rating">Melhor avaliados</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn("p-2 transition-colors", viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600')}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 transition-colors", viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600')}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className={cn("gap-4", viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-4')}>
                {Array(8).fill(0).map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm overflow-hidden">
                    <div className={viewMode === 'grid' ? '' : 'flex'}>
                      <Skeleton className={viewMode === 'grid' ? 'aspect-2/3 w-full' : 'w-24 h-32'} />
                      <div className={viewMode === 'grid' ? 'p-4' : 'p-4 flex-1'}>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : books.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhum livro encontrado</h3>
                  <p className="text-slate-500 mb-4">Tente ajustar os filtros ou usar outros termos de pesquisa.</p>
                  <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn("gap-4", viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-4')}
                >
                  {books.map((book, index) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link to={createPageUrl(`BookDetails?id=${book.id}`)}>
                        <Card className={cn(
                          "group border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer",
                          viewMode === 'list' && 'flex'
                        )}>
                          <div className={cn(
                            "bg-linear-to-br from-slate-100 to-slate-200 relative overflow-hidden shrink-0",
                            viewMode === 'grid' ? 'aspect-2/3' : 'w-24 h-32'
                          )}>
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-slate-300" />
                              </div>
                            )}
                            {(book.available_copies ?? 0) > 0 && (
                              <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px]">{book.available_copies ?? 0} disp.</Badge>
                            )}
                            {(book.available_copies ?? 0) === 0 && (
                              <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[10px]">Indisponível</Badge>
                            )}
                          </div>
                          <CardContent className={cn(viewMode === 'grid' ? 'p-4' : 'p-4 flex-1')}>
                            <h3 className={cn("font-medium text-slate-800 group-hover:text-indigo-600 transition-colors", viewMode === 'grid' ? 'text-sm line-clamp-2' : 'text-base')}>
                              {book.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{book.authors?.join(', ') || 'Autor desconhecido'}</p>
                            <div className="flex items-center gap-3 mt-2">
                              {(book.average_rating ?? 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span className="text-xs text-slate-600">{(book.average_rating ?? 0).toFixed(1)}</span>
                                </div>
                              )}
                              {book.publication_year && (
                                <span className="text-xs text-slate-400">{book.publication_year}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}