import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      status: true,
      isBlocked: true,
      qrCode: true,
      qrCodeGeneratedAt: true,
    },
  });

  if (!user) return null;
  if (user.isBlocked) return null;

  return user;
}

/**
 * Gera um código único para o QR Code
 * Formato: ISPTEC-SGBU-{userId}-{timestamp}-{random}
 */
function generateQRCodeData(userId: string): string {
  const timestamp = Date.now();
  const randomPart = crypto.randomBytes(8).toString("hex");
  return `ISPTEC-SGBU-${userId}-${timestamp}-${randomPart}`;
}

// ---------------------------------------------------------------------------
// GET /api/members/qrcode - Obter QR Code do utilizador
// ---------------------------------------------------------------------------

export async function GET() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    // Verificar se utilizador já tem QR Code
    if (user.qrCode) {
      // Gerar imagem do QR Code
      const qrCodeImage = await QRCode.toDataURL(user.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      return NextResponse.json(
        {
          qrCode: user.qrCode,
          qrCodeImage,
          generatedAt: user.qrCodeGeneratedAt,
        },
        { status: 200 },
      );
    }

    // Se não tem QR Code, retornar null
    return NextResponse.json(
      {
        qrCode: null,
        qrCodeImage: null,
        generatedAt: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao obter QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao obter QR Code" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/members/qrcode - Gerar novo QR Code
// ---------------------------------------------------------------------------

export async function POST() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Apenas utilizadores ativos podem gerar QR Code
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  });

  if (fullUser?.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      { error: "Apenas utilizadores ativos podem gerar QR Code" },
      { status: 403 },
    );
  }

  try {
    // Gerar dados do QR Code
    const qrCodeData = generateQRCodeData(user.id);

    // Gerar imagem do QR Code
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Atualizar utilizador com o novo QR Code
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        qrCode: qrCodeData,
        qrCodeGeneratedAt: new Date(),
      },
      select: {
        qrCode: true,
        qrCodeGeneratedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "QR Code gerado com sucesso",
        qrCode: updatedUser.qrCode,
        qrCodeImage,
        generatedAt: updatedUser.qrCodeGeneratedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao gerar QR Code" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/members/qrcode - Invalidar QR Code
// ---------------------------------------------------------------------------

export async function DELETE() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        qrCode: null,
        qrCodeGeneratedAt: null,
      },
    });

    return NextResponse.json(
      { message: "QR Code invalidado com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao invalidar QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao invalidar QR Code" },
      { status: 500 },
    );
  }
}
