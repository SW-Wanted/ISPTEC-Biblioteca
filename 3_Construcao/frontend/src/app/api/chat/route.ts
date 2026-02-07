import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_COPY_CLASSIFICATION_RULES,
  COPY_CLASSIFICATION_COLORS,
  type CopyClassificationRule,
} from "@/lib/sgbu-rules";

// Inicializar Gemini apenas se a chave existir
let genAI: GoogleGenerativeAI | null = null;
try {
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }
} catch (error) {
  console.error("Failed to initialize Gemini:", error);
}

// Cache for dynamic prompt data (refresh every 5 minutes)
let cachedPromptData: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function buildDynamicPromptContext(): Promise<string> {
  // Return cached if fresh
  if (cachedPromptData && Date.now() - cachedPromptData.timestamp < CACHE_TTL) {
    return cachedPromptData.data;
  }

  const sections: string[] = [];

  try {
    // 1. Loan policies from DB
    const loanPolicies = await prisma.loanPolicyConfig.findMany();
    if (loanPolicies.length > 0) {
      const policyLines = loanPolicies.map((p) => {
        const typeLabel =
          p.userType === "STUDENT"
            ? "Estudantes"
            : p.userType === "TEACHER"
              ? "Professores"
              : p.userType === "LIBRARIAN"
                ? "Bibliotecários"
                : p.userType === "SUPERVISOR"
                  ? "Supervisores"
                  : p.userType;
        return `- ${typeLabel}: máximo ${p.maxBooks} livros por ${p.loanDays} dias, até ${p.maxRenewals} renovações`;
      });
      sections.push(
        `**Políticas de Empréstimo (Dados Actualizados):**\n${policyLines.join("\n")}`,
      );
    }

    // 2. Fine configurations
    const fines = await prisma.fineConfiguration.findMany({
      where: { isActive: true },
    });
    if (fines.length > 0) {
      const fineLines = fines.map((f) => {
        const typeLabel =
          f.type === "LATE_RETURN"
            ? "Atraso na devolução"
            : f.type === "LOST_CARD"
              ? "Perda de credencial"
              : f.type === "DAMAGED_BOOK"
                ? "Dano ao livro"
                : f.type === "LOST_BOOK"
                  ? "Perda de livro"
                  : f.type;
        return `- ${typeLabel}: ${Number(f.amount).toLocaleString("pt-AO")} Kz${f.description ? ` (${f.description})` : ""}`;
      });
      sections.push(`**Sistema de Multas:**\n${fineLines.join("\n")}`);
    }

    // 3. System policies (hours, contacts, etc.)
    const sysPolicies = await prisma.systemPolicy.findMany();
    if (sysPolicies.length > 0) {
      const policyLines = sysPolicies.map(
        (p) => `- ${p.description || p.key}: ${p.value}`,
      );
      sections.push(`**Configurações do Sistema:**\n${policyLines.join("\n")}`);
    }

    // 4. FAQs
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      take: 20,
    });
    if (faqs.length > 0) {
      const faqLines = faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`);
      sections.push(
        `**Perguntas Frequentes (FAQs):**\n${faqLines.join("\n\n")}`,
      );
    }

    // 5. Copy classification rules
    let classificationRules: CopyClassificationRule[] =
      DEFAULT_COPY_CLASSIFICATION_RULES;
    try {
      const config = await prisma.systemConfiguration.findUnique({
        where: { key: "copy_classification_rules" },
      });
      if (config?.value) {
        const parsed = JSON.parse(config.value);
        if (Array.isArray(parsed)) classificationRules = parsed;
      }
    } catch {
      // use defaults
    }
    const ruleLines = classificationRules.map((r) => {
      const colorLabel = COPY_CLASSIFICATION_COLORS[r.color]
        ? r.label
        : r.color;
      const policyLabel =
        r.loanPolicy === "NO_LOAN"
          ? "Não Empresta"
          : r.loanPolicy === "SHORT_TERM"
            ? `Curto Prazo (${r.maxLoanDays ?? 2} dias)`
            : r.loanPolicy === "DAILY"
              ? `Diário (${r.maxLoanDays ?? 1} dia)`
              : r.loanPolicy === "EXTENDED"
                ? `Estendido (${r.maxLoanDays ?? 30} dias)`
                : "Normal (conforme política do tipo de utilizador)";
      const range =
        r.toCopy === null
          ? `exemplar ${r.fromCopy}+`
          : r.fromCopy === r.toCopy
            ? `exemplar ${r.fromCopy}`
            : `exemplares ${r.fromCopy}-${r.toCopy}`;
      return `- ${colorLabel} (${range}): ${policyLabel}`;
    });
    sections.push(
      `**Classificação de Exemplares por Cor:**\n${ruleLines.join("\n")}\nNota: A política de empréstimo de cada livro depende do número de exemplares disponíveis, não de um campo fixo no livro.`,
    );

    // 6. Library statistics
    const [totalBooks, totalMembers, activeLoans, activeReservations] =
      await Promise.all([
        prisma.book.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.loan.count({ where: { status: "ACTIVE" } }),
        prisma.reservation.count({ where: { status: "ACTIVE" } }),
      ]);
    sections.push(
      `**Estatísticas Actuais da Biblioteca:**\n- Livros no acervo: ${totalBooks}\n- Membros activos: ${totalMembers}\n- Empréstimos activos: ${activeLoans}\n- Reservas activas: ${activeReservations}`,
    );
  } catch (error) {
    console.error("Error building dynamic prompt context:", error);
  }

  const dynamicData =
    sections.length > 0
      ? `\n\n--- DADOS ACTUALIZADOS DA BASE DE DADOS ---\n${sections.join("\n\n")}\n--- FIM DOS DADOS ---`
      : "";

  cachedPromptData = { data: dynamicData, timestamp: Date.now() };
  return dynamicData;
}

const BASE_SYSTEM_PROMPT = `Você é o assistente virtual da Biblioteca do ISPTEC (Instituto Superior Politécnico de Tecnologias e Ciências) em Angola.

**Sua função:**
- Ajudar estudantes e professores a encontrar livros
- Explicar como funciona o sistema de empréstimos, reservas e renovações
- Responder dúvidas sobre prazos, multas e serviços da biblioteca
- Ser educado, profissional e prestativo
- Usar SEMPRE os dados actualizados fornecidos abaixo (vindos da base de dados) em vez de valores hardcoded

**Tom de voz:**
- Use português de Angola (ex: "utilizador", "telemóvel")
- Seja breve mas completo
- Use emojis ocasionalmente para ser mais amigável
- Se não souber algo, seja honesto e sugira procurar um bibliotecário

**Não invente informações!** Use os dados fornecidos na secção "DADOS ACTUALIZADOS" abaixo. Se não tiver dados para responder, admita.`;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
});

type GeminiSendMessageResult = {
  response: {
    text: () => string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGeminiSendMessageResult(
  value: unknown,
): value is GeminiSendMessageResult {
  if (!isRecord(value)) return false;
  const response = value.response;
  if (!isRecord(response)) return false;
  return typeof response.text === "function";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

// Respostas de fallback quando Gemini não está disponível
const FALLBACK_RESPONSES: Record<string, string> = {
  "empréstimo|emprestar|pegar livro": `📚 **Como Emprestar um Livro**

**Limites por tipo:**
- **Estudantes:** 2 livros por 5 dias
- **Professores:** 4 livros por 15 dias
- **Livros de consulta diária:** 1 livro por 1 dia (todos os tipos)

**Passos:**
1. 🔍 Procure o livro no catálogo online
2. ✅ Verifique se está disponível
3. 🏛️ Dirija-se à biblioteca com seu cartão de estudante/docente
4. 📱 Apresente seu QR Code ou cartão físico
5. 📖 Levante o livro no balcão de atendimento

**Importante:** Renovações podem ser feitas até 2 vezes, desde que não haja reservas.`,

  "renovar|renovação|estender prazo": `🔄 **Como Renovar um Empréstimo**

Pode renovar até **2 vezes**, desde que:
- ✅ Não tenha multas pendentes
- ✅ Ninguém tenha reservado o livro
- ✅ Não esteja com atraso

**Para renovar:**
1. Acesse "Meus Empréstimos" no menu
2. Clique em "Renovar" no livro desejado
3. O prazo será estendido automaticamente

Cada renovação estende o prazo pelo período original (5 dias estudantes, 15 dias docentes).`,

  "reservar|reserva|fila": `📋 **Como Reservar um Livro**

Se o livro não estiver disponível, pode entrar na **fila de espera**.

**Processo:**
1. 🔍 Encontre o livro indisponível
2. 🎟️ Clique em "Reservar"
3. ⏰ Quando disponível, receberá notificação (email/SMS)
4. ⏱️ Terá **48 horas** para levantar o livro

A fila funciona por **ordem de chegada (FIFO)** - primeiro a reservar, primeiro a receber.`,

  "multa|atraso|penalidade": `💰 **Sistema de Multas**

**Valores:**
- 📅 Atraso na devolução: **50 Kz por dia**
- 📱 Perda de credencial: conforme tabela oficial
- 📚 Dano ao livro: avaliação caso a caso

**Importante:**
- ⛔ Com multas pendentes, não pode fazer novos empréstimos
- ⛔ Renovações ficam bloqueadas até regularizar
- 💳 Pagamento na secretaria da biblioteca

**Para verificar:** Acesse "Minhas Multas" no menu.`,

  "horário|funciona|aberto": `🕐 **Horário de Funcionamento**

**Normal:**
- Segunda a Sexta: **07h30 - 17h00**

**Época de Provas:**
- Sábados: **08h00 - 12h30**

**Fechado:**
- Domingos e feriados nacionais

**Contactos:**
📧 biblioteca@isptec.ao
📞 +244 XXX XXX XXX
📍 Campus ISPTEC, Luanda`,

  "cadastro|registar|conta": `👤 **Como se Cadastrar**

**Online (recomendado):**
1. Acesse a plataforma da biblioteca
2. Clique em "Registar"
3. Preencha seus dados
4. Faça upload do cartão de estudante/docente
5. Aguarde aprovação (até 48h)

**Presencial:**
1. Dirija-se à biblioteca
2. Leve documento de identificação
3. Leve comprovante de matrícula (estudantes) ou vínculo (docentes)
4. Receberá sua credencial digital com QR Code

Após aprovação, pode começar a emprestar livros imediatamente!`,

  "help|ajuda|não entendi": `🤖 **Posso ajudar com:**

📚 **Empréstimos:** Como pegar, renovar e devolver livros
🔍 **Busca:** Encontrar livros no acervo
📋 **Reservas:** Entrar na fila de espera
💰 **Multas:** Verificar pendências
⏰ **Horários:** Quando a biblioteca funciona
👤 **Cadastro:** Como se registar

**Digite sua dúvida ou escolha uma das opções acima!**

_Obs: O assistente com IA está temporariamente indisponível. Estou usando respostas pré-programadas._`,
};

// Função para encontrar resposta de fallback (enhanced with DB FAQs)
async function getFallbackResponse(message: string): Promise<string | null> {
  const lowerMessage = message.toLowerCase();

  // 1. Try to match against FAQs from DB
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    for (const faq of faqs) {
      const questionWords = faq.question
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const matchCount = questionWords.filter((w) =>
        lowerMessage.includes(w),
      ).length;
      if (matchCount >= 2 || (questionWords.length <= 3 && matchCount >= 1)) {
        return `📋 **${faq.question}**\n\n${faq.answer}`;
      }
    }
  } catch {
    // ignore DB errors in fallback
  }

  // 2. Try hardcoded patterns
  for (const [keywords, response] of Object.entries(FALLBACK_RESPONSES)) {
    const patterns = keywords.split("|");
    if (patterns.some((pattern) => lowerMessage.includes(pattern))) {
      return response;
    }
  }

  // Resposta genérica se nenhuma palavra-chave for encontrada
  if (lowerMessage.length > 5) {
    return FALLBACK_RESPONSES["help|ajuda|não entendi"];
  }

  return null;
}

// Implementação das funções
async function searchBooks(query: string, limit: number = 5) {
  try {
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        authors: { include: { author: true } },
        category: true,
      },
      take: limit,
    });

    return books.map((book) => ({
      id: book.id,
      title: book.title,
      authors: book.authors.map((a) => a.author.name).join(", "),
      category: book.category?.name || "Sem categoria",
      available: book.availableCopies > 0,
      copies: book.availableCopies,
    }));
  } catch (error) {
    console.error("searchBooks error:", error);
    return [];
  }
}

async function checkBookAvailability(bookId: string) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        copies: { where: { status: "AVAILABLE" } },
        reservations: { where: { status: "ACTIVE" } },
      },
    });

    if (!book) return { available: false, message: "Livro não encontrado" };

    return {
      available: book.availableCopies > 0,
      copies: book.availableCopies,
      reservations: book.reservations.length,
      message:
        book.availableCopies > 0
          ? "Disponível para empréstimo"
          : `Indisponível. ${book.reservations.length} pessoa(s) na fila de reserva.`,
    };
  } catch (error) {
    console.error("checkBookAvailability error:", error);
    return { available: false, message: "Erro ao verificar disponibilidade" };
  }
}

function extractSearchQuery(text: string): string | null {
  const cleaned = text.trim();
  const match = cleaned.match(/(?:livros?\s+(?:de|sobre)\s+)(.+)$/i);
  if (match?.[1]) return match[1].trim();

  const fallback = cleaned.match(
    /(?:procurar|pesquisar|buscar|encontrar)\s+(.+)$/i,
  );
  if (fallback?.[1]) return fallback[1].trim();

  return null;
}

function extractBookId(text: string): string | null {
  const match = text.match(/\b([a-z0-9]{20,})\b/i);
  return match?.[1] ?? null;
}

async function getUserLoans(userId: string) {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        copy: {
          include: {
            book: {
              include: {
                authors: { include: { author: true } },
              },
            },
          },
        },
      },
    });

    return loans.map((loan) => ({
      book: loan.copy.book.title,
      dueDate: loan.dueDate.toLocaleDateString("pt-AO"),
      renewals: loan.renewalCount,
      overdue: loan.dueDate < new Date(),
    }));
  } catch (error) {
    console.error("getUserLoans error:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  let lastMessage = "";

  try {
    console.log("📨 Chat request received");

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log("✅ Session valid:", session.user.email);

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }
    const userName = session.user.name || "Utilizador";

    const userType = session.user.type;

    const bodyJson: unknown = await request.json();
    const body = chatBodySchema.parse(bodyJson);
    const messages: IncomingMessage[] = body.messages;
    lastMessage = messages[messages.length - 1]?.content ?? "";

    console.log("💬 Last message:", lastMessage.substring(0, 100));

    // Se Gemini não estiver disponível, usar fallback imediatamente
    if (!genAI || !process.env.GOOGLE_GEMINI_API_KEY) {
      console.log("⚠️ Gemini não inicializado - usando fallback");
      const fallbackResponse = await getFallbackResponse(lastMessage);

      if (fallbackResponse) {
        return NextResponse.json({
          message: fallbackResponse,
          provider: "fallback",
          warning:
            "Assistente IA temporariamente indisponível. Usando respostas pré-programadas.",
        });
      }

      return NextResponse.json(
        {
          error:
            "Gemini não configurado e nenhuma resposta de fallback disponível.",
        },
        { status: 500 },
      );
    }

    console.log("✅ Gemini disponível");

    const userTypeLabel =
      userType === "STUDENT"
        ? "Estudante"
        : userType === "TEACHER"
          ? "Professor"
          : userType === "LIBRARIAN"
            ? "Bibliotecário"
            : userType === "SUPERVISOR"
              ? "Supervisor"
              : "Utilizador";

    const userContext = `\n\n[CONTEXTO DO UTILIZADOR]\nNome: ${userName}\nTipo: ${userTypeLabel}`;

    // Contexto dinâmico (buscas / empréstimos) para respostas mais úteis
    let dynamicContext = "";

    if (
      /meus\s+empr[eé]stimos|o\s+que\s+tenho\s+emprestado|livros\s+que\s+peguei/i.test(
        lastMessage,
      )
    ) {
      console.log("🔍 Fetching user loans...");
      const loans = await getUserLoans(userId);
      dynamicContext += `\n\n[EMPRÉSTIMOS ATIVOS]\n${JSON.stringify(loans, null, 2)}`;
    }

    const maybeBookId = extractBookId(lastMessage);
    if (
      maybeBookId &&
      /dispon[ií]vel|disponibilidade|exemplar|stock/i.test(lastMessage)
    ) {
      console.log("🔍 Checking book availability...");
      const availability = await checkBookAvailability(maybeBookId);
      dynamicContext += `\n\n[DISPONIBILIDADE DO LIVRO]\n${JSON.stringify(availability, null, 2)}`;
    }

    const searchQuery = extractSearchQuery(lastMessage);
    if (searchQuery) {
      console.log("🔍 Searching books:", searchQuery);
      const results = await searchBooks(searchQuery, 5);
      dynamicContext += `\n\n[RESULTADOS DA BUSCA]\n${JSON.stringify(results, null, 2)}`;
    }

    console.log("🤖 Calling Gemini API...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Build dynamic system prompt with DB data
    const dynamicPromptContext = await buildDynamicPromptContext();
    const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + dynamicPromptContext;

    // Construir histórico (apenas mensagens anteriores, excluindo a última)
    let history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Gemini exige que a primeira mensagem seja sempre 'user'
    // Se o histórico começar com 'model', removemos ou ajustamos
    if (history.length > 0 && history[0].role === "model") {
      console.log('⚠️ Histórico começa com "model", ajustando...');
      history = history.slice(1); // Remove a primeira mensagem 'model'
    }

    const chat = model.startChat({ history });
    const prompt = `${SYSTEM_PROMPT}${userContext}${dynamicContext}\n\nUtilizador: ${lastMessage}`;

    // Retry com delay exponencial para rate limit
    let retries = 0;
    const maxRetries = 1;
    let result: GeminiSendMessageResult | undefined;

    while (retries <= maxRetries) {
      try {
        const maybeResult: unknown = await chat.sendMessage(prompt);
        if (!isGeminiSendMessageResult(maybeResult)) {
          throw new Error("Resposta inválida do Gemini");
        }
        result = maybeResult;
        break; // Sucesso, sai do loop
      } catch (retryError: unknown) {
        const errMsg = getErrorMessage(retryError);

        // Se for rate limit e ainda temos retries, aguarda e tenta novamente
        if (
          /rate|quota|429|too many requests/i.test(errMsg) &&
          retries < maxRetries
        ) {
          const delayMs = Math.pow(2, retries) * 3000; // 3s
          console.log(
            `⏳ Rate limit hit, retrying in ${delayMs}ms... (attempt ${retries + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          retries++;
        } else {
          // Outro erro ou sem mais retries, relança
          throw retryError;
        }
      }
    }

    console.log("✅ Gemini response received");

    if (!result) throw new Error("Resposta inválida do Gemini");

    return NextResponse.json({
      message: result.response.text(),
      provider: "gemini-2.5-flash-lite",
    });
  } catch (error: unknown) {
    console.error("❌ Gemini Error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : undefined,
      message: getErrorMessage(error),
      stack:
        error instanceof Error
          ? error.stack?.split("\n").slice(0, 3)
          : undefined,
    });

    const message = getErrorMessage(error);

    // Rate limit / Quota exceeded
    if (
      /rate|quota|resource has been exhausted|too many requests|429/i.test(
        message,
      )
    ) {
      console.log("⚠️ Gemini rate limit - usando fallback");

      // Tentar resposta de fallback
      const fallbackResponse = await getFallbackResponse(lastMessage);

      if (fallbackResponse) {
        return NextResponse.json({
          message: `ℹ️ **Assistente em Modo Offline**\n\nDevido ao alto volume de consultas, estou a funcionar em modo de respostas rápidas neste momento. Continuo aqui para ajudar! 😊\n\n---\n\n${fallbackResponse}\n\n---\n\n💡 **Nota:** Para questões mais complexas, tente novamente dentro de alguns minutos quando o assistente IA estiver disponível.`,
          provider: "fallback",
          fallbackMode: true,
        });
      }

      return NextResponse.json(
        {
          error: "⏳ Muitas consultas simultâneas",
          hint: "O assistente está a processar muitas conversas. Aguarde 1-2 minutos e tente novamente. O sistema continuará a funcionar normalmente! 😊",
        },
        { status: 429 },
      );
    }

    // Invalid API key - também usar fallback
    if (
      /api key not valid|api_key_invalid|invalid_api_key|400/i.test(message)
    ) {
      console.log("⚠️ Gemini API key inválida - usando fallback");

      const fallbackResponse = await getFallbackResponse(lastMessage);

      if (fallbackResponse) {
        return NextResponse.json({
          message: `ℹ️ **Assistente em Modo Offline**\n\nEstou a funcionar com respostas rápidas para garantir que continues a receber ajuda! 😊\n\n---\n\n${fallbackResponse}\n\n---\n\n💡 **Dica:** Entre em contato com a equipa da biblioteca se precisares de assistência adicional.`,
          provider: "fallback",
          fallbackMode: true,
        });
      }

      return NextResponse.json(
        {
          error: "⚙️ Assistente em Manutenção",
          hint: "O assistente IA está temporariamente indisponível. Podes consultar a equipa da biblioteca no balcão de atendimento. Pedimos desculpa pelo inconveniente! 🙏",
        },
        { status: 500 },
      );
    }

    // Blocked region / Unsupported country - usar fallback
    if (/region|country|location|blocked|unsupported/i.test(message)) {
      console.log("⚠️ Gemini bloqueado na região - usando fallback");

      const fallbackResponse = await getFallbackResponse(lastMessage);

      if (fallbackResponse) {
        return NextResponse.json({
          message: `ℹ️ **Assistente em Modo Local**\n\nEstou a funcionar em modo optimizado para garantir o melhor atendimento! 😊\n\n---\n\n${fallbackResponse}\n\n---\n\n📚 **Lembra-te:** A equipa da biblioteca está sempre disponível no balcão para ajudar com questões mais específicas.`,
          provider: "fallback",
          fallbackMode: true,
        });
      }

      return NextResponse.json(
        {
          error:
            "Gemini não disponível na sua região. Use VPN ou tente outra chave API.",
          hint: "Angola pode não estar na lista de países suportados pelo Gemini.",
        },
        { status: 503 },
      );
    }

    // Generic error - tentar fallback como última tentativa
    console.log("⚠️ Erro genérico do Gemini - tentando fallback");
    const fallbackResponse = await getFallbackResponse(lastMessage);

    if (fallbackResponse) {
      return NextResponse.json({
        message: fallbackResponse,
        provider: "fallback",
        warning:
          "Assistente IA temporariamente indisponível. Usando respostas pré-programadas.",
      });
    }

    // Se nem fallback funcionar, retornar erro
    return NextResponse.json(
      {
        error: "Erro ao processar mensagem. Por favor, tente novamente.",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
