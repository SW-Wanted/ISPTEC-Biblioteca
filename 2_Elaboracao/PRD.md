# Product Requirements Document (PRD)
## Sistema de Gestão de Biblioteca Universitária - ISPTEC

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Resumo Executivo
O Sistema de Gestão de Biblioteca Universitária (SGBU) é uma solução digital completa desenvolvida para modernizar e automatizar os processos da Biblioteca do ISPTEC. O sistema visa substituir processos semi-manuais por fluxos digitais eficientes, integrando tecnologias de Inteligência Artificial para melhorar a experiência dos utilizadores e a eficiência operacional.

### 1.2 Objetivos do Produto
- Digitalizar completamente os processos da biblioteca (catalogação, empréstimos, devoluções, reservas)
- Reduzir tempo de atendimento em pelo menos 60% através de automação
- Eliminar filas físicas permitindo operações online
- Melhorar a experiência do utilizador com recursos de IA (OCR, recomendações, chatbot)
- Fornecer relatórios em tempo real para tomada de decisão
- Garantir conformidade total com o Regulamento da Biblioteca do ISPTEC

### 1.3 Público-Alvo

**Utilizadores Primários:**
- Estudantes do ISPTEC (acesso a empréstimos, renovações, reservas)
- Docentes do ISPTEC (acesso prioritário com prazos estendidos)
- Funcionários do ISPTEC (acesso aos serviços da biblioteca)

**Utilizadores Administrativos:**
- Bibliotecários/Funcionários da Biblioteca (gestão operacional diária)
- Bibliotecário Supervisor (aprovações, revisões, gestão estratégica)
- Catalogadores (registro e organização do acervo)

---

## 2. CONTEXTO E PROBLEMAS ATUAIS

### 2.1 Situação Atual (AS IS)
A Biblioteca do ISPTEC opera com processos semi-manuais que apresentam:

**Problemas Identificados:**
- **Catalogação:** Preenchimento manual do formulário USMARC propenso a erros; dependência crítica do Bibliotecário Supervisor para aprovação cria gargalo
- **Cadastro de Membros:** Processo totalmente presencial; exposição de senhas durante cadastro (risco de segurança); verificação manual de documentos físicos
- **Empréstimos:** Processamento manual causa filas em horários de pico; registros físicos sujeitos a extravio
- **Renovações:** Dependência total de presença física; baixa autonomia do utilizador; falta de notificações automáticas
- **Reservas:** Notificações por email pouco confiáveis (spam); prazo de levantamento rígido; processo lento
- **Relatórios:** Tempo de resposta elevado; relatórios pré-configurados limitados; dificuldade em auditorias

### 2.2 Horário de Funcionamento
- Segunda a Sexta-feira: 07:30 - 17:00
- Sábados (época de provas): 08:00 - 12:30

---

## 3. REQUISITOS FUNCIONAIS

### 3.1 Módulo de Cadastro de Membros

**RF001 - Cadastro Online de Membros**
- O sistema deve permitir cadastro online via portal web/app
- Deve integrar com a Secretaria Académica para validação automática de matrículas
- Deve gerar credencial digital em formato QR Code
- Deve enviar notificação automática (email/SMS) confirmando cadastro
- Deve permitir upload de documentos (cartão de estudante, ficha de matrícula, cartão de colaborador)

**RF002 - Gestão de Perfis de Utilizador**
- Tipos de perfil: Estudante, Docente, Funcionário, Bibliotecário, Catalogador, Supervisor
- Cada perfil deve ter permissões e limites específicos conforme regulamento

**RF003 - Recuperação de Senha**
- Sistema de recuperação de senha via email
- Registo de multa conforme tabela (Artigo 2º) em caso de perda de credencial física

### 3.2 Módulo de Catalogação de Obras

**RF004 - Registro Inteligente com OCR**
- Captura de fotografias (capa e folha de rosto) via mobile
- Extração automática via OCR: título, autor, ISBN, editora, ano de publicação
- Integração com APIs externas (Google Books, ISBN.org) para enriquecimento de metadados
- Sugestão automática de categorias baseada em palavras-chave

**RF005 - Validação e Catalogação**
- Verificação automática de ISBN duplicado
- Preenchimento automático do formulário padrão USMARC
- Sistema de aprovação workflow (Catalogador → Supervisor)
- Geração automática de número de controle
- Vinculação de exemplar físico à localização na biblioteca

**RF006 - Classificação Automática**
- IA para classificação automática de categorias baseada em:
  - Palavras-chave do título
  - Resumo/sinopse
  - Metadados externos
  - Histórico de classificações similares

### 3.3 Módulo de Empréstimos

**RF007 - Reserva e Empréstimo Online**
- Consulta de disponibilidade em tempo real
- Reserva digital com comprovante eletrônico
- Prazo de retirada definido pelo sistema
- Notificações automáticas (confirmação, lembretes)

**RF008 - Limites por Tipo de Utilizador (Artigo 10º)**

**Docentes:**
- Livros: 15 dias - 4 exemplares (1 obra por título)
- Livros de cedência por dia: 1 dia - 1 exemplar
- CD/DVD: 2 dias úteis - 1 unidade

**Estudantes:**
- Livros: 5 dias - 2 exemplares (títulos não repetidos)
- Livros de cedência por dia: 1 dia - 1 exemplar
- CD-ROM/DVD: 2 dias úteis - 1 unidade

**RF009 - Registro de Empréstimo**
- Leitura digital via código de barras ou RFID
- Registro automático de empréstimo no sistema
- Definição automática de prazo de devolução
- Geração de comprovante digital

**RF010 - Alertas de Prazo**
- Notificação 2 dias antes do vencimento
- Notificação no dia do vencimento
- Notificação em caso de atraso

### 3.4 Módulo de Devolução

**RF011 - Registro de Devolução**
- Registro rápido via leitura digital
- Verificação automática de prazo
- Cálculo automático de multas em caso de atraso
- Integração com setor financeiro para cobranças

**RF012 - Controle de Estado do Livro**
- Verificação de condições físicas do exemplar
- Registro de danos ou observações
- Atualização imediata de disponibilidade no sistema

### 3.5 Módulo de Renovação

**RF013 - Renovação Online (Artigo 15º)**
- Acesso via portal "Meus Empréstimos"
- Renovação automática até 2 vezes (se não houver reservas)
- Verificação automática de:
  - Existência de reservas pendentes
  - Limite de renovações atingido
  - Situação de dívidas/multas do utilizador
- Cálculo automático de nova data de devolução
- Notificação instantânea de confirmação ou recusa

**RF014 - Restrições de Renovação**
- Bloqueio automático se material estiver reservado
- Bloqueio se utilizador estiver com multas pendentes
- Bloqueio se limite de 2 renovações foi atingido

### 3.6 Módulo de Reservas

**RF015 - Sistema de Fila de Espera**
- Reserva online de livros indisponíveis
- Fila automática (FIFO - First In, First Out)
- Notificação multicanal quando livro disponível:
  - Email
  - SMS
  - Notificação push (app)
  - Notificação no portal
- Prazo de 48h para levantamento
- Liberação automática se não levantado no prazo

**RF016 - Gestão de Reservas**
- Visualização da posição na fila
- Cancelamento de reserva pelo utilizador
- Histórico de reservas
- Priorização conforme regulamento (se aplicável)

### 3.7 Módulo de Requisição para Sala de Aula (Artigo 14º)

**RF017 - Empréstimo Coletivo**
- Requisição exclusiva por docentes
- Quantidade superior aos limites normais
- Devolução obrigatória ao final da aula
- Registro de responsabilidade do docente
- Controle de integridade do lote emprestado

### 3.8 Módulo de Relatórios

**RF018 - Dashboard em Tempo Real**
- Estatísticas de empréstimos ativos
- Livros em atraso
- Reservas pendentes
- Membros cadastrados e ativos
- Taxa de ocupação do acervo
- Evolução do acervo (novos cadastros)

**RF019 - Relatórios Personalizados**
- Filtros por: data, categoria, curso, tipo de utilizador
- Exportação em PDF, Excel, CSV
- Agendamento de relatórios automáticos
- Relatórios de obras mais requisitadas (Artigo 6º)
- Histórico de versões para auditoria

**RF020 - Análise de Dados**
- Identificação de tendências de uso
- Previsão de demanda por categoria
- Análise de sazonalidade
- Sugestões de aquisição baseadas em dados

### 3.9 Módulo de Guarda-Volumes (Artigo 5º)

**RF021 - Gestão de Cacifos**
- Sistema de reserva de cacifos
- Duração: 3h renováveis
- Cálculo automático de multa por atraso (cada hora)
- Controle de fichas de cacifos
- Notificação de liberação obrigatória

### 3.10 Módulo de Laboratório de Informática (Artigo 17º)

**RF022 - Reserva de Computadores**
- Reserva de horário via sistema
- Registro de presença obrigatório no balcão
- Sessão de 2h por utilizador
- Renovação automática de mais 2h (se não houver fila)
- Controle de uso conforme política:
  - Bloqueio de Facebook
  - Bloqueio de downloads de entretenimento
  - Obrigatoriedade de auriculares para vídeo-aulas

### 3.11 Módulo de Serviços Especiais (Artigo 16º)

**RF023 - Levantamento Bibliográfico**
- Solicitação online
- Resposta por email em até 5 dias úteis
- Acompanhamento de status

**RF024 - Catalogação na Fonte**
- Solicitação mediante apresentação da obra
- Prazo de 5 dias úteis
- Sem custos para o utilizador
- Notificação de conclusão

**RF025 - Formação para Acesso a Bases de Dados**
- Agendamento online com 1 semana de antecedência
- Gestão de calendário de formações
- Confirmação automática

### 3.12 Módulo de Inteligência Artificial

**RF026 - Sistema de Recomendação**
- Análise do histórico de leitura do utilizador
- Sugestões baseadas em:
  - Livros similares por categoria
  - Padrões de outros utilizadores com perfil semelhante
  - Tendências de leitura do curso/área
- Apresentação de recomendações personalizadas no dashboard

**RF027 - Chatbot de Atendimento**
- Disponível 24/7 no portal e app
- Funcionalidades:
  - Consulta de disponibilidade de livros
  - Informação sobre prazos e multas
  - Auxílio na navegação do sistema
  - Respostas a perguntas frequentes
  - Escalonamento para atendimento humano quando necessário
- Aprendizado contínuo baseado em interações

**RF028 - OCR Avançado**
- Reconhecimento de texto em múltiplos idiomas
- Correção automática de erros de extração
- Validação de ISBN via checksum
- Sugestão de correções baseada em banco de dados conhecido

### 3.13 Funcionalidades Inovadoras Adicionais

**RF029 - Sistema de Notificações Inteligentes**
- Escolha de canal preferencial pelo utilizador
- Agrupamento de notificações para evitar spam
- Resumo diário/semanal de atividades
- Notificações contextuais (ex: "o livro que reservaste está disponível perto de ti")

**RF030 - Integração com Calendário Académico**
- Sincronização com calendário do ISPTEC
- Ajuste automático de prazos em feriados
- Extensão automática em época de provas (configurável)
- Alertas específicos para períodos críticos

**RF031 - QR Code para Acesso Rápido**
- QR Code em cada livro para consulta instantânea
- Scan para verificar disponibilidade
- Histórico de empréstimos do exemplar
- Localização exata na biblioteca

**RF032 - Analytics para Docentes**
- Dashboard específico mostrando:
  - Livros mais requisitados da sua disciplina
  - Estudantes que levantaram bibliografia recomendada
  - Sugestões de atualização bibliográfica
  - Comparativo com outras disciplinas

---

## 4. REQUISITOS NÃO FUNCIONAIS

### 4.1 Desempenho
- **RNF001:** Tempo de resposta < 2 segundos para 95% das operações
- **RNF002:** Capacidade de processar 500 transações simultâneas
- **RNF003:** OCR deve processar imagem em < 5 segundos
- **RNF004:** Dashboard deve carregar em < 3 segundos

### 4.2 Segurança
- **RNF005:** Autenticação de dois fatores (2FA) opcional
- **RNF006:** Criptografia de dados sensíveis (senhas, dados pessoais)
- **RNF007:** Logs de auditoria para todas as operações críticas
- **RNF008:** Conformidade com GDPR/LGPD (proteção de dados)
- **RNF009:** Backup automático diário com retenção de 30 dias
- **RNF010:** Recuperação de desastres (RPO < 24h, RTO < 4h)

### 4.3 Usabilidade
- **RNF011:** Interface intuitiva com no máximo 3 cliques para qualquer operação
- **RNF012:** Design responsivo (mobile-first)
- **RNF013:** Suporte para dispositivos iOS e Android
- **RNF014:** Acessibilidade WCAG 2.1 nível AA
- **RNF015:** Disponível em Português (Angola)

### 4.4 Disponibilidade
- **RNF016:** Uptime de 99.5% (downtime máximo de 3.6h/mês)
- **RNF017:** Manutenção programada fora do horário de pico
- **RNF018:** Sistema deve funcionar offline para operações críticas (com sincronização posterior)

### 4.5 Escalabilidade
- **RNF019:** Arquitetura suportar crescimento de 300% de utilizadores
- **RNF020:** Base de dados otimizada para acervo de até 100.000 livros
- **RNF021:** Infraestrutura cloud com auto-scaling

### 4.6 Manutenibilidade
- **RNF022:** Código versionado em Git/GitHub
- **RNF023:** Documentação técnica completa (API, arquitetura, deployment)
- **RNF024:** Testes automatizados com cobertura > 80%
- **RNF025:** CI/CD implementado

### 4.7 Interoperabilidade
- **RNF026:** API REST documentada (OpenAPI/Swagger)
- **RNF027:** Integração com sistema da Secretaria Académica
- **RNF028:** Integração com sistema financeiro (para multas)
- **RNF029:** Suporte a exportação de dados em formatos padrão (MARC21, Dublin Core)

### 4.8 Conformidade
- **RNF030:** Conformidade total com Regulamento da Biblioteca ISPTEC
- **RNF031:** Registro de todas as multas conforme tabela oficial
- **RNF032:** Auditoria de todas as operações financeiras

---

## 5. ARQUITETURA DO SISTEMA

### 5.1 Visão Arquitetural

**Camada de Apresentação:**
- Portal Web (React/Vue.js + Tailwind shadcn/ui + Next.j)
- Aplicativo Mobile (React Native/Flutter)
- Dashboard Administrativo

**Camada de Aplicação:**
- API Gateway
- Serviços de Negócio (microserviços)
- Serviços de IA (OCR, Recomendação, Chatbot)

**Camada de Dados:**
- Banco de Dados Relacional (PostgreSQL) - dados estruturados
- Banco NoSQL (MongoDB) - logs, sessões
- Storage de Objetos (S3) - imagens, documentos

**Camada de Integração:**
- API Secretaria Académica
- API Sistema Financeiro
- APIs Externas (Google Books, ISBN.org)
- Gateway de Notificações (Email, SMS, Push)

### 5.2 Diagrama de Componentes Principais

```
┌─────────────────────────────────────────┐
│     CAMADA DE APRESENTAÇÃO             │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Portal Web│ │App Mobile│ │Dashboard│ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│      CAMADA DE APLICAÇÃO               │
│  ┌────────────────────────────────────┐ │
│  │        API Gateway                 │ │
│  └────────────────────────────────────┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐│
│  │Catálo│ │Emprés│ │Reserv│ │Usuário ││
│  │ gação│ │ timo │ │  a   │ │        ││
│  └──────┘ └──────┘ └──────┘ └────────┘│
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  OCR │ │Recome│ │Chatbo│           │
│  │  AI  │ │ndação│ │  t   │           │
│  └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│       CAMADA DE DADOS                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │PostgreSQL│ │ MongoDB  │ │   S3    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

---

## 6. MODELO DE DADOS PRINCIPAL

### 6.1 Entidades Principais

**Membro (User)**
- id, nome, email, telefone
- tipo (Estudante, Docente, Funcionário)
- matricula/numero_colaborador
- data_cadastro, status
- multas_pendentes, bloqueado

**Livro (Book)**
- id, isbn, titulo, autor, editora
- ano_publicacao, edicao, idioma
- categoria, palavras_chave
- num_exemplares, disponivel

**Exemplar (Copy)**
- id, livro_id, codigo_barras
- localizacao, status (disponível, emprestado, reservado, manutenção)
- condicao_fisica

**Empréstimo (Loan)**
- id, exemplar_id, membro_id
- data_emprestimo, data_devolucao_prevista
- data_devolucao_real, status
- num_renovacoes, multa

**Reserva (Reservation)**
- id, livro_id, membro_id
- data_reserva, posicao_fila
- data_disponibilizacao, data_limite_levantamento
- status (ativa, atendida, expirada, cancelada)

**Multa (Fine)**
- id, membro_id, emprestimo_id
- valor, tipo, data_geracao
- data_pagamento, status

---

## 7. FLUXOS DE PROCESSO (TO BE)

### 7.1 Fluxo de Catalogação Inteligente

```
Funcionário → Fotografa capa/folha rosto → Sistema executa OCR →
Extrai metadados → Valida ISBN (duplicado?) →
Consulta APIs externas → Enriquece dados →
Classifica categoria automaticamente →
Registra no BD → Atualiza relatórios → Fim
```

### 7.2 Fluxo de Cadastro Online

```
Utilizador → Acessa portal → Preenche formulário →
Upload documentos → Sistema valida com Secretaria Académica →
Dados válidos? → Gera QR Code → Envia notificação →
Registra membro → Fim
```

### 7.3 Fluxo de Empréstimo Digital

```
Utilizador → Consulta disponibilidade → Reserva online →
Recebe comprovante → Comparece biblioteca →
Funcionário confirma → Registra empréstimo →
Define prazo → Envia notificação → Fim
```

### 7.4 Fluxo de Renovação Automática

```
Utilizador → Acessa "Meus Empréstimos" →
Seleciona livro → Solicita renovação →
Sistema verifica reservas → Verifica limite →
Cálculo nova data → Atualiza registro →
Notifica utilizador → Fim
```

### 7.5 Fluxo de Reserva com Fila

```
Utilizador → Consulta livro indisponível →
Solicita reserva → Sistema adiciona à fila →
[Aguarda devolução] → Livro devolvido →
Sistema notifica primeiro da fila →
Define prazo 48h → Utilizador levanta →
Registra empréstimo → Remove da fila → Fim
```

---

## 8. INTERFACES DO SISTEMA

### 8.1 Portal Web - Páginas Principais

1. **Página Inicial**
   - Busca inteligente de livros
   - Recomendações personalizadas
   - Novidades do acervo
   - Acesso rápido a "Meus Empréstimos"

2. **Meus Empréstimos**
   - Lista de livros emprestados
   - Prazos de devolução
   - Botão "Renovar" (com validação)
   - Histórico de empréstimos

3. **Reservas**
   - Livros reservados
   - Posição na fila
   - Status de disponibilização
   - Cancelar reserva

4. **Busca e Catálogo**
   - Filtros avançados (categoria, autor, ano, idioma)
   - Visualização de disponibilidade em tempo real
   - Detalhes do livro com localização física
   - Botão "Reservar" ou "Emprestar"

5. **Perfil do Utilizador**
   - Dados pessoais
   - Credencial digital (QR Code)
   - Configurações de notificação
   - Histórico de atividades
   - Multas pendentes

### 8.2 Dashboard Administrativo

1. **Visão Geral**
   - Métricas principais (empréstimos ativos, atrasos, reservas)
   - Gráficos de tendências
   - Alertas e notificações

2. **Gestão de Livros**
   - Cadastro inteligente (com OCR)
   - Edição de livros e exemplares
   - Controle de localizações
   - Baixa de exemplares

3. **Gestão de Membros**
   - Aprovação de cadastros
   - Edição de dados
   - Consulta de histórico
   - Gestão de multas e bloqueios

4. **Relatórios**
   - Relatórios predefinidos
   - Criação de relatórios personalizados
   - Exportação de dados
   - Agendamento de relatórios

5. **Configurações**
   - Parâmetros do sistema (prazos, limites, multas)
   - Gestão de utilizadores administrativos
   - Integrações externas
   - Backup e logs

### 8.3 Aplicativo Mobile

**Funcionalidades Principais:**
- Login com QR Code
- Busca rápida de livros
- Renovação com um toque
- Notificações push
- Scanner de código de barras
- Mapa da biblioteca (localização de livros)

---

## 9. GESTÃO DE MULTAS

### 9.1 Tipos de Multas (conforme Regulamento)

**Atraso na Devolução:**
- Cálculo automático baseado em dias de atraso
- Valor conforme tabela oficial do ISPTEC
- Bloqueio de novos empréstimos até pagamento

**Guarda-Volumes:**
- Multa por hora de atraso após 3h
- Cálculo automático no sistema

**Perda de Senha/Credencial:**
- Valor fixo conforme Artigo 2º
- Registro manual pelo funcionário

### 9.2 Processo de Cobrança

```
Sistema detecta atraso → Calcula multa →
Notifica utilizador → Integra com financeiro →
Bloqueia novos serviços → Aguarda pagamento →
Recebe confirmação → Desbloqueia → Fim
```

---

## 10. CRONOGRAMA DE IMPLEMENTAÇÃO (RUPE)

### Fase 1: Iniciação (Concluída - 16/11/2025)
- ✅ Modelagem BPMN
- ✅ Análise de processos AS IS/TO BE
- ✅ Definição de escopo

### Fase 2: Elaboração (24/11/2025)
- Casos de Uso completos
- Modelo de Domínio
- Especificação de requisitos detalhada

### Fase 3: Construção - Parte 1 (29/12/2025)
- Diagramas UML (classes, sequência, atividades, estados)
- Arquitetura do sistema
- Modelo de dados

### Fase 4: Construção - Parte 2 (05/01/2026 - 11/01/2026)
- Documento de Requisitos consolidado
- Protótipo de telas (Figma)
- Revisão e ajustes

### Fase 5: Transição (12/01/2026 - 18/01/2026)
- Implementação funcional
- Testes integrados
- Relatório final
- **Defesa pública**

---

## 11. CRITÉRIOS DE SUCESSO

### 11.1 Métricas de Negócio
- Redução de 60% no tempo médio de atendimento
- Eliminação de 80% das filas físicas
- 90% de satisfação dos utilizadores
- Redução de 50% em erros de catalogação
- 95% de precisão no OCR

### 11.2 Métricas Técnicas
- Cobertura de testes > 80%
- Uptime > 99.5%
- Tempo de resposta < 2s
- Taxa de erros < 0.1%
- Zero vulnerabilidades críticas de segurança

### 11.3 Métricas de Adoção
- 70% dos utilizadores cadastrados online no primeiro mês
- 50% das renovações feitas online
- 80% de leitura de notificações enviadas
- 40% de uso do chatbot

---

## 12. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Resistência à mudança (funcionários) | Média | Alto | Treinamento intensivo, suporte contínuo |
| Falha na integração com Secretaria | Baixa | Alto | Desenvolver interface alternativa manual |
| Baixa precisão do OCR | Média | Médio | Revisão manual obrigatória, uso de múltiplas engines |
| Problemas de conectividade | Alta | Médio | Modo offline com sincronização |
| Dados legados inconsistentes | Alta | Alto | Processo de limpeza e validação antes migração |
| Atraso no desenvolvimento | Média | Alto | Sprints curtos, entregas incrementais |

---

## 13. DEPENDÊNCIAS EXTERNAS

### 13.1 Integrações Necessárias
- ✅ API Secretaria Académica (validação de matrículas)
- ✅ Sistema Financeiro (gestão de multas)
- ⚠️ Google Books API (enriquecimento de metadados)
- ⚠️ ISBN.org API (validação de ISBN)
- ⚠️ Gateway SMS (notificações)
- ⚠️ Serviço de Email (notificações)

### 13.2 Infraestrutura
- Servidor cloud (AWS/Azure/Google Cloud)
- Domínio e certificado SSL
- Storage para imagens e documentos
- CDN para performance

---

## 14. CONSIDERAÇÕES FINAIS

### 14.1 Inovação Diferencial
Este sistema vai além de uma simples digitalização, incorporando:
- **IA aplicada:** OCR, recomendações, chatbot, classificação automática
- **Experiência mobile-first:** QR Codes, notificações inteligentes
- **Analytics avançado:** Insights para tomada de decisão
- **Autonomia do utilizador:** Menos dependência de atendimento presencial

### 14.2 Sustentabilidade
- Redução drástica do uso de papel
- Processos digitais auditáveis
- Facilidade de manutenção e evolução
- Arquitetura escalável para crescimento futuro

### 15. APROVAÇÕES
Documentação preparada por: Grupo 04

- Carlos Neves Mussagui Tchípia
- Emanuel Carneiro dos Santos
- José Simão Tala
- Líria Djenaba Vilança Bá

Docente Orientador: Judson Quissanga Coge Paiva