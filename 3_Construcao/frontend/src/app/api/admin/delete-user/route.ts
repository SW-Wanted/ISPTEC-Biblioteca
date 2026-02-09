import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    // Verificar chave secreta OU sessão admin
    const { searchParams } = new URL(request.url);
    const secretKey = searchParams.get("key");

    let isAuthorized = false;

    if (secretKey === "delete-user-2026") {
      isAuthorized = true;
    } else {
      const session = await getServerSession(authOptions);
      if (session && session.user.type === "SUPERVISOR") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Deletar em ordem (respeitando foreign keys)
    console.log("Deletando notificações...");
    const notifications = await prisma.notification.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${notifications.count} notificações deletadas`);

    console.log("Deletando mensagens de chat...");
    const chatMessages = await prisma.chatMessage.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${chatMessages.count} mensagens deletadas`);

    console.log("Deletando participações em formação...");
    const trainingParticipants = await prisma.trainingParticipant.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${trainingParticipants.count} participações deletadas`);

    console.log("Deletando documentos...");
    const memberDocuments = await prisma.userDocument.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${memberDocuments.count} documentos deletados`);

    console.log("Deletando logs...");
    const activityLogs = await prisma.activityLog.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${activityLogs.count} logs deletados`);

    console.log("Deletando multas...");
    const fines = await prisma.fine.deleteMany({ where: { userId: user.id } });
    console.log(`✓ ${fines.count} multas deletadas`);

    console.log("Deletando empréstimos...");
    const loans = await prisma.loan.deleteMany({ where: { userId: user.id } });
    console.log(`✓ ${loans.count} empréstimos deletados`);

    console.log("Deletando reservas...");
    const reservations = await prisma.reservation.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${reservations.count} reservas deletadas`);

    console.log("Deletando tokens...");
    const passwordResetTokens = await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✓ ${passwordResetTokens.count} tokens deletados`);

    // console.log("Deletando contas OAuth...");
    // const accounts = await prisma.account.deleteMany({
    //   where: { userId: user.id },
    // });
    // console.log(`✓ ${accounts.count} contas deletadas`);

    // console.log("Deletando sessões...");
    // const sessions = await prisma.session.deleteMany({
    //   where: { userId: user.id },
    // });
    // console.log(`✓ ${sessions.count} sessões deletadas`);

    // Deletar usuário
    console.log("Deletando usuário...");
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✓ Usuário deletado");

    return NextResponse.json({
      success: true,
      message: `Usuário ${user.email} deletado com sucesso`,
      user: { id: user.id, name: user.name, email: user.email },
      counts: {
        notifications: notifications.count,
        chatMessages: chatMessages.count,
        trainingParticipants: trainingParticipants.count,
        memberDocuments: memberDocuments.count,
        activityLogs: activityLogs.count,
        fines: fines.count,
        loans: loans.count,
        reservations: reservations.count,
        passwordResetTokens: passwordResetTokens.count,
        // accounts: accounts.count,
        // sessions: sessions.count,
      },
    });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return NextResponse.json(
      {
        error: "Erro ao deletar usuário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
