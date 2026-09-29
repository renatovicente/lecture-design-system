// O roteiro em markdown (spec 2026-09-28, 6.1; plano do gerar, Tarefa 1): `lerRoteiro` e `gerarAula`,
// de montar/roteiro.js. Um teste por marcação da D1, contra o HTML esperado escrito à mão aqui, no
// desenho do modelo; um teste por erro de roteiro; o exemplo da spec, copiado literalmente em
// tests/fixtures/roteiro/exemplo-spec/, validado pelo validador estático; e o determinismo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerRoteiro, gerarAula } from '../../montar/roteiro.js';
import { lerERodarEstatica, validarCarga } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CONTRATO = JSON.parse(readFileSync(join(RAIZ, 'contrato/contrato.json'), 'utf8'));
const TAG = '<script src="aula-usp.js"></script>';
const EXEMPLO = join(RAIZ, 'tests/fixtures/roteiro/exemplo-spec');

const CABECALHO = `---
unidade: ime
data: 2026-10-05
professor: Prof. Nome Sobrenome
---

# Título | segunda linha
`;

function gerar(texto, contrato = CONTRATO) {
  return gerarAula(lerRoteiro(texto), { contrato, tagDoRuntime: TAG });
}

// As sections do HTML gerado, cada uma do `<section` ao `</section>`.
const secoesDe = (html) => html.match(/<section[\s\S]*?<\/section>/g);

// O HTML de um slide escrito depois do cabeçalho e da capa: a section de índice 1 (a 0 é a capa).
function slide(corpo, indice = 1) {
  const { html, erros } = gerar(`${CABECALHO}\n${corpo}`);
  assert.deepEqual(erros, [], `erros inesperados: ${erros.map((e) => `${e.linha}: ${e.mensagem}`).join(' / ')}`);
  return secoesDe(html)[indice];
}

// As mensagens de erro de um roteiro, com a linha.
function erros(corpo, contrato) {
  const { html, erros: lista } = gerar(`${CABECALHO}\n${corpo}`, contrato);
  assert.equal(html, null, 'um roteiro com erro não gera HTML');
  return lista.map(({ linha, mensagem }) => `${linha}: ${mensagem}`);
}

// A linha do corpo, contada no arquivo inteiro: o cabeçalho tem 7 linhas, e há uma em branco antes do corpo.
const L = (n) => n + 8;

// ---------------------------------------------------------------------------------------------
// 1. Cabeçalho e capa (D2).

test('o cabeçalho vira as metas na ordem do contrato, e a capa, o h1 com o sinal e o <title>', () => {
  const { html, erros: lista } = gerar(`---
professor: Prof. Nome Sobrenome
video: canto
data: 2026-10-05
unidade: ime
disciplina: "Física: uma introdução"
---

# Passeio aleatório | e difusão

## conteudo: Uma ideia
Um parágrafo.
Outro.
`);
  assert.deepEqual(lista, []);
  assert.equal(html, `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Passeio aleatório</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Física: uma introdução">
<meta name="data" content="2026-10-05">
<meta name="professor" content="Prof. Nome Sobrenome">
<meta name="video" content="canto">
${TAG}
</head>
<body>

<section data-layout="capa">
  <h1>Passeio aleatório<br><span class="sinal">e difusão</span></h1>
</section>

<section data-layout="conteudo" id="uma-ideia">
  <h2>Uma ideia</h2>
  <p>Um parágrafo. Outro.</p>
</section>

</body>
</html>
`);
});

test('a capa sem "|" é só o h1', () => {
  const { html } = gerar(`${CABECALHO.replace('# Título | segunda linha', '# Só o título')}\n## conteudo: X\nTexto.\n`);
  assert.match(html, /<section data-layout="capa">\n {2}<h1>Só o título<\/h1>\n<\/section>/);
});

// ---------------------------------------------------------------------------------------------
// 2. Uma marcação por teste (D1).

test('parágrafo: linhas seguidas formam um p, e a linha em branco separa', () => {
  assert.equal(slide(`## conteudo: Título | segundo
Primeira linha
continua aqui.

Outro parágrafo.
`), `<section data-layout="conteudo" id="titulo-segundo">
  <h2>Título<br><span class="sinal">segundo</span></h2>
  <p>Primeira linha continua aqui.</p>
  <p>Outro parágrafo.</p>
</section>`);
});

test('> vira p.lide, e ? vira p.pergunta', () => {
  assert.equal(slide(`## conteudo: Ideia {#ideia}
> O lide.
Corpo.
`), `<section data-layout="conteudo" id="ideia">
  <h2>Ideia</h2>
  <p class="lide">O lide.</p>
  <p>Corpo.</p>
</section>`);
  assert.equal(slide(`## abertura: Bloco
? Qual a pergunta?
`), `<section data-layout="abertura" id="bloco">
  <h2>Bloco</h2>
  <p class="pergunta">Qual a pergunta?</p>
</section>`);
});

test('listas: "- " faz ul, "1. " (qualquer número) faz ol.passos, e "+ " põe data-passo e sai do texto', () => {
  assert.equal(slide(`## conteudo: Listas {#listas}
- um
- + dois
7. primeiro
3. + segundo
`), `<section data-layout="conteudo" id="listas">
  <h2>Listas</h2>
  <ul>
    <li>um</li>
    <li data-passo>dois</li>
  </ul>
  <ol class="passos">
    <li>primeiro</li>
    <li data-passo>segundo</li>
  </ol>
</section>`);
});

test('no encerramento, a lista vira ol.sintese, e "próxima:" vira p.proxima, sem id', () => {
  assert.equal(slide(`## encerramento: O que fica
- A primeira.
- A segunda.
próxima: assunto seguinte.
`), `<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>A primeira.</li>
    <li>A segunda.</li>
  </ol>
  <p class="proxima">Próxima aula: assunto seguinte.</p>
</section>`);
});

test('caixas: [destaque: rótulo], [alerta: rótulo] e [quadro: rótulo], numa linha só', () => {
  assert.equal(slide(`## conteudo: Caixas {#caixas}
[destaque: Definição] Um termo novo.
[alerta: Cuidado] O "passo" longo demais.
[quadro: Exemplo] Um caso.
`), `<section data-layout="conteudo" id="caixas">
  <h2>Caixas</h2>
  <aside class="destaque" data-rotulo="Definição">Um termo novo.</aside>
  <aside class="alerta" data-rotulo="Cuidado">O "passo" longo demais.</aside>
  <aside class="quadro" data-rotulo="Exemplo">Um caso.</aside>
</section>`);
});

test('nota: repete e se junta num aside.notas no fim, com uma linha em branco entre as notas', () => {
  assert.equal(slide(`## conteudo: Notas {#notas}
nota: A primeira nota.
Corpo.
nota: A segunda.
`), `<section data-layout="conteudo" id="notas">
  <h2>Notas</h2>
  <p>Corpo.</p>
  <aside class="notas">A primeira nota.

A segunda.</aside>
</section>`);
});

test('fonte: vira p.fonte logo depois do corpo e antes das notas, onde quer que tenha sido escrita', () => {
  assert.equal(slide(`## conteudo: Fonte {#fonte}
fonte: Feller, vol. 1.
nota: Nota.
Corpo.
`), `<section data-layout="conteudo" id="fonte">
  <h2>Fonte</h2>
  <p>Corpo.</p>
  <p class="fonte">Feller, vol. 1.</p>
  <aside class="notas">Nota.</aside>
</section>`);
});

test('figura: ![alt](caminho) vira figure com img em img/, e "legenda:" logo depois vira o figcaption', () => {
  assert.equal(slide(`## figura: A nuvem {#nuvem}
![Dez mil caminhantes](figuras/nuvem.png)
legenda: Histograma.
`), `<section data-layout="figura" id="nuvem">
  <h2>A nuvem</h2>
  <figure>
    <img src="img/nuvem.png" alt="Dez mil caminhantes">
    <figcaption>Histograma.</figcaption>
  </figure>
</section>`);
});

test('figura sem título: o h2 é opcional em figura', () => {
  assert.equal(slide(`## figura {#so-figura}
![Uma figura](a.png)
`), `<section data-layout="figura" id="so-figura">
  <figure>
    <img src="img/a.png" alt="Uma figura">
  </figure>
</section>`);
});

test('afirmacao: o texto vira p.afirmacao, sem h2, com fonte opcional e o id tirado da frase', () => {
  assert.equal(slide(`## afirmacao
O erro cai com a raiz do número de pontos.
fonte: Teorema central do limite.
`), `<section data-layout="afirmacao" id="o-erro-cai-com-a-raiz-do-numero-de-ponto">
  <p class="afirmacao">O erro cai com a raiz do número de pontos.</p>
  <p class="fonte">Teorema central do limite.</p>
</section>`);
});

test('colunas: ":::colunas 6-6", com --- entre as colunas e ::: fechando', () => {
  assert.equal(slide(`## conteudo: Duas colunas {#duas}
> O lide.
:::colunas 6-6
A esquerda argumenta.
[destaque: Definição] Um termo.
---
1. Primeiro.
2. + Segundo.
fonte: Dados de X.
:::
`), `<section data-layout="conteudo" id="duas">
  <h2>Duas colunas</h2>
  <p class="lide">O lide.</p>
  <div class="colunas" data-grade="6-6">
    <div>
      <p>A esquerda argumenta.</p>
      <aside class="destaque" data-rotulo="Definição">Um termo.</aside>
    </div>
    <div>
      <ol class="passos">
        <li>Primeiro.</li>
        <li data-passo>Segundo.</li>
      </ol>
      <p class="fonte">Dados de X.</p>
    </div>
  </div>
</section>`);
});

test('código: ```python vira pre[data-lang] na primeira coluna do arquivo, com o texto escapado', () => {
  assert.equal(slide(`## conteudo: Código {#codigo}
\`\`\`python
# um comentário, que não é capa
## nem slide
if a < b and c > d: print("&")
\`\`\`
`), `<section data-layout="conteudo" id="codigo">
  <h2>Código</h2>
<pre data-lang="python">
# um comentário, que não é capa
## nem slide
if a &lt; b and c &gt; d: print("&amp;")
</pre>
</section>`);
});

test('gráfico: ```grafico vira figure.grafico com o JSON num script', () => {
  assert.equal(slide(`## figura: Notas {#notas}
\`\`\`grafico
{"tipo":"linha","dados":{"x":[1,2],"y":[3,4]},"x":"x","y":["y"]}
\`\`\`
legenda: Duas provas.
`), `<section data-layout="figura" id="notas">
  <h2>Notas</h2>
  <figure class="grafico">
    <script type="application/json">
    {"tipo":"linha","dados":{"x":[1,2],"y":[3,4]},"x":"x","y":["y"]}
    </script>
    <figcaption>Duas provas.</figcaption>
  </figure>
</section>`);
});

test('diagrama: ```dot vira figure.diagrama com o DOT num script', () => {
  assert.equal(slide(`## figura: Rede {#rede}
\`\`\`dot
digraph {
  a -> b;
}
\`\`\`
`), `<section data-layout="figura" id="rede">
  <h2>Rede</h2>
  <figure class="diagrama">
    <script type="text/vnd.graphviz">
    digraph {
      a -> b;
    }
    </script>
  </figure>
</section>`);
});

test('matemática: $$ … $$ vira \\[ … \\], numa linha ou em várias, e a matemática em linha passa sem mexer', () => {
  assert.equal(slide(`## conteudo: Fórmulas {#formulas}
Em linha, \\( a_n \\) fica.
$$ E = mc^2 $$
$$
x > 0
$$
\\[ y < 1 \\]
`), `<section data-layout="conteudo" id="formulas">
  <h2>Fórmulas</h2>
  <p>Em linha, \\( a_n \\) fica.</p>
  \\[ E = mc^2 \\]
  \\[ x > 0 \\]
  \\[ y &lt; 1 \\]
</section>`);
});

test('escape: & < > viram entidades fora da matemática; dentro de \\( \\), só < e &', () => {
  assert.equal(slide(`## conteudo: Escape {#escape}
a < b & c > d, e \\( a < b > c \\& d \\).
`), `<section data-layout="conteudo" id="escape">
  <h2>Escape</h2>
  <p>a &lt; b &amp; c &gt; d, e \\( a &lt; b > c \\&amp; d \\).</p>
</section>`);
});

test('**negrito** vira strong e *itálico* vira em; nenhum outro markdown em linha', () => {
  assert.equal(slide(`## conteudo: Ênfase {#enfase}
Um **forte**, um *leve*, e \\( a * b * c \\); _isto_ e [isto](x) passam como estão.
`), `<section data-layout="conteudo" id="enfase">
  <h2>Ênfase</h2>
  <p>Um <strong>forte</strong>, um <em>leve</em>, e \\( a * b * c \\); _isto_ e [isto](x) passam como estão.</p>
</section>`);
});

// ---------------------------------------------------------------------------------------------
// 3. Ids, nome curto e figuras (D3 e D4).

test('ids: sem {#id}, o slug do título pela regra do montar; repetidos ganham -2, -3; o do autor fica', () => {
  const { html, erros: lista } = gerar(`${CABECALHO}
## conteudo: A variância | cresce
Um.
## conteudo: A variância cresce {#a-variancia-cresce-2}
Dois.
## conteudo: A variância cresce
Três.
## conteudo: A variância cresce
Quatro.
`);
  assert.deepEqual(lista, []);
  assert.deepEqual(secoesDe(html).slice(1).map((secao) => /id="([^"]*)"/.exec(secao)[1]),
    ['a-variancia-cresce', 'a-variancia-cresce-2', 'a-variancia-cresce-3', 'a-variancia-cresce-4']);
});

test('curto="…" vale na abertura; sem ele, título acima do limite ganha o título truncado no limite do contrato', () => {
  const limite = CONTRATO.limites['abertura.dataCurto.caracteres'];
  const { html } = gerar(`${CABECALHO}
## abertura: Intuição
## abertura: Descida em lote
## abertura: Superfícies de erro {#sup curto="Erro"}
## conteudo: X
Y.
`);
  const [, curta, longa, dada] = secoesDe(html);
  assert.doesNotMatch(curta, /data-curto/, 'título dentro do limite não precisa de nome curto');
  const automatico = /data-curto="([^"]*)"/.exec(longa)[1];
  assert.equal(automatico, 'Descida em');
  assert.ok(automatico.length <= limite);
  assert.match(dada, /id="sup" data-curto="Erro"/);
});

test('figuras: o caminho relativo ao roteiro vai para img/<nome>, e nomes iguais de pastas diferentes ganham sufixo', () => {
  const { html, figuras } = gerar(`${CABECALHO}
## figura: Um {#um}
![a](a/nuvem.png)
## figura: Dois {#dois}
![b](b/nuvem.png)
## figura: Três {#tres}
![c](./a/nuvem.png)
`);
  assert.deepEqual(figuras.map(({ origem, destino }) => ({ origem, destino })), [
    { origem: 'a/nuvem.png', destino: 'img/nuvem.png' },
    { origem: 'b/nuvem.png', destino: 'img/nuvem-2.png' },
  ]);
  assert.deepEqual([...html.matchAll(/src="([^"]*)"/g)].map((m) => m[1]).slice(1),
    ['img/nuvem.png', 'img/nuvem-2.png', 'img/nuvem.png']);
});

// ---------------------------------------------------------------------------------------------
// 4. Um teste por erro de roteiro: a mensagem e a linha.

test('erro: layout inexistente, com a lista dos que existem', () => {
  assert.deepEqual(erros('## resumo: Tudo\nTexto.\n'),
    [`${L(1)}: layout "resumo" não existe; use um de: abertura, conteudo, afirmacao, figura, demo, encerramento`]);
});

test('erro: demo fica fora do roteiro', () => {
  assert.deepEqual(erros('## demo: Uma demo\n'), [`${L(1)}: demo se escreve no HTML, com o script dela: veja guia/50`]);
});

test('erro: afirmacao não tem título', () => {
  assert.deepEqual(erros('## afirmacao: Um título\nA frase.\n'), [`${L(1)}: afirmacao não tem título: a frase é o slide`]);
});

test('erro: grade inválida, e grade com o número errado de colunas', () => {
  assert.deepEqual(erros('## conteudo: X\n:::colunas 5-7\nA.\n---\nB.\n:::\n'),
    [`${L(2)}: grade "5-7" não existe; use uma de: 12, 6-6, 8-4, 4-8, 4-4-4`]);
  assert.deepEqual(erros('## conteudo: X\n:::colunas 4-4-4\nA.\n---\nB.\n:::\n'),
    [`${L(2)}: a grade 4-4-4 pede 3 colunas, e há 2; separe-as com ---`]);
});

test('erro: linguagem fora do contrato', () => {
  assert.deepEqual(erros('## conteudo: X\n```cobol\nDISPLAY.\n```\n'),
    [`${L(2)}: linguagem "cobol" não existe; use uma de: python, r, sql, javascript, bash, json, latex, ou grafico e dot`]);
});

test('erro: JSON de gráfico inválido', () => {
  const lista = erros('## figura: X\n```grafico\n{"tipo": }\n```\n');
  assert.equal(lista.length, 1);
  assert.match(lista[0], new RegExp(`^${L(2)}: JSON do gráfico inválido: `));
});

test('erro: meta obrigatória ausente, e meta que o contrato não tem', () => {
  const { erros: lista } = gerar('---\nunidade: ime\ndata: 2026-10-05\nsala: B3\n---\n\n# T\n\n## conteudo: X\nY.\n');
  assert.deepEqual(lista.map(({ linha, mensagem }) => `${linha}: ${mensagem}`), [
    '1: meta "sala" não existe; use uma de: unidade, disciplina, aula, data, professor, video',
    '1: falta a meta obrigatória "professor" no cabeçalho',
  ]);
});

test('erro: legenda: solta', () => {
  assert.deepEqual(erros('## conteudo: X\nTexto.\nlegenda: Solta.\n'),
    [`${L(3)}: legenda: solta; ela vale só logo depois de uma figura, gráfico ou diagrama`]);
});

test('erro: duas capas, e a capa depois do primeiro slide', () => {
  assert.deepEqual(erros('# Outra capa\n\n## conteudo: X\nY.\n'), [`${L(1)}: duas capas: a capa já é a linha 7`]);
  const { erros: lista } = gerar('---\nunidade: ime\ndata: 2026-10-05\nprofessor: P\n---\n\n## conteudo: X\nY.\n# Capa tardia\n');
  assert.deepEqual(lista.map(({ linha, mensagem }) => `${linha}: ${mensagem}`), [
    '1: falta a capa: "# Título | segunda linha", antes do primeiro slide',
    '9: a capa vem antes do primeiro slide: mova "# Título | segunda linha" para cima',
  ]);
});

test('erro: marcação desconhecida em [xxx: …]', () => {
  assert.deepEqual(erros('## conteudo: X\n[aviso: Olha] Texto.\n'),
    [`${L(2)}: marcação desconhecida [aviso: …]; use [destaque: …], [quadro: …], [alerta: …]`]);
});

test('erro: o que o layout não aceita, na linha do bloco, com o conselho da fonte em figura', () => {
  assert.deepEqual(erros('## figura: X\n![a](a.png)\nfonte: Alguém.\n'),
    [`${L(3)}: "fonte:" não cabe em figura; aqui, o crédito vai na "legenda:" da figura`]);
  assert.deepEqual(erros('## abertura: Bloco\n- uma lista\n'), [`${L(2)}: lista não cabe em abertura`]);
  assert.deepEqual(erros('## conteudo: X\n:::colunas 6-6\nA.\n---\nB.\n:::\nfonte: F.\n'),
    [`${L(7)}: "fonte:" não cabe em conteudo; com colunas, escreva "fonte:" dentro de uma coluna`]);
});

test('erro: o que o layout pede e o roteiro não trouxe', () => {
  assert.deepEqual(erros('## conteudo: X\n'), [`${L(1)}: conteudo pede colunas ou um bloco de corpo`]);
  assert.deepEqual(erros('## conteudo\nTexto.\n'), [`${L(1)}: conteudo pede título: "## conteudo: título"`]);
  assert.deepEqual(erros('## encerramento: Fim\n'), [`${L(1)}: encerramento pede lista`]);
});

test('erro: texto entre a capa e o primeiro slide não cabe em slide nenhum', () => {
  assert.deepEqual(erros('- uma lista na capa\n\n## conteudo: X\nY.\n'),
    [`${L(1)}: texto fora de slide: a capa é só a linha "# Título | segunda linha", e o que vem depois dela precisa de um "## layout: título"`]);
});

test('erro: figura por URL ou caminho absoluto é recusada; a figura tem de estar junto', () => {
  assert.deepEqual(erros('## figura: X\n![a](https://exemplo.org/a.png)\n## figura: Y\n![b](/tmp/b.png)\n'), [
    `${L(2)}: a figura "https://exemplo.org/a.png" tem de estar junto do roteiro, num caminho relativo a ele`,
    `${L(4)}: a figura "/tmp/b.png" tem de estar junto do roteiro, num caminho relativo a ele`,
  ]);
});

// ---------------------------------------------------------------------------------------------
// 5. O gerador consulta o contrato, não uma lista própria (inversão do Passo 3).

test('o que cada layout aceita vem do contrato: sem "figura" no contrato, "## figura:" é erro', () => {
  const semFigura = structuredClone(CONTRATO);
  delete semFigura.layouts.figura;
  assert.deepEqual(erros('## figura: X\n![a](a.png)\n', semFigura),
    [`${L(1)}: layout "figura" não existe; use um de: abertura, conteudo, afirmacao, demo, encerramento`]);
  // E o mesmo roteiro, com o contrato de verdade, passa.
  assert.deepEqual(gerar(`${CABECALHO}\n## figura: X\n![a](a.png)\n`).erros, []);
});

// ---------------------------------------------------------------------------------------------
// 6. O exemplo da spec 6.1 e o determinismo.

test('o exemplo da spec 6.1, copiado literalmente, gera uma aula com 0 erros no validador estático e de carga', async () => {
  const texto = readFileSync(join(EXEMPLO, 'roteiro.md'), 'utf8');
  const spec = readFileSync(join(RAIZ, 'docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md'), 'utf8');
  assert.ok(spec.includes(`\`\`\`\`markdown\n${texto}\`\`\`\``), 'a fixture não é mais cópia literal do exemplo da spec 6.1');

  const tag = readFileSync(join(RAIZ, 'modelos/aula/index.html'), 'utf8').match(/<script src=[\s\S]*?<\/script>/)[0];
  const { html, figuras, erros: lista } = gerarAula(lerRoteiro(texto), { contrato: CONTRATO, tagDoRuntime: tag });
  assert.deepEqual(lista, []);
  const pasta = mkdtempSync(join(tmpdir(), 'aula-usp-roteiro-'));
  mkdirSync(join(pasta, 'img'));
  for (const { origem, destino } of figuras) cpSync(join(EXEMPLO, origem), join(pasta, destino));
  writeFileSync(join(pasta, 'index.html'), html);

  const { doc, recursos, achadosEstatica, fase, contrato } = await lerERodarEstatica(pasta);
  const achados = [...achadosEstatica, ...validarCarga(doc, { contrato, recursos, fase })];
  assert.deepEqual(achados.filter((achado) => achado.severidade === 'erro'), []);
  // Os dois avisos são do próprio exemplo, não do gerador: ele tem uma abertura só (o mínimo é 2), e o
  // slide de figura não traz nota. Medidos, e presos aqui para um aviso novo não passar mudo.
  assert.deepEqual(achados.map((achado) => `${achado.regra} ${achado.slide ?? 'aula'}`),
    ['estrutura.blocos aula', 'estrutura.notas-ausentes 4']);
});

test('determinismo: a mesma entrada dá os mesmos bytes, e gerarAula não mexe no roteiro que recebe', () => {
  const texto = readFileSync(join(EXEMPLO, 'roteiro.md'), 'utf8');
  const primeira = gerar(texto).html;
  assert.equal(gerar(texto).html, primeira);
  const roteiro = lerRoteiro(texto);
  const copia = structuredClone(roteiro);
  assert.equal(gerarAula(roteiro, { contrato: CONTRATO, tagDoRuntime: TAG }).html, primeira);
  assert.equal(gerarAula(roteiro, { contrato: CONTRATO, tagDoRuntime: TAG }).html, primeira);
  assert.deepEqual(roteiro, copia);
});

test('lerRoteiro devolve a forma da interface: metas, capa, slides e erros', () => {
  const roteiro = lerRoteiro(readFileSync(join(EXEMPLO, 'roteiro.md'), 'utf8'));
  assert.deepEqual(roteiro.metas, {
    unidade: 'ifusp', disciplina: 'Física Estatística', aula: '3', data: '2026-10-05', professor: 'Prof. Renato Vicente', video: 'canto',
  });
  assert.deepEqual(roteiro.capa, { titulo: 'Passeio aleatório', segunda: 'e difusão', linha: 10 });
  assert.deepEqual(roteiro.slides.map(({ layout, titulo, segunda, id, curto, linha }) => ({ layout, titulo, segunda, id, curto, linha })), [
    { layout: 'abertura', titulo: 'O passeio', segunda: undefined, id: 'passeio', curto: 'O passeio', linha: 12 },
    { layout: 'conteudo', titulo: 'A variância cresce', segunda: 'linearmente com o tempo', id: 'variancia', curto: undefined, linha: 15 },
    { layout: 'figura', titulo: 'A nuvem se espalha', segunda: 'como raiz de t', id: 'nuvem', curto: undefined, linha: 23 },
    { layout: 'encerramento', titulo: 'O que fica', segunda: undefined, id: undefined, curto: undefined, linha: 27 },
  ]);
  assert.deepEqual(roteiro.slides[1].notas, [{ texto: 'Pedir a um aluno que ande jogando uma moeda.', linha: 20 }]);
  assert.deepEqual(roteiro.erros, []);
});
