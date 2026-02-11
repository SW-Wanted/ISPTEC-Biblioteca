import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function requireActiveUser() {
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

  return user;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  registration_number: z
    .string()
    .regex(/^[0-9]{8}$/, "Matrícula deve ter exatamente 8 dígitos")
    .optional(),
  email: z
    .string()
    .email("Email inválido")
    .regex(/@isptec\.co\.ao$/, "Email deve ser do domínio @isptec.co.ao")
    .optional(),
  phone: z
    .string()
    .regex(/^\+244\s?[0-9]{9}$/, "Telefone deve estar no formato +244 933363523 (9 dígitos)")
    .optional()
    .or(z.literal("")),
  preferred_notification: z
    .string()
    .transform((val) => val?.toUpperCase())
    .pipe(z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"]))
    .optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/members/[id] - Atualizar perfil do utilizador
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await requireActiveUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: "Não autenticado ou bloqueado" },
      { status: 401 },
    );
  }

  const { id: memberId } = await params;

  // Verificar se é o próprio utilizador
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
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { name, registration_number, email, phone, preferred_notification } =
    validation.data;

  try {
    // Verificar se email já está em uso (se estiver mudando)
    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Este email já está em uso" },
          { status: 409 },
        );
      }
    }

    // Verificar se nº de matrícula já está em uso
    if (registration_number) {
      const existingReg = await prisma.user.findFirst({
        where: {
          registrationNumber: registration_number,
          NOT: { id: memberId },
        },
        select: { id: true },
      });

      if (existingReg) {
        return NextResponse.json(
          { error: "Este número de matrícula já está em uso" },
          { status: 409 },
        );
      }
    }

    // Preparar dados para atualização
    const updateData: {
      name?: string;
      registrationNumber?: string | null;
      email?: string;
      phone?: string | null;
      preferredNotification?: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    } = {};

    if (name) updateData.name = name;
    if (registration_number !== undefined)
      updateData.registrationNumber = registration_number || null;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (preferred_notification)
      updateData.preferredNotification = preferred_notification;

    // Atualizar utilizador
    const updatedUser = await prisma.user.update({
      where: { id: memberId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        preferredNotification: true,
        type: true,
        status: true,
        registrationNumber: true,
        course: true,
        department: true,
      },
    });

    return NextResponse.json(
      {
        message: "Perfil atualizado com sucesso",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 },
    );
  }
}
