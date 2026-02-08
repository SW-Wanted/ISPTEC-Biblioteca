"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { api, type Book } from "@/api/apiClient";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
  type QueryClient,
} from "@tanstack/react-query";
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
  Archive,
  Layers,
  Pencil,
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
import { useBookPolicyBadge } from "@/hooks/use-book-policy-badge";

type CopyRow = {
  id: string;
  barcode: string;
  rfidTag?: string | null;
  status: string;
  condition?: string | null;
  location: string;
  notes?: string | null;
  createdAt: string;
  loans?: {
    id: string;
    status: string;
    dueDate: string;
    user: { name: string; email: string };
  }[];
  reservation?: {
    userName: string;
    userEmail: string;
  } | null;
};

function copyStatusBadge(status: string) {
  switch (status) {
    case "AVAILABLE":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Disponível</Badge>
      );
    case "BORROWED":
      return <Badge className="bg-blue-100 text-blue-700">Emprestado</Badge>;
    case "RESERVED":
      return <Badge className="bg-amber-100 text-amber-700">Reservado</Badge>;
    case "MAINTENANCE":
      return <Badge className="bg-slate-100 text-slate-700">Manutenção</Badge>;
    case "LOST":
      return <Badge className="bg-red-100 text-red-700">Perdido</Badge>;
    case "DAMAGED":
      return (
        <Badge className="bg-orange-100 text-orange-700">Danificado</Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function conditionLabel(c?: string | null) {
  switch (c) {
    case "EXCELLENT":
      return "Excelente";
    case "GOOD":
      return "Bom";
    case "FAIR":
      return "Razoável";
    case "POOR":
      return "Mau";
    default:
      return "—";
  }
}

export default function ManageBooks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  const [editingCopy, setEditingCopy] = useState<CopyRow | null>(null);
  const [showAddCopyForm, setShowAddCopyForm] = useState(false);
  const [copyForm, setCopyForm] = useState({
    barcode: "",
    location: "",
    condition: "GOOD",
    rfidTag: "",
    notes: "",
  });
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

  const getPolicyBadge = useBookPolicyBadge();

  type BookFormData = typeof formData;

  const createBookMutation = useMutation<Book, Error, BookFormData>({
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
      // Soft delete: archive the book instead of hard delete
      const res = await fetch(`/api/books/${bookId}/copies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao arquivar livro");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      setShowDeleteDialog(false);
      setSelectedBook(null);
      toast.success(data.message || "Livro arquivado!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation for adding/removing copies
  const copyMutation = useMutation({
    mutationFn: async (
      payload: Record<string, unknown> & { bookId: string },
    ) => {
      const { bookId, ...body } = payload;
      const res = await fetch(`/api/books/${bookId}/copies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerir exemplares");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manage-books"] });
      queryClient.invalidateQueries({ queryKey: ["book-copies"] });
      setEditingCopy(null);
      setShowAddCopyForm(false);
      setCopyForm({
        barcode: "",
        location: "",
        condition: "GOOD",
        rfidTag: "",
        notes: "",
      });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      material_type: (book as any).material_type || "BOOK",
      loan_policy: (book as any).loan_policy || "STANDARD",
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
              <Library className="w-7 h-7 text-amber-600" />
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            <span
                              className={cn(
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
                          </span>
                          {(() => {
                            const policy = getPolicyBadge(
                              book.available_copies ?? 0,
                              book.total_copies ?? 0,
                            );
                            return (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  policy.className,
                                )}
                              >
                                {policy.label}
                              </Badge>
                            );
                          })()}
                        </div>
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
                          <DropdownMenuContent
                            align="end"
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
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
                              onClick={() => {
                                setSelectedBook(book);
                                setShowCopiesDialog(true);
                              }}
                            >
                              <Layers className="w-4 h-4 mr-2" />
                              Gerir Exemplares
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedBook(book);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Arquivar Livro
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
                        // Ao adicionar, available_copies = total_copies
                        // Ao editar, não alterar available_copies automaticamente
                        available_copies: isEditing
                          ? formData.available_copies
                          : newTotal,
                      });
                    }}
                    className={
                      !formData.total_copies || formData.total_copies < 1
                        ? "border-red-300"
                        : ""
                    }
                    placeholder="Mínimo: 1"
                  />
                  {!isEditing && (
                    <p className="text-xs text-slate-500 mt-1">
                      Cópias disponíveis serão definidas automaticamente com o
                      mesmo valor.
                    </p>
                  )}
                </div>
                {isEditing && (
                  <div>
                    <Label>Cópias Disponíveis</Label>
                    <Input
                      type="number"
                      value={formData.available_copies}
                      readOnly
                      disabled
                      className="bg-slate-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Valor calculado automaticamente (empréstimos, devoluções,
                      perdas).
                    </p>
                  </div>
                )}
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
            <AlertDialogTitle>Arquivar Livro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar &quot;{selectedBook?.title}&quot;?
              O livro ficará indisponível na biblioteca mas os seus dados e
              histórico serão preservados.
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
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual Copy Management Dialog */}
      <CopyManagementDialog
        book={selectedBook}
        open={showCopiesDialog}
        onOpenChange={(open) => {
          setShowCopiesDialog(open);
          if (!open) {
            setSelectedBook(null);
            setEditingCopy(null);
            setShowAddCopyForm(false);
          }
        }}
        editingCopy={editingCopy}
        setEditingCopy={setEditingCopy}
        showAddCopyForm={showAddCopyForm}
        setShowAddCopyForm={setShowAddCopyForm}
        copyForm={copyForm}
        setCopyForm={setCopyForm}
        copyMutation={copyMutation}
        queryClient={queryClient}
      />
    </div>
  );
}

// --- Copy Management Dialog Component ---

function CopyManagementDialog({
  book,
  open,
  onOpenChange,
  editingCopy,
  setEditingCopy,
  showAddCopyForm,
  setShowAddCopyForm,
  copyForm,
  setCopyForm,
  copyMutation,
  queryClient,
}: {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCopy: CopyRow | null;
  setEditingCopy: (c: CopyRow | null) => void;
  showAddCopyForm: boolean;
  setShowAddCopyForm: (v: boolean) => void;
  copyForm: {
    barcode: string;
    location: string;
    condition: string;
    rfidTag: string;
    notes: string;
  };
  setCopyForm: (f: {
    barcode: string;
    location: string;
    condition: string;
    rfidTag: string;
    notes: string;
  }) => void;
  copyMutation: UseMutationResult<
    unknown,
    Error,
    Record<string, unknown> & { bookId: string }
  >;
  queryClient: QueryClient;
}) {
  const { data: copiesData, isLoading: copiesLoading } = useQuery<{
    copies: CopyRow[];
  }>({
    queryKey: ["book-copies", book?.id],
    queryFn: async () => {
      const res = await fetch(`/api/books/${book!.id}/copies`);
      if (!res.ok) throw new Error("Erro ao carregar exemplares");
      return res.json();
    },
    enabled: open && !!book?.id,
    refetchInterval: open ? 10000 : false,
  });

  const copies = copiesData?.copies ?? [];

  const [deleteCopyId, setDeleteCopyId] = useState<string | null>(null);

  const handleCreateCopy = () => {
    if (!book) return;
    copyMutation.mutate({
      bookId: book.id,
      action: "create",
      barcode: copyForm.barcode.trim(),
      location: copyForm.location.trim(),
      condition: copyForm.condition,
      rfidTag: copyForm.rfidTag.trim() || undefined,
      notes: copyForm.notes.trim() || undefined,
    });
  };

  const handleUpdateCopy = () => {
    if (!book || !editingCopy) return;
    copyMutation.mutate({
      bookId: book.id,
      action: "update",
      copyId: editingCopy.id,
      barcode: copyForm.barcode.trim(),
      location: copyForm.location.trim(),
      condition: copyForm.condition,
      status: copyForm.notes, // reusing notes field temporarily for status in edit
      rfidTag: copyForm.rfidTag.trim() || undefined,
    });
  };

  const handleDeleteCopy = (copyId: string) => {
    if (!book) return;
    copyMutation.mutate(
      { bookId: book.id, action: "delete", copyId },
      {
        onSuccess: () => {
          setDeleteCopyId(null);
          queryClient.invalidateQueries({ queryKey: ["book-copies", book.id] });
        },
      },
    );
  };

  const startEditing = (copy: CopyRow) => {
    setEditingCopy(copy);
    setShowAddCopyForm(false);
    setCopyForm({
      barcode: copy.barcode,
      location: copy.location,
      condition: copy.condition || "GOOD",
      rfidTag: copy.rfidTag || "",
      notes: copy.status, // store status in notes for editing
    });
  };

  const cancelEdit = () => {
    setEditingCopy(null);
    setShowAddCopyForm(false);
    setCopyForm({
      barcode: "",
      location: "",
      condition: "GOOD",
      rfidTag: "",
      notes: "",
    });
  };

  const summaryBadges = {
    total: copies.length,
    available: copies.filter((c) => c.status === "AVAILABLE").length,
    borrowed: copies.filter((c) => c.status === "BORROWED").length,
    maintenance: copies.filter((c) =>
      ["MAINTENANCE", "LOST", "DAMAGED"].includes(c.status),
    ).length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Exemplares — {book?.title}
          </DialogTitle>
          <DialogDescription>
            Gerir exemplares individuais deste livro. Cada exemplar tem código
            de barras, localização e estado próprios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">Total: {summaryBadges.total}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">
              Disponíveis: {summaryBadges.available}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              Emprestados: {summaryBadges.borrowed}
            </Badge>
            {summaryBadges.maintenance > 0 && (
              <Badge className="bg-slate-100 text-slate-700">
                Manutenção/Outros: {summaryBadges.maintenance}
              </Badge>
            )}

            {/* Show sync button if counters are inconsistent */}
            {book &&
              (book.total_copies !== summaryBadges.total ||
                book.available_copies !== summaryBadges.available) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => {
                    copyMutation.mutate(
                      { bookId: book.id, action: "sync" },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: ["manage-books"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["book-copies"],
                          });
                        },
                      },
                    );
                  }}
                  disabled={copyMutation.isPending}
                >
                  {copyMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : null}
                  Sincronizar Contadores
                </Button>
              )}
          </div>

          {/* Copies table */}
          {copiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : copies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Nenhum exemplar registado.</p>
              <p className="text-sm">Adicione o primeiro exemplar abaixo.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Código de Barras</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Utilizador</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {copies.map((copy, idx) => {
                    const activeLoan = copy.loans?.[0];
                    const canEdit = !["BORROWED"].includes(copy.status);
                    const canDelete = !["BORROWED"].includes(copy.status);
                    return (
                      <TableRow key={copy.id}>
                        <TableCell className="font-mono text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {copy.barcode}
                        </TableCell>
                        <TableCell className="text-sm">
                          {copy.location}
                        </TableCell>
                        <TableCell>{copyStatusBadge(copy.status)}</TableCell>
                        <TableCell className="text-sm">
                          {conditionLabel(copy.condition)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {activeLoan ? (
                            <span
                              className="text-blue-600"
                              title={activeLoan.user.email}
                            >
                              {activeLoan.user.name}
                            </span>
                          ) : copy.status === "RESERVED" && copy.reservation ? (
                            <span
                              className="text-amber-600"
                              title={copy.reservation.userEmail}
                            >
                              {copy.reservation.userName}
                              <span className="text-xs text-slate-400 ml-1">
                                (reserva)
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canEdit}
                              onClick={() => startEditing(copy)}
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canDelete}
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteCopyId(copy.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add/Edit Copy Form */}
          {(showAddCopyForm || editingCopy) && (
            <div
              data-copy-form
              className="border rounded-lg p-4 space-y-3 bg-slate-50"
            >
              <h4 className="font-medium text-sm">
                {editingCopy
                  ? `Editar Exemplar — ${editingCopy.barcode}`
                  : "Novo Exemplar"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Código de Barras *</Label>
                  <Input
                    value={copyForm.barcode}
                    onChange={(e) =>
                      setCopyForm({ ...copyForm, barcode: e.target.value })
                    }
                    placeholder="Ex: LIV-001-001"
                    disabled={!!editingCopy}
                  />
                </div>
                <div>
                  <Label className="text-xs">Localização *</Label>
                  <Input
                    value={copyForm.location}
                    onChange={(e) =>
                      setCopyForm({ ...copyForm, location: e.target.value })
                    }
                    placeholder="Ex: A1-P1-E3"
                  />
                </div>
                <div>
                  <Label className="text-xs">Condição</Label>
                  <Select
                    value={copyForm.condition}
                    onValueChange={(v) =>
                      setCopyForm({ ...copyForm, condition: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Excelente</SelectItem>
                      <SelectItem value="GOOD">Bom</SelectItem>
                      <SelectItem value="FAIR">Razoável</SelectItem>
                      <SelectItem value="POOR">Mau</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingCopy && (
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select
                      value={copyForm.notes}
                      onValueChange={(v) =>
                        setCopyForm({ ...copyForm, notes: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Disponível</SelectItem>
                        <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
                        <SelectItem value="DAMAGED">Danificado</SelectItem>
                        <SelectItem value="LOST">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">RFID Tag (opcional)</Label>
                  <Input
                    value={copyForm.rfidTag}
                    onChange={(e) =>
                      setCopyForm({ ...copyForm, rfidTag: e.target.value })
                    }
                    placeholder="Tag RFID"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={editingCopy ? handleUpdateCopy : handleCreateCopy}
                  disabled={
                    !copyForm.barcode.trim() ||
                    !copyForm.location.trim() ||
                    copyMutation.isPending
                  }
                >
                  {copyMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  )}
                  {editingCopy ? "Guardar" : "Adicionar"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0 shrink-0 border-t pt-4 bg-white relative z-10">
          {!showAddCopyForm && !editingCopy && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Limpar estado de edição sem fechar o formulário
                setEditingCopy(null);
                setCopyForm({
                  barcode: "",
                  location: "",
                  condition: "GOOD",
                  rfidTag: "",
                  notes: "",
                });
                setShowAddCopyForm(true);
                // Auto-scroll para o formulário
                setTimeout(() => {
                  const form = document.querySelector("[data-copy-form]");
                  if (form) {
                    form.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    });
                  }
                }, 100);
              }}
              type="button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Exemplar
            </Button>
          )}
        </DialogFooter>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteCopyId}
          onOpenChange={(open) => {
            if (!open) setDeleteCopyId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Exemplar</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? O exemplar será permanentemente removido. Esta
                acção não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteCopyId) handleDeleteCopy(deleteCopyId);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {copyMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
