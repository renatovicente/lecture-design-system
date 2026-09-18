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

function mensagens(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: recursos, grupo: 'estatica' }).map((achado) => achado.mensagem);
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
