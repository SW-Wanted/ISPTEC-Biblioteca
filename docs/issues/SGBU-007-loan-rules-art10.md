# SGBU-007 — Regras completas de empréstimo (Artigo 10º)

**Prioridade:** P1

## Objetivo
Implementar RF008 com precisão:
- limites por tipo (já existe)
- 1 obra por título
- livros de cedência por dia (1 dia)
- CD/DVD (2 dias úteis)

## Estado actual
- Backend valida apenas `maxBooks` e `totalFines`.
- Schema não tem ainda um campo explícito para distinguir “cedência diária”/CD/DVD.

## Critérios de aceitação
- [ ] Não permitir 2 cópias do mesmo título para o mesmo utilizador.
- [ ] Suportar política “cedência diária” (1 dia) e “CD/DVD” (2 dias úteis).
- [ ] Due date calculado conforme política.

## Tarefas técnicas
- [ ] Propor extensão do schema `Book` (ex: `materialType` enum e `loanPolicy`).
- [ ] Actualizar seed e UI de gestão de livros para suportar a classificação.
- [ ] Actualizar lógica de criação de empréstimo.

## Branch
`issue/sgbu-007-loan-rules-art10`

## Nota
Isto pode exigir migração — coordenar se BD for partilhada.
