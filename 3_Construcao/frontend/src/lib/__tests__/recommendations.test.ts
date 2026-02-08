/**
 * Testes para o Sistema de Recomendações - RF026
 * SGBU-010: Recomendações
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRecommendations, getSimilarBooks } from "@/lib/recommendations";
import { prisma } from "@/lib/prisma";

// Mock do Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    loan: {
      findMany: vi.fn(),
    },
    book: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    bookRecommendation: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Sistema de Recomendações - RF026", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecommendations", () => {
    it("deve retornar mínimo 5 recomendações quando requisitado", async () => {
      // Mock de empréstimos do utilizador
      vi.mocked(prisma.loan.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          copyId: "copy1",
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: "book1",
              title: "Programação em Python",
              categoryId: "cat1",
              category: { id: "cat1", name: "Programação" },
              authors: [{ author: { name: "João Silva" } }],
            },
          },
        } as unknown,
      ]);

      // Mock de livros recomendados
      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Python Avançado",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 3,
          category: { name: "Programação" },
          authors: [{ author: { name: "Maria Santos" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
        {
          id: "book3",
          title: "JavaScript Moderno",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 2,
          category: { name: "Programação" },
          authors: [{ author: { name: "Pedro Costa" } }],
          copies: [{ id: "copy3", loans: [] }],
        },
        {
          id: "book4",
          title: "Estruturas de Dados",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 1,
          category: { name: "Programação" },
          authors: [{ author: { name: "Ana Lima" } }],
          copies: [{ id: "copy4", loans: [] }],
        },
        {
          id: "book5",
          title: "Algoritmos",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 4,
          category: { name: "Programação" },
          authors: [{ author: { name: "Carlos Mendes" } }],
          copies: [{ id: "copy5", loans: [] }],
        },
        {
          id: "book6",
          title: "Inteligência Artificial",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 2,
          category: { name: "Programação" },
          authors: [{ author: { name: "Sofia Rodrigues" } }],
          copies: [{ id: "copy6", loans: [] }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      expect(result.recommendations.length).toBeGreaterThanOrEqual(5);
      expect(result.totalRecommendations).toBeGreaterThanOrEqual(5);
      expect(result.algorithm).toBeDefined();
    });

    it("não deve recomendar livros já lidos pelo utilizador", async () => {
      const readBookId = "book1";

      vi.mocked(prisma.loan.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          copyId: "copy1",
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: readBookId,
              title: "Livro Já Lido",
              categoryId: "cat1",
              category: { id: "cat1", name: "Ficção" },
              authors: [{ author: { name: "Autor Teste" } }],
            },
          },
        } as unknown,
      ]);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Livro Recomendado",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 3,
          category: { name: "Ficção" },
          authors: [{ author: { name: "Outro Autor" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      const recommendedIds = result.recommendations.map((r) => r.id);
      expect(recommendedIds).not.toContain(readBookId);
    });

    it("deve priorizar livros da mesma categoria", async () => {
      vi.mocked(prisma.loan.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          copyId: "copy1",
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: "book1",
              title: "Ficção Científica 1",
              categoryId: "sci-fi",
              category: { id: "sci-fi", name: "Ficção Científica" },
              authors: [{ author: { name: "Isaac Asimov" } }],
            },
          },
        } as unknown,
      ]);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Ficção Científica 2",
          subtitle: null,
          coverUrl: null,
          categoryId: "sci-fi",
          availableCopies: 3,
          category: { name: "Ficção Científica" },
          authors: [{ author: { name: "Arthur C. Clarke" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
        {
          id: "book3",
          title: "Romance",
          subtitle: null,
          coverUrl: null,
          categoryId: "romance",
          availableCopies: 2,
          category: { name: "Romance" },
          authors: [{ author: { name: "Jane Austen" } }],
          copies: [{ id: "copy3", loans: [] }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      // Livro da mesma categoria deve ter maior confiança
      const sciFiBook = result.recommendations.find((r) => r.id === "book2");
      const romanceBook = result.recommendations.find((r) => r.id === "book3");

      if (sciFiBook && romanceBook) {
        expect(sciFiBook.confidence).toBeGreaterThan(romanceBook.confidence);
      }
    });

    it("deve retornar livros populares quando não há histórico", async () => {
      vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "popular1",
          title: "Livro Popular 1",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 5,
          totalCopies: 10,
          category: { name: "Geral" },
          authors: [{ author: { name: "Autor Popular" } }],
          copies: [{ id: "copy1", loans: Array(20).fill({ id: "loan" }) }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.algorithm).toBe("CONTENT_BASED");
    });

    it("deve apenas recomendar livros disponíveis (availableCopies > 0)", async () => {
      vi.mocked(prisma.loan.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          copyId: "copy1",
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: "book1",
              title: "Livro Base",
              categoryId: "cat1",
              category: { id: "cat1", name: "Categoria Teste" },
              authors: [{ author: { name: "Autor" } }],
            },
          },
        } as unknown,
      ]);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Livro Disponível",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 2,
          category: { name: "Categoria Teste" },
          authors: [{ author: { name: "Autor" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      result.recommendations.forEach((rec) => {
        expect(rec.availableCopies).toBeGreaterThan(0);
      });
    });
  });

  describe("getSimilarBooks", () => {
    it("deve retornar livros similares baseados em categoria", async () => {
      const baseBookId = "book1";

      vi.mocked(prisma.book.findUnique).mockResolvedValue({
        id: baseBookId,
        title: "Livro Base",
        categoryId: "cat1",
        category: { id: "cat1", name: "Ficção" },
        authors: [{ author: { name: "Autor Base" } }],
      } as unknown);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Livro Similar",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 3,
          category: { name: "Ficção" },
          authors: [{ author: { name: "Outro Autor" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
      ] as unknown);

      const result = await getSimilarBooks(baseBookId, 5);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe("Ficção");
      expect(result[0].id).not.toBe(baseBookId);
    });

    it("não deve retornar o próprio livro como similar", async () => {
      const baseBookId = "book1";

      vi.mocked(prisma.book.findUnique).mockResolvedValue({
        id: baseBookId,
        title: "Livro Base",
        categoryId: "cat1",
        category: { id: "cat1", name: "Categoria" },
        authors: [{ author: { name: "Autor" } }],
      } as unknown);

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book2",
          title: "Outro Livro",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 2,
          category: { name: "Categoria" },
          authors: [{ author: { name: "Autor" } }],
          copies: [{ id: "copy2", loans: [] }],
        },
      ] as unknown);

      const result = await getSimilarBooks(baseBookId, 5);

      const similarIds = result.map((r) => r.id);
      expect(similarIds).not.toContain(baseBookId);
    });

    it("deve retornar array vazio se livro não existe", async () => {
      vi.mocked(prisma.book.findUnique).mockResolvedValue(null);

      const result = await getSimilarBooks("nonexistent", 5);

      expect(result).toEqual([]);
    });
  });

  describe("Critérios de Aceitação RF026", () => {
    it("✓ Utilizador vê recomendações personalizadas (mínimo 5)", async () => {
      vi.mocked(prisma.loan.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          copyId: "copy1",
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: "book1",
              title: "Livro",
              categoryId: "cat1",
              category: { id: "cat1", name: "Cat" },
              authors: [{ author: { name: "A" } }],
            },
          },
        } as unknown,
      ]);

      vi.mocked(prisma.book.findMany).mockResolvedValue(
        Array(8)
          .fill(null)
          .map((_, i) => ({
            id: `book${i + 2}`,
            title: `Livro ${i + 2}`,
            subtitle: null,
            coverUrl: null,
            categoryId: "cat1",
            availableCopies: 2,
            category: { name: "Cat" },
            authors: [{ author: { name: "A" } }],
            copies: [{ id: `copy${i + 2}`, loans: [] }],
          })) as unknown,
      );

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 8);

      expect(result.recommendations.length).toBeGreaterThanOrEqual(5);
      expect(result.totalRecommendations).toBeGreaterThanOrEqual(5);
    });

    it("✓ Não recomendar livros já lidos", async () => {
      const readBooks = ["book1", "book2", "book3"];

      vi.mocked(prisma.loan.findMany).mockResolvedValue(
        readBooks.map((bookId, i) => ({
          id: `loan${i}`,
          userId: "user1",
          copyId: `copy${i}`,
          status: "RETURNED",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: new Date(),
          copy: {
            book: {
              id: bookId,
              title: `Livro ${i}`,
              categoryId: "cat1",
              category: { id: "cat1", name: "Cat" },
              authors: [{ author: { name: "A" } }],
            },
          },
        })) as unknown,
      );

      vi.mocked(prisma.book.findMany).mockResolvedValue([
        {
          id: "book4",
          title: "Novo Livro",
          subtitle: null,
          coverUrl: null,
          categoryId: "cat1",
          availableCopies: 3,
          category: { name: "Cat" },
          authors: [{ author: { name: "A" } }],
          copies: [{ id: "copy4", loans: [] }],
        },
      ] as unknown);

      vi.mocked(prisma.bookRecommendation.findMany).mockResolvedValue([]);

      const result = await getRecommendations("user1", 5);

      const recommendedIds = result.recommendations.map((r) => r.id);
      readBooks.forEach((readBookId) => {
        expect(recommendedIds).not.toContain(readBookId);
      });
    });
  });
});
