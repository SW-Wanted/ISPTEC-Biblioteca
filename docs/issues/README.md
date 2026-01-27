# Backlog de Issues (SGBU)

Este directório contém as **issues em formato Markdown** para o projecto SGBU.

> Nota: não estou a criar issues directamente no GitHub porque aqui no VS Code não tenho acesso à API de criação de issues. Estes ficheiros servem como *source of truth* (e podem ser copiados para issues reais depois).

## Como usar

1. Escolher uma issue em [index.md](./index.md)
2. Criar uma branch dedicada:

```bash
git checkout -b issue/sgbu-XXX-slug
```

3. Implementar (código + testes + docs)
4. Abrir PR e preencher o template
5. Marcar a issue como **Done** no [status.md](./status.md)

## Convenções

- **IDs:** `SGBU-001`, `SGBU-002`, ...
- **Branches:** `issue/sgbu-###-slug-curto`
- **Prioridade:** `P0` (bloqueia), `P1` (alta), `P2` (média)
- **Definition of Done (DoD):**
  - Critérios de aceitação cumpridos
  - Lint e build passam (`npm run lint`, `npm run build`)
  - Logs sem dados sensíveis
  - UI com estados de loading/erro
  - Documentação actualizada
