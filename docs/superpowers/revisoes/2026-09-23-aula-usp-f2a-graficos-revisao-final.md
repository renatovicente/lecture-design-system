# Revisão final — fase 2a, gráficos

Branch `worktree-f2a-graficos`, de `800150e` a `47b0078`. Plano: `docs/superpowers/plans/2026-09-21-aula-usp-f2a-graficos.md`.

## O que a branch entrega

- `figure.grafico`: a especificação em JSON vira SVG por `componentes/graficos.js`, o mesmo módulo no navegador e no build. Quatro tipos (`linha`, `barras`, `dispersao`, `histograma`), escala linear ou log por eixo, até três séries, cores e rótulos da spec 7.2, números de eixo em pt-BR.
- O satélite `aula-usp-graficos.js` (d3-array, d3-scale e d3-shape, versões exatas) com `integrity` no import map, provado por corrupção no Chrome.
- As regras `recursos.grafico` (estática) e `recursos.csv` (carga), e o limite `grafico.series` no contrato.
- `assets/aula-usp.mplstyle`, gerado dos tokens.
- A fase 2 nos dois lados, derivada de `contrato.blocosDeCorpoFase2` por um helper único; pré-renderização de gráficos e leitura de CSV no build; erros de render em `validacao.json`.
- Um gráfico no espécime, idêntico nos dois modos: **0 pixel de diferença** entre navegador e build.
- `figure.diagrama` recusado com mensagem legível até a 2b.

**Medido no fim:** `npm test` 534/534; `npm run test:integracao` 217/217.

## A revisão

A revisão final da branch inteira achou 2 Critical e 6 Important que as revisões por tarefa não podiam ver, todos medidos:

- **C1** — um `figure.diagrama` ligava a fase 2 e passava por `validar` e `build` com 0 erros, com a figura vazia.
- **C2** — o exemplo literal da spec 7.2 (`"dados": "data/erro.csv"`) falhava no build, com uma mensagem que mandava corrigir um JSON certo; não havia leitor de CSV.
- **I1** — o guia dizia "gráfico: fase 2, erro hoje" e, na mesma página, mostrava um gráfico como exemplo canônico.
- **I2** — a regra de fase repetia o contrato em código, em duas cópias.
- **I3** — o "Geist Mono 14" do gráfico valia em unidades do `viewBox`: numa coluna estreita o texto saía com 8 px, e a composição não via.
- **I4** — erros decidíveis sem carregar nada só apareciam no build, em mensagens cruas do JavaScript.
- **I5, I6** — contagens velhas no `AGENTS.md`, e uma fixture que tinha perdido a razão de existir.

## O que foi feito depois desta revisão

Os 14 achados foram corrigidos numa rodada única e verificados por uma re-revisão escopada, que mediu C1, C2, I3 e I4 pela CLI com Chrome: 14 de 14 resolvidos.

Rodar a suíte de integração **inteira** — o que ninguém tinha feito nesta branch — acusou mais duas falhas, vindas do gráfico do espécime. Uma derrubou uma decisão do coordenador: as nove classes do SVG gerado estavam fora do contrato, e existia, sim, uma guarda que valida o documento renderizado. As classes foram para `contrato.classesDoSistema`.

**Ficou em aberto, para o autor decidir:**

1. **Um gráfico com `dados` em CSV não passa pela composição do build.** A etapa 5 mede o fonte com o runtime de navegador, que não lê CSV. Medido: numa coluna `4-4-4`, `build` sai com 0 erros e o SVG tem texto a 8 px. Com dados inline, o mesmo gráfico é acusado.
2. **A spec 4.3 foi editada durante a correção.** Texto dentro de SVG deixou de ficar fora de `composicao.tamanho-minimo` e passou a ser medido no tamanho em que aparece no palco. Efeitos: um gráfico em coluna de 4 fica, na prática, proibido; e `vocabulario.azul-svg` continua medindo em unidades do `viewBox`, o que dá duas unidades para o mesmo "px de texto de SVG".

## O que a branch ensinou

- **Três afirmações confiantes estavam erradas, e nenhuma ferramenta pegava.** Um relatório chamou de "ambiental" uma falha determinística: o hash de uma fixture tinha ficado velho, e dois testes estouravam 30 s. Uma legenda do espécime dizia a cor errada de uma série, e virou o exemplo canônico do guia nos três pacotes. Um erro de render era devolvido e nunca lido.
- **Rodar só os arquivos de teste escolhidos deixou passar duas regressões.** A suíte de integração inteira custa minutos. Custou mais não rodá-la.
- **Um conserto trocou o sinal do defeito.** Duas casas decimais apagavam o domínio pequeno. Quatro dígitos significativos resolveram esse caso e apagaram o domínio grande. As duas versões fixavam a precisão sem olhar o domínio.
