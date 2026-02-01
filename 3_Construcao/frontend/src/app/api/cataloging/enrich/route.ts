import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeIsbn, isValidIsbn10, isValidIsbn13 } from "@/lib/isbn";

/**
 * POST /api/cataloging/enrich
 * Enriquece dados de um livro via Google Books API
 *
 * Input: ISBN ou título + autor
 * Output: Dados enriquecidos (descrição, capa, categorias, etc.)
 */

const enrichSchema = z
  .object({
    isbn: z.string().optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    publisher: z.string().optional(),
    publishedYear: z.number().int().min(1000).max(3000).optional(),
  })
  .refine((data) => data.isbn || data.title, {
    message: "Forneça ISBN ou título",
  });

function normalizeText(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function tokenize(value: string | undefined): string[] {
  if (!value) return [];
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length >= 3);
}

function parseYear(publishedDate?: string): number | null {
  if (!publishedDate) return null;
  const year = Number.parseInt(String(publishedDate).split("-")[0] ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

function pickBestVolume(
  items: any[],
  input: {
    title?: string;
    author?: string;
    publisher?: string;
    publishedYear?: number;
  },
): any {
  const titleTokens = tokenize(input.title);
  const authorTokens = tokenize(input.author);
  const publisherTokens = tokenize(input.publisher);
  const expectedYear = input.publishedYear;

  let best = items[0];
  let bestScore = -1;

  for (const item of items) {
    const info = item?.volumeInfo ?? {};

    const candidateTitle = normalizeText(String(info.title ?? ""));
    const candidateAuthors = normalizeText(
      Array.isArray(info.authors)
        ? info.authors.join(" ")
        : String(info.authors ?? ""),
    );
    const candidatePublisher = normalizeText(String(info.publisher ?? ""));
    const candidateYear = parseYear(info.publishedDate);

    const identifiers = Array.isArray(info.industryIdentifiers)
      ? info.industryIdentifiers
      : [];
    const isbn13 = identifiers.find(
      (id: any) => id?.type === "ISBN_13",
    )?.identifier;
    const isbn10 = identifiers.find(
      (id: any) => id?.type === "ISBN_10",
    )?.identifier;
    const normalized13 = normalizeIsbn(isbn13);
    const normalized10 = normalizeIsbn(isbn10);
    const hasValidIsbn =
      (normalized13 && isValidIsbn13(normalized13)) ||
      (normalized10 && isValidIsbn10(normalized10));

    let score = 0;

    // Título tem maior peso
    for (const token of titleTokens) {
      if (candidateTitle.includes(token)) score += 3;
    }

    // Autor ajuda muito quando disponível
    for (const token of authorTokens) {
      if (candidateAuthors.includes(token)) score += 2;
    }

    // Editora e ano só refinam
    for (const token of publisherTokens) {
      if (candidatePublisher.includes(token)) score += 1;
    }

    if (expectedYear && candidateYear && expectedYear === candidateYear) {
      score += 2;
    }

    // Bonus por ter ISBN válido
    if (hasValidIsbn) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

interface GoogleBooksVolume {
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Validar input
    const body = await request.json();
    const data = enrichSchema.parse(body);

    // 3. Build query para Google Books API
    let query = "";
    if (data.isbn) {
      query = `isbn:${data.isbn}`;
    } else {
      query = `intitle:${data.title}`;
      if (data.author) {
        query += `+inauthor:${data.author}`;
      }
      if (data.publisher) {
        query += `+inpublisher:${data.publisher}`;
      }
    }

    // 4. Chamar Google Books API
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${apiKey ? `&key=${apiKey}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Erro na API Google Books:", response.statusText);
      return NextResponse.json(
        { error: "Falha ao consultar Google Books", enrichedData: null },
        { status: 200 }, // Não é erro crítico, apenas não encontrou
      );
    }

    const result = await response.json();

    if (!result.items || result.items.length === 0) {
      return NextResponse.json({
        enrichedData: null,
        message: "Nenhum resultado encontrado",
      });
    }

    // 5. Selecionar melhor resultado (pontuação por título/autor/editora/ano + bonus por ISBN válido)
    const volume: GoogleBooksVolume = data.isbn
      ? result.items[0]
      : pickBestVolume(result.items, {
          title: data.title,
          author: data.author,
          publisher: data.publisher,
          publishedYear: data.publishedYear,
        });
    const info = volume.volumeInfo;

    // Extrair ISBN-13 ou ISBN-10
    const isbn13 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_13",
    )?.identifier;
    const isbn10 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_10",
    )?.identifier;

    const normalizedIsbn =
      normalizeIsbn(isbn13) ||
      normalizeIsbn(isbn10) ||
      normalizeIsbn(data.isbn);

    const safeIsbn =
      normalizedIsbn &&
      ((normalizedIsbn.length === 13 && isValidIsbn13(normalizedIsbn)) ||
        (normalizedIsbn.length === 10 && isValidIsbn10(normalizedIsbn)))
        ? normalizedIsbn
        : undefined;

    // Extrair ano de publicação
    const publicationYear = info.publishedDate
      ? parseInt(info.publishedDate.split("-")[0])
      : undefined;

    // Mapear categoria (primeira categoria encontrada)
    const suggestedCategory = info.categories?.[0];

    const enrichedData = {
      title: info.title,
      subtitle: info.subtitle,
      authors: info.authors?.join(", "),
      publisher: info.publisher,
      publicationYear,
      description: info.description,
      pages: info.pageCount,
      language: info.language,
      isbn: safeIsbn,
      coverUrl:
        info.imageLinks?.thumbnail?.replace("http:", "https:") ||
        info.imageLinks?.smallThumbnail?.replace("http:", "https:"),
      categories: info.categories,
      suggestedCategory,
      source: "google_books",
    };

    return NextResponse.json({
      enrichedData,
      message: "Dados enriquecidos com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Erro ao enriquecer dados:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
