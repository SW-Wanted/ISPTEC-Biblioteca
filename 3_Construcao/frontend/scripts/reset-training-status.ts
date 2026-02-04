/**
 * Script para resetar o status de ativação de um usuário
 * para testar o fluxo completo de formação
 *
 * Uso:
 * DATABASE_URL='...' npx tsx scripts/reset-training-status.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "20230429@isptec.co.ao"; // Seu email de estudante
const TARGET_STATUS = "PENDING_TRAINING"; // Para testar inscrição em formação

async function resetTrainingStatus() {
  try {
    console.log("🔄 Resetando status de formação...\n");

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: {
        id: true,
        name: true,
        email: true,
        activationStatus: true,
      },
    });

    if (!user) {
      console.error(`❌ Usuário ${USER_EMAIL} não encontrado`);
      process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.name}`);
    console.log(`📊 Status atual: ${user.activationStatus}\n`);

    // Desinscrever de qualquer formação existente
    const deletedParticipations = await prisma.trainingParticipant.deleteMany({
      where: { userId: user.id },
    });

    console.log(
      `🗑️  Removidas ${deletedParticipations.count} inscrições em formações\n`,
    );

    // Atualizar status para PENDING_TRAINING
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { activationStatus: TARGET_STATUS },
      select: {
        id: true,
        name: true,
        email: true,
        activationStatus: true,
      },
    });

    console.log("✅ Status atualizado com sucesso!");
    console.log(`📊 Novo status: ${updatedUser.activationStatus}`);
    console.log("\n📝 Próximos passos:");
    console.log("   1. Faça logout e login novamente");
    console.log("   2. Acesse 'Serviços' no menu");
    console.log("   3. Você verá o card 'Solicitação de Formação Obrigatória'");
    console.log("   4. Selecione uma sessão e clique 'Inscrever-me'\n");

    console.log(
      "💡 Dica: Como admin, crie uma sessão de formação em /admin/training primeiro!\n",
    );
  } catch (error) {
    console.error("❌ Erro ao resetar status:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetTrainingStatus();
