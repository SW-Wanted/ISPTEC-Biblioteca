"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Book } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Library,
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Camera,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ManageBooks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
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
    total_copies: 1,
    available_copies: 1,
    cover_url: "",
    material_type: "BOOK",
    loan_policy: "STANDARD",
  });
  const queryClient = useQueryClient();

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

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["manage-books"],
    queryFn: () => api.entities.Book.list("-created_date", 100),
    initialData: [],
    refetchInterval: 30000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.entities.Category.list(),
    initialData: [],
    refetchInterval: 60000,
  });

  type BookFormData = typeof formData;

  const createBookMutation = useMutation<void, Error, BookFormData>({
    mutationFn: async (data) => {
      console.log("📝 FormData recebido:", data);

      const bookData: Partial<Book> & Record<string, unknown> = {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        isbn: data.isbn?.trim() || null,
        authors: String(data.authors ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        publisher: data.publisher?.trim() || null,
        publication_year: data.publication_year
          ? parseInt(String(data.publication_year), 10)
          : null,
        edition: data.edition?.trim() || null,
        language: data.language || "pt",
        pages: data.pages ? parseInt(String(data.pages), 10) : null,
        category: data.category || null,
        description: data.description?.trim() || null,
        location: data.location?.trim() || null,
        total_copies: Number(data.total_copies) || 1,
        available_copies:
          Number(data.available_copies) >= 0
            ? Number(data.available_copies)
            : Number(data.total_copies) || 1,
        cover_url: data.cover_url?.trim() || null,
        material_type: data.material_type || "BOOK",
        loan_policy: data.loan_policy || "STANDARD",
      };

      console.log("📤 Dados sendo enviados para API:", bookData);
      console.log(
        "🔢 Total copies:",
        bookData.total_copies,
        "Available:",
        bookData.available_copies,
      );

      if (isEditing && selectedBook) {
        console.log("✏️ EDITANDO livro:", selectedBook.id);
        const result = await api.entities.Book.update(
          selectedBook.id,
          bookData,
        );
        console.log("✅ Resultado da atualização:", result);
        return result;
      } else {
        console.log("➕ CRIANDO novo livro");
        const result = await api.entities.Book.create(bookData);
        console.log("✅ Resultado da criação:", result);
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setShowAddDialog(false);
      resetForm();
      toast.success(isEditing ? "Livro atualizado!" : "Livro adicionado!");
    },
    onError: (error) => {
      console.error("Erro ao salvar livro:", error);
      toast.error("Erro ao salvar livro");
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      await api.entities.Book.delete(bookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setShowDeleteDialog(false);
      setSelectedBook(null);
      toast.success("Livro removido!");
    },
    onError: () => {
      toast.error("Erro ao remover livro");
    },
  });

  const resetForm = () => {
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
      total_copies: 1,
      available_copies: 1,
      cover_url: "",
      material_type: "BOOK",
      loan_policy: "STANDARD",
    });
    setSelectedBook(null);
    setIsEditing(false);
  };

  const handleEdit = (book: Book) => {
    setFormData({
      title: book.title || "",
      subtitle: book.subtitle || "",
      isbn: book.isbn || "",
      authors: book.authors?.join(", ") || "",
      publisher: book.publisher || "",
      publication_year: book.publication_year?.toString() || "",
      edition: book.edition || "",
      language: book.language || "pt",
      pages: book.pages?.toString() || "",
      category: book.category || "",
      description: book.description || "",
      location: book.location || "",
      total_copies: book.total_copies || 1,
      available_copies: book.available_copies || 1,
      cover_url: book.cover_url || "",
      material_type: (book as { material_type?: string }).material_type || "BOOK",
      loan_policy: (book as { loan_policy?: string }).loan_policy || "STANDARD",
    });
    setSelectedBook(book);
    setIsEditing(true);
    setShowAddDialog(true);
  };

  const filteredBooks = books.filter((book) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      book.title?.toLowerCase().includes(query) ||
      book.isbn?.toLowerCase().includes(query) ||
      book.authors?.some((a) => a.toLowerCase().includes(query))
    );
  });

  const isFormValid = () => {
    return (
      formData.title.trim() !== "" &&
      formData.isbn?.trim() !== "" &&
      formData.authors.trim() !== "" &&
      formData.publication_year !== "" &&
      formData.category !== "" &&
      formData.publisher?.trim() !== "" &&
      formData.total_copies >= 1 &&
      formData.available_copies >= 0 &&
      formData.available_copies <= formData.total_copies
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingImage(true);

    try {
      const { file_url } = await api.integrations.Core.UploadFile({
        file,
        folder: "covers",
      });
      setFormData({ ...formData, cover_url: file_url });
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao fazer upload da imagem",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Library className="w-7 h-7 text-indigo-600" />
              Gestão de Livros
            </h1>
            <p className="text-slate-500 mt-1">
              {books.length} livro(s) no acervo
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("Cataloging")}>
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                Catalogação OCR
              </Button>
            </Link>
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Livro
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por título, ISBN ou autor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Livro</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Exemplares</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-10 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhum livro encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBooks.map((book) => (
                    <TableRow key={book.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-slate-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                            {book.cover_url ? (
                              <Image
                                src={book.cover_url}
                                alt=""
                                width={40}
                                height={56}
                                className="w-full h-full object-cover"
                                unoptimized
                                loader={({ src }) => src}
                              />
                            ) : (
                              <BookOpen className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {book.title}
                            </p>
                            <p className="text-sm text-slate-500">
                              {book.authors?.join(", ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">
                        {book.isbn || "-"}
                      </TableCell>
                      <TableCell>
                        {book.category && (
                          <Badge variant="secondary">{book.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            (book.available_copies ?? 0) > 0
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {book.available_copies ?? 0}
                        </span>
                        <span className="text-slate-400">
                          /{book.total_copies}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {book.location || "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(book)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to={createPageUrl(`BookDetails?id=${book.id}`)}
                              >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedBook(book);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowAddDialog(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Livro" : "Adicionar Livro"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do livro. Campos com{" "}
              <span className="text-red-600">*</span> são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
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
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Título do livro"
                    className={!formData.title.trim() ? "border-red-300" : ""}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, subtitle: e.target.value })
                    }
                    placeholder="Subtítulo (opcional)"
                  />
                </div>
                <div>
                  <Label>
                    ISBN <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.isbn}
                    onChange={(e) =>
                      setFormData({ ...formData, isbn: e.target.value })
                    }
                    placeholder="978-..."
                    className={!formData.isbn?.trim() ? "border-red-300" : ""}
                  />
                </div>
                <div>
                  <Label>
                    Autores <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.authors}
                    onChange={(e) =>
                      setFormData({ ...formData, authors: e.target.value })
                    }
                    placeholder="Separar por vírgula"
                    className={!formData.authors.trim() ? "border-red-300" : ""}
                  />
                </div>
                <div>
                  <Label>
                    Editora <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.publisher}
                    onChange={(e) =>
                      setFormData({ ...formData, publisher: e.target.value })
                    }
                    placeholder="Nome da editora"
                    className={
                      !formData.publisher?.trim() ? "border-red-300" : ""
                    }
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
                    value={formData.publication_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publication_year: e.target.value,
                      })
                    }
                    placeholder="AAAA"
                    className={
                      !formData.publication_year ? "border-red-300" : ""
                    }
                  />
                </div>
                <div>
                  <Label>Edição</Label>
                  <Input
                    value={formData.edition}
                    onChange={(e) =>
                      setFormData({ ...formData, edition: e.target.value })
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
                    value={formData.pages}
                    onChange={(e) =>
                      setFormData({ ...formData, pages: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
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
                    value={formData.category ?? ""}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category: v })
                    }
                  >
                    <SelectTrigger
                      className={!formData.category ? "border-red-300" : ""}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((cat) => Boolean(cat.name))
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.name as string}>
                            {cat.name as string}
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
                      <SelectItem value="REFERENCE">Referência</SelectItem>
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
                      <SelectItem value="DAILY">Diária (1 dia)</SelectItem>
                      <SelectItem value="SHORT_TERM">
                        Curto prazo (2 dias)
                      </SelectItem>
                      <SelectItem value="NO_LOAN">Não empresta</SelectItem>
                      <SelectItem value="EXTENDED">
                        Estendido (30 dias)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                Acervo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Total de Exemplares <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.total_copies || ""}
                    onChange={(e) => {
                      const value =
                        e.target.value === ""
                          ? ""
                          : parseInt(e.target.value, 10);
                      const newTotal =
                        typeof value === "number" && !isNaN(value) ? value : 0;
                      setFormData({
                        ...formData,
                        total_copies: newTotal,
                        available_copies: Math.min(
                          formData.available_copies,
                          newTotal,
                        ),
                      });
                    }}
                    className={
                      !formData.total_copies || formData.total_copies < 1
                        ? "border-red-300"
                        : ""
                    }
                    placeholder="Mínimo: 1"
                  />
                </div>
                <div>
                  <Label>
                    Cópias Disponíveis <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={formData.total_copies}
                    value={formData.available_copies || ""}
                    onChange={(e) => {
                      const value =
                        e.target.value === ""
                          ? ""
                          : parseInt(e.target.value, 10);
                      const newAvailable =
                        typeof value === "number" && !isNaN(value) ? value : 0;
                      setFormData({
                        ...formData,
                        available_copies: Math.min(
                          newAvailable,
                          formData.total_copies,
                        ),
                      });
                    }}
                    className={
                      formData.available_copies < 0 ||
                      formData.available_copies > formData.total_copies
                        ? "border-red-300"
                        : ""
                    }
                    placeholder={`Máximo: ${formData.total_copies}`}
                  />
                  {formData.available_copies > formData.total_copies && (
                    <p className="text-xs text-red-600 mt-1">
                      Não pode exceder {formData.total_copies}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>Localização</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Ex: A1-P2-E3"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {"Armário, Prateleira, Estante"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                Imagem da Capa
              </h3>
              <div className="flex items-start gap-4">
                {formData.cover_url && (
                  <div className="shrink-0">
                    <Image
                      src={formData.cover_url}
                      alt="Capa"
                      width={120}
                      height={180}
                      className="rounded border object-cover"
                      unoptimized
                      loader={({ src }) => src}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Label>Upload de Imagem</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {uploadingImage
                      ? "A carregar..."
                      : "JPG, PNG ou WEBP. Máx: 5MB"}
                  </p>
                  {formData.cover_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormData({ ...formData, cover_url: "" })
                      }
                      className="mt-2 text-red-600"
                    >
                      Remover imagem
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                Descrição
              </h3>
              <div>
                <Label>Resumo/Sinopse</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Breve resumo..."
                  rows={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowAddDialog(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createBookMutation.mutate(formData)}
              disabled={
                createBookMutation.isPending || !isFormValid() || uploadingImage
              }
            >
              {(createBookMutation.isPending || uploadingImage) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Salvar Alterações" : "Adicionar Livro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Livro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{selectedBook?.title}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedBook) deleteBookMutation.mutate(selectedBook.id);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBookMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
