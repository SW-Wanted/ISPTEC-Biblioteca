import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para criar sessão de formação
const createSessionSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  location: z.string().min(2, "Local é obrigatório"),
  maxParticipants: z.number().int().positive().default(20),
  scheduledDate: z.string().datetime(),
  duration: z.number().int().positive().default(120), // minutos
});

// Filtros para listar sessões (validação simplificada)
const listSessionsSchema = z.object({
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .nullable()
    .optional(),
  upcoming: z.string().nullable().optional(),
  page: z.string().nullable().optional(),
  limit: z.string().nullable().optional(),
});

/**
 * POST /api/training/sessions
 * Cria uma nova sessão de formação
 *
 * Apenas administradores ou formadores podem criar sessões
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões (admin ou formador)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, type: true },
    });

    if (!user || !["SUPERVISOR", "LIBRARIAN"].includes(user.type)) {
      return NextResponse.json(
        { error: "Sem permissão para criar sessões de formação" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // Criar sessão de formação
    const trainingSession = await prisma.trainingSession.create({
      data: {
        trainerId: user.id,
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        maxParticipants: validatedData.maxParticipants,
        scheduledDate: new Date(validatedData.scheduledDate),
        duration: validatedData.duration,
        status: "SCHEDULED",
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(trainingSession, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao criar sessão de formação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/training/sessions
 * Lista sessões de formação com filtros
 *
 * Query params:
 * - status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
 * - upcoming: true (apenas futuras)
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = listSessionsSchema.parse({
      status: searchParams.get("status"),
      upcoming: searchParams.get("upcoming"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const page = filters.page ? parseInt(filters.page) : 1;
    const limit = filters.limit ? parseInt(filters.limit) : 10;
    const skip = (page - 1) * limit;

    // Auto-transition: move SCHEDULED sessions whose date has passed to IN_PROGRESS
    await prisma.trainingSession.updateMany({
      where: {
        status: "SCHEDULED",
        scheduledDate: { lte: new Date() },
      },
      data: {
        status: "IN_PROGRESS",
      },
    });

    // Construir filtros Prisma
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.upcoming === "true") {
      where.scheduledDate = {
        gte: new Date(),
      };
    }

    // Buscar sessões
    const [sessions, total] = await Promise.all([
      prisma.trainingSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledDate: "asc" },
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.trainingSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao listar sessões:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
