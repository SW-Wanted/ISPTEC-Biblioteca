"use client";

import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Library, Search, Plus, Edit2, Trash2, BookOpen, Camera, Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ManageBooks() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ title: '', subtitle: '', isbn: '', authors: '', publisher: '', publication_year: '', edition: '', language: 'pt', pages: '', category: '', description: '', location: '', total_copies: 1, available_copies: 1 });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: books = [], isLoading } = useQuery({ queryKey: ['manage-books'], queryFn: () => api.entities.Book.list('-created_date', 100), initialData: [] });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.entities.Category.list(), initialData: [] });

  const createBookMutation = useMutation({
    mutationFn: async (data: any) => {
      const raw = (data ?? {}) as Record<string, any>;
      const bookData = {
        ...raw,
        authors: String(raw.authors ?? '')
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        publication_year: raw.publication_year ? parseInt(String(raw.publication_year), 10) : null,
        pages: raw.pages ? parseInt(String(raw.pages), 10) : null,
        total_copies: parseInt(String(raw.total_copies ?? '1'), 10) || 1,
        available_copies: parseInt(String(raw.available_copies ?? '1'), 10) || 1,
      };
      if (isEditing && selectedBook) await api.entities.Book.update(selectedBook.id, bookData); else await api.entities.Book.create(bookData);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-books'] }); setShowAddDialog(false); resetForm(); toast.success(isEditing ? 'Livro atualizado!' : 'Livro adicionado!'); },
    onError: () => { toast.error('Erro ao salvar livro'); }
  });

  const deleteBookMutation = useMutation({ mutationFn: async (bookId: string) => { await api.entities.Book.delete(bookId); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-books'] }); setShowDeleteDialog(false); setSelectedBook(null); toast.success('Livro removido!'); }, onError: () => { toast.error('Erro ao remover livro'); } });

  const resetForm = () => { setFormData({ title: '', subtitle: '', isbn: '', authors: '', publisher: '', publication_year: '', edition: '', language: 'pt', pages: '', category: '', description: '', location: '', total_copies: 1, available_copies: 1 }); setSelectedBook(null); setIsEditing(false); };

  const handleEdit = (book: any) => { setFormData({ title: book.title || '', subtitle: book.subtitle || '', isbn: book.isbn || '', authors: book.authors?.join(', ') || '', publisher: book.publisher || '', publication_year: book.publication_year?.toString() || '', edition: book.edition || '', language: book.language || 'pt', pages: book.pages?.toString() || '', category: book.category || '', description: book.description || '', location: book.location || '', total_copies: book.total_copies || 1, available_copies: book.available_copies || 1 }); setSelectedBook(book); setIsEditing(true); setShowAddDialog(true); };

  const filteredBooks = books.filter(book => { if (!searchQuery) return true; const query = searchQuery.toLowerCase(); return book.title?.toLowerCase().includes(query) || book.isbn?.toLowerCase().includes(query) || book.authors?.some(a => a.toLowerCase().includes(query)); });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Library className="w-7 h-7 text-indigo-600" />Gestão de Livros</h1><p className="text-slate-500 mt-1">{books.length} livro(s) no acervo</p></div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Cataloging')}><Button variant="outline"><Camera className="w-4 h-4 mr-2" />Catalogação OCR</Button></Link>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}><Plus className="w-4 h-4 mr-2" />Adicionar Livro</Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-6"><CardContent className="p-4"><div className="flex gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input placeholder="Pesquisar por título, ISBN ou autor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div></CardContent></Card>

        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>ISBN</TableHead><TableHead>Categoria</TableHead><TableHead>Exemplares</TableHead><TableHead>Localização</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{isLoading ? Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-10 w-48" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-8 w-8" /></TableCell></TableRow>) : filteredBooks.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12"><BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Nenhum livro encontrado</p></TableCell></TableRow> : filteredBooks.map(book => <TableRow key={book.id} className="group"><TableCell><div className="flex items-center gap-3"><div className="w-10 h-14 bg-slate-100 rounded flex items-center justify-center shrink-0 overflow-hidden">{book.cover_url ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-slate-400" />}</div><div><p className="font-medium text-slate-800">{book.title}</p><p className="text-sm text-slate-500">{book.authors?.join(', ')}</p></div></div></TableCell><TableCell className="font-mono text-sm text-slate-600">{book.isbn || '-'}</TableCell><TableCell>{book.category && <Badge variant="secondary">{book.category}</Badge>}</TableCell><TableCell><span className={cn("font-medium", (book.available_copies ?? 0) > 0 ? "text-emerald-600" : "text-red-600")}>{book.available_copies ?? 0}</span><span className="text-slate-400">/{book.total_copies}</span></TableCell><TableCell className="text-slate-600">{book.location || '-'}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEdit(book)}><Edit2 className="w-4 h-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem asChild><Link to={createPageUrl(`BookDetails?id=${book.id}`)}><BookOpen className="w-4 h-4 mr-2" />Ver detalhes</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => { setSelectedBook(book); setShowDeleteDialog(true); }}><Trash2 className="w-4 h-4 mr-2" />Remover</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? 'Editar Livro' : 'Adicionar Livro'}</DialogTitle><DialogDescription>Preencha os dados do livro. Campos com * são obrigatórios.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Título *</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Título do livro" /></div><div className="col-span-2"><Label>Subtítulo</Label><Input value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} placeholder="Subtítulo (opcional)" /></div><div><Label>ISBN</Label><Input value={formData.isbn} onChange={(e) => setFormData({...formData, isbn: e.target.value})} placeholder="978-..." /></div><div><Label>Autores</Label><Input value={formData.authors} onChange={(e) => setFormData({...formData, authors: e.target.value})} placeholder="Separar por vírgula" /></div><div><Label>Editora</Label><Input value={formData.publisher} onChange={(e) => setFormData({...formData, publisher: e.target.value})} placeholder="Nome da editora" /></div><div><Label>Ano</Label><Input type="number" value={formData.publication_year} onChange={(e) => setFormData({...formData, publication_year: e.target.value})} placeholder="AAAA" /></div><div><Label>Categoria</Label><Select value={formData.category ?? ''} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.filter((cat) => Boolean(cat.name)).map(cat => <SelectItem key={cat.id} value={cat.name as string}>{cat.name as string}</SelectItem>)}</SelectContent></Select></div><div><Label>Total de Exemplares</Label><Input type="number" min="1" value={formData.total_copies} onChange={(e) => setFormData({...formData, total_copies: parseInt(e.target.value, 10) || 1})} /></div><div><Label>Localização</Label><Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estante A, Prateleira 3" /></div><div className="col-span-2"><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Resumo do livro..." rows={4} /></div></div></div>
          <DialogFooter><Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>Cancelar</Button><Button onClick={() => createBookMutation.mutate(formData)} disabled={createBookMutation.isPending || !formData.title}>{createBookMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{isEditing ? 'Salvar Alterações' : 'Adicionar Livro'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  		<AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover Livro</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover &quot;{selectedBook?.title}&quot;? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteBookMutation.mutate(selectedBook?.id)} className="bg-red-600 hover:bg-red-700">{deleteBookMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}