import { PrismaClient, UserStatus, UserType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Configuração do Adaptador (Necessário no Prisma 7)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  RESET COMPLETO DO BANCO DE DADOS...");

  // PRIMEIRO: Deletar todas as dependências
  console.log("⚠️  Deletando notificações, mensagens e dependências...");
  await prisma.chatMessage.deleteMany({});
  await prisma.bookRecommendation.deleteMany({});
  await prisma.bookReview.deleteMany({});
  await prisma.notification.deleteMany({}); 
  await prisma.activityLog.deleteMany({});
  await prisma.specialRequest.deleteMany({});
  await prisma.computerSession.deleteMany({});
  await prisma.lockerRental.deleteMany({});
  await prisma.fine.deleteMany({});
  await prisma.classroomLoan.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.userDocument.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});

  console.log("⚠️  Deletando livros e catálogos...");
  await prisma.copy.deleteMany({});
  await prisma.catalogEntry.deleteMany({});
  await prisma.bookAuthor.deleteMany({});
  await prisma.book.deleteMany({});

  console.log("⚠️  Deletando recursos físicos...");
  await prisma.computer.deleteMany({});
  await prisma.locker.deleteMany({});

  console.log("⚠️  Deletando metadados...");
  await prisma.author.deleteMany({});
  await prisma.publisher.deleteMany({});
  await prisma.category.deleteMany({});

  // Deletar utilizadores não-admin
  console.log("⚠️  Deletando utilizadores não-admin...");
  await prisma.user.deleteMany({
    where: {
      email: { not: "admin@isptec.co.ao" },
    },
  });

  console.log("✅ TODOS os utilizadores não-admin foram removidos!");
  console.log("✅ TODOS os livros foram removidos!");
  console.log("✅ TODOS os empréstimos foram removidos!");
  console.log("👤 Criando/Atualizando administrador único...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Criar ou atualizar ÚNICO administrador
  const admin = await prisma.user.upsert({
    where: { email: "admin@isptec.co.ao" },
    update: {
      password: hashedPassword,
      name: "Administrador do Sistema",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      activationStatus: "ACTIVE",
      registrationNumber: "00000001",
      department: "Direção",
      phone: "+244 923 363 523",
      isBlocked: false,
      totalFines: 0,
    },
    create: {
      email: "admin@isptec.co.ao",
      password: hashedPassword,
      name: "Administrador do Sistema",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      activationStatus: "ACTIVE",
      registrationNumber: "00000001",
      department: "Direção",
      phone: "+244 923 363 523",
    },
  });

  console.log("✅ Administrador criado/atualizado com ID:", admin.id);

  // Recriar configurações do sistema
  await prisma.systemConfiguration.deleteMany({});
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

  console.log("📚 Criando categorias pré-definidas...");
  await prisma.category.createMany({
    data: [
      {
        name: "Tecnologia da Informação",
        description: "Livros sobre TI, programação e computação",
      },
      {
        name: "Engenharia",
        description: "Livros de engenharia civil, mecânica, elétrica, etc.",
      },
      { name: "Ciências Exatas", description: "Matemática, física, química" },
      {
        name: "Gestão e Negócios",
        description: "Administração, economia, finanças",
      },
      {
        name: "Ciências Sociais",
        description: "Sociologia, antropologia, política",
      },
      { name: "Literatura", description: "Ficção, poesia, romance" },
      { name: "História", description: "História mundial, africana, angolana" },
      {
        name: "Direito",
        description: "Legislação, jurisprudência, direito civil e penal",
      },
      {
        name: "Medicina e Saúde",
        description: "Medicina, enfermagem, saúde pública",
      },
      {
        name: "Arquitetura e Urbanismo",
        description: "Projetos, design urbano, paisagismo",
      },
      { name: "Artes", description: "Música, teatro, artes visuais" },
      {
        name: "Línguas e Linguística",
        description: "Português, inglês, linguística aplicada",
      },
      { name: "Referência", description: "Dicionários, enciclopédias, atlas" },
    ],
  });
  console.log("✅ 13 categorias criadas");

  console.log("🏢 Criando editoras pré-definidas...");
  await prisma.publisher.createMany({
    data: [
      { name: "Editorial Nzila", country: "Angola" },
      { name: "União dos Escritores Angolanos", country: "Angola" },
      { name: "Mayamba Editora", country: "Angola" },
      { name: "Texto Editores", country: "Portugal" },
      { name: "Porto Editora", country: "Portugal" },
      { name: "Edições 70", country: "Portugal" },
      { name: "Companhia das Letras", country: "Brasil" },
      { name: "Editora Elsevier", country: "Brasil" },
      { name: "Pearson Education", country: "Reino Unido" },
      { name: "McGraw-Hill Education", country: "EUA" },
      { name: "O'Reilly Media", country: "EUA" },
      { name: "Springer", country: "Alemanha" },
      { name: "Cambridge University Press", country: "Reino Unido" },
      { name: "Oxford University Press", country: "Reino Unido" },
    ],
  });
  console.log("✅ 14 editoras criadas");

  console.log("✍️ Criando autores de exemplo...");
  await prisma.author.createMany({
    data: [
      { name: "Pepetela", nationality: "Angola" },
      { name: "José Eduardo Agualusa", nationality: "Angola" },
      { name: "Ondjaki", nationality: "Angola" },
      { name: "Agostinho Neto", nationality: "Angola" },
      { name: "Luandino Vieira", nationality: "Angola" },
      { name: "Robert C. Martin", nationality: "EUA" },
      { name: "Martin Fowler", nationality: "Reino Unido" },
      { name: "Donald E. Knuth", nationality: "EUA" },
      { name: "Bjarne Stroustrup", nationality: "Dinamarca" },
      { name: "Erich Gamma", nationality: "Suíça" },
    ],
  });
  console.log("✅ 10 autores criados");

  console.log("🔐 Criando cacifos...");
  const lockerNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
  await prisma.locker.createMany({
    data: lockerNumbers.map((num) => ({
      number: num.toString().padStart(3, "0"),
      location: num <= 25 ? "Piso 1" : "Piso 2",
      status: "AVAILABLE",
    })),
  });
  console.log("✅ 50 cacifos criados (025 no Piso 1, 025 no Piso 2)");

  console.log("💻 Criando computadores...");
  const computerIds = Array.from({ length: 20 }, (_, i) => i + 1);
  await prisma.computer.createMany({
    data: computerIds.map((num) => ({
      number: `PC-${num.toString().padStart(3, "0")}`,
      location: num <= 10 ? "Sala de Leitura A" : "Sala de Leitura B",
      status: "AVAILABLE",
    })),
  });
  console.log("✅ 20 computadores criados (10 em cada sala)");

  console.log("");
  console.log("========================================");
  console.log("🎯 RESET COMPLETO EXECUTADO!");
  console.log("========================================");
  console.log("✅ Utilizadores removidos: TODOS (exceto admin)");
  console.log("✅ Livros removidos: TODOS");
  console.log("✅ Empréstimos removidos: TODOS");
  console.log("========================================");
  console.log("📊 Dados pré-requisitos criados:");
  console.log("   • 13 Categorias");
  console.log("   • 14 Editoras");
  console.log("   • 10 Autores");
  console.log("   • 50 Cacifos");
  console.log("   • 20 Computadores");
  console.log("========================================");
  console.log("📧 Email: admin@isptec.co.ao");
  console.log("🔑 Password: password123");
  console.log("👤 Tipo: SUPERVISOR (Administrador)");
  console.log("========================================");
  console.log("⚠️  APENAS 1 utilizador no sistema!");
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
