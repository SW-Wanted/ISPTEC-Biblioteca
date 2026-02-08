/**
 * Serviço de Recomendações de Livros - RF026
 * Sistema de Gestão de Biblioteca Universitária - ISPTEC
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type RecommendationAlgorithm =
  | "COLLABORATIVE"
  | "CONTENT_BASED"
  | "HYBRID";

export interface RecommendedBook {
  id: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  authors: string[];
  category: string | null;
  availableCopies: number;
  averageRating: number | null;
  totalLoans: number;
  confidence: number;
  reason: string;
}

export interface RecommendationResult {
  recommendations: RecommendedBook[];
  algorithm: RecommendationAlgorithm;
  totalRecommendations: number;
}

/**
 * Gera recomendações personalizadas baseadas no histórico do utilizador
 * Implementa RF026 - Recomendações com base em histórico e categorias similares
 *
 * @param userId - ID do utilizador
 * @param limit - Número máximo de recomendações (padrão: 5, mínimo conforme requisitos)
 * @returns Lista de livros recomendados
 */
export async function getRecommendations(
  userId: string,
  limit: number = 8,
): Promise<RecommendationResult> {
  // 1. Buscar histórico de empréstimos do utilizador
  const userLoans = await prisma.loan.findMany({
    where: {
      userId,
      status: { in: ["RETURNED", "ACTIVE"] },
    },
    include: {
      copy: {
        include: {
          book: {
            include: {
              category: true,
              authors: {
                include: {
                  author: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { loanDate: "desc" },
    take: 20, // Considerar os últimos 20 empréstimos
  });

  // IDs dos livros já lidos (não recomendar)
  const readBookIds = userLoans.map((loan) => loan.copy.book.id);

  // Se não houver histórico, retornar livros populares
  if (userLoans.length === 0) {
    return await getPopularBooks(limit, []);
  }

  // 2. Análise de categorias preferidas (Content-Based)
  const categoryCount: Record<string, number> = {};
  const authorCount: Record<string, number> = {};

  userLoans.forEach((loan) => {
    const book = loan.copy.book;

    // Contar categorias
    if (book.category) {
      categoryCount[book.categoryId] =
        (categoryCount[book.categoryId] || 0) + 1;
    }

    // Contar autores
    book.authors.forEach((ba) => {
      const authorName = ba.author.name;
      authorCount[authorName] = (authorCount[authorName] || 0) + 1;
    });
  });

  // Categorias mais lidas (top 3)
  const topCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([categoryId]) => categoryId);

  // Autores favoritos (top 3)
  const topAuthors = Object.entries(authorCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([authorName]) => authorName);

  // 3. Buscar livros similares (Collaborative + Content-Based)
  const recommendations = await prisma.book.findMany({
    where: {
      AND: [
        { id: { notIn: readBookIds } }, // Não recomendar já lidos
        { availableCopies: { gt: 0 } }, // Apenas disponíveis
        {
          OR: [
            // Por categoria
            { categoryId: { in: topCategories } },
            // Por autor
            {
              authors: {
                some: {
                  author: {
                    name: { in: topAuthors },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      category: true,
      publisher: true,
      authors: {
        include: {
          author: true,
        },
      },
      copies: {
        select: {
          id: true,
          loans: {
            select: { id: true },
          },
        },
      },
    },
    take: limit * 2, // Buscar mais para filtrar depois
  });

  // 4. Calcular score de confiança para cada recomendação
  const scoredRecommendations = recommendations.map((book) => {
    let confidence = 0;
    const reasons: string[] = [];

    // Score por categoria (peso: 40%)
    if (topCategories.includes(book.categoryId)) {
      const categoryRank = topCategories.indexOf(book.categoryId) + 1;
      confidence += 40 / categoryRank;
      reasons.push(`categoria "${book.category?.name}"`);
    }

    // Score por autor (peso: 30%)
    const bookAuthors = book.authors.map((ba) => ba.author.name);
    const matchingAuthors = bookAuthors.filter((author) =>
      topAuthors.includes(author),
    );
    if (matchingAuthors.length > 0) {
      confidence += 30;
      reasons.push(`autor ${matchingAuthors[0]}`);
    }

    // Score por popularidade (peso: 20%)
    const totalLoans = book.copies.reduce(
      (sum, copy) => sum + copy.loans.length,
      0,
    );
    if (totalLoans > 10) confidence += 20;
    else if (totalLoans > 5) confidence += 10;

    // Score por disponibilidade (peso: 10%)
    if (book.availableCopies >= 3) confidence += 10;
    else if (book.availableCopies >= 1) confidence += 5;

    // Calcular média de avaliações (se existirem)
    const averageRating = book.copies.length > 0 ? null : null; // TODO: implementar quando reviews estiverem disponíveis

    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      coverUrl: book.coverUrl,
      authors: book.authors.map((ba) => ba.author.name),
      category: book.category?.name || null,
      availableCopies: book.availableCopies,
      averageRating,
      totalLoans,
      confidence: Math.min(confidence, 100), // Máximo 100%
      reason:
        reasons.length > 0
          ? `Baseado em ${reasons.join(" e ")} que você gostou`
          : "Popular entre utilizadores similares",
    };
  });

  // 5. Ordenar por confiança e limitar resultado
  const topRecommendations = scoredRecommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  // 6. Salvar recomendações calculadas (opcional - para cache/análise)
  await saveRecommendationsCache(userId, topRecommendations);

  return {
    recommendations: topRecommendations,
    algorithm: "HYBRID", // Combinação de content-based e collaborative
    totalRecommendations: topRecommendations.length,
  };
}

/**
 * Retorna livros populares quando não há histórico
 */
async function getPopularBooks(
  limit: number,
  excludeIds: string[],
): Promise<RecommendationResult> {
  const popularBooks = await prisma.book.findMany({
    where: {
      id: { notIn: excludeIds },
      availableCopies: { gt: 0 },
    },
    include: {
      category: true,
      authors: {
        include: {
          author: true,
        },
      },
      copies: {
        select: {
          id: true,
          loans: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: {
      totalCopies: "desc", // Livros com mais cópias tendem a ser populares
    },
    take: limit,
  });

  const recommendations = popularBooks.map((book) => ({
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    coverUrl: book.coverUrl,
    authors: book.authors.map((ba) => ba.author.name),
    category: book.category?.name || null,
    availableCopies: book.availableCopies,
    averageRating: null,
    totalLoans: book.copies.reduce((sum, copy) => sum + copy.loans.length, 0),
    confidence: 50, // Confiança média para livros populares
    reason: "Popular na biblioteca",
  }));

  return {
    recommendations,
    algorithm: "CONTENT_BASED",
    totalRecommendations: recommendations.length,
  };
}

/**
 * Salva cache das recomendações para análise futura
 */
async function saveRecommendationsCache(
  userId: string,
  recommendations: RecommendedBook[],
): Promise<void> {
  try {
    // Limpar recomendações antigas do usuário (manter apenas as últimas 50)
    const existingRecommendations = await prisma.bookRecommendation.findMany({
      where: {
        book: {
          id: { in: recommendations.map((r) => r.id) },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Para cada livro recomendado, salvar ou atualizar
    for (const rec of recommendations) {
      const existing = existingRecommendations.find((e) => e.bookId === rec.id);

      if (existing) {
        // Atualizar recomendação existente
        await prisma.bookRecommendation.update({
          where: { id: existing.id },
          data: {
            confidence: new Prisma.Decimal(rec.confidence),
            algorithm: "HYBRID",
            updatedAt: new Date(),
          },
        });
      } else {
        // Criar nova recomendação
        await prisma.bookRecommendation.create({
          data: {
            bookId: rec.id,
            recommendedBooks: recommendations.slice(0, 5).map((r) => r.id),
            algorithm: "HYBRID",
            confidence: new Prisma.Decimal(rec.confidence),
          },
        });
      }
    }
  } catch (error) {
    // Não falhar a API se o cache falhar
    console.error("Erro ao salvar cache de recomendações:", error);
  }
}

/**
 * Busca livros similares a um livro específico
 */
export async function getSimilarBooks(
  bookId: string,
  limit: number = 5,
): Promise<RecommendedBook[]> {
  // Buscar o livro de referência
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      category: true,
      authors: {
        include: {
          author: true,
        },
      },
    },
  });

  if (!book) {
    return [];
  }

  // Buscar livros similares
  const similarBooks = await prisma.book.findMany({
    where: {
      AND: [
        { id: { not: bookId } },
        { availableCopies: { gt: 0 } },
        {
          OR: [
            { categoryId: book.categoryId },
            {
              authors: {
                some: {
                  author: {
                    name: {
                      in: book.authors.map((ba) => ba.author.name),
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      category: true,
      authors: {
        include: {
          author: true,
        },
      },
      copies: {
        select: {
          id: true,
          loans: {
            select: { id: true },
          },
        },
      },
    },
    take: limit,
  });

  return similarBooks.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    coverUrl: b.coverUrl,
    authors: b.authors.map((ba) => ba.author.name),
    category: b.category?.name || null,
    availableCopies: b.availableCopies,
    averageRating: null,
    totalLoans: b.copies.reduce((sum, copy) => sum + copy.loans.length, 0),
    confidence: b.categoryId === book.categoryId ? 80 : 60,
    reason:
      b.categoryId === book.categoryId
        ? `Mesma categoria: ${b.category?.name}`
        : "Autor em comum",
  }));
}
