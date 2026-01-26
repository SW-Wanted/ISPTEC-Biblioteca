import { OpenAI } from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const SYSTEM_PROMPT = `Você é o assistente virtual da Biblioteca do ISPTEC (Instituto Superior Politécnico de Tecnologias e Ciências) em Angola.

**Sua função:**
- Ajudar estudantes e professores a encontrar livros
- Explicar como funciona o sistema de empréstimos, reservas e renovações
- Responder dúvidas sobre prazos, multas e serviços da biblioteca
- Ser educado, profissional e prestativo

**Regras da biblioteca:**
- Estudantes: máximo 2 livros por 5 dias
- Professores: máximo 4 livros por 15 dias
- Renovações: até 2 vezes, se não houver reservas
- Multas: 50 Kz por dia de atraso
- Horário: 7h30-17h (segunda a sexta), 8h-12h30 (sábado em época de provas)

**Tom de voz:**
- Use português de Angola (ex: "utilizador", "telemóvel")
- Seja breve mas completo
- Use emojis ocasionalmente para ser mais amigável
- Se não souber algo, seja honesto e sugira procurar um bibliotecário

**Não invente informações!** Se não tiver certeza, admita.`

// Funções que a IA pode chamar
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_books',
      description: 'Busca livros no acervo da biblioteca por título, autor ou categoria',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Termo de busca (título, autor ou assunto)',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de resultados',
            default: 5,
          }
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_book_availability',
      description: 'Verifica se um livro específico está disponível para empréstimo',
      parameters: {
        type: 'object',
        properties: {
          book_id: {
            type: 'string',
            description: 'ID do livro',
          }
        },
        required: ['book_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_loans',
      description: 'Obtém os empréstimos ativos do usuário',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

// Implementação das funções
async function searchBooks(query: string, limit: number = 5) {
  const books = await prisma.book.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { authors: { some: { author: { name: { contains: query, mode: 'insensitive' } } } } },
      ]
    },
    include: {
      authors: { include: { author: true } },
      category: true,
    },
    take: limit,
  })

  return books.map(book => ({
    id: book.id,
    title: book.title,
    authors: book.authors.map(a => a.author.name).join(', '),
    category: book.category?.name || 'Sem categoria',
    available: book.availableCopies > 0,
    copies: book.availableCopies,
  }))
}

async function checkBookAvailability(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      copies: { where: { status: 'AVAILABLE' } },
      reservations: { where: { status: 'ACTIVE' } },
    }
  })

  if (!book) return { available: false, message: 'Livro não encontrado' }

  return {
    available: book.availableCopies > 0,
    copies: book.availableCopies,
    reservations: book.reservations.length,
    message: book.availableCopies > 0 
      ? 'Disponível para empréstimo' 
      : `Indisponível. ${book.reservations.length} pessoa(s) na fila de reserva.`
  }
}

async function getUserLoans(userId: string) {
  const loans = await prisma.loan.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      copy: {
        include: {
          book: {
            include: {
              authors: { include: { author: true } }
            }
          }
        }
      }
    }
  })

  return loans.map(loan => ({
    book: loan.copy.book.title,
    dueDate: loan.dueDate.toLocaleDateString('pt-AO'),
    renewals: loan.renewalCount,
    overdue: loan.dueDate < new Date(),
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userName = session.user.name || 'Utilizador'
    const userType = (session.user as any).type

    const userTypeLabel = userType === 'STUDENT' ? 'Estudante' 
      : userType === 'TEACHER' ? 'Professor'
      : userType === 'LIBRARIAN' ? 'Bibliotecário'
      : userType === 'SUPERVISOR' ? 'Supervisor'
      : 'Utilizador'

    const { messages } = await request.json()

    const userContext = `\n\n[CONTEXTO DO USUÁRIO]\nNome: ${userName}\nTipo: ${userTypeLabel}`

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + userContext },
        ...messages,
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 800,
    })

    let assistantMessage = response.choices[0].message

    // Se a IA quis chamar uma função
    while (assistantMessage.tool_calls) {
      const toolCalls = assistantMessage.tool_calls

      // Executar as funções solicitadas
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const args = JSON.parse(toolCall.function.arguments)
          let result

          try {
            switch (toolCall.function.name) {
              case 'search_books':
                result = await searchBooks(args.query, args.limit)
                break
              case 'check_book_availability':
                result = await checkBookAvailability(args.book_id)
                break
              case 'get_user_loans':
                result = await getUserLoans(userId)
                break
              default:
                result = { error: 'Função desconhecida' }
            }
          } catch (error) {
            console.error(`Erro ao executar ${toolCall.function.name}:`, error)
            result = { error: 'Erro ao executar função' }
          }

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify(result),
          }
        })
      )

      // Enviar resultados de volta para a IA
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + userContext },
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        temperature: 0.7,
        max_tokens: 800,
      })

      assistantMessage = response.choices[0].message
    }

    return NextResponse.json({
      message: assistantMessage.content,
      usage: response.usage, // Para monitorar custos
    })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    
    if (error?.code === 'insufficient_quota') {
      return NextResponse.json({
        error: 'Limite de créditos da API atingido. Contacte o administrador.'
      }, { status: 429 })
    }

    if (error?.status === 401) {
      return NextResponse.json({
        error: 'Chave da API OpenAI inválida. Contacte o administrador.'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Erro ao processar mensagem. Tente novamente.'
    }, { status: 500 })
  }
}
