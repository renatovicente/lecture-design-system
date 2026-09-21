# Fase 2b: diagramas — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** entregar `figure.diagrama` — DOT que vira SVG com o estilo do sistema imposto depois do layout — e as duas regras de validação correspondentes.

**Arquitetura:** `componentes/diagramas.js` no padrão dos demais (biblioteca por parâmetro). O layout é do Graphviz; **o estilo é imposto por nós, sobre o SVG que ele devolve**. Um satélite novo, `aula-usp-diagramas.js`, com o WASM embutido.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. **Uma dependência nova**, nomeada pela spec 8.2: `@hpcc-js/wasm-graphviz`.

**Spec:** seções 7.2, 3.5, 8.2, 9.2, 9.3, 11.1, 11.2 e **14** (a tabela de riscos, que manda verificar algo no início desta fase).

**Depende de:** fase 2a, Tarefa 1. As três barreiras que a 2a abre valem para `figure.grafico` **e** `figure.diagrama` ao mesmo tempo — `html.elementosFase2.script.dentro` e `filhos.figure` nomeiam os dois. **Esta parte não mexe no contrato para abrir a forma; ela já vai estar aberta.**

---

## Restrições globais

As mesmas da 2a (ver `2026-09-21-aula-usp-f2a-graficos.md`), com uma a mais:

- **`@hpcc-js/wasm-graphviz` não está instalado.** Entra com `npm install`, e o `package-lock.json` vai no mesmo diff.

---

## Fatos medidos antes deste plano

### Fato 1 — a spec manda uma verificação no início desta fase, e o resultado dela ramifica o desenho

Seção 14, tabela de riscos:

> *"A política de segurança dos artifacts do Claude pode impedir compilar o WASM do Graphviz (fase 2) → **verificar no início da fase 2**; se bloquear, usar no modo navegador um layout em JavaScript puro (ELK) com o mesmo estilo, mantendo o Graphviz no build."*

Isto **não é um risco a monitorar**: é uma medição agendada, com as duas saídas já decididas. Por isso é a Tarefa 1, e por isso ela é a única tarefa deste plano cujo resultado pode mudar as seguintes.

A mesma tabela traz o segundo: *"Graphviz sem WASM embutido → o bundle do Aula USP embute"*, que ecoa a spec 7.2: *"O WASM tem de ir dentro do script."*

### Fato 2 — o contrato já tem tudo desta parte, e a 2a abre a porta

```
html.classes.diagrama          {"em":["figure"],"fase":2}
html.elementosFase2.script     {"dentro":["figure.grafico","figure.diagrama"]}
limites["diagrama.nos"]        15
recursos.dot                   {"severidade":"erro", "grupo":"carga","fase":2,"acao":"Corrija o DOT do diagrama."}
recursos.diagrama-grande       {"severidade":"aviso","grupo":"carga","fase":2,"acao":"Simplifique o diagrama para até 15 nós."}
```

**O limite de 15 nós mora no contrato.** O código lê `contrato.limites['diagrama.nos']` e conta; não repete o 15.

### Fato 3 — as duas regras são de **carga**, e a spec diz onde o Graphviz roda

Diferente de `recursos.grafico` (estática), as duas daqui são do grupo `carga`. A spec 9.3 explica por quê e onde: *"etapa 1: **KaTeX e Graphviz rodam no Node**, arquivos são checados no disco…"*. Compilar DOT é carga, não leitura de fonte — o mesmo lugar onde `matematica.tex-invalido` já mora.

### Fato 4 — o estilo vem **depois** do layout, e a spec enumera o que impor

> *"O layout é do Graphviz; o estilo é imposto depois: nós retangulares com contorno de 2 px em `tinta`, texto Geist 20 px, setas simples de 2 px; `class="foco"` num nó vira campo `amarelo`, e `class="ativo"` numa aresta vira `azul`."*

Duas consequências: o SVG que o Graphviz devolve **não é o resultado final**, e as duas classes do autor (`foco`, `ativo`) atravessam o DOT até o SVG — é preciso que sobrevivam à ida e à volta.

### Fato 5 — o vocabulário de SVG do contrato é a fronteira de saída

O diagrama vira SVG dentro da aula, e `vocabulario.elemento`, `vocabulario.cor-svg`, `vocabulario.amarelo-svg` e `vocabulario.azul-svg` já valem para SVG. **O SVG que sai do Graphviz não foi escrito pensando nesse vocabulário.** Se ele trouxer elemento fora da lista (`<title>`, `<polygon>`, comentários, `<g>` com atributos próprios) ou cor fora dos tokens, o próprio validador do sistema acusa — o que é a guarda certa, e é de graça.

### Fato 6 — herdados da 2a, valendo igual

- **Sem meta de tamanho** para este satélite (spec 11.2 nomeia três; ver 2a, Fato 5) — e aqui pesa mais, porque o WASM vai embutido.
- **A asserção de cobertura do SRI** (`tests/integracao/dist.test.mjs:224`) volta ao verde quando um deck da prova usar o satélite.
- **A marca `satelite`** de `build/bundle.mjs:82` é o que põe o arquivo no import map com `integrity`; a ordem é satélites → hashes → principal.
- **A guarda de regras de mão dupla** (`tests/unit/validador.test.mjs:419` e `:429`) — com estas duas, chega-se a **64 de 64**.

---

### Tarefa 1: a verificação da spec 14 — o WASM do Graphviz dentro de um artifact

**É a primeira porque o resultado dela decide as Tarefas 2 e 3.** Não comece pelo código.

- [ ] **Passo 1: a pergunta, na forma que se responde**

A pergunta **não** é "artifacts permitem WASM?" em geral. É:

> Um artifact do Claude, servindo o `aula-usp-diagramas.js` que **este** empacotador produz, consegue **instanciar** o módulo WASM do Graphviz embutido nele e devolver um SVG?

Três coisas podem bloquear, e são diferentes: a CSP sem `wasm-unsafe-eval`; `WebAssembly.instantiate` sobre bytes embutidos em vez de `fetch`; e o tamanho do script.

- [ ] **Passo 2: medir, com o artefato de verdade**

Monte o satélite (pode ser uma versão provisória, só para medir) e teste **dentro de um artifact real**, não num HTML local — a política só existe lá. Registre o que aconteceu: mensagem do console, se houve, e o SVG, se saiu.

- [ ] **Passo 3: escrever o resultado antes de seguir**

Grave a medição em `docs/superpowers/revisoes/` com data, o que foi servido e o que o console disse. **Este é o artefato que a spec 14 pede**; sem ele, a fase 2 fecha com um risco marcado "verificar" e nunca verificado.

- [ ] **Passo 4: a ramificação**

- **Se compilar:** as Tarefas 2 e 3 seguem como escritas. Anote no relatório que o plano B não foi preciso.
- **Se bloquear:** o plano B da spec entra — **ELK em JavaScript puro no modo navegador, Graphviz no build**, com o mesmo estilo dos dois lados. Isso **dobra** a Tarefa 2 (dois motores de layout, um resultado visual) e põe o teste de comparação visual (Tarefa 5) no centro, porque ele passa a ser o que prova que os dois motores concordam. **Pare e relate antes de implementar o plano B**: ele muda o tamanho desta parte, e essa é uma decisão do autor, não uma consequência automática.

---

### Tarefa 2: `componentes/diagramas.js`

- [ ] **Passo 1: o módulo, no padrão da casa**

A biblioteca por parâmetro, como `tex.js` e `codigo.js`:

```js
// Diagramas (spec 7.2): o DOT de figure.diagrama vira SVG. O Graphviz chega por parâmetro, para o
// mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
export function criarDesenhista({ graphviz }) { … }
export function desenharDiagramas(raiz, { desenhista }) { … }
```

- [ ] **Passo 2: o estilo imposto depois (Fato 4)**

Sobre o SVG devolvido pelo Graphviz, imponha: nós retangulares, contorno 2 px `tinta`, texto Geist 20 px, setas simples 2 px; nó com `class="foco"` → campo `amarelo`; aresta com `class="ativo"` → `azul`. **Todas as cores dos tokens**; nenhuma digitada.

Verifique cedo que `class` sobrevive ao Graphviz: é o gancho de que o passo inteiro depende, e descobrir que não sobrevive **depois** de escrever o estilizador custa o dobro.

- [ ] **Passo 3: a limpeza contra o vocabulário (Fato 5)**

O SVG do Graphviz traz coisas que o contrato não conhece. Rodar `vocabulario.*` sobre o resultado **é a guarda**, e ela é de graça: um deck com diagrama no espécime já a executa. Trate o que ela acusar como especificação do que limpar — não relaxe o vocabulário para acomodar o gerador.

- [ ] **Passo 4: os testes**

Entra DOT, sai SVG: quantos nós, qual a cor do nó com `foco`, qual a da aresta com `ativo`, se o contorno tem 2 px. Mais os snapshots que a spec 11.1 pede. **Um snapshot sozinho fica verde com a cor errada no dia em que alguém o regravar** — as asserções de propriedade é que seguram isso.

---

### Tarefa 3: o satélite `aula-usp-diagramas.js`, com o WASM dentro

- [ ] **Passo 1: embutir o WASM**

Spec 7.2: *"O WASM tem de ir dentro do script; se o pacote do Graphviz não o embutir, o bundle do Aula USP embute."* Meça primeiro **qual dos dois casos é o seu** — se `@hpcc-js/wasm-graphviz` já traz o WASM embutido, não embuta de novo.

A guarda é direta e vale escrever: **nenhum pedido de rede sai do satélite**. Um `.wasm` buscado à parte quebra o modo build (que não usa CDN) e provavelmente o artifact.

- [ ] **Passo 2: a marca `satelite` e a ordem** — igual à 2a, Tarefa 3, passo 1, com o mesmo modo de falha caro: mapa chaveado por nome nu deixa **todo indicador estático idêntico ao estado são** e os satélites carregam sem conferência.

- [ ] **Passo 3: a meta de tamanho**

Meça e proponha, com a folga escrita, em `METAS` de `tests/integracao/tamanhos.test.mjs`. **Aqui o número importa de verdade:** é o satélite com WASM dentro, o maior candidato a estourar, e a spec 14 põe o tamanho como um dos três modos de bloqueio no artifact (Tarefa 1, passo 1). Se a sua medição disser que a spec precisa de uma linha, **diga e não a escreva**.

- [ ] **Passo 4: `aula-usp dist` e `dist/` no mesmo diff.**

---

### Tarefa 4: `recursos.dot` e `recursos.diagrama-grande`

- [ ] **Passo 1: as duas regras, no grupo `carga` (Fato 3)**

Em `validador/regras/carga.js`, ao lado de `matematica.tex-invalido`, que é a vizinha certa: as duas compilam algo no Node para saber se está válido.

`recursos.dot`: o DOT não compila → erro, **com a mensagem do Graphviz e o trecho**, como `matematica.tex-invalido` faz com a do KaTeX. A mensagem do motor é o que torna o erro corrigível.

`recursos.diagrama-grande`: mais de `contrato.limites['diagrama.nos']` nós → aviso. **Conte os nós do resultado compilado, não do texto do DOT** — `a -> b -> c` declara três nós sem nomeá-los numa lista, e contar por regex erra para menos exatamente nos diagramas que mais interessam.

- [ ] **Passo 2: as fixtures**

Carga não se prova por fixture de linkedom sozinha (ver `AGENTS.md`): siga o molde de `rodarComCarga` em `tests/unit/validador.test.mjs`, que é como as quatro regras de carga da fase 1 já são testadas.

A inversão de `recursos.diagrama-grande` é obrigatória e específica: um diagrama com **exatamente 15** nós não avisa, e um com **16** avisa. Um teste que só passa 30 nós não distingue "conta certo" de "conta qualquer coisa grande".

- [ ] **Passo 3: 64 de 64**

Com estas duas, **todas as regras do contrato estão implementadas**. A guarda de mão dupla (`validador.test.mjs:419` e `:429`) deixa de precisar de filtro de fase para esse fim — mas **não a apague**: ela continua sendo o que acusa uma regra implementada que não existe no contrato. Derive a contagem do contrato; nunca digite 64.

---

### Tarefa 5: o espécime e a comparação visual

- [ ] **Passo 1: o deck**

Um diagrama no espécime aparece no guia sozinho (o extrator tira dele os exemplos). E a cobertura do SRI (Fato 6) precisa que **um deck de `DECKS_DA_PROVA`** use o satélite.

- [ ] **Passo 2: a comparação visual, com um peso extra nesta parte**

`visual.test.mjs` compara os dois modos com orçamento de 150 px por slide. Para diagramas isso é mais do que uma conferência: **o layout do Graphviz precisa ser determinístico entre as duas execuções**. Se o mesmo DOT sair com nós em posições diferentes no navegador e no build, a diferença não é ruído — é o motor.

**Se a Tarefa 1 tiver levado ao plano B, este teste é o item mais importante do plano**, porque passa a ser ele que prova que ELK e Graphviz produzem a mesma figura. Nesse caso, relate o número medido antes de qualquer ajuste.

**Não mexa no orçamento de 150 px para acomodar diferença.** Ele é guardado por um teste que assere os próprios limites dele, e afrouxá-lo apaga a classe de defeito que o marco 5c descobriu.

---

## Verificação final da 2b

- [ ] `npm test` e `npm run test:integracao` verdes
- [ ] `aula-usp dist`, `npm run guia` e `aula-usp pacotes` sem diff pendente
- [ ] **o relatório da spec 14 escrito e arquivado**, com o que foi medido no artifact
- [ ] o satélite carrega com `integrity` conferido e **recusa quando corrompido**, no navegador
- [ ] **nenhum pedido de rede sai do satélite** — o WASM está dentro
- [ ] **64 de 64 regras do contrato implementadas — derivado, não digitado**

## O que a 2b NÃO faz

- **Controles de demo e captura automática no build** (2c).
- **Guia, pacotes e `exemplos/regressao-linear/`** (2d), mais o aceite da fase 2.
- **Publicar** (fase 3): `package.json` ainda tem `private: true`, sem `license`, `author`, `repository` nem `files`.
