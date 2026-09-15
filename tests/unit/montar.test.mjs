import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { montar, slug } from '../../montar/montar.js';

const ler = (caminho) => JSON.parse(readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8'));
const unidades = ler('assets/marcas/unidades.json');
const usp = ler('assets/marcas/usp.json');
const contrato = ler('contrato/contrato.json');
const limites = { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] };

const cabeca = (unidade, lang = 'pt-BR') => `<!DOCTYPE html><html lang="${lang}"><head>
  <meta name="unidade" content="${unidade}"><meta name="disciplina" content="Aprendizado de Máquina">
  <meta name="aula" content="4"><meta name="data" content="2026-09-14">
  <meta name="professor" content="Prof. Renato Vicente"></head>`;

const AULA_IME = (lang) => `${cabeca('ime', lang)}<body>
  <section data-layout="capa"><h1>Descida do gradiente<br><span class="sinal">o caminho para baixo</span></h1></section>
  <section data-layout="conteudo"><h2>Por que descer?</h2><p>Texto.</p><aside class="notas">Dizer.</aside></section>
  <section data-layout="abertura" id="intuicao"><h2>Intuição</h2><p class="pergunta">Por quê?</p></section>
  <section data-layout="conteudo" id="passo"><h2>O passo</h2>\\[ w \\leftarrow w - \\eta \\]<p>Texto.</p></section>
  <section data-layout="abertura" data-curto="Backprop"><h2>Backpropagation</h2></section>
  <section data-layout="conteudo" id="culpa"><h2>A culpa volta</h2><p>Texto.</p></section>
  <section data-layout="encerramento"><h2>O que fica</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

const montado = (html) => {
  const { document } = parseHTML(html);
  const resumo = montar(document, { unidades, usp, urlMarcas: 'M', limites });
  return { document, resumo };
};
const classes = (lista) => [...lista].map((el) => el.className);
const textos = (lista) => [...lista].map((el) => el.textContent);

test('toda seção vira slide com índice, modo do mapa, bloco e id', () => {
  const { document, resumo } = montado(AULA_IME());
  const slides = [...document.querySelectorAll('section.slide')];
  assert.equal(slides.length, 7);
  assert.deepEqual(slides.map((s) => s.getAttribute('data-indice')), ['1', '2', '3', '4', '5', '6', '7']);
  assert.ok(slides.every((s) => s.getAttribute('data-mapa') === 'fileira'));
  assert.deepEqual(slides.map((s) => s.id),
    ['capa', 'por-que-descer', 'intuicao', 'passo', 'backpropagation', 'culpa', 'encerramento']);
  assert.deepEqual(slides.map((s) => s.getAttribute('data-bloco')), [null, null, '1', '1', '2', '2', '2']);
  assert.deepEqual(resumo, {
    total: 7, modo: 'fileira',
    blocos: [
      { numero: 1, titulo: 'Intuição', curto: 'Intuição', id: 'intuicao' },
      { numero: 2, titulo: 'Backpropagation', curto: 'Backprop', id: 'backpropagation' },
    ],
  });
});

test('conteúdo do autor vai para div.area, com o TeX intacto; notas ficam fora', () => {
  const { document } = montado(AULA_IME());
  const intro = document.getElementById('por-que-descer');
  const area = [...intro.children].find((el) => el.classList.contains('area'));
  assert.deepEqual([...area.children].map((el) => el.nodeName), ['H2', 'P']);
  assert.equal(intro.querySelector('.area aside.notas'), null);
  assert.ok([...intro.children].some((el) => el.nodeName === 'ASIDE' && el.classList.contains('notas')));
  assert.ok(document.getElementById('passo').querySelector('.area').textContent
    .includes('\\[ w \\leftarrow w - \\eta \\]'));
});

test('capa: metadados em duas linhas, roteiro e faixa do IME sem assinatura separada', () => {
  const { document } = montado(AULA_IME());
  const capa = document.getElementById('capa');
  assert.deepEqual(textos(capa.querySelectorAll('.metadados-capa p')),
    ['Aprendizado de Máquina · Aula 4', 'Prof. Renato Vicente · 14 set 2026']);
  assert.equal(capa.querySelector('.roteiro').getAttribute('data-n'), '2');
  assert.deepEqual(textos(capa.querySelectorAll('.roteiro .nome-curto')), ['Intuição', 'Backprop']);
  assert.deepEqual(classes(capa.querySelectorAll('.roteiro .quadrado')), ['quadrado futuro', 'quadrado futuro']);
  const logos = capa.querySelectorAll('.faixa-de-marca img');
  assert.equal(logos.length, 1);
  assert.equal(logos[0].className, 'marca-unidade');
  assert.equal(logos[0].getAttribute('src'), 'M/ime-usp-horizontal-preta.svg');
  assert.equal(logos[0].getAttribute('height'), '88');
  assert.equal(logos[0].getAttribute('alt'),
    'Instituto de Matemática, Estatística e Ciência da Computação · Universidade de São Paulo');
  assert.equal(capa.querySelector('.marca-usp'), null);
  assert.equal(capa.querySelector('.cabecalho'), null);
});

test('introdução: rótulo, quadrados futuros com links, contador e rodapé', () => {
  const { document } = montado(AULA_IME());
  const intro = document.getElementById('por-que-descer');
  assert.equal(intro.querySelector('.cabecalho .rotulo').textContent, 'Introdução');
  const quadrados = intro.querySelectorAll('.cabecalho .mapa .quadrado');
  assert.deepEqual([...quadrados].map((q) => q.getAttribute('href')), ['#intuicao', '#backpropagation']);
  assert.deepEqual(classes(quadrados), ['quadrado futuro', 'quadrado futuro']);
  assert.equal(quadrados[0].getAttribute('aria-label'), 'Bloco 1: Intuição');
  assert.equal(intro.querySelector('.cabecalho .contador').textContent, '2 / 7');
  assert.equal(intro.querySelector('.rodape').textContent, 'Aprendizado de Máquina · Aula 4');
});

test('conteúdo dentro de um bloco: rótulo numerado e quadrados visto e atual', () => {
  const { document } = montado(AULA_IME());
  const culpa = document.getElementById('culpa');
  assert.equal(culpa.querySelector('.rotulo').textContent, '02 · Backpropagation');
  assert.deepEqual(classes(culpa.querySelectorAll('.mapa .quadrado')), ['quadrado visto', 'quadrado atual']);
  assert.equal(culpa.querySelector('.contador').textContent, '6 / 7');
});

test('abertura: fileira com estados, número do atual e "Bloco N de M" depois do título', () => {
  const { document } = montado(AULA_IME());
  const abertura = document.getElementById('backpropagation');
  const fileira = abertura.querySelector('.fileira');
  assert.equal(fileira.getAttribute('data-n'), '2');
  assert.deepEqual([...fileira.children].map((li) => li.getAttribute('data-estado')), ['visto', 'atual']);
  assert.equal(fileira.querySelector('.quadrado.atual .numero-bloco').textContent, '02');
  assert.equal(fileira.querySelector('.quadrado.visto .numero-bloco'), null);
  assert.deepEqual(textos(fileira.querySelectorAll('.nome-curto')), ['Intuição', 'Backprop']);
  const titulo = abertura.querySelector('.area h2');
  assert.equal(titulo.nextElementSibling.className, 'bloco-n-de-m');
  assert.equal(titulo.nextElementSibling.textContent, 'Bloco 2 de 2');
  assert.equal(abertura.querySelector('.cabecalho'), null);
  assert.equal(abertura.querySelector('.rodape'), null);
});

test('encerramento: todos os quadrados vistos, faixa de marca e nenhum rodapé', () => {
  const { document } = montado(AULA_IME());
  const fim = document.getElementById('encerramento');
  assert.equal(fim.querySelector('.rotulo').textContent, 'Encerramento');
  assert.deepEqual(classes(fim.querySelectorAll('.mapa .quadrado')), ['quadrado visto', 'quadrado visto']);
  assert.ok(fim.querySelector('.faixa-de-marca img.marca-unidade'));
  assert.equal(fim.querySelector('.rodape'), null);
});

test('IFUSP: logo vertical e assinatura da USP com o texto em duas linhas', () => {
  const { document } = montado(`${cabeca('ifusp')}<body>
    <section data-layout="capa"><h1>Física</h1></section>
    <section data-layout="abertura"><h2>Um</h2></section>
    <section data-layout="abertura"><h2>Dois</h2></section>
    <section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
  </body></html>`);
  const faixa = document.getElementById('capa').querySelector('.faixa-de-marca');
  const logo = faixa.querySelector('img.marca-unidade');
  assert.equal(logo.getAttribute('src'), 'M/ifusp-vertical-preto.png');
  assert.equal(logo.getAttribute('height'), '128');
  assert.equal(logo.getAttribute('alt'), 'Instituto de Física');
  const assinatura = faixa.querySelector('.marca-usp');
  assert.equal(assinatura.querySelector('span').innerHTML, 'Universidade<br>de São Paulo');
  const logoUsp = assinatura.querySelector('img');
  assert.equal(logoUsp.getAttribute('src'), 'M/usp-preto.svg');
  assert.equal(logoUsp.getAttribute('height'), '56');
  assert.equal(logoUsp.getAttribute('alt'), 'Universidade de São Paulo');
});

test('nove blocos: o cabeçalho troca os quadrados por "Bloco N de M"', () => {
  const aberturas = Array.from({ length: 9 }, (_, k) => `<section data-layout="abertura"><h2>B${k + 1}</h2></section>`
    + (k === 2 ? '<section data-layout="conteudo" id="dentro"><h2>Dentro do terceiro</h2><p>Texto.</p></section>' : ''));
  const { document } = montado(`${cabeca('ime')}<body><section data-layout="capa"><h1>Muitos</h1></section>
    ${aberturas.join('')}<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section></body></html>`);
  assert.ok([...document.querySelectorAll('section.slide')].every((s) => s.getAttribute('data-mapa') === 'contador'));
  const dentro = document.getElementById('dentro');
  assert.equal(dentro.querySelector('.mapa'), null);
  assert.equal(dentro.querySelector('.cabecalho .bloco-n-de-m').textContent, 'Bloco 3 de 9');
  const fim = document.getElementById('encerramento');
  assert.equal(fim.querySelector('.mapa'), null);
  assert.equal(fim.querySelector('.bloco-n-de-m'), null);
  assert.equal(document.querySelector('.fileira').getAttribute('data-n'), '9');
});

test('idioma en: rótulos, rodapé e data em inglês', () => {
  const { document } = montado(AULA_IME('en'));
  assert.equal(document.getElementById('por-que-descer').querySelector('.rotulo').textContent, 'Introduction');
  assert.equal(document.getElementById('por-que-descer').querySelector('.rodape').textContent,
    'Aprendizado de Máquina · Lecture 4');
  assert.equal(document.querySelectorAll('#capa .metadados-capa p')[1].textContent, 'Prof. Renato Vicente · 14 Sep 2026');
  assert.equal(document.getElementById('backpropagation').querySelector('.bloco-n-de-m').textContent, 'Block 2 of 2');
  assert.equal(document.getElementById('encerramento').querySelector('.rotulo').textContent, 'Closing');
});

test('sem aberturas: nenhum mapa, nenhum roteiro e rótulo de introdução', () => {
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="capa"><h1>Curta</h1></section>
    <section data-layout="conteudo"><h2>Só isto</h2><p>Texto.</p></section>
    <section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section></body></html>`);
  const conteudo = document.getElementById('so-isto');
  assert.equal(conteudo.getAttribute('data-mapa'), 'nenhum');
  assert.equal(conteudo.querySelector('.mapa'), null);
  assert.equal(conteudo.querySelector('.bloco-n-de-m'), null);
  assert.equal(conteudo.querySelector('.rotulo').textContent, 'Introdução');
  assert.equal(document.querySelector('.roteiro'), null);
});

test('unidade desconhecida gera erro claro', () => {
  assert.throws(() => montado(AULA_IME().replace('content="ime"', 'content="fea"')), /unidade desconhecida: "fea"/);
  assert.throws(() => montado(AULA_IME().replace('content="ime"', 'content="constructor"')),
    /unidade desconhecida: "constructor"/);
});

test('montar recusa uma aula já montada', () => {
  const { document } = montado(AULA_IME());
  assert.throws(() => montar(document, { unidades, usp, urlMarcas: 'M', limites }), /aula já montada/);
});

test('montar aceita uma aula em que o autor escreveu class="slide"', () => {
  const { document } = montado(`${cabeca('ime')}<body>
    <section class="slide" data-layout="capa"><h1>Aula</h1></section>
    <section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section></body></html>`);
  const slides = [...document.querySelectorAll('section.slide')];
  assert.equal(slides.length, 2);
  assert.equal(slides[0].id, 'capa');
});

test('slug remove acentos e pontuação; ids repetidos ganham sufixo', () => {
  assert.equal(slug('Por que descer?'), 'por-que-descer');
  assert.equal(slug('Ação & reação'), 'acao-reacao');
  assert.equal(slug(''), '');
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="conteudo"><h2>Repetido</h2><p>A.</p></section>
    <section data-layout="conteudo"><h2>Repetido</h2><p>B.</p></section></body></html>`);
  assert.deepEqual([...document.querySelectorAll('section.slide')].map((s) => s.id), ['repetido', 'repetido-2']);
});

test('id gerado não repete id de elemento fora das seções (ex.: marker de SVG)', () => {
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="figura"><h2>Seta</h2><figure><svg viewBox="0 0 10 10"><defs><marker id="seta">`
    + `<path d="M0 0L10 5L0 10z"/></marker></defs><line x1="0" y1="5" x2="9" y2="5" marker-end="url(#seta)"/></svg>`
    + `</figure></section></body></html>`);
  assert.equal(document.querySelector('section.slide').id, 'seta-2');
  assert.equal(document.querySelectorAll('#seta').length, 1);
});

test('capa e encerramento com id do autor mantêm o id (spec 6.3)', () => {
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="capa" id="inicio"><h1>Título</h1></section>
    <section data-layout="encerramento" id="fim"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
  </body></html>`);
  assert.deepEqual([...document.querySelectorAll('section.slide')].map((s) => s.id), ['inicio', 'fim']);
});

test('toda classe gerada pelo sistema está em contrato.classesDoSistema', () => {
  const { document } = montado(AULA_IME());
  const doAutor = new Set(Object.keys(contrato.html.classes));
  const geradas = new Set();
  for (const el of document.querySelectorAll('[class]')) {
    for (const nome of el.className.split(/\s+/).filter(Boolean)) if (!doAutor.has(nome)) geradas.add(nome);
  }
  const fora = [...geradas].filter((nome) => !contrato.classesDoSistema.includes(nome));
  assert.deepEqual(fora, []);
});
