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
      { name: "Economia", description: "Economia geral, micro e macroeconomia" },
      { name: "Contabilidade", description: "Contabilidade geral, financeira e de custos" },
      { name: "Gestão", description: "Administração, gestão empresarial e estratégica" },
      { name: "Metodologia", description: "Metodologia científica e de pesquisa" },
      { name: "Sociologia", description: "Sociologia geral e aplicada" },
      { name: "Direito", description: "Legislação, jurisprudência, direito civil e penal" },
      { name: "Didática", description: "Métodos de ensino e pedagogia" },
      { name: "Línguas", description: "Português, inglês e outras línguas" },
      { name: "Matemática", description: "Matemática pura e aplicada" },
      { name: "Informática", description: "Programação, redes e sistemas de informação" },
      { name: "Física", description: "Física geral, mecânica e termodinâmica" },
      { name: "Química", description: "Química geral, orgânica e inorgânica" },
      { name: "Engenharia", description: "Engenharia civil, mecânica, elétrica e outras" },
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
      { name: "Nilo Ney Coutinho Menezes", nationality: "Brasil" },
      { name: "James F. Kurose", nationality: "EUA" },
      { name: "Keith W. Ross", nationality: "EUA" },
      { name: "Raymond A. Serway", nationality: "EUA" },
      { name: "John W. Jewett Jr.", nationality: "EUA" },
      { name: "James Stewart", nationality: "Canadá" },
      { name: "Roger S. Pressman", nationality: "EUA" },
      { name: "Bruce R. Maxim", nationality: "EUA" },
      { name: "Howard Anton", nationality: "EUA" },
      { name: "Chris Rorres", nationality: "EUA" },
      { name: "Filipe Sobral", nationality: "Portugal" },
      { name: "Alketa Peci", nationality: "Brasil" },
      { name: "Paul R. Krugman", nationality: "EUA" },
      { name: "Maurice Obstfeld", nationality: "EUA" },
    ],
  });
  console.log("✅ 14 autores criados");

  console.log("📖 Criando livros pré-definidos...");
  
  // Buscar categorias e editoras
  const categoriaInformatica = await prisma.category.findFirst({ where: { name: "Informática" } });
  const categoriaFisica = await prisma.category.findFirst({ where: { name: "Física" } });
  const categoriaMatematica = await prisma.category.findFirst({ where: { name: "Matemática" } });
  const categoriaEngenharia = await prisma.category.findFirst({ where: { name: "Engenharia" } });
  const categoriaGestao = await prisma.category.findFirst({ where: { name: "Gestão" } });
  const categoriaEconomia = await prisma.category.findFirst({ where: { name: "Economia" } });

  const editoraPearson = await prisma.publisher.findFirst({ where: { name: "Pearson Education" } });
  const editoraElsevier = await prisma.publisher.findFirst({ where: { name: "Editora Elsevier" } });

  // Buscar autores
  const autorNilo = await prisma.author.findFirst({ where: { name: "Nilo Ney Coutinho Menezes" } });
  const autorKurose = await prisma.author.findFirst({ where: { name: "James F. Kurose" } });
  const autorRoss = await prisma.author.findFirst({ where: { name: "Keith W. Ross" } });
  const autorSerway = await prisma.author.findFirst({ where: { name: "Raymond A. Serway" } });
  const autorJewett = await prisma.author.findFirst({ where: { name: "John W. Jewett Jr." } });
  const autorStewart = await prisma.author.findFirst({ where: { name: "James Stewart" } });
  const autorPressman = await prisma.author.findFirst({ where: { name: "Roger S. Pressman" } });
  const autorMaxim = await prisma.author.findFirst({ where: { name: "Bruce R. Maxim" } });
  const autorAnton = await prisma.author.findFirst({ where: { name: "Howard Anton" } });
  const autorRorres = await prisma.author.findFirst({ where: { name: "Chris Rorres" } });
  const autorSobral = await prisma.author.findFirst({ where: { name: "Filipe Sobral" } });
  const autorPeci = await prisma.author.findFirst({ where: { name: "Alketa Peci" } });
  const autorKrugman = await prisma.author.findFirst({ where: { name: "Paul R. Krugman" } });
  const autorObstfeld = await prisma.author.findFirst({ where: { name: "Maurice Obstfeld" } });

  // Livro 1: Introdução à Programação com Python
  const livroPython = await prisma.book.create({
    data: {
      isbn: "978-8575227183",
      title: "Introdução à Programação com Python",
      edition: "3ª Edição",
      publicationYear: 2019,
      language: "pt",
      pages: 328,
      description: "Algoritmos e lógica de programação para iniciantes",
      categoryId: categoriaInformatica!.id,
      publisherId: editoraElsevier!.id,
      totalCopies: 3,
      availableCopies: 3,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.create({
    data: { bookId: livroPython.id, authorId: autorNilo!.id, order: 1 },
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroPython.id, barcode: "PY001", location: "Estante A1", status: "AVAILABLE" },
      { bookId: livroPython.id, barcode: "PY002", location: "Estante A1", status: "AVAILABLE" },
      { bookId: livroPython.id, barcode: "PY003", location: "Estante A1", status: "AVAILABLE" },
    ],
  });

  // Livro 2: Redes de Computadores
  const livroRedes = await prisma.book.create({
    data: {
      isbn: "978-8582605592",
      title: "Redes de Computadores",
      edition: "8ª Edição",
      publicationYear: 2020,
      language: "pt",
      pages: 634,
      description: "Uma abordagem top-down",
      categoryId: categoriaInformatica!.id,
      publisherId: editoraPearson!.id,
      totalCopies: 1,
      availableCopies: 1,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroRedes.id, authorId: autorKurose!.id, order: 1 },
      { bookId: livroRedes.id, authorId: autorRoss!.id, order: 2 },
    ],
  });
  await prisma.copy.create({
    data: { bookId: livroRedes.id, barcode: "RC001", location: "Estante A2", status: "AVAILABLE" },
  });

  // Livro 3: Física para Cientistas e Engenheiros
  const livroFisica = await prisma.book.create({
    data: {
      isbn: "978-8522126590",
      title: "Física para Cientistas e Engenheiros",
      edition: "9ª Edição",
      publicationYear: 2018,
      language: "pt",
      pages: 1248,
      description: "Volume 1: Mecânica, Oscilações e Ondas, Termodinâmica",
      categoryId: categoriaFisica!.id,
      publisherId: editoraElsevier!.id,
      totalCopies: 4,
      availableCopies: 4,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroFisica.id, authorId: autorSerway!.id, order: 1 },
      { bookId: livroFisica.id, authorId: autorJewett!.id, order: 2 },
    ],
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroFisica.id, barcode: "FS001", location: "Estante B1", status: "AVAILABLE" },
      { bookId: livroFisica.id, barcode: "FS002", location: "Estante B1", status: "AVAILABLE" },
      { bookId: livroFisica.id, barcode: "FS003", location: "Estante B1", status: "AVAILABLE" },
      { bookId: livroFisica.id, barcode: "FS004", location: "Estante B1", status: "AVAILABLE" },
    ],
  });

  // Livro 4: Cálculo Vol. 1
  const livroCalculo = await prisma.book.create({
    data: {
      isbn: "978-8522126866",
      title: "Cálculo Vol. 1",
      edition: "8ª Edição",
      publicationYear: 2021,
      language: "pt",
      pages: 586,
      description: "Cálculo diferencial e integral de uma variável",
      categoryId: categoriaMatematica!.id,
      publisherId: editoraElsevier!.id,
      totalCopies: 2,
      availableCopies: 2,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.create({
    data: { bookId: livroCalculo.id, authorId: autorStewart!.id, order: 1 },
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroCalculo.id, barcode: "CA001", location: "Estante C1", status: "AVAILABLE" },
      { bookId: livroCalculo.id, barcode: "CA002", location: "Estante C1", status: "AVAILABLE" },
    ],
  });

  // Livro 5: Engenharia de Software
  const livroEngSoft = await prisma.book.create({
    data: {
      isbn: "978-8580555349",
      title: "Engenharia de Software",
      edition: "9ª Edição",
      publicationYear: 2021,
      language: "pt",
      pages: 968,
      description: "Uma abordagem profissional",
      categoryId: categoriaEngenharia!.id,
      publisherId: editoraPearson!.id,
      totalCopies: 0,
      availableCopies: 0,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroEngSoft.id, authorId: autorPressman!.id, order: 1 },
      { bookId: livroEngSoft.id, authorId: autorMaxim!.id, order: 2 },
    ],
  });

  // Livro 6: Álgebra Linear com Aplicações
  const livroAlgebra = await prisma.book.create({
    data: {
      isbn: "978-8582604687",
      title: "Álgebra Linear com Aplicações",
      edition: "10ª Edição",
      publicationYear: 2020,
      language: "pt",
      pages: 768,
      description: "Teoria e aplicações práticas de álgebra linear",
      categoryId: categoriaMatematica!.id,
      publisherId: editoraPearson!.id,
      totalCopies: 2,
      availableCopies: 2,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroAlgebra.id, authorId: autorAnton!.id, order: 1 },
      { bookId: livroAlgebra.id, authorId: autorRorres!.id, order: 2 },
    ],
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroAlgebra.id, barcode: "AL001", location: "Estante C2", status: "AVAILABLE" },
      { bookId: livroAlgebra.id, barcode: "AL002", location: "Estante C2", status: "AVAILABLE" },
    ],
  });

  // Livro 7: Administração
  const livroAdmin = await prisma.book.create({
    data: {
      isbn: "978-8543005447",
      title: "Administração",
      edition: "2ª Edição",
      publicationYear: 2019,
      language: "pt",
      pages: 512,
      description: "Teoria e prática no contexto brasileiro",
      categoryId: categoriaGestao!.id,
      publisherId: editoraPearson!.id,
      totalCopies: 5,
      availableCopies: 5,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroAdmin.id, authorId: autorSobral!.id, order: 1 },
      { bookId: livroAdmin.id, authorId: autorPeci!.id, order: 2 },
    ],
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroAdmin.id, barcode: "AD001", location: "Estante D1", status: "AVAILABLE" },
      { bookId: livroAdmin.id, barcode: "AD002", location: "Estante D1", status: "AVAILABLE" },
      { bookId: livroAdmin.id, barcode: "AD003", location: "Estante D1", status: "AVAILABLE" },
      { bookId: livroAdmin.id, barcode: "AD004", location: "Estante D1", status: "AVAILABLE" },
      { bookId: livroAdmin.id, barcode: "AD005", location: "Estante D1", status: "AVAILABLE" },
    ],
  });

  // Livro 8: Economia Internacional
  const livroEconomia = await prisma.book.create({
    data: {
      isbn: "978-8543020891",
      title: "Economia Internacional",
      edition: "10ª Edição",
      publicationYear: 2018,
      language: "pt",
      pages: 736,
      description: "Teoria e política",
      categoryId: categoriaEconomia!.id,
      publisherId: editoraPearson!.id,
      totalCopies: 3,
      availableCopies: 3,
      materialType: "BOOK",
      loanPolicy: "STANDARD",
    },
  });
  await prisma.bookAuthor.createMany({
    data: [
      { bookId: livroEconomia.id, authorId: autorKrugman!.id, order: 1 },
      { bookId: livroEconomia.id, authorId: autorObstfeld!.id, order: 2 },
    ],
  });
  await prisma.copy.createMany({
    data: [
      { bookId: livroEconomia.id, barcode: "EC001", location: "Estante D2", status: "AVAILABLE" },
      { bookId: livroEconomia.id, barcode: "EC002", location: "Estante D2", status: "AVAILABLE" },
      { bookId: livroEconomia.id, barcode: "EC003", location: "Estante D2", status: "AVAILABLE" },
    ],
  });

  console.log("✅ 8 livros criados com suas cópias");

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
  console.log("   • 14 Autores");
  console.log("   • 8 Livros (19 cópias totais)");
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
