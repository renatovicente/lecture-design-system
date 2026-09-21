# Fase 2c: controles de demo e captura automática — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** entregar os controles do sistema (`button.controle`, `input.controle[type=range]`, `output.leitura`) e a captura automática no build — o Chrome fotografa a demo que não tem imagem própria, para que ela apareça no PDF.

**Arquitetura:** `componentes/controles.js` e o CSS do lado navegador; `build/captura.mjs` do lado Node, **dentro da etapa 5 do pipeline**, no Chrome que a composição já abriu. Sem satélite novo: os controles são CSS e um punhado de JS, e entram no pacote principal.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. **Nenhuma dependência nova.**

**Spec:** seções 7.2 (o parágrafo "Demos"), 3.3 (etapa 5), 3.5, 9.2, 9.3 e 12.

**Depende de:** nada da 2a nem da 2b. Esta parte é independente das duas e **pode ser executada em qualquer ordem em relação a elas** — só o aceite da fase 2 (2d) precisa das três.

---

## Restrições globais

As mesmas da 2a (ver `2026-09-21-aula-usp-f2a-graficos.md`). Uma observação de fronteira que pesa especialmente aqui: **`componentes/controles.js` não importa nada do Node**, e `build/captura.mjs` é Node puro. A captura conversa com a página pelo Chrome, nunca por importação.

---

## Fatos medidos antes deste plano

### Fato 1 — `button`, `input` e `output` **não estão** no vocabulário do corpo

Medido em `contrato.html.elementos`: os três dão `NAO`. Hoje a lista tem 26 elementos e nenhum deles é interativo — o que faz sentido, porque até aqui um slide não tinha nada para clicar.

Isso é diferente do caso dos gráficos: lá o contrato **já antecipava** a fase 2 (`elementosFase2`, `classes.grafico`, `limites`, as regras). **Aqui não há antecipação nenhuma.** O único mecanismo de elemento com fase que existe é `html.elementosFase2`, e ele tem uma forma específica — `{"script":{"dentro":[…]}}`, isto é, elemento *restrito a um pai*. Três elementos de controle não têm a mesma forma: eles valem dentro de `div.demo`, que é um pai, mas são três e não um.

**Decisão a tomar na Tarefa 1**, com o critério fixo: **um slide sem demo não pode ganhar botão em fase nenhuma.**

### Fato 2 — o que já existe do lado da demo, e é de fase 1

```
html.classes.demo            {"em":["div"]}
html.classes.estatico        {"em":["img"],"dentro":["div.demo"]}
html.atributos div.demo data-demo        {"padrao":"^[a-z][a-z0-9-]*$"}
html.atributos div.demo data-captura-ms  {"padrao":"^[0-9]+$","fase":2}   ← já marcado fase 2
layouts.demo                 h2 (1) + div.demo (1)
papeis.leitura               já existe
```

**`data-captura-ms` já está no contrato com `fase: 2`** — mesmo padrão dos gráficos, e a Tarefa 3 só precisa lê-lo. **`papeis.leitura` já existe**, então `output.leitura` tem o papel tipográfico definido sem inventar nada. O que falta são as classes `controle` e `leitura` em `html.classes`.

`layouts.demo` aceita **um** `div.demo` e nada mais: os controles vão **dentro** dele.

### Fato 3 — o achado mais afiado: a regra que muda de eixo

`recursos.demo-sem-estatico` hoje (`validador/regras/carga.js:55-67`) acusa sempre que uma demo não tem `img.estatico` nem `capturar()`:

```js
if (demo.querySelector('img.estatico') || registro.capturar) continue;
yield { … mensagem: `demo "${nome}" sem img.estatico e sem capturar(): o PDF sai vazio.` … };
```

A spec 9.2 diz o que ela vira na fase 2:

> `recursos.demo-sem-estatico` | aviso | *"demo sem `img.estatico` e sem `capturar()`; **na fase 2, só no modo navegador, porque o build captura**"*

**O eixo não é a fase — é o modo.** E o contexto do validador conhece `fase` (`validar(doc, { contrato, regras, grupo, fase = 1, ...dados })`) mas **não conhece modo**. As duas outras regras que dependem do modo hoje resolvem por outro caminho: `recursos.imagem` recebe `recursos` já carregado, diferente em cada modo, e as de composição simplesmente não rodam no build da mesma forma.

Então a Tarefa 4 acrescenta um eixo ao contexto do validador. **É a mudança mais estrutural desta parte, e é uma linha de código** — o que a torna fácil de fazer errado e difícil de notar.

E há uma armadilha de ordem embutida: **se a regra se calar no build, e a captura falhar, ninguém avisa.** A regra existia justamente para impedir "o PDF sai vazio". Calá-la no build só é correto **se a captura garantidamente produzir a imagem ou falhar alto** — e é a Tarefa 3 que tem de garantir isso, antes da Tarefa 4 calar a regra.

### Fato 4 — a captura mora **dentro** da etapa 5, não numa etapa nova

Spec 3.3, etapa 5:

> *"abre o resultado no Chrome headless e roda as regras de composição; **na fase 2, também captura a imagem estática das demos que não têm imagem própria**"*

O Chrome já está aberto e a página já está montada e renderizada. `build/captura.mjs` entra ali — **não abre um segundo navegador**, e não é uma etapa 8.

Spec 7.2: *"para demos sem `img.estatico` e sem `capturar()`, o Chrome headless fotografa a `div.demo` depois de `iniciar()` e de `data-captura-ms` (padrão **3000 ms**)"*. O 3000 é da spec: entra como constante nomeada com a citação ao lado, **ou** como entrada no contrato — se entrar no contrato, ele é quem manda e o código só lê.

### Fato 5 — o estilo dos três controles está escrito, e é específico

> *"`button.controle` (retangular, contorno de 2 px, Geist 600 20 px; ativo em campo `tinta` com texto `papel`), `input.controle[type=range]` (trilho de 2 px em `linha`, cursor quadrado de 16 px em `tinta`) e `output.leitura` (Geist Mono 20 px)"*

Retangular: **sem cantos arredondados**, que é a decisão de composição do sistema inteiro. Cursor **quadrado**, não redondo — e um `input[type=range]` só fica quadrado com pseudo-elementos por navegador (`::-webkit-slider-thumb`), o que o CSS de hoje ainda não usa em lugar nenhum.

---

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `contrato/contrato.json` | os três elementos e as duas classes | 1 |
| `componentes/controles.js` (novo), `estilos/componentes.css` | os controles | 2 |
| `build/captura.mjs` (novo), `build/build.mjs` | a captura, dentro da etapa 5 | 3 |
| `validador/validar.js`, `validador/regras/carga.js` | o eixo de modo | 4 |
| `especime/`, `tests/integracao/` | a prova de ponta a ponta | 5 |

---

### Tarefa 1: o contrato admite os controles

- [ ] **Passo 1: os três elementos**

`button`, `input` e `output` entram no vocabulário **presos a `div.demo` e à fase 2**. A forma do dado é sua; o critério não:

> **Um slide sem `div.demo` não pode conter `button`, `input` nem `output`, em fase nenhuma.**

O mecanismo vizinho é `html.elementosFase2`, que hoje tem a forma `{elemento: {dentro: [...]}}` — uma forma que comporta três elementos tão bem quanto um. Reusá-la é provavelmente certo; se você escolher outra, escreva por quê.

- [ ] **Passo 2: as duas classes**

`controle` (em `button` e `input`) e `leitura` (em `output`), as duas com `fase: 2`, no molde de `classes.grafico`. `papeis.leitura` já existe e não se mexe (Fato 2).

- [ ] **Passo 3: as guardas, com inversão**

1. um slide `demo` com os três controles **valida limpo na fase 2**;
2. o mesmo slide **é recusado na fase 1**;
3. um `button` num slide de **conteúdo** é recusado **nas duas fases** — esta é a inversão que importa, e é o critério do passo 1 virado em teste. Rode-a com o `dentro` removido do seu dado e veja ficar vermelha.

- [ ] **Passo 4: regerar o que deriva** — `npm run guia` e `aula-usp pacotes` no mesmo diff.

---

### Tarefa 2: `componentes/controles.js` e o CSS

- [ ] **Passo 1: o CSS, com os números da spec (Fato 5)**

Em `estilos/componentes.css`, com **todas as medidas e cores dos tokens**. Retangular quer dizer sem raio; cursor quadrado de 16 px quer dizer pseudo-elemento por navegador. Escreva no CSS, em comentário, que o quadrado é decisão de composição — senão o próximo a mexer "conserta" para redondo.

- [ ] **Passo 2: o módulo**

Os controles são declarativos: o autor escreve `button.controle` e `output.leitura` no HTML, e o script da demo dele lê e escreve. `controles.js` cuida do que é do **sistema** — o estado `ativo` do botão, a leitura formatada em `output` —, não da lógica da demo.

Antes de escrever, leia `motor/demos.js` e decida o que já é de lá. **A pior saída desta tarefa é um segundo lugar que também mexe em demo.**

- [ ] **Passo 3: os testes**

O estado `ativo` do botão e o texto do `output` são observáveis no DOM: teste-os. A aparência (2 px, quadrado, Geist 600) é de composição e cai nos testes de integração, onde já existem `composicao.tamanho-minimo` e companhia para medir texto renderizado.

---

### Tarefa 3: `build/captura.mjs`

**Esta tarefa vem antes da 4 de propósito** — ver Fato 3: a regra só pode se calar no build depois que a captura for confiável.

- [ ] **Passo 1: onde entra (Fato 4)**

Dentro da etapa 5 de `build/build.mjs`, com o Chrome já aberto e a página renderizada. Para cada `div.demo[data-demo]` **sem `img.estatico` e sem `capturar()`**: chamar `iniciar()`, esperar `data-captura-ms` (padrão 3000), fotografar **a `div.demo`** — não a página —, e embutir a imagem como `img.estatico`.

Note que o alvo é exatamente o complemento do que `recursos.demo-sem-estatico` acusa. **Essa correspondência é o contrato entre as Tarefas 3 e 4, e vale escrevê-la em comentário nos dois lados.**

- [ ] **Passo 2: falhar alto, que é o ponto**

Se a captura não produzir imagem — a demo não registrou `iniciar()`, a `div` está 0×0, o timeout estourou —, **o build tem de dizer**, com o nome da demo. A regra que avisava vai se calar no build (Tarefa 4); se a captura também se calar, o PDF sai vazio **e ninguém soube**, que é exatamente o defeito que a regra existia para impedir.

Escreva no commit qual é o comportamento em falha, porque ele é a razão de ser desta tarefa.

- [ ] **Passo 3: sem Chrome**

A spec 3.3 é clara: sem Chrome o build pula as etapas 5 e 6, avisa e termina com 0. A captura é parte da etapa 5 e **some junto** — mas aí a demo fica sem imagem no PDF, e o aviso precisa dizer isso, não só "sem Chrome".

- [ ] **Passo 4: o teste**

Um deck com uma demo sem imagem própria, `aula-usp build`, e a afirmação sobre o **PDF**: a página da demo não está em branco. É o critério de aceite da fase 2 escrito como teste (spec 12), e é o único jeito honesto de provar esta tarefa.

---

### Tarefa 4: `recursos.demo-sem-estatico` ganha o eixo de modo

- [ ] **Passo 1: o modo no contexto**

`validar(doc, { contrato, regras, grupo, fase = 1, ...dados })` já passa adiante o que vier a mais — foi assim que `cobertura` e `recursos` entraram sem mexer no núcleo. **Use esse mesmo caminho** para o modo, e dê a ele um padrão que não mude o comportamento de quem não o passa.

- [ ] **Passo 2: a regra**

Na fase 2 e no modo build, a regra se cala — porque a captura cobre o caso. Na fase 2 e no modo navegador, continua avisando. Na fase 1, avisa sempre, como hoje. **Três casos, e os três com teste.**

- [ ] **Passo 3: a inversão que importa**

Prove que a regra **não** se calou onde não devia: no modo navegador, fase 2, uma demo sem imagem e sem `capturar()` **continua avisando**. Se esse teste passar com a regra calada de vez, ele não guarda nada — rode-o contra uma versão que ignora o modo e veja ficar vermelho.

- [ ] **Passo 4: a fixture**

`recursos.demo-sem-estatico` já tem pasta de fixture? Se tiver, ela agora descreve um dos três casos — deixe claro qual, no nome ou num comentário, para que ninguém leia a fixture como se fosse a regra inteira.

---

### Tarefa 5: o espécime e a prova no PDF

- [ ] **Passo 1: o espécime**

O espécime tem hoje *"uma demo simples com `img.estatico`"* (spec 10.3). A fase 2 precisa do caso complementar: **uma demo sem imagem própria**, com controles, que o build fotografa.

Decida se ela substitui a existente ou entra ao lado — e prefira **ao lado**: a demo com `img.estatico` continua sendo um caso real, e perdê-la tira cobertura do caminho da fase 1.

- [ ] **Passo 2: a comparação visual, com o que já está resolvido**

`visual.test.mjs` compara os dois modos com **a área das demos mascarada** (spec 11.2) — então uma demo animada não polui a comparação. Confirme que a máscara cobre a demo nova; se ela mudar de tamanho ou de posição, a máscara precisa acompanhar.

- [ ] **Passo 3: o critério da fase 2, medido**

Spec 12: *"testes verdes e essa aula validada, **com uma demo sem imagem própria capturada no PDF**"*. A parte depois da vírgula é desta tarefa. O relatório traz a evidência: a página do PDF, e o que há nela.

---

## Verificação final da 2c

- [ ] `npm test` e `npm run test:integracao` verdes
- [ ] `aula-usp dist`, `npm run guia` e `aula-usp pacotes` sem diff pendente
- [ ] um `button` fora de `div.demo` é recusado **nas duas fases**
- [ ] a demo sem imagem própria **aparece no PDF**, e a página não está em branco
- [ ] a captura que falha **fala**, com o nome da demo
- [ ] `recursos.demo-sem-estatico`: os três casos (fase 1; fase 2 navegador; fase 2 build) com teste

## O que a 2c NÃO faz

- **Gráficos** (2a) e **diagramas** (2b) — independentes desta, em qualquer ordem.
- **Guia, pacotes e `exemplos/regressao-linear/`** (2d), mais o aceite da fase 2.
- **Publicar** (fase 3).
