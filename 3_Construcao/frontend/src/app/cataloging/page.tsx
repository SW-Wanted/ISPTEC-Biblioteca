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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Extrai informações estruturadas do texto OCR
 * @deprecated - Usar Gemini Vision API (analyzeImage) para maior precisão
 * Mantido como fallback caso Gemini não esteja disponível
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseBookDataFromText(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Regex patterns
  const isbnPattern = /ISBN[:\s-]*(\d[\d\s-]{8,17})/i;
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const editionPattern = /(\d+)[ªº°]?\s*(ed|edição|edition|edicao)/i;
  const authorPattern = /(por|by|autor|author)[:\s]+([^\n]+)/i;

  // Extrair ISBN (limpar espaços e hífens)
  const isbnMatch = text.match(isbnPattern);
  let isbn = isbnMatch ? isbnMatch[1].replace(/[\s-]/g, "") : null;

  // Validar ISBN (deve ter 10 ou 13 dígitos)
  if (isbn && !/^\d{10}$|^\d{13}$/.test(isbn)) {
    isbn = null;
  }

  // Extrair anos e pegar o mais recente
  const yearMatches = Array.from(text.matchAll(yearPattern));
  const years = yearMatches
    .map((m) => parseInt(m[0]))
    .filter((y) => y >= 1900 && y <= new Date().getFullYear());
  const publishedYear = years.length > 0 ? Math.max(...years) : null;

  // Extrair edição
  const editionMatch = text.match(editionPattern);
  const edition = editionMatch ? editionMatch[0] : null;

  // Extrair autor
  const authorMatch = text.match(authorPattern);
  const authors = authorMatch ? authorMatch[2].trim() : null;

  // Título melhorado: pegar a MAIOR linha significativa (títulos costumam ser maiores)
  let title = null;
  let maxLength = 0;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (
      line.length > 10 &&
      line.length > maxLength &&
      !/^[\d\s-]+$/.test(line) &&
      !line.toLowerCase().startsWith("isbn") &&
      !line.toLowerCase().startsWith("this book") &&
      !line.toLowerCase().includes("helps to") &&
      !/^(the|a|an|this|that|helps|master)\s/i.test(line)
    ) {
      title = line;
      maxLength = line.length;
    }
  }

  // Subtítulo (linha após título)
  const titleIndex = title ? lines.indexOf(title) : -1;
  const subtitle =
    titleIndex >= 0 &&
    titleIndex + 1 < lines.length &&
    lines[titleIndex + 1].length < 100
      ? lines[titleIndex + 1]
      : null;

  // Editora
  const publisherKeywords = [
    "editora",
    "publisher",
    "edições",
    "edicoes",
    "books",
    "press",
  ];
  const publisher =
    lines.find((line) =>
      publisherKeywords.some((kw) => line.toLowerCase().includes(kw)),
    ) || null;

  // Detectar idioma
  const language = detectLanguage(text);

  return {
    title,
    subtitle,
    isbn,
    authors,
    publisher,
    publishedYear,
    edition,
    language,
  };
}

/**
 * Detecção simples de idioma
 */
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  const portugueseWords = ["de", "da", "do", "para", "com", "uma"];
  const englishWords = ["the", "of", "and", "to", "in", "for"];

  const ptCount = portugueseWords.filter((w) => lowerText.includes(w)).length;
  const enCount = englishWords.filter((w) => lowerText.includes(w)).length;

  return ptCount >= enCount ? "pt" : "en";
}

export default function Cataloging() {
  const [step, setStep] = useState<number>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // Guardar arquivo original
  const [extractedData, setExtractedData] = useState<ExtractedBookData | null>(
    null,
  );
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
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Guardar arquivo original
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(
        typeof reader.result === "string" ? reader.result : null,
      );
    };
    reader.readAsDataURL(file);

    setIsExtracting(true);

    try {
      // Converter imagem para base64
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

      // Timeout de 30 segundos
      const analyzePromise = api.cataloging.analyzeImage(base64, file.type);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Análise demorou muito (timeout de 30 segundos)")),
          30000,
        ),
      );

      const result = await Promise.race([analyzePromise, timeoutPromise]);

      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.extractedData;

      const extracted: ExtractedBookData = {
        title: data.title || null,
        subtitle: data.subtitle || null,
        isbn: data.isbn || null,
        authors: data.authors || null,
        publisher: data.publisher || null,
        publication_year: data.publishedYear?.toString() || null,
        edition: data.edition || null,
        suggested_category: null,
        language: data.language || "pt",
        description: null,
        confidence: result.confidence,
      };

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
        language: extracted.language || "pt",
      }));

      toast.success(
        `Dados extraídos com ${Math.round(result.confidence * 100)}% de confiança!`,
      );

      // 4. Auto-enriquecimento: preferir ISBN; se não houver, tentar por título/autor
      if (extracted.isbn || extracted.title) {
        const maybeYear = extracted.publication_year
          ? Number.parseInt(extracted.publication_year, 10)
          : undefined;

        setTimeout(() => {
          enrichMutation.mutate({
            isbn: extracted.isbn ?? undefined,
            title: extracted.title ?? undefined,
            author: extracted.authors ?? undefined,
            publisher: extracted.publisher ?? undefined,
            publishedYear: Number.isFinite(maybeYear as number)
              ? maybeYear
              : undefined,
          });
        }, 500);
      }

      setStep(2);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      // Mensagens específicas para erros comuns
      if (
        errorMessage.includes("429") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("Too Many Requests")
      ) {
        toast.error(
          "⏱️ Limite de análises atingido. Aguarde alguns minutos e tente novamente.",
          { duration: 5000 },
        );
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("overloaded")
      ) {
        toast.error(
          "🔄 Serviço temporariamente sobrecarregado. Tente novamente em alguns segundos.",
          { duration: 4000 },
        );
      } else if (errorMessage.includes("Configure GOOGLE_GEMINI_API_KEY")) {
        toast.error(
          "⚙️ Análise inteligente não configurada. Contacte o administrador.",
          { duration: 5000 },
        );
      } else {
        toast.error(`Erro ao analisar imagem: ${errorMessage}`, {
          duration: 4000,
        });
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const enrichMutation = useMutation({
    mutationFn: async (params?: {
      isbn?: string;
      title?: string;
      author?: string;
      publisher?: string;
      publishedYear?: number;
    }) => {
      const fallbackParams = {
        isbn: formData.isbn || undefined,
        title: formData.title || undefined,
        author: formData.authors || undefined,
        publisher: formData.publisher || undefined,
        publishedYear: formData.publication_year
          ? Number.parseInt(formData.publication_year, 10)
          : undefined,
      };

      const queryParams =
        params && Object.keys(params).length ? params : fallbackParams;

      // Evitar chamada inútil
      if (!queryParams.isbn && !queryParams.title) return null;

      const result = await api.cataloging.enrichData(queryParams);
      return result.enrichedData ?? null;
    },
    onSuccess: (enrichedData) => {
      if (enrichedData) {
        // Aplicar dados enriquecidos ao formulário
        setFormData((prev) => ({
          ...prev,
          title: enrichedData.title || prev.title,
          subtitle: enrichedData.subtitle || prev.subtitle,
          authors: enrichedData.authors || prev.authors,
          publisher: enrichedData.publisher || prev.publisher,
          isbn: enrichedData.isbn || prev.isbn,
          publication_year: enrichedData.publicationYear
            ? String(enrichedData.publicationYear)
            : prev.publication_year,
          description: enrichedData.description || prev.description,
          pages: enrichedData.pages ? String(enrichedData.pages) : prev.pages,
          language: enrichedData.language || prev.language,
        }));

        if (enrichedData.coverUrl && !uploadedImageUrl) {
          setUploadedImageUrl(enrichedData.coverUrl);
        }

        toast.success("Dados enriquecidos via Google Books!");
      } else {
        toast.info("Sem informações adicionais encontradas");
      }
    },
    onError: () => {
      toast.info("Sem informações adicionais encontradas");
    },
  });

  const createBookMutation = useMutation({
    mutationFn: async () => {
      // 1. Upload da imagem AGORA (só quando realmente cadastrar)
      let coverUrl = uploadedImageUrl;

      if (uploadedFile && !coverUrl) {
        const { file_url } = await api.integrations.Core.UploadFile({
          file: uploadedFile,
          folder: "covers",
        });
        coverUrl = file_url;
        setUploadedImageUrl(file_url);
      }

      // 2. Criar CatalogEntry
      const entry = await api.cataloging.createEntry({
        imageUrl: coverUrl || "",
        extractedTitle: formData.title,
        extractedAuthor: formData.authors,
        extractedISBN: formData.isbn,
        extractedPublisher: formData.publisher,
        extractedYear: formData.publication_year
          ? parseInt(formData.publication_year, 10)
          : undefined,
        enrichedData: extractedData as Record<string, unknown>,
      });

      // 3. Auto-aprovar
      let categoryId = formData.category;
      if (!categoryId) {
        const cats = await api.entities.Category.list();
        categoryId = cats[0]?.id || "";
      }

      await api.cataloging.approveEntry(entry.id, {
        title: formData.title,
        subtitle: formData.subtitle,
        isbn: formData.isbn,
        authors: formData.authors,
        publisher: formData.publisher,
        publicationYear: formData.publication_year
          ? parseInt(formData.publication_year, 10)
          : undefined,
        edition: formData.edition,
        language: formData.language,
        pages: formData.pages ? parseInt(formData.pages, 10) : undefined,
        categoryId,
        description: formData.description,
        coverUrl: coverUrl || undefined,
        location: formData.location,
        totalCopies: parseInt(formData.total_copies, 10) || 1,
        reviewNotes: "Auto-aprovado via catalogação inteligente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setStep(3);
      toast.success("Livro cadastrado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar livro: ${error.message}`);
    },
  });

  const resetCataloging = () => {
    setStep(1);
    setUploadedImageUrl(null);
    setUploadedImage(null);
    setUploadedFile(null);
    setExtractedData(null);
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
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Camera className="w-7 h-7 text-indigo-600" />
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
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                >
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2",
                    step >= s.num
                      ? "text-indigo-600 font-medium"
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
                    step > s.num ? "bg-indigo-600" : "bg-slate-200",
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
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50",
                  )}
                >
                  {isExtracting ? (
                    <div className="space-y-4">
                      <Loader2 className="w-16 h-16 text-indigo-600 mx-auto animate-spin" />
                      <div>
                        <p className="font-medium text-indigo-800">
                          Processando imagem...
                        </p>
                        <p className="text-sm text-indigo-600 mt-1">
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
                      <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Camera className="w-10 h-10 text-indigo-600" />
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
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Título *</Label>
                      <Input
                        value={formData.title || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>ISBN</Label>
                      <Input
                        value={formData.isbn || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, isbn: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Autores</Label>
                      <Input
                        value={formData.authors || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, authors: e.target.value })
                        }
                        placeholder="Separar por vírgula"
                      />
                    </div>
                    <div>
                      <Label>Editora</Label>
                      <Input
                        value={formData.publisher || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            publisher: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Ano</Label>
                      <Input
                        type="number"
                        value={formData.publication_year || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            publication_year: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={formData.category || ""}
                        onValueChange={(v) =>
                          setFormData({ ...formData, category: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((cat) => Boolean(cat.name))
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Localização</Label>
                      <Input
                        value={formData.location || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder="Ex: Estante A"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={resetCataloging}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        enrichMutation.mutate({
                          isbn: formData.isbn || undefined,
                          title: formData.title || undefined,
                          author: formData.authors || undefined,
                          publisher: formData.publisher || undefined,
                          publishedYear: formData.publication_year
                            ? Number.parseInt(formData.publication_year, 10)
                            : undefined,
                        })
                      }
                      disabled={
                        enrichMutation.isPending ||
                        (!formData.isbn && !formData.title)
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
                      disabled={createBookMutation.isPending || !formData.title}
                    >
                      {createBookMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Cadastrar Livro
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
    </div>
  );
}
