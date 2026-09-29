# Revisão final — gerar (1.3.0)

Branch `worktree-agent-aa0989bcb930581da`, de `96de89d` ao commit da correção. Plano: `docs/superpowers/plans/2026-09-29-aula-usp-gerar.md`. Spec: `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`, seção 6.

## O que a branch entrega

- **`montar/roteiro.js`:** o parser e o gerador do roteiro em markdown, puros e sem `node:`, consultando o contrato para saber o que cada layout aceita.
- **`aula-usp roteiro <arquivo.md> <pasta>`:**
  - copia as figuras para `img/`;
  - usa a tag do runtime do modelo instalado;
  - não escreve nada quando há erro de roteiro;
  - roda `validar` ao fim;
  - é determinístico.
- **A skill `aula-usp-gerar`:** lê PDF, PPTX, Beamer e aulas do Aula USP, escreve o roteiro e para para o autor aprovar; depois gera, valida, avalia e corrige.
- **O guia:** a seção do roteiro, com a guarda de que todo exemplo dela passa pelo parser e pelo gerador.
- **Versão 1.3.0.**

## A revisão

- **Important, corrigido: o guia dizia que o pacote não estava publicado.** Os capítulos 10, 70, 71, 72 e 73 e as fontes de `skill.md` e de `agents-disciplina.md` mandavam usar `npm link` e diziam que a tag da CDN não resolvia. Isso estava dentro dos pacotes para agentes desde a 1.0.0.
  - Reescrito com o que foi medido: o pacote está no npm; a CDN foi conferida em cada versão; o artifact foi exercitado uma vez, com o 1 px da capa corrigido na 1.0.1 e ainda sem nova rodada; o ChatGPT segue sem aceite.
  - O uso da CLI no capítulo 70 ganhou `avaliar`, `slide` e `roteiro`.
- **Important, corrigido: o exemplo da spec 6.1 não validava limpo.** Com `video: canto`, o slide `#variancia` entrava no canto. O defeito era do exemplo, escrito pelo coordenador na spec, e não do gerador. A meta saiu da spec, da fixture e do README. O caso do canto continua preso no teste de integração, com a meta acrescentada pelo teste.
- **Aceitas como estão:**
  - `fonte:` em slide de figura ou dentro de colunas é erro de roteiro, porque o contrato não aceita `p.fonte` ali;
  - `próxima:` ganha o prefixo "Próxima aula: ";
  - o `curto` automático é cortado na palavra;
  - um `{#id}` explícito repetido é erro.
- **Registrado:** num primeiro run, `captura.test.mjs` estourou o tempo ao abrir o Chrome, e não reproduziu depois.

## Medido no fim

`npm test` 808/808, `npm run test:integracao` 271/271.

## Aberto

Os roteiros de aceite `tests/aceite/gerar.md`, `corrigir.md` e `avaliar.md` são do autor.
