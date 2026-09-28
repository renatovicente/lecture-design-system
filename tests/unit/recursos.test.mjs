// Matemática e recursos que dá para conferir no fonte (spec 9.2), sem carregar KaTeX nem imagem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as recursos } from '../../validador/regras/recursos.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const slide = (dentro) => `${CABECA}\n<section data-layout="conteudo" id="a">\n${dentro}\n</section>\n</body></html>`;

// fase: 2 sempre — recursos.grafico (abaixo) é fase 2, e uma regra de fase 1 continua rodando sob
// fase 2 (validar() só pula regra.fase > fase); não há motivo para as duas fases neste arquivo.
function mensagens(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: recursos, grupo: 'estatica', fase: 2 }).map((achado) => achado.mensagem);
}

test('TeX limpo não acusa nada', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Seja \\(x^2 + y^2 = r^2\\).</p>')), []);
});

test('comando de cor e de estilo no TeX', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\textcolor{red}{x}\\).</p>')), ['comando proibido no TeX: \\textcolor.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\htmlData{passo=1}{x}\\).</p>')), ['comando proibido no TeX: \\htmlData.']);
});

// \color não pode pegar \colorbox duas vezes, nem \red pegar \reduce.
test('a fronteira do nome do comando é respeitada', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\colorbox{red}{x}\\).</p>')), ['comando proibido no TeX: \\colorbox.']);
});

test('as macros de cor do KaTeX, que o contrato pega por padrão', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\redA{x}\\).</p>')), ['comando de cor no TeX: \\redA.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\blue{x}\\).</p>')), ['comando de cor no TeX: \\blue.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\text{red}\\).</p>')), []);
});

test('o passo continua valendo: \\passo não é comando proibido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\passo{1}{x}\\).</p>')), []);
});

// Achado da revisão final (item 7): .exec() não global só reportava o primeiro comando de cor do
// segmento; \redA e \blue no mesmo \( \) precisam dos dois achados, um por ocorrência.
test('cada comando de cor por padrão é reportado, não só o primeiro do segmento', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\redA{x} + \\blue{y}\\).</p>')),
    ['comando de cor no TeX: \\redA.', 'comando de cor no TeX: \\blue.'],
  );
});

test('cifrão suspeito é aviso; dinheiro não é', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Considere $x^2 + y^2$ no plano.</p>')), ['"$x^2 + y^2$" parece matemática entre cifrões.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>O preço é $100 e o desconto é $20.</p>')), []);
});

// Achado da revisão final (item 7 e M1): mesmo .exec() não global do achado acima, e o texto fora do
// TeX era juntado com espaço antes de casar o padrão — um $ antes de uma equação casava com o $ de
// depois dela, um segmento nunca deveria ver o outro lado do TeX.
test('cada cifrão suspeito é reportado, e um TeX no meio não deixa um $ casar do outro lado', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>Veja $a^2$ e depois $b_1$ também.</p>')),
    ['"$a^2$" parece matemática entre cifrões.', '"$b_1$" parece matemática entre cifrões.'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>Custa R$ 5 e \\(x^2\\) o valor_base sobe a R$ 9.</p>')),
    [],
  );
});

// A lição do marco 4a: matemática dentro de pre nunca é renderizada, então nunca é acusada.
test('TeX dentro de pre e de code é exemplo, não matemática', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<pre data-lang="latex">\\(\\textcolor{red}{x}\\)</pre>')), []);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Escreva <code>$x^2$</code> assim.</p>')), []);
});

// Achado da revisão final (Minor, item 8): recursos.alt conferia hasAttribute('alt') por lógica
// própria; contrato.html.atributos.img.alt.obrigatorio já é esse dado, e ninguém lia. Ler o contrato
// prova que a regra segue o dado: desligar a obrigatoriedade lá desliga a regra, sem tocar no código.
test('recursos.alt lê a obrigatoriedade do contrato, não decide sozinha', () => {
  const semAlt = slide('<h2>T</h2>\n<figure><img src="img/a.png"></figure>');
  assert.deepEqual(mensagens(semAlt), ['imagem sem alt.']);
  const outroContrato = structuredClone(contrato);
  outroContrato.html.atributos.img.alt.obrigatorio = false;
  const { document } = parseHTML(semAlt);
  assert.deepEqual(validar(document, { contrato: outroContrato, regras: recursos, grupo: 'estatica' }), []);
});

test('imagem sem alt, imagem de fora e linguagem fora da lista', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="img/a.png"></figure>')), ['imagem sem alt.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="https://exemplo.org/a.png" alt="a"></figure>')),
    ['imagem de fora: "https://exemplo.org/a.png".']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<pre data-lang="cobol">MOVE X TO Y.</pre>')),
    ['linguagem fora da lista em data-lang: "cobol".']);
});

// Achado da revisão final (item 7): o seletor era sensível a caixa, então HTTPS:// escapava do aviso
// — e não em silêncio: o padrão de src do contrato também é sensível a caixa, então sobrava um erro
// confuso de vocabulario.atributo. Corrigir só o seletor faria os dois acusarem juntos; o padrão do
// contrato precisa aceitar o esquema em qualquer caixa também, para restar só o aviso certo.
test('imagem de fora com esquema em maiúsculas (HTTPS://) também é aviso, não erro confuso', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="HTTPS://exemplo.org/a.png" alt="a"></figure>')),
    ['imagem de fora: "HTTPS://exemplo.org/a.png".']);
});

// I4 da revisão final da 2a: três erros decidíveis sem carregar nada, que passavam por `validar` com
// 0 erros e só apareciam no build, em mensagens cruas — medido: coluna de y ausente → "Cannot read
// properties of undefined (reading '0')"; coluna de x ausente → "values is not iterable"; `dados`
// ausente → 'dados não encontrados para "undefined"'. E log em y de barras/histograma, que falha
// com QUALQUER dado, porque o y desses dois tipos inclui o zero.
const grafico = (especificacao) => slide(`<h2>T</h2>\n<figure class="grafico"><script type="application/json">${JSON.stringify(especificacao)}</script></figure>`);
const INLINE = { epoca: [0, 1, 2], erro: [1, 0.5, 0.2] };

test('recursos.grafico: com "dados" inline, as colunas de x e de cada y têm de existir', () => {
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: INLINE, x: 'epoca', y: ['erro'] })), []);
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: INLINE, x: 'epoca', y: ['nada'] })),
    ['os dados do gráfico não têm a coluna "nada".']);
  assert.deepEqual(mensagens(grafico({ tipo: 'dispersao', dados: INLINE, x: 'nada', y: ['erro', 'outra'] })),
    ['os dados do gráfico não têm as colunas "nada", "outra".']);
  assert.deepEqual(mensagens(grafico({ tipo: 'histograma', dados: INLINE, x: 'nada', classes: 3 })),
    ['os dados do gráfico não têm a coluna "nada".']);
  // Com caminho de CSV, a regra estática não tem as colunas: quem confere é o desenho, no build.
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: 'data/erro.csv', x: 'epoca', y: ['nada'] })), []);
});

test('recursos.grafico: "dados" tem de existir, como caminho de CSV ou objeto de colunas', () => {
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', x: 'epoca', y: ['erro'] })), ['gráfico sem o campo "dados".']);
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: [1, 2], x: 'epoca', y: ['erro'] })),
    ['"dados" tem de ser o caminho de um CSV ou um objeto de colunas, como {"epoca": [...]}.']);
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: ' ', x: 'epoca', y: ['erro'] })), ['gráfico com "dados" vazio.']);
});

test('recursos.grafico: escalas.y "log" é recusada em barras e histograma, e só neles', () => {
  const barras = { tipo: 'barras', dados: { c: ['a', 'b'], v: [1, 2] }, x: 'c', y: ['v'], escalas: { y: 'log' } };
  assert.deepEqual(mensagens(grafico(barras)),
    ['gráfico "barras" com escalas.y "log": o eixo y dele começa em zero, e zero não existe em escala log.']);
  assert.deepEqual(mensagens(grafico({ tipo: 'histograma', dados: INLINE, x: 'erro', classes: 2, escalas: { y: 'log' } })),
    ['gráfico "histograma" com escalas.y "log": o eixo y dele começa em zero, e zero não existe em escala log.']);
  assert.deepEqual(mensagens(grafico({ tipo: 'linha', dados: INLINE, x: 'epoca', y: ['erro'], escalas: { y: 'log' } })), []);
  assert.deepEqual(mensagens(grafico({ ...barras, escalas: { y: 'linear' } })), []);
});

// `linhas` (spec 7.2, campo novo do brief "gráfico com reta e limites redondos"): só existe em
// "dispersao", só como lista de nomes de série (strings) e só citando nomes que estão em "y". As três
// formas de recusa, na mesma ordem em que a regra confere (tipo, depois forma, depois pertencimento).
const DISPERSAO = { tipo: 'dispersao', dados: { horas: [1, 2, 3], nota: [3, 4, 5], reta: [3.1, 3.9, 5.2] }, x: 'horas', y: ['nota', 'reta'], foco: 'reta' };

test('recursos.grafico: "linhas" só vale em "dispersao" — em "linha" (que já desenha tudo como reta) é recusado', () => {
  const linha = { tipo: 'linha', dados: INLINE, x: 'epoca', y: ['erro'], linhas: ['erro'] };
  assert.deepEqual(mensagens(grafico(linha)), ['"linhas" só vale no tipo "dispersao"; este gráfico é "linha".']);
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: ['reta'] })), []);
});

test('recursos.grafico: "linhas" tem de ser uma lista de strings', () => {
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: 'reta' })),
    ['"linhas" tem de ser uma lista de nomes de série (strings): "reta".']);
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: [1] })),
    ['"linhas" tem de ser uma lista de nomes de série (strings): [1].']);
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: ['reta', 2] })),
    ['"linhas" tem de ser uma lista de nomes de série (strings): ["reta",2].']);
});

test('recursos.grafico: nome em "linhas" que não está em "y" é recusado, com o(s) nome(s) que sobra(m)', () => {
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: ['nada'] })),
    ['"linhas" cita série(s) que não está(ão) em "y": "nada".']);
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: ['reta', 'nada', 'outra'] })),
    ['"linhas" cita série(s) que não está(ão) em "y": "nada", "outra".']);
  assert.deepEqual(mensagens(grafico({ ...DISPERSAO, linhas: [] })), [], 'lista vazia não cita nada fora de y — não há o que recusar');
});
