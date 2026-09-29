# Gerar (1.3.0): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans, tarefa a tarefa. Passos com caixa (`- [ ]`).

**Objetivo:** duas peças:
- o comando `aula-usp roteiro`, que converte um roteiro em markdown, slide a slide, numa aula HTML válida, de forma determinística;
- a skill `aula-usp-gerar`, que escreve esse roteiro a partir de fontes (artigos em PDF, apresentações em PDF, PPTX ou Beamer, e aulas do Aula USP), para para o autor aprovar, e depois gera, valida, avalia e corrige.

**Arquitetura:**
- **`montar/roteiro.js`:** o parser e o gerador, do lado do navegador e sem `node:`. A função é pura: texto do roteiro e contexto (tag do runtime, contrato) entram, e saem o HTML e os erros.
- **`build/roteiro.mjs`:** o comando, que lê o arquivo, copia as figuras, escreve e valida.
- **A skill:** as fontes são lidas pelo próprio agente, sem biblioteca nova na CLI (spec 6.3).

**Spec:** `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`, seções 6, 7, 8 e 10. A spec do sistema vale onde esta não diz nada.

## Restrições globais

- `AGENTS.md` inteiro vale: a fronteira (`montar/roteiro.js` sem `node:`), o contrato como dado (o gerador consulta `contrato.layouts` para saber o que cada layout aceita, sem lista própria), os gerados no mesmo diff e as guardas com inversão.
- **Determinismo:** a mesma entrada e a mesma versão dão os mesmos bytes. Nada de data de hoje, aleatoriedade ou ordem de objeto instável.
- **Nada de rede.** Não publique; merge e push são do autor.
- **Português** em tudo. Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Nenhuma mensagem afirma mais do que a evidência sustenta.
- **As duas suítes inteiras** no fim de cada tarefa de código.

## Fatos medidos (main em `c686969`, 1.2.0 aguardando publicação)

1. **O modelo:** `bin/aula-usp.mjs:novoComando` copia `modelos/aula/` (constante `MODELO`) e troca metas com `trocarMeta(html, nome, valor)`. A tag do runtime com versão e `integrity` só existe, escrita, em `modelos/aula/index.html`, regerada por `aula-usp pacotes`. O `roteiro` tira a tag **de lá**, e não monta outra: é o único lugar que a guarda de pacotes já prende ao manifesto.
2. **O contrato:** `contrato.layouts[nome].sequencia` diz o que cada layout aceita. Por exemplo:
   - `abertura`: `h2`, e `p.pergunta` opcional;
   - `afirmacao`: `p.afirmacao`, e `p.fonte` opcional;
   - `figura`: `h2` opcional, depois `figure`;
   - `encerramento`: `h2`, `ol.sintese`, e `p.proxima` opcional;
   - `demo`: `h2`, depois `div.demo`, que precisa de script registrado.

   `contrato.metadados` lista as metas; `unidade`, `data` e `professor` são obrigatórias, e as outras são opcionais desde a 1.0.1. `contrato.linguagens` lista as linguagens de `pre[data-lang]`.
3. **A marcação que o roteiro gera,** como no modelo e no guia:
   - `h2` com `<br><span class="sinal">`;
   - `p.lide`, `p.pergunta`, `ol.passos` e `ul`, com `li[data-passo]`;
   - `aside.destaque|alerta|quadro[data-rotulo]`, `aside.notas` e `p.fonte`;
   - `figure` com `img[alt]` e `figcaption`;
   - `figure.grafico` com `script[type=application/json]`;
   - `figure.diagrama`, na forma que o espécime usa: confira em `especime/componentes.html`;
   - `div.colunas[data-grade]`, com um `div` por coluna;
   - `pre[data-lang]` na primeira coluna do arquivo;
   - `\[ … \]` como texto solto;
   - no encerramento, `ol.sintese` e `p.proxima`.
4. **Os comandos que o fluxo usa:** `aula-usp validar`, `avaliar` (1.1.0) e `slide`/`validar --slide` (1.2.0).
5. **Pacotes:** `FONTES_DE_PACOTE` (`build/guia.mjs`), `build/pacotes.mjs` e a lista `PACOTES` de `tests/unit/pacotes.test.mjs` são o molde de um pacote de skill novo, como foi com `aula-usp-avaliar` e `aula-usp-corrigir`.

## Decisões deste plano

- **D1, a sintaxe:** a da spec 6.1, com as definições abaixo onde ela é vaga.
  - **Blocos:** um slide termina no próximo `## ` ou no fim do arquivo. Linhas em branco separam blocos.
  - **Parágrafo:** linhas seguidas sem marcação formam **um** `p`.
  - **Listas:** `- ` faz um `ul`, e `1. ` (qualquer número) um `ol.passos`. Itens seguidos formam uma lista só. O `+ ` logo depois do marcador põe `data-passo` e sai do texto.
  - **Caixas:** `[destaque: Rótulo] texto` é uma linha só, e o rótulo vira `data-rotulo`.
  - **`nota:`:** pode repetir; as notas se juntam, com uma linha em branco entre elas, num `aside.notas` no fim da `section`.
  - **`fonte:`** vira `p.fonte`, logo depois do corpo, antes das notas. **`legenda:`** só vale logo depois de uma figura, gráfico ou diagrama, e vira o `figcaption` dela.
  - **`afirmacao`:** o texto do slide vira `p.afirmacao`, e o título do `##` é opcional. Se houver título, ele é recusado com a mensagem "afirmacao não tem título: a frase é o slide".
  - **`demo` fica fora do roteiro:** é recusado com a mensagem "demo se escreve no HTML, com o script dela: veja guia/50", e com a linha.
  - **`exercicio` e `quadro` numerado** também ficam fora. O roteiro é esqueleto (spec 6.1), e o que ele não exprime se escreve no HTML depois.
  - **Colunas:** `:::colunas 6-6`, com `---` separando as colunas e `:::` fechando. A grade tem de estar em `contrato.grades`.
  - **Código:** os blocos cercados `` ```<linguagem> `` exigem uma linguagem de `contrato.linguagens`. `` ```grafico `` pede JSON válido. `` ```dot `` vira `figure.diagrama`.
  - **Matemática:** `$$ … $$` vira `\[ … \]`. A matemática em linha passa sem mexer.
  - **Escape:** o texto do autor é escapado como HTML (`&`, `<`, `>`), **exceto** dentro de `\( \)` e `\[ \]`, em que só `<` e `&` são escapados; KaTeX recebe o texto do nó. `**negrito**` vira `strong`, e `*itálico*` vira `em`. Não há mais nenhum markdown em linha.
- **D2, a capa e as metas:** o cabeçalho YAML é só `chave: valor` numa linha, sem YAML aninhado e sem biblioteca. Uma meta obrigatória que falte é erro de roteiro. A capa sai do `# Título | segunda linha`, que tem de aparecer uma vez só, antes do primeiro `##`. O `<title>` é o título sem o `|`.
- **D3, os ids:** `{#id}` é opcional. Sem ele, o id é o slug do título, pela regra de slug que o sistema já usa: procure-a em `build/`, porque o marco 5c fixou uma, e reaproveite. Ids repetidos ganham sufixo `-2`, `-3`, na ordem. A capa e o encerramento ficam sem id, como no modelo, se o contrato permitir; senão, siga o espécime. O `curto="…"` só vale em `abertura`, e sem ele o curto é o título truncado no limite do contrato.
- **D4, as figuras:** um `![alt](caminho)` relativo ao `.md` é copiado para `<pasta>/img/<nome>`, e o `src` passa a ser `img/<nome>`. Nomes repetidos de pastas diferentes ganham sufixo. Um arquivo inexistente é erro de roteiro, com a linha. Um caminho absoluto ou uma URL é recusado: a figura tem de estar junto.
- **D5, a saída:** `aula-usp roteiro <arquivo.md> <pasta> [--substituir]`.
  - Sem `--substituir`, uma pasta com `index.html` é recusada (código 2, como o `novo` faz com pasta não vazia).
  - Com erros de roteiro, sai com 1, uma linha por erro (`roteiro.md:12 · layout "resumo" não existe; use um de: …`) e não escreve nada.
  - Sem erros, escreve e roda `validar`. O código de saída é o do `validar`, e a saída dele vai para o terminal.

---

### Tarefa 1: o parser e o gerador (`montar/roteiro.js`)

**Arquivos:**
- Criar: `montar/roteiro.js`, `tests/unit/roteiro.test.mjs` e `tests/fixtures/roteiro/`.

**Interfaces:**
- `lerRoteiro(texto)` devolve `{ metas, capa, slides: [{ layout, titulo, segunda, id, curto, blocos, notas, linha }], erros: [{ linha, mensagem }] }`.
- `gerarAula(roteiro, { contrato, tagDoRuntime })` devolve `{ html, figuras: [{ origem, destino }], erros }`.

- [ ] **Passo 1: testes.**
  - Um teste por marcação da D1, comparando com o HTML esperado, escrito à mão no teste, no estilo do modelo.
  - Um teste por erro de roteiro: layout inexistente, `demo`, título em `afirmacao`, grade inválida, linguagem inválida, JSON de gráfico inválido, meta obrigatória ausente, `legenda:` solta, duas capas, marcação desconhecida em `[xxx: …]`.
  - **O exemplo da spec 6.1:** o arquivo `tests/fixtures/roteiro/exemplo-spec/roteiro.md`, **copiado literalmente da spec**, com a figura `img/nuvem.png` (qualquer PNG pequeno da fixture), gera um HTML que **valida limpo** pelo validador estático. A validação completa, com Chrome, fica na Tarefa 2.
  - **Determinismo:** duas chamadas geram os mesmos bytes.
- [ ] **Passo 2:** implementar.
- [ ] **Passo 3: inversão.** Trocar `contrato.layouts` por uma lista local no gerador e tirar um layout do contrato de teste: o teste que exige que o gerador consulte o contrato cai. Escreva esse teste: com um contrato de mentira sem `figura`, `## figura:` é erro.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 2: o comando `aula-usp roteiro`

**Arquivos:**
- Criar: `build/roteiro.mjs`, `tests/unit/roteiro-cli.test.mjs` e `tests/integracao/roteiro.test.mjs`.
- Modificar: `bin/aula-usp.mjs` (comando, uso, `FLAGS_ROTEIRO = {'--substituir'}`; a flag já existe em `slide` com valor, então aqui ela é **booleana**: resolva o conflito em `lerArgumentos` sem quebrar `slide`, e prove com os testes dos dois comandos) e `README.md` ("Os comandos" e o guia rápido: uma linha).

- [ ] **Passo 1: testes de CLI.** Pasta nova; pasta com `index.html` sem e com `--substituir`; erro de roteiro sai com 1, sem arquivo escrito; figura copiada; figura ausente é erro; flag de outro comando recusada com 2.
- [ ] **Passo 2:** implementar, com a tag do runtime lida de `modelos/aula/index.html` (fato 1).
- [ ] **Passo 3: integração, com Chrome.**
  - O exemplo da spec 6.1 vira aula com `aula-usp roteiro`, e `aula-usp validar` dá **0 erros**.
  - **Ida e volta:** `exemplos/descida-do-gradiente/index.html` reescrito como roteiro à mão, num arquivo de fixture com o mesmo conteúdo, só nas marcações que o roteiro exprime, gera uma aula que valida limpa e tem os mesmos ids e a mesma sequência de layouts do original. Os slides que o roteiro não exprime (demo, exercício) ficam fora da fixture, e o teste diz quais.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 3: a skill `aula-usp-gerar` e o guia

**Arquivos:**
- Criar: `guia/pacotes/skill-gerar.md` e `tests/aceite/gerar.md`.
- Modificar:
  - `guia/80-avaliar-corrigir-gerar.md`: a seção "Gerar a partir de um roteiro e de fontes", com a sintaxe completa do roteiro, **gerada ou conferida** contra os testes da Tarefa 1, para que o guia não prometa marcação que o parser não tem. Escreva a guarda: todo exemplo de roteiro do capítulo, rodado por `lerRoteiro`, sai sem erros;
  - `build/guia.mjs` e `build/pacotes.mjs`: o pacote `pacotes/skill/aula-usp-gerar/`;
  - `tests/unit/pacotes.test.mjs`;
  - `guia/pacotes/skill.md`, `projeto-claude.md` e `gpt-instrucoes.md`: um parágrafo do modo gerar. Sem CLI, o agente escreve o HTML direto, seguindo o roteiro. Meça o teto do GPT.

**O `SKILL.md`** tem `name: aula-usp-gerar` e esta descrição: "Use quando o autor pedir uma aula a partir de artigos, de apresentações existentes (PDF, PPTX, Beamer, aulas do Aula USP) ou de um roteiro em markdown". O fluxo é o da spec 6.3:
1. **Ler as fontes:**
   - **PDF:** o texto e as figuras, com as ferramentas do ambiente.
   - **PPTX:** o agente descompacta e lê `ppt/slides/slideN.xml`, na ordem de `ppt/presentation.xml`, e as mídias de `ppt/media/`.
   - **Beamer:** cada `\begin{frame}{título}` é um slide candidato; a matemática passa como está e é conferida contra o TeX permitido do contrato (`references/`).
   - **Aulas Aula USP:** `aula-usp slide`.
2. **Escrever `roteiro.md`,** respeitando a rubrica de avaliar:
   - título que afirma;
   - uma ideia por slide;
   - cerca de 1 minuto por slide com a duração pedida;
   - de 2 a 8 blocos;
   - `fonte:` em toda figura ou dado alheio, com a referência do artigo.
3. **Parar e mostrar o roteiro ao autor.** Só seguir com o "sim".
4. **Rodar `aula-usp roteiro`,** completar no HTML o que o roteiro não exprime (demos, exercícios), e iterar até `validar` dar 0 erros.
5. **Rodar a `aula-usp-avaliar`,** propor as correções, e aplicar as aceitas com a `aula-usp-corrigir`.
6. **Entregar** a aula, o `avaliacao.md` final e a lista das figuras alheias com a licença de cada uma. Quando a licença não for aberta, avisar.

- [ ] **Passo 1:** escrever; `npm run guia` e `aula-usp pacotes`; as guardas de citações, do teto e do bloco essencial.
- [ ] **Passo 2:** `tests/aceite/gerar.md` é o roteiro para o autor. Pede uma aula de 12 a 14 slides a partir de um artigo em PDF (o autor escolhe) e de uma apresentação Beamer antiga dele. O critério de aceite:
  - o roteiro é mostrado antes do HTML;
  - a aula valida limpa;
  - a avaliação final não tem alerta;
  - toda figura alheia tem crédito.
- [ ] **Passo 3:** as duas suítes inteiras e commit.

### Tarefa 4: versão 1.3.0 e documentação

- [ ] **`AGENTS.md`:** o comando `roteiro`; `montar/roteiro.js` na fronteira; as contagens.
- [ ] **`README.md`:**
  - "Skills para agentes" ganha a `aula-usp-gerar`, e sai a frase "virão nas próximas versões";
  - uma seção curta, "Gerar a partir de um roteiro", com o exemplo da spec 6.1;
  - o `cp` passa a copiar as quatro pastas.
- [ ] **Spec do sistema, 8.1:** o comando `roteiro`.
- [ ] **Versão:** `package.json` em `1.3.0`, depois `aula-usp dist` e `aula-usp pacotes`, nessa ordem; meça as tags e os 11 `sha384-`. Se `montar/roteiro.js` não entrar em `dist/` (ele é da CLI), confira que o manifesto não muda além da versão.
- [ ] **Instalação:** `tests/integracao/instalacao.test.mjs` roda `roteiro` no pacote instalado com o exemplo da spec, e a aula sai válida.
- [ ] **As duas suítes inteiras e commit.** Não publique.

### Revisão final

Revisão da branch inteira contra a spec, rodada única de correção, re-revisão. Relatório em `docs/superpowers/revisoes/2026-09-29-aula-usp-gerar-revisao-final.md`.
