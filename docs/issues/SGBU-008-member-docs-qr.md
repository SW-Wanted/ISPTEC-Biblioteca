# SGBU-008 — Documentos do membro + QR Code de credencial

**Prioridade:** P1

## Objetivo
Implementar RF001/RF002:
- upload de documentos
- verificação
- QR Code de credencial

## Estado actual
- Existe model `UserDocument` e campos `qrCode` no `User`.
- Falta upload real (depende de SGBU-004).
- Falta UI/fluxo para enviar/validar documentos.

## Critérios de aceitação
- [ ] Utilizador consegue anexar documentos e ver estado (pendente/verificado).
- [ ] Staff consegue verificar e marcar `isVerified`.
- [ ] QR Code é gerado para utilizador activo.

## Tarefas técnicas
- [ ] Criar rotas: `POST /api/members/documents`, `PATCH /api/members/documents/{id}`.
- [ ] Gerar QR Code (string) no server e guardar em `User.qrCode`.
- [ ] UI em perfil: upload + estado + QR Code.

## Branch
`issue/sgbu-008-member-docs-qr`
