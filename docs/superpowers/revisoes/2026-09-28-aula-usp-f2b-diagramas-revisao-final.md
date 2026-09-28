# Revisão final — fase 2b, diagramas

Branch `worktree-f2b-diagramas`, de `48d2eee` a `e907406`. Plano: `docs/superpowers/plans/2026-09-21-aula-usp-f2b-diagramas.md`. Registro da spec 14: `2026-09-28-aula-usp-f2b-spec14.md`.

## O que a branch entrega

- `figure.diagrama`: o DOT é compilado pelo Graphviz (`@hpcc-js/wasm-graphviz` 1.29.1, WASM embutido) e o SVG é escrito pelo sistema, com o estilo da spec 7.2 — nós retangulares de contorno 2 px, texto Geist 20, `foco` em campo amarelo, `ativo` em azul. O mesmo módulo nos dois modos; **0 px de diferença** entre navegador e build.
- Direção padrão `rankdir=LR`; um `rankdir` do autor vence.
- O satélite `aula-usp-diagramas.js` (~800 KB) com `integrity`, provado por corrupção no Chrome, sem nenhum pedido de rede.
- `recursos.dot` compila de verdade e recusa o que o sistema desenharia errado; `recursos.diagrama-grande` avisa acima de 15 nós, contados no resultado compilado. **As 64 regras do contrato estão implementadas.**

**Medido no fim:** `npm test` 588/588; `npm run test:integracao` 231/231.

## A revisão

Sem Critical. Dois Important, os dois fechados numa rodada única:

- **I1 — diagrama alto encolhia pela altura** no layout `figura` (10 nós em cadeia saíam a 13,3 px), e a mensagem mandava o autor "para o layout figura", onde ele já estava. Agora a direção padrão é LR e a mensagem distingue o encolhimento pela altura.
- **I2 — atributos do autor ignorados em silêncio que desenhavam errado**: `style=invis` saía visível, `shape=record` perdia as divisões, `fontsize` mudava a caixa e não o texto. Agora são recusados, com o porquê; cor, espessura e seta continuam descartadas, e o guia diz qual é qual.

## O desvio do plano, aprovado

O plano dizia "estilizar o SVG do Graphviz". O implementador pede só a geometria (saída JSON) e escreve o SVG do zero. Cumpre a spec 7.2 ("o layout é do Graphviz; o estilo é imposto depois") melhor que o plano: o SVG do Graphviz traz `<title>`, ids que colidem entre dois diagramas, fundo branco e Times 14.

## Fica para o autor

1. **Enquadramento do diagrama pequeno no layout `figura`.** Ele sai no tamanho natural (texto 20 px), encostado no canto superior esquerdo, e deixa mais da metade do slide vazia. O gráfico, ao contrário, ocupa a figura inteira.
2. **Metas de tamanho na spec 11.2** para `aula-usp-graficos.js` e `aula-usp-diagramas.js`: hoje estão só em `tamanhos.test.mjs`.
