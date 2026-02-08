type BaseEntity = {
  id: string;
  created_date?: string;
  updated_date?: string;
  [key: string]: unknown;
};

export type Book = BaseEntity & {
  title: string;
  subtitle?: string | null;
  isbn?: string | null;
  authors?: string[];
  publisher?: string | null;
  publication_year?: number | null;
  edition?: string | null;
  language?: string | null;
  pages?: number | null;
  category?: string | null;
  description?: string | null;
  location?: string | null;
  total_copies?: number;
  available_copies?: number;
  cover_url?: string | null;
  average_rating?: number;
  total_loans?: number;
  catalog_status?: string;
  extracted_by_ocr?: boolean;
  ocr_confidence?: number | null;
};

export type Category = BaseEntity & { name?: string };
export type Copy = BaseEntity & { book_id?: string; status?: string };
export type Member = BaseEntity & {
  user_id?: string;
  full_name?: string;
  status?: string;
  role?: string;
  total_fines?: number;
  notification_preferences?: Record<string, unknown>;
};

export type Loan = BaseEntity & {
  status?: string;
  loan_date?: string;
  due_date?: string;
  return_date?: string | null;
  member_id?: string;
  member_name?: string;
  book_id?: string;
  book_title?: string;
  cover_url?: string | null;
  loan_policy?: string;
  material_type?: string;
  copy_id?: string;
  renewal_count?: number;
  max_renewals?: number;
  days_overdue?: number;
  fine_amount?: number;
};

export type Reservation = BaseEntity & {
  status?: string;
  user_id?: string;
  member_id?: string;
  member_type?: string;
  book_id?: string;
  book_title?: string;
  cover_url?: string | null;
  reservation_date?: string;
  queue_position?: number;
  available_date?: string | null;
  expiry_date?: string | null;
  collection_date?: string | null;
};

export type Fine = BaseEntity & {
  status?: string;
  user_id?: string;
  amount?: number;
};

export type Notification = BaseEntity & {
  user_id?: string;
  type?: string;
  title?: string;
  message?: string;
  status?: string;
  action_type?: string;
  loan_id?: string;
  reservation_id?: string;
  read_at?: string | null;
};

export type Locker = BaseEntity;
export type Computer = BaseEntity;
export type SpecialRequest = BaseEntity & {
  user_id?: string;
  user_name?: string;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  requested_at?: string;
  scheduled_date?: string | null;
  response?: string | null;
};
export type BookReview = BaseEntity;
export type ChatConversation = BaseEntity;

type SortField = string | undefined;
type ListResult<T> = T[];

type SubscriptionEvent<T> =
  | { type: "create"; record: T }
  | { type: "update"; id: string; patch: Partial<T>; record: T }
  | { type: "delete"; id: string }
  | { type: "refetch" };

type Unsubscribe = () => void;

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("apiClient: browser-only client called on server");
  }
}

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

function createEntityClient<T extends { id: string }>(entity: string) {
  const base = `/api/entities/${encodeURIComponent(entity)}`;
  return {
    list: async (sort?: SortField, take?: number): Promise<ListResult<T>> => {
      const url = new URL(base, window.location.origin);
      if (sort) url.searchParams.set("sort", sort);
      if (typeof take === "number") url.searchParams.set("take", String(take));
      return await http<T[]>(url.toString(), { method: "GET" });
    },
    filter: async (
      criteria: Record<string, unknown>,
    ): Promise<ListResult<T>> => {
      const url = new URL(base, window.location.origin);
      url.searchParams.set("filter", JSON.stringify(criteria));
      return await http<T[]>(url.toString(), { method: "GET" });
    },
    create: async (
      data: Omit<Partial<T>, "id"> & Record<string, unknown>,
    ): Promise<T> => {
      return await http<T>(base, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      patch: Partial<T> & Record<string, unknown>,
    ): Promise<T> => {
      return await http<T>(`${base}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },
    delete: async (id: string): Promise<void> => {
      await http(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    subscribe: (cb: (event: SubscriptionEvent<T>) => void): Unsubscribe => {
      ensureBrowser();
      // Simple polling fallback (keeps existing UI behaviour)
      const interval = window.setInterval(() => cb({ type: "refetch" }), 5000);
      return () => window.clearInterval(interval);
    },
  };
}

type AuthUser = {
  id?: string;
  email: string;
  full_name?: string | null;
  type?: string | null;
  activationStatus?: string | null;
  profile_image_url?: string | null;
};

export const api = {
  auth: {
    me: async (): Promise<AuthUser> => {
      ensureBrowser();
      return await http<AuthUser>("/api/auth/me", { method: "GET" });
    },
    setUser: async (user: AuthUser): Promise<void> => {
      // No-op (session is managed by NextAuth cookies)
      void user;
    },
    logout: async (): Promise<void> => {
      ensureBrowser();
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/login" });
    },
  },
  loans: {
    renew: async (loanId: string): Promise<{ ok: true; loan: Loan }> => {
      ensureBrowser();
      return await http<{ ok: true; loan: Loan }>(
        `/api/loans/${encodeURIComponent(loanId)}/renew`,
        {
          method: "POST",
        },
      );
    },
  },
  cataloging: {
    /**
     * Analisa imagem de livro usando Gemini Vision (API dedicada para catalogação)
     * Muito mais preciso que OCR puro - este método extrai dados directamente da fotografia
     */
    analyzeImage: async (imageBase64: string, mimeType: string) => {
      const res = await fetch("/api/cataloging/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Erro ao analisar imagem (HTTP ${res.status})`,
        );
      }

      return await res.json();
    },

    /**
     * Enriquece dados via Google Books API
     * Aceita ISBN, título, autor, editora e ano para buscar informações adicionais
     */
    enrichData: async (params: {
      isbn?: string;
      title?: string;
      author?: string;
      publisher?: string;
      publishedYear?: number;
    }): Promise<{
      enrichedData: {
        title?: string | null;
        subtitle?: string | null;
        authors?: string[] | null;
        publisher?: string | null;
        publicationYear?: number | null;
        pages?: number | null;
        language?: string | null;
        description?: string | null;
        categories?: string[] | null;
        thumbnail?: string | null;
        isbn?: string | null;
        source?: string;
      } | null;
      message?: string;
    }> => {
      const res = await fetch("/api/cataloging/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Erro ao enriquecer dados (HTTP ${res.status})`,
        );
      }

      return await res.json();
    },

    /**
     * Cria uma entrada de catalogação com dados extraídos e enriquecidos
     * Esta entrada fica pendente até ser aprovada pelo supervisor
     */
    createEntry: async (data: {
      imageUrl: string;
      extractedTitle?: string;
      extractedAuthor?: string;
      extractedISBN?: string;
      extractedPublisher?: string;
      extractedYear?: number;
      enrichedData?: Record<string, unknown>;
    }): Promise<{ id: string }> => {
      const res = await fetch("/api/cataloging/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Erro ao criar entrada (HTTP ${res.status})`,
        );
      }

      return await res.json();
    },

    /**
     * Aprova uma entrada de catalogação (cria Book + Copies no sistema)
     * Só pode ser executado por utilizadores com permissão de supervisor
     */
    approveEntry: async (
      entryId: string,
      data: {
        title: string;
        subtitle?: string;
        isbn?: string;
        authors: string;
        publisher?: string;
        publicationYear?: number;
        edition?: string;
        language?: string;
        pages?: number;
        categoryId: string;
        description?: string;
        coverUrl?: string;
        location?: string;
        totalCopies?: number;
        reviewNotes?: string;
        materialType?: string;
        loanPolicy?: string;
      },
    ): Promise<{ ok: boolean; bookId: string }> => {
      const res = await fetch(`/api/cataloging/entries/${entryId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Erro ao aprovar entrada (HTTP ${res.status})`,
        );
      }

      return await res.json();
    },
  },
  entities: {
    Book: createEntityClient<Book>("Book"),
    Category: createEntityClient<Category>("Category"),
    Copy: createEntityClient<Copy>("Copy"),
    Member: createEntityClient<Member>("Member"),
    Loan: createEntityClient<Loan>("Loan"),
    Reservation: createEntityClient<Reservation>("Reservation"),
    Fine: createEntityClient<Fine>("Fine"),
    Notification: createEntityClient<Notification>("Notification"),
    Locker: createEntityClient<Locker>("Locker"),
    Computer: createEntityClient<Computer>("Computer"),
    SpecialRequest: createEntityClient<SpecialRequest>("SpecialRequest"),
    BookReview: createEntityClient<BookReview>("BookReview"),
    ChatConversation: createEntityClient<ChatConversation>("ChatConversation"),
  },
  integrations: {
    Core: {
      /**
       * Upload a file to server storage (Cloudinary if configured, else data URL fallback).
       * @param file - The File object to upload.
       * @param folder - Target folder: 'covers' | 'documents' | 'ocr' (default: 'covers').
       */
      UploadFile: async ({
        file,
        folder = "covers",
      }: {
        file: File;
        folder?: "covers" | "documents" | "ocr";
      }): Promise<{ file_url: string }> => {
        ensureBrowser();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = body?.error ?? `Falha no upload (HTTP ${res.status})`;
          throw new Error(msg);
        }

        return (await res.json()) as { file_url: string };
      },
      InvokeLLM: async <TResponse = unknown>({
        prompt,
        file_urls,
        response_json_schema,
      }: {
        prompt: string;
        file_urls?: string[];
        response_json_schema?: unknown;
      } & Record<string, unknown>): Promise<TResponse> => {
        ensureBrowser();

        // Tentar usar API real se configurada
        try {
          const response = await fetch("/api/ai/invoke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, file_urls, response_json_schema }),
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            return data.result as TResponse;
          }
        } catch (error) {
          console.warn("⚠️ API de IA não disponível, usando fallback:", error);
        }

        // Fallback: retornar estrutura vazia mas válida
        // Se pediu um JSON schema, retornar objeto vazio estruturado
        if (response_json_schema) {
          const obj = {
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
            pages: "",
            confidence: 0,
          };
          console.log("📦 Fallback: retornando objeto vazio estruturado");
          return obj as unknown as TResponse;
        }

        // Para perguntas de texto simples
        return "Neste momento o assistente funciona em modo offline. Posso ajudar com regras de empréstimos, renovações, reservas e horário da biblioteca." as unknown as TResponse;
      },
    },
  },
};