import { PrismaClient, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Limpando dados existentes...");

  // Ordem de deleção respeitando foreign keys
  await prisma.chatMessage.deleteMany({});
  await prisma.bookRecommendation.deleteMany({});
  await prisma.bookReview.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.specialRequest.deleteMany({});
  await prisma.computerSession.deleteMany({});
  await prisma.computer.deleteMany({});
  await prisma.lockerRental.deleteMany({});
  await prisma.locker.deleteMany({});
  await prisma.fine.deleteMany({});
  await prisma.classroomLoan.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.copy.deleteMany({});
  await prisma.catalogEntry.deleteMany({});
  await prisma.bookAuthor.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.userDocument.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.systemConfiguration.deleteMany({});

  console.log("✅ Dados limpos com sucesso!");
  console.log("👤 Criando administrador único...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@isptec.co.ao" },
    update: {
      password: hashedPassword,
      name: "Administrador do Sistema",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      registrationNumber: "ADMIN001",
      department: "Biblioteca - Administração",
      phone: "+244 923 000 000",
    },
    create: {
      email: "admin@isptec.co.ao",
      password: hashedPassword,
      name: "Administrador do Sistema",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      registrationNumber: "ADMIN001",
      department: "Biblioteca - Administração",
      phone: "+244 923 000 000",
    },
  });

  await prisma.systemConfiguration.createMany({
    data: [
      { key: "MAX_LOAN_DAYS_STUDENT", value: "5" },
      { key: "MAX_LOAN_DAYS_TEACHER", value: "15" },
      { key: "MAX_LOANS_STUDENT", value: "2" },
      { key: "MAX_LOANS_TEACHER", value: "4" },
      { key: "FINE_PER_DAY", value: "50" },
      { key: "MAX_RENEWALS", value: "2" },
    ],
  });

  console.log("");
  console.log("========================================");
  console.log("🎯 SISTEMA RESETADO COM SUCESSO!");
  console.log("========================================");
  console.log("📧 Email: admin@isptec.co.ao");
  console.log("🔑 Password: password123");
  console.log("👤 Tipo: SUPERVISOR (Administrador)");
  console.log("========================================");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
