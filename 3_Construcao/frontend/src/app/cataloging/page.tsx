"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle,
  ArrowRight,
  Loader2,
  Wand2,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuthorOption = { id: string; name: string };

export default function Cataloging() {
  const [step, setStep] = useState<number>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBookData | null>(
    null,
  );
  const [isExtracting, setIsExtracting] = useState(false);

  // Authors selection
  const [authorsOptions, setAuthorsOptions] = useState<AuthorOption[]>([]);
  const [authorsSelected, setAuthorsSelected] = useState<AuthorOption[]>([]);
  const [authorQuery, setAuthorQuery] = useState("");
  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [newAuthor, setNewAuthor] = useState({
    name: "",
    biography: "",
    nationality: "",
    birth_date: "",
  });

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
    cover_url: string;
    material_type: string;
    loan_policy: string;
  };

  const [formData, setFormData] = useState<CatalogFormState>({
    title: "",
    subtitle: "",
    isbn: "",
    authors: "",
    publisher: "",
    publication_year: "",
    edition: "",
    language: "pt",
    pages: "",
    category: "",
    description: "",
    location: "",
    total_copies: "1",
    available_copies: "1",
    cover_url: "",
    material_type: "BOOK",
    loan_policy: "STANDARD",
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
      try {
        await api.auth.me();
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    loadUser();
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.entities.Category.list(),
    initialData: [],
    refetchInterval: 60000,
  });

  // Load authors for selection
  const { data: allAuthors = [], isLoading: authorsLoading } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      console.log("🔄 Carregando autores...");
      const result = await api.entities.Author.list("-created_date", 200);
      console.log("📥 Autores recebidos da API:", result);
      return result;
    },
    initialData: [],
    refetchInterval: 60000,
  });

  useEffect(() => {
    console.log("🔍 allAuthors mudou:", allAuthors);
    if (Array.isArray(allAuthors) && allAuthors.length > 0) {
      const mapped = allAuthors
        .filter((a: any) => a && a.id && a.name)
        .map((a: any) => ({ id: String(a.id), name: String(a.name) }));
      console.log("📚 Autores mapeados:", mapped);
      setAuthorsOptions(mapped);
    } else {
      console.log("⚠️ Nenhum autor para mapear");
    }
  }, [allAuthors]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(
        typeof reader.result === "string" ? reader.result : null,
      );
    };
    reader.readAsDataURL(file);
    setIsExtracting(true);
    try {
      // 1. Upload da imagem para Cloudinary
      const { file_url } = await api.integrations.Core.UploadFile({
        file,
        folder: "ocr",
      });
      setUploadedImageUrl(file_url); // Save the Cloudinary URL
      console.log("📸 Imagem carregada:", file_url);

      let extracted: ExtractedBookData;

      // 2. Converter imagem para base64 para análise Gemini Vision
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover prefixo data:image/...;base64,
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        // 3. Analisar com Gemini Vision (endpoint dedicado da PR #47)
        const result = await api.cataloging.analyzeImage(base64, file.type);

        if (result.error) {
          throw new Error(result.error);
        }

        const data = result.extractedData;

        // 4. Mapear para formato ExtractedBookData
        extracted = {
          title: data.title || "",
          subtitle: data.subtitle || "",
          isbn: data.isbn || "",
          authors: data.authors || "",
          publisher: data.publisher || "",
          publication_year: data.publishedYear?.toString() || "",
          edition: data.edition || "",
          suggested_category: null,
          language: data.language || "pt",
          description: null,
          confidence: result.confidence || 0,
        };

        toast.success(
          `Dados extraídos com ${Math.round(result.confidence * 100)}% de confiança!`,
        );
      } catch (ocrError) {
        console.error("❌ Erro no OCR:", ocrError);
        toast.warning("OCR falhou. Preencha os campos manualmente.");
        extracted = {
          title: "",
          subtitle: "",
          isbn: "",
          authors: "",
          publisher: "",
          publication_year: "",
          edition: "",
          suggested_category: "",
          language: "pt",
          description: "",
          confidence: 0,
        };
      }

      console.log("📸 Imagem carregada:", file_url);
      console.log("📖 Dados extraídos:", extracted);

      setExtractedData(extracted);
      setFormData((prev) => ({
        ...prev,
        title: extracted.title || "",
        subtitle: extracted.subtitle || "",
        isbn: extracted.isbn || "",
        authors: extracted.authors || "",
        publisher: extracted.publisher || "",
        publication_year: extracted.publication_year || "",
        edition: extracted.edition || "",
        category: extracted.suggested_category || "",
        language: extracted.language || "pt",
        description: extracted.description || "",
      }));

      // Tentar mapear autores extraídos para authorsSelected
      if (extracted.authors) {
        const authorNames = extracted.authors.split(",").map((a) => a.trim());
        const mappedAuthors = authorNames
          .map((name) => {
            const found = authorsOptions.find((opt) => opt.name === name);
            return found || null;
          })
          .filter((a): a is AuthorOption => a !== null);
        setAuthorsSelected(mappedAuthors);
      }

      console.log("🔄 Mudando para step 2");
      setStep(2);
      toast.success("Dados extraídos! Enriquecendo via Google Books...");

      // Auto-enriquecer sempre (usa ISBN ou título+autor como fallback)
      setTimeout(() => {
        const enrichParams: { isbn?: string; title?: string; author?: string } =
          {};

        if (extracted.isbn) enrichParams.isbn = extracted.isbn;
        if (extracted.title) enrichParams.title = extracted.title;
        if (extracted.authors) enrichParams.author = extracted.authors;

        console.log("📚 Enriquecendo com params:", enrichParams);

        if (enrichParams.isbn || enrichParams.title) {
          enrichMutation.mutate(enrichParams);
        } else {
          toast.info("Nenhum ISBN ou título para enriquecer");
        }
      }, 800);
    } catch {
      toast.error("Erro ao processar imagem. Tente novamente.");
    } finally {
      setIsExtracting(false);
    }
  };

  const enrichMutation = useMutation({
    mutationFn: async (params?: {
      isbn?: string;
      title?: string;
      author?: string;
    }) => {
      // Tentar enriquecer via Google Books
      const enrichParams = params || {
        isbn: formData.isbn,
        title: formData.title,
        author: authorsSelected.map((a) => a.name).join(", ") || formData.authors,
      };

      if (!enrichParams.isbn && !enrichParams.title) {
        throw new Error("ISBN ou título necessário");
      }

      const result = await api.cataloging.enrichData(enrichParams);
      return result.enrichedData;
    },
    onSuccess: (enrichedData) => {
      console.log("✅ Dados enriquecidos recebidos:", enrichedData);

      if (enrichedData) {
        // Aplicar dados enriquecidos ao formulário (sem sobrescrever campos já preenchidos)
        setFormData((prev) => ({
          ...prev,
          title: enrichedData.title || prev.title,
          subtitle: enrichedData.subtitle || prev.subtitle,
          authors:
            (enrichedData.authors && Array.isArray(enrichedData.authors)
              ? enrichedData.authors.join(", ")
              : enrichedData.authors) || prev.authors,
          publisher: enrichedData.publisher || prev.publisher,
          publication_year: enrichedData.publicationYear
            ? String(enrichedData.publicationYear)
            : prev.publication_year,
          description: enrichedData.description || prev.description,
          pages: enrichedData.pages ? String(enrichedData.pages) : prev.pages,
          language: enrichedData.language || prev.language,
          isbn: enrichedData.isbn || prev.isbn,
        }));

        // Mapear autores enriquecidos
        if (enrichedData.authors) {
          const authorNames = Array.isArray(enrichedData.authors)
            ? enrichedData.authors
            : enrichedData.authors.split(",").map((a: string) => a.trim());
          
          const mappedAuthors = authorNames
            .map((name: string) => {
              const found = authorsOptions.find((opt) => opt.name === name);
              return found || null;
            })
            .filter((a): a is AuthorOption => a !== null);
          
          if (mappedAuthors.length > 0) {
            setAuthorsSelected(mappedAuthors);
          }
        }

        // Atualizar capa se não houver e se a API retornou thumbnail
        if (enrichedData.thumbnail && !uploadedImageUrl) {
          console.log(
            "🖼️ Usando thumbnail do Google Books:",
            enrichedData.thumbnail,
          );
          setUploadedImageUrl(enrichedData.thumbnail);
          setUploadedImage(enrichedData.thumbnail);
        }

        toast.success(
          `✨ Dados enriquecidos via ${enrichedData.source || "API externa"}!`,
        );
      } else {
        toast.info("Sem dados adicionais encontrados nas APIs externas");
      }
    },
    onError: (error: Error) => {
      console.error("❌ Erro ao enriquecer:", error);
      // Não mostrar erro como crítico - enriquecimento é opcional
      toast.warning(
        `Enriquecimento indisponível: ${error.message}. Continue manualmente.`,
      );
    },
  });

  const createBookMutation = useMutation({
    mutationFn: async () => {
      // 1. Criar CatalogEntry
      const entry = await api.cataloging.createEntry({
        imageUrl: uploadedImageUrl || "",
        extractedTitle: formData.title,
        extractedAuthor: authorsSelected.map((a) => a.name).join(", ") || formData.authors,
        extractedISBN: formData.isbn,
        extractedPublisher: formData.publisher,
        extractedYear: formData.publication_year
          ? parseInt(formData.publication_year, 10)
          : undefined,
        enrichedData: extractedData as Record<string, unknown>,
      });

      // 2. Auto-aprovar (modo simplificado - em produção seria workflow com supervisor)
      const categoryId =
        formData.category || (await api.entities.Category.list())[0]?.id || "";

      await api.cataloging.approveEntry(entry.id, {
        title: formData.title,
        subtitle: formData.subtitle,
        isbn: formData.isbn,
        authors: authorsSelected.length > 0 
          ? authorsSelected.map((a) => a.name).join(", ")
          : formData.authors,
        publisher: formData.publisher,
        publicationYear: formData.publication_year
          ? parseInt(formData.publication_year, 10)
          : undefined,
        edition: formData.edition,
        language: formData.language,
        pages: formData.pages ? parseInt(formData.pages, 10) : undefined,
        categoryId,
        description: formData.description,
        coverUrl: uploadedImageUrl || formData.cover_url || undefined,
        location: formData.location || "Acervo Geral",
        totalCopies: parseInt(formData.total_copies, 10) || 1,
        materialType: formData.material_type as any,
        loanPolicy: formData.loan_policy as any,
        reviewNotes: "Auto-aprovado via catalogação inteligente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setStep(3);
      toast.success("Livro catalogado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar livro: ${error.message}`);
    },
  });

  const isFormValid = () => {
    return (
      formData.title.trim() !== "" &&
      formData.isbn?.trim() !== "" &&
      authorsSelected.length > 0 &&
      formData.publication_year !== "" &&
      formData.category !== "" &&
      formData.publisher?.trim() !== "" &&
      parseInt(formData.total_copies) >= 1 &&
      parseInt(formData.available_copies) >= 0 &&
      parseInt(formData.available_copies) <= parseInt(formData.total_copies)
    );
  };

  const resetCataloging = () => {
    setStep(1);
    setUploadedImageUrl(null);
    setUploadedImage(null);
    setExtractedData(null);
    setAuthorsSelected([]);
    setAuthorQuery("");
    setFormData({
      title: "",
      subtitle: "",
      isbn: "",
      authors: "",
      publisher: "",
      publication_year: "",
      edition: "",
      language: "pt",
      pages: "",
      category: "",
      description: "",
      location: "",
      total_copies: "1",
      available_copies: "1",
      cover_url: "",
      material_type: "BOOK",
      loan_policy: "STANDARD",
    });
  };

  // Mutation to create authors inline
  const createAuthorMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return await api.entities.Author.create(payload);
    },
    onSuccess: (author: any) => {
      if (!author || !author.id || !author.name) {
        toast.error("Erro: dados do autor inválidos");
        return;
      }
      const opt: AuthorOption = { id: String(author.id), name: String(author.name) };
      console.log("✅ Autor criado:", opt);
      setAuthorsOptions((prev) => [opt, ...prev.filter((p) => p.id !== opt.id)]);
      setAuthorsSelected((prev) => [...prev, opt]);
      setShowAuthorDialog(false);
      setNewAuthor({ name: "", biography: "", nationality: "", birth_date: "" });
      toast.success(`Autor "${opt.name}" criado e adicionado!`);
    },
    onError: (err: any) => {
      console.error("❌ Erro ao criar autor:", err);
      toast.error(err?.message || "Erro ao criar autor");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Camera className="w-7 h-7 text-amber-600" />
            Catalogação Inteligente
          </h1>
          <p className="text-slate-500 mt-1">
            Use IA para catalogar livros a partir de fotos
          </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, label: "Upload" },
            { num: 2, label: "Revisão" },
            { num: 3, label: "Concluído" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step >= s.num
                      ? "bg-amber-600 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                >
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2",
                    step >= s.num
                      ? "text-amber-600 font-medium"
                      : "text-slate-400",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    "w-20 h-1 mx-2 rounded",
                    step > s.num ? "bg-amber-600" : "bg-slate-200",
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle>Fotografe o Livro</CardTitle>
                <CardDescription>
                  Tire uma foto da capa ou folha de rosto para extração
                  automática dos dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                    isExtracting
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/50",
                  )}
                >
                  {isExtracting ? (
                    <div className="space-y-4">
                      <Loader2 className="w-16 h-16 text-amber-600 mx-auto animate-spin" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Processando imagem...
                        </p>
                        <p className="text-sm text-amber-600 mt-1">
                          Extraindo dados com IA
                        </p>
                      </div>
                      <Progress value={66} className="w-48 mx-auto" />
                    </div>
                  ) : uploadedImage ? (
                    <div className="space-y-4">
                      <Image
                        src={uploadedImage}
                        alt="Preview"
                        width={320}
                        height={192}
                        className="max-h-48 mx-auto rounded-lg shadow object-contain"
                        unoptimized
                        loader={({ src }) => src}
                      />
                      <p className="text-sm text-slate-500">
                        Clique para trocar a imagem
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Camera className="w-10 h-10 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          Clique para capturar ou selecionar
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          JPG, PNG ou HEIC até 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revise os Dados</CardTitle>
                    <CardDescription>
                      Verifique e corrija as informações extraídas
                    </CardDescription>
                  </div>
                  {extractedData?.confidence && (
                    <Badge
                      className={cn(
                        extractedData.confidence > 0.8
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      {Math.round(extractedData.confidence * 100)}% confiança
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Seção 1: Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                      Informações Básicas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>
                          Título <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          value={formData.title || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className={
                            !formData.title.trim() ? "border-red-300" : ""
                          }
                          placeholder="Título do livro"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Subtítulo</Label>
                        <Input
                          value={formData.subtitle || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subtitle: e.target.value,
                            })
                          }
                          placeholder="Subtítulo (opcional)"
                        />
                      </div>
                      <div>
                        <Label>
                          ISBN <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          value={formData.isbn || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, isbn: e.target.value })
                          }
                          className={
                            !formData.isbn?.trim() ? "border-red-300" : ""
                          }
                          placeholder="978-..."
                        />
                      </div>
                      <div>
                        <Label>
                          Autores <span className="text-red-600">*</span>
                        </Label>
                        <div className="space-y-2">
                          {/* Autores selecionados */}
                          {authorsSelected.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-2 border rounded bg-slate-50">
                              {authorsSelected.map((a) => {
                                if (!a || !a.id || !a.name) return null;
                                return (
                                  <Badge key={a.id} className="flex items-center gap-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200">
                                    <span>{a.name}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAuthorsSelected((prev) =>
                                          prev.filter((p) => p.id !== a.id),
                                        )
                                      }
                                      className="text-amber-600 hover:text-red-600 font-bold text-base leading-none"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}

                          {/* Campo de pesquisa */}
                          <div className="relative">
                            <Input
                              value={authorQuery}
                              onChange={(e) => setAuthorQuery(e.target.value)}
                              placeholder="Digite para pesquisar autores existentes..."
                              className={authorsSelected.length === 0 ? "border-red-300" : ""}
                            />
                            
                            {/* Dropdown de resultados */}
                            {authorQuery.trim() !== "" && authorsOptions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 border rounded-lg bg-white shadow-lg max-h-48 overflow-auto">
                                {(() => {
                                  const filtered = authorsOptions
                                    .filter((o) => {
                                      if (!o || !o.name || typeof o.name !== 'string') return false;
                                      const query = authorQuery.toLowerCase();
                                      return o.name.toLowerCase().includes(query);
                                    })
                                    .filter((o) => !authorsSelected.some((s) => s.id === o.id))
                                    .slice(0, 10);

                                  if (filtered.length === 0) {
                                    return (
                                      <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                        Nenhum autor encontrado
                                      </div>
                                    );
                                  }

                                  return filtered.map((opt) => (
                                    <div
                                      key={opt.id}
                                      className="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        setAuthorsSelected((prev) => [...prev, opt]);
                                        setAuthorQuery("");
                                      }}
                                    >
                                      {opt.name}
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Info sobre autores carregados */}
                          {authorsOptions.length === 0 && (
                            <p className="text-xs text-slate-500">
                              Carregando autores... ou nenhum autor cadastrado ainda.
                            </p>
                          )}
                          {authorsOptions.length > 0 && (
                            <p className="text-xs text-slate-500">
                              {authorsOptions.length} autor(es) disponível(is)
                            </p>
                          )}

                          {/* Botão criar novo autor */}
                          <Button
                            type="button"
                            onClick={() => setShowAuthorDialog(true)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Novo Autor
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>
                          Editora <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          value={formData.publisher || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              publisher: e.target.value,
                            })
                          }
                          className={
                            !formData.publisher?.trim() ? "border-red-300" : ""
                          }
                          placeholder="Nome da editora"
                        />
                      </div>
                      <div>
                        <Label>
                          Ano <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1000"
                          max={new Date().getFullYear() + 1}
                          value={formData.publication_year || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              publication_year: e.target.value,
                            })
                          }
                          className={
                            !formData.publication_year ? "border-red-300" : ""
                          }
                          placeholder="AAAA"
                        />
                      </div>
                      <div>
                        <Label>Edição</Label>
                        <Input
                          value={formData.edition || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              edition: e.target.value,
                            })
                          }
                          placeholder="1ª, 2ª..."
                        />
                      </div>
                      <div>
                        <Label>Idioma</Label>
                        <Select
                          value={formData.language}
                          onValueChange={(v) =>
                            setFormData({ ...formData, language: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="en">Inglês</SelectItem>
                            <SelectItem value="es">Espanhol</SelectItem>
                            <SelectItem value="fr">Francês</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Páginas</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.pages || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, pages: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Categoria e Tipo */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                      Categoria e Tipo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>
                          Categoria <span className="text-red-600">*</span>
                        </Label>
                        <Select
                          value={formData.category || ""}
                          onValueChange={(v) =>
                            setFormData({ ...formData, category: v })
                          }
                        >
                          <SelectTrigger
                            className={
                              !formData.category ? "border-red-300" : ""
                            }
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter((cat) => Boolean(cat.name))
                              .map((cat) => (
                                <SelectItem key={cat.id} value={cat.name!}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo de Material</Label>
                        <Select
                          value={formData.material_type}
                          onValueChange={(v) =>
                            setFormData({ ...formData, material_type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOOK">Livro Normal</SelectItem>
                            <SelectItem value="DAILY_LOAN">
                              Cedência Diária
                            </SelectItem>
                            <SelectItem value="REFERENCE">
                              Referência
                            </SelectItem>
                            <SelectItem value="CD_DVD">CD/DVD</SelectItem>
                            <SelectItem value="MAGAZINE">Revista</SelectItem>
                            <SelectItem value="THESIS">Tese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Política de Empréstimo</Label>
                        <Select
                          value={formData.loan_policy}
                          onValueChange={(v) =>
                            setFormData({ ...formData, loan_policy: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STANDARD">
                              Padrão (5/15 dias)
                            </SelectItem>
                            <SelectItem value="DAILY">
                              Diária (1 dia)
                            </SelectItem>
                            <SelectItem value="SHORT_TERM">
                              Curto prazo (2 dias)
                            </SelectItem>
                            <SelectItem value="NO_LOAN">
                              Não empresta
                            </SelectItem>
                            <SelectItem value="EXTENDED">
                              Estendido (30 dias)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Acervo */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                      Acervo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>
                          Total de Exemplares{" "}
                          <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.total_copies}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setFormData({
                              ...formData,
                              total_copies: newValue,
                              // Catalogação = criação nova, available = total
                              available_copies: newValue,
                            });
                          }}
                          className={
                            !formData.total_copies ||
                            parseInt(formData.total_copies) < 1
                              ? "border-red-300"
                              : ""
                          }
                          placeholder="1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Cópias disponíveis serão definidas automaticamente com
                          o mesmo valor.
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Localização</Label>
                        <Input
                          value={formData.location || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: e.target.value,
                            })
                          }
                          placeholder="Ex: A1-P2-E3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Imagem da Capa */}
                  {uploadedImage && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                        Imagem da Capa
                      </h3>
                      <div className="flex items-center gap-4">
                        <Image
                          src={uploadedImage}
                          alt="Capa"
                          width={120}
                          height={180}
                          className="rounded border object-cover"
                          unoptimized
                          loader={({ src }) => src}
                        />
                        <p className="text-sm text-slate-500">
                          Imagem capturada será usada como capa
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seção 5: Descrição */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                      Descrição
                    </h3>
                    <div>
                      <Label>Resumo/Sinopse</Label>
                      <Textarea
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Breve resumo..."
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={resetCataloging}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => enrichMutation.mutate()}
                      disabled={
                        enrichMutation.isPending ||
                        (!formData.isbn && !formData.title)
                      }
                      title={
                        formData.isbn
                          ? "Enriquecer via ISBN"
                          : "Enriquecer via título"
                      }
                    >
                      {enrichMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Enriquecer Dados
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => createBookMutation.mutate()}
                      disabled={createBookMutation.isPending || !isFormValid()}
                    >
                      {createBookMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Catalogar Livro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Livro Catalogado!
                </h2>
                <p className="text-slate-600 mb-8">
                  O livro &quot;{formData.title}&quot; foi adicionado ao acervo
                  com sucesso.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={resetCataloging}>
                    Catalogar Outro
                  </Button>
                  <Link to={createPageUrl("ManageBooks")}>
                    <Button>
                      Ver Acervo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Dialog para criar novo autor */}
      <Dialog open={showAuthorDialog} onOpenChange={setShowAuthorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Autor</DialogTitle>
            <DialogDescription>
              Crie um autor para associar ao livro.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newAuthor.name}
                onChange={(e) =>
                  setNewAuthor({ ...newAuthor, name: e.target.value })
                }
                placeholder="Nome do autor"
              />
            </div>

            <div>
              <Label>Biografia</Label>
              <Textarea
                value={newAuthor.biography}
                onChange={(e) =>
                  setNewAuthor({ ...newAuthor, biography: e.target.value })
                }
                placeholder="Breve biografia (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nacionalidade</Label>
                <Input
                  value={newAuthor.nationality}
                  onChange={(e) =>
                    setNewAuthor({ ...newAuthor, nationality: e.target.value })
                  }
                  placeholder="Ex: Angola"
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={newAuthor.birth_date}
                  onChange={(e) =>
                    setNewAuthor({ ...newAuthor, birth_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAuthorDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createAuthorMutation.mutate(newAuthor)}
              disabled={
                createAuthorMutation.isPending || !newAuthor.name.trim()
              }
            >
              {createAuthorMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar Autor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
