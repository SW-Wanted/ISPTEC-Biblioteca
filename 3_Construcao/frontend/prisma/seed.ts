import { PrismaClient, UserStatus, UserType, BookStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

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

  const programmingCategory = await prisma.category.upsert({
    where: { name: "Programação" },
    update: { description: "Livros sobre linguagens de programação e desenvolvimento de software" },
    create: {
      name: "Programação",
      description: "Livros sobre linguagens de programação e desenvolvimento de software",
    },
  })

  const martinFowler = await prisma.author.upsert({
    where: { id: "author_martin_fowler" },
    update: {
      name: "Martin Fowler",
      nationality: "British",
    },
    create: {
      id: "author_martin_fowler",
      name: "Martin Fowler",
      nationality: "British",
    },
  })

  const addison = await prisma.publisher.upsert({
    where: { name: "Addison-Wesley" },
    update: { country: "USA" },
    create: {
      name: "Addison-Wesley",
      country: "USA",
    },
  })

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
          create: [{ authorId: martinFowler.id, order: 1 }],
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

  console.log("✅ Seed concluído!")
  console.log("📧 Admin:", admin.email, "/ password123")
  console.log("📧 Estudante:", student.email, "/ password123")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
