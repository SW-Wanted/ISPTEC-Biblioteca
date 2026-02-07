import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, isBlocked: true },
  });

  if (!user || user.isBlocked) return null;
  return user;
}

const updateImageSchema = z.object({
  field: z.enum(["profileImageUrl", "coverImageUrl"]),
  url: z.union([z.string().url(), z.string().startsWith("data:"), z.null()]),
});

// ---------------------------------------------------------------------------
// PATCH /api/members/[id]/profile-image — Update profile/cover image
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await requireActiveUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: memberId } = await params;

  if (currentUser.id !== memberId) {
    return NextResponse.json(
      { error: "Sem permissão para editar este perfil" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const validation = updateImageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: validation.error.issues },
      { status: 400 },
    );
  }

  const { field, url } = validation.data;

  try {
    await prisma.user.update({
      where: { id: memberId },
      data: { [field]: url },
    });

    return NextResponse.json({
      message: "Imagem atualizada com sucesso",
      [field]: url,
    });
  } catch (error) {
    console.error("Erro ao atualizar imagem:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar imagem" },
      { status: 500 },
    );
  }
}
