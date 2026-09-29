# AGENTS.md

Instruções para quem **desenvolve o Aula USP** — o sistema, não as aulas. Quem escreve uma aula usa o guia do autor e os pacotes para agentes (`guia/`, marco 6b); nada aqui ensina a escrever um slide.

A spec é a autoridade: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`. Discordância entre ela e este arquivo é defeito num dos dois — resolva, não escolha em silêncio.

## O sistema em um parágrafo

Uma aula é um arquivo HTML. `montar/` transforma o fonte do autor no slide montado, `motor/` navega, `componentes/` renderiza matemática (KaTeX) e código (Shiki), `validador/` acusa o que fugiu do contrato — no terminal e num painel dentro da própria aula —, e `avaliador/`, desde a 1.1.0, aconselha sobre a qualidade de uma aula já válida, pela rubrica de `avaliador/rubrica.json`. `bin/` e `build/` são a camada de Node: CLI, servidor local, pipeline de build, PDF e empacotamento. `contrato/contrato.json` diz o que é permitido; `tokens/aula-usp.tokens.json` diz com que cores e medidas.

## Comandos

A CLI vive em `bin/aula-usp.mjs`. Sem `npm link`, chame por `node bin/aula-usp.mjs <comando>`.

| comando | faz |
|---|---|
| `aula-usp novo <pasta> --unidade ime` | copia `modelos/aula/` preenchendo `unidade` (da opção) e `data` (de hoje); não sobrescreve pasta que já tenha conteúdo |
| `aula-usp servir <pasta> [--porta 8765]` | serve a aula com o runtime local de `dist/`; troca o endereço da tag e remove o `integrity` |
| `aula-usp validar <pasta> [--slide <id\|n>] [--json]` | regras estáticas e de carga e, havendo Chrome, as de composição; com `--slide` (desde a 1.2.0), valida a aula inteira, imprime só os achados daquele slide e a linha "N achados em outros slides e M da aula, fora deste relatório", e sai com 1 só se houver erro nele |
| `aula-usp build <pasta> [--sem-pdf]` | as sete etapas da spec 3.3; escreve só em `<pasta>/dist/` |
| `aula-usp avaliar <pasta> [--slide <id\|n>] [--minutos N] [--fotos <dir>] [--json]` | os critérios medidos da rubrica (spec `2026-09-28-aula-usp-skills-design.md`, 4.1); só `ALERTA` e `CONSELHO`, saída 0 com ou sem eles, 2 em falha de ambiente, nunca 1; aula com erro estático não é avaliada ("valide primeiro", saída 0); `--fotos` é a única opção que abre o Chrome |
| `aula-usp slide <pasta> <id\|n> [--substituir <arquivo> [--dividir] [--forcar]]` | desde a 1.2.0 (spec `2026-09-28-aula-usp-skills-design.md`, 5.1): imprime o fonte de uma `section` byte a byte ou troca só aquele intervalo, com escrita atômica; o localizador é `build/secoes.mjs`, por intervalo de bytes e sem DOM. Recusas de conteúdo (alvo inexistente, arquivo sem exatamente uma `section` — duas com `--dividir` —, texto fora dela, id trocado sem `--forcar`, id repetido) saem com 1; de uso, com 2. Não valida: quem valida é `validar --slide` |
| `aula-usp roteiro <arquivo.md> <pasta> [--substituir]` | desde a 1.3.0 (spec `2026-09-28-aula-usp-skills-design.md`, 6.2): converte um roteiro em markdown em `<pasta>/index.html`, de forma determinística, com a tag do runtime copiada de `modelos/aula/index.html`, copia as figuras para `<pasta>/img/` e roda `validar`, cujo código de saída é o do comando. O parser e o gerador são `montar/roteiro.js`, do lado do navegador; a cola de Node, `build/roteiro.mjs`. Erro de roteiro (layout, marcação, figura ausente, bloco que o layout não aceita) sai com 1, uma linha por erro com o arquivo e a linha, sem escrever nada; pasta com `index.html` sai com 2, salvo `--substituir` — que aqui é booleana, e em `slide` leva valor (`booleanas`, em `lerArgumentos`) |
| `aula-usp dist` | gera `validador/cobertura.json` e os 13 scripts de `dist/` (manutenção do sistema; fora de um clone do repositório recusa com 2) |
| `aula-usp pacotes` | fixa a tag do runtime, gera o guia e monta `pacotes/`, nessa ordem; confere os limites da spec 11.1 (manutenção do sistema; fora de um clone do repositório recusa com 2) |

`dist` e `pacotes` precisam do repositório — `especime/` e as devDependencies, como o `esbuild` —, e o pacote do npm não leva nenhum dos dois (`files`, em `package.json`). No pacote instalado, `exigirRepositorio` (`bin/aula-usp.mjs`) os recusa antes de qualquer `import()`, com saída 2 e a mensagem "comando de manutenção do sistema"; `tests/integracao/instalacao.test.mjs` mede isso no tarball extraído.

Códigos de saída (spec 8.1): 0 sem erros, avisos permitidos; 1 com erros de validação; 2 com falha de ambiente. Cada comando aceita **só as suas** flags: `--json` em `build` ou `--porta` em `validar` saem com o uso e código 2, como uma flag inexistente — melhor recusar que ignorar em silêncio.

Os seis comandos da spec 8.1 existem, e `avaliar`, `slide` e `roteiro` são o sétimo, o oitavo e o nono, da spec de 2026-09-28 (a 8.1 remete a ela). O `roteiro` não tem lista própria de layouts: o que cada bloco vira e se cabe onde está saem de `contrato.layouts`, conferidos pelo casador do próprio validador (`validador/sequencia.js`) sobre os elementos que o gerador vai escrever; `tests/unit/roteiro.test.mjs` tem o teste que cai quando o gerador passa a usar uma lista local (inversão medida na 1.3.0). `slide` e `validar --slide` resolvem o alvo pela mesma função, `resolverAlvo` de `build/secoes.mjs` — um id que existe ganha de um número —, e `tests/unit/secoes.test.mjs` prova que a numeração do localizador é a de `slidesDoFonte` em todo deck do espécime, dos exemplos e do modelo. `avaliar --slide` e as fotos seguem a mesma regra por `indiceDoAlvo` (`avaliador/avaliar.js`), escrita de novo porque `avaliador/` não importa de `build/`; o teste "os três comandos escolhem o mesmo slide", em `tests/unit/secoes.test.mjs`, prende as duas escritas uma à outra, com um id só de algarismos que não é a posição. Das seis metas do contrato, `novo` preenche duas: `disciplina`, `aula` e `professor` ficam com o texto de exemplo do modelo, porque um `professor` inventado seria pior que um lugar visivelmente vazio, e `video` (opcional, de fase 2) não entra no modelo. Desde a 1.0.1, só `unidade`, `data` e `professor` são obrigatórias.

`aula-usp pacotes` reescreve a tag nas **três** pastas da spec 8.1: `modelos/`, `especime/` e `exemplos/`. O espécime é servido cru por `dist.test.mjs` e `visual.test.mjs` — um servidor que **não** reescreve nada, e é ele que prova que a tag escrita pelo autor chega ao navegador como está. A 1.0.0 está publicada, e a CDN foi conferida de verdade uma vez (13 de 13 hashes, 0 erros em 5 decks num Chrome com a CDN real) — mas os testes continuam **offline, de propósito**: quem responde pela CDN neles é `rotearCdn` (`tests/integracao/utilitarios.mjs`), o **Chrome** intercepta a rota e devolve os bytes de `dist/` desta árvore, que é o que está sob teste (a versão publicada é outra, e uma suíte que dependesse da rede não diria nada sobre o código que você acabou de mudar). O servidor continua burro. Dois ganhos que a tag relativa não dava: o `integrity` conferido por um navegador de verdade (dois bytes a mais em `aula-usp.js` e o Chrome recusa o script) e a cadeia de scripts secundários resolvida pela base da CDN (9 pedidos em `codigo.html`). O modelo e as duas aulas-exemplo vão dentro dos pacotes, e o espécime inteiro também, desde o pacote autossuficiente: três dos quatro pacotes levam `especime/` com todos os decks (`tests/unit/pacotes.test.mjs`).

Scripts de `package.json`: `npm test`, `npm run test:integracao`, `npm run servir`, `npm run tokens`, `npm run fontes:css`, `npm run mplstyle`, `npm run fontes`, `npm run marcas`. `aula-usp dist` não tem script npm. **`npm run fontes` e `npm run marcas` baixam da rede** e só rodam com autorização do autor (spec 8.3) — os dois já rodaram na fase 1 e seus resultados estão no repositório.

Node ≥ 20.6, ES modules. `playwright-core` usa o Google Chrome instalado (canal `chrome`, ou o executável em `CHROME_PATH`); não baixa navegador.

## Testes

```bash
npm test                 # 53 arquivos em tests/unit/: 49 sem navegador, 4 com Chrome
npm run test:integracao  # 28 arquivos em tests/integracao/, Chrome de verdade
```

Não há CI. Quem roda os testes antes de commitar é você.

Os de integração são pesados — abrem Chrome, constroem decks, comparam pixels. Na prática rode um arquivo por vez:

```bash
node --test tests/integracao/composicao.test.mjs
```

Uma distinção que confunde: **"falta de Chrome não é falha" é regra da CLI**, não dos testes. `validar` e `build` degradam sozinhos — pulam composição e PDF, emitem aviso no stderr e terminam com 0 se não houver erros (spec 8.1). Os testes de integração não têm essa tolerância: chamam `chromium.launch()` direto (`tests/integracao/utilitarios.mjs:35`) e falham sem Chrome. Os quatro arquivos de `tests/unit/` que sobem Chrome — `validar-cli.test.mjs`, `novo.test.mjs` e `slide-cli.test.mjs`, por `validarArquivo`, e `roteiro-cli.test.mjs`, pela CLI, que roda `validar` depois de escrever — seguem a regra da CLI e **pulam anunciando**: medido na 1.3.0, `CHROME_PATH` inexistente dá 806 passam e 2 pulados, e nenhum pulo é mudo. Em `slide-cli.test.mjs` não há pulo: o que ele prova (a fatia de bytes e a aula sem erro nos outros grupos) vale sem Chrome, e a composição que ficou de fora sai como diagnóstico. Em `roteiro-cli.test.mjs` também não: ele usa o exemplo da spec 6.1 **sem** a meta `video: canto`, porque com ela e com Chrome o slide `#variancia` entra no canto do vídeo e `validar` sai com 1 (medido; os dois casos estão presos em `tests/integracao/roteiro.test.mjs`), e um código de saída que dependesse de haver Chrome não diria nada. `tests/unit/avaliar-cli.test.mjs` também põe um `CHROME_PATH` inexistente, mas para provar a falta: `avaliar --fotos` sem Chrome sai com 2, e sem `--fotos` o comando nem tenta abrir navegador.

## `dist/` é rastreado, e os testes comparam byte a byte

`dist/` tem **14 arquivos versionados no git**: os seis scripts da spec 3.5 (`aula-usp.js`, `aula-usp-motor.js`, `aula-usp-tex.js`, `aula-usp-codigo.js`, `aula-usp-graficos.js` e `aula-usp-diagramas.js`), as sete gramáticas de linguagem e `manifesto.json`. É a exceção do `.gitignore`, que ignora o `dist/` de cada aula construída (`aula-usp build` escreve em `<pasta>/dist/`) e preserva o da raiz — `dist/` seguido de `!/dist/`, nesta ordem.

Quem gera é `aula-usp dist`. Dois testes unitários impedem que um `dist/` velho engane qualquer teste que o leia:

- `tests/unit/bundle.test.mjs:116` — `dist/manifesto.json` commitado contra o regenerado, campo a campo;
- `tests/unit/bundle.test.mjs:136` — os **bytes** de cada arquivo em disco contra os que `empacotar()` acabou de gerar, com a mensagem "rode `aula-usp dist` de novo".

Isso não é zelo: doze arquivos de teste leem `dist/` (medido na fase 2b: os que citam um caminho dentro de `dist/`), entre eles `tests/integracao/dist.test.mjs`, que monta o espécime pelo pacote num Chrome de verdade. Sem a guarda de bytes, um `dist/` de uma geração atrás validaria código-fonte que ninguém mais tem.

Consequência prática: **mexeu no empacotador (`build/bundle.mjs`), nos pontos de entrada (`montar/dist.js`, `motor/dist.js`), em qualquer fonte que entre no pacote, ou numa dependência que ele embute — rode `aula-usp dist` e commite `dist/` junto com a mudança.** O `dist/` regenerado faz parte do diff, não é um passo posterior.

## Todo arquivo gerado tem uma guarda dessas

| gerado | por | guarda |
|---|---|---|
| `estilos/tokens.css`, `tokens/tokens.js` | `npm run tokens` | `tests/unit/tokens.test.mjs:124` |
| `estilos/fontes.css` | `npm run fontes:css` | `tests/unit/fontes-css.test.mjs:24` |
| `validador/cobertura.json` | `aula-usp dist` | `tests/unit/cobertura.test.mjs:74` |
| `dist/` (13 scripts + manifesto) | `aula-usp dist` | `tests/unit/bundle.test.mjs:116` e `:136`, e as duas de propriedade em `:197` e `:220` |
| `guia/10-estrutura.md`, `20-layouts.md`, `30-componentes.md`, `60-validador.md` e `80-avaliar-corrigir-gerar.md`, só entre `<!-- gerado:… -->` e `<!-- /gerado -->` | `npm run guia` | `tests/unit/guia.test.mjs:35`; as de propriedade do capítulo 80 no fim do mesmo arquivo: todo critério de `avaliador/rubrica.json`, uma linha cada, com os números dela; e todo exemplo de roteiro da seção de gerar passa por `lerRoteiro` e `gerarAula` sem erro, com os exemplos cobrindo as 26 marcações de uma lista literal no teste |
| `pacotes/` (os quatro da spec 10.2 e as skills `aula-usp-avaliar`, `aula-usp-corrigir` e `aula-usp-gerar`, 62 arquivos) e a tag do runtime em `modelos/` e `exemplos/` | `aula-usp pacotes` | `tests/unit/pacotes.test.mjs:70` |
| `assets/aula-usp.mplstyle` | `npm run mplstyle` | `tests/unit/mplstyle.test.mjs` — regerar-e-comparar, mais a propriedade (as três cores do ciclo são as de `tokens.cor.tinta/azul/cinza`, sem `#`). O Aula USP não consome este arquivo, e não há Python no projeto (spec 8.2) para carregá-lo de verdade num matplotlib — a cobertura dele é textual porque a ferramenta que o lê não está no projeto |

Todos são rastreados no git e trazem, quando o formato permite, o cabeçalho "Gerado por … Não editar à mão". Editar um à mão quebra a guarda, e a correção é sempre a mesma: edite a **fonte** e regere.

**O que uma guarda dessas NÃO prova.** Todas as sete são da forma "regerar e comparar", e uma guarda dessa forma prova que o **arquivo** está em dia com o **gerador** — e nada sobre o gerador. Quebre o gerador, regere, e as duas voltam a bater: a guarda fica verde, e a mensagem que ela imprime ("rode … e commite o resultado") manda commitar a regressão. Medido no 6b: tirando do extrator de exemplos o filtro que só aceita deck em português, `npm run guia` publicou "The cloud spreads" e "Takeaways" como exemplos canônicos do guia, e esta guarda seguiu verde. Medido de novo no 6c, com a tag do runtime: trocando `aula-usp@${version}` por `aula-usp@1.0.0` dentro de `tagFixada()` e regerando, a igualdade ficou verde **e o próprio `aula-usp pacotes` saiu com 0** — a conferência dele também compara o resultado com o gerador. O que fecha essa janela é asseverar **propriedades do resultado** ao lado da igualdade — no guia, que todo exemplo publicado é trecho literal de um deck pt-BR que valida limpo (`tests/unit/guia.test.mjs`); nos pacotes, as três que a spec 11.1 nomeia, medidas contra a spec, o `package.json` e o `dist/manifesto.json` (`tests/unit/pacotes.test.mjs`). Ao acrescentar um gerado a esta tabela, pergunte também que propriedade o artefato promete, e não só se ele foi regerado.

Medido de novo na 2d, no guia, duas vezes. Com o filtro de `tabelaDeRegras` de volta a `regra.fase === 1` e `npm run guia` rodado, a igualdade ficou verde e o capítulo de regras publicou 60 das 64; quem cai é a guarda que conta as linhas do capítulo contra `contrato.regras`. Com a fase de `lerERodarEstatica` presa em 1, `especime/componentes.html` sai dos decks limpos e três layouts trocam de exemplo em silêncio — e a guarda de propriedade dos exemplos fica verde, porque ela e o extrator leem o mesmo `decksLimpos` e erram juntos; quem cai é a que exige todo deck do espécime limpo, salvo `muitos-blocos.html`. O guia documenta até a maior fase que o contrato declara (`faseMaxima`, em `build/guia.mjs`), sem rótulo de fase para o autor.

E a demonstração mais nítida disso, medida no marco 7: **todo caminho e todo capítulo citado entre crases dentro do pacote existe dentro do pacote** (`tests/unit/pacotes.test.mjs`). O aceite do marco 7 a descobriu do jeito caro — um agente com só o pacote relatou que os endereços do guia não existiam para ele —, e no dia em que ela foi escrita havia 164 citações mortas nos quatro pacotes. Inversão medida: com o acervo filtrado para fora de `montarPacotes` e `aula-usp pacotes` rodado em seguida, a guarda de igualdade ficou **verde** e o comando saiu com **0**, enquanto esta ficou vermelha com 122 citações mortas. Uma propriedade do resultado vê a regressão que a igualdade, por construção, não vê.

E o segundo aprendizado, que custou uma revisão: **o título de uma guarda é uma promessa, e o alcance dela precisa caber no título.** A primeira versão dessa guarda dizia "todo caminho citado" e exigia uma barra na citação — o corte estava justificado contra falso positivo de pasta (`img/`, `dist/`) e descartava junto o nome nu de arquivo, que é a convenção de referência cruzada do próprio guia. Nos dois pacotes em que o guia vira um arquivo só, isso deixava **172 citações mortas** fora do alcance dela, com a guarda reportando zero. Hoje ela reconhece o nome nu de capítulo, o título diz "entre crases", e o comentário enumera o que sobra de fora. Medido: 246 citações conferidas, 0 mortas. **Ao acrescentar ou alargar uma guarda, releia o título dela contra o que ela mede** — uma guarda que certifica o que não olha é pior que uma guarda modesta.

E uma armadilha a mais, medida no 6c: **quando a guarda procura um texto, confira que a fonte da busca não contém o próprio gabarito.** A conferência do bloco de regras essenciais procurava o bloco em "algum arquivo do pacote" — e três dos quatro pacotes levam uma cópia do guia (`references/00-principios.md` ou `conhecimento/guia-do-autor.md`), que contém o bloco. Medido: esvaziando o bloco dos quatro arquivos de instrução, a busca larga acusou **1 dos 4**. A busca agora é no arquivo de instrução declarado de cada pacote.

E a sétima, medida no SRI dos satélites, que é a mesma janela um andar acima: **uma guarda de propriedade que tira o UNIVERSO dela da mesma fonte que alimenta o gerador volta a ser uma guarda de igualdade.** "Todo satélite tem o seu `integrity` embutido" percorria os satélites que `build/bundle.mjs` marca com `{ satelite: true }` — a mesma marca que decide quem entra no mapa embutido. Medido: tirando a marca de `aula-usp-tex.js`, o satélite de 622 kB saiu do pacote sem hash e a guarda ficou **verde**, porque ele também tinha saído do universo dela. Hoje ela compara duas listas: a do empacotador e a que o `resolver` de `montar/dist.js` sabe pedir, lida do fonte dele. **E o alcance disso é desigual, medido:** dos onze satélites, só quatro — `aula-usp-tex.js`, `aula-usp-codigo.js`, `aula-usp-graficos.js` e `aula-usp-diagramas.js` — têm origens de fato independentes: são literais no fonte de `montar/dist.js`. As sete gramáticas saem, nas duas pontas, do mesmo `contrato/contrato.json`: `contrato.linguagens` do lado da guarda, o laço `for (const linguagem of linguagens)` do lado do empacotador. Medido: tirando `r` de `contrato.linguagens`, as duas guardas de propriedade ficam **verdes** — quem vê a omissão é `tests/unit/contrato.test.mjs` ("linguagens de código coincidem com os valores de data-lang"), que prega a lista à spec valor a valor, mais as duas guardas de igualdade de `dist/`. A janela das gramáticas está fechada; para sete dos onze, não é essa guarda que a fecha. Os dois satélites da fase 2 (spec 3.5) entraram como literal no `resolver` e por isso têm o caminho independente — medido na 2b: tirando a marca `satelite` de `aula-usp-diagramas.js`, a guarda de propriedade cai junto com as duas de igualdade. **Ao escrever uma guarda de propriedade, pergunte de onde vem o "todo" — e, quando as duas pontas beberem da mesma fonte, escreva onde a cobertura mora de verdade, para que ninguém a procure no lugar errado.**

## Quem embute o conteúdo de outro vem primeiro

`aula-usp dist` gera a cobertura **antes** de empacotar, de propósito: `montar/dist.js` importa `validador/cobertura.json` para embuti-lo em `aula-usp.js`, e na ordem inversa o artefato sairia sempre uma geração atrasado.

**Segunda instância, agora dentro de `build/bundle.mjs`:** os onze satélites são empacotados **antes** de `aula-usp.js`, e não depois, como era até o SRI dos satélites. O principal embute o `integrity` de cada satélite (spec 3.2, passo 5), e um hash de um arquivo que ainda não foi gerado não existe. Até o marco 5a o principal saía primeiro, na linha 85 — o que não dava erro nenhum, porque naquele desenho ele não precisava de nada dos satélites.

As duas têm a mesma forma e o mesmo perigo: **a ordem errada não falha.** A primeira entrega uma geração atrasada; a segunda entrega um artefato **inerte**. Medido, pondo `aula-usp.js` de volta na frente dos satélites: `aula-usp dist` sai com **0**, sem erro nem aviso, `aula-usp.js` encolhe 0,8 kB e o `define` vira `{}` — o mapa é injetado **vazio**, e mapa vazio não recusa nada, porque o SRI de import map falha **aberto e calado** quando não acha chave para a URL pedida. Quem acusa são as duas guardas de propriedade ("aula-usp.js não traz o integrity de aula-usp-tex.js — spec 3.2, passo 5"); as duas de igualdade ficam verdes. Toda vez que um gerado passar a embutir o conteúdo (ou o hash) de outro, a pergunta é da ordem, e a resposta é sempre a mesma: o embutido primeiro.

**E o indicador de mão, com o limite dele.** Para conferir à mão se o mecanismo está vivo, o que se move é `grep -o 'sha384-' dist/aula-usp.js | wc -l` — **11**, um por satélite. `grep importmap` **não é indicador**: medido, ele continua valendo 1 com a ordem invertida e o mapa vazio, e só vai a 0 no caso em que o `sha384-` já tinha ido (a injeção apagada leva os dois a 0). E nem o primeiro basta: com o mapa chaveado pelo **nome nu** em vez da URL resolvida, os dois indicadores ficam idênticos aos do estado são (medido quando eram nove satélites: **9** e **1**), `npm test` dá **474/474** e os nove satélites carregam sem conferência nenhuma. **O único lugar onde o mecanismo vivo se separa do morto é `tests/integracao/dist.test.mjs`, com Chrome de verdade** — e é por isso que a prova dele existe.

## A fronteira: quem pode importar Node

`montar/`, `motor/`, `componentes/`, `validador/` e `avaliador/` **não importam nada do Node** — rodam no navegador. Medido na 1.3.0: zero ocorrências de `node:` nos cinco diretórios, `montar/roteiro.js` incluído — o parser do roteiro mora aqui, e não em `build/`, para um dia rodar num artifact (spec 2026-09-28, 6.2); ele não entra em `dist/`, porque nenhum ponto de entrada o importa. Só `bin/` (1 arquivo) e `build/` (23 arquivos) são Node. O `avaliador/` entrou na fronteira sem estar em painel nenhum ainda (spec 2026-09-28, 4.2): é o que deixa o caminho aberto para um.

É o que permite a mesma regra rodar no painel dentro da aula e na linha de comando, e o que torna `dist/` possível: esbuild empacota esses diretórios para o navegador, e um `import … from 'node:fs'` ali não tem como resolver. `tests/` fica fora da fronteira e importa Node à vontade.

Não há teste que varra imports: a fronteira se mantém à mão. Se você se vir precisando de `node:` em um dos cinco, o que você quer provavelmente é receber o dado já lido por parâmetro — é assim que o validador recebe o contrato, as unidades e a cobertura.

Do lado Node, um arquivo de dependência se acha como o Node acha (`import.meta.resolve`), nunca montando `node_modules/…` sobre a raiz do sistema: instalado por `npx` ou por `npm install` num projeto, o npm iça as dependências para o lado de `aula-usp`, e `<raiz>/node_modules/` não existe. Medido na fase 3a: `build/fontes-embutidas.mjs` lia `katex.min.css` assim, e o `build` de toda aula com TeX saía com 2 no pacote instalado. `tests/integracao/instalacao.test.mjs` monta o pacote nesse arranjo. (`build/bundle.mjs` ainda monta o caminho, e pode: só roda em `aula-usp dist`, num clone.) Uma dependência que um comando do autor importa é de produção, não de desenvolvimento — o `fontkit` era devDependency e o mesmo teste o achou.

Em `bin/` vale uma regra própria, escrita no topo do arquivo: nada que leia disco ou dependência externa no escopo do módulo entra na CLI por `import` estático. Todos os módulos de `build/` entram por `import()` dentro do comando que precisa deles, para que uma dependência ausente vire "falha de ambiente" com saída 2, e não uma stack trace.

## O contrato é dado, não código

`contrato/contrato.json` (versão 1) carrega os 7 layouts, os blocos de corpo, as grades, os papéis tipográficos, o vocabulário de HTML e SVG, o TeX permitido, as 7 linguagens de código, 34 chaves de limite e 65 regras — 60 da fase 1 e 5 da fase 2 (`recursos.grafico`, `recursos.csv`, `recursos.dot`, `recursos.diagrama-grande` e, desde a 1.0.1, `composicao.canto-video`), **todas implementadas**; `tests/unit/validador.test.mjs` confere isso com a contagem tirada do contrato, não digitada.

O código **executa** o contrato; não o repete. Isso vale **inclusive para limiares**: `saida.megabytes: 10` mora no contrato, não em `validador/regras/saida.js`; as regras de limite leem `contrato.limites[chave]` e só sabem contar. Um número mágico no código que já existe no contrato é defeito — mudar um limite tem que ser editar um número em JSON.

Duas guardas seguram isso, e vale conhecê-las antes de mexer nas regras:

- `tests/unit/contrato.test.mjs` confere o contrato contra a spec — cores, tipografia, grid, limites, severidade, grupo e fase de cada regra;
- `tests/unit/validador.test.mjs` confere o contrato contra o código, um registro por grupo, **sem escrever nenhum nome de grupo nem número de regras no teste**: os grupos vêm do próprio contrato. É o que faz "apareceu um grupo novo no contrato e ninguém escreveu o código dele" cair como falha.

Número que **não** vem do contrato — porque é da spec — entra como constante nomeada com a citação da seção ao lado. Dois exemplos no repositório: o teto de diferença visual em `tests/integracao/visual.test.mjs` e as metas de tamanho de `dist/` em `tests/integracao/tamanhos.test.mjs`.

## A rubrica do avaliador também é dado

`avaliador/rubrica.json` está para o avaliador como o contrato está para o validador: os 17 critérios da spec 2026-09-28 (3.1 e 3.2), com fonte, tipo, alcance, nível máximo, limiares, listas e a `acao` de cada medido ou a `pergunta` de cada julgado. `avaliador/criterios/` só sabe contar; nenhum limiar mora no código. Três guardas:

- `tests/unit/rubrica.test.mjs` prega a rubrica à spec com uma tabela escrita no teste — o universo não sai do JSON, e um critério apagado ou inventado nele cai citando o `id`;
- `tests/unit/avaliador.test.mjs` gera um caso por pasta de `tests/fixtures/avaliador/<criterio>/` (hoje 9, uma por medido): o `ruim` tem exatamente um achado do seu critério, o `bom` nenhum de nenhum, e os 18 arquivos validam com 0 erros e 0 avisos — avaliar é para aula válida. A lista dos medidos é literal no teste, e `avaliar()` estoura com um medido da rubrica sem implementação, em vez de pulá-lo;
- a de propriedade do capítulo de avaliar do guia, na tabela acima.

Avaliar não é validar, e isso é regra, não gosto: nenhum critério tem nível `erro`, o comando nunca sai com 1, e nem o contrato, nem o validador, nem o `build` leem a rubrica.

## Acrescentar ou mudar uma regra

1. A entrada em `contrato.regras` — `severidade`, `grupo`, `fase`, `acao` — e o número em `contrato.limites`, se houver.
2. A implementação em `validador/regras/<grupo>.js`, registrada em `validador/regras/index.js`.
3. Para regra **estática**, um par `bom.html` / `ruim.html` em `tests/fixtures/validador/<nome-da-regra>/`. `tests/unit/validador.test.mjs` gera um teste por pasta de fixture e exige que toda estática implementada tenha a sua. Hoje são 61 pastas, uma por regra que tem fixture, com seis prefixos: `limites` (20), `estrutura` (13), `recursos` (10), `vocabulario` (8), `composicao` (6) e `matematica` (4). O prefixo é o nome da regra, não o grupo do contrato — as quatro regras de carga da fase 1 se chamam `recursos.*` e `matematica.*`.
4. Carga, composição e saída não se provam por fixture de linkedom: as de carga precisam de recursos de verdade, as de composição só existem dentro do Chrome (`tests/integracao/composicao.test.mjs`), e as quatro `saida.*` medem o artefato construído — por isso são as únicas quatro regras de fase 1 sem pasta de fixture.

Quem roda o grupo de composição tem de passar a fase — `build/composicao.mjs` a calcula na página com `faseDaAula`, como `montar/entrada.js`. Até a 1.0.1 toda regra de composição era de fase 1, o default de `validar()` bastava, e a CLI rodava o grupo na fase 1 fixa: `composicao.canto-video`, a primeira de fase 2, teria ficado muda no terminal e só o painel a veria.

A ordem dos grupos não é detalhe: composição mede o documento montado **antes** de o motor iniciar, porque depois disso todo slide que não é o atual mede 0×0 e o transbordo deixa de existir para o validador.

Dois eixos chegam a toda regra pelo contexto de `validar()`: `fase`, que `faseDaAula` decide por presença de qualquer marca de fase 2 do contrato (`seletoresDeFase2`, em `validador/validar.js` — derivada do contrato, sem lista em código; as metas de fase 2, como `video`, são procuradas no `<head>`, e só elas), e `modo` (`'navegador'`, o padrão, ou `'build'`, que todo o lado Node passa). Hoje só `recursos.demo-sem-estatico` lê o modo, e **só** o modo: ela se cala no build, em qualquer `fase` — a fase da aula só libera o vocabulário marcado fase 2 no contrato, e a captura vale para todo build —, porque `build/captura.mjs` fotografa exatamente as demos que ela acusaria — as duas pontas chamam `demoSemImagem` (`validador/regras/carga.js`), e `tests/unit/captura.test.mjs` fica vermelho se uma delas passar a decidir sozinha. A foto que falha volta à regra por `falhasDeCaptura` (`build/build.mjs`, depois da etapa 5): calar uma regra no build só vale enquanto quem a substitui falha alto.

## Português

Textos visíveis ao usuário e nomes de símbolo em português: mensagens do validador e da CLI, nomes de função, variável e arquivo, títulos de teste, comentários e mensagens de commit.

## Processo

Cada marco tem spec, plano em `docs/superpowers/plans/`, execução tarefa a tarefa com revisão, e revisão final em `docs/superpowers/revisoes/`. O plano mede os fatos no repositório antes de propor código.

Duas regras de commit, que este projeto aprendeu caro:

- **nenhuma mensagem afirma mais do que a evidência sustenta.** Se você não rodou, não escreva que passou; se mediu, escreva o número que mediu;
- cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

Quando o plano e o repositório discordarem, **a medição vale** — e a divergência vai para o relatório, não para o silêncio.
