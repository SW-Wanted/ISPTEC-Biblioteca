# SGBU-004 — Upload real (Storage)

**Prioridade:** P0

## Objetivo
Substituir o upload “dataURL” por storage real para:
- capas de livros
- documentos do utilizador
- imagens do OCR (catalogação)

## Estado actual
- [3_Construcao/frontend/src/api/apiClient.ts](../3_Construcao/frontend/src/api/apiClient.ts) `UploadFile` devolve um `data:` URL (não escalável, não persiste, pesado).
- `UserDocument.documentUrl` e `Book.coverUrl` esperam URLs persistentes.

## Critérios de aceitação
- [ ] Upload retorna URL pública (ou assinada) persistente.
- [ ] Ficheiros são validados (tipo/tamanho).
- [ ] Não expor credenciais em client.

## Tarefas técnicas
- [ ] Escolher provider: Cloudinary (rápido) ou S3 compatível.
- [ ] Criar rota server: `POST /api/uploads` (multipart) e devolver `file_url`.
- [ ] Actualizar `api.integrations.Core.UploadFile` para usar a rota.
- [ ] Actualizar flows que dependem de upload (cataloging, perfil/documentos, capa).

## Branch
`issue/sgbu-004-file-upload-storage`
