# Diagrama de Classes UML - SGBU
## Sistema de Gestão de Biblioteca Universitária do ISPTEC

**Documento:** Diagrama de Classes Completo em UML/XMI  
**Versão:** 2.0  
**Data:** Fevereiro 2026  
**Padrão:** UML 2.1 com Perfil de Banco de Dados  
**Linguagem:** 

---

## 📊 Visão Geral da Arquitetura

O diagrama de classes representa a estrutura completa do Sistema de Gestão de Biblioteca Universitária (SGBU), baseado no schema Prisma e organizado em **9 pacotes principais** contendo **33 classes**, **10 enumerações**, **2 interfaces** e **25+ associações**.

### Arquitetura em Camadas

```
┌─────────────────────────────────────┐
│  Apresentação (Frontend Next.js)    │
├─────────────────────────────────────┤
│  API REST (Next.js App Router)      │
├─────────────────────────────────────┤
│  Serviços de Negócio (Lógica)       │
├─────────────────────────────────────┤
│  Modelo de Domínio (Classes UML)    │◄── Este Diagrama
├─────────────────────────────────────┤
│  Persistência (Prisma ORM)          │
├─────────────────────────────────────┤
│  Banco de Dados PostgreSQL 15+      │
└─────────────────────────────────────┘
```

---

## 📦 Estrutura dos Pacotes

### 1. **Enumerações**
Contém todos os tipos enumerados usados pelo sistema:

| Enumeração | Literais | Uso |
|---|---|---|
| **TipoUsuário** | ESTUDANTE, DOCENTE, FUNCIONÁRIO, BIBLIOTECÁRIO, CATALOGADOR, SUPERVISOR | Classificação de utilizadores |
| **StatusUsuário** | ATIVO, INATIVO, BLOQUEADO, PENDENTE | Controle de acesso |
| **StatusLivro** | DISPONÍVEL, EMPRESTADO, RESERVADO, MANUTENÇÃO, PERDIDO, DANIFICADO | Ciclo de vida do exemplar |
| **StatusEmpréstimo** | ATIVO, DEVOLVIDO, ATRASADO, CANCELADO | Rastreamento de empréstimos |
| **StatusReserva** | ATIVA, DISPONÍVEL, COLETADA, EXPIRADA, CANCELADA | Ciclo de reservas |
| **StatusMulta** | PENDENTE, PAGA, CANCELADA, PERDOADA | Gestão de penalidades |
| **TipoMulta** | DEVOLUÇÃO_ATRASADA, CACIFO_EXCEDIDO, CREDENCIAL_PERDIDA, LIVRO_DANIFICADO, LIVRO_PERDIDO | Classificação de multas |
| **TipoNotificação** | EMAIL, SMS, PUSH, IN_APP | Canais comunicação |
| **StatusNotificação** | PENDENTE, ENVIADA, ENTREGUE, FALHOU, LIDA | Rastreamento de notificações |
| **StatusCatalogação** | RASCUNHO, PENDENTE_REVISÃO, APROVADO, REJEITADO | Workflow de catalogação |
| **StatusCacifo** | DISPONÍVEL, OCUPADO, MANUTENÇÃO | Estado dos cacifos |
| **StatusComputador** | DISPONÍVEL, OCUPADO, MANUTENÇÃO | Estado dos computadores |
| **StatusSolicitação** | PENDENTE, EM_PROGRESSO, CONCLUÍDA, CANCELADA | Solicitações especiais |

### 2. **Interfaces**
Define contratos para implementação:

```
Interface: Identificável
├─ id: String

Interface: ComTimestamp
├─ criadoEm: DataHora
└─ atualizadoEm: DataHora
```

**Implementadores recomendados:** Todas as classes de domínio

---

### 3. **Pacote: Usuários** 👥

#### Classe: Usuário
**Responsabilidades:**
- Representar utilizadores do sistema
- Armazenar credenciais e informações de perfil
- Rastrear bloqueios e multas

**Atributos Principais:**
```typescript
- id: String (CUID)
- email: String (Único)
- senha: String (Hash bcrypt)
- nome: String
- telefone: String (Opcional)
- tipo: TipoUsuário
- status: StatusUsuário
- matrícula: String (Única por tipo)
- curso: String (Para estudantes)
- departamento: String (Para docentes/funcionários)
- codigoQR: String (Credencial digital)
- multasTotal: Decimal (Kz)
- bloqueado: Boolean
- criadoEm: DataHora
- atualizadoEm: DataHora
```

**Relacionamentos:**
- 1:N com Empréstimo (um utilizador, múltiplos empréstimos)
- 1:N com Reserva
- 1:N com Multa
- 1:N com Notificação
- 1:N com DocumentoUsuário
- 1:N com SolicitaçãoEspecial
- 1:N com LogAtividade

#### Classe: DocumentoUsuário
**Responsabilidades:**
- Armazenar documentos de verificação
- Registar verificação de identidade

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK)
- tipoDocumento: String (ID_CARD, STUDENT_CARD, ENROLLMENT, STAFF_CARD)
- urlDocumento: String
- verificado: Boolean
- verificadoEm: DataHora
```

---

### 4. **Pacote: Catálogo** 📚

#### Classe: Livro
**Responsabilidades:**
- Representar títulos únicos
- Gerenciar metadados bibliográficos
- Rastrear disponibilidade

**Atributos Principais:**
```typescript
- id: String
- isbn: String (Único)
- título: String
- subtítulo: String
- edição: String
- anoPublicação: Int
- páginas: Int
- descrição: String
- urlCapa: String
- idCategoria: String (FK)
- totalCópias: Int
- cópiasDisponíveis: Int
- palavrasChave: String[]
- extraídoPorOCR: Boolean
- confiançaOCR: Decimal
```

**Relacionamentos:**
- 1:1 com Categoria
- 1:1 com Editora (opcional)
- 1:N com Exemplar (cópias físicas)
- N:M com Autor (via LivroAutor)
- 1:N com Reserva
- 1:N com RecomendaçãoLivro
- 1:N com AvaliaçãoLivro

#### Classe: Exemplar
**Responsabilidades:**
- Representar cópias físicas
- Rastrear localização e condição

**Atributos:**
```typescript
- id: String
- idLivro: String (FK)
- códigoBarras: String (Único)
- tagRFID: String (Opcional)
- status: StatusLivro
- condição: String (EXCELENTE, BOM, RAZOÁVEL, POBRE)
- localização: String
- notações: String
- dataAquisição: Data
- preçoAquisição: Decimal
```

#### Classe: Categoria
**Responsabilidades:**
- Organizar livros hierarquicamente
- Facilitar navegação

**Atributos:**
```typescript
- id: String
- nome: String (Único)
- descrição: String
- idPai: String (Auto-relacionamento para hierarquia)
```

#### Classe: Autor
**Responsabilidades:**
- Armazenar informações de autores

**Atributos:**
```typescript
- id: String
- nome: String
- biografia: String
- dataNascimento: Data
- nacionalidade: String
```

#### Classe: Editora
**Responsabilidades:**
- Registar informações de publicadores

**Atributos:**
```typescript
- id: String
- nome: String (Único)
- país: String
- website: String
```

#### Classe: EntradaCatálogo
**Responsabilidades:**
- Gerenciar workflow de catalogação
- Integração com OCR e IA

**Atributos:**
```typescript
- id: String
- títuloExtraído: String
- autorExtraído: String
- isbnExtraído: String
- editoitExtraído: String
- anoExtraído: Int
- urlImagem: String
- dadosEnriquecidos: Json
- status: StatusCatálogo
- idCatalogador: String (FK)
- idSupervisor: String (FK)
- notasRevisão: String
- motivoRejeição: String
```

---

### 5. **Pacote: Empréstimos** 📖

#### Classe: Empréstimo
**Responsabilidades:**
- Registar transações de empréstimo
- Controlar prazos e renovações
- Calcular atrasos

**Atributos Principais (Artigo 10º):**
```typescript
- id: String
- idExemplar: String (FK)
- idUsuário: String (FK)
- status: StatusEmpréstimo
- dataPedido: DataHora
- dataVencimento: Data (Tipo: 5 dias estudantes, 15 docentes)
- dataDevolução: Data
- contagemRenovações: Int (Máximo: 2)
- máximoRenovações: Int
- valorMulta: Decimal
- diasAtrasado: Int
```

**Regras de Negócio (Artigo 10º):**
- Estudantes: Máx 2 livros, 5 dias
- Docentes: Máx 4 livros, 15 dias
- Renovação: Máximo 2 vezes (7 dias cada)
- Validações:
  - Sem multas pendentes
  - Sem reservas ativas
  - Respeitar limite por tipo

#### Classe: Reserva
**Responsabilidades:**
- Gerenciar fila FIFO
- Notificar disponibilidade

**Atributos:**
```typescript
- id: String
- idLivro: String (FK)
- idUsuário: String (FK)
- status: StatusReserva
- dataReserva: DataHora
- dataDisponível: DataHora
- dataExpiração: DataHora (48h após disponível)
- dataColeta: DataHora
- posiçãoFila: Int
- notificadaEm: DataHora
```

#### Classe: EmpréstimoCentral
**Responsabilidades:**
- Registar empréstimos de múltiplos livros para aulas

**Atributos:**
```typescript
- id: String
- idDocente: String (FK)
- curso: String
- turma: String
- dataEmpréstimo: DataHora
- dataDevolução: DataHora
- dataEsperada: DataHora (Fim da aula)
- idLivros: String[] (Array)
- quantidades: Int[] (Correspondentes)
```

---

### 6. **Pacote: Multas** 💰

#### Classe: Multa
**Responsabilidades:**
- Registar penalidades
- Rastrear pagamentos

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK)
- idEmpréstimo: String (FK, Opcional)
- tipo: TipoMulta
- valor: Decimal (Kz)
- status: StatusMulta
- motivo: String
- geradaEm: DataHora
- pagaEm: DataHora
- métodoPagamento: String
- referênciaPagamento: String
- perdoada_em: DataHora
- perdoada_por: String
- motivoPerdão: String
```

**Tabela de Valores (Configurável via SystemConfiguration):**
- Devolução atrasada: 50 Kz/dia
- Cacifo excedido: Valor/hora
- Credencial perdida: 2.000 Kz
- Livro danificado: Valor do livro * 50%
- Livro perdido: Valor do livro * 100%

---

### 7. **Pacote: Notificações** 📢

#### Classe: Notificação
**Responsabilidades:**
- Multi-canal (Email, SMS, Push, In-App)
- Rastrear estado de entrega

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK)
- tipo: TipoNotificação
- status: StatusNotificação
- título: String
- mensagem: String
- idEmpréstimo: String (FK, Opcional)
- idReserva: String (FK, Opcional)
- enviadaEm: DataHora
- entregueEm: DataHora
- lidaEm: DataHora
- metadata: Json
```

**Cenários de Notificação:**
1. Renovação automática confirmada
2. Livro disponível para reserva
3. Atraso detectado (48h antes vencimento)
4. Multa gerada
5. Reserva expirada
6. Credencial próxima expiração

---

### 8. **Pacote: Serviços** 🛠️

#### Classe: AluguelCacifo
**Responsabilidades:**
- Registar aluguel de cacifos
- Calcular taxas de excesso

**Atributos:**
```typescript
- id: String
- idCacifo: String (FK)
- idUsuário: String (FK)
- horaInício: DataHora
- horaFim: DataHora
- horaEsperada: DataHora (3h após início)
- minutosExcesso: Int
- valorMulta: Decimal
```

#### Classe: Cacifo
**Responsabilidades:**
- Gerenciar recurso de armazenamento

**Atributos:**
```typescript
- id: String
- número: String (Único)
- localização: String
- status: StatusCacifo
```

#### Classe: SessãoComputador
**Responsabilidades:**
- Registar uso de laboratório

**Atributos:**
```typescript
- id: String
- idComputador: String (FK)
- idUsuário: String (FK)
- horaInício: DataHora
- horaFim: DataHora
- horaEsperada: DataHora (2h após início)
- contagemRenovações: Int (Máximo: 1)
- máximoRenovações: Int
```

#### Classe: Computador
**Responsabilidades:**
- Registar máquinas disponíveis

**Atributos:**
```typescript
- id: String
- número: String (Único)
- localização: String (Lab 1, Lab 2, etc)
- status: StatusComputador
- especificações: Json
```

#### Classe: SolicitaçãoEspecial
**Responsabilidades:**
- Registar pedidos (Bibliografia, Catalogação, Formação)

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK)
- tipo: String (BIBLIOGRAFIA, CATALOGAÇÃO, FORMAÇÃO)
- título: String
- descrição: String
- status: StatusSolicitação
- solicitadoEm: DataHora
- concluidoEm: DataHora
- resposta: String
- respostaDadaEm: DataHora
- dataAgendada: DataHora (Para formações)
```

---

### 9. **Pacote: IA** 🤖

#### Classe: RecomendaçãoLivro
**Responsabilidades:**
- Armazenar recomendações personalizadas

**Atributos:**
```typescript
- id: String
- idLivro: String (FK)
- livrosRecomendados: String[] (Array de IDs)
- algoritmo: String (COLABORATIVO, BASEADO_CONTEÚDO, HÍBRIDO)
- confiança: Decimal (0-100%)
```

**Algoritmos Implementados:**
1. **Colaborativo:** Matriz de similaridade usuário-livro
2. **Baseado em Conteúdo:** Palavras-chave, categoria, autor
3. **Híbrido:** Combinação ponderada dos dois

#### Classe: MensagemChat
**Responsabilidades:**
- Registar interações com chatbot IA

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK, Opcional - mensagens do bot: null)
- idSessão: String
- mensagem: String
- éBot: Boolean
- intenção: String (Detectada por NLP)
- confiança: Decimal
- metadata: Json
```

**Capacidades do Chatbot:**
- Informações sobre disponibilidade
- Renovação de empréstimos
- Fila de reservas
- FAQ regulamento
- Suporte em português angolano

#### Classe: AvaliaçãoLivro
**Responsabilidades:**
- Coletar feedback e resenhas

**Atributos:**
```typescript
- id: String
- idLivro: String (FK)
- idUsuário: String (FK)
- avaliação: Inteiro (1-5 estrelas)
- comentário: String
- éLeiturVerificada: Boolean (Se emprestou)
- contagemÚtil: Int
```

---

### 10. **Pacote: Relatórios & Auditoria** 📊

#### Classe: Relatório
**Responsabilidades:**
- Exportar dados em múltiplos formatos
- Agendamento cron

**Atributos:**
```typescript
- id: String
- nome: String
- tipo: String (EMPRÉSTIMOS, ATRASADOS, LIVROS_POPULARES, ATIVIDADE_USUÁRIO)
- filtros: Json
- geradoPor: String (ID utilizador)
- geradoEm: DataHora
- urlArquivo: String
- formato: String (PDF, EXCEL, CSV)
- agendado: Boolean
- scheduleExpressão: String (Cron)
```

#### Classe: MétricasSistema
**Responsabilidades:**
- Dashboard analytics diário

**Atributos:**
```typescript
- id: String
- data: Data (Unique)
- totalEmpréstimos: Int
- totalDevoluções: Int
- totalReservas: Int
- novosCatalogos: Int
- principaisAtrasados: Int
- finesColetadas: Decimal
- usoCacifos: Int
- usoComputadores: Int
```

#### Classe: LogAtividade
**Responsabilidades:**
- Auditoria completa do sistema

**Atributos:**
```typescript
- id: String
- idUsuário: String (FK, Opcional)
- ação: String (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
- entidade: String (LIVRO, EMPRÉSTIMO, USUÁRIO, RESERVA)
- idEntidade: String
- descrição: String
- endereçoIP: String
- userAgent: String
- metadata: Json
- criadoEm: DataHora
```

#### Classe: ConfiguraçãoSistema
**Responsabilidades:**
- Parametrização dinâmica

**Atributos:**
```typescript
- id: String
- chave: String (Única)
- valor: String
- descrição: String
```

**Chaves Padrão:**
```
STUDENT_LOAN_DAYS=5
TEACHER_LOAN_DAYS=15
STUDENT_MAX_BOOKS=2
TEACHER_MAX_BOOKS=4
MAX_RENEWALS=2
RESERVATION_COLLECTION_HOURS=48
LOCKER_DURATION_HOURS=3
COMPUTER_SESSION_HOURS=2
FINE_PER_DAY=50
LOCKER_FINE_PER_MINUTE=1
```

---

## 🔗 Associações Principais

### Cardinalidades

| De | Para | Tipo | Cardinalidade | Significado |
|---|---|---|---|---|
| Usuário | Empréstimo | Composição | 1 : N | Um utilizador, múltiplos empréstimos |
| Livro | Exemplar | Agregação | 1 : N | Um título tem várias cópias |
| Exemplar | Empréstimo | Associação | 1 : N | Uma cópia passa por vários empréstimos |
| Livro | Autor | N : M | via LivroAutor | Múltiplos autores por livro |
| Categoria | Categoria | Self | 1 : N | Hierarquia (pai-filho) |
| Usuário | Multa | Composição | 1 : N | Um utilizador tem várias multas |
| Livro | Reserva | Associação | 1 : N | Um livro possui múltiplas reservas |
| Cacifo | AluguelCacifo | Composição | 1 : N | Um cacifo vários aluguéis |
| Computador | SessãoComputador | Composição | 1 : N | Um computador várias sessões |

---

## 📋 Conformidade com Regulamento ISPTEC

Este diagrama implementa completamente:

- **Artigo 10º** - Limites de empréstimo por tipo
- **Artigo 15º** - Renovação com validações
- **Artigo 20º** - Multas e penalidades
- **Artigo 25º** - FIFO de reservas
- **Artigo 30º** - Credenciais digitais
- **Artigo 35º** - Bloqueio de utilizadores

---

## 🔍 Padrões de Design Utilizados

### 1. **Aggregate Root** 
Classes como `Livro`, `Usuário`, `Empréstimo` funcionam como raízes de agregados

### 2. **Value Objects**
Enumerações (`StatusEmpréstimo`, `TipoMulta`, etc) como objetos imutáveis

### 3. **Entity Relationship**
Tabelas de junção (`LivroAutor`) para N:M

### 4. **Soft Delete**
Campo `dataDeleção` para auditoria (não implementado no XMI, mas recomendado)

### 5. **Temporal Pattern**
Todos os agregados possuem `criadoEm` e `atualizadoEm`

---

## 💾 Como Importar no Visual Paradigm

### Passo 1: Preparar o Arquivo
- Arquivo de entrada: `diagrama-classes-pt-BR.xmi`
- Codificação: UTF-8
- Versão: UML 2.1

### Passo 2: Importar
**Em Visual Paradigm 2.0:**
1. Menu: `File` → `Open` ou `File` → `Import`
2. Selecionar arquivo `.xmi`
3. Escolher: "UML 2.1" como padrão
4. Permitir sobreposição automática

### Passo 3: Personalizar Layout
1. Acionar ferramenta de auto-layout
2. Distribuir pacotes horizontalmente
3. Ajustar tamanhos de fontes

### Passo 4: Gerar Documentação
1. Menu: `Tools` → `Documentation` → `Generate`
2. Selecionar formato: HTML, PDF, Word
3. Incluir: Diagrama, Classes, Associações

---

## 📐 Métricas da Arquitetura

- **Total de Classes:** 33
- **Total de Enumerações:** 12
- **Total de Interfaces:** 2
- **Total de Associações:** 25+
- **Pacotes:** 10
- **Profundidade Máxima de Herança:** 0 (não usada)
- **Índice de Acoplamento:** Baixo (coesão alta)

---

## 🔐 Considerações de Segurança

### Campos Sensíveis
- `Usuário.senha` - Hash bcrypt nunca em texto
- `Usuário.codigoQR` - Geração e validação no backend
- `ActivityLog.endereçoIP` - LGPD compliant
- `DocumentoUsuário.urlDocumento` - Sem acesso direto

### Validações de Banco
- Constraints de unique em: email, matrícula, isbn, código de barras
- Foreign keys com cascata de delete onde apropriado
- Índices em campos frequentemente queryados

---

## 🚀 Próximas Etapas

1. ✅ Diagrama de classes UML criado
2. ⬜ Gerar documentação técnica completa
3. ⬜ Criar diagramas de sequência para casos de uso críticos
4. ⬜ Mapear para banco de dados (Forward Engineering)
5. ⬜ Implementar validações em TypeScript
6. ⬜ Gerar API documentation (Swagger/OpenAPI)

---

## 📞 Informações de Contacto

**Sistema de Gestão de Biblioteca Universitária**  
Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)  
Luanda, Angola

**Disciplina:** Engenharia de Software I  
**Docente:** Judson Quissanga Coge Paivas  
**Grupo 04:**
- Carlos Neves Mussagui Tchípia
- Emanuel Carneiro dos Santos
- José Simão Tala
- Líria Djenaba Vilança Bá

---

**Última Atualização:** Fevereiro 2026  
**Status:** Completo e Pronto para Importação
