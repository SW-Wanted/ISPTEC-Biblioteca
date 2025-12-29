# 📚 Sistema de Gestão de Biblioteca Universitária  
**Projeto Final - Engenharia de Software I (ISPTEC)**  
**Ano Letivo:** 2025/2026  

---

## 🧠 Visão Geral do Projeto
O **Sistema de Gestão de Biblioteca Universitária** tem como objetivo modernizar e digitalizar os processos da biblioteca do ISPTEC, permitindo maior eficiência na gestão de livros, membros e empréstimos.  
O projeto segue a metodologia **RUP (Rational Unified Process Estendido - RUPE)**, garantindo um desenvolvimento iterativo e incremental, desde a análise de requisitos até à entrega do sistema funcional.

---

## 🎯 Objetivos Principais
- Automatizar o controlo de **empréstimos, devoluções e reservas** de livros.  
- Permitir o **cadastro inteligente de livros** a partir de fotografias (OCR).  
- Implementar **IA** para recomendação de livros e chatbot de apoio ao utilizador.  
- Aplicar metodologias de **Engenharia de Software** (RUP) em todas as fases.  
- Desenvolver um sistema funcional, robusto e documentado.

---

## 🧩 Funcionalidades Mínimas
1. Cadastro de livros, autores e categorias.  
2. Cadastro de membros da biblioteca (associado à matrícula académica).  
3. Empréstimo e devolução de livros com controlo de prazos e multas.  
4. Reserva de livros indisponíveis, com lista de espera.  
5. Renovação de empréstimos (máx. 2 vezes, sem reservas pendentes).  
6. Registro de livros via captura fotográfica com extração automática (OCR).  
7. Relatórios básicos (livros emprestados, reservas, membros ativos).  
8. Recomendação de livros e chatbot inteligente.  
9. Funcionalidades inovadoras propostas pelo grupo (UX/UI, APIs, automação, etc).

---

## 🧭 Metodologia: RUPE (Rational Unified Process Estendido)

| Fase              | Entregas Principais                    | Objetivo                                      |
|-------------------|----------------------------------------|-----------------------------------------------|
| **1️⃣ Iniciação**  | Documento de visão, BPMN dos processos | Entender o negócio e planejar o projeto       |
| **2️⃣ Elaboração** | Casos de uso, modelo de domínio        | Definir requisitos e arquitetura inicial      |
| **3️⃣ Construção** | Diagramas UML, protótipo e código      | Implementar e integrar funcionalidades        |
| **4️⃣ Transição**  | Relatório final, sistema funcional     | Entregar, testar e documentar o produto final |

---

## 🧱 Estrutura do Repositório
```bash
biblioteca-universitaria/
│
├── 1_Iniciacao/
│   ├── BPMN/
│   │   ├── BPMN 01 - Catalogação de Obras (AS IS).bpmn
│   │   ├── BPMN 02 - Catalogação de Obras (TO BE).bpmn
│   │   ├── BPMN 03 - Cadastro de Membros  (AS IS).bpmn
│   │   ├── BPMN 04 - Cadastro de Membros  (TO BE).bpmn
│   │   ├── BPMN 05 - Empréstimo de livros (AS IS).bpmn
│   │   ├── BPMN 06 - Empréstimo de livros (TO BE).bpmn
│   │   ├── BPMN 07 - Relatorios de Livros (AS IS).bpmn
│   │   ├── BPMN 08 - Relatorios de Livros (TO BE).bpmn
│   │   ├── BPMN 09 - Reserva de Livros    (AS IS).bpmn
│   │   ├── BPMN 10 - Reserva de Livros    (TO BE).bpmn
│   │   ├── BPMN 11 - Renovacao de Livros  (AS IS).bpmn
│   │   └── BPMN 12 - Renovacao de Livros  (TO BE).bpmn
│   ├── Fase1_Relatorio.docx
│   └── Fase1_Relatorio.pdf
│
├── 2_Elaboracao/
│
├── 3_Construcao/
│
├── 4_Transicao/
│
└── README.md
```

## 💻 Tecnologias e Ferramentas
| Categoria                                | Ferramenta / Tecnologia                                |
| ---------------------------------------- | ------------------------------------------------------ |
| **Modelagem de Processos (BPMN)**        | Camunda Modeler                                        |
| **Planeamento e Cronograma**             | MS Project / ProjectLibre                              |
| **Documentação**                         | Microsoft Word / LibreOffice Writer                    |
| **Versionamento**                        | GitHub                                                 |
| **Comunicação e Reuniões**               | Discord                                                |

## 🧩 Funcionalidades Inovadoras Propostas
- 🔍 Reconhecimento automático de texto (OCR) para cadastro de livros.
- 🤖 Chatbot para suporte e busca de livros.
- 📊 Dashboard com análise do uso da biblioteca.
- 🌐 Integração com APIs externas de catálogo (Google Books API).
- 🧭 Sistema de recomendação inteligente baseado em histórico de leitura.

## 📅 Cronograma de Entrega
| Entrega       | Data           | Conteúdo                               | Peso |
| ------------- | -------------- | -------------------------------------- | ---- |
| Entrega 1     | 10–16 Nov 2025 | BPMN inicial                           | 5%   |
| Entrega 2     | 24 Nov 2025    | Casos de Uso + Modelo de Domínio       | 10%  |
| Entrega 3     | 29 Dez 2025    | Diagramas UML                          | 10%  |
| Entrega 4     | 05–11 Jan 2026 | Documento de Requisitos + Protótipo    | 15%  |
| Entrega Final | 12–18 Jan 2026 | Projeto funcional + Relatório + Defesa | 60%  |

## 👥 Equipa de Desenvolvimento
| Nome     | Função                           | E-mail                                            |
| -------- | -------------------------------- | ------------------------------------------------- |
| Emanuel dos Santos | Gestor de Projectos | [20230429@isptec.co.ao](mailto:20230429@isptec.co.ao) |
| Carlos Tchípia     |      Pesquisador    | [20221196@isptec.co.ao](mailto:20221196@isptec.co.ao)  |
| Líria Bá           | Analista de Negócio | [20230237@isptec.co.ao](mailto:20230237@isptec.co.ao)  |
| José Tala          |       Modelador     | [20232641@isptec.co.ao](mailto:20232641@isptec.co.ao)  |
