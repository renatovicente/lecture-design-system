# Fase 2a: gráficos — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** entregar `figure.grafico` — especificação em JSON que vira SVG pelo mesmo módulo nos dois modos —, as duas regras de validação correspondentes e o `aula-usp.mplstyle`. É a primeira das quatro partes da fase 2.

**Arquitetura:** `componentes/graficos.js` segue o padrão dos dois componentes que já existem: a biblioteca chega **por parâmetro**, para o mesmo módulo rodar no navegador e no build. Um satélite novo, `aula-usp-graficos.js`, entra no empacotador e ganha `integrity` pelo mecanismo do marco anterior.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. **Três dependências novas de runtime**, nomeadas pela spec 8.2: `d3-array`, `d3-scale`, `d3-shape`.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 7.2, 5.6, 8.2, 9.2, 9.3, 11.2 e 12.

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem framework de teste de terceiros.
- **A fronteira:** `componentes/` é do lado navegador — **nada de Node em `graficos.js`**, e a biblioteca entra por parâmetro, como em `tex.js` e `codigo.js`.
- **Contrato como dado.** O código executa o contrato, nunca o repete — limiares inclusive. Esta parte mexe no contrato (Tarefa 1), e por isso a regra vale com mais força: mudado o contrato, tudo que dele deriva se regenera no mesmo diff.
- **Toda mudança em `build/bundle.mjs` ou nos pontos de entrada exige rodar `aula-usp dist` e commitar `dist/` no mesmo diff.**
- **Uma guarda de regerar-e-comparar não prova nada sobre o gerador**, e **a fonte da guarda tem de ser independente da fonte do que ela guarda**. O `AGENTS.md` traz as duas na forma corrigida, e diz onde mora a cobertura quando a independência é parcial.
- Tudo em português. Commits terminando com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, sem afirmar mais do que a evidência sustenta.

---

## Fatos medidos antes deste plano

Medidos em `e1fc613`, com 474 unitários e 213 de integração verdes.

### Fato 1 — o contrato já antecipa a fase 2; o que falta é **três barreiras cegas à fase**, e elas foram medidas uma a uma

Passei o **exemplo literal da spec 7.2** por todas as regras estáticas, nas duas fases:

| | fase 1 | fase 2 |
|---|---|---|
| `vocabulario.classe` — *classe "grafico" não existe no contrato* | acusa | **passa** |
| `vocabulario.script` — *script dentro da section: gráficos e diagramas são da fase 2* | acusa | acusa |
| `estrutura.obrigatorio` — *`<figure>` sem img nem svg* | acusa | acusa |
| `estrutura.fora-do-layout` — *`<script>` não é permitido dentro de `<figure>`* | acusa | acusa |
| **total** | **4 erros** | **3 erros** |

O que cada linha ensina:

- **`vocabulario.classe` abre sozinha.** `html.classes.grafico` é `{"em":["figure"],"fase":2}` e a regra desestrutura `fase`. **Uma das quatro já está pronta** — o mecanismo existe e funciona.
- **`vocabulario.script` lê `elementosFase2` e mesmo assim sempre acusa.** O contrato tem `html.elementosFase2 = {"script":{"dentro":["figure.grafico","figure.diagrama"]}}`, e a regra o consulta — **mas só para escolher a frase da recusa**, entre *"gráficos e diagramas são da fase 2"* e *"registros de demo ficam fora dos slides"*. A regra **não recebe `fase`**. É uma regra de fase 1 que sabe que a fase 2 existe e responde "ainda não".
- **As duas últimas vêm da mesma linha:** `filhos.figure = {"exatamenteUmDe":["img","svg"],"opcionais":["figcaption"]}`. Uma `figure.grafico` no fonte não tem `img` nem `svg` — **o SVG é gerado** — e tem um `script` que a lista não prevê. Um único dado alimenta os dois erros.

**Consequência de desenho:** a Tarefa 1 não é "acrescentar o gráfico ao contrato". É **abrir três portas que já sabem da fase 2 e estão fechadas**, sem afrouxar nada para a fase 1.

### Fato 2 — o padrão do componente está estabelecido, é curto, e o comentário dele diz por quê

`componentes/tex.js` tem 163 linhas e `componentes/codigo.js` 103. O cabeçalho do segundo:

> *"O Shiki chega por parâmetro, para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM."*

`codigo.js` expõe `criarDestacador({ ... })`, que recebe as funções da biblioteca e devolve um objeto pequeno; `renderizarCodigo(raiz, { destacador })` faz o trabalho sobre o DOM. `graficos.js` segue essa forma com `d3-*` no lugar do Shiki.

### Fato 3 — as duas regras desta parte já existem no contrato, com grupo e ação escritos

```
recursos.grafico  {"severidade":"erro","grupo":"estatica","fase":2,"acao":"Corrija o JSON do gráfico."}
recursos.csv      {"severidade":"erro","grupo":"carga",   "fase":2,"acao":"Confira o caminho do CSV em data/."}
```

**Os grupos já dizem quando cada uma roda** (spec 9.3): a do JSON sobre o fonte, na etapa estática; a do CSV depois da carga. Não são escolhas a fazer — são dados a executar. `validar()` já filtra por `definicao.fase > fase`, então as duas ficam caladas na fase 1 sem nenhuma guarda nova.

### Fato 4 — o empacotador tem uma marca `satelite`, e ela é o que põe o arquivo no import map

`build/bundle.mjs:82` — `guardar(nome, resultado, { satelite = false })`. A linha 78 explica: *"`satelite` marca quem `montar/entrada.js` carrega por import() dinâmico — os que entram no mapa"*. Os nove de hoje passam por ela (`aula-usp-tex.js`, `aula-usp-codigo.js` e as sete gramáticas); `aula-usp-motor.js` **não**, porque é embutido como `textContent`, não buscado.

### Fato 5 — a spec 11.2 nomeia metas para três pacotes, e o satélite novo não tem nenhuma

`tests/integracao/tamanhos.test.mjs:11-14` traz `METAS` com `aula-usp.js` 700 KB, `aula-usp-tex.js` 800 KB, `aula-usp-codigo.js` 600 KB — e as duas primeiras linhas do arquivo são a citação da spec. **Um satélite fora de `METAS` passa sem ser medido.**

### Fato 6 — o marco anterior deixou instrução escrita para este

`tests/integracao/dist.test.mjs:224-225` documenta que a asserção de cobertura do SRI **cai de propósito** quando a fase 2 acrescentar `aula-usp-graficos.js`, e diz o que fazer: ela volta a passar quando um deck de `DECKS_DA_PROVA` usar o satélite novo. Falhar alto no momento em que alguém precisa pensar no assunto era o desenho.

### Fato 7 — as cores saem dos tokens, e a spec 7.2 é minuciosa sobre o uso

Tokens disponíveis: `tinta`, `azul`, `cinza`, `linha`, `amarelo`. A spec manda:

- uma série → `tinta`;
- duas ou três → a de foco (campo `foco`; **na falta dele, a última de `y`**) em `azul`, e as demais em `tinta` e em `cinza` tracejada, **nessa ordem**;
- eixos `tinta` de 2 px; marcas e rótulos em Geist Mono 14 `cinza`; grade horizontal em `linha`; faixas em `amarelo` **atrás** das séries, com rótulo em `tinta`;
- rótulo **na ponta** de cada série, em `tinta`, precedido de um traço de 16 px na cor da série — *"porque texto em `azul` só vale a partir de 32 px"*. **Não há caixa de legenda.**

O desempate do `foco` ausente é a parte que mais fácil se perde: é regra escrita, não convenção.

---

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `contrato/contrato.json` | abrir as três portas | 1 |
| `validador/regras/vocabulario.js` | `vocabulario.script` passa a consultar `fase` | 1 |
| `componentes/graficos.js` (novo) | especificação → SVG, nos dois modos | 2 |
| `montar/entrada.js`, `montar/dist.js`, `build/bundle.mjs` | o satélite | 3 |
| `validador/regras/recursos.js`, `validador/regras/carga.js` | as duas regras | 4 |
| `build/mplstyle.mjs` (novo), `assets/aula-usp.mplstyle` (gerado) | o estilo para notebooks | 5 |
| `especime/`, `tests/integracao/` | o componente exercitado de ponta a ponta | 6 |

---

### Tarefa 1: o contrato admite a forma da fase 2

**É a primeira porque tudo deriva dela, e o Fato 1 já mediu exatamente o que abrir.**

- [ ] **Passo 1: a linha do contrato**

`filhos.figure` hoje serve a um caso só. Ela precisa distinguir a `figure` de fase 1 (exatamente um `img` ou `svg`) da `figure.grafico` (um `script`, nenhum dos dois). A forma do dado é sua; o critério é fixo:

> **Uma `figure` sem classe não pode passar a aceitar `script`, nem a dispensar o `img`/`svg`, em nenhuma fase.**

Se a distinção pedir uma chave nova, escolha o nome e escreva o porquê no commit. O contrato já tem o vocabulário para isso — `html.classes.grafico` traz `fase: 2`, e `filhos` é o lugar onde a forma mora.

- [ ] **Passo 2: `vocabulario.script` passa a consultar `fase`**

Hoje (`validador/regras/vocabulario.js:283-296`) a regra recebe `{ slides, contrato }`, lê `contrato.html.elementosFase2?.script`, e usa o resultado **só para escolher a frase**. Sempre acusa.

O conserto é pequeno e tem de continuar acusando tudo que não for gráfico ou diagrama:

```js
  {
    nome: 'vocabulario.script',
    *aplicar({ slides, contrato, fase }) {
      const permitido = contrato.html.elementosFase2?.script;
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (nomeDe(elemento) !== 'script') continue;
        const dentro = permitido?.dentro?.some((pai) => elemento.closest(pai));
        // Na fase 2 o script de gráfico e de diagrama é legítimo; na fase 1 ele é recusado com a
        // frase que diz por quê. Fora desses pais, é recusado em qualquer fase: registro de demo
        // não entra em slide.
        if (dentro && fase >= 2) continue;
        yield {
          ...onde(slides, secao),
          mensagem: dentro ? 'script dentro da section: gráficos e diagramas são da fase 2.' : 'script dentro da section: registros de demo ficam fora dos slides.',
          trecho: trechoDe(elemento),
        };
      }
    },
  },
```

- [ ] **Passo 3: a medição que fecha a tarefa**

Refaça a medição do Fato 1 e cole o resultado no commit. O alvo é **fase 1: 4 erros; fase 2: 0 erros** sobre o exemplo literal da spec 7.2.

- [ ] **Passo 4: as guardas, com inversão**

Três testes, e cada um com a inversão rodada de verdade:

1. o exemplo literal da spec 7.2 **não produz erro estático na fase 2**;
2. o mesmo exemplo **produz erro na fase 1** — a regra não afrouxou, só aprendeu a fase;
3. uma `figure` **sem classe** com `script` dentro **é recusada nas duas fases**, e uma `figure` sem classe **sem `img` nem `svg`** também.

A inversão de (3) é a que importa: tire a condição `dentro &&` do seu conserto e veja o teste ficar vermelho. Se ficar verde, o teste não guarda nada.

- [ ] **Passo 5: regenerar o que deriva e commitar**

`npm run guia` e `aula-usp pacotes` no mesmo diff. O gerador do guia filtra por `daFase()`; o diff mostra exatamente o que o contrato alimenta.

---

### Tarefa 2: `componentes/graficos.js`

- [ ] **Passo 1: a parte que a spec fixa e nenhuma ferramenta confere — as cores das séries**

Comece por ela, porque um erro aqui é **silencioso**: o gráfico sai, bonito, com a série errada em destaque.

```js
// Cores das séries (spec 7.2): uma série sai em tinta. Duas ou três: a de foco (campo `foco`; na
// falta dele, a ÚLTIMA de `y`) sai em azul, e as demais em tinta e em cinza tracejada, NESSA ORDEM.
// O validador (recursos.grafico) é quem recusa um `foco` que não está em `y`; aqui a entrada já veio
// conferida, e o ?? só cobre a ausência, que é legítima.
export function coresDasSeries(y, foco) {
  if (y.length === 1) return [{ serie: y[0], cor: 'tinta', tracejada: false }];
  const emFoco = foco ?? y.at(-1);
  const sobra = [{ cor: 'tinta', tracejada: false }, { cor: 'cinza', tracejada: true }];
  return y.map((serie) => (serie === emFoco
    ? { serie, cor: 'azul', tracejada: false }
    : { serie, ...sobra.shift() }));
}
```

O teste desta função é uma tabela pequena e vale mais que todos os outros desta tarefa juntos: uma série; duas com `foco`; duas **sem** `foco`; três com `foco` no meio; três sem `foco`. Em cada caso, quem ficou `azul`, quem ficou `tinta`, quem ficou `cinza`, e qual é a tracejada.

- [ ] **Passo 2: o módulo**

Assinatura no padrão do Fato 2 — a biblioteca por parâmetro:

```js
// Gráficos (spec 7.2): a especificação em JSON de figure.grafico vira SVG. O d3 chega por parâmetro,
// para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
export function criarDesenhista({ escalaLinear, escalaLog, linha, extensao }) { … }
export function desenharGraficos(raiz, { desenhista, dados }) { … }
```

Quatro tipos — `linha`, `barras`, `dispersao`, `histograma` (com `classes`) —, escala `linear` ou `log` por eixo. `dados` aceita **caminho de CSV** (modo build) **ou objeto de colunas inline** (necessário no modo navegador sem arquivos): os dois caminhos chegam ao módulo já como colunas, e quem resolve o caminho é quem chama.

O resto do estilo está no Fato 7 e na spec 7.2. **Nenhuma cor é digitada**; todas saem de `tokens.cor`, como em `codigo.js`.

- [ ] **Passo 3: o rótulo na ponta, e a razão dele**

Rótulo na ponta da série, em `tinta`, com traço de 16 px na cor da série. **Não invente caixa de legenda** — a spec explica que é acessibilidade, não gosto: texto em `azul` só vale a partir de 32 px, e um rótulo de legenda não tem esse tamanho.

- [ ] **Passo 4: os testes**

O módulo é puro: entra especificação, sai SVG. Teste **o que o SVG afirma** — quantas séries, qual cor cada uma recebeu, se a faixa está atrás das séries na ordem dos nós, se o eixo tem 2 px, se o rótulo está na ponta. A spec 11.1 pede também snapshots (*"especificações de gráfico e DOT convertidas em SVG, comparadas com snapshots"*); os snapshots são o complemento, não o substituto — **um snapshot sozinho fica verde com a cor errada no dia em que alguém regravar o snapshot.**

---

### Tarefa 3: o satélite `aula-usp-graficos.js`

- [ ] **Passo 1: empacotar, com a marca `satelite`**

Pelo Fato 4, um satélite é quem passa por `guardar(..., { satelite: true })` — é essa marca que o põe no import map com `integrity`. A ordem do empacotador é **satélites → hashes → principal**, e ela não é negociável: o principal não pode conter o hash de um arquivo que ainda não existe.

**Lembre do que aquele marco mediu, porque é o modo de falha caro:** se o mapa ficar chaveado pelo **nome nu** em vez da URL resolvida, **todo indicador estático fica idêntico ao estado correto** — as contagens batem, as guardas de propriedade passam — **e o satélite carrega sem conferência**. Só um navegador de verdade buscando o arquivo de verdade vê. E errar a ordem não quebra nada visível: **o mapa sai vazio, e mapa vazio não recusa nada.**

- [ ] **Passo 2: a meta de tamanho (Fato 5)**

A spec 11.2 não dá meta para este satélite. **Meça o tamanho real e proponha uma**, com a folga escrita e a conta à vista, em `METAS` de `tests/integracao/tamanhos.test.mjs` — o arquivo abre com a citação da spec, e uma meta que não vem de lá precisa dizer de onde vem.

Se a sua conclusão for que a spec precisa de uma linha nova, **diga e não a escreva**: mudar a spec é decisão do autor.

- [ ] **Passo 3: a cobertura do SRI (Fato 6)**

A asserção de `dist.test.mjs:224` vai cair. O comentário que o marco anterior deixou ali diz o que fazer. Siga-o — e note que ele depende da Tarefa 6: a asserção só volta ao verde quando um deck da prova usar o satélite.

- [ ] **Passo 4: `aula-usp dist` e `dist/` no mesmo diff** (restrição global).

---

### Tarefa 4: `recursos.grafico` e `recursos.csv`

- [ ] **Passo 1: as duas regras, cada uma no grupo que o contrato já fixou (Fato 3)**

`recursos.grafico` é **estática** e mora em `validador/regras/recursos.js`: JSON que não analisa, `tipo` fora dos quatro, mais de 3 séries, `foco` que não está em `y`, escala fora de `linear`/`log`, eixo ausente. É ela quem garante a entrada que `coresDasSeries` assume conferida (Tarefa 2, passo 1) — **essa divisão é o contrato entre as duas tarefas, e vale escrevê-la no comentário dos dois lados.**

`recursos.csv` é **de carga** e mora em `validador/regras/carga.js`: o caminho existe no disco (build) ou carregou (navegador).

O limite de 3 séries **sai do contrato**, não do código. Se não houver entrada em `contrato.limites` para ele, acrescente-a junto com a regra — é o mesmo movimento que `diagrama.nos: 15` já fez para a 2b.

- [ ] **Passo 2: as fixtures**

`tests/fixtures/validador/recursos.grafico/{bom,ruim}.html` e `tests/fixtures/validador/recursos.csv/{bom,ruim}.html`, como as 60 da fase 1.

- [ ] **Passo 3: a guarda que conta as regras, e por que ela vai cair sozinha**

`tests/unit/validador.test.mjs:407` e `:419` filtram `regra.fase === 1`, e `:429` assere o outro lado: *"regras de `<grupo>` implementadas que não existem no contrato"*. **É uma guarda de mão dupla**, e é isso que faz ela cair sozinha quando você implementar as duas: a lista do que existe passa a conter regras que a lista filtrada por `fase === 1` não tem.

**Isso é o mecanismo funcionando, não um teste quebrado.** Ensine a guarda a fase — a mesma fase que `validar()` já carrega — em vez de relaxar o lado que acusa. E derive a contagem do contrato: nunca um `2 de 4` digitado, porque o número certo é consequência do dado.

---

### Tarefa 5: `aula-usp.mplstyle`

- [ ] **Passo 1: gerar dos tokens**

Sétimo artefato gerado-e-versionado. A spec 7.2 fixa: ciclo `tinta`, `azul`, `cinza`; eixos de 2 px **sem bordas superior e direita**; grade horizontal em `linha`; Geist quando instalada no sistema.

**Atenção a um detalhe do formato:** em arquivos `.mplstyle`, `#` começa comentário. Cores hexadecimais vão **sem o `#`** — `1A1A1A`, não `#1A1A1A`. Um `#` copiado dos tokens apaga a linha inteira, em silêncio.

- [ ] **Passo 2: a guarda, e o que ela não pode fazer**

Este é o único artefato do plano que o Aula USP **não consome** — serve às figuras que o autor faz em notebooks. E **não há Python no projeto** (spec 8.2), então **nenhum teste pode carregá-lo no matplotlib**. A guarda é necessariamente textual:

1. regerar-e-comparar (a guarda fraca, que sozinha não prova nada sobre o gerador);
2. **propriedade**: as três cores do ciclo são exatamente as dos tokens, e aparecem **sem `#`**;
3. o `AGENTS.md` ganha a linha na tabela de gerados.

Diga isso no commit com essas palavras: a cobertura deste arquivo é textual porque a ferramenta que o lê não está no projeto.

---

### Tarefa 6: o espécime exercita o componente

- [ ] **Passo 1: o deck**

O espécime é a referência visual **e a fonte dos exemplos do guia** — o extrator tira dele a menor seção de cada layout, entre os decks que **validam limpo**. Um gráfico no espécime aparece no guia sozinho, sem ninguém escrever exemplo.

Decida se entra num deck existente ou num novo, e escreva por quê. Lembre da dependência da Tarefa 3, passo 3: a cobertura do SRI precisa que **um deck de `DECKS_DA_PROVA`** use o satélite.

- [ ] **Passo 2: a comparação visual, e o achado que ela pode revelar**

`tests/integracao/visual.test.mjs` compara os dois modos em todos os decks, com orçamento de **150 px** por slide (ruído medido: 63; pior histórico: 131; menor mudança real acima do ruído: 190).

Um gráfico gerado pelo mesmo módulo nos dois modos **tem de sair idêntico**. Se não sair, **pare e relate**: é achado de verdade sobre o determinismo do módulo — ordem de iteração, arredondamento de ponto flutuante na escala, precisão do `path` —, e a correção certa depende de qual deles é. **Não mexa no orçamento de 150 px para acomodar a diferença**; esse número é guardado por um teste que assere os próprios limites dele, e afrouxá-lo apaga exatamente a classe de defeito que o marco 5c descobriu.

---

## Verificação final da 2a

- [ ] `npm test` e `npm run test:integracao` verdes (base: 474 e 213)
- [ ] `aula-usp dist`, `npm run guia` e `aula-usp pacotes` sem diff pendente
- [ ] o exemplo literal da spec 7.2: **4 erros na fase 1, 0 na fase 2**
- [ ] os alvos pelos dois comandos, sem regressão visual
- [ ] o satélite novo carrega com `integrity` conferido **e recusa quando corrompido** — a prova é no navegador, com dois bytes trocados; nenhuma contagem estática substitui isso
- [ ] **62 das 64 regras do contrato implementadas — derivado do contrato, não digitado**

## O que a 2a NÃO faz

- **Diagramas** (2b). Têm uma ramificação de desenho própria: a spec 14 manda **verificar no início da fase 2** se a política de segurança dos artifacts do Claude permite compilar o WASM do Graphviz, com plano B de layout em JavaScript puro (ELK) no modo navegador, mantendo o Graphviz no build. Essa verificação é a primeira tarefa da 2b.
- **Controles de demo e captura automática no build** (2c, spec 3.5 e 7.2).
- **Guia, pacotes e `exemplos/regressao-linear/`** (2d), mais o aceite da fase 2 — spec 12: *"testes verdes e essa aula validada, com uma demo sem imagem própria capturada no PDF"*. O guia já começa a documentar o gráfico sozinho pela Tarefa 1, passo 5; o que fica para a 2d é o texto escrito à mão e o exemplo completo.
