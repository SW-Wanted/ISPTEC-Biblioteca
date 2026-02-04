/**
 * Script para atualizar usuário existente com activationStatus
 *
 * Uso:
 * DATABASE_URL='...' npx tsx scripts/update-user-activation-status.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STUDENT_EMAIL = "20230429@isptec.co.ao";

async function updateUserActivationStatus() {
  console.log(`\n🔄 ATUALIZANDO ESTUDANTE: ${STUDENT_EMAIL}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: STUDENT_EMAIL },
      select: { id: true, name: true, email: true, activationStatus: true },
    });

    if (!user) {
      console.log("❌ Estudante não encontrado!");
      return;
    }

    console.log(`👤 Encontrado: ${user.name} (${user.email})`);
    console.log(`📊 Status atual: ${user.activationStatus || "NULL"}\n`);

    // Atualizar para PENDING_DOCUMENTS
    const updated = await prisma.user.update({
      where: { email: STUDENT_EMAIL },
      data: {
        activationStatus: "PENDING_DOCUMENTS",
      },
    });

    console.log(`✅ Usuário atualizado!`);
    console.log(`📊 Novo status: ${updated.activationStatus}\n`);
  } catch (error) {
    console.error("\n❌ ERRO:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
updateUserActivationStatus()
  .then(() => {
    console.log("✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script falhou:", error);
    process.exit(1);
  });
