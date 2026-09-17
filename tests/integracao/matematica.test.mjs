// Matemática no Chrome, sobre especime/matematica.html e tests/fixtures/tex/ servidos por `aula-usp servir` (spec 4.3, 6.4, 6.9 e 7.1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula, classesForaDoContrato, perto, TINTA, PAPEL } from './utilitarios.mjs';

let servidor;
let navegador;
let folhaAberta;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/matematica.html?folha`));

test('espécime de matemática: 8 slides com 16 equações, fontes do KaTeX carregadas, sem erros e com as classes no contrato', async () => {
  const { pagina, erros } = await folha();
  const medida = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    equacoes: document.querySelectorAll('.katex').length,
    fontes: [...new Set([...document.fonts].filter((fonte) => fonte.status === 'loaded').map((fonte) => fonte.family.replaceAll('"', '')))],
  }));
  assert.deepEqual([medida.slides, medida.equacoes], [8, 16]);
  assert.deepEqual(erros, []);
  for (const familia of ['KaTeX_Main', 'KaTeX_Math']) assert.ok(medida.fontes.includes(familia), familia);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('matemática a 1,1 × o texto ao redor e sem o espaçamento do título; em destaque, alinhada à esquerda, sem margem, com o número na margem direita', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const destaque = document.getElementById('em-destaque');
    const slide = destaque.getBoundingClientRect();
    const equacao = destaque.querySelector('div.equacao');
    const partes = [...equacao.querySelector('.katex-html').children];
    const inline = document.querySelector('#no-texto p .katex');
    return {
      espacamentoNoTitulo: getComputedStyle(document.querySelector('#o-papel-de-eta h2 .katex')).letterSpacing,
      tamanhoEmLinha: parseFloat(getComputedStyle(inline).fontSize),
      tamanhoDoTexto: parseFloat(getComputedStyle(inline.parentElement).fontSize),
      tamanhoEmDestaque: parseFloat(getComputedStyle(equacao.querySelector('.katex')).fontSize),
      margem: getComputedStyle(equacao.querySelector('.katex-display')).margin,
      inicio: partes[0].getBoundingClientRect().left - slide.left,
      numero: partes.at(-1).classList.contains('katex-tag') ? partes.at(-1).getBoundingClientRect().right - slide.left : null,
    };
  });
  assert.equal(medida.espacamentoNoTitulo, 'normal');
  perto(medida.tamanhoEmLinha, 1.1 * medida.tamanhoDoTexto, 'matemática em linha');
  perto(medida.tamanhoEmDestaque, 26.4, 'matemática em destaque');
  assert.equal(medida.margem, '0px');
  perto(medida.inicio, 64, 'a equação começa na margem da área');
  perto(medida.numero, 1216, 'o número da equação termina na margem direita');
});

test('\\passo no aligned: escondido no palco, revelado por número, sem mover nenhum passo nem quebrar o alinhamento', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/matematica.html#passo-a-passo`);
  t.after(() => pagina.close());
  const estado = () => pagina.evaluate(() => {
    const equacao = document.querySelector('#passo-a-passo .katex');
    const passos = [...equacao.querySelectorAll('[data-passo]')];
    const arredondar = (valor) => Math.round(valor * 10) / 10;
    return {
      visibilidade: passos.map((passo) => `${passo.getAttribute('data-passo')}:${getComputedStyle(passo).visibility}`),
      caixas: passos.map((passo) => {
        const r = passo.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map(arredondar);
      }),
      // O sinal de igual de cada linha da coluna da direita: a primeira linha não tem \passo, as outras duas têm.
      iguais: [...equacao.querySelector('.col-align-l .vlist').children]
        .map((linha) => arredondar(linha.querySelector('.mrel').getBoundingClientRect().left)),
    };
  });
  const inicio = await estado();
  assert.deepEqual(inicio.visibilidade, ['1:hidden', '2:hidden', '1:hidden', '2:hidden']);
  assert.equal(inicio.iguais.length, 3);
  assert.equal(new Set(inicio.iguais).size, 1, `sinais de igual fora de coluna: ${inicio.iguais}`);
  await pagina.keyboard.press('ArrowRight');
  assert.deepEqual((await estado()).visibilidade, ['1:visible', '2:hidden', '1:visible', '2:hidden']);
  await pagina.keyboard.press('ArrowRight');
  const fim = await estado();
  assert.deepEqual(fim.visibilidade, ['1:visible', '2:visible', '1:visible', '2:visible']);
  assert.deepEqual(fim.caixas, inicio.caixas, 'revelar não move nenhum passo');
  assert.deepEqual(erros, []);
});

test('título com TeX: rótulo do cabeçalho, aria-label do mapa e cartão da visão geral sem barras', async (t) => {
  const { pagina } = await abrirAula(navegador, `${servidor.endereco}/matematica.html#no-texto`);
  t.after(() => pagina.close());
  const cabecalho = await pagina.evaluate(() => {
    const cabeca = document.querySelector('#no-texto .cabecalho');
    return { rotulo: cabeca.querySelector('.rotulo').textContent, aria: cabeca.querySelector('.quadrado').getAttribute('aria-label') };
  });
  assert.deepEqual(cabecalho, { rotulo: '01 · O papel de eta', aria: 'Bloco 1: O papel de eta' });
  await pagina.keyboard.press('Escape');
  const cartoes = await pagina.evaluate(() => [...document.querySelectorAll('[data-painel="visao-geral"] .cartao-titulo')].map((titulo) => titulo.textContent));
  assert.ok(cartoes.includes('O papel de eta'), JSON.stringify(cartoes));
  assert.deepEqual(cartoes.filter((titulo) => titulo.includes('\\')), []);
});

test('impressão: o slide com data-pdf="passos" sai em uma cópia por estado, com a matemática revelada até o estado', async (t) => {
  const { pagina } = await abrirAula(navegador, `${servidor.endereco}/matematica.html`);
  t.after(() => pagina.close());
  const paginas = await pagina.evaluate(() => {
    window.AulaUSP.prepararImpressao();
    const revelados = (slide) => slide.querySelectorAll('.katex [data-passo][data-revelado]').length;
    return [...document.querySelectorAll('section[id^="passo-a-passo"]')].map((slide) => `${slide.id}:${revelados(slide)}`);
  });
  assert.deepEqual(paginas, ['passo-a-passo-impressao-0:0', 'passo-a-passo-impressao-1:2', 'passo-a-passo-impressao-2:4', 'passo-a-passo:4']);
});

test('TeX inválido e comando não permitido viram alerta no lugar, com a mensagem no console; cor em TeX não chega ao slide', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/tex/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medida = await pagina.evaluate(() => ({
    alertas: [...document.querySelectorAll('.tex-invalido')].map((alerta) => ({
      texto: `${alerta.nodeName} ${alerta.textContent}`,
      campo: [getComputedStyle(alerta).backgroundColor, getComputedStyle(alerta).color],
    })),
    cores: [...new Set([...document.querySelectorAll('#sem-cor .katex-html *')].map((elemento) => getComputedStyle(elemento).color))],
    pre: document.querySelector('#sem-cor pre').textContent,
  }));
  assert.deepEqual(medida.alertas.map((alerta) => alerta.texto),
    ['SPAN \\(\\frac{a}{\\)', 'SPAN \\(\\href{https://usp.br}{usp}\\)', 'DIV \\[ \\naoexiste \\]']);
  for (const alerta of medida.alertas) assert.deepEqual(alerta.campo, [TINTA, PAPEL]);
  assert.deepEqual(medida.cores, [TINTA]);
  assert.equal(medida.pre, '\\(nao e matematica\\)');
  assert.equal(erros.length, 3);
  assert.ok(erros.every((erro) => erro.startsWith('Aula USP: TeX inválido em ')), JSON.stringify(erros));
  assert.match(erros[1], /comando não permitido no TeX$/);
});
