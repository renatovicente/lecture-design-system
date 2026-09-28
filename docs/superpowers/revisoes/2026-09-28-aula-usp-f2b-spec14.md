# A verificação da spec 14 — o WASM do Graphviz dentro de um artifact

A tabela de riscos da spec 14 manda verificar no início da fase 2 se a política de segurança dos artifacts do Claude deixa compilar o WASM do Graphviz; se bloquear, o modo navegador usaria ELK em JavaScript puro, com o Graphviz só no build. Este é o registro dessa medição.

## O que foi servido

`@hpcc-js/wasm-graphviz@1.29.1` empacotado num script só, de 819 KB — o `dist/index.js` do próprio pacote, que já traz o WASM embutido (sem arquivo `.wasm` à parte e sem `fetch` do WASM). Servido dentro de um artifact real do Claude, não num HTML local: a política só existe lá.

## O resultado

Medido pelo autor em 2026-09-25: **o WASM compila e desenha**. `Graphviz.load()` terminou, e um DOT de 3 nós saiu como SVG na página do artifact.

## A consequência

- O plano B da spec 14 (ELK no navegador) **não** entra: o mesmo Graphviz desenha nos dois modos, navegador e build.
- O segundo risco da mesma tabela, "Graphviz sem WASM embutido", não se materializa: o pacote já embute, e o satélite `aula-usp-diagramas.js` não embute de novo (spec 7.2).
- As três formas de bloqueio que o plano da 2b nomeia — CSP sem `wasm-unsafe-eval`, `WebAssembly.instantiate` sobre bytes embutidos e o tamanho do script — não bloquearam nesta medição, com um script do tamanho do pacote inteiro.
