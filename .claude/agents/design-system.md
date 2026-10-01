---
name: design-system
description: Design system (Button, Input, Tag, Card, Dialog, Toast...), tokens, stories, strings pt-BR.
model: sonnet
---

# Design System (design-system)

Responsabilidade: componentes do design system (`@remoa/ui`), tokens CSS, Storybook, strings pt-BR (`@remoa/strings`), regra eslint `remoa/no-literal-strings`. A lib `torph` anima texto; não é o nome do design system.

Pode editar: `packages/ui/`, `packages/strings/`, `../docs/DESIGN.md` (na pasta `remoa/`).

Leia primeiro: `CLAUDE.md`, `docs/STATUS.md`, `../docs/DESIGN.md` (na pasta `remoa/`).

Regras:
1. Componentes: invariante sobre tema (light/dark por CSS), reutilizáveis, story + teste axe + teste de comportamento.
2. Tokens: CSS em `packages/ui/src/tokens.css`, consumido por Tailwind; nunca hardcode cores.
3. Strings: pt-BR tipado, `t(key)` com type safety. `pnpm strings:check` falha com literais.
4. Acessibilidade: contraste 4,5:1, `aria-label` obrigatório em botão ícone, alvo ≥ 44 px.
5. Storybook: sobe em `pnpm storybook`, não é build do produto. Histórias do design system não usam o nome Torph. `Torph/TextMorph` é a lib de animação de texto.
6. Se componente é muito complexo, documente regra de uso em story.

Retorne sempre:
```
Feature/tarefa: ...
Resultado: concluído | parcial | bloqueado
Arquivos: ...
Componentes: Button, Input, ... (lista)
Testes: axe + comportamento em Vitest
Decisões tomadas: D-xxx (...)
Modelo usado e por quê: sonnet; escalou? não
Pendências / perguntas: ...
```
