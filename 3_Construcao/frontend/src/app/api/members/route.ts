import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserStatus, UserType } from "@prisma/client";

/**
 * GET /api/members
 * Lista todos os membros do sistema para gestão
 *
 * Requer: SUPERVISOR, LIBRARIAN ou STAFF
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, type: true, status: true, isBlocked: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Verificar permissões
    const canManage =
      currentUser.type === UserType.SUPERVISOR ||
      currentUser.type === UserType.LIBRARIAN ||
      currentUser.type === UserType.STAFF;

    if (!canManage) {
      return NextResponse.json(
        { error: "Sem permissão para gerir membros" },
        { status: 403 },
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "200");

    // Construir filtros
    const where: any = {};

    if (type && type !== "all") {
      where.type = type.toUpperCase() as UserType;
    }

    if (status && status !== "all") {
      if (status === "blocked") {
        where.isBlocked = true;
      } else {
        where.status = status.toUpperCase() as UserStatus;
      }
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { registrationNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Buscar membros
    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        status: true,
        activationStatus: true,
        registrationNumber: true,
        course: true,
        department: true,
        phone: true,
        isBlocked: true,
        blockedReason: true,
        totalFines: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mapear para formato esperado pelo frontend
    const formatted = members.map((user) => ({
      id: user.id,
      user_id: user.email, // Para compatibilidade
      email: user.email,
      name: user.name,
      member_type: user.type,
      status: user.status,
      activation_status: user.activationStatus,
      registration_number: user.registrationNumber,
      course: user.course,
      department: user.department,
      phone: user.phone,
      is_blocked: user.isBlocked,
      blocked_reason: user.blockedReason,
      total_fines: Number(user.totalFines),
      created_date: user.createdAt.toISOString(),
      updated_date: user.updatedAt.toISOString(),
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return NextResponse.json(
      { error: "Erro ao buscar membros" },
      { status: 500 },
    );
  }
}
