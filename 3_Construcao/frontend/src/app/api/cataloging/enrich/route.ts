import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/cataloging/enrich
 * Enriquece dados de livro usando Google Books API
 * Busca por ISBN (prioritário) ou título+autor
 */

const enrichSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, publisher, publishedYear } =
      enrichSchema.parse(body);

    // Validar que ao menos ISBN ou título foi fornecido
    if (!isbn && !title) {
      return NextResponse.json(
        { error: "ISBN ou título é obrigatório" },
        { status: 400 },
      );
    }

    console.log("📚 Enriquecendo dados:", { isbn, title, author });

    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
    let enrichedData = null;

    // Estratégia 1: Buscar por ISBN (mais preciso)
    if (isbn) {
      try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`;
        console.log("🔍 Buscando por ISBN:", isbn);

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const bookInfo = data.items[0].volumeInfo;
          enrichedData = normalizeGoogleBooksData(bookInfo, isbn);
          console.log("✅ Dados encontrados por ISBN");
        }
      } catch (error) {
        console.error("❌ Erro ao buscar por ISBN:", error);
      }
    }

    // Estratégia 2: Buscar por título + autor (fallback)
    if (!enrichedData && title) {
      try {
        // Construir query composta
        let query = `intitle:${encodeURIComponent(title)}`;
        if (author) query += `+inauthor:${encodeURIComponent(author)}`;
        if (publisher) query += `+inpublisher:${encodeURIComponent(publisher)}`;

        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=5`;
        console.log("🔍 Buscando por título:", query);

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          // Pegar o resultado mais relevante (primeiro)
          const bookInfo = data.items[0].volumeInfo;

          // Tentar extrair ISBN do resultado
          const foundIsbn =
            bookInfo.industryIdentifiers?.find(
              (id: any) => id.type === "ISBN_13",
            )?.identifier ||
            bookInfo.industryIdentifiers?.find(
              (id: any) => id.type === "ISBN_10",
            )?.identifier;

          enrichedData = normalizeGoogleBooksData(bookInfo, foundIsbn || isbn);
          console.log("✅ Dados encontrados por título");
        }
      } catch (error) {
        console.error("❌ Erro ao buscar por título:", error);
      }
    }

    // Se nenhuma fonte retornou dados, retornar resposta vazia
    if (!enrichedData) {
      console.log("⚠️ Nenhum dado encontrado no Google Books");
      return NextResponse.json(
        {
          enrichedData: null,
          message: "Nenhum dado encontrado no Google Books",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ enrichedData }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("❌ Erro ao enriquecer dados:", error);
    return NextResponse.json(
      { error: "Erro ao enriquecer dados do livro" },
      { status: 500 },
    );
  }
}

/**
 * Normaliza dados retornados do Google Books API
 * Combina todos os dados disponíveis e mapeia idioma
 */
function normalizeGoogleBooksData(bookInfo: any, isbn?: string) {
  // Extrair ISBN (priorizar ISBN-13)
  const bookIsbn =
    isbn ||
    bookInfo.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")
      ?.identifier ||
    bookInfo.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")
      ?.identifier;

  // Extrair ano de publicação
  let publicationYear = null;
  if (bookInfo.publishedDate) {
    const yearMatch = bookInfo.publishedDate.match(/\d{4}/);
    publicationYear = yearMatch ? parseInt(yearMatch[0]) : null;
  }

  // Mapear idioma para código ISO 639-1 (formato do combobox)
  const languageMap: Record<string, string> = {
    pt: "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
    por: "pt",
    en: "en",
    eng: "en",
    "en-US": "en",
    "en-GB": "en",
    es: "es",
    spa: "es",
    fr: "fr",
    fra: "fr",
    de: "de",
    deu: "de",
    it: "it",
    ita: "it",
  };

  const rawLanguage = bookInfo.language?.toLowerCase();
  const normalizedLanguage = rawLanguage
    ? languageMap[rawLanguage] || rawLanguage.slice(0, 2)
    : "pt";

  // Extrair dimensões do livro (se disponível)
  const dimensions = bookInfo.dimensions
    ? `${bookInfo.dimensions.height} x ${bookInfo.dimensions.width} x ${bookInfo.dimensions.thickness}`
    : null;

  // Extrair edição (do título ou campo específico)
  let edition = null;
  if (bookInfo.title) {
    const editionMatch = bookInfo.title.match(/(\d+)[ªº°]?\s*(ed|edição)/i);
    edition = editionMatch ? editionMatch[1] + "ª" : null;
  }

  // Extrair palavras-chave das categorias
  const keywords = bookInfo.categories
    ? bookInfo.categories.flatMap((cat: string) =>
        cat.split("/").map((k: string) => k.trim()),
      )
    : [];

  // Buscar capa de melhor qualidade
  const coverUrl =
    bookInfo.imageLinks?.extraLarge ||
    bookInfo.imageLinks?.large ||
    bookInfo.imageLinks?.medium ||
    bookInfo.imageLinks?.thumbnail ||
    bookInfo.imageLinks?.smallThumbnail ||
    null;

  // Limpar descrição HTML
  const cleanDescription = bookInfo.description
    ? bookInfo.description.replace(/<[^>]*>/g, "").trim()
    : null;

  return {
    // Dados básicos
    isbn: bookIsbn,
    title: bookInfo.title || null,
    subtitle: bookInfo.subtitle || null,
    edition,

    // Autores e editora
    authors: bookInfo.authors || null,
    publisher: bookInfo.publisher || null,

    // Publicação
    publicationYear,
    publishedDate: bookInfo.publishedDate || null, // Data completa original

    // Características físicas
    pages: bookInfo.pageCount || null,
    language: normalizedLanguage,
    dimensions,

    // Conteúdo
    description: cleanDescription,
    categories: bookInfo.categories || null,
    keywords: keywords.length > 0 ? keywords : null,

    // Mídia
    coverUrl,
    thumbnail: bookInfo.imageLinks?.thumbnail || null,

    // Classificações
    averageRating: bookInfo.averageRating || null,
    ratingsCount: bookInfo.ratingsCount || null,
    maturityRating: bookInfo.maturityRating || null,

    // Metadados Google Books
    googleBooksId: bookInfo.industryIdentifiers?.[0]?.identifier || null,
    previewLink: bookInfo.previewLink || null,
    infoLink: bookInfo.infoLink || null,

    // Origem
    source: "Google Books",
  };
}
