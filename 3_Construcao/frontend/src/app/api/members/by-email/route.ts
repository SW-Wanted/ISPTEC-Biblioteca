import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/members/by-email?email=xxx
 * Busca informações de membro por email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        status: true,
        activationStatus: true,
        phone: true,
        preferredNotification: true,
        registrationNumber: true,
        course: true,
        department: true,
        isBlocked: true,
        blockedReason: true,
        totalFines: true,
        qrCode: true,
        profileImageUrl: true,
        coverImageUrl: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Membro não encontrado" },
        { status: 404 },
      );
    }

    // Mapear para formato esperado pelo frontend
    const member = {
      id: user.id,
      user_id: user.email,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferred_notification: user.preferredNotification,
      member_type: user.type, // Manter enum do Prisma (STUDENT, TEACHER, etc)
      status: user.status, // Manter enum do Prisma (ACTIVE, INACTIVE, etc)
      activation_status: user.activationStatus, // Status de ativação (ACTIVE, PENDING_DOCUMENTS, etc)
      is_blocked: user.isBlocked,
      blocked_reason: user.blockedReason,
      registration_number: user.registrationNumber,
      course: user.course,
      department: user.department,
      qr_code: user.qrCode,
      total_fines: Number(user.totalFines),
      profile_image_url: user.profileImageUrl,
      cover_image_url: user.coverImageUrl,
      deletion_requested_at: user.deletionRequestedAt?.toISOString() ?? null,
      deletion_scheduled_at: user.deletionScheduledAt?.toISOString() ?? null,
    };

    return NextResponse.json(member, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar membro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar informações do membro" },
      { status: 500 },
    );
  }
}
