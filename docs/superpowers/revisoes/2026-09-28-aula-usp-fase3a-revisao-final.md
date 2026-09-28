# Revisão final — fase 3a, publicação (parte local)

Branch `worktree-agent-a95f3c71b72edc4ea`, de `a8bc953` a `99eedbb`. Plano: `docs/superpowers/plans/2026-09-28-aula-usp-fase3-publicacao.md`, seção 3a. Nenhum pedido de rede na execução.

## O que a branch entrega

- **`package.json` publicável:**
  - `files` com negações para `exemplos/*/dist/` e `modelos/*/dist/`;
  - sem `private`;
  - MIT, `author`, `repository`, `homepage`;
  - versão **1.0.0**, com `dist/`, `pacotes/` e as tags regerados.

  Nas tags há uma versão só: 39 ocorrências de `aula-usp@1.0.0`. `dist/aula-usp.js` tem 11 `sha384-`.
- **O tarball:** 128 arquivos, 2,11 MB empacotados e 4,07 MB desempacotados. Antes eram 465 arquivos e 7,8 MB.
- **Duas guardas novas:**
  - `tests/unit/publicacao.test.mjs` confere o fecho de imports da CLI contra o tarball e confirma que nada de desenvolvimento vaza;
  - `tests/integracao/instalacao.test.mjs` extrai o tarball, monta só a árvore de produção no arranjo içado do npm, e roda `novo`, `validar`, `servir` e `build`, com PDF, na aula nova e na aula-exemplo. Também confere que `dist` e `pacotes` recusam com código 2.
- **`LICENSE`:** MIT, com as marcas institucionais e as fontes OFL numa seção à parte.
- **`build/conferir-cdn.mjs`:** recebe a função de busca por parâmetro e é testado só com dublês. Roda na 3b.
- **O roteiro de aceite da fase 3** (claude.ai e ChatGPT).

## Defeitos reais que o teste de instalação achou

1. **`fontkit` era devDependency, mas o `build` o importa** (cobertura das fontes, etapa 4). Instalado, o `build` saía com 2. Passou a dependência de produção, e a spec 8.2 foi corrigida.
2. **`build/fontes-embutidas.mjs` montava `<raiz>/node_modules/katex/…`.** No pacote instalado por `npx` ou por `npm install` num projeto, o npm iça o katex para o lado do pacote, e o `build` de toda aula com TeX saía com 2. Agora o caminho sai de `import.meta.resolve`.

## O flake de `codigo.test.mjs:36`

A causa é o limite de 500 ms por linha do Shiki (`tokenizeTimeLimit`). Com a CPU disputada, a primeira linha de JavaScript levava de 560 a 660 ms, e o resto da linha saía sem destaque. O mesmo corte afetava o build e um projetor lento.

A correção está no componente, com `tokenizeTimeLimit: 0`. O que o relógio protegia, linha longa demais, o validador já barra com os limites `codigo.linhas` e `codigo.colunas`.

| condição | falhas antes | falhas depois |
|---|---|---|
| máquina ociosa | 0 em 10 rodadas | — |
| CPU disputada | 3 em 8 | 0 em 12 |
| `npm test` seguidos | — | 0 em 20 |

## A revisão

- **Important, corrigido nesta rodada:** o `README.md`, que vira a página do pacote no npm, ainda descrevia a fase 1:
  - a fase 2 como "não implementada" e a publicação como inexistente;
  - 12 arquivos de `dist/` (são 14) e 25 de `pacotes/` (49);
  - 11 arquivos de guia (16) e 33 limites (34);
  - 47 regras estáticas e 4 de carga (são 48 e 7).

  Corrigido em `99eedbb`, com os números remedidos.
- **Aberto para a 3b:**
  - a instalação foi simulada com links simbólicos. Nem `npm install -g` nem `npx` sobre o pacote publicado foram medidos, e isso entra no passo E3;
  - o `servir` instalado só teve o HTML conferido, sem um navegador carregando a aula.
- **Divergência aceita:** a preservação das subpastas de `conhecimento/` fica na tabela do roteiro, não no `rodada-*.json`, que é o array cru do `--json`.

**Medido no fim:** `npm test` 626/626. `npm run test:integracao` foi rodado depois do merge; o número está no commit de merge.
