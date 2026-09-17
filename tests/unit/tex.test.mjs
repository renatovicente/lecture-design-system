import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { segmentosDeTex, texParaTexto, textoSemTex, renderizarTex } from '../../componentes/tex.js';

const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;

test('segmentosDeTex separa \\( \\) e \\[ \\] do texto, e R$ não é delimitador', () => {
  assert.deepEqual(segmentosDeTex('Custa R$ 100 e a taxa é \\(\\eta\\); \\[ w \\leftarrow w - \\eta \\]'), [
    { tipo: 'texto', texto: 'Custa R$ 100 e a taxa é ' },
    { tipo: 'inline', tex: '\\eta', trecho: '\\(\\eta\\)' },
    { tipo: 'texto', texto: '; ' },
    { tipo: 'destaque', tex: ' w \\leftarrow w - \\eta ', trecho: '\\[ w \\leftarrow w - \\eta \\]' },
  ]);
  assert.deepEqual(segmentosDeTex('R$ 100, $x^2$ e nada mais'), [{ tipo: 'texto', texto: 'R$ 100, $x^2$ e nada mais' }]);
});

test('segmentosDeTex deixa como texto a abertura sem fechamento e não fecha em \\\\)', () => {
  assert.deepEqual(segmentosDeTex('fica \\(aberto'), [{ tipo: 'texto', texto: 'fica \\(aberto' }]);
  assert.deepEqual(segmentosDeTex('\\( a \\\\) b \\)'), [{ tipo: 'inline', tex: ' a \\\\) b ', trecho: '\\( a \\\\) b \\)' }]);
});

test('texParaTexto e textoSemTex trocam o TeX por texto sem barras nem chaves', () => {
  assert.equal(texParaTexto('\\eta'), 'eta');
  assert.equal(texParaTexto('\\nabla E(w)'), 'nabla E(w)');
  assert.equal(texParaTexto('\\mathbf{w}^\\top x'), 'w^top x');
  assert.equal(texParaTexto('\\frac{1}{N}\\sum_i x_i'), '1/N sum_i x_i');
  assert.equal(texParaTexto('\\text{taxa } \\eta'), 'taxa eta');
  assert.equal(textoSemTex('O papel de \\(\\eta\\) no passo'), 'O papel de eta no passo');
});

test('renderizarTex troca \\( \\) por span.katex e \\[ \\] por div.equacao, os dois com data-tex', () => {
  const raiz = corpo('<p>A taxa \\(\\eta\\) controla o passo.</p><div>\\[ w \\leftarrow w - \\eta \\]</div>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  const inline = raiz.querySelector('p > span.katex');
  assert.equal(inline.getAttribute('data-tex'), '\\eta');
  assert.equal(raiz.querySelector('p').firstChild.nodeValue, 'A taxa ');
  const equacao = raiz.querySelector('div > div.equacao');
  assert.equal(equacao.getAttribute('data-tex'), ' w \\leftarrow w - \\eta ');
  assert.ok(equacao.firstChild.classList.contains('katex-display'));
});

test('renderizarTex não toca TeX em pre, code, script e svg, e renderiza as notas', () => {
  const raiz = corpo('<pre>\\(x\\)</pre><p><code>\\(y\\)</code></p><script>"\\(z\\)"</script>'
    + '<svg><text>\\(w\\)</text></svg><aside class="notas">Nota \\(\\alpha\\)</aside>');
  renderizarTex(raiz, { katex });
  assert.equal(raiz.querySelectorAll('.katex').length, 1);
  assert.equal(raiz.querySelector('aside.notas .katex').getAttribute('data-tex'), '\\alpha');
  assert.deepEqual([raiz.querySelector('pre').textContent, raiz.querySelector('code').textContent], ['\\(x\\)', '\\(y\\)']);
});

test('\\passo{n}{…} vira um elemento com data-passo dentro de cada célula do aligned', () => {
  const raiz = corpo('<div>\\[ \\begin{aligned} a &= b \\\\ \\passo{1}{c} &\\passo{1}{= d} \\\\ \\passo{2}{e} &\\passo{2}{= f} \\end{aligned} \\]</div>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  // O aligned do KaTeX escreve uma coluna inteira antes da outra, então a ordem no documento é 1, 2, 1, 2:
  // é por isso que \passo exige número, e o motor revela por número (spec 6.4).
  assert.deepEqual([...raiz.querySelectorAll('[data-passo]')].map((passo) => passo.getAttribute('data-passo')), ['1', '2', '1', '2']);
});

test('TeX inválido e comando não permitido viram alerta com o trecho e voltam como erro', () => {
  const raiz = corpo('<p>Erro \\(\\frac{a}{\\) e \\(\\href{https://usp.br}{a}\\).</p><div>\\[ \\naoexiste \\]</div>');
  const erros = renderizarTex(raiz, { katex });
  assert.deepEqual(erros.map((erro) => erro.trecho), ['\\(\\frac{a}{\\)', '\\(\\href{https://usp.br}{a}\\)', '\\[ \\naoexiste \\]']);
  assert.match(erros[0].mensagem, /^Unexpected end of input/);
  assert.equal(erros[1].mensagem, 'comando não permitido no TeX');
  assert.deepEqual([...raiz.querySelectorAll('.tex-invalido')].map((alerta) => `${alerta.nodeName} ${alerta.className} ${alerta.textContent}`),
    ['SPAN tex-invalido \\(\\frac{a}{\\)', 'SPAN tex-invalido \\(\\href{https://usp.br}{a}\\)', 'DIV equacao tex-invalido \\[ \\naoexiste \\]']);
  assert.equal(raiz.querySelector('.tex-invalido').getAttribute('title'), erros[0].mensagem);
});

test('as cores de \\color, \\textcolor, \\colorbox, \\fcolorbox e \\red não chegam ao HTML', () => {
  const raiz = corpo('<p>\\(\\color{red}{a} + \\textcolor{#FF0000}{b} + \\colorbox{yellow}{c} + \\fcolorbox{red}{blue}{d} + \\red{e}\\)</p>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  const estilos = [...raiz.querySelectorAll('[style]')].map((elemento) => elemento.getAttribute('style'));
  assert.ok(estilos.length > 0);
  assert.deepEqual(estilos.filter((estilo) => /(?:^|;)\s*(?:color|background-color|border-color)\s*:/i.test(estilo)), []);
  assert.equal(raiz.querySelectorAll('[mathcolor], [mathbackground]').length, 0);
});

test('renderizarTex é idempotente: uma segunda passada não muda nada', () => {
  const raiz = corpo('<p>\\(x^2\\) e \\(\\frac{a}{\\)</p><div>\\[ y \\]</div>');
  renderizarTex(raiz, { katex });
  const antes = raiz.innerHTML;
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  assert.equal(raiz.innerHTML, antes);
});
