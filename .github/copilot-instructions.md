# Copilot Instructions - Sistema de Gestão de Biblioteca Universitária (SGBU) - ISPTEC

---

## 📋 CONTEXTO DO PROJETO

Você é um assistente especializado no desenvolvimento do **Sistema de Gestão de Biblioteca Universitária (SGBU)** para o Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC) em Luanda, Angola.

Este projeto é desenvolvido como parte da disciplina **Engenharia de Software I**, seguindo a metodologia **RUPE (Rational Unified Process Estendido)**.

### Objetivo Principal
Modernizar e digitalizar completamente os processos da Biblioteca do ISPTEC, substituindo processos semi-manuais por fluxos digitais automatizados, integrando tecnologias de Inteligência Artificial.

---

## 🎯 STACK TECNOLÓGICO

### Backend
- **Runtime:** Node.js 20+ com TypeScript 5+
- **Framework:** Next.js 14+ (App Router) ou Express.js
- **ORM:** Prisma (schema já definido)
- **Banco de Dados:** PostgreSQL 15+
- **Validação:** Zod
- **Autenticação:** NextAuth.js ou JWT
- **API:** REST (OpenAPI/Swagger documentado)

### Frontend
- **Framework:** Next.js 14+ com TypeScript
- **UI Library:** React 18+
- **Styling:** Tailwind CSS 3+
- **Componentes:** shadcn/ui
- **State Management:** Zustand ou React Query
- **Formulários:** React Hook Form + Zod
- **Icons:** Lucide React

### Mobile (Opcional)
- **Framework:** React Native ou Flutter
- **QR Code:** react-native-qrcode-scanner

### IA e Machine Learning
- **OCR:** Tesseract.js ou Google Cloud Vision API
- **NLP (Chatbot):** OpenAI GPT-4 API ou Google Dialogflow
- **Recomendações:** Algoritmos colaborativos (matriz de similaridade)

### Infraestrutura
- **Cloud:** Vercel (frontend) + Railway/Render (backend)
- **Storage:** AWS S3 ou Cloudinary (imagens/documentos)
- **Email/SMS:** Resend + Twilio
- **Monitoring:** Sentry

---

## 📁 ESTRUTURA DO PROJETO

```
sgbu-isptec/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/        # Rotas autenticadas
│   │   │   ├── (public)/      # Rotas públicas
│   │   │   ├── api/           # API routes
│   │   │   └── dashboard/     # Dashboard principal
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── features/      # Feature components
│   │   │   └── layouts/       # Layouts
│   │   ├── lib/
│   │   │   ├── prisma.ts      # Prisma client
│   │   │   ├── auth.ts        # Auth config
│   │   │   └── utils.ts       # Utilities
│   │   └── styles/
│   ├── api/                    # Backend Express (alternativa)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   └── prisma/
│   └── mobile/                 # React Native app (opcional)
├── packages/
│   ├── database/              # Prisma schema e migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   ├── types/                 # TypeScript types compartilhados
│   ├── ui/                    # Componentes compartilhados
│   └── utils/                 # Utilities compartilhadas
├── docs/
│   ├── PRD.md                 # Product Requirements Document
│   ├── architecture.md        # Arquitetura do sistema
│   ├── api-docs.md           # Documentação API
│   └── deployment.md         # Guia de deployment
├── .github/
│   └── workflows/            # CI/CD
└── README.md
```

---

## 🎨 PADRÕES DE CÓDIGO

### TypeScript
```typescript
// ✅ CORRETO: Use interfaces para objetos, types para unions
interface User {
  id: string;
  name: string;
  type: UserType;
}

type UserType = 'STUDENT' | 'TEACHER' | 'STAFF';

// ✅ CORRETO: Sempre tipar retornos de funções
async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}

// ✅ CORRETO: Use optional chaining e nullish coalescing
const userName = user?.name ?? 'Usuário';

// ❌ ERRADO: Evitar any
// const data: any = await fetchData();

// ✅ CORRETO: Use tipos específicos ou unknown
const data: unknown = await fetchData();
```

### Naming Conventions
```typescript
// Componentes: PascalCase
export function BookCard() {}

// Funções: camelCase com verbo
export async function fetchUserLoans() {}

// Constantes: UPPER_SNAKE_CASE
export const MAX_LOAN_DAYS = 5;

// Hooks: use + PascalCase
export function useAuth() {}

// Types/Interfaces: PascalCase
export interface LoanData {}

// Arquivos:
// - Componentes: PascalCase.tsx
// - Utilitários: kebab-case.ts
// - Hooks: use-hook-name.ts
```

### Componentes React
```tsx
// ✅ CORRETO: Componentes funcionais com TypeScript
interface BookCardProps {
  book: Book;
  onReserve?: (bookId: string) => void;
}

export function BookCard({ book, onReserve }: BookCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{book.title}</h3>
      {onReserve && (
        <button onClick={() => onReserve(book.id)}>
          Reservar
        </button>
      )}
    </div>
  );
}

// ✅ CORRETO: Server Components quando possível (Next.js)
export default async function LoansPage() {
  const loans = await getActiveLoans();
  return <LoansList loans={loans} />;
}

// ✅ CORRETO: Client Components quando necessário
'use client';
export function RenewButton({ loanId }: { loanId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### API Routes (Next.js)
```typescript
// app/api/loans/[id]/renew/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const renewSchema = z.object({
  loanId: z.string().cuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validar sessão
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Validar input
    const { loanId } = renewSchema.parse({ loanId: params.id });

    // 3. Lógica de negócio
    const result = await renewLoan(loanId, session.user.id);

    // 4. Retornar resposta
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Erro ao renovar empréstimo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### Prisma Queries
```typescript
// ✅ CORRETO: Use select para campos específicos
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    loans: {
      where: { status: 'ACTIVE' },
      include: { copy: { include: { book: true } } },
    },
  },
});

// ✅ CORRETO: Transactions para operações múltiplas
const result = await prisma.$transaction(async (tx) => {
  const loan = await tx.loan.update({
    where: { id: loanId },
    data: { renewalCount: { increment: 1 } },
  });
  
  await tx.notification.create({
    data: {
      userId: loan.userId,
      type: 'EMAIL',
      title: 'Empréstimo renovado',
      message: `Novo prazo: ${loan.dueDate}`,
    },
  });
  
  return loan;
});

// ✅ CORRETO: Use aggregations para estatísticas
const stats = await prisma.loan.aggregate({
  where: { status: 'OVERDUE' },
  _count: true,
  _sum: { fineAmount: true },
});
```

---

## 🔒 REGRAS DE NEGÓCIO CRÍTICAS

### 1. Limites de Empréstimo (Artigo 10º)
```typescript
const LOAN_LIMITS = {
  STUDENT: {
    maxBooks: 2,
    loanDays: 5,
    dailyBookMaxBooks: 1,
    dailyBookDays: 1,
    maxCDs: 1,
    cdDays: 2,
  },
  TEACHER: {
    maxBooks: 4,
    loanDays: 15,
    dailyBookMaxBooks: 1,
    dailyBookDays: 1,
    maxCDs: 1,
    cdDays: 2,
  },
} as const;

// ✅ Sempre validar antes de emprestar
async function canLoan(userId: string, userType: UserType): Promise<boolean> {
  const activeLoans = await prisma.loan.count({
    where: { userId, status: 'ACTIVE' },
  });
  
  const limit = LOAN_LIMITS[userType].maxBooks;
  return activeLoans < limit;
}
```

### 2. Renovação de Empréstimos (Artigo 15º)
```typescript
async function canRenewLoan(loanId: string): Promise<{
  canRenew: boolean;
  reason?: string;
}> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      copy: { include: { book: true } },
      user: true,
    },
  });

  if (!loan) return { canRenew: false, reason: 'Empréstimo não encontrado' };

  // 1. Verificar limite de renovações
  if (loan.renewalCount >= loan.maxRenewals) {
    return { canRenew: false, reason: 'Limite de renovações atingido (máx: 2)' };
  }

  // 2. Verificar se há reservas
  const hasReservations = await prisma.reservation.count({
    where: {
      bookId: loan.copy.bookId,
      status: 'ACTIVE',
    },
  });

  if (hasReservations > 0) {
    return { canRenew: false, reason: 'Livro possui reservas pendentes' };
  }

  // 3. Verificar multas pendentes
  if (loan.user.totalFines > 0) {
    return { canRenew: false, reason: 'Regularize suas pendências financeiras' };
  }

  return { canRenew: true };
}
```

### 3. Fila de Reservas (FIFO)
```typescript
async function notifyNextInQueue(bookId: string): Promise<void> {
  const nextReservation = await prisma.reservation.findFirst({
    where: {
      bookId,
      status: 'ACTIVE',
    },
    orderBy: { queuePosition: 'asc' },
    include: { user: true },
  });

  if (nextReservation) {
    await prisma.reservation.update({
      where: { id: nextReservation.id },
      data: {
        status: 'AVAILABLE',
        availableDate: new Date(),
        expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      },
    });

    // Enviar notificação multi-canal
    await sendNotification({
      userId: nextReservation.userId,
      type: nextReservation.user.preferredNotification,
      title: 'Livro disponível!',
      message: `O livro que reservaste está disponível. Tens 48h para levantar.`,
    });
  }
}
```

### 4. Cálculo de Multas
```typescript
async function calculateLateFine(loanId: string): Promise<number> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
  });

  if (!loan || loan.status !== 'OVERDUE') return 0;

  const daysOverdue = Math.floor(
    (Date.now() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const FINE_PER_DAY = 50; // Kz (ajustar conforme tabela oficial)
  return daysOverdue * FINE_PER_DAY;
}
```

---

## 🤖 INTEGRAÇÃO COM IA

### OCR para Catalogação
```typescript
import Tesseract from 'tesseract.js';

async function extractBookData(imageUrl: string) {
  const { data: { text } } = await Tesseract.recognize(imageUrl, 'por+eng');
  
  // Extrair ISBN usando regex
  const isbnMatch = text.match(/ISBN[:\s-]*(\d{13}|\d{10})/i);
  const isbn = isbnMatch?.[1];
  
  // Chamar API externa para enriquecer dados
  if (isbn) {
    const enrichedData = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    ).then(r => r.json());
    
    return {
      isbn,
      title: enrichedData.items?.[0]?.volumeInfo?.title,
      authors: enrichedData.items?.[0]?.volumeInfo?.authors,
      publisher: enrichedData.items?.[0]?.volumeInfo?.publisher,
      publishedYear: enrichedData.items?.[0]?.volumeInfo?.publishedDate,
      ocrConfidence: 85.5, // Calcular com base na qualidade
    };
  }
  
  return null;
}
```

### Sistema de Recomendação
```typescript
async function getRecommendations(userId: string, limit = 5) {
  // 1. Obter histórico de leitura
  const userLoans = await prisma.loan.findMany({
    where: { userId, status: 'RETURNED' },
    include: { copy: { include: { book: true } } },
  });

  const readCategories = userLoans.map(l => l.copy.book.categoryId);

  // 2. Encontrar livros similares não lidos
  const recommendations = await prisma.book.findMany({
    where: {
      categoryId: { in: readCategories },
      NOT: {
        copies: {
          some: {
            loans: { some: { userId } },
          },
        },
      },
    },
    take: limit,
    orderBy: { availableCopies: 'desc' },
  });

  return recommendations;
}
```

### Chatbot com NLP
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function processChatMessage(
  userId: string,
  message: string,
  sessionId: string
) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Você é um assistente da Biblioteca do ISPTEC. 
        Ajude os utilizadores com: consulta de disponibilidade, 
        informações sobre empréstimos, renovações, reservas e regulamento.
        Seja sempre educado e responda em português de Angola.`,
      },
      { role: 'user', content: message },
    ],
  });

  const botResponse = completion.choices[0].message.content;

  // Salvar no histórico
  await prisma.chatMessage.createMany({
    data: [
      { userId, sessionId, message, isBot: false },
      { userId, sessionId, message: botResponse, isBot: true },
    ],
  });

  return botResponse;
}
```

---

## 🎨 UI/UX GUIDELINES

### Tailwind CSS Classes Padrão
```tsx
// Containers
<div className="container mx-auto px-4 py-8">

// Cards
<div className="rounded-lg border bg-card p-6 shadow-sm">

// Botões
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
  
// Inputs
<input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2">

// Typography
<h1 className="text-3xl font-bold tracking-tight">
<p className="text-muted-foreground">
```

### Componentes shadcn/ui Recomendados
- `Button`, `Input`, `Label`, `Textarea`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Dialog`, `AlertDialog`
- `Table`, `TableHeader`, `TableRow`, `TableCell`
- `Badge`, `Avatar`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Select`, `Combobox`, `DatePicker`
- `Toast`, `Alert`
- `Skeleton` (loading states)

### Responsive Design
```tsx
// Mobile-first approach
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
<h1 className="text-2xl md:text-3xl lg:text-4xl">
<div className="flex flex-col md:flex-row gap-4">
```

---

## ✅ CHECKLIST PARA CADA FEATURE

Ao implementar qualquer funcionalidade, certifique-se de:

- [ ] **Validação de entrada** com Zod
- [ ] **Autenticação e autorização** verificadas
- [ ] **Tratamento de erros** completo (try-catch)
- [ ] **Logs apropriados** para debug
- [ ] **Otimização de queries** Prisma (select, include)
- [ ] **Loading states** na UI
- [ ] **Error states** com mensagens claras
- [ ] **Success feedback** (toast, mensagem)
- [ ] **Responsividade** mobile/tablet/desktop
- [ ] **Acessibilidade** (ARIA labels, keyboard navigation)
- [ ] **Testes unitários** (Jest/Vitest)
- [ ] **Testes E2E** (Playwright) para fluxos críticos
- [ ] **Documentação** de API (se aplicável)
- [ ] **Conformidade com regulamento** ISPTEC

---

## 📝 CONVENÇÕES DE COMMIT

Use Conventional Commits:

```
feat(loans): add automatic renewal validation
fix(auth): correct QR code generation bug
docs(readme): update installation instructions
refactor(notifications): improve multi-channel logic
test(reservations): add queue management tests
chore(deps): update prisma to v5.8.0
```

Prefixos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

---

## 🚨 PRIORIDADES E RESTRIÇÕES

### SEMPRE faça:
1. ✅ Validar permissões antes de operações críticas
2. ✅ Usar transactions para múltiplas operações relacionadas
3. ✅ Enviar notificações conforme preferência do usuário
4. ✅ Logar atividades críticas (ActivityLog)
5. ✅ Respeitar limites de empréstimo por tipo de usuário
6. ✅ Verificar reservas antes de renovações
7. ✅ Calcular multas automaticamente
8. ✅ Manter disponibilidade de livros sincronizada

### NUNCA faça:
1. ❌ Expor informações sensíveis em logs
2. ❌ Permitir renovações sem validações
3. ❌ Ignorar status de bloqueio de usuário
4. ❌ Fazer queries N+1 (use include/select adequadamente)
5. ❌ Hardcodar valores de configuração (use SystemConfiguration)
6. ❌ Retornar erros genéricos ao usuário
7. ❌ Permitir operações sem autenticação

---

## 🔍 DEBUGGING E PERFORMANCE

### Logging
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Uso
logger.info({ userId, loanId }, 'Renovação de empréstimo iniciada');
logger.error({ error }, 'Falha ao processar reserva');
```

### Performance
```typescript
// ✅ Use React Query para cache
const { data: loans, isLoading } = useQuery({
  queryKey: ['loans', userId],
  queryFn: () => fetchUserLoans(userId),
  staleTime: 5 * 60 * 1000, // 5 minutos
});

// ✅ Pagination no Prisma
const books = await prisma.book.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// ✅ Lazy loading de imagens
<Image src={book.coverUrl} loading="lazy" alt={book.title} />
```

---

## 🌍 LOCALIZAÇÃO (pt-AO)

### Termos Específicos
- Utilizador (não "usuário")
- Cacifo (não "armário")
- Levantamento (não "retirada")
- Empréstimo (não "emprestimo")
- Funcionário (não "funcionário")

### Formatação
```typescript
// Datas
const dateFormatter = new Intl.DateTimeFormat('pt-AO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// Moeda (Kwanza)
const currencyFormatter = new Intl.NumberFormat('pt-AO', {
  style: 'currency',
  currency: 'AOA',
});
```

---

## 📚 REFERÊNCIAS RÁPIDAS

- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Zod:** https://zod.dev
- **React Query:** https://tanstack.com/query/latest

---

## 🎓 CONTEXTO ACADÉMICO

Este projeto é desenvolvido por estudantes de Engenharia Informática do ISPTEC como projeto final da disciplina de Engenharia de Software I. A equipa deve demonstrar:

- Aplicação prática da metodologia RUPE
- Modelagem completa (BPMN, Casos de Uso, UML)
- Implementação funcional e inovadora
- Documentação técnica profissional
- Trabalho colaborativo e gestão de projeto

**Grupo 04:**
- Carlos Neves Mussagui Tchípia
- Emanuel Carneiro dos Santos
- José Simão Tala
- Líria Djenaba Vilança Bá

**Docente:** Judson Quissanga Coge Paiva

---

**Última atualização:** Janeiro 2026
**Versão:** 1.0