# SGBU-002 — Recuperação de senha via email

**Prioridade:** P0

## Objetivo
Implementar fluxo de recuperação de senha (RF003):
- solicitar reset
- receber link com token
- definir nova senha

## Estado actual
- Página [3_Construcao/frontend/src/app/forgot-password/page.tsx](../3_Construcao/frontend/src/app/forgot-password/page.tsx) tem `TODO` e apenas simula envio.
- Não existe model/tabela de token no Prisma (vai exigir migração).

## Critérios de aceitação
- [ ] Utilizador submete email e recebe email (ou placeholder dev) com link de reset.
- [ ] Token expira (ex: 30-60 min) e é de uso único.
- [ ] Senha é guardada com hash.
- [ ] Respostas não revelam se o email existe (anti-enumeration).

## Tarefas técnicas
- [ ] Adicionar model `PasswordResetToken` no Prisma + migração.
- [ ] Criar rotas:
  - `POST /api/auth/password-reset/request`
  - `POST /api/auth/password-reset/confirm`
- [ ] Integrar provider de email (Resend recomendado) com fallback de log em dev.
- [ ] Ajustar UI: 
  - `forgot-password` passa a chamar API real
  - criar página `reset-password?token=...`

## Branch
`issue/sgbu-002-password-reset`

## Notas
Se a BD estiver partilhada, combinar com a equipa antes de aplicar migrations.
