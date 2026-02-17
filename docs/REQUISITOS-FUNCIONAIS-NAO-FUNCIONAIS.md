# 📋 REQUISITOS FUNCIONAIS E NÃO FUNCIONAIS
## SISTEMA DE GESTÃO DE BIBLIOTECA UNIVERSITÁRIA (SGBU)

**Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)**  
**Luanda, Angola**

---

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Grupo:** 04 - Engenharia de Software I  
**Equipa:**
- Carlos Neves Mussagui Tchípia
- Emanuel Carneiro dos Santos
- José Simão Tala
- Líria Djenaba Vilança Bá

**Docente:** Judson Quissanga Coge Paiva

---

## 📑 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Requisitos Funcionais](#requisitos-funcionais)
3. [Requisitos Não Funcionais](#requisitos-não-funcionais)
4. [Requisitos de Segurança](#requisitos-de-segurança)
5. [Requisitos de Conformidade](#requisitos-de-conformidade)
6. [Matriz de Rastreabilidade](#matriz-de-rastreabilidade)

---

## 🎯 VISÃO GERAL

### Objetivo do Sistema

O SGBU é um sistema de gestão completo para a Biblioteca do ISPTEC que moderniza e automatiza todos os processos de empréstimo, devolução, catalogação, reservas e serviços complementares. O sistema integra tecnologias de Inteligência Artificial, QR Code digital, notificações multi-canal e serviços especiais (cacifos, computadores, formações).

### Escopo do Projeto

**Incluso:**
- Gestão completa de utilizadores (autenticação, perfis, documentos)
- Catálogo de livros com OCR e enriquecimento IA
- Sistema de empréstimos com renovação automática
- Fila FIFO de reservas com notificações
- Cálculo automático de multas
- Serviços especiais (cacifos, computadores, levantamentos, formações)
- Chatbot IA com NLP
- Sistema de recomendações colaborativas
- Relatórios e auditoria completa
- Dashboard administrativo

**Excluído:**
- Sistema de pagamento financeiro (integração futura)
- Módulo de RH/Folha de pagamento
- Sistema de gestão de acervos múltiplos (apenas uma biblioteca)

### Usuários Finais

| Tipo de Usuário | Descrição | Privilégio |
|-----------------|-----------|-----------|
| **Estudante** | Aluno do ISPTEC | Empréstimo, reserva, serviços |
| **Docente** | Professor/Pesquisador | Empréstimo estendido, formações |
| **Funcionário** | Staff administrativo | Gestão documentos, sistemas |
| **Bibliotecário** | Gerente principal | Catalogação, configurações, relatórios |
| **Catalogador** | Especialista catalogação | OCR, enriquecimento, aprovação |
| **Supervisor** | Controle qualidade | Validação, estatísticas |

---

## 📌 REQUISITOS FUNCIONAIS

### RF 1. AUTENTICAÇÃO E AUTORIZAÇÃO

#### RF 1.1 - Login com Google OAuth
- **Descrição:** Usuários podem fazer login através de contas Google @isptec.co.ao
- **Critérios de Aceitação:**
  - Sistema permite apenas emails do domínio @isptec.co.ao
  - Sessão é criada com timeout configurável (padrão: 8 horas)
  - Token JWT é gerado e assinado com chave secreta
  - Logout limpa todos os tokens da sessão
- **Prioridade:** Alta
- **ID:** RF1.1

#### RF 1.2 - QR Code Digital como Credencial
- **Descrição:** Sistema gera QR Code único para cada utilizador após validação
- **Critérios de Aceitação:**
  - QR Code é gerado após upload de documentos válidos
  - QR Code contém dados criptografados do utilizador (ID, tipo, matrícula)
  - QR Code é visualizável no perfil e exportável como imagem/PDF
  - Scan de QR Code faz login automático na biblioteca
- **Prioridade:** Alta
- **ID:** RF1.2

#### RF 1.3 - Controle de Acesso Baseado em Papel (RBAC)
- **Descrição:** Sistema controla funcionalidades conforme tipo de utilizador
- **Critérios de Aceitação:**
  - Estudantes podem: pesquisar, emprestar, reservar, avaliar
  - Docentes podem: empréstimo estendido, formações, levantamentos
  - Funcionários podem: gerenciar documentos, desbloquear contas
  - Bibliotecários podem: catalogação, relatórios, configurações, reativar contas
  - Catalogadores podem: OCR, aprovação de catalogação
  - Supervisores podem: validar, análises estatísticas
  - Acesso não autorizado retorna erro 403
- **Prioridade:** Alta
- **ID:** RF1.3

#### RF 1.4 - Bloqueio de Conta
- **Descrição:** Conta é bloqueada automaticamente para utilizadores com irregularidades
- **Critérios de Aceitação:**
  - Aplicável se tem multas pendentes > threshold configurável
  - Aplicável se tem documentos não verificados há 30 dias
  - Aplicável se teve 3 devoluções atrasadas no mês
  - Bloqueio é reversível por bibliotecário
  - Mensagem clara avisando motivo do bloqueio é exibida
  - Notificação é enviada antes de bloqueio acontecer
- **Prioridade:** Alta
- **ID:** RF1.4

#### RF 1.5 - Ativação de Conta com Documentos
- **Descrição:** Utilizador novo deve fazer upload de documentos para ativar conta
- **Critérios de Aceitação:**
  - Documentos aceitos: cartão de identificação, comprovativo matrícula/emprego
  - Upload é feito através de interface web com drag-and-drop
  - Documentos são armazenados em cloud (Cloudinary)
  - Status de verificação é mostrado em tempo real
  - Bibliotecário pode aprovar/rejeitar documentos
  - QR Code só é gerado após aprovação
  - Notificação é enviada após aprovação/rejeição
- **Prioridade:** Alta
- **ID:** RF1.5

---

### RF 2. GESTÃO DE UTILIZADORES

#### RF 2.1 - Cadastro de Utilizador
- **Descrição:** Novo utilizador pode se registrar no sistema
- **Critérios de Aceitação:**
  - Campos obrigatórios: email, nome, tipo (estudante/docente/staff), validação com Secretaria Académica
  - Email deve ser único e do domínio @isptec.co.ao
  - Identificação é validada contra base de dados da instituição
  - Dados incompletos causam erro com mensagem clara
  - Confirmação de email é enviada
  - Usuário não pode fazer login até documentos serem aprovados
- **Prioridade:** Alta
- **ID:** RF2.1

#### RF 2.2 - Edição de Perfil
- **Descrição:** Utilizador pode atualizar dados pessoais
- **Critérios de Aceitação:**
  - Permitir atualizar: telefone, preferências de notificação, idioma
  - Campos como email e tipo de utilizador não são editáveis
  - Histórico de alterações é registado em ActivityLog
  - Confirmação de sucesso é exibida
  - Alterações entram em efeito imediatamente
- **Prioridade:** Média
- **ID:** RF2.2

#### RF 2.3 - Histórico de Atividades
- **Descrição:** Utilizador pode ver histórico completo de operações
- **Critérios de Aceitação:**
  - Histórico inclui: empréstimos, devoluções, reservas, pagamentos, logins
  - Filtros por período, tipo de operação, status
  - Exportação em PDF/Excel com timestamp
  - Paginação de 20 elementos por página
  - Timestamp com timezone de Luanda
- **Prioridade:** Média
- **ID:** RF2.3

#### RF 2.4 - Gestão de Preferências
- **Descrição:** Utilizador configura preferências de notificação e sistema
- **Critérios de Aceitação:**
  - Canais de notificação: email, SMS, push, in-app
  - Preferência de idioma: português, inglês
  - Configurações de privacidade: visibilidade de perfil
  - Frequência de notificações: instantânea, resumida diária
  - Configurações são persistidas após logout
- **Prioridade:** Média
- **ID:** RF2.4

#### RF 2.5 - Visualização de Multas Pendentes
- **Descrição:** Utilizador pode ver todas as suas multas e status de pagamento
- **Critérios de Aceitação:**
  - Lista de multas com tipo, valor, data geração, data limite
  - Status: pendente, paga, perdoada
  - Opção para pagar multa online (integração futura)
  - Multas pagas mostram recibo eletrônico com data/hora
  - Total de multas é exibido destacado no perfil
- **Prioridade:** Alta
- **ID:** RF2.5

---

### RF 3. CATÁLOGO DE LIVROS E CATALOGAÇÃO

#### RF 3.1 - Pesquisa Avançada de Livros
- **Descrição:** Utilizador pode pesquisar livros com múltiplos critérios
- **Critérios de Aceitação:**
  - Busca por: título, autor, ISBN, categoria, ano, idioma
  - Suporte a busca full-text com relevância
  - Filtros: status (disponível, emprestado), tipo material (livro, DVD, revista)
  - Ordenação por: relevância, título, ano, popularidade
  - Resultados mostram disponibilidade em tempo real
  - Paginação de 10, 20, 50 resultados
  - Sugestões de autocomplete no campo de busca
- **Prioridade:** Alta
- **ID:** RF3.1

#### RF 3.2 - Detalhes Completos do Livro
- **Descrição:** Utilizador visualiza informações detalhadas de um livro
- **Critérios de Aceitação:**
  - Campos exibidos: título, autores, editora, ISBN, ano, descrição, capa
  - Disponibilidade de cópias (total, disponível, emprestado, reservado)
  - Localização física na biblioteca (prateleira, andar)
  - Avaliações de outros usuários (média estrelas, comentários)
  - Histórico de lembranças (quantas pessoas leu)
  - Livros relacionados (mesmo autor, categoria)
- **Prioridade:** Alta
- **ID:** RF3.2

#### RF 3.3 - Catalogação OCR de Livros
- **Descrição:** Bibliotecário pode catalogar livros usando OCR/IA
- **Critérios de Aceitação:**
  - Upload de foto da capa (JPEG, PNG)
  - OCR extrai: título, autores, ISBN usando Tesseract.js ou Google Vision
  - IA (Google Gemini) enriquece dados: descrição, classificação Dewey, tags
  - Confiança de OCR é mostrada (mínimo 70% para auto-aprovação)
  - Dados extraídos são editáveis antes de salvar
  - Entrada fica em status DRAFT até supervisão
  - Notificação para revisor quando entrada está pronta
- **Prioridade:** Alta
- **ID:** RF3.3

#### RF 3.4 - Aprovação de Catalogação
- **Descrição:** Supervisor revisa e aprova catalogação OCR
- **Critérios de Aceitação:**
  - Fila de entradas em status PENDING_REVIEW
  - Revisor pode: aprovar, rejeitar (com motivo), editar dados
  - Aprovação move entrada para APPROVED e cria registro no catálogo
  - Rejeição retorna para catalogador com feedback
  - Histórico de aprovações é registado
  - SLA de 1 dia útil para revisão
- **Prioridade:** Alta
- **ID:** RF3.4

#### RF 3.5 - Categorias Hierárquicas
- **Descrição:** Sistema suporta categorias em múltiplos níveis
- **Critérios de Aceitação:**
  - Cada categoria tem: nome, descrição, categoria pai (opcional)
  - Suporta até 5 níveis de profundidade
  - Exibição em árvore na interface de pesquisa
  - Contagem de livros por categoria
  - Bibliotecário pode gerenciar categorias (CRUD)
  - Mudança de categoria em lote para múltiplos livros
- **Prioridade:** Média
- **ID:** RF3.5

#### RF 3.6 - Relação N:M Livro-Autor
- **Descrição:** Sistema suporta múltiplos autores por livro
- **Critérios de Aceitação:**
  - Cada livro pode ter múltiplos autores
  - Ordem dos autores é preservada
  - Busca por autor retorna todos os livros
  - Página de autor mostra todos os livros
  - Opção para adicionar novo autor durante catalogação
  - Possibilidade de unificar autores com nomes variados
- **Prioridade:** Média
- **ID:** RF3.6

#### RF 3.7 - Gestão de Exemplares
- **Descrição:** Bibliotecário gerencia cópias físicas dos livros
- **Critérios de Aceitação:**
  - Cada exemplar tem: código de barras (único), tag RFID, condição, localização
  - Estados: disponível, emprestado, reservado, manutenção, perdido, danificado
  - Transição de estado é auditada
  - Atualização de localização quando recebido/devolvido
  - Condição registada quando devolvido (ótima, boa, danificada)
  - Opção de marcar como perdido/descarte
  - Histórico completo de movimentação
- **Prioridade:** Alta
- **ID:** RF3.7

---

### RF 4. SISTEMA DE EMPRÉSTIMOS

#### RF 4.1 - Criação de Empréstimo
- **Descrição:** Utilizador pode emprestar um exemplar disponível
- **Critérios de Aceitação:**
  - Validações aplicadas conforme Artigo 10º:
    - ESTUDANTE: máximo 2 livros, prazo 5 dias
    - DOCENTE: máximo 4 livros, prazo 15 dias
    - STAFF: máximo 5 livros, prazo 15 dias
  - Exemplar deve estar em status DISPONÍVEL
  - Utilizador não pode ter multas pendentes
  - Utilizador não é estar bloqueado
  - Conta deve estar ativa e verificada
  - Data de vencimento é calculada automaticamente
  - Empréstimo entra em status ACTIVE
  - Exemplar muda para status BORROWED
  - Notificação é enviada ao utilizador
  - Entrada em ActivityLog é criada
- **Prioridade:** Alta
- **ID:** RF4.1

#### RF 4.2 - Renovação de Empréstimo
- **Descrição:** Utilizador pode renovar empréstimo antes do vencimento
- **Critérios de Aceitação:**
  - Limite de 2 renovações por empréstimo (Artigo 15º)
  - Não é permitido renovar se há reservas pendentes para o livro
  - Não é permitido se utilizador tem multas pendentes
  - Não é permitido se limite de dias foi atingido
  - Nova data é calculada (adiciona mesmo período original)
  - Contador de renovações é incrementado
  - Notificação com nova data é enviada
  - Opção de renovação aparece 3 dias antes do vencimento
  - Renovação pode ser feita via app ou biblioteca (in-app ou no balcão)
- **Prioridade:** Alta
- **ID:** RF4.2

#### RF 4.3 - Devolução de Empréstimo
- **Descrição:** Utilizador devolve exemplar, sistema atualiza estado
- **Critérios de Aceitação:**
  - Biblioteca registra devolução (data/hora)
  - Condição do exemplar é avaliada (ótima, boa, danificada)
  - Exemplar muda para status AVAILABLE (se condição OK)
  - Exemplar muda para status MAINTENANCE (se danificado)
  - Empréstimo muda para status RETURNED
  - Se atrasado, multa é calculada automaticamente
  - Total de exemplares disponíveis é atualizado
  - Se havia reservas, próximo na fila é notificado
  - Notificação de devolução é enviada ao utilizador
  - Entrada em ActivityLog é criada
- **Prioridade:** Alta
- **ID:** RF4.3

#### RF 4.4 - Cálculo Automático de Multas
- **Descrição:** Sistema calcula multas para devoluções atrasadas
- **Critérios de Aceitação:**
  - Execução: job agendado (CRON) a cada 4:00 AM
  - Para cada empréstimo com dueDate < hoje:
    - Status muda para OVERDUE
    - daysOverdue é calculado
    - Multa é gerada com valor: dias × tarifa configurável (padrão: 50 Kz/dia)
    - FineType é LATE_RETURN
    - Limite máximo: 30 dias (ninguém paga mais de 1500 Kz)
  - Notificação é enviada ao utilizador
  - Utilizador é marcado como bloqueado se total multas > 200 Kz
  - Entrada em ActivityLog é criada
- **Prioridade:** Alta
- **ID:** RF4.4

#### RF 4.5 - Visualizar Empréstimos Ativos
- **Descrição:** Utilizador vê seus empréstimos em progresso
- **Critérios de Aceitação:**
  - Lista ordenada por data de vencimento (próximos primeiro)
  - Campos: título, autor, data vencimento, renovações restantes, status
  - Status visual: verde (OK), amarelo (próx vencer 3 dias), vermelho (atrasado)
  - Opções: renovar, estender horário no balcão, detalhes
  - Detalhes mostram: data empréstimo, data vencimento, localização exemplar
  - Se atrasado, multa calculada é mostrada
  - Paginação de 5-10 itens por página
- **Prioridade:** Alta
- **ID:** RF4.5

#### RF 4.6 - Empréstimo em Massa (Turma)
- **Descrição:** Docente pode emprestar múltiplos livros para uma turma
- **Critérios de Aceitação:**
  - Disponível apenas para docentes
  - Pode emprestar até 10 exemplares do mesmo livro
  - Prazo estendido (até 30 dias)
  - Registação em tabela ClassroomLoan
  - Validações de disponibilidade são aplicadas
  - Notificação para docente e estudantes
  - Devolução é feita coletivamente
- **Prioridade:** Média
- **ID:** RF4.6

---

### RF 5. SISTEMA DE RESERVAS

#### RF 5.1 - Criar Reserva (Fila FIFO)
- **Descrição:** Utilizador pode reservar livro indisponível
- **Critérios de Aceitação:**
  - Exemplar deve estar em status BORROWED ou RESERVED
  - Validação: utilizador não pode ter 2+ reservas ativas do mesmo livro
  - Validação: não pode reservar se tem multas > 500 Kz
  - Validação: não pode reservar mais de 5 livros simultaneamente
  - Reserva recebe posição na fila (orderBy queuePosition ASC)
  - Status inicial é ACTIVE
  - Email/SMS é enviado com posição na fila
  - Estimativa de disponibilidade é calculada (baseada em prazo de empréstimos)
  - Entrada em ActivityLog é criada
- **Prioridade:** Alta
- **ID:** RF5.1

#### RF 5.2 - Notificação de Disponibilidade
- **Descrição:** Sistema notifica próximo na fila quando livro fica disponível
- **Critérios de Aceitação:**
  - Ao registar devolução, sistema verifica se há reservas
  - Próxima reserva (queuePosition = 1) muda para status AVAILABLE
  - availableDate é set para agora
  - expiryDate é set para agora + 48 horas
  - Notificação multi-canal é enviada (preferência do utilizador)
  - Posições da fila são atualizadas (reordenadas)
  - Próxima na fila também é notificada (2ª posição → 1ª)
  - Se utilizador não coleta em 48h, reserva expira e próximo é notificado
- **Prioridade:** Alta
- **ID:** RF5.2

#### RF 5.3 - Visualizar Reservas Ativas
- **Descrição:** Utilizador vê suas reservas em progresso
- **Critérios de Aceitação:**
  - Lista com: título, autor, posição fila, estimativa disponibilidade
  - Status visual: em fila (azul), disponível (verde - 48h)
  - Se disponível: exibir local pickup, horário funcionamento
  - Opção de cancelar reserva
  - Opção de renovar posição na fila (aguarda próximo)
- **Prioridade:** Alta
- **ID:** RF5.3

#### RF 5.4 - Cancelar Reserva
- **Descrição:** Utilizador cancela sua reserva
- **Critérios de Aceitação:**
  - Reserva em qualquer status pode ser cancelada
  - Status muda para CANCELLED
  - Posições da fila são reordenadas
  - Segunda posição é notificada (antes de se tornar primeira)
  - Notificação de cancelamento é enviada ao utilizador
  - Entrada em ActivityLog é criada
- **Prioridade:** Média
- **ID:** RF5.4

#### RF 5.5 - Expiração Automática de Reservas
- **Descrição:** Reservas expirem se não coletadas em 48h
- **Critérios de Aceitação:**
  - Job agendado (CRON) 2× ao dia
  - Verifica todas as reservas com status AVAILABLE e expiryDate < hoje
  - Status muda para EXPIRED
  - Notificação é enviada ao utilizador (foi seu)
  - Próximo na fila é notificado automaticamente
  - Entrada em ActivityLog é criada
- **Prioridade:** Alta
- **ID:** RF5.5

---

### RF 6. SISTEMA DE MULTAS

#### RF 6.1 - Tipos de Multas
- **Descrição:** Sistema suporta múltiplos tipos de multas
- **Critérios de Aceitação:**
  - LATE_RETURN: devolução atrasada (50 Kz/dia)
  - LOCKER_OVERTIME: cacifo ultrapassado (20 Kz/ 15min)
  - LOST_CREDENTIAL: perda de credencial digital (100 Kz)
  - DAMAGED_BOOK: livro danificado (valor conforme avaliação: 10%, 25%, 50% do valor)
  - LOST_BOOK: livro perdido (100% do valor)
  - Valores são configuráveis via SystemConfiguration
  - Cada multa tem: tipo, valor, data geração, status, motivo
- **Prioridade:** Alta
- **ID:** RF6.1

#### RF 6.2 - Geração Automática de Multas
- **Descrição:** Multas são geradas automaticamente por eventos
- **Critérios de Aceitação:**
  - LATE_RETURN: gerado por job diário (4:00 AM)
  - LOCKER_OVERTIME: gerado quando cacifo expira
  - LOST_CREDENTIAL: gerado manually por bibliotecário
  - DAMAGED_BOOK: gerado ao registar devolução com dano
  - LOST_BOOK: gerado ao marcar exemplar como perdido
  - Registro em ActivityLog
  - Notificação enviada ao utilizador
- **Prioridade:** Alta
- **ID:** RF6.2

#### RF 6.3 - Pagamento de Multas
- **Descrição:** Utilizador pode visualizar e pagar multas
- **Critérios de Aceitação:**
  - Lista de multas com tipo, valor, data, status
  - Filtros por tipo, período, status
  - Total de multas pendentes é destacado
  - Opção: pagar selecionadas ou todas
  - Integração com gateway de pagamento (Stripe/PayPal) - FUTURO
  - Receita eletrônica é gerada após pagamento
  - Status muda para PAID
  - Utilizador é desbloqueado se tinha bloqueio por multas
  - Email com recibo é enviado
  - Registro em ActivityLog
- **Prioridade:** Alta
- **ID:** RF6.3

#### RF 6.4 - Perdão de Multas
- **Descrição:** Bibliotecário pode dispensar multas em casos especiais
- **Critérios de Aceitação:**
  - Apenas bibliotecários podem perdoar
  - Pode selecionar múltiplas multas para perdoar
  - Motivo do perdão é requerido (texto)
  - Status muda para WAIVED
  - Notificação é enviada ao utilizador
  - Entrada em ActivityLog com motivo é criada
  - Utilizador é desbloqueado se perde último obstáculo
- **Prioridade:** Média
- **ID:** RF6.4

---

### RF 7. NOTIFICAÇÕES MULTI-CANAL

#### RF 7.1 - Criação de Notificações
- **Descrição:** Sistema cria notificações para eventos
- **Critérios de Aceitação:**
  - Eventos que geram notificação:
    - Empréstimo criado/renovado
    - Devolução vencida (alertas 3 dias antes, 1 dia antes)
    - Livro disponível na fila
    - Multa gerada
    - Formação agendada (lembretes 1 semana, 1 dia antes)
    - Documento aprovado/rejeitado
    - Cacifo/PC disponível
    - Solicitação finalizada
  - Notificação tem: tipo, título, mensagem, data, usuário destino
  - Status inicial é PENDING
  - Preferência de canal do utilizador é respeitada
  - Idioma da notificação segue preferência utilizador
- **Prioridade:** Alta
- **ID:** RF7.1

#### RF 7.2 - Envio via Email (Resend)
- **Descrição:** Notificações são enviadas por email
- **Critérios de Aceitação:**
  - Integração com Resend API
  - Template HTML profissional por tipo de notificação
  - Verificação de bounces
  - Retry automático em caso de falha (3 tentativas)
  - Status é atualizado: SENT, DELIVERED, FAILED
  - Timestamp de envio é registado
  - Logs de erros para debug
- **Prioridade:** Alta
- **ID:** RF7.2

#### RF 7.3 - Envio via SMS (Twilio)
- **Descrição:** Notificações críticas são enviadas por SMS
- **Critérios de Aceitação:**
  - Integração com Twilio API
  - Apenas notificações críticas: vencimento hoje, disponibilidade, multa
  - Limite de 1 SMS por tipo por dia para evitar spam
  - Texto em português com caracteres especiais suportados
  - Timeout de envio
  - Retry automático em caso de falha
  - Status e timestamps registados
  - Logs de erros
- **Prioridade:** Média
- **ID:** RF7.3

#### RF 7.4 - Notificações In-App
- **Descrição:** Sistema exibe notificações dentro da aplicação
- **Critérios de Aceitação:**
  - Centro de notificações (Notification Center) acessível no header
  - Dropdown com últimas 5 notificações não lidas
  - Timestamp relativo (há 2 horas, ontem, etc)
  - Badge com contagem de não lidas na aba
  - Ao clicar, notificação marca como lida
  - Histórico de todas as notificações é acessível
  - Permissão para limpar notificações lidas em massa
  - Cores/ícones diferentes por tipo
- **Prioridade:** Alta
- **ID:** RF7.4

#### RF 7.5 - Notificações Push (Opcional)
- **Descrição:** Notificações push para app mobile
- **Critérios de Aceitação:**
  - Requer permissão do browser/app
  - Apenas notificações críticas: vencimento hoje, disponibilidade
  - Pop-up no sistema operacional
  - Click abre a app/page relevante
  - Integração com Firebase Cloud Messaging (FCM)
  - Comportamento offline testado
- **Prioridade:** Baixa
- **ID:** RF7.5

#### RF 7.6 - Preferências de Notificação
- **Descrição:** Utilizador configura como quer ser notificado
- **Critérios de Aceitação:**
  - Canal padrão: email, SMS, push, in-app
  - Frequência: instantânea, resumo diário, resumo semanal
  - Tipos para desativar: empréstimo, devolução, multa, serviços, formação
  - Horário de "não perturbe": ex: 22h-08h
  - Alterações entram em efeito imediatamente
- **Prioridade:** Média
- **ID:** RF7.6

---

### RF 8. SERVIÇOS ESPECIAIS

#### RF 8.1 - Reserva de Cacifos
- **Descrição:** Utilizador pode reservar cacifo para armazenar livros
- **Critérios de Aceitação:**
  - Duração padrão: 3 horas
  - Validação: utilizador não pode ter 2+ cacifos ativos
  - Seleção de cacifo disponível por localização
  - Código de acesso é gerado (4 dígitos)
  - Contagem regressiva visual exibida
  - Aviso 30 minutos antes da expiração
  - Se ultrapassar tempo: multa LOCKER_OVERTIME é gerada
  - Multa: 20 Kz por 15 minutos (máximo 120 Kz por hora)
  - Bloqueio se total multas neste serviço > 200 Kz
  - Notificação ao vencer
- **Prioridade:** Média
- **ID:** RF8.1

#### RF 8.2 - Reserva de Computadores
- **Descrição:** Utilizador pode reservar PC em lab informático
- **Critérios de Aceitação:**
  - Duração padrão: 2 horas
  - Máximo de renovações: 1 (se sem fila)
  - Validação: utilizador não pode ter sessão ativa + reserva simultaneamente
  - Seleção por lab/localização e sistema operacional
  - Se há fila: utilizador entra na fila, notificação quando chegar vez
  - Check-in obrigatório no balcão (staffconfirma presença)
  - Timer inicia apenas após check-in
  - Renovação possível 30 min antes do fim (se sem fila)
  - Logout automático 5 min antes do tempo expirar
  - Sem multa se devolver no prazo
- **Prioridade:** Média
- **ID:** RF8.2

#### RF 8.3 - Solicitação de Levantamento Bibliográfico
- **Descrição:** Utilizador pode solicitar levantamento de referências
- **Critérios de Aceitação:**
  - Disponível para docentes e pós-graduandos
  - Formulário com: tema, palavras-chave, tipo material, período
  - SLA: 5 dias úteis
  - Status: PENDING → IN_PROGRESS → COMPLETED
  - Bibliotecário seleciona referências manuais
  - Resultado é enviado em formato bibliográfico (APA, IEEE, etc)
  - Entrega via email ou retirada na biblioteca
  - Sem custos
- **Prioridade:** Baixa
- **ID:** RF8.3

#### RF 8.4 - Solicitação de Catalogação na Fonte
- **Descrição:** Utilizador pode solicitar catalogação de obra sua
- **Critérios de Aceitação:**
  - Disponível para docentes/pesquisadores
  - Upload de documento/obra
  - Dados: título, autoria, ano, descrição
  - SLA: 5 dias úteis
  - Catalogador faz OCR + enriquecimento
  - Resultado é entregue em formato catalogação selecionado
  - Sem custos
- **Prioridade:** Baixa
- **ID:** RF8.4

---

### RF 9. FORMAÇÕES E TREINAMENTOS

#### RF 9.1 - Agendamento de Formação
- **Descrição:** Utilizador pode agendar formações na biblioteca
- **Critérios de Aceitação:**
  - Formações disponíveis (temas):
    - Bases de dados (EBSCO, SCOPUS, etc)
    - Gestão de referências (Mendeley, Zotero)
    - Pesquisa online avançada
    - Copyright e direitos de autor
  - Agendamento com antecedência mínima de 1 semana
  - Limite de 20 pessoas por sessão
  - Seleção de data e turno
  - Status: PENDING_DOCUMENTS (até docs aprovados) → SCHEDULED → COMPLETED
  - Certificado é gerado após participação
  - Notificações: confirmação, lembretes (1 semana, 1 dia antes)
- **Prioridade:** Média
- **ID:** RF9.1

#### RF 9.2 - Gestão de Formações (Admin)
- **Descrição:** Bibliotecário gerencia formações
- **Critérios de Aceitação:**
  - CRUD de formações: criar, editar, cancelar
  - Definir tema, data, horário, local, capacidade
  - Ver lista de inscritos
  - Gerar lista de presença
  - Marcar presentes/ausentes
  - Gerar certificados em massa
  - Estatísticas de participação
- **Prioridade:** Média
- **ID:** RF9.2

---

### RF 10. CHATBOT IA COM NLP

#### RF 10.1 - Interface de Chat
- **Descrição:** Utilizador pode conversar com assistente IA
- **Critérios de Aceitação:**
  - Interface de chat com histórico
  - Caixa de input com placeholder sugestivo
  - Sugestões rápidas (botões): "Disponibilidade", "Regulamento", "Ajuda"
  - Histórico persistido (últimas 10 conversas)
  - Timestamps de mensagens
  - Indicador de digitação do bot
  - Botão de nova conversa
- **Prioridade:** Alta
- **ID:** RF10.1

#### RF 10.2 - Processamento NLP
- **Descrição:** IA processa intenção e contexto da mensagem
- **Critérios de Aceitação:**
  - Integração com OpenAI GPT-4
  - Detecção de intenção: consulta, dúvida, ajuda, escalar
  - Contexto do utilizador enviado: tipo, empréstimos ativos, multas, etc
  - Prompt system em português de Angola
  - Temperature: 0.7 para respostas equilibradas
  - Timeout de 30s
  - Fallback: "Desculpe, não entendi"
- **Prioridade:** Alta
- **ID:** RF10.2

#### RF 10.3 - Capacidades do Chatbot
- **Descrição:** Chatbot responde a várias categorias de questões
- **Critérios de Aceitação:**
  - **Consulta de disponibilidade:** "O livro X está disponível?"
    - Busca no BD e retorna status
    - Se indisponível, oferece opção de reservar
  - **Dúvidas sobre regulamento:** "Quantos livros posso emprestar?"
    - Respostas baseadas em base de conhecimento
    - Links para seções relevantes do regulamento
  - **Ajuda de navegação:** "Como faço para renovar?"
    - Guia passo-a-passo ou link direto
  - **Reportar problema:** "Não consigo acessar meus empréstimos"
    - Oferece troubleshooting
    - Opção de escalar para humano
  - **Conversação casual:** "Olá!"
    - Responde educadamente
    - Oferece ajuda
- **Prioridade:** Alta
- **ID:** RF10.3

#### RF 10.4 - Escalonamento para Humano
- **Descrição:** Chat pode ser escalado para staff se necessário
- **Critérios de Aceitação:**
  - Bot detecta problema técnico - oferece escalar
  - Utilizador pede para falar com humano
  - Criação de ticket de suporte
  - Como humano: email para bibliotecário + chat transcription
  - Status muda para "Aguardando resposta"
  - Email é enviado ao utilizador com tempo estimado
  - Resposta é digitada no chat ou via email
- **Prioridade:** Média
- **ID:** RF10.4

---

### RF 11. SISTEMA DE RECOMENDAÇÕES

#### RF 11.1 - Algoritmo Colaborativo
- **Descrição:** IA recomenda livros baseado em histórico do utilizador
- **Critérios de Aceitação:**
  - Análise de histórico de empréstimos
  - Matriz de similaridade de utilizadores (correlação)
  - Livros lidos por similares que este não leu
  - Score de confiança (0-100)
  - Atualização diária via job agendado
  - Máximo 5 recomendações por utilizador
  - Excluir livros já lidos/emprestados
- **Prioridade:** Média
- **ID:** RF11.1

#### RF 11.2 - Explicabilidade
- **Descrição:** Recomendações mostram por que são sugeridas
- **Critérios de Aceitação:**
  - Motivos: "porque leu X", "popular no seu curso", "trending now"
  - Score de confiança é exibido
  - Feedback: "não me interessa" treina modelo
  - Link direto para detalhes do livro
- **Prioridade:** Média
- **ID:** RF11.2

#### RF 11.3 - Ajuste de Preferências
- **Descrição:** IA aprende com feedback do utilizador
- **Critérios de Aceitação:**
  - Botão "não me interessa" no card de recomendação
  - Dados de clique são registados
  - Modelo é retrainado periodicamente
  - Histórico de feedback é mantido
- **Prioridade:** Baixa
- **ID:** RF11.3

---

### RF 12. AVALIAÇÕES E COMENTÁRIOS

#### RF 12.1 - Avaliar Livro
- **Descrição:** Utilizador que devolveu livro pode avaliar
- **Critérios de Aceitação:**
  - Rating 1-5 estrelas
  - Comentário opcional (até 500 caracteres)
  - Disponível apenas após devolução
  - Histórico de avaliações do utilizador
  - Opção de editar/deletar própria avaliação
  - Opções de reportar avaliação abusiva
- **Prioridade:** Baixa
- **ID:** RF12.1

#### RF 12.2 - Exibição de Avaliações
- **Descrição:** Avaliações são exibidas no detalhe do livro
- **Critérios de Aceitação:**
  - Média de estrelas (campo do Livro)
  - Contagem de avaliações
  - Últimas 5 avaliações destacadas
  - Filtro por rating (5⭐, 4⭐, etc)
  - Ordenação: mais úteis, mais recentes
  - Avaliações suspeitas são moderadas
- **Prioridade:** Baixa
- **ID:** RF12.2

---

### RF 13. RELATÓRIOS E ESTATÍSTICAS

#### RF 13.1 - Relatórios Operacionais
- **Descrição:** Bibliotecário pode gerar relatórios
- **Critérios de Aceitação:**
  - Tipos de relatórios:
    - Empréstimos por período (quantidade, top livros, top usuários)
    - Devoluções atrasadas (lista, dias de atraso, multas)
    - Livros populares (ranking por categoria)
    - Atividade de utilizadores (por tipo, por departamento)
  - Filtros: período (data início-fim), tipo utilizador, categoria
  - Exportação: PDF, Excel, CSV
  - Insights automáticos (gráficos, tabelas, resumos)
  - Agendamento: pode guardar filtros e executar regular
- **Prioridade:** Média
- **ID:** RF13.1

#### RF 13.2 - Dashboard de Métricas
- **Descrição:** Página com métricas do sistema em tempo real
- **Critérios de Aceitação:**
  - Métricas diárias:
    - Empréstimos (hoje, esta semana, este mês)
    - Devoluções (no prazo, atrasadas)
    - Multas geradas (quantidade, valor total)
    - Utilizadores novos (hoje, este mês)
    - Livros mais populares (top 10)
  - Gráficos: tendências, distribuição por categoria, por tipo utilizador
  - Filtros básicos: período, tipo utilizador
  - Alertas: multas > threshold, livros perdidos, etc
- **Prioridade:** Média
- **ID:** RF13.2

#### RF 13.3 - Auditoria Completa
- **Descrição:** Sistema registra todas as operações críticas
- **Critérios de Aceitação:**
  - Entidade ActivityLog com: ação, entidade, ID registro, usuário, timestamp, IP
  - Ações auditadas:
    - CRUD completo de todas entidades críticas
    - Login/logout
    - Mudanças de status (empréstimo, exemplar, utilizador)
    - Geração de multas
    - Acesso a dados sensíveis
  - Retenção: mínimo 2 anos
  - Busca por período, usuário, ação, entidade
  - Exportação para análise forense
  - Imutabilidade via constraint BD (archived records)
- **Prioridade:** Alta
- **ID:** RF13.3

---

### RF 14. GESTÃO DE CONFIGURAÇÕES

#### RF 14.1 - Configurações Dinâmicas
- **Descrição:** Bibliotecário pode ajustar parâmetros sem código
- **Critérios de Aceitação:**
  - Entidade SystemConfiguration (chave-valor-tipo)
  - Configurações gerenciáveis:
    - Limites de empréstimo (por tipo utilizador): maxBooks, maxDays
    - Tarifas de multa: lateFeePerDay, lockerFeePerMinute, etc
    - Prazos: loanRenewalLimit, reservaExpiryHours, etc
    - Notificações: alertDaysBeforeDue, reminderHoursBeforeTraining, etc
    - Sistema: operatingHours, noLoanPeriods (feriados), etc
  - Interface de CRUD
  - Histórico de mudanças
  - Validação de tipo (número, texto, booleano, data)
  - Cache de leitura com TTL de 1 hora
- **Prioridade:** Média
- **ID:** RF14.1

#### RF 14.2 - Publicação de Configurações
- **Descrição:** Configurações públicas são visíveis para utilizadores
- **Critérios de Aceitação:**
  - Endpoint público: GET /api/settings/public
  - Informações públicas:
    - Horário de funcionamento
    - Limites de empréstimo por tipo
    - Tipos de material e políticas
    - Contato de suporte
    - Links de ajuda
  - Cache de 24 horas
  - Sem autenticação necessária
- **Prioridade:** Média
- **ID:** RF14.2

---

### RF 15. FUNCIONALIDADES DE ADMINISTRADOR

#### RF 15.1 - Dashboard Administrativo
- **Descrição:** Interface dedicada para gerenciar sistema
- **Critérios de Aceitação:**
  - Acesso apenas para LIBRARIAN e SUPERVISOR
  - Menu com abas: Utilisateurs, Livros, Empréstimos, Configurações, Relatórios, Logs
  - Quick links para ações mais comuns
  - Alertas: contas pendentes, documentos a revisar, atrasos críticos
- **Prioridade:** Alta
- **ID:** RF15.1

#### RF 15.2 - Gestão de Utilizadores (Admin)
- **Descrição:** Bibliotecário gerencia utilizadores
- **Critérios de Aceitação:**
  - Busca avançada: email, matrícula, tipo, status
  - Ver detalhes completos
  - Ações: bloquear/desbloquear, ativar/desativar, excluir (soft), mudar tipo
  - Ver histórico de operações do utilizador
  - Registar pagamento de multa manualmente
  - Resetar credencial digital (gerar novo QR)
  - Enviar mensagem/notificação
- **Prioridade:** Alta
- **ID:** RF15.2

#### RF 15.3 - Gestão de Livros (Admin)
- **Descrição:** Bibliotecário gerencia catálogo
- **Critérios de Aceitação:**
  - CRUD completo de livros
  - Bulk import via CSV/Excel
  - Edição em massa (categoria, status exemplares)
  - Marcação de perdidos/descarte
  - Histórico de movimentação de exemplares
  - Alertas: exemplares não retornados há X dias, livros nunca emprestados
- **Prioridade:** Alta
- **ID:** RF15.3

#### RF 15.4 - Gestão de Empréstimos (Admin)
- **Descrição:** Bibliotecário pode intervir em empréstimos
- **Critérios de Aceitação:**
  - Ver todos empréstimos (filtrado, paginado)
  - Ações: renovar manualmente, estender prazo, cancelar, marcar como devolvido
  - Forçar devolução (caso de perda)
  - Gerar multa manual
  - Busca avançada: por utilizador, livro, status, data
- **Prioridade:** Alta
- **ID:** RF15.4

#### RF 15.5 - Verificação de Documentos
- **Descrição:** Bibliotecário aprova/rejeita documentos de utilizador novo
- **Critérios de Aceitação:**
  - Fila de documentos pendentes
  - Visualização em zoom
  - Ações: aprovar, rejeitar (com motivo)
  - Feedback é enviado ao utilizador
  - SLA: 48 horas para revisão
  - Notificação para utilizador quando aprovado (pode fazer login)
- **Prioridade:** Alta
- **ID:** RF15.5

---

## 🛡️ REQUISITOS NÃO FUNCIONAIS

### RNF 1. PERFORMANCE

#### RNF 1.1 - Tempo de Resposta
- **Descrição:** Sistema responde rapidamente a operações
- **Critério:** 
  - Páginas carregam em < 3 segundos (P95)
  - APIs retornam em < 1 segundo (P95)
  - Busca retorna em < 2 segundos (P95)
  - Dashboard de metricas em < 5 segundos (P95)
- **ID:** RNF1.1

#### RNF 1.2 - Otimização de Queries
- **Descrição:** Operações de BD são otimizadas
- **Critério:**
  - Sem N+1 queries (uso de select/include)
  - Índices em colunas frequentemente filtradas/ordenadas
  - Paginação máxima: 50 registos
  - Cache de reads com TTL apropriado
- **ID:** RNF1.2

#### RNF 1.3 - Compressão e Caching
- **Descrição:** Assets são comprimidos e cacheados
- **Critério:**
  - Gzip para respostas HTML/JSON
  - Brotli para assets estáticos
  - Cache HTTP: 1 ano para assets immutáveis, 1 dia para dinâmica
  - CDN para distribuição (Cloudinary para imagens)
  - Service Worker para offline capability
- **ID:** RNF1.3

#### RNF 1.4 - Imagens Otimizadas
- **Descrição:** Imagens são comprimidas e responsivas
- **Critério:**
  - Formato: WebP com fallback JPEG
  - Sizes: mobile (480px), tablet (1024px), desktop (1920px)
  - Lazy loading padrão para imagens "below the fold"
  - Compressão: máximo 100KB para thumbnails, 500KB para full
  - Placeholder/skeleton durante loading
- **ID:** RNF1.4

---

### RNF 2. SEGURANÇA

#### RNF 2.1 - Autenticação Segura
- **Descrição:** Credenciais são protegidas
- **Critério:**
  - Senhas com hash bcrypt (salt 10)
  - Senhas armazenadas nunca são transmitidas
  - HTTPS obrigatório (TLS 1.3)
  - Google OAuth validado via secret compartilhado
  - Sessões com timeout de 8 horas
  - Tokens JWT assinados com RS256
- **ID:** RNF2.1

#### RNF 2.2 - Proteção contra Ataques Comuns
- **Descrição:** Sistema é resistente a ataques comuns
- **Critério:**
  - SQL Injection: Prisma previne (queries parametrizadas)
  - XSS: Input sanitizado, Content-Security-Policy header
  - CSRF: Tokens CSRF em todos formulários (Next.js automático)
  - Rate limiting: máximo 100 requests/min por IP
  - Input validation: Zod em todas as APIs
  - CORS configurado corretamente (apenas origens autorizadas)
- **ID:** RNF2.2

#### RNF 2.3 - Proteção de Dados Sensíveis
- **Descrição:** Dados sensíveis são criptografados/mascados
- **Critério:**
  - Emails: não exibidos completamente a outros utilizadores
  - Senhas: nunca mostradas (exceto reset)
  - Números de telefone: criptografados em BD
  - Documentos de identificação: armazenados em storage seguro (Cloudinary com acesso restrito)
  - Logs: não contêm senhas/tokens
  - GDPR: direito ao esquecimento implementado
- **ID:** RNF2.3

#### RNF 2.4 - Controle de Acesso
- **Descrição:** Utilizadores só acessam dados autorizados
- **Critério:**
  - Validação de permissão em toda ação sensível
  - Utilizador não vê dados de outro sem permissão
  - Admin não vê senhas armazenadas de ninguém
  - Documentos não aprovados são invisíveis
  - Logs mostram quem acessou o quê
- **ID:** RNF2.4

#### RNF 2.5 - Auditoria e Logs
- **Descrição:** Todas operações críticas são registadas
- **Critério:**
  - Logs com: ação, usuário, timestamp, IP, resultado
  - Logs não deletáveis (imutáveis)
  - Retenção mínima: 2 anos
  - Logs não contêm dados sensíveis
  - Alertas para atividades suspeitas
- **ID:** RNF2.5

---

### RNF 3. ESCALABILIDADE

#### RNF 3.1 - Arquitetura Stateless
- **Descrição:** Backend é escalável horizontalmente
- **Critério:**
  - Sem sessões em memória do servidor
  - Tokens JWT para autenticação distribuída
  - Cache (Redis) centralizado se necessário
  - Jobs agendados via scheduler (não em processo único)
  - Imagens/docs em CDN, não no servidor
- **ID:** RNF3.1

#### RNF 3.2 - Capacidade de Utilizadores Concorrentes
- **Descrição:** Sistema suporta múltiplos utilizadores simultâneos
- **Critério:**
  - Mínimo: 500 utilizadores simultâneos
  - Máximo esperado inicialmente: 1000
  - Pool de conexões BD: 20+ conexões
  - Timeout de conexão: 30s
- **ID:** RNF3.2

#### RNF 3.3 - Escalabilidade de Armazenamento
- **Descrição:** Sistema cresce sem degradação
- **Critério:**
  - BD suporta terabytes de dados (PostgreSQL)
  - Arquivo de imagens em CDN (escalável infinitamente)
  - Logs arquivados após 1 ano (para performance)
  - Particionamento de tabelas grandes se > 10M rows
- **ID:** RNF3.3

---

### RNF 4. CONFIABILIDADE

#### RNF 4.1 - Disponibilidade
- **Descrição:** Sistema está disponível quando necessário
- **Critério:**
  - SLA: 99.5% (30 min downtime/mês)
  - Horário de funcionamento: 24/7 (ou conforme configuração)
  - Manutenção: notificada com 48h antecedência
  - Backup diário (retenção 30 dias)
  - Restore testado mensalmente
- **ID:** RNF4.1

#### RNF 4.2 - Recuperação de Falhas
- **Descrição:** Sistema recupera gracefully de falhas
- **Critério:**
  - Falha de BD: retry automático 3× com backoff exponencial
  - Falha de API externa: fallback ou modo degradado
  - Falha de email: retry async (não traz usuário)
  - Transações: rollback automático em caso de erro
  - Circuit breaker para serviços externos
- **ID:** RNF4.2

#### RNF 4.3 - Integridade de Dados
- **Descrição:** Dados nunca são perdidos ou corrompidos
- **Critério:**
  - Constraints de integridade referencial
  - Transactions para operações múltiplas
  - Soft delete (não delete permanente)
  - Audit trail para rastrear mudanças
  - Backups testados regularmente
  - Versionamento de schema (migrations Prisma)
- **ID:** RNF4.3

#### RNF 4.4 - Tratamento de Erros
- **Descrição:** Erros são tratados gracefully
- **Critério:**
  - Inputs inválidos: 400 Bad Request com detalhes
  - Não autorizado: 401 Unauthorized
  - Sem permissão: 403 Forbidden
  - Não encontrado: 404 Not Found
  - Erro servidor: 500 com tracking ID
  - Mensagens amigáveis ao utilizador (não stack traces)
  - Logging completo em backend
- **ID:** RNF4.4

---

### RNF 5. USABILIDADE

#### RNF 5.1 - Interface Intuitiva
- **Descrição:** Sistema é fácil de usar
- **Critério:**
  - Navegação clara com menu principal
  - Ações comuns em máximo 2 cliques
  - Ícones universais (procura, home, perfil)
  - Feedback visual para cada ação (loading, sucesso, erro)
  - Tooltips para funções não óbvias
  - Dark mode opcional
- **ID:** RNF5.1

#### RNF 5.2 - Responsividade
- **Descrição:** Interface funciona em todos dispositivos
- **Critério:**
  - Mobile: 480px+
  - Tablet: 768px+
  - Desktop: 1024px+
  - Touch-friendly: botões mínimo 44×44px
  - Sem horizontal scroll em mobile
  - Testes em iOS e Android
- **ID:** RNF5.2

#### RNF 5.3 - Acessibilidade
- **Descrição:** Utilizadores com deficiências conseguem usar
- **Critério:**
  - WCAG 2.1 Level AA
  - ARIA labels para screen readers
  - Contraste mínimo: 4.5:1 para texto
  - Navegação por teclado (Tab, Enter, Esc)
  - Sem dependência de cor apenas
  - Vídeos com legendas (futuro)
- **ID:** RNF5.3

#### RNF 5.4 - Localização
- **Descrição:** Sistema é em português de Angola
- **Critério:**
  - Idioma padrão: português (pt-AO)
  - Moeda: Kz (kwanza)
  - Timezone: UTC+01:00
  - Formato de data: DD/MM/YYYY
  - Formato de hora: HH:mm (24h)
  - Sem gírias brasileiras
- **ID:** RNF5.4

#### RNF 5.5 - Documentação
- **Descrição:** Utilizadores têm ajuda disponível
- **Critério:**
  - Seção Help no menu principal
  - FAQ com mínimo 20 perguntas
  - Tutoriais em vídeo (futuro)
  - Chatbot integrado para ajuda rápida
  - Email de suporte responsivo (< 24h)
  - Base de conhecimento searchable
- **ID:** RNF5.5

---

### RNF 6. COMPATIBILIDADE

#### RNF 6.1 - Compatibilidade de Navegadores
- **Descrição:** Sistema funciona em navegadores comuns
- **Critério:**
  - Chrome 90+ (latest)
  - Firefox 88+ (latest)
  - Safari 14+ (latest)
  - Edge 90+ (latest)
  - Mobile browsers: Chrome Mobile, Safari iOS
  - Sem suporte intencional: IE11 (deprecated)
- **ID:** RNF6.1

#### RNF 6.2 - Compatibilidade de Dispositivos
- **Descrição:** Sistema funciona em dispositivos comuns
- **Critério:**
  - Desktop (Windows, Mac, Linux)
  - Laptop
  - Tablet (iPad, Samsung)
  - Smartphone (iPhone, Android)
  - Sem app nativa (web app responsivo)
- **ID:** RNF6.2

#### RNF 6.3 - Compatibilidade de APIs Externas
- **Descrição:** Integração com serviços não quebra
- **Critério:**
  - Google OAuth: Google suporta
  - Cloudinary: suporta
  - OpenAI: suporta (com retry)
  - Google Gemini: suporta
  - Fallbacks para serviços críticos
- **ID:** RNF6.3

---

### RNF 7. MANUTENIBILIDADE

#### RNF 7.1 - Qualidade de Código
- **Descrição:** Código é limpo e bem organizado
- **Critério:**
  - TypeScript strict mode
  - ESLint com padrão rigoroso
  - Prettier para formatação
  - Máximo de complexity: 10
  - Cobertura de testes: mínimo 70%
  - Sem dead code ou imports não usados
  - Documentação de funções complexas
- **ID:** RNF7.1

#### RNF 7.2 - Estrutura do Projeto
- **Descrição:** Projeto é bem organizado
- **Critério:**
  - Separação clara: components, pages, API, lib, types
  - Naming conventions consistentes
  - Colocação lógica (feature folders opcional)
  - Sem arquivo gigante (máximo 300 linhas)
  - README de setup
- **ID:** RNF7.2

#### RNF 7.3 - Versionamento
- **Descrição:** Histórico de mudanças é rastreado
- **Critério:**
  - Git com commits semânticos
  - Branches: main (prod), develop (dev), feature/*
  - Pull requests com revisão antes de merge
  - Releases taggeadas (v1.0.0)
  - Changelog atualizado
- **ID:** RNF7.3

#### RNF 7.4 - Continuous Integration/Deployment
- **Descrição:** Deploy é automatizado
- **Critério:**
  - GitHub Actions para testes automáticos
  - Deploy automático de push para main
  - Rollback automático se testes falharem
  - Staging environment para teste pré-prod
  - Notifications de deploy
- **ID:** RNF7.4

#### RNF 7.5 - Documentação Técnica
- **Descrição:** Desenvolvedores conseguem manter código
- **Critério:**
  - README completo (setup, estrutura, como rodar)
  - Diagrama de arquitetura
  - Documentação de APIs (Swagger/OpenAPI)
  - Padrões de design documentados
  - Exemplos de requisições/respostas
- **ID:** RNF7.5

---

### RNF 8. OBSERVABILIDADE

#### RNF 8.1 - Logging
- **Descrição:** Sistema registra eventos importantes
- **Critério:**
  - Logger estruturado (winston, pino)
  - Níveis: error, warn, info, debug
  - Todos erros tem stack trace completo
  - Contexto relevante (userId, loanId, etc)
  - Logs não contêm dados sensíveis
  - Retenção: 30 dias para info/debug, 1 ano para error
- **ID:** RNF8.1

#### RNF 8.2 - Monitoramento
- **Descrição:** Operadores conseguem monitorar saúde
- **Critério:**
  - Health check endpoint: GET /health
  - Métricas: CPU, memória, conexões BD
  - Alertas: downtime, slow queries, erro rate > 1%
  - Dashboard (Sentry, DataDog, ou similar)
  - Uptime monitoring (Pingdom, etc)
- **ID:** RNF8.2

#### RNF 8.3 - Error Tracking
- **Descrição:** Erros são centralizados e rastreados
- **Critério:**
  - Integração com Sentry ou similar
  - Stack traces automáticas
  - Deduplikação de erros similares
  - Atribuição de severidade
  - Notificações em slack/email
  - Rastreamento de versão (commit hash)
- **ID:** RNF8.3

---

### RNF 9. SUSTENTABILIDADE

#### RNF 9.1 - Eficiência Energética
- **Descrição:** Sistema é eficiente em recursos
- **Critério:**
  - Code splitting (JS bundles < 500KB)
  - Lazy loading de componentes
  - Imagens otimizadas (WebP, comprimidas)
  - Cache para reduzir requisições BD
  - Timestamps em UTC (sem conversão cliente)
- **ID:** RNF9.1

#### RNF 9.2 - Sustentabilidade Técnica
- **Descrição:** Sistema é projetado para longevidade
- **Critério:**
  - Sem dependências descontinuadas
  - Dependências atualizadas regularmente
  - Testes facilitam refatoração
  - Documentação reduz curva aprendizado novos devs
  - Código sem copy-paste (DRY)
- **ID:** RNF9.2

---

## 🔐 REQUISITOS DE SEGURANÇA

### RS 1. Segurança no Armazenamento

#### RS 1.1 - Criptografia em Repouso
- Dados sensíveis criptografados em BD (AES-256 se necessário)
- Backups criptografados
- Chaves armazenadas em ambiente vars ou key management service

#### RS 1.2 - Segurança do S3/CDN
- Acesso público apenas para imagens/docs aprovados
- Uploads validados (tipo, tamanho, conteúdo)
- Antivírus scan em uploads (futuro)
- Versionamento de objetos para auditoria

### RS 2. Segurança em Trânsito

#### RS 2.1 - Encriptação TLS
- HTTPS obrigatório em produção
- TLS 1.3 ou 1.2
- Certificado válido e renovado automaticamente

#### RS 2.2 - Cabeçalhos de Segurança
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

### RS 3. Autenticação Multifator (Futuro)

#### RS 3.1 - 2FA por Email OTP
- Opcional para contas admin
- Reset de senha envia OTP email

---

## ✅ REQUISITOS DE CONFORMIDADE

### RC 1. Conformidade ISPTEC

#### RC 1.1 - Artigo 10º (Limites de Empréstimo)
- ESTUDANTE: máx 2 livros, 5 dias
- DOCENTE: máx 4 livros, 15 dias
- STAFF: máx 5 livros, 15 dias
- Sistema enforça automaticamente

#### RC 1.2 - Artigo 15º (Renovação)
- Máximo 2 renovações por empréstimo
- Não permite se há reservas
- Sistema valida antes de renovar

#### RC 1.3 - Artigo 20º (Multas)
- Tarifa: 50 Kz/dia de atraso
- Máximo: 1500 Kz (30 dias)
- Bloqueio automático se > 200 Kz

#### RC 1.4 - Artigo 25º (Devoluções)
- Condição é registada
- Danos são avaliados e multados

#### RC 1.5 - Artigo 30º (Documentos)
- Verificação de identificação obrigatória
- Documentos armazenados seguramente
- Acesso apenas a staff autorizado

---

## 📊 MATRIZ DE RASTREABILIDADE

### Funcionalidades por Tipo de Utilizador

| Funcionalidade | Estudante | Docente | Staff | Bibliotecário | Catalogador | Supervisor |
|---|---|---|---|---|---|---|
| Login/Logout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pesquisar livros | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Emprestar | ✓ | ✓ | - | - | - | - |
| Renovar | ✓ | ✓ | - | - | - | - |
| Reservar | ✓ | ✓ | - | - | - | - |
| Pagar multas | ✓ | ✓ | - | - | - | - |
| Agendar formação | ✓ | ✓ | - | - | - | - |
| Chat IA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver recomendações | ✓ | ✓ | - | - | - | - |
| Avaliar livros | ✓ | ✓ | - | - | - | - |
| OCR catalogação | - | - | - | - | ✓ | - |
| Aprovar catalogação | - | - | - | - | - | ✓ |
| Gerenciar utilizadores | - | - | ✓ | ✓ | - | - |
| Gerenciar livros | - | - | - | ✓ | - | - |
| Gerenciar empréstimos | - | - | ✓ | ✓ | - | - |
| Configurações sistema | - | - | - | ✓ | - | - |
| Relatórios | - | - | - | ✓ | - | ✓ |
| Auditoria | - | - | - | ✓ | - | ✓ |

---

## 📋 SUMÁRIO EXECUTIVO

### Total de Requisitos
- **Requisitos Funcionais:** 85+ requisitos distribuídos em 15 categorias
- **Requisitos Não Funcionais:** 35+ requisitos distribuídos em 9 categorias
- **Requisitos de Segurança:** 8+ requisitos específicos
- **Requisitos de Conformidade:** 5+ artigos do regulamento ISPTEC

### Gestão de Requisitos
- Cada requisito tem ID único (RF/RNF/RS/RC + número)
- Cada requisito tem prioridade (Alta/Média/Baixa)
- Rastreabilidade completa entre casos de uso e requisitos
- Critérios de aceitação explícitos

### Próximos Passos
1. Validação deste documento com stakeholders
2. Criação de testes automatizados baseados em critérios de aceitação
3. Planejamento de sprints com base em prioridades
4. Implementação incremental (MVP primeiro)

---

**Documento Versão:** 1.0  
**Data de Criação:** Fevereiro 2026  
**Próxima Revisão:** Depois do MVP (Março 2026)

---

*Este documento é controlado e versionado no repositório GitHub do projeto.*
*Última atualização automática: $(date)*

