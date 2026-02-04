import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "20230429@isptec.co.ao";

async function deleteUser() {
  try {
    console.log(`🔍 Procurando usuário: ${USER_EMAIL}`);

    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      include: {
        loans: true,
        reservations: true,
        trainingParticipations: true,
        userDocuments: true,
        activityLogs: true,
        notifications: true,
        fines: true,
      },
    });

    if (!user) {
      console.log("❌ Usuário não encontrado!");
      return;
    }

    console.log("📋 Dados do usuário encontrado:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tipo: ${user.type}`);
    console.log(`   Status: ${user.activationStatus}`);
    console.log(`   Empréstimos: ${user.loans.length}`);
    console.log(`   Reservas: ${user.reservations.length}`);
    console.log(
      `   Participações em formação: ${user.trainingParticipations.length}`,
    );
    console.log(`   Documentos: ${user.documents.length}`);
    console.log(`   Logs de atividade: ${user.activityLogs.length}`);
    console.log(`   Notificações: ${user.notifications.length}`);

    console.log("\n🗑️  Deletando dados relacionados...");

    // Deletar em ordem (respeitando foreign keys)
    const deletedAccounts = await prisma.account.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedAccounts.count} contas OAuth deletadas`);

    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedSessions.count} sessões deletadas`);

    const deletedLoans = await prisma.loan.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedLoans.count} empréstimos deletados`);

    const deletedReservations = await prisma.reservation.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedReservations.count} reservas deletadas`);

    const deletedParticipations = await prisma.trainingParticipant.deleteMany({
      where: { userId: user.id },
    });
    console.log(
      `   ✓ ${deletedParticipations.count} participações em formação deletadas`,
    );

    const deletedDocuments = await prisma.memberDocument.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedDocuments.count} documentos deletados`);

    const deletedLogs = await prisma.activityLog.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedLogs.count} logs de atividade deletados`);

    const deletedNotifications = await prisma.notification.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ ${deletedNotifications.count} notificações deletadas`);

    // Deletar o próprio usuário
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log(`   ✓ Usuário deletado`);

    console.log("\n✅ Usuário completamente removido do sistema!");
    console.log("\n📝 Próximos passos:");
    console.log(
      "   1. Faça login com Google usando o email: 20230429@isptec.co.ao",
    );
    console.log(
      "   2. O sistema criará um novo cadastro com status: PENDING_DOCUMENTS",
    );
    console.log("   3. Você precisará fazer upload de documentos");
    console.log("   4. Admin verifica documentos");
    console.log("   5. Status muda para: PENDING_TRAINING");
    console.log("   6. Inscrever-se em formação");
    console.log("   7. Admin marca presença");
    console.log("   8. Status muda para: ACTIVE");
  } catch (error) {
    console.error("❌ Erro ao deletar usuário:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
