# SGBU-015 — Serviços especiais (solicitações)

**Prioridade:** P2

## Objetivo
Implementar RF023/RF024/RF025:
- levantamento bibliográfico
- catalogação na fonte
- formação

## Estado actual
- Backend suporta `SpecialRequest` (GET/POST), mas:
  - falta gestão por staff (alterar status, responder)
  - UI envia campos não suportados (ex: `user_name`, `status` como string livre)
  - notificação criada via endpoint `Notification` não suporta `type/status/action_type`

## Critérios de aceitação
- [ ] Utilizador cria solicitação e acompanha status.
- [ ] Staff consegue aceitar, colocar em progresso e concluir com resposta.
- [ ] Notificação é enviada ao utilizador quando houver actualização.

## Tarefas técnicas
- [ ] Normalizar `type` (enum ou strings controladas) e mapear para UI.
- [ ] Criar `PATCH SpecialRequest` para staff actualizar status/resposta.
- [ ] Ajustar UI para payload suportado.

## Branch
`issue/sgbu-015-special-requests`
