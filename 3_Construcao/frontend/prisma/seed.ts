import { PrismaClient, UserStatus, UserType, BookStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

type SeedBook = {
  title: string
  authors: string[]
  publicationYear: number | null
  availableCopies: number
  totalCopies: number
  category: string
  publisher?: string | null
  language?: "pt" | "en"
  description?: string | null
  coverUrl?: string | null
  keywords?: string[]
}

function makeCoverUrl(title: string): string {
  const safe = encodeURIComponent(title.trim()).slice(0, 80)
  return `https://placehold.co/600x900/png?text=${safe}`
}

function makeBarcode(prefix: string, index: number) {
  return `${prefix}${String(index).padStart(3, "0")}`
}

async function upsertCategory(name: string, description?: string) {
  return prisma.category.upsert({
    where: { name },
    update: { description: description ?? undefined },
    create: { name, description: description ?? null },
  })
}

async function upsertAuthor(name: string) {
  const existing = await prisma.author.findFirst({ where: { name }, select: { id: true, name: true } })
  if (existing) return existing
  return prisma.author.create({ data: { name }, select: { id: true, name: true } })
}

async function upsertPublisher(name: string) {
  return prisma.publisher.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@isptec.co.ao" },
    update: {
      name: "Bibliotecário Chefe",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      registrationNumber: "STAFF001",
      department: "Biblioteca",
      password: hashedPassword,
    },
    create: {
      email: "admin@isptec.co.ao",
      password: hashedPassword,
      name: "Bibliotecário Chefe",
      type: UserType.SUPERVISOR,
      status: UserStatus.ACTIVE,
      registrationNumber: "STAFF001",
      department: "Biblioteca",
    },
  })

  const student = await prisma.user.upsert({
    where: { email: "estudante@isptec.co.ao" },
    update: {
      name: "José Simão Tala",
      type: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      registrationNumber: "EIN5M3001",
      course: "Engenharia Informática",
      password: hashedPassword,
    },
    create: {
      email: "estudante@isptec.co.ao",
      password: hashedPassword,
      name: "José Simão Tala",
      type: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      registrationNumber: "EIN5M3001",
      course: "Engenharia Informática",
    },
  })

  const teacher = await prisma.user.upsert({
    where: { email: "docente@isptec.co.ao" },
    update: {
      name: "Emanuel Carneiro dos Santos",
      type: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      registrationNumber: "DOC001",
      department: "Engenharia Informática",
      password: hashedPassword,
    },
    create: {
      email: "docente@isptec.co.ao",
      password: hashedPassword,
      name: "Emanuel Carneiro dos Santos",
      type: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      registrationNumber: "DOC001",
      department: "Engenharia Informática",
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: "estudante2@isptec.co.ao" },
    update: {
      name: "Líria Djenaba Vilança Bá",
      type: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      registrationNumber: "EIN5M3002",
      course: "Engenharia Informática",
      password: hashedPassword,
    },
    create: {
      email: "estudante2@isptec.co.ao",
      password: hashedPassword,
      name: "Líria Djenaba Vilança Bá",
      type: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      registrationNumber: "EIN5M3002",
      course: "Engenharia Informática",
    },
  })

  // Limpar reviews dos utilizadores de teste para evitar ratings "fake" no ambiente dev.
  await prisma.bookReview.deleteMany({
    where: {
      userId: { in: [admin.id, student.id, teacher.id, student2.id] },
    },
  })

  const programmingCategory = await upsertCategory(
    "Programação",
    "Livros sobre linguagens de programação e desenvolvimento de software"
  )

  await Promise.all([
    upsertCategory("Redes de Computadores", "Redes, Internet, protocolos e comunicações"),
    upsertCategory("Engenharia de Software", "Processos, requisitos, arquitetura e qualidade"),
    upsertCategory("Matemática", "Cálculo, álgebra linear e matemática discreta"),
    upsertCategory("Física", "Mecânica, eletromagnetismo e física geral"),
    upsertCategory("Bases de Dados", "Modelação, SQL e sistemas de gestão de bases de dados"),
    upsertCategory("Sistemas Operativos", "Processos, memória, concorrência e kernels"),
    upsertCategory("Arquitetura de Computadores", "Organização e arquitetura de computadores"),
    upsertCategory("Administração", "Gestão, organizações e estratégia"),
    upsertCategory("Economia", "Macroeconomia, microeconomia e economia internacional"),
    upsertCategory("Ciências Sociais", "Sociologia, ciência política e metodologia"),
  ])

  const martinFowler = await prisma.author.findFirst({ where: { name: "Martin Fowler" }, select: { id: true } })
  const martinFowlerId =
    martinFowler?.id ??
    (
      await prisma.author.create({
        data: { name: "Martin Fowler", nationality: "British" },
        select: { id: true },
      })
    ).id
  await prisma.author.update({ where: { id: martinFowlerId }, data: { nationality: "British" } })

  const addison = await prisma.publisher.upsert({
    where: { name: "Addison-Wesley" },
    update: { country: "USA" },
    create: {
      name: "Addison-Wesley",
      country: "USA",
    },
  })

  await Promise.all([
    upsertPublisher("Pearson"),
    upsertPublisher("McGraw-Hill"),
    upsertPublisher("Cengage"),
    upsertPublisher("Wiley"),
    upsertPublisher("MIT Press"),
    upsertPublisher("Prentice Hall"),
    upsertPublisher("Novatec"),
    upsertPublisher("Atlas"),
  ])

  const existing = await prisma.book.findUnique({
    where: { isbn: "9780134757599" },
    select: { id: true },
  })

  if (!existing) {
    await prisma.book.create({
      data: {
        isbn: "9780134757599",
        title: "Refactoring: Improving the Design of Existing Code",
        subtitle: null,
        edition: "2nd Edition",
        publicationYear: 2018,
        language: "en",
        pages: 448,
        description: "Livro clássico sobre refatoração e boas práticas de design.",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg",

        categoryId: programmingCategory.id,
        publisherId: addison.id,

        keywords: ["refactoring", "clean code", "software engineering"],

        totalCopies: 3,
        availableCopies: 3,

        extractedByOCR: false,

        authors: {
          create: [{ authorId: martinFowlerId, order: 1 }],
        },
        copies: {
          create: [
            { barcode: "BOOK001", status: BookStatus.AVAILABLE, location: "A1-P2-E3" },
            { barcode: "BOOK002", status: BookStatus.AVAILABLE, location: "A1-P2-E3" },
            { barcode: "BOOK003", status: BookStatus.AVAILABLE, location: "A1-P2-E3" },
          ],
        },
      },
    })
  }

  const seedBooks: SeedBook[] = [
    {
      title: "Introdução à Programação com Python",
      authors: ["Nilo Ney Coutinho Menezes"],
      publicationYear: 2019,
      totalCopies: 3,
      availableCopies: 3,
      category: "Programação",
      publisher: "Novatec",
      language: "pt",
      description: "Introdução prática à programação com Python para iniciantes.",
      coverUrl: makeCoverUrl("Introdução à Programação com Python"),
      keywords: ["python", "programação", "introdução"],
    },
    {
      title: "Redes de Computadores",
      authors: ["James F. Kurose", "Keith W. Ross"],
      publicationYear: 2020,
      totalCopies: 1,
      availableCopies: 1,
      category: "Redes de Computadores",
      publisher: "Pearson",
      language: "pt",
      description: "Fundamentos de redes, protocolos, Internet e aplicações.",
      coverUrl: makeCoverUrl("Redes de Computadores"),
      keywords: ["redes", "tcp", "ip", "internet"],
    },
    {
      title: "Física para Cientistas e Engenheiros",
      authors: ["Raymond A. Serway", "John W. Jewett Jr."],
      publicationYear: 2018,
      totalCopies: 4,
      availableCopies: 4,
      category: "Física",
      publisher: "Cengage",
      language: "pt",
      description: "Física geral com foco em aplicações em engenharia.",
      coverUrl: makeCoverUrl("Física para Cientistas e Engenheiros"),
      keywords: ["física", "mecânica", "engenharia"],
    },
    {
      title: "Cálculo Vol. 1",
      authors: ["James Stewart"],
      publicationYear: 2021,
      totalCopies: 2,
      availableCopies: 2,
      category: "Matemática",
      publisher: "Cengage",
      language: "pt",
      description: "Limites, derivadas e integrais com muitos exercícios.",
      coverUrl: makeCoverUrl("Cálculo Vol. 1"),
      keywords: ["cálculo", "matemática", "derivadas"],
    },
    {
      title: "Engenharia de Software",
      authors: ["Roger S. Pressman", "Bruce R. Maxim"],
      publicationYear: 2021,
      totalCopies: 2,
      availableCopies: 0,
      category: "Engenharia de Software",
      publisher: "McGraw-Hill",
      language: "pt",
      description: "Processos de software, requisitos, projeto, testes e manutenção.",
      coverUrl: makeCoverUrl("Engenharia de Software"),
      keywords: ["engenharia de software", "processos", "testes"],
    },
    {
      title: "Álgebra Linear com Aplicações",
      authors: ["Howard Anton", "Chris Rorres"],
      publicationYear: 2020,
      totalCopies: 2,
      availableCopies: 2,
      category: "Matemática",
      publisher: "Wiley",
      language: "pt",
      description: "Vetores, matrizes, autovalores e aplicações em engenharia.",
      coverUrl: makeCoverUrl("Álgebra Linear com Aplicações"),
      keywords: ["álgebra linear", "matrizes", "autovalores"],
    },
    {
      title: "Administração",
      authors: ["Filipe Sobral", "Alketa Peci"],
      publicationYear: 2019,
      totalCopies: 5,
      availableCopies: 5,
      category: "Administração",
      publisher: "Atlas",
      language: "pt",
      description: "Introdução à administração e gestão de organizações.",
      coverUrl: makeCoverUrl("Administração"),
      keywords: ["administração", "gestão", "organizações"],
    },
    {
      title: "Economia Internacional",
      authors: ["Paul R. Krugman", "Maurice Obstfeld"],
      publicationYear: 2018,
      totalCopies: 3,
      availableCopies: 3,
      category: "Economia",
      publisher: "Pearson",
      language: "pt",
      description: "Comércio internacional, câmbio, finanças e macroeconomia aberta.",
      coverUrl: makeCoverUrl("Economia Internacional"),
      keywords: ["economia", "comércio", "finanças"],
    },

    // Engenharia (extra)
    {
      title: "Clean Code",
      authors: ["Robert C. Martin"],
      publicationYear: 2008,
      totalCopies: 4,
      availableCopies: 4,
      category: "Engenharia de Software",
      publisher: "Prentice Hall",
      language: "en",
      description: "Princípios e boas práticas para escrever código limpo.",
      coverUrl: makeCoverUrl("Clean Code"),
      keywords: ["clean code", "boas práticas", "software"],
    },
    {
      title: "Design Patterns: Elements of Reusable Object-Oriented Software",
      authors: ["Erich Gamma", "Richard Helm", "Ralph Johnson", "John Vlissides"],
      publicationYear: 1994,
      totalCopies: 2,
      availableCopies: 2,
      category: "Engenharia de Software",
      publisher: "Addison-Wesley",
      language: "en",
      description: "Catálogo clássico de padrões de projeto orientados a objetos.",
      coverUrl: makeCoverUrl("Design Patterns"),
      keywords: ["design patterns", "oop", "arquitetura"],
    },
    {
      title: "Introduction to Algorithms",
      authors: ["Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"],
      publicationYear: 2009,
      totalCopies: 3,
      availableCopies: 3,
      category: "Engenharia Informática",
      publisher: "MIT Press",
      language: "en",
      description: "Algoritmos e estruturas de dados com análise de complexidade.",
      coverUrl: makeCoverUrl("Introduction to Algorithms"),
      keywords: ["algoritmos", "complexidade", "estrutura de dados"],
    },
    {
      title: "Operating System Concepts",
      authors: ["Abraham Silberschatz", "Peter B. Galvin", "Greg Gagne"],
      publicationYear: 2018,
      totalCopies: 2,
      availableCopies: 2,
      category: "Sistemas Operativos",
      publisher: "Wiley",
      language: "en",
      description: "Conceitos essenciais de sistemas operativos.",
      coverUrl: makeCoverUrl("Operating System Concepts"),
      keywords: ["sistemas operativos", "processos", "memória"],
    },
    {
      title: "Computer Organization and Design",
      authors: ["David A. Patterson", "John L. Hennessy"],
      publicationYear: 2017,
      totalCopies: 2,
      availableCopies: 2,
      category: "Arquitetura de Computadores",
      publisher: "Morgan Kaufmann",
      language: "en",
      description: "Arquitetura e organização de computadores (RISC, pipelines, memória).",
      coverUrl: makeCoverUrl("Computer Organization and Design"),
      keywords: ["arquitetura", "processador", "memória"],
    },
    {
      title: "Database System Concepts",
      authors: ["Abraham Silberschatz", "Henry F. Korth", "S. Sudarshan"],
      publicationYear: 2019,
      totalCopies: 3,
      availableCopies: 3,
      category: "Bases de Dados",
      publisher: "McGraw-Hill",
      language: "en",
      description: "Conceitos de bases de dados: modelação, SQL, transações e índices.",
      coverUrl: makeCoverUrl("Database System Concepts"),
      keywords: ["bases de dados", "sql", "transações"],
    },

    // Ciências Sociais (extra)
    {
      title: "Introdução à Sociologia",
      authors: ["Anthony Giddens"],
      publicationYear: 2017,
      totalCopies: 4,
      availableCopies: 4,
      category: "Ciências Sociais",
      publisher: "Atlas",
      language: "pt",
      description: "Conceitos fundamentais de sociologia e sociedade contemporânea.",
      coverUrl: makeCoverUrl("Introdução à Sociologia"),
      keywords: ["sociologia", "ciências sociais"],
    },
    {
      title: "Metodologia Científica",
      authors: ["Eva Maria Lakatos", "Marina de Andrade Marconi"],
      publicationYear: 2010,
      totalCopies: 5,
      availableCopies: 5,
      category: "Ciências Sociais",
      publisher: "Atlas",
      language: "pt",
      description: "Métodos e técnicas de pesquisa científica.",
      coverUrl: makeCoverUrl("Metodologia Científica"),
      keywords: ["metodologia", "pesquisa", "ciência"],
    },
  ]

  // Ensure publisher used above exists
  await upsertPublisher("Morgan Kaufmann")

  let bookIndex = 10
  for (const sb of seedBooks) {
    const category = await upsertCategory(sb.category)
    const publisher = sb.publisher ? await upsertPublisher(sb.publisher) : null

    const existingBook = await prisma.book.findFirst({
      where: {
        title: sb.title,
        publicationYear: sb.publicationYear,
      },
      select: { id: true },
    })

    if (existingBook) continue

    const authorRows = [] as { authorId: string; order: number }[]
    let order = 1
    for (const authorName of sb.authors) {
      const a = await upsertAuthor(authorName)
      authorRows.push({ authorId: a.id, order })
      order++
    }

    await prisma.book.create({
      data: {
        title: sb.title,
        subtitle: null,
        isbn: null,
        edition: null,
        publicationYear: sb.publicationYear,
        language: sb.language ?? "pt",
        pages: null,
        description: sb.description ?? null,
        coverUrl: sb.coverUrl ?? makeCoverUrl(sb.title),
        categoryId: category.id,
        publisherId: publisher?.id ?? null,
        keywords: sb.keywords ?? [],
        totalCopies: sb.totalCopies,
        availableCopies: sb.availableCopies,
        extractedByOCR: false,
        authors: {
          create: authorRows,
        },
        copies: {
          create: Array.from({ length: sb.totalCopies }).map((_, i) => ({
            barcode: makeBarcode("BOOK", bookIndex * 10 + i + 1),
            status: i < sb.availableCopies ? BookStatus.AVAILABLE : BookStatus.BORROWED,
            location: "A1-P1-E1",
          })),
        },
      },
    })

    bookIndex++
  }

  console.log("✅ Seed concluído!")
  console.log("📧 Admin:", admin.email, "/ password123")
  console.log("📧 Estudante:", student.email, "/ password123")
  console.log("📧 Docente:", teacher.email, "/ password123")
  console.log("📧 Estudante 2:", student2.email, "/ password123")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
