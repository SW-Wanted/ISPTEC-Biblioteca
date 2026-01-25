"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Camera, BookOpen, CheckCircle, ArrowRight, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Cataloging() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [step, setStep] = useState<number>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBookData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  type CatalogFormState = {
    title: string;
    subtitle: string;
    isbn: string;
    authors: string;
    publisher: string;
    publication_year: string;
    edition: string;
    language: string;
    pages: string;
    category: string;
    description: string;
    location: string;
    total_copies: string;
    available_copies: string;
  };

  const [formData, setFormData] = useState<CatalogFormState>({
    title: '',
    subtitle: '',
    isbn: '',
    authors: '',
    publisher: '',
    publication_year: '',
    edition: '',
    language: 'pt',
    pages: '',
    category: '',
    description: '',
    location: '',
    total_copies: '1',
    available_copies: '1',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  type ExtractedBookData = {
    title?: string | null;
    subtitle?: string | null;
    isbn?: string | null;
    authors?: string | null;
    publisher?: string | null;
    publication_year?: string | null;
    edition?: string | null;
    suggested_category?: string | null;
    language?: string | null;
    description?: string | null;
    confidence?: number | null;
  };

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.entities.Category.list(), initialData: [] });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
    setIsExtracting(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      const extracted = await api.integrations.Core.InvokeLLM<ExtractedBookData>({ 
        prompt: `Você é um especialista em catalogação de livros. Analise cuidadosamente esta imagem de um livro (pode ser a capa, folha de rosto, ou contracapa) e extraia as seguintes informações bibliográficas:

1. TÍTULO: O título principal do livro (obrigatório)
2. SUBTÍTULO: Se houver subtítulo
3. ISBN: Número ISBN (10 ou 13 dígitos, geralmente na contracapa ou página de créditos)
4. AUTORES: Lista de autores separados por vírgula
5. EDITORA: Nome da editora/publisher
6. ANO DE PUBLICAÇÃO: Ano em formato AAAA
7. EDIÇÃO: Número da edição (ex: "2ª edição", "3rd edition")
8. CATEGORIA SUGERIDA: Baseado no conteúdo, sugira uma categoria (Ciências, Engenharia, Medicina, Direito, Economia, Informática, Literatura, História, etc.)
9. IDIOMA: pt (português), en (inglês), es (espanhol), fr (francês)
10. DESCRIÇÃO: Se visível, uma breve sinopse ou descrição do livro

Seja preciso e extraia apenas informações claramente visíveis. Se algum dado não estiver visível ou legível, deixe o campo vazio.
Forneça também um nível de confiança (0.0 a 1.0) baseado na qualidade da imagem e clareza das informações.`, 
        file_urls: [file_url], 
        response_json_schema: { 
          type: "object", 
          properties: { 
            title: { type: "string", description: "Título do livro" }, 
            subtitle: { type: "string", description: "Subtítulo se houver" }, 
            isbn: { type: "string", description: "ISBN do livro" }, 
            authors: { type: "string", description: "Autores separados por vírgula" }, 
            publisher: { type: "string", description: "Editora" }, 
            publication_year: { type: "string", description: "Ano de publicação" }, 
            edition: { type: "string", description: "Edição" }, 
            suggested_category: { type: "string", description: "Categoria sugerida" },
            language: { type: "string", description: "Código do idioma: pt, en, es, fr" },
            description: { type: "string", description: "Sinopse ou descrição breve" },
            confidence: { type: "number", description: "Nível de confiança 0.0 a 1.0" } 
          } 
        } 
      });
      setExtractedData(extracted);
      setFormData((prev) => ({
        ...prev,
        title: extracted.title || '',
        subtitle: extracted.subtitle || '',
        isbn: extracted.isbn || '',
        authors: extracted.authors || '',
        publisher: extracted.publisher || '',
        publication_year: extracted.publication_year || '',
        edition: extracted.edition || '',
        category: extracted.suggested_category || '',
        language: extracted.language || 'pt',
        description: extracted.description || '',
      }));
      setStep(2);
      toast.success('Dados extraídos com sucesso!');
    } catch (error) {
      toast.error('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const createBookMutation = useMutation({
    mutationFn: async () => {
      const bookData = {
      ...formData,
      authors: formData.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      publication_year: formData.publication_year ? parseInt(formData.publication_year, 10) : null,
      pages: formData.pages ? parseInt(formData.pages, 10) : null,
      total_copies: parseInt(formData.total_copies, 10) || 1,
      available_copies: parseInt(formData.available_copies, 10) || 1,
      extracted_by_ocr: true,
      ocr_confidence: extractedData?.confidence ?? null,
      catalog_status: 'pending_review',
    };
      await api.entities.Book.create(bookData);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-books'] }); setStep(3); toast.success('Livro cadastrado com sucesso!'); },
    onError: () => { toast.error('Erro ao cadastrar livro'); }
  });

  const resetCataloging = () => {
    setStep(1);
    setUploadedImage(null);
    setExtractedData(null);
    setFormData({
      title: '',
      subtitle: '',
      isbn: '',
      authors: '',
      publisher: '',
      publication_year: '',
      edition: '',
      language: 'pt',
      pages: '',
      category: '',
      description: '',
      location: '',
      total_copies: '1',
      available_copies: '1',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8"><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Camera className="w-7 h-7 text-indigo-600" />Catalogação Inteligente</h1><p className="text-slate-500 mt-1">Use IA para catalogar livros a partir de fotos</p></div>

        <div className="flex items-center justify-center mb-8">{[{ num: 1, label: 'Upload' }, { num: 2, label: 'Revisão' }, { num: 3, label: 'Concluído' }].map((s, i) => <React.Fragment key={s.num}><div className="flex flex-col items-center"><div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all", step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>{step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}</div><span className={cn("text-xs mt-2", step >= s.num ? "text-indigo-600 font-medium" : "text-slate-400")}>{s.label}</span></div>{i < 2 && <div className={cn("w-20 h-1 mx-2 rounded", step > s.num ? "bg-indigo-600" : "bg-slate-200")} />}</React.Fragment>)}</div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm"><CardHeader className="text-center"><CardTitle>Fotografe o Livro</CardTitle><CardDescription>Tire uma foto da capa ou folha de rosto para extração automática dos dados</CardDescription></CardHeader><CardContent><input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" /><div onClick={() => fileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all", isExtracting ? "border-indigo-300 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50")}>{isExtracting ? <div className="space-y-4"><Loader2 className="w-16 h-16 text-indigo-600 mx-auto animate-spin" /><div><p className="font-medium text-indigo-800">Processando imagem...</p><p className="text-sm text-indigo-600 mt-1">Extraindo dados com IA</p></div><Progress value={66} className="w-48 mx-auto" /></div> : uploadedImage ? <div className="space-y-4"><img src={uploadedImage} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow" /><p className="text-sm text-slate-500">Clique para trocar a imagem</p></div> : <div className="space-y-4"><div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto"><Camera className="w-10 h-10 text-indigo-600" /></div><div><p className="font-medium text-slate-800">Clique para capturar ou selecionar</p><p className="text-sm text-slate-500 mt-1">JPG, PNG ou HEIC até 10MB</p></div></div>}</div></CardContent></Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm"><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Revise os Dados</CardTitle><CardDescription>Verifique e corrija as informações extraídas</CardDescription></div>{extractedData?.confidence && <Badge className={cn(extractedData.confidence > 0.8 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}><Wand2 className="w-3 h-3 mr-1" />{Math.round(extractedData.confidence * 100)}% confiança</Badge>}</div></CardHeader><CardContent><div className="grid gap-4"><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Título *</Label><Input value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div><div><Label>ISBN</Label><Input value={formData.isbn || ''} onChange={(e) => setFormData({...formData, isbn: e.target.value})} /></div><div><Label>Autores</Label><Input value={formData.authors || ''} onChange={(e) => setFormData({...formData, authors: e.target.value})} placeholder="Separar por vírgula" /></div><div><Label>Editora</Label><Input value={formData.publisher || ''} onChange={(e) => setFormData({...formData, publisher: e.target.value})} /></div><div><Label>Ano</Label><Input type="number" value={formData.publication_year || ''} onChange={(e) => setFormData({...formData, publication_year: e.target.value})} /></div><div><Label>Categoria</Label><Select value={formData.category || ''} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Localização</Label><Input value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estante A" /></div></div><div className="flex gap-3 pt-4"><Button variant="outline" onClick={resetCataloging}><X className="w-4 h-4 mr-2" />Cancelar</Button><Button className="flex-1" onClick={() => createBookMutation.mutate()} disabled={createBookMutation.isPending || !formData.title}>{createBookMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Cadastrar Livro</Button></div></div></CardContent></Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-emerald-600" /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">Livro Catalogado!</h2><p className="text-slate-600 mb-8">O livro &quot;{formData.title}&quot; foi adicionado ao acervo com sucesso.</p><div className="flex gap-3 justify-center"><Button variant="outline" onClick={resetCataloging}>Catalogar Outro</Button><Link to={createPageUrl('ManageBooks')}><Button>Ver Acervo<ArrowRight className="w-4 h-4 ml-2" /></Button></Link></div></CardContent></Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}