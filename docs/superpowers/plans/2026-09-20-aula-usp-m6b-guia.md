# Marco 6b: o guia do autor — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** escrever `guia/` — os dezesseis arquivos que são a **fonte única** de todo texto de instrução do Aula USP —, e o gerador que produz, a partir do contrato e do espécime, tudo que não deve ser escrito à mão.

**Arquitetura:** um módulo Node novo, `build/guia.mjs`, gera duas tabelas do contrato e extrai sete exemplos do espécime, e um comando `npm run guia` os escreve **entre marcadores** dentro dos arquivos de guia. Os arquivos ficam versionados com o conteúdo gerado dentro, e um teste regenera e compara — o mesmo padrão que `tokens.css`, `fontes.css`, `cobertura.json` e `dist/` já seguem. O resto é prosa escrita à mão, e é ela que exige julgamento.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.4, 10.1, 10.3, 5.x (o contrato que o guia explica) e 14 (os riscos que `72-artifact-claude.md` documenta).

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem framework de teste de terceiros.
- **A fronteira:** `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node. `build/guia.mjs` é Node e fica em `build/`, onde pertence.
- **Contrato como dado, e aqui isso é o coração do marco:** nenhum número, nome de layout, nome de regra ou limite é digitado à mão em `guia/`. Se a informação existe no contrato, ela é **gerada**; se existe no espécime, é **extraída**. O que sobra para a prosa é o que nenhuma das duas fontes tem: o porquê.
- Tudo em português.
- Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, e **nenhuma mensagem de commit afirma mais do que a evidência sustenta**.

---

## Fatos medidos antes deste plano

Medidos no repositório em `8dcc822`. Os números entram aqui para ninguém os redescobrir — e, neste marco, também porque **três deles corrigem coisas que eu mesmo afirmei errado antes**.

**Fato 1 — são dezesseis arquivos, não treze.** A tabela da spec 10.1 tem 16 linhas: onze de guia (`00-principios`, `10-estrutura`, `20-layouts`, `30-componentes`, `40-matematica-e-codigo`, `50-graficos-diagramas-demos`, `60-validador`, `70-fluxo-terminal`, `71-fluxo-chat`, `72-artifact-claude`, `73-chatgpt`) e cinco em `guia/pacotes/` (`skill`, `projeto-claude`, `gpt-instrucoes`, `gpt-iniciadores`, `agents-disciplina`). O plano do 6a dizia "13 arquivos de guia, 5 de pacote"; os dois números estavam errados.

**Fato 2 — `tex-destaque` NÃO é uma tag, e este é o erro mais fácil de cometer neste marco.** Ele está em `contrato.blocosDeCorpo` ao lado de `p`, `ul`, `table`, o que convida a documentá-lo como elemento. Mas `validador/sequencia.js:1-3` diz o que ele é: *"a equação em destaque é texto solto (`\[ … \]`), que o contrato chama de 'tex-destaque'"*. Não existe `<tex-destaque>` em lugar nenhum do repositório — nem CSS, nem código de montagem, nem uma ocorrência no espécime. **Um guia gerado ingenuamente da lista do contrato inventaria uma tag.**

**Fato 3 — a sequência de um layout tem três formas de item, não uma.** Medido: as chaves possíveis são `seletor`, `grupo`, `umDe`, mais `min`/`max`. Um gerador que leia só `seletor` imprime `undefined` — eu escrevi esse gerador, rodei, e foi o que saiu para o layout `conteudo`, cujo terceiro item é um `umDe` entre `div.colunas` e um grupo de blocos de corpo.

**Fato 4 — o espécime cobre os sete layouts e os onze blocos de corpo.** Por isso os exemplos do guia são **extraídos**, não escritos: o espécime é validado a cada rodada, então todo exemplo extraído dele é, por construção, um exemplo que passa. Medido: pegando a menor `<section>` de cada layout entre os seis decks, os sete exemplos somam **2.043 caracteres**, de 3 a 8 linhas cada.

**Fato 5 — as duas tabelas geradas, medidas.** A de layouts, com a gramática das três formas resolvida, sai em **602 caracteres** e sete linhas. A de regras da fase 1 sai em **5.298 caracteres** e sessenta linhas. Esse segundo número decide um desenho do 6c: a tabela cabe num arquivo de guia e **não** cabe nas instruções do GPT, que têm teto de 8.000 caracteres para o bloco de regras essenciais mais o procedimento.

**Fato 6 — o gerador revela três opcionalidades que um guia escrito à mão erraria:** `p.pergunta` é **opcional** em `abertura`, `h2` é **opcional** em `figura`, e `p.proxima` é **opcional** em `encerramento`.

**Fato 7 — o padrão de gerado-e-versionado já existe e está documentado**, com quatro precedentes listados em `AGENTS.md:62`: `estilos/tokens.css` e `tokens/tokens.js` (guarda em `tests/unit/tokens.test.mjs:93`), `estilos/fontes.css` (`fontes-css.test.mjs:24`), `validador/cobertura.json` (`cobertura.test.mjs:74`) e `dist/` (`bundle.test.mjs:115` e `:135`). Todos rastreados no git, todos com cabeçalho "Gerado por … Não editar à mão", todos com uma guarda que regera e compara. **O guia é o quinto, e não inventa mecanismo novo.**

**Fato 8 — a seção 5.1 da spec não é fonte confiável de trecho pronto.** Ela acumulou três imprecisões durante o marco 6a: punha `ol.passos` como filho direto de `div.colunas` (não valida; corrigida em `761524c`), a correção disso generalizada demais gerou um embrulho de coluna supérfluo, e define taxa de aprendizado como "o tamanho de cada passo", o que é falso quando o passo é η × gradiente. **Ao escrever o guia, extraia do espécime; não copie da 5.1.**

**Fato 9 — ao documentar limites, não cite "66 de 90 palavras".** `limites.palavras-corpo` remove `h1`, `h2` e `p.lide` **antes** de contar. Uma revisão do 6a citou números que somavam os três, e eles não são o que a regra mede.

---

## O mecanismo dos marcadores

Um só mecanismo serve a dois propósitos, e é por isso que ele é da Tarefa 1:

```markdown
<!-- gerado:tabela-de-layouts -->
…conteúdo gerado, sobrescrito por `npm run guia`…
<!-- /gerado -->
```

```markdown
<!-- regras-essenciais:início -->
…o bloco que a spec 10.1 manda entrar literalmente em todos os pacotes…
<!-- regras-essenciais:fim -->
```

O primeiro é **escrita**: `npm run guia` substitui o que está entre os marcadores. O segundo é **leitura**: o `aula-usp pacotes` do 6c extrai o bloco e o injeta nos quatro pacotes. Comentário HTML porque é invisível em markdown renderizado, e porque o guia é lido por humanos e por modelos.

---

## Estrutura de arquivos

- Criar: `build/guia.mjs` — os geradores e o aplicador de marcadores (Tarefa 1)
- Criar: `tests/unit/guia.test.mjs` — a guarda de regerar-e-comparar (Tarefa 1)
- Modificar: `package.json` — o script `guia` (Tarefa 1)
- Criar: `guia/00-principios.md`, `guia/10-estrutura.md` (Tarefa 2)
- Criar: `guia/20-layouts.md`, `guia/30-componentes.md` (Tarefa 3)
- Criar: `guia/40-matematica-e-codigo.md`, `guia/50-graficos-diagramas-demos.md` (Tarefa 4)
- Criar: `guia/60-validador.md` (Tarefa 5)
- Criar: `guia/70-fluxo-terminal.md`, `71-fluxo-chat.md`, `72-artifact-claude.md`, `73-chatgpt.md` (Tarefa 6)
- Criar: `guia/pacotes/skill.md`, `projeto-claude.md`, `gpt-instrucoes.md`, `gpt-iniciadores.md`, `agents-disciplina.md` (Tarefa 7)
- Modificar: `AGENTS.md` — a linha do guia na tabela de gerados (Tarefa 1)

---

### Tarefa 1: `build/guia.mjs`, o comando e a guarda

**Interfaces:**
- Produz: `tabelaDeLayouts(contrato)`, `tabelaDeRegras(contrato, { fase })`, `exemplosPorLayout(raiz)`, `aplicarMarcadores(texto, blocos)`, `gerarGuia({ raiz })`. As Tarefas 3 e 5 consomem as duas tabelas e os exemplos; o 6c consome o bloco de regras essenciais.

- [ ] **Passo 1: escrever os geradores**

Este código foi prototipado e medido (Fatos 3, 5 e 6). Escreva-o assim.

```javascript
// Gera o que o contrato e o espécime já sabem, para que o guia não repita nenhum dos dois à mão
// (spec 3.4: "nenhum texto de instrução é mantido à mão fora de guia/"). Quinto artefato gerado e
// versionado do repositório — ver a tabela em AGENTS.md.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// A sequência de um layout tem TRÊS formas de item — {seletor}, {grupo} e {umDe:[[…],[…]]} —, mais
// min/max. Ler só `seletor` imprime "undefined" no layout `conteudo`, cujo terceiro item é um umDe
// entre div.colunas e um grupo de blocos de corpo (medido).
function quantos({ min = 1, max = 1 }) {
  if (min === 1 && max === 1) return '';
  if (min === 0 && max === 1) return ' (opcional)';
  if (min === 1 && max === null) return ' (um ou mais)';
  if (min === 0 && max === null) return ' (zero ou mais)';
  return ` (${min} a ${max ?? 'vários'})`;
}

function itemDaSequencia(entrada) {
  if (entrada.umDe) {
    return entrada.umDe.map((alternativa) => alternativa.map(itemDaSequencia).join(' + ')).join(' **ou** ');
  }
  if (entrada.grupo) return `um bloco de corpo${quantos(entrada)}`;
  return `\`${entrada.seletor}\`${quantos(entrada)}`;
}

export function tabelaDeLayouts(contrato) {
  const linhas = Object.entries(contrato.layouts).map(([nome, layout]) =>
    `| \`${nome}\` | ${(layout.sequencia ?? []).map(itemDaSequencia).join(', ') || '—'} `
    + `| ${(layout.cromo ?? []).join(', ') || '—'} |`);
  return ['| layout | conteúdo, na ordem | cromo automático |', '|---|---|---|', ...linhas].join('\n');
}

export function tabelaDeRegras(contrato, { fase = 1 } = {}) {
  const linhas = Object.entries(contrato.regras)
    .filter(([, regra]) => regra.fase === fase)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([nome, regra]) => `| \`${nome}\` | ${regra.severidade} | ${regra.acao} |`);
  return ['| regra | severidade | como corrigir |', '|---|---|---|', ...linhas].join('\n');
}

// Um exemplo por layout, EXTRAÍDO do espécime e não escrito: o espécime é validado a cada rodada,
// então todo trecho daqui é, por construção, um trecho que passa. Escolhe o menor entre os decks.
export function exemplosPorLayout(raiz) {
  const achados = {};
  for (const nome of readdirSync(new URL('especime/', raiz)).filter((n) => n.endsWith('.html'))) {
    const html = readFileSync(new URL(`especime/${nome}`, raiz), 'utf8');
    for (const trecho of html.match(/<section data-layout="[a-z-]+"[\s\S]*?<\/section>/g) ?? []) {
      const layout = trecho.match(/data-layout="([a-z-]+)"/)[1];
      if (!achados[layout] || trecho.length < achados[layout].trecho.length) {
        achados[layout] = { trecho, deck: nome };
      }
    }
  }
  return achados;
}

// Substitui o conteúdo entre <!-- gerado:nome --> e <!-- /gerado -->. Erra alto se um marcador
// pedido não existir: um bloco que silenciosamente não é escrito é a forma deste projeto de
// produzir documentação que mente.
export function aplicarMarcadores(texto, blocos) {
  let saida = texto;
  for (const [nome, conteudo] of Object.entries(blocos)) {
    const marca = new RegExp(`(<!-- gerado:${nome} -->\\n)[\\s\\S]*?(<!-- /gerado -->)`);
    if (!marca.test(saida)) throw new Error(`marcador "gerado:${nome}" não encontrado`);
    saida = saida.replace(marca, (_, abre, fecha) => `${abre}${conteudo}\n${fecha}`);
  }
  return saida;
}
```

- [ ] **Passo 2: escrever o `gerarGuia`**

Ele lê cada arquivo de guia que tem marcador, aplica os blocos que lhe cabem e grava. Quais arquivos recebem o quê:

| arquivo | marcador | conteúdo |
|---|---|---|
| `guia/20-layouts.md` | `tabela-de-layouts` | `tabelaDeLayouts(contrato)` |
| `guia/20-layouts.md` | `exemplos-por-layout` | um bloco ```` ```html ```` por layout, na ordem do contrato, cada um precedido de `#### \`<layout>\`` e seguido da linha `Extraído de \`especime/<deck>\`.` |
| `guia/60-validador.md` | `tabela-de-regras` | `tabelaDeRegras(contrato)` |

- [ ] **Passo 3: o script**

Em `package.json`, ao lado dos que já existem: `"guia": "node build/guia.mjs"`.

- [ ] **Passo 4: a guarda**

`tests/unit/guia.test.mjs`, no molde de `tests/unit/cobertura.test.mjs:74`: regera em memória e compara com o que está em disco, com a mensagem "rode `npm run guia`". Mais dois testes que só este marco pode escrever:

1. **a tabela de layouts não contém `undefined`** — é o Fato 3, e sem esta asserção o defeito volta calado;
2. **todo layout do contrato aparece na tabela e tem exemplo extraído** — deriva do contrato, não de uma lista escrita aqui, pelo mesmo motivo que a guarda de regras do 5c deriva os grupos.

- [ ] **Passo 5: inversão obrigatória**

Edite a tabela gerada à mão dentro de `20-layouts.md`, rode o teste, **veja falhar**, restaure. Relate a mensagem. Um gerado sem guarda que morde é um gerado que vai apodrecer.

- [ ] **Passo 6: `AGENTS.md`**

Acrescente a linha do guia à tabela de gerados (`AGENTS.md:62`), no formato das outras quatro.

- [ ] **Passo 7: commit**

```bash
git add build/guia.mjs tests/unit/guia.test.mjs package.json AGENTS.md
git commit -m "feat(guia): gera as tabelas do contrato e extrai os exemplos do espécime"
```

---

### Tarefas 2 a 7: os dezesseis arquivos

O que as seis tarefas têm em comum, e vale ler uma vez:

**A prosa é o entregável, e é a única parte que exige julgamento.** Tudo que o contrato ou o espécime sabem já vem gerado. O que você escreve é o que nenhum dos dois tem: por que a regra existe, o que o autor deve fazer quando ela acusa, e qual erro ela previne.

**O leitor é duplo.** O guia é lido por um professor e por um modelo de linguagem, e os dois precisam de coisas diferentes: o professor quer saber o porquê, o modelo quer a forma exata. Escreva o porquê em prosa e a forma em bloco de código — nunca descreva marcação em palavras quando pode mostrá-la.

**Não copie da seção 5.1 da spec** (Fato 8). Quando precisar de um trecho, tire do espécime, do modelo (`modelos/aula/index.html`) ou da aula-exemplo (`exemplos/descida-do-gradiente/index.html`) — os três validam.

**Nenhum número digitado à mão.** Se você se vir escrevendo "até 90 palavras" ou "no máximo 16 linhas", pare: ou o número sai do contrato por gerador, ou a frase é reescrita para não precisar dele. E se precisar mesmo, cite o Fato 9 — `limites.palavras-corpo` não conta `h1`, `h2` nem `p.lide`.

| tarefa | arquivos | o que a spec 10.1 pede |
|---|---|---|
| **2** | `00-principios.md`, `10-estrutura.md` | o que é o Aula USP e o **bloco de regras essenciais entre marcadores** (é ele que o 6c injeta nos quatro pacotes); esqueleto, metadados e blocos |
| **3** | `20-layouts.md`, `30-componentes.md` | tabelas geradas e um exemplo por layout; trechos prontos de cada componente |
| **4** | `40-matematica-e-codigo.md`, `50-graficos-diagramas-demos.md` | delimitadores, `\passo`, derivações, código e linhas marcadas; demos da fase 1, e o que é da fase 2 |
| **5** | `60-validador.md` | a tabela gerada de regras **e como corrigir cada uma** |
| **6** | `70-fluxo-terminal.md`, `71-fluxo-chat.md`, `72-artifact-claude.md`, `73-chatgpt.md` | os quatro fluxos de trabalho |
| **7** | `guia/pacotes/` (cinco arquivos) | os textos-fonte que o `aula-usp pacotes` do 6c monta |

**Três pontos por tarefa que merecem atenção:**

- **Tarefa 2** — o bloco de regras essenciais é o texto mais reutilizado do sistema: entra literalmente nos quatro pacotes. Um protótipo dele mediu **1.246 caracteres**, o que deixa ~6.750 dos 8.000 do GPT para o procedimento. Mantenha-o curto e sem número solto.
- **Tarefa 3** — `30-componentes.md` documenta onze blocos de corpo, e o décimo primeiro é o `tex-destaque` do Fato 2: **documente-o como equação em bloco `\[ … \]`, nunca como tag.**
- **Tarefa 6** — `72-artifact-claude.md` sai da seção 14 da spec (a tabela de riscos): o que não funciona dentro de um artifact do Claude e o que fazer em vez disso.

Cada tarefa termina com `npm test` verde e um commit próprio.

---

## Verificação final do marco 6b

- [ ] `npm test` verde, com os testes novos do guia
- [ ] `npm run test:integracao` verde (200 na base)
- [ ] `npm run guia` não muda nada num repositório limpo — `git status` vazio depois de rodá-lo
- [ ] os dezesseis arquivos existem e nenhum tem marcador não preenchido
- [ ] nenhum arquivo de `guia/` contém a palavra `undefined`
- [ ] `modelos/aula/`, `exemplos/descida-do-gradiente/` e os seis decks do espécime seguem em 0 erros

## O que o 6c herda

- O bloco de regras essenciais está entre `<!-- regras-essenciais:início -->` e `<!-- regras-essenciais:fim -->` em `guia/00-principios.md`, pronto para ser extraído.
- A tabela de regras mede ~5.300 caracteres: vai para `conhecimento/`, nunca para `instrucoes.txt`.
- `aula-usp pacotes` precisa **rodar o gerador do guia antes de empacotar**, pela mesma razão que `aula-usp dist` gera a cobertura antes de empacotar (`AGENTS.md`): empacotar um guia desatualizado entrega o artefato uma geração atrás.
- Continuam no 6c, do plano do 6a: `aula-usp novo`, `aula-usp pacotes`, os quatro pacotes, `tests/aceite/roteiro.md` e a reescrita completa do `README.md`.
