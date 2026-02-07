import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Schema para obter info do auth provider
const getSchema = z.object({}).optional();

// Schema para alterar senha (usuário com senha existente)
const changePasswordSchema = z.object({
  action: z.literal("change"),
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
});

// Schema para criar senha (usuário Google-only)
const createPasswordSchema = z.object({
  action: z.literal("create"),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
});

const bodySchema = z.discriminatedUnion("action", [
  changePasswordSchema,
  createPasswordSchema,
]);

// GET: Retorna informação sobre o provider de autenticação do usuário
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      password: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utilizador não encontrado" },
      { status: 404 },
    );
  }

  // Detectar se o utilizador tem uma senha "real" ou apenas a gerada pelo Google login
  // Estratégia: verificar se existe PasswordResetToken usado (indica que já definiu senha)
  // OU se o utilizador não é elegível para Google (registou-se com credenciais directamente)
  const hasPasswordResetUsed = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: { not: null } },
    select: { id: true },
  });

  // Verificar se email é @isptec.co.ao (Google provider habilitado)
  const isGoogleEligible = session.user.email.endsWith("@isptec.co.ao");

  // Utilizadores que NÃO são @isptec.co.ao registaram-se com credenciais → têm senha própria
  // Utilizadores @isptec.co.ao que já fizeram password reset → têm senha própria
  // Utilizadores @isptec.co.ao que foram criados via seed (admin) → verificar se conseguem
  // validar a senha "password123" ou outra conhecida — na prática, simplesmente permitir
  // alterar senha para TODOS os utilizadores (pedindo senha actual) excepto Google-only puro

  // Abordagem melhorada: tentar verificar se a senha do utilizador é a auto-gerada
  // Se não for @isptec.co.ao → definitivamente tem senha própria (credentials user)
  // Se é @isptec.co.ao e já usou password reset → tem senha própria
  // Se é @isptec.co.ao e a senha foi criada junto com a conta → pode ser seed ou Google-auto
  // Para seed users (admin): eles sabem a senha (password123) → devem poder alterá-la
  // Solução: se o utilizador tem senha no DB, SEMPRE permitir "alterar" (com senha actual)
  // O cenário "criar" é apenas para quem nunca definiu senha conscientemente

  const hasUserDefinedPassword = !isGoogleEligible || !!hasPasswordResetUsed;

  // Para utilizadores @isptec.co.ao sem password reset: verificar se foram criados manualmente
  // (ex: seed) comparando se a senha não é vazia/nula — se tem hash, podem ser seed users
  // Nesses casos, permitir "change" em vez de "create" pois sabem a senha
  const isSeedOrManualUser =
    isGoogleEligible && !hasPasswordResetUsed && !!user.password;

  return NextResponse.json({
    hasUserDefinedPassword: hasUserDefinedPassword || isSeedOrManualUser,
    isGoogleEligible,
    // Se tem senha (qualquer que seja), pode alterá-la pedindo a actual
    canChangePassword: hasUserDefinedPassword || isSeedOrManualUser,
    // Apenas Google-only sem qualquer senha definida (improvável na prática)
    canCreatePassword: false, // Desabilitado — sempre pedir senha actual
    isGoogleOnly:
      isGoogleEligible && !hasUserDefinedPassword && !isSeedOrManualUser,
  });
}

// POST: Criar ou alterar senha
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, password: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utilizador não encontrado" },
      { status: 404 },
    );
  }

  const data = parsed.data;

  if (data.action === "change") {
    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 },
      );
    }

    // Atualizar senha
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      ok: true,
      message: "Senha alterada com sucesso",
    });
  }

  if (data.action === "create") {
    // Para criar senha (Google-only user), não precisa da senha antiga
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Criar um PasswordResetToken "usado" para marcar que o user agora tem senha própria
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: `manual-creation-${Date.now()}`,
        expiresAt: new Date(),
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Senha criada com sucesso! Agora pode fazer login com email e senha.",
    });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
