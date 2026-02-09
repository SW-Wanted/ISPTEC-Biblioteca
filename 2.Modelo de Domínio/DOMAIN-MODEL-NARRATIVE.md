# Narrativa do Modelo de Domínio - SGBU

**Sistema de Gestão de Biblioteca Universitária - ISPTEC**

---

## 1. Introdução

O Sistema de Gestão de Biblioteca Universitária (SGBU) moderniza e digitaliza completamente os processos da Biblioteca do ISPTEC. Este documento descreve as principais entidades do modelo de negócio e suas interações, baseado nas operações diárias da biblioteca e seus requisitos de negócio.

---

## 2. Entidades Principais

### 2.1 Utilizador

A entidade **Utilizador** representa qualquer pessoa que interage com o sistema (estudantes, professores, funcionários ou administradores).

**Características principais:**
- Cada utilizador possui um identificador único (ID) e credenciais de autenticação (email e palavra-passe)
- Tem um tipo específico que determina seus privilégios e limites de empréstimo (STUDENT, TEACHER, STAFF, ADMIN)
- Mantém um histórico de multas e pode ser bloqueado mediante infrações
- É identificado fisicamente através de um código QR único para operações rápidas na biblioteca
- Seu estado pode ser ACTIVE, INACTIVE ou BLOCKED

**Regra de negócio crítica:**
Os limites de empréstimo variam por tipo de utilizador. Um **Estudante** pode levantar no máximo 2 livros com prazo de 5 dias, enquanto um **Professor** pode levantar 4 livros com prazo de 15 dias.

---

### 2.2 Livro

A entidade **Livro** representa a descrição bibliográfica de uma obra na biblioteca.

**Características principais:**
- Identificado por ISBN único (quando disponível) e um ID interno
- Contém metadados completos: título, subtítulo, edição, ano de publicação, idioma, número de páginas
- Associa-se a uma **Categoria** (Ficção, não-ficção, Engenharia, etc.)
- Relaciona-se com **Autores** (múltiplos) e uma **Editora**
- Mantém contadores de cópias totais e disponíveis para controle de inventário
- Pode ser extraído de processos OCR para catalogação assistida por IA

**Exemplo prático:**
"Análise de Sistemas de Informação" de João Silva, publicado em 2020 pela Editora Técnica, categorizado como Engenharia de Software, com 3 cópias no acervo (2 disponíveis, 1 emprestada).

---

### 2.3 Cópia

A entidade **Cópia** representa cada exemplar físico de um Livro na biblioteca.

**Características principais:**
- Cada cópia é uma instância individual de um Livro com identificador único
- Tem um código de barras para identificação rápida e uma etiqueta RFID para rastreamento automatizado
- Possui um estado (AVAILABLE, LOANED, RESERVED, DAMAGED, LOST)
- Localiza-se fisicamente numa secção específica da biblioteca
- Regista a data de aquisição e o preço de compra

**Relação com Livro:**
Uma composição obrigatória — uma Cópia pertence sempre a exatamente um Livro, mas um Livro pode ter múltiplas Cópias.

---

### 2.4 Empréstimo

A entidade **Empréstimo** registra a transação de um Utilizador levantando uma Cópia de Livro.

**Características principais:**
- Identifica a Cópia específica e o Utilizador envolvido
- Registra as datas-chave: data de empréstimo, data de vencimento, data de devolução (se concluído)
- Permite renovações limitadas (máximo 2) se não houver reservas pendentes
- Calcula automaticamente multas por atraso
- Estados: ACTIVE (empréstimo em curso), RETURNED (concluído), OVERDUE (vencido)

**Exemplo prático:**
João (Estudante) levanta "Análise de Sistemas" em 5 de Janeiro, com vencimento em 10 de Janeiro. Se devolver a 12 de Janeiro, terá 2 dias de atraso e uma multa será gerada automaticamente.

---

### 2.5 Reserva

A entidade **Reserva** implementa um sistema FIFO (Primeiro a Entrar, Primeiro a Sair) para Livros indisponíveis.

**Características principais:**
- Um Utilizador reserva um Livro quando todas as cópias estão emprestadas
- Possuem uma posição na fila (queuePosition) que determina a ordem de notificação
- Quando uma cópia fica disponível, o utilizador no topo da fila é notificado automaticamente
- Tem um período de 48 horas para levantar a cópia reservada antes de expirar
- Estados: ACTIVE (à espera), AVAILABLE (notificado, pronto para levantar), EXPIRED (expirou), COLLECTED (levantado)

**Regra de negócio importante:**
Uma reserva activa impede que um empréstimo seja renovado. Isto garante equidade — ninguém espera indefinidamente enquanto livros são continuamente renovados.

---

### 2.6 Multa

A entidade **Multa** registra infrações de utilizadores (atrasos, danos, perdas).

**Características principais:**
- Gerada automaticamente por atrasos em devoluções (50 Kz por dia de atraso)
- Pode também ser criada manualmente por dano a material ou perda de Cópia
- Tem um estado: PENDING (não paga), PAID (paga), WAIVED (perdoada por administrador)
- Está associada a um Utilizador e opcionalmente a um Empréstimo específico
- Uma multa não paga bloqueia renovações e novas reservas

**Impacto:**
Se um Utilizador acumula 500 Kz em multas, é automaticamente bloqueado do sistema até regularizar.

---

### 2.7 Notificação

A entidade **Notificação** gerencia comunicações com Utilizadores.

**Características principais:**
- Enviada automaticamente em eventos:
  - Livro reservado fica disponível → Notificação ARRIVAL
  - Empréstimo vence hoje → Notificação DUE_SOON
  - Empréstimo venceu → Notificação OVERDUE
  - Multa gerada → Notificação FINE_GENERATED
- Prefere o canal escolhido pelo Utilizador: EMAIL, SMS, IN_APP
- Estados: PENDING (não enviada), SENT (enviada), DELIVERED (entregue), READ (lida pelo utilizador)

---

### 2.8 Categoria

A entidade **Categoria** organiza Livros em grupos temáticos.

**Características principais:**
- Estrutura hierárquica (uma Categoria pode ter um Pai, criando subcategorias)
- Exemplos: Engenharia > Engenharia de Software > UML
- Facilita navegação, recomendações baseadas em histórico e estatísticas por temática

---

### 2.9 Autor e Editora

Entidades de suporte que enriquecem os dados bibliográficos.

**Autor:**
- Nome, biografia, data de nascimento, nacionalidade
- Relaciona-se com múltiplos Livros numa relação muitos-para-muitos

**Editora:**
- Nome, país de origem, website
- Um Livro pode ter uma Editora (relacionamento opcional muitos-para-um)

---

## 3. Fluxos de Negócio Principais

### 3.1 Empréstimo de Livro

1. Utilizador escaneia código QR para autenticar-se
2. Seleciona um Livro e uma Cópia disponível
3. Sistema verifica:
   - Utilizador não está bloqueado
   - Utilizador não ultrapassou seu limite de empréstimos
   - Multas pendentes são menores que seu limite de crédito
4. Empréstimo é criado com data de vencimento (5 dias para Estudantes, 15 para Professores)
5. Cópia passa a estado LOANED
6. Utilizador recebe confirmação (SMS/Email opcional)

---

### 3.2 Renovação de Empréstimo

1. Utilizador requer renovação no portal
2. Sistema valida:
   - Empréstimo ainda está ACTIVE (não venceu muito)
   - Renovação < 2 vezes (limite de renovações)
   - NÃO existem Reservas activas para o Livro
   - Utilizador não tem multas bloqueantes
3. Se válida: Data de vencimento estende-se por + 5 ou 15 dias
4. Notificação confirmando renovação é enviada

---

### 3.3 Devolução e Multa Automática

1. Utilizador devolve Cópia fisicamente na biblioteca
2. Funcionário escaneia código de barras
3. Sistema calcula dias de atraso
4. Se atrasado: Multa é gerada automaticamente (50 Kz × dias_atraso)
5. Cópia passa a AVAILABLE
6. Se existem Reservas activas para o Livro, primeira (fifo) é notificada

---

### 3.4 Reserva e Notificação

1. Utilizador reserva Livro (todas as cópias em estado LOANED)
2. Reserva criada com posição na fila = (número de reservas activas + 1)
3. Sistema notifica (estado: PENDING)
4. Quando uma Cópia é devolvida, sistema:
   - Identifica primeira Reserva em fila
   - Muda estado para AVAILABLE
   - Envia notificação (EMAIL/SMS) ao utilizador
   - Define prazo de 48h para levantamento
5. Se utilizador não levanta em 48h, Reserva expira e próxima é notificada

---

## 4. Regras de Negócio Críticas (Síntese)

| Regra | Descrição |
|-------|-----------|
| **Limite de Empréstimo** | STUDENT: 2 livros/5 dias; TEACHER: 4 livros/15 dias |
| **Renovação** | Máx. 2 vezes se sem Reservas activas e sem multas bloqueantes |
| **Multa de Atraso** | 50 Kz por dia de atraso |
| **Bloqueio** | Utilizador bloqueado se multas ≥ 500 Kz |
| **Fila de Reserva** | FIFO: primeira em fila notificada quando Cópia fica disponível |
| **Prazo de Levantamento** | 48 horas após notificação de disponibilidade |
| **Impedir Renovação** | Se existem Reservas activas para o Livro, renovação não é permitida |
| **Notificação Automática** | Eventos-chave geram notificações conforme preferência: EMAIL/SMS/IN_APP |

---

## 6. Relacionamentos Principais

```
Utilizador
  ├─ 1:N → Empréstimo
  ├─ 1:N → Reserva
  ├─ 1:N → Multa
  └─ 1:N → Notificação

Livro
  ├─ 1:N → Cópia (composição)
  ├─ 1:N → Reserva
  ├─ N:N → Autor
  └─ N:1 → Editora
         └─ 1:N → Categoria

Cópia
  ├─ N:1 → Livro
  └─ 1:N → Empréstimo

Empréstimo
  ├─ N:1 → Utilizador
  ├─ N:1 → Cópia
  └─ 1:N → Multa

Reserva
  ├─ N:1 → Utilizador
  ├─ N:1 → Livro
  └─ ordenada por: queuePosition (FIFO)
```

---

## 7. Conclusão

O modelo de domínio do SGBU é construído sobre o pilar de **equidade e automatização**. As entidades principais (Utilizador, Livro, Cópia, Empréstimo, Reserva, Multa) interagem de forma harmoniosa para garantir:

- **Acesso justo** através de reservas FIFO
- **Conformidade regulatória** com acompanhamento automático de multas e bloqueios
- **Experiência digital** com notificações automáticas em múltiplos canais
- **Eficiência operacional** through barcode/RFID scanning and data synchronization

Este modelo suporta não apenas o empréstimo básico de livros, mas toda a gama de serviços modernos que uma biblioteca universitária oferece — desde formações até gestão de espaços compartilhados.

---

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Autor:** Grupo 04 - ISPTEC  
**Disciplina:** Engenharia de Software I
