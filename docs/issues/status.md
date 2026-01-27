# Status

## Done (já resolvido)

- Qualidade: lint sem warnings/erros; build a passar.
- NextAuth dev: corrigido erro de JSON/HTML em requests (CLIENT_FETCH_ERROR) e compatibilidade com Next 16 (searchParams Promise).
- Ratings: removidos ratings “fake” de seed; estrelas só aparecem com reviews reais.
- Permissões: utilizadores autenticados (não-admin) conseguem listar livros; leituras de Member/Loan limitadas ao próprio (self-service).
- BookReview: `upsert` para evitar erro Prisma `P2002` (bookId,userId).
- Copy: endpoint de leitura implementado (acabou 404 em detalhes do livro).

## In Progress

- (vazio)

## Backlog

Ver [index.md](./index.md)
