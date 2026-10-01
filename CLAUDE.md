# CLAUDE.md — remoa-frontend

Frontend do Remoa: app Next.js 15 (`apps/web`) e o Torph (`packages/ui` + `packages/strings`). Fala com o Supabase Auth direto (sessão SSR) e com a API do `remoa-backend` para dados.

Regras, vocabulário e DoD do produto: `../CLAUDE.md`, `../AGENTS.md`, `../docs/STATUS.md`, `../docs/DESIGN.md` e `../docs/features/Fxx-*.md`. Leia antes de qualquer tarefa.

## Mapa

```
apps/web/            Next.js App Router: (marketing) (auth) (app) (mobile) (editorial); features/<x>/
packages/ui/         Torph UI: Button, IconButton, Input, Dialog, Toast... + tokens.css + Storybook
packages/strings/    Torph strings: pt-BR.ts, t(), regra eslint remoa/no-literal-strings
.claude/agents/      frontend, frontend-deep, design-system
```

`@remoa/contracts` vem de `../remoa-backend/packages/contracts` (`link:`): instale o backend antes (`pnpm -C ../remoa-backend i`).

## Comandos

```
pnpm i
pnpm env:local          gera apps/web/.env.local a partir do Supabase local do backend
pnpm dev                http://localhost:3000
pnpm check              lint + typecheck + test
pnpm strings:check      falha com texto literal em JSX
pnpm test:e2e           Playwright (Supabase do backend de pé e migrado)
pnpm storybook          Torph UI
```

## Regras deste repo

- Nada de acesso a banco aqui. Dados vêm da API do backend (`/v1/*` com o access token do Supabase); Server Actions só embrulham essas chamadas.
- Toda UI em Torph; todo texto via `t()`; componentes Torph sem `className`.
- Redirects pós-login só por `safeNext()` (`src/lib/safe-next.ts`).
