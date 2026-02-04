# SGBU-009: Relatórios com Exportação CSV/PDF - IMPLEMENTAÇÃO COMPLETA

**Issue:** #35  
**Branch:** issue/sgbu-009-reports-export  
**Status:** ✅ COMPLETO  
**Data:** 04 de Fevereiro de 2026  
**Equipa:** Grupo 04 - ISPTEC

---

## 📋 Resumo da Implementação

Sistema completo de relatórios com filtros avançados, exportação CSV/PDF e dashboard em tempo real conforme requisitos **RF018**, **RF019** e **RF020** do PRD.

---

## 🎯 Funcionalidades Implementadas

### 1. API de Relatórios (`/api/reports`)

**Arquivo:** `src/app/api/reports/route.ts`

#### Tipos de Relatórios Suportados

1. **`loans`** - Relatório de Empréstimos
   - Inclui: livro, membro, datas, status, renovações
   - Filtros: data, categoria, tipo de membro, status

2. **`books`** - Relatório de Livros
   - Inclui: título, autor, ISBN, categoria, cópias, empréstimos totais
   - Filtros: categoria

3. **`members`** - Relatório de Membros
   - Inclui: dados pessoais, tipo, estatísticas de uso
   - Filtros: tipo, data de cadastro

4. **`fines`** - Relatório de Multas
   - Inclui: membro, valor, motivo, status, livro
   - Filtros: data, tipo de membro, status
   - **Agregações**: total de multas, total pago, total pendente

5. **`reservations`** - Relatório de Reservas
   - Inclui: livro, membro, status, posição na fila, datas
   - Filtros: data, status, tipo de membro

6. **`statistics`** - Estatísticas Gerais (Dashboard)
   - Inclui: resumo geral, top 10 livros, empréstimos por categoria
   - Sem filtros específicos (período opcional)

#### Parâmetros da API

```typescript
GET /api/reports?type={type}&format={format}&startDate={date}&endDate={date}&category={id}&memberType={type}&status={status}
```

**Query Parameters:**

- `type`: loans | books | members | fines | reservations | statistics _(required)_
- `format`: json | csv | pdf _(default: json)_
- `startDate`: ISO date _(opcional)_
- `endDate`: ISO date _(opcional)_
- `category`: Category ID _(opcional)_
- `memberType`: STUDENT | TEACHER | STAFF _(opcional)_
- `status`: ACTIVE | RETURNED | OVERDUE | PENDING | PAID _(opcional)_

#### Autenticação e Autorização

- ✅ Requer autenticação NextAuth
- ✅ Apenas roles: `LIBRARIAN`, `CATALOGER`, `SUPERVISOR`
- ✅ Verifica status `ACTIVE` do utilizador

#### Otimizações Prisma

```typescript
// Uso de select/include para evitar over-fetching
const loans = await prisma.loan.findMany({
  where: {
    /* filtros */
  },
  include: {
    copy: {
      include: {
        book: { include: { category: true } },
      },
    },
    member: {
      select: { id: true, full_name: true, email: true, type: true },
    },
  },
  orderBy: { loanDate: "desc" },
});

// Agregações eficientes
const totalFines = await prisma.fine.aggregate({
  _sum: { amount: true },
});
```

---

### 2. Exportação CSV (Server-Side)

**Biblioteca:** `src/lib/csv-export.ts`

#### Funcionalidades

- ✅ **BOM UTF-8** para compatibilidade Excel
- ✅ **Escape automático** de valores com vírgulas/aspas
- ✅ **Formatação de datas** (DD/MM/YYYY HH:MM) pt-AO
- ✅ **Tradução de status** e tipos de utilizador
- ✅ **Cabeçalhos personalizados** por tipo de relatório

#### Exemplo de Uso (Client-Side)

```typescript
import { downloadCSV, CSVColumn } from "@/lib/csv-export";

const columns: CSVColumn[] = [
  { key: "title", label: "Título" },
  { key: "author", label: "Autor" },
  { key: "totalLoans", label: "Empréstimos", formatter: (v) => String(v) },
];

downloadCSV(data, columns, {
  filename: "relatorio-livros.csv",
  bom: true,
  includeHeaders: true,
});
```

#### Formatadores Incluídos

```typescript
formatCurrency(value: number): string // "5.000,00 Kz"
formatStatus(status: string): string   // "ACTIVE" → "Ativo"
formatUserType(type: string): string   // "STUDENT" → "Estudante"
```

---

### 3. Exportação PDF (Client-Side)

**Biblioteca:** `src/lib/pdf-export.ts`  
**Dependências:** `jspdf`, `jspdf-autotable`

#### Funcionalidades

- ✅ **Cabeçalho profissional** com logo ISPTEC
- ✅ **Tabelas automáticas** com `jspdf-autotable`
- ✅ **Paginação automática** com rodapés
- ✅ **Temas personalizados** (striped, grid)
- ✅ **Orientação configurável** (portrait/landscape)
- ✅ **Número de páginas** automático

#### Funções Principais

```typescript
generateTablePDF(
  data: any[],
  columns: PDFColumn[],
  options: PDFOptions
): void

generateStatisticsPDF(
  statistics: any,
  options: PDFOptions
): void
```

#### Exemplo de PDF Gerado

```
┌─────────────────────────────────────────┐
│            ISPTEC                       │
│      Biblioteca Universitária           │
│   Relatório de Empréstimos              │
│  Gerado em: 04/02/2026 14:30           │
├─────────────────────────────────────────┤
│ Livro    │ Membro    │ Data  │ Status  │
│──────────┼───────────┼───────┼─────────│
│ Dom C... │ João S... │ 01/02 │ Ativo   │
│ Clean... │ Maria P.. │ 03/02 │ Ativo   │
├─────────────────────────────────────────┤
│  Sistema de Gestão de Biblioteca - ISPTEC│
│                            Página 1 de 1 │
└─────────────────────────────────────────┘
```

---

### 4. Página de Relatórios

**Arquivo:** `src/app/(authenticated)/reports/page.tsx`

#### Interface do Utilizador

**Painel Esquerdo - Filtros:**

- ✅ Tipo de relatório (dropdown)
- ✅ Data início/fim (date pickers)
- ✅ Status (dropdown condicional)
- ✅ Tipo de membro (dropdown condicional)
- ✅ Categoria (dropdown - futuro)
- ✅ Botão "Gerar Relatório"

**Painel Direito - Resultados:**

- ✅ Tabela responsiva com dados
- ✅ Limitação de 50 linhas na pré-visualização
- ✅ Botões de exportação (CSV, PDF)
- ✅ Contador de registos
- ✅ Estado vazio com ilustração

#### Componentes Utilizados

```typescript
// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

// Ícones (lucide-react)
<FileSpreadsheet /> // CSV
<FileText />        // PDF
<Filter />          // Filtros
```

#### Fluxo de Uso

1. Utilizador escolhe tipo de relatório
2. Configura filtros opcionais
3. Clica "Gerar Relatório"
4. API retorna JSON com dados
5. Tabela exibe primeiras 50 linhas
6. Botões CSV/PDF ficam ativos
7. Ao clicar CSV: download server-side
8. Ao clicar PDF: geração client-side com jsPDF

---

### 5. Dashboard em Tempo Real

**Arquivo:** `src/app/(authenticated)/dashboard/page.tsx`

#### Métricas Principais (Cards)

1. **Total de Livros** - `BookOpen`
2. **Membros Ativos** - `Users`
3. **Empréstimos Ativos** - `Clock` (+ taxa de ocupação)
4. **Em Atraso** - `AlertTriangle` (variant: destructive)
5. **Reservas Ativas** - `Calendar`
6. **Multas Pendentes** - `DollarSign` (formatado em Kz)
7. **Taxa de Devolução** - `TrendingUp` (calculada)

#### Visualizações

**Top 10 Livros Mais Emprestados:**

- Lista ordenada com ranking visual (círculos numerados)
- Título, autor, categoria
- Número de empréstimos

**Empréstimos por Categoria:**

- Barras de progresso horizontais
- Cores proporcionais ao volume
- Máximo = 100% da barra

**Alertas Contextuais:**

- Card vermelho se `overdueLoans > 0`
- Sugestão de ação (notificações, multas)

#### Skeleton Loading

```typescript
function DashboardSkeleton() {
  return (
    // Skeleton para cards e listas
    <Skeleton className="h-8 w-48 mb-2" />
  )
}
```

#### Auto-Refresh (Futuro)

```typescript
// Adicionar polling a cada 30s
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardStats();
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

---

## 📊 Conformidade com Requisitos (PRD)

### ✅ RF018 - Dashboard em Tempo Real

| Requisito                          | Status | Implementação                         |
| ---------------------------------- | ------ | ------------------------------------- |
| Estatísticas de empréstimos ativos | ✅     | `summary.activeLoans`                 |
| Livros em atraso                   | ✅     | `summary.overdueLoans`                |
| Reservas pendentes                 | ✅     | `summary.activeReservations`          |
| Membros cadastrados e ativos       | ✅     | `summary.totalMembers`                |
| Taxa de ocupação do acervo         | ✅     | Calculada: `activeLoans / totalBooks` |
| Evolução do acervo                 | 🔄     | **Futuro**: Gráfico temporal          |

### ✅ RF019 - Relatórios Personalizados

| Requisito                      | Status | Implementação                       |
| ------------------------------ | ------ | ----------------------------------- |
| Filtros por data               | ✅     | `startDate`, `endDate`              |
| Filtros por categoria          | ✅     | `category` param                    |
| Filtros por curso              | 🔄     | **Futuro**: Adicionar Member.course |
| Filtros por tipo de utilizador | ✅     | `memberType` param                  |
| Exportação PDF                 | ✅     | `jspdf` + `jspdf-autotable`         |
| Exportação Excel               | ✅     | CSV compatível com Excel            |
| Exportação CSV                 | ✅     | Server-side e client-side           |
| Agendamento automático         | 🔄     | **Futuro**: Cron jobs               |
| Obras mais requisitadas        | ✅     | `topBooks` (Artigo 6º)              |
| Histórico de versões           | 🔄     | **Futuro**: Versionamento           |

### ✅ RF020 - Análise de Dados

| Requisito               | Status | Implementação                         |
| ----------------------- | ------ | ------------------------------------- |
| Tendências de uso       | ⚠️     | Básico: `topBooks`                    |
| Previsão de demanda     | ❌     | **Futuro**: ML models                 |
| Análise de sazonalidade | ❌     | **Futuro**: Time-series               |
| Sugestões de aquisição  | ❌     | **Futuro**: Algoritmo baseado em gaps |

**Legenda:**  
✅ Implementado | ⚠️ Parcial | 🔄 Planejado | ❌ Não iniciado

---

## 🧪 Testes Manuais

### 1. Teste de Relatório de Empréstimos

```bash
# Gerar relatório JSON
curl -X GET "http://localhost:3000/api/reports?type=loans" \
  -H "Cookie: next-auth.session-token=..." \
  -o loans.json

# Gerar CSV
curl -X GET "http://localhost:3000/api/reports?type=loans&format=csv" \
  -H "Cookie: next-auth.session-token=..." \
  -o loans.csv

# Gerar com filtros
curl -X GET "http://localhost:3000/api/reports?type=loans&status=OVERDUE&startDate=2026-01-01" \
  -H "Cookie: next-auth.session-token=..." \
  -o loans-overdue.json
```

### 2. Teste de Dashboard

1. Aceder `http://localhost:3000/dashboard`
2. Verificar:
   - ✅ Cards carregam com skeleton
   - ✅ Métricas aparecem após loading
   - ✅ Top 10 livros exibe corretamente
   - ✅ Barras de categoria são proporcionais
   - ✅ Alerta vermelho aparece se há atrasos

### 3. Teste de Exportação PDF

1. Aceder `http://localhost:3000/reports`
2. Escolher "Empréstimos"
3. Clicar "Gerar Relatório"
4. Clicar botão "PDF"
5. Verificar:
   - ✅ Download inicia automaticamente
   - ✅ PDF abre corretamente
   - ✅ Cabeçalho ISPTEC presente
   - ✅ Tabela formatada
   - ✅ Rodapé com número de página

### 4. Teste de Exportação CSV

1. Seguir passos 1-3 do teste PDF
2. Clicar botão "CSV"
3. Abrir no Excel/LibreOffice
4. Verificar:
   - ✅ Caracteres acentuados corretos (BOM UTF-8)
   - ✅ Colunas separadas corretamente
   - ✅ Datas formatadas (DD/MM/YYYY)
   - ✅ Status traduzidos para português

---

## 🔒 Segurança

### Validações Implementadas

```typescript
// 1. Autenticação obrigatória
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

// 2. Autorização por role
const allowedTypes = [
  UserType.LIBRARIAN,
  UserType.CATALOGER,
  UserType.SUPERVISOR,
];
if (!allowedTypes.includes(user.type)) {
  return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
}

// 3. Status ativo obrigatório
if (user.status !== "ACTIVE") {
  return NextResponse.json({ error: "Utilizador inválido" }, { status: 403 });
}

// 4. Validação de parâmetros
const reportType = searchParams.get("type") || "loans";
if (
  ![
    "loans",
    "books",
    "members",
    "fines",
    "reservations",
    "statistics",
  ].includes(reportType)
) {
  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
```

### Logs de Auditoria (Futuro)

```typescript
// Registar quem gerou qual relatório
await prisma.activityLog.create({
  data: {
    userId: user.id,
    action: "GENERATE_REPORT",
    entityType: "Report",
    details: {
      reportType,
      filters: { startDate, endDate, status },
      recordCount: data.total,
    },
  },
});
```

---

## 📈 Performance

### Otimizações Aplicadas

1. **Queries Prisma:**
   - ✅ `select` específico para evitar over-fetching
   - ✅ `include` apenas necessário
   - ✅ `orderBy` com índices

2. **Paginação (API):**

   ```typescript
   // Futuro: adicionar skip/take
   const loans = await prisma.loan.findMany({
     skip: (page - 1) * pageSize,
     take: pageSize,
   });
   ```

3. **Caching (Futuro):**

   ```typescript
   // React Query no cliente
   const { data } = useQuery({
     queryKey: ["reports", filters],
     queryFn: () => fetchReport(filters),
     staleTime: 5 * 60 * 1000, // 5 minutos
   });
   ```

4. **Streaming CSV (Futuro):**
   ```typescript
   // Para relatórios grandes (>10k linhas)
   const stream = new ReadableStream({
     async start(controller) {
       const loans = await prisma.loan.findMany({
         /* ... */
       });
       for (const loan of loans) {
         controller.enqueue(convertToCSVRow(loan));
       }
       controller.close();
     },
   });
   ```

---

## 🐛 Problemas Conhecidos

### 1. PDF de Grandes Relatórios

**Problema:** PDFs com >1000 linhas podem travar o navegador.  
**Solução Temporária:** Limitar pré-visualização a 50 linhas, exportar completo apenas em CSV.  
**Solução Futura:** Gerar PDF server-side com streaming.

### 2. Datas no Safari

**Problema:** `new Date("2026-01-01")` pode falhar no Safari.  
**Solução:** Usar formato `Date.parse()` ou biblioteca `date-fns`.

```typescript
import { parseISO } from "date-fns";
const date = parseISO(dateString);
```

### 3. Faltando Filtro por Curso

**Problema:** Tabela `Member` não tem campo `course`.  
**Solução:** Adicionar migração Prisma:

```prisma
model Member {
  // ...
  course      String?  // Engenharia Informática, Gestão, etc
}
```

---

## 📦 Dependências Adicionadas

```json
{
  "dependencies": {
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.4"
  }
}
```

**Instalação:**

```bash
npm install jspdf jspdf-autotable
```

**Tamanho do bundle:**

- `jspdf`: ~200KB gzipped
- `jspdf-autotable`: ~50KB gzipped

---

## 🚀 Deploy

### Checklist Pré-Deploy

- [x] ✅ Todas as rotas autenticadas
- [x] ✅ Validações de autorização implementadas
- [x] ✅ Testes manuais realizados
- [x] ✅ Erros tratados com try-catch
- [x] ✅ Logs apropriados (console.error)
- [ ] ⚠️ Testes E2E (Playwright) - **Pendente**
- [ ] ⚠️ Documentação OpenAPI - **Pendente**

### Variáveis de Ambiente

Nenhuma nova variável necessária. Usa autenticação existente (NextAuth).

### Build de Produção

```bash
cd 3_Construcao/frontend
npm run build
npm run start
```

**Verificar:**

- ✅ Build sem erros
- ✅ Tipos TypeScript corretos
- ✅ Importações válidas
- ✅ Rotas acessíveis

---

## 📚 Documentação para Utilizadores

### Manual Rápido: Gerar Relatório

1. **Aceder ao Menu:** Dashboard → Relatórios
2. **Escolher Tipo:** Empréstimos, Livros, Membros, etc.
3. **Aplicar Filtros (opcional):**
   - Data início/fim
   - Status (Ativo, Devolvido, Em atraso)
   - Tipo de membro (Estudante, Docente, Funcionário)
4. **Gerar:** Clicar botão "Gerar Relatório"
5. **Exportar:**
   - **CSV:** Para análise no Excel
   - **PDF:** Para impressão/arquivo

### Dicas

- 📊 **Dashboard atualiza automaticamente** ao recarregar
- 📅 **Filtros de data** úteis para relatórios mensais
- 💡 **Estatísticas** mostram tendências sem filtros
- ⚠️ **Alertas em vermelho** indicam ação necessária

---

## 🔄 Próximos Passos (Melhorias Futuras)

### Prioridade Alta

1. **Agendamento de Relatórios**
   - Cron job semanal/mensal
   - Envio automático por email
   - Uso: `node-cron` ou Vercel Cron Jobs

2. **Gráficos Interativos**
   - Biblioteca: `recharts` ou `chart.js`
   - Visualizações: linha temporal, pizza, barras
   - Página: `/reports/analytics`

3. **Exportação Excel (XLSX)**
   - Biblioteca: `exceljs` ou `xlsx`
   - Suporte a múltiplas abas
   - Formatação avançada (cores, negrito)

### Prioridade Média

4. **Histórico de Versões**
   - Tabela `ReportVersion` no Prisma
   - Comparação entre versões
   - Auditoria de mudanças

5. **Filtros Avançados**
   - Múltiplas categorias (array)
   - Curso académico
   - Range de multas (valor mínimo/máximo)

6. **Templates Personalizados**
   - Utilizador salva configurações de filtros
   - Relatórios favoritos
   - Quick actions

### Prioridade Baixa

7. **Machine Learning (RF020)**
   - Previsão de demanda (Python API separada)
   - Análise de sazonalidade (time-series)
   - Sugestões automáticas de aquisição

8. **Relatórios em Tempo Real**
   - WebSockets para updates live
   - Gráficos animados
   - Notificações push

---

## 👥 Créditos

**Implementado por:** Grupo 04 - Engenharia Informática ISPTEC  
**Data:** 04 de Fevereiro de 2026  
**Disciplina:** Engenharia de Software I  
**Docente:** Judson Quissanga Coge Paiva

**Equipa:**

- Carlos Neves Mussagui Tchípia
- Emanuel Carneiro dos Santos
- José Simão Tala
- Líria Djenaba Vilança Bá

---

## 📝 Referências

- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [jsPDF AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [Prisma Aggregations](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Status Final:** ✅ **ISSUE #35 COMPLETA**  
**Branch:** `issue/sgbu-009-reports-export`  
**Pronto para:** Merge para `main` após code review
