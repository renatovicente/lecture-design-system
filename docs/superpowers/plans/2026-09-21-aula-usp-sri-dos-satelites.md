# SRI dos satélites — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** cumprir a promessa da spec 3.2, passo 5 — *"cada script secundário é carregado com o seu `integrity`, que `aula-usp.js` traz embutido para a mesma versão"* — que hoje não é cumprida. **Desbloqueia a fase 3.**

**Arquitetura:** o empacotador inverte a ordem (satélites primeiro, principal depois) e embute os hashes no principal; o `montar/dist.js` injeta um **import map com `integrity`**, e o `import()` dinâmico que já existe passa a ser verificado pelo navegador. Nenhum mecanismo novo de carga — o `import()` fica onde está.

**Pilha:** Node ≥ 20.6, ES modules, `esbuild`, `node:test`, `playwright-core`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.2 (passo 5), 8.2, 12 e 14 (a tabela de riscos).

---

## Por que agora, e por que este é o momento mais barato

A fase 2 acrescenta **dois satélites novos** — `aula-usp-graficos.js` e `aula-usp-diagramas.js` (spec 3.5). Sem o mecanismo, os dois nascem sem `integrity` e o conserto passa de nove arquivos para onze. O custo de criar o mecanismo é o mesmo hoje ou depois; o que cresce é o que precisa ser retrofitado nele.

E é **segurança**: a tabela de riscos da seção 14 nomeia "arquivo alterado na CDN ou versão maliciosa do pacote" e dá como mitigação "versão exata e hash de integridade em todas as tags **e cargas de scripts**". O script principal está protegido — provado num Chrome real no marco 6c. Os nove secundários não.

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem dependência nova.
- **A fronteira:** `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node. `montar/dist.js` é do lado navegador — **cuidado redobrado nesta tarefa**, porque ela mexe lá.
- **Contrato como dado**, e aqui vale para os hashes: nenhum é digitado; todos saem do que o empacotador acabou de produzir.
- **Uma guarda de regerar-e-comparar não prova nada sobre o gerador** (`AGENTS.md`). Este projeto já reproduziu isso **seis vezes**. Asseverem-se propriedades.
- Tudo em português. Commits terminando com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, sem afirmar mais do que a evidência sustenta.

---

## Fatos medidos antes deste plano

Medidos em `3493255`.

**Fato 1 — a promessa não é implementável do jeito que o código carrega hoje.** `montar/entrada.js` carrega os satélites com `import(resolver(…))` nas linhas 104, 132, 133 e 134. **`import()` dinâmico não aceita `integrity`** — não há argumento para isso. Por isso a spec 3.2 passo 5 nunca foi cumprida, e não por esquecimento: o mecanismo escolhido não a admite.

**Fato 2 — o import map tem `integrity`, e o Chrome a honra, inclusive para `import()` dinâmico.** Medido com um módulo de sonda e dois hashes:

| página | resultado |
|---|---|
| import map com o hash **certo** | o módulo carrega e roda |
| com o hash **corrompido** | não carrega; o Chrome loga *"Failed to find a valid digest in the 'integrity' attribute"* |

**Fato 3 — e funciona com o import map INJETADO por script clássico**, que é exatamente a situação do `montar/dist.js`. Medido, nos dois sentidos: com o hash certo o `import()` resolve; com o hash corrompido ele **rejeita** com *"Failed to fetch dynamically imported module"*, e o console traz o mesmo erro de digest. **É este fato que torna o plano viável sem trocar o mecanismo de carga.**

**Fato 4 — a máquina já existe no repositório.** `build/servir.mjs:79` (`reescreverRuntime`) já injeta um `<script type="importmap">` no modo de desenvolvimento. O que falta é a chave `integrity` e o caminho do pacote.

**Fato 5 — a ordem do empacotador está invertida para este fim.** `build/bundle.mjs` constrói `aula-usp.js` **primeiro** (linha 85) e os satélites depois (101, 105, 109). O principal **não pode** conter hashes de arquivos que ainda não existem. A ordem tem de virar: satélites → hashes → principal.

Isto não é novidade de desenho: o `AGENTS.md` já documenta o mesmo padrão para `aula-usp dist`, que gera `cobertura.json` **antes** de empacotar, "porque na ordem inversa o artefato sairia sempre uma geração atrasado". **Segunda instância da mesma regra.**

**Fato 6 — são nove satélites** carregados dinamicamente: `aula-usp-tex.js`, `aula-usp-codigo.js` e sete gramáticas. Medido: **zero ocorrências de `integrity`** em `dist/aula-usp.js` e em `dist/aula-usp-codigo.js`.

**Fato 7 — a verificação já existe.** O trabalho do marco 6c criou a interceptação da rota da CDN no Playwright, que fez o caminho de produção rodar pela primeira vez neste repositório — e foi ela que **tornou esta lacuna visível**. É ela que vai provar o conserto.

---

## Estrutura de arquivos

- Modificar: `build/bundle.mjs` — a ordem e os hashes (Tarefa 1)
- Modificar: `montar/dist.js` — o import map com `integrity` (Tarefa 2)
- Modificar: `build/servir.mjs` — a chave `integrity` no import map do dev, se aplicável (Tarefa 2)
- Modificar: `tests/integracao/dist.test.mjs` — a prova (Tarefa 3)
- Modificar: `AGENTS.md` — a segunda instância da regra de ordem (Tarefa 1)
- Regenerar: `dist/` e `pacotes/`

---

### Tarefa 1: o empacotador inverte a ordem e embute os hashes

- [ ] **Passo 1: inverter**

Satélites primeiro, hashes calculados, `aula-usp.js` por último. O hash é o mesmo `sha384-` base64 que `dist/manifesto.json` já carrega — **reaproveite a função que o calcula**, não escreva uma segunda.

- [ ] **Passo 2: embutir**

Os nove hashes entram em `aula-usp.js`. O `pluginFontesDoSistemaEmbutidas` é o precedente de como se embute algo no empacotamento; decida entre plugin e `define`, e diga por quê.

**O mapa embutido é de nome lógico → hash**, e quem resolve nome lógico em URL é o `resolver` de `montar/dist.js` — não duplique essa resolução. Duas verdades sobre o mesmo endereço é a classe que este projeto mais pagou caro.

- [ ] **Passo 3: a guarda**

Que **todo satélite** tenha hash embutido, derivado da lista que o empacotador produz — não de uma lista escrita no teste. E que o hash embutido **seja igual** ao do manifesto para o mesmo arquivo: são dois lugares com o mesmo número, e é exatamente aí que eles divergem com o tempo.

- [ ] **Passo 4: `AGENTS.md`**

A regra de ordem ganha a segunda instância, ao lado da de `cobertura.json`.

---

### Tarefa 2: o `montar/dist.js` injeta o import map com `integrity`

**Atenção à fronteira:** `montar/` é do lado navegador. Nada de Node aqui.

- [ ] **Passo 1: injetar**

No arranque, antes de qualquer `import()`, monte o import map com `imports` e `integrity` a partir do mapa embutido e do `base` que o `document.currentScript?.src` já dá (`montar/dist.js:62` — e o comentário ali avisa que `currentScript` só vale durante a execução síncrona; **guarde antes de qualquer `await`**).

- [ ] **Passo 2: a ordem, que é a armadilha**

O import map tem de estar no documento **antes** do primeiro `import()`. O Fato 3 mede que injetar de script clássico funciona — mas ele mede o caso simples. **Confirme no arranque real**, com a aula do espécime, que a ordem se sustenta.

- [ ] **Passo 3: o modo de desenvolvimento**

`build/servir.mjs` já injeta um import map. Decida se ele também ganha `integrity` — em dev os arquivos vêm do disco local, e o argumento de segurança é outro. **Diga o que decidiu e por quê**; o risco de acrescentar é que o dev passe a falhar quando alguém edita um satélite sem regerar, o que pode ser bom ou péssimo.

---

### Tarefa 3: a prova

- [ ] **Passo 1: o caminho feliz**

Sobre a interceptação da rota da CDN que já existe (Fato 7): com as tags fixadas, uma aula que usa matemática **e** código carrega os satélites e monta, e os pedidos saem com `integrity`.

- [ ] **Passo 2: a inversão, e é ela que fecha a spec**

**Corrompa os bytes de um satélite na rota interceptada** — dois bytes bastam, como no marco 6c — e prove que **o navegador recusa e a aula não monta**. Relate a mensagem do Chrome.

É a primeira vez que este repositório provaria que o `integrity` dos **secundários** funciona. O do principal já foi provado assim.

- [ ] **Passo 3: a inversão do mecanismo**

Desligue a injeção do import map, regere, e mostre que a guarda de igualdade fica **verde** enquanto a de propriedade cai — este projeto já reproduziu isso seis vezes e a sétima confirma que a guarda nova é de propriedade.

---

## Verificação final

- [ ] `npm test` e `npm run test:integracao` verdes (472 e 202 na base)
- [ ] `aula-usp dist`, `npm run guia` e `aula-usp pacotes` sem diff
- [ ] `grep -c integrity dist/aula-usp.js` **maior que zero** — hoje é 0
- [ ] os oito alvos pelos dois comandos, sem regressão (15, 11, 9, 15, 6, 12, 6, 11 páginas)
- [ ] os tamanhos de `dist/` seguem dentro das metas da spec 11.2

## O que este plano NÃO faz

- **Não publica nada.** A fase 3 continua dependendo de autorização explícita do autor.
- **Não mexe no que o `build` embute.** O HTML autocontido não busca nada da rede; o SRI é do modo navegador.
- **Não começa a fase 2** — só remove o motivo de ela herdar o problema.
