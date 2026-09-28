# Revisão final — fase 2c, controles de demo e captura automática

Branch `worktree-f2c-controles`, de `c70763f` a `60f7ba0`. Plano: `docs/superpowers/plans/2026-09-21-aula-usp-f2c-controles-e-captura.md`.

## O que a branch entrega

- **Controles do sistema** para demos: `AulaUSP.controles` cria `button.controle`, `input.controle[type=range]` e `output.leitura` com o estilo da spec 7.2 (retangular, contorno de 2 px, Geist 600 20 px; ativo em campo tinta com texto papel; trilho de 2 px e cursor quadrado de 16 px; leitura em Geist Mono 20). Os controles são criados pela demo, não escritos no fonte (spec 5.5 e 6.7).
- **Captura automática no build** (`build/captura.mjs`): toda demo sem `img.estatico` e sem `capturar()` é fotografada depois de `iniciar()` e de `data-captura-ms` (padrão 3000 ms), numa página própria por demo, e a foto entra no HTML construído e no PDF. Uma captura que falha é dita com o nome da demo, no terminal e em `validacao.json`.
- `recursos.demo-sem-estatico` com o eixo de modo da spec 9.2: no navegador acusa; no build se cala, porque o build fotografa, salvo falha de captura.

**Medido no fim:** `npm test` 604/604; `npm run test:integracao` 240/240.

## A revisão

- **Critical — a captura dependia da fase da aula.** Uma aula sem gráfico, diagrama nem `data-captura-ms` era de fase 1 e não era fotografada. A causa foi o brief do coordenador, que enquadrou a "fase" por aula (criada na 2a só para liberar vocabulário) como se fosse a fase do projeto. As spec 3.3, 6.7, 9.2 e 12 falam da fase do projeto. Corrigido: todo build fotografa toda demo sem imagem. Medido numa aula pura de fase 1: "1 de 1 demo(s) capturada(s)", 0 avisos.
- **Important — erro de uma demo atribuído a outra.** Uma página para todas as demos deixava o timer de uma matar a captura da vizinha. Corrigido com uma página por demo.
- Menores: demos sem foto quando a composição falha passam a ser nomeadas; `aria-pressed` só em botão de alternância; textos do guia.
