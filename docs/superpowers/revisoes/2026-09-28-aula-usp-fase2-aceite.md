# Aceite da fase 2 — guia, pacotes e `exemplos/regressao-linear/`

Branch `worktree-f2d-guia-aceite`, a partir de `ce494e9`. Plano: `docs/superpowers/plans/2026-09-21-aula-usp-f2d-guia-pacotes-e-aceite.md`, corrigido pelo brief da 2d.

## O critério, na letra

Spec 12, fase 2: *"Aceite: testes verdes e essa aula validada, com uma demo sem imagem própria capturada no PDF."* "Essa aula" é `exemplos/regressao-linear/` (spec 10.3: "usa gráfico, diagrama e demo").

## O que foi medido

| item | resultado |
|---|---|
| `npm test` | 607/607 (o flake conhecido de `tests/unit/codigo.test.mjs:36` não apareceu nesta rodada) |
| `npm run test:integracao` | 241/241 |
| `aula-usp validar exemplos/regressao-linear` | 0 erros, 0 avisos, código 0 (com Chrome: composição incluída) |
| `aula-usp build exemplos/regressao-linear` | código 0; 12 páginas; "1 de 1 demo(s) capturada(s)" |
| a demo no PDF | página 7: uma imagem embutida, 2304 × 858 (a `div.demo` de 1152 px a 2 pixels por px), 36 863 pixels não brancos (`pdfimages -list` e o teste de integração, pelo mesmo número) |

A imagem foi medida como imagem embutida, não como página: o quadro "Demo interativa: abra o HTML" também pinta a página. A demo da aula não tem `img.estatico` nem `capturar()`; o fonte é conferido no próprio teste (`tests/integracao/captura.test.mjs`, "aceite da fase 2"), que também exige zero achados e fase 2 na aula. Inversões rodadas: com `montar()` lançando erro, o teste cai em "zero erros e zero avisos"; sem essa asserção, cai em "a página da demo não desenha imagem nenhuma".

## O que a 2d entregou

- **O guia documenta até a maior fase do contrato.** `tabelaDeRegras` filtrava `regra.fase === fase` com fase 1: o capítulo de regras trazia 60 de 64 (e chamado com fase 2, 4). Agora traz 64, pelo filtro cumulativo e por `faseMaxima(contrato)`. A tabela de vocabulário ganhou `.grafico`, `.diagrama`, `data-captura-ms`, `type` do `script` e o `script` restrito a `figure.grafico`/`figure.diagrama` (49 para 53 linhas de tabela). Duas guardas novas, cada uma com inversão medida: o capítulo traz todas as regras do contrato; todo deck do espécime conta como limpo, salvo `muitos-blocos.html`.
- **`50-graficos-diagramas-demos.md` completo**, escrito para o autor, com trechos da aula-exemplo conferidos pela guarda de trechos literais.
- **O bloco de regras essenciais mudou em duas frases** que a fase 2 tornou falsas ("sem `script` dentro do slide" e "toda demo tem `img.estatico`"). O brief preferia não mexer; a alternativa era publicar nos quatro pacotes uma regra que a segunda aula-exemplo contradiz.
- **`exemplo-recursos.html`** nos três pacotes que levam o guia, com guarda de cópia byte a byte. Citações entre crases conferidas: 246, 0 mortas. `instrucoes.txt` do GPT: 5.583 de 8.000 caracteres (folga 2.417).
- **`exemplos/regressao-linear/`**, 12 slides, com dados inline (funciona num artifact e viaja num arquivo só).

## A verificação da spec 14

Registrada em `2026-09-28-aula-usp-f2b-spec14.md`: num artifact do Claude, o WASM do Graphviz embutido no script compilou e desenhou (medido pelo autor em 2026-09-25). O plano B (ELK no navegador) não entrou. Ressalva que continua valendo: o satélite `aula-usp-diagramas.js` gerado hoje não foi servido num artifact — foi o pacote do Graphviz inteiro, reempacotado depois pelo esbuild.

## O que fica aberto para a fase 3

- **`package.json`** tem `private: true` e não tem `license`, `author`, `repository` nem `files`. Medido agora com `npm pack --dry-run`: 462 arquivos, 3,5 MB empacotados, 7,8 MB desempacotados — tudo o que não é ignorado entra.
- **A decisão sobre `pacotes/` e `dist/` sobreviverem à instalação** pelo npm (hoje são rastreados no git; o que vai no pacote npm não foi decidido).
- **Medir se o produto preserva subpastas** ao subir `conhecimento/` no GPT e no Projeto do Claude: o acervo viaja em `contrato/` e `especime/`, e o guia cita esses caminhos.
- **O traço amarelo em SVG escalado** não foi medido no palco: a regra de amarelo em SVG confere o fonte, não a espessura depois da escala.
- **O flake de `tests/unit/codigo.test.mjs:36`**, que passa isolado; não apareceu nesta rodada, e não foi investigado.
- O aceite com modelos da fase 3 (claude.ai e ChatGPT, spec 11.3) depende do runtime publicado.
