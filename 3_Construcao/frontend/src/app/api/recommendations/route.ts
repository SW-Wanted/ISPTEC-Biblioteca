/**
 * API Route: GET /api/recommendations
 * Endpoint de Recomendações de Livros - RF026
 * Sistema de Gestão de Biblioteca Universitária - ISPTEC
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRecommendations, getSimilarBooks } from "@/lib/recommendations";

/**
 * GET /api/recommendations?userId=xxx&limit=5
 * GET /api/recommendations/similar?bookId=xxx&limit=5
 *
 * Retorna recomendações personalizadas para o utilizador autenticado
 *
 * Query Parameters:
 * - userId: ID do utilizador (opcional, usa sessão se omitido)
 * - limit: Número de recomendações (padrão: 8, mínimo: 5)
 * - type: "personal" | "similar" (padrão: "personal")
 * - bookId: ID do livro para recomendações similares (apenas se type=similar)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "8");
    const type = searchParams.get("type") || "personal";
    const bookId = searchParams.get("bookId");
    let userId = searchParams.get("userId");

    // Validar limite mínimo conforme RF026
    if (limit < 5) {
      return NextResponse.json(
        {
          error: "Limite mínimo de recomendações é 5 (conforme RF026)",
          requiredMinimum: 5,
        },
        { status: 400 },
      );
    }

    // Se userId não foi fornecido, usar sessão autenticada
    if (!userId) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }

      // Buscar userId pelo email da sessão
      const { prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Utilizador não encontrado" },
          { status: 404 },
        );
      }

      userId = user.id;
    }

    // Recomendações similares a um livro específico
    if (type === "similar") {
      if (!bookId) {
        return NextResponse.json(
          { error: "bookId é obrigatório para type=similar" },
          { status: 400 },
        );
      }

      const similarBooks = await getSimilarBooks(bookId, limit);

      return NextResponse.json({
        success: true,
        data: {
          recommendations: similarBooks,
          type: "similar",
          baseBookId: bookId,
          totalRecommendations: similarBooks.length,
        },
      });
    }

    // Recomendações personalizadas (padrão)
    const result = await getRecommendations(userId, limit);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        userId,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar recomendações:", error);

    return NextResponse.json(
      {
        error: "Erro ao gerar recomendações",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
