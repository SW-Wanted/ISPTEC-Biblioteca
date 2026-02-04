import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireStaffUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      type: true,
      isBlocked: true,
    },
  });

  if (!user) return null;
  if (user.isBlocked) return null;

  // Apenas staff, bibliotecários, catalogadores e supervisores podem acessar
  const allowedTypes: UserType[] = [
    UserType.LIBRARIAN,
    UserType.CATALOGER,
    UserType.SUPERVISOR,
    UserType.STAFF,
  ];

  if (!allowedTypes.includes(user.type)) {
    return null;
  }

  return user;
}

// ---------------------------------------------------------------------------
// GET /api/members/documents/pending - Listar documentos pendentes
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const staff = await requireStaffUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Sem permissões para esta operação" },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'pending', 'verified', 'all'

    const whereClause: Record<string, boolean> = {};

    if (status === "pending") {
      whereClause.isVerified = false;
    } else if (status === "verified") {
      whereClause.isVerified = true;
    }
    // 'all' não adiciona filtro

    const documents = await prisma.userDocument.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
            registrationNumber: true,
          },
        },
      },
      orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar documentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar documentos" },
      { status: 500 },
    );
  }
}
