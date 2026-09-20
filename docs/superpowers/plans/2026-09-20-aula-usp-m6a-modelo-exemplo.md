# Marco 6a: modelo, aula-exemplo e `AGENTS.md` — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** criar os três artefatos de conteúdo que o guia descreve e os pacotes empacotam — o modelo de aula em branco, a aula-exemplo real da fase 1, e as instruções de desenvolvimento do próprio sistema — e fechar o teste de tamanho de `dist/` que a spec 11.2 pede e o marco 5a não escreveu.

**Arquitetura:** nenhuma linha de código novo de produção. O marco 6a é conteúdo verificado pelas ferramentas que os marcos 1 a 5 construíram: cada arquivo entregue passa por `aula-usp validar` e `aula-usp build` com zero erros, e é isso que o torna testável. O único código é um teste de integração que lê `dist/manifesto.json` e compara os tamanhos com as metas da spec.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`, `playwright-core` sobre o Chrome instalado. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 5.1, 5.2, 5.3, 10.2, 10.3 e 11.2.

---

## Por que o marco 6 é dividido em três

O marco 6 entrega, pela spec 12: guia, modelo, aula-exemplo, `pacotes`, `AGENTS.md` e `CLAUDE.md`. Medido no repositório em `085635a`, **nada disso existe**: não há `guia/`, `modelos/`, `exemplos/`, `pacotes/`, `tests/aceite/`, `AGENTS.md`, `CLAUDE.md` nem `build/pacotes.mjs`, e a CLI tem quatro comandos (`servir`, `validar`, `build`, `dist`), não cinco. São 13 arquivos de guia, 5 arquivos-fonte de pacote, 4 diretórios de pacote gerado, dois arquivos de aula e dois de raiz.

A divisão segue a dependência real, não o tamanho:

| parte | entrega | depende de |
|---|---|---|
| **6a** (este plano) | `modelos/aula/`, `exemplos/descida-do-gradiente/`, `AGENTS.md`, `CLAUDE.md`, teste de tamanho de `dist/` | nada — só das ferramentas prontas |
| **6b** | `guia/` — os 13 arquivos, com as tabelas geradas do contrato | 6a: o guia descreve o modelo e o exemplo, e cita trechos deles |
| **6c** | `build/pacotes.mjs`, `aula-usp pacotes`, **`aula-usp novo`**, os 4 pacotes gerados, `tests/aceite/roteiro.md`, **o `README.md` reescrito** | 6a e 6b: os pacotes empacotam guia, modelo e exemplo |

`aula-usp novo <pasta> --unidade ime` entrou nesta tabela depois: a spec 8.1 lista **seis** comandos e a
primeira divisão cobria cinco — `novo` não estava em marco nenhum. Ele copia `modelos/aula/` com os
metadados preenchidos, então depende do 6a. O `README.md` está desatualizado hoje (diz dois comandos e
contagens de teste do marco 4) e vai junto, no fim, quando os números pararem de se mexer.

Artefatos primeiro, documentação depois, empacotamento por último. Cada parte é rejeitável por um revisor sem depender das outras.

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem framework de teste de terceiros.
- **A fronteira:** `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node. Só `bin/` e `build/` são Node. **Este marco não toca em nenhum dos dois lados** — se você se vir editando código de produção, pare e releia a tarefa.
- **Contrato como dado:** `contrato/contrato.json` é a fonte de layouts, vocabulário, limites e regras. Nenhum número do contrato é reescrito à mão, aqui ou no guia — inclusive limiares.
- Textos visíveis ao usuário e nomes de símbolo em português.
- A prosa da aula-exemplo segue o skill `rv-writing-style` (`~/.claude/skills/rv-writing-style/`, verificado presente).
- Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, e **nenhuma mensagem de commit afirma mais do que a evidência sustenta**.

---

## Fatos medidos antes deste plano

Tudo abaixo foi medido no repositório em `085635a`, não lembrado. Os números entram no plano para que ninguém os redescubra.

**Fato 1 — o esqueleto da spec 5.1 NÃO valida, e a correção é da spec.** Prototipei o modelo com `<ol class="passos">` como filho direto de `div.colunas`, exatamente como a seção 5.1 desenha, e o validador acusa `estrutura.fora-do-layout`: *"`<ol>` não é permitido dentro de `<div>`"*. O contrato é explícito e está implementado desde o marco 4: `div.colunas` tem `{"elemento":"div","quantidadePorGrade":true}` — os filhos são `div`, um por vaga da grade — e `div.colunas > div` tem `{"grupo":"blocosDeCorpo"}`. O espécime segue o contrato (`especime/componentes.html:26-32`). **Duas partes da spec se contradizem, e a que está implementada e testada é o contrato.** A Tarefa 5 corrige a seção 5.1.

**Fato 2 — a abertura tem limite de nome curto.** `estrutura.nome-curto` exige `data-curto` com até 10 caracteres quando o `<h2>` da abertura passa de 10. "Primeiro bloco" (14) e "Segundo bloco" (13) acusam; "Intuição" (8) não. O modelo e o exemplo precisam de `data-curto` em toda abertura de nome longo.

**Fato 3 — a tag do runtime tem duas formas, e nenhuma delas chega ao navegador durante `validar` ou `build`.** (Corrigido depois que a execução do 6a mostrou que a primeira versão deste fato tinha a premissa errada; a decisão é a mesma, o motivo não.)

Três lugares tratam a tag, e vale saber os três:
- `build/embutir.mjs:134-136` a acha por `src.endsWith('/aula-usp.js')` e a troca pelo motor embutido — vale para `../../dist/aula-usp.js` e para `https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp.js` igualmente;
- `build/servir.mjs:79` (`reescreverRuntime`) troca **qualquer** `<script src="…/aula-usp.js">` pelo importmap mais `montar/carregador.js`, e isso roda em todo `.html` servido (linha 142);
- `build/composicao.mjs:6,39` mede a composição **através desse mesmo servidor**.

Ou seja: uma URL de CDN morta **não** quebraria a composição, porque o Chrome nunca a vê. O que a spec 8.1 de fato manda é o contrário do que eu supus — `pacotes` "reescreve a tag do runtime em `modelos/`, `especime/` e `exemplos/`", em lugar, e `servir` "troca o endereço pelo local e remove o `integrity`".

**Decisão, inalterada: o 6a escreve caminho relativo**, que é o que `especime/` já faz e o que mantém os arquivos abríveis direto do disco. **Quem fixa a tag com versão e `integrity` é o `aula-usp pacotes`, no 6c**, e ele a escreve nas três pastas, não só nos pacotes gerados.

**Fato 4 — a tag do CDN não conflita com `saida.referencia-externa`.** Essa regra é do grupo `saida` (roda sobre o HTML construído, spec 9.3) e o build já tirou a tag antes de ela rodar. Não há tensão a resolver.

**Fato 5 — os limites que o conteúdo precisa respeitar**, lidos do contrato: código 16 linhas × 64 colunas; corpo 90 palavras; coluna 60 palavras; lista 5 itens; síntese 3 itens de até 80 caracteres; título 2 segmentos × 2 linhas × 50 caracteres por segmento. Linguagens aceitas: `python`, `r`, `sql`, `javascript`, `bash`, `json`, `latex`.

**Fato 6 — os tamanhos de `dist/` hoje, contra as metas da spec 11.2:** `aula-usp.js` 546 KB (meta 700), `aula-usp-tex.js` 623 KB (meta 800), `aula-usp-codigo.js` 112 KB (meta 600). Todos dentro. O manifesto tem `versao` e, por arquivo, `bytes` e `integrity`.

**Fato 7 — o modelo desta Tarefa 1 já foi prototipado e medido:** `validar` devolve 0 erros e 0 avisos, e `build` conclui com código 0, 6 slides, 6 páginas de PDF. O HTML da Tarefa 1 é esse protótipo verificado, não um rascunho.

---

## Estrutura de arquivos

- Criar: `modelos/aula/index.html` — o esqueleto em branco (Tarefa 1)
- Criar: `exemplos/descida-do-gradiente/index.html` — a aula-exemplo da fase 1 (Tarefa 2)
- Criar: `AGENTS.md`, `CLAUDE.md` — instruções para desenvolver o próprio sistema (Tarefa 3)
- Criar: `tests/integracao/tamanhos.test.mjs` — o teste da spec 11.2 (Tarefa 4)
- Modificar: `docs/superpowers/specs/2026-09-14-aula-usp-design.md:283-287` — a correção do Fato 1 (Tarefa 5)

`modelos/` e `exemplos/` já estão cobertos pelo `.gitignore` de `dist/` (`dist/` mais `!/dist/`, do marco 5c), então `aula-usp build` nelas não suja o `git status`.

---

### Tarefa 1: o modelo de aula

**Arquivos:**
- Criar: `modelos/aula/index.html`

**Interfaces:**
- Produz: o arquivo que 6b cita em `10-estrutura.md` e que 6c copia para `assets/modelo.html` em todos os pacotes.

- [ ] **Passo 1: escrever o arquivo**

Este é o protótipo já verificado do Fato 7. Escreva-o literalmente.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Título da aula</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Nome da disciplina">
<meta name="aula" content="1">
<meta name="data" content="2026-03-02">
<meta name="professor" content="Prof. Nome Sobrenome">
<script src="../../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Título da aula<br><span class="sinal">subtítulo curto</span></h1>
</section>

<section data-layout="abertura" id="primeiro-bloco" data-curto="Bloco um">
  <h2>Primeiro bloco</h2>
  <p class="pergunta">Qual pergunta este bloco responde?</p>
</section>

<section data-layout="conteudo" id="uma-ideia">
  <h2>Uma ideia por slide;<br><span class="sinal">o título diz qual é.</span></h2>
  <p class="lide">A primeira frase entrega a ideia inteira.</p>
  <p>O corpo desenvolve a ideia em duas ou três frases.</p>
  <aside class="notas">O que dizer em voz alta e não está escrito no slide.</aside>
</section>

<section data-layout="abertura" id="segundo-bloco" data-curto="Bloco dois">
  <h2>Segundo bloco</h2>
  <p class="pergunta">E qual pergunta este responde?</p>
</section>

<section data-layout="conteudo" id="duas-colunas">
  <h2>Quando texto e figura<br><span class="sinal">andam juntos.</span></h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <p>A coluna da esquerda argumenta.</p>
      <aside class="destaque" data-rotulo="Definição">Um termo novo, definido em uma frase.</aside>
    </div>
    <div>
      <ol class="passos">
        <li>Primeiro passo.</li>
        <li data-passo>Segundo passo, revelado depois.</li>
        <li data-passo>Terceiro passo.</li>
      </ol>
    </div>
  </div>
  <aside class="notas">Revelar os passos um a um, falando cada um antes de mostrar o próximo.</aside>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>A primeira coisa que o aluno leva.</li>
    <li>A segunda.</li>
  </ol>
  <p class="proxima">Próxima aula: assunto seguinte.</p>
</section>

</body>
</html>
```

Note a segunda coluna: o `<ol class="passos">` mora **dentro** de um `<div>`, não solto em `div.colunas`. É o Fato 1.

- [ ] **Passo 2: validar**

Rode: `node bin/aula-usp.mjs validar modelos/aula/`
Esperado: `Validador Aula USP: 0 erros, 0 avisos`

- [ ] **Passo 3: construir**

Rode: `node bin/aula-usp.mjs build modelos/aula/`
Esperado: `concluído — código 0`, `0 erros, 0 avisos`, `PDF: 6 páginas.`

Se o número de páginas divergir de 6, **não ajuste o esperado**: descubra por quê. Seis slides, sem `data-pdf="passos"`, dão seis páginas.

- [ ] **Passo 4: commit**

```bash
git add modelos/aula/index.html
git commit -m "feat(modelos): o esqueleto de aula em branco"
```

---

### Tarefa 2: a aula-exemplo

**Arquivos:**
- Criar: `exemplos/descida-do-gradiente/index.html`

**Interfaces:**
- Produz: o arquivo que 6c copia para `assets/exemplo.html` em todos os pacotes.

A spec 10.3 pede: aula real de 10 a 12 slides, três blocos, uma derivação passo a passo, um trecho de Python, um exercício e notas. A prosa segue `rv-writing-style` — e é a única parte deste marco que precisa ser **escrita**, não transcrita. Por isso este plano fixa a estrutura, a matemática e o código, e deixa a prosa para você.

- [ ] **Passo 1: montar o esqueleto com os onze slides**

Estrutura obrigatória, nesta ordem. Os `id` são contratuais (o guia e os pacotes citam alguns) e os `data-curto` seguem o Fato 2.

| # | layout | `id` | `data-curto` | o que carrega |
|---|---|---|---|---|
| 1 | `capa` | — | — | `<h1>` com `<br><span class="sinal">` |
| 2 | `abertura` | `intuicao` | — ("Intuição" tem 8) | `p.pergunta` |
| 3 | `conteudo` | `superficie` | — | o erro como superfície; `aside.destaque` |
| 4 | `conteudo` | `gradiente` | — | o gradiente aponta a subida; TeX em bloco |
| 5 | `abertura` | `regra` | — ("A regra" tem 7) | `p.pergunta` |
| 6 | `conteudo` | `derivacao` | — | a derivação, em `ol.passos` com `data-passo` |
| 7 | `conteudo` | `taxa` | — | a taxa de aprendizado; duas colunas |
| 8 | `abertura` | `pratica` | — ("Na prática" tem 10) | `p.pergunta` |
| 9 | `conteudo` | `codigo` | — | o trecho de Python |
| 10 | `conteudo` | `exercicio` | — | `div.exercicio` |
| 11 | `encerramento` | — | — | `ol.sintese` com 3 itens, `p.proxima` |

Metadados: `unidade="ime"`, `disciplina="Aprendizado de Máquina"`, `aula="4"`, `data="2026-09-14"`, `professor="Prof. Renato Vicente"`. Tag do runtime: `<script src="../../dist/aula-usp.js"></script>` (Fato 3).

- [ ] **Passo 2: a derivação do slide `derivacao`**

A matemática é determinada; escreva-a assim, **direto na `<section>`**, sem embrulhar em `div.colunas`:

**A derivação é em lote, e a primeira versão deste passo escrevia a de um exemplo.** Quarto defeito
meu neste plano, achado pela revisão da tarefa 2. Eu tinha fixado `E(w) = \tfrac{1}{2}(y - \hat{y}(w))^2`,
que é o erro de **um** exemplo, enquanto o Passo 3 fixa `grad = -X.T @ erro / len(y)`, que é o
gradiente da **média** sobre os `N`. Cada passo estava certo sozinho, e o `1/N` que faltava entre eles
nunca aparecia — mas o Passo 1 manda o slide 8 perguntar como "essas quatro linhas de conta viram um
laço que roda", o que afirma uma correspondência que não existia. Quem acompanhasse a conta ia
procurar o `len(y)` nos quatro passos e não ia achar.

**Corrigi a derivação, não o código.** É o código que o aluno roda, a forma em lote é a que
`especime/matematica.html:35` já escreve, e somar sobre os exemplos é a aula mais honesta. Com o
`1/N`, o item 2 passa a ser literalmente a linha do `grad`.

`N` maiúsculo, não `n`: o Passo 1 põe no slide 4 o gradiente como `(\partial E/\partial w_1, \ldots,
\partial E/\partial w_n)`, onde `n` conta **pesos**. A mesma letra para duas grandezas a dois slides
de distância seria um defeito novo, e `N` para exemplos é a letra do espécime.

**O `ol.passos` não vai dentro de uma coluna, e esta linha foi corrigida depois da revisão final.**
Sexto defeito meu neste plano, e de um tipo novo: não é fato errado, é instrução que contradiz outra
instrução do mesmo plano. A frase original — "dentro de um `<div>` de coluna" — veio do Fato 1, que é
sobre filhos de `div.colunas`; mas o Fato 1 só vale **se** houver `div.colunas`, e a tabela do Passo 1
dá duas colunas ao slide `taxa`, não ao `derivacao`. Para obedecer à letra num slide de uma coluna só,
a execução inventou um `div.colunas data-grade="12"` — largura útil inteira, um filho só — que o
contrato não pede. Medido na correção final: sem o embrulho, `validar` sai com 0 erros e 0 avisos e
`build` com código 0 e 11 páginas.

**O item 4 nomeia \( \eta \), e isto também é correção posterior.** A revisão final mediu que a aula
usava o símbolo em três slides sem nunca dizer o que ele é. A forma da spec 5.1 para definir é um
`aside.destaque`, e ele **não cabe neste slide**: `validar` acusa `composicao.transbordo` de 5 px — o
mesmo número com e sem `data-passo` e com dois textos de comprimentos diferentes, isto é, é o bloco
que não cabe, não o texto. O nome entra então no próprio item, antes da fórmula, que é onde o símbolo
estreia; o lide do slide `taxa` passa a trazê-lo também.

```html
<ol class="passos">
  <li>O erro mede a distância ao alvo, na média sobre os \(N\) exemplos: \( E(w) = \tfrac{1}{2N} \sum_{i=1}^{N} (y_i - \hat{y}_i(w))^2 \).</li>
  <li data-passo>Derive em relação ao peso: \( \nabla E(w) = -\tfrac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)\,\nabla \hat{y}_i(w) \).</li>
  <li data-passo>O gradiente aponta a subida, então ande no sentido oposto.</li>
  <li data-passo>A regra, com a taxa de aprendizado \( \eta \): \( w \leftarrow w - \eta\,\nabla E(w) \).</li>
</ol>
```

Quatro itens cabem no limite de 5 (`lista.itens`, Fato 5), e o corpo fica em 38 palavras das 90 de
`corpo.palavras` — medido com `palavrasDe`, a função que a regra `limites.palavras-corpo` usa.
Medido com `numpy` depois da correção, sobre o código extraído do arquivo entregue: o gradiente do
item 2 bate com uma diferença central de `E` (máx. 4,0e-10) e com o que o Passo 3 calcula
(máx. 4,4e-16).

- [ ] **Passo 3: o trecho de Python do slide `codigo`**

Dezesseis linhas é o teto e 64 colunas a largura (Fato 5). Este trecho tem 11 linhas e a mais larga
tem 54 colunas (a do docstring) — medido com `codigoDoBloco`, a mesma função que o validador usa.

**A marcação é `<pre data-lang="python">`, sem `<code>`.** Esta linha foi corrigida depois que a
execução a derrubou: eu tinha escrito `<pre><code class="linguagem-python">`, e o contrato não tem
classe `linguagem-*` — sai `vocabulario.classe · classe "linguagem-python" não existe no contrato`.
A forma certa é a do espécime, que a usa em oito blocos, com `data-linhas` e `data-numeros`
opcionais ao lado.

```html
<pre data-lang="python">def descida(w, X, y, eta=0.1, passos=100):
    """Descida do gradiente para o erro quadrático."""
    for _ in range(passos):
        erro = y - X @ w
        grad = -X.T @ erro / len(y)
        w = w - eta * grad
    return w


w = descida(np.zeros(X.shape[1]), X, y)
print(f"pesos: {w}")
</pre>
```

- [ ] **Passo 4: o exercício do slide `exercicio`**

`div.exercicio` tem sequência fixa no contrato: `div.enunciado` (1) e `div.resposta` (0 ou 1).

**O `div.resposta` leva `data-passo`, e a primeira versão deste passo o deixou de fora.** Quinto
defeito meu, da mesma revisão. Sem ele não há nada a revelar: `montar/corpo.js:67-70` só põe
`data-rotulo`, e enunciado e resposta aparecem juntos desde o primeiro instante, na tela e no PDF —
o que deixava falsa a nota que o Passo 5 manda escrever ("dar um minuto de silêncio antes de revelar
a resposta"). `especime/componentes.html:39-46` já tem o padrão certo, com a mesma frase na nota; foi
de lá que a frase veio, sem o `data-passo` junto.

`data-passo` vazio vale em qualquer elemento (`contrato/contrato.json:133`), e o motor conta um passo
por elemento quando o valor não é número (`motor/passos.js:6-9`). Medido no Chrome, sobre o HTML
construído: a resposta fica `visibility: hidden` no passo 0 e `visible` no passo 1. O PDF não muda —
`data-passo` sem `data-pdf="passos"` não separa páginas, e a resposta continua impressa na apostila.

```html
<div class="exercicio">
  <div class="enunciado">
    <p>Com \( \eta = 0{,}1 \) e gradiente \( 4 \), quanto o peso anda em um passo?</p>
  </div>
  <div class="resposta" data-passo>
    <p>Anda \( 0{,}4 \) no sentido oposto ao gradiente.</p>
  </div>
</div>
```

O guia do 6b documenta o exercício a partir daqui e de `especime/componentes.html:39-46`, com o
`data-passo`.

- [ ] **Passo 5: escrever a prosa**

Agora a parte que é sua. Toda `aside class="notas"` em slide de conteúdo, `p.lide` onde o slide tiver uma ideia que cabe numa frase, e o corpo dentro de 90 palavras (60 por coluna). Leia `~/.claude/skills/rv-writing-style/SKILL.md` antes e siga-o.

- [ ] **Passo 6: validar e construir**

```bash
node bin/aula-usp.mjs validar exemplos/descida-do-gradiente/
node bin/aula-usp.mjs build exemplos/descida-do-gradiente/
```

Esperado nos dois: **0 erros e 0 avisos**. Um aviso é falha nesta tarefa — a aula-exemplo é o que os modelos vão imitar, e ela não pode ensinar um aviso. O PDF deve ter 11 páginas (um por slide, sem `data-pdf="passos"`).

- [ ] **Passo 7: commit**

```bash
git add exemplos/descida-do-gradiente/index.html
git commit -m "feat(exemplos): a aula-exemplo da fase 1, descida do gradiente"
```

---

### Tarefa 3: `AGENTS.md` e `CLAUDE.md`

**Arquivos:**
- Criar: `AGENTS.md`, `CLAUDE.md`

A spec 10.2 diz: *"Na raiz do sistema ficam `AGENTS.md` (comandos, testes e regras para desenvolver o Aula USP) e `CLAUDE.md` com `@AGENTS.md`."* Isto é para quem **desenvolve o sistema**, não para quem escreve aulas — não repita o guia aqui.

- [ ] **Passo 1: `AGENTS.md`**

Cubra, medindo cada número no repositório em vez de copiar deste plano:

- os seis comandos que a spec 8.1 lista (`servir`, `validar`, `build`, `dist` hoje; `pacotes` e `novo` chegam em 6c);
- `npm test` (unitários, sem navegador) e `npm run test:integracao` (Chrome), e a regra da spec 8.1: **falta de Chrome não é falha**;
- **a fronteira**: `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node; `bin/` e `build/` são Node;
- **o contrato como dado**: o código executa `contrato/contrato.json`, nunca o repete — inclusive limiares;
- que `estilos/tokens.css` e `validador/cobertura.json` são **gerados**, e por quais comandos;
- português em textos visíveis e nomes de símbolo.

- [ ] **Passo 2: `CLAUDE.md`**

Conteúdo, literal e completo:

```markdown
@AGENTS.md
```

- [ ] **Passo 3: commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs(raiz): AGENTS.md e CLAUDE.md para quem desenvolve o sistema"
```

---

### Tarefa 4: o teste de tamanho de `dist/`

**Arquivos:**
- Criar: `tests/integracao/tamanhos.test.mjs`

A spec 11.2 pede: *"tamanhos de `dist/` medidos e registrados, com metas de 700 KB para `aula-usp.js`, 800 KB para `aula-usp-tex.js` e 600 KB para `aula-usp-codigo.js`; acima disso, o teste emite aviso."* Medido: esse teste **não existe** — o marco 5a, que criou `dist/`, não o escreveu.

Atenção a duas armadilhas deste projeto:

1. **"emite aviso" não é "falha".** A spec pede aviso, não erro. Um teste que só imprime não mede nada — e um que falha contradiz a spec. A forma honesta: o teste **sempre** imprime os tamanhos medidos (é o "registrados" da spec), e **falha apenas** se um arquivo passar da meta. Assim ele é aviso na prática (verde enquanto houver folga) e porta de verdade quando a folga acabar.
2. **Os três números são da spec, não seus.** Escreva-os como constantes nomeadas com a citação da seção ao lado, como `tests/integracao/visual.test.mjs` faz com o teto de 0,5 %.

- [ ] **Passo 1: escrever o teste**

```javascript
// Spec 11.2: "tamanhos de dist/ medidos e registrados, com metas de 700 KB para aula-usp.js,
// 800 KB para aula-usp-tex.js e 600 KB para aula-usp-codigo.js; acima disso, o teste emite aviso."
// O "registrados" é o console.log de todos os arquivos, que roda sempre; o "acima disso" é a
// asserção, que só morde quando a folga acaba. Os três números são da spec, não escolhidos aqui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const KB = 1024;
const METAS = {
  'aula-usp.js': 700 * KB,
  'aula-usp-tex.js': 800 * KB,
  'aula-usp-codigo.js': 600 * KB,
};

test('os pacotes de dist/ cabem nas metas da spec 11.2, e todos os tamanhos ficam registrados', () => {
  const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', RAIZ), 'utf8'));
  for (const [nome, arquivo] of Object.entries(manifesto.arquivos)) {
    const meta = METAS[nome];
    const folga = meta ? ` (meta ${(meta / KB).toFixed(0)} KB, folga ${((meta - arquivo.bytes) / KB).toFixed(0)} KB)` : '';
    console.log(`    [tamanhos] ${nome.padEnd(28)} ${(arquivo.bytes / KB).toFixed(0).padStart(4)} KB${folga}`);
  }
  for (const [nome, meta] of Object.entries(METAS)) {
    const arquivo = manifesto.arquivos[nome];
    assert.ok(arquivo, `${nome} não está no manifesto — o dist/ foi gerado?`);
    assert.ok(arquivo.bytes <= meta,
      `${nome} tem ${(arquivo.bytes / KB).toFixed(0)} KB, acima da meta de ${(meta / KB).toFixed(0)} KB da spec 11.2`);
  }
});
```

- [ ] **Passo 2: rodar**

Rode: `node --test tests/integracao/tamanhos.test.mjs`
Esperado: passa, e imprime os onze arquivos. Compare com o Fato 6 — `aula-usp.js` deve sair em 546 KB, `aula-usp-tex.js` em 623 KB, `aula-usp-codigo.js` em 112 KB.

- [ ] **Passo 3: inversão — prove que o teste morde**

Baixe temporariamente a meta de `aula-usp.js` para `100 * KB`, rode e **veja falhar** com a mensagem que nomeia os 546 KB. Restaure. Relate a mensagem exata no seu relatório: sem isso o item não está fechado.

- [ ] **Passo 4: commit**

```bash
git add tests/integracao/tamanhos.test.mjs
git commit -m "test(tamanhos): fecha a medição de dist/ que a spec 11.2 pede"
```

---

### Tarefa 5: corrigir o esqueleto da spec

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`, no bloco de código da seção 5.1

O Fato 1: a seção 5.1 desenha `<ol class="passos">` como filho direto de `div.colunas`, e isso não valida. O contrato da seção 5.6 manda que todo filho de `div.colunas` seja um `div`, um por vaga da grade. **A spec contradiz a si mesma, e o lado implementado e testado é o contrato.**

- [ ] **Passo 1: envolver o `<ol>` num `<div>`**

No bloco da seção 5.1, troque

```html
    </div>
    <ol class="passos">
      <li>Calcule o erro.</li>
      <li data-passo>Calcule o gradiente.</li>
      <li data-passo>Ande contra ele.</li>
    </ol>
  </div>
```

por

```html
    </div>
    <div>
      <ol class="passos">
        <li>Calcule o erro.</li>
        <li data-passo>Calcule o gradiente.</li>
        <li data-passo>Ande contra ele.</li>
      </ol>
    </div>
  </div>
```

Não mude mais nada na spec. Se você encontrar **outra** contradição enquanto trabalha, **não corrija por conta própria**: registre no relatório e siga.

- [ ] **Passo 2: commit**

```bash
git add docs/superpowers/specs/2026-09-14-aula-usp-design.md
git commit -m "docs(spec): o esqueleto da 5.1 põe ol.passos dentro de um div de coluna"
```

---

## Verificação final do marco 6a

- [ ] `npm test` verde (419 na base; esta parte não acrescenta unitários)
- [ ] `npm run test:integracao` verde, agora com o arquivo de tamanhos
- [ ] `node bin/aula-usp.mjs validar modelos/aula/` — 0 erros, 0 avisos
- [ ] `node bin/aula-usp.mjs build modelos/aula/` — código 0, 6 páginas
- [ ] `node bin/aula-usp.mjs validar exemplos/descida-do-gradiente/` — 0 erros, **0 avisos**
- [ ] `node bin/aula-usp.mjs build exemplos/descida-do-gradiente/` — código 0, 11 páginas
- [ ] os seis decks do espécime seguem passando pelos dois comandos
- [ ] `git status` limpo depois dos builds (o `.gitignore` do 5c cobre `<pasta>/dist/`)

## O que o 6b herda

- O modelo e o exemplo existem e são citáveis por caminho e por `id` de slide.
- A decisão do Fato 3: dentro do repositório a tag é relativa; quem reescreve para o CDN é o gerador de pacotes, em 6c. O guia deve **mostrar a forma do CDN** ao autor, porque é a que ele vai receber no pacote.
- A tabela de regras da fase 1 gerada do contrato mede **5.298 caracteres** (60 linhas). Isso decide onde ela pode morar: cabe num arquivo de guia, e **não** cabe nas instruções do GPT, que têm teto de 8.000 caracteres para o bloco de regras essenciais mais o procedimento. Um bloco de regras essenciais realista mede ~1.250 caracteres, deixando ~6.750 para o procedimento — folga confortável, desde que a tabela fique em `conhecimento/`.
- A tabela de layouts gerada mede 450 caracteres (7 linhas).
