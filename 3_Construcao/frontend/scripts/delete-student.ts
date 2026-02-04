/**
 * Script para deletar um estudante específico e todas suas relações
 * Mantém os recursos (cacifos, computadores) mas remove as associações
 *
 * Uso:
 * DATABASE_URL='...' tsx scripts/delete-student.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STUDENT_EMAIL = "20230429@isptec.co.ao";

async function deleteStudent() {
  console.log(`\n🗑️  DELETANDO ESTUDANTE: ${STUDENT_EMAIL}\n`);

  try {
    // 1. Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { email: STUDENT_EMAIL },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.log("❌ Estudante não encontrado!");
      return;
    }

    console.log(`👤 Encontrado: ${user.name} (${user.email})`);
    console.log(`🆔 ID: ${user.id}\n`);

    // 2. Deletar em ordem (respeitando foreign keys)

    // Notificações
    const notifications = await prisma.notification.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${notifications.count} notificações deletadas`);

    // Mensagens de chat
    const chatMessages = await prisma.chatMessage.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${chatMessages.count} mensagens de chat deletadas`);

    // Participações em formações
    const trainingParticipations = await prisma.trainingParticipant.deleteMany({
      where: { userId: user.id },
    });
    console.log(
      `✅ ${trainingParticipations.count} inscrições em formações deletadas`,
    );

    // Documentos de usuário
    const userDocuments = await prisma.userDocument.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${userDocuments.count} documentos deletados`);

    // Logs de atividade
    const activityLogs = await prisma.activityLog.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${activityLogs.count} logs de atividade deletados`);

    // Sessões de computador (apenas deletar)
    const allComputerSessions = await prisma.computerSession.deleteMany({
      where: { userId: user.id },
    });
    console.log(
      `✅ ${allComputerSessions.count} sessões de computador deletadas`,
    );

    // Aluguéis de cacifo (apenas deletar)
    const allLockerRentals = await prisma.lockerRental.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${allLockerRentals.count} aluguéis de cacifo deletados`);

    // Multas
    const fines = await prisma.fine.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${fines.count} multas deletadas`);

    // Empréstimos (deletar antes de reservas devido a foreign keys)
    const loans = await prisma.loan.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${loans.count} empréstimos deletados`);

    // Reservas
    const reservations = await prisma.reservation.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${reservations.count} reservas deletadas`);

    // Tokens de reset de senha
    const passwordResetTokens = await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ ${passwordResetTokens.count} tokens de reset deletados`);

    // Finalmente, deletar o usuário
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log(`\n🎉 ESTUDANTE ${user.email} DELETADO COM SUCESSO!\n`);
  } catch (error) {
    console.error("\n❌ ERRO AO DELETAR ESTUDANTE:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
deleteStudent()
  .then(() => {
    console.log("✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script falhou:", error);
    process.exit(1);
  });
