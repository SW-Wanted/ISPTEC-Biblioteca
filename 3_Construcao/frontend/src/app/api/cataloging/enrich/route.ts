import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  })
  .refine((data) => data.isbn || (data.title && data.author), {
    message: "Forneça ISBN ou (título + autor)",
  });

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
    }

    // 4. Chamar Google Books API
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${apiKey ? `&key=${apiKey}` : ""}`;

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

    // 5. Processar primeiro resultado (mais relevante)
    const volume: GoogleBooksVolume = result.items[0];
    const info = volume.volumeInfo;

    // Extrair ISBN-13 ou ISBN-10
    const isbn13 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_13",
    )?.identifier;
    const isbn10 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_10",
    )?.identifier;

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
      isbn: isbn13 || isbn10 || data.isbn,
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
