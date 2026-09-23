// Blocos de corpo no Chrome, sobre especime/componentes.html servido por `aula-usp servir` (spec 4.3, 7.1 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula, classesForaDoContrato, perto, TINTA, PAPEL, AMARELO, LINHA, TRANSPARENTE } from './utilitarios.mjs';

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

// Uma página em modo folha serve aos testes de geometria: nela os passos aparecem revelados.
const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/componentes.html?folha`));

test('espécime de componentes: 17 slides montados sem erros, e toda classe do documento está no contrato', async () => {
  const { pagina, erros } = await folha();
  const slides = await pagina.evaluate(() => document.querySelectorAll('section.slide').length);
  assert.equal(slides, 17);
  assert.deepEqual(erros, []);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('campos: destaque em amarelo, quadro com contorno de 2 px e alerta em tinta, com o rótulo vindo de data-rotulo', async () => {
  const { pagina } = await folha();
  const [destaque, quadro, alerta] = await pagina.evaluate(() => ['aside.destaque', 'aside.quadro', 'aside.alerta'].map((seletor) => {
    const campo = document.querySelector(`#destaque-quadro-alerta ${seletor}`);
    const estilo = getComputedStyle(campo);
    const rotulo = getComputedStyle(campo, '::before');
    return {
      fundo: estilo.backgroundColor,
      cor: estilo.color,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: [estilo.paddingTop, estilo.paddingRight, estilo.paddingBottom, estilo.paddingLeft].join(' '),
      rotulo: rotulo.content,
      fonteDoRotulo: `${rotulo.fontWeight} ${rotulo.fontSize} ${rotulo.fontFamily}`,
      caixaDoRotulo: `${rotulo.display} ${rotulo.textTransform} ${rotulo.marginBottom}`,
    };
  }));
  assert.deepEqual([destaque.fundo, destaque.cor], [AMARELO, TINTA]);
  assert.deepEqual([quadro.fundo, quadro.borda], [TRANSPARENTE, '2px solid']);
  assert.deepEqual([alerta.fundo, alerta.cor], [TINTA, PAPEL]);
  for (const campo of [destaque, quadro, alerta]) assert.equal(campo.padding, '16px 24px 16px 24px');
  assert.equal(destaque.rotulo, '"Definição"');
  assert.equal(alerta.rotulo, '"Cuidado"');
  assert.equal(quadro.rotulo, 'none', 'sem data-rotulo, o campo não ganha rótulo');
  assert.equal(destaque.fonteDoRotulo, '700 14px "Geist Mono", ui-monospace, monospace');
  assert.equal(destaque.caixaDoRotulo, 'block uppercase 8px');
});

test('exercício: enunciado com a forma do quadro e o rótulo "Exercício"; resposta com o rótulo "Resposta", 24 px abaixo', async () => {
  const { pagina } = await folha();
  const [enunciado, resposta] = await pagina.evaluate(() => ['.enunciado', '.resposta'].map((seletor) => {
    const parte = document.querySelector(`#exercicio ${seletor}`);
    const estilo = getComputedStyle(parte);
    const caixa = parte.getBoundingClientRect();
    return {
      rotulo: getComputedStyle(parte, '::before').content,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: `${estilo.paddingTop} ${estilo.paddingLeft}`,
      topo: caixa.top,
      base: caixa.bottom,
    };
  }));
  assert.deepEqual([enunciado.rotulo, enunciado.borda, enunciado.padding], ['"Exercício"', '2px solid', '16px 24px']);
  assert.deepEqual([resposta.rotulo, resposta.borda, resposta.padding], ['"Resposta"', '0px none', '0px 0px']);
  perto(resposta.topo - enunciado.base, 24, 'espaço entre enunciado e resposta');
});

test('listas: marcador quadrado de 8 px com recuo pendente; passos com numeral de 40 px na linha de base do texto, sob régua de 2 px', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const slide = document.getElementById('marcadores-e-passos');
    const esquerda = slide.getBoundingClientRect().left;
    const inicioDasLinhas = (item) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(item);
      return [...faixa.getClientRects()].map((linha) => linha.left - esquerda);
    };
    const linhaDeBase = (item) => {
      const sonda = document.createElement('span');
      sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      item.prepend(sonda);
      const y = sonda.getBoundingClientRect().top - item.getBoundingClientRect().top;
      sonda.remove();
      return y;
    };
    const itens = [...slide.querySelectorAll('ul > li')];
    const passos = [...slide.querySelectorAll('ol.passos > li')];
    const sintese = [...document.querySelectorAll('[data-layout="encerramento"] ol.sintese > li')];
    const marcador = getComputedStyle(itens[0], '::before');
    const numeral = getComputedStyle(passos[0], '::before');
    return {
      marcador: `${marcador.width} ${marcador.height} ${marcador.backgroundColor}`,
      linhasDoItemLongo: inicioDasLinhas(itens[4]),
      espacoEntreItens: itens[1].getBoundingClientRect().top - itens[0].getBoundingClientRect().bottom,
      numeral: `${numeral.fontWeight} ${numeral.fontSize} ${numeral.fontFamily}`,
      reguas: passos.map((passo) => `${getComputedStyle(passo).borderTopWidth} ${getComputedStyle(passo).borderTopColor}`),
      baseDoPrimeiroPasso: linhaDeBase(passos[0]),
      linhasDoPassoLongo: inicioDasLinhas(passos[4]),
      espacoEntrePassos: passos[1].getBoundingClientRect().top - passos[0].getBoundingClientRect().bottom,
      sintese: sintese.map((item) => `${getComputedStyle(item).borderTopWidth} ${getComputedStyle(item, '::before').fontSize}`),
    };
  });
  assert.equal(medida.marcador, `8px 8px ${TINTA}`);
  assert.deepEqual(medida.linhasDoItemLongo, [88, 88], 'as duas linhas do item começam 24 px depois da margem');
  perto(medida.espacoEntreItens, 8, 'espaço entre itens');
  assert.equal(medida.numeral, '600 40px Geist, system-ui, sans-serif');
  assert.deepEqual(medida.reguas, Array(5).fill(`2px ${TINTA}`));
  // régua (2) + padding (16) + a parte do numeral acima da linha de base (34, pelas métricas da Geist)
  assert.ok(Math.abs(medida.baseDoPrimeiroPasso - 52) <= 1, `linha de base do primeiro passo em ${medida.baseDoPrimeiroPasso}`);
  assert.deepEqual(medida.linhasDoPassoLongo, [716, 716], 'as duas linhas do passo começam 64 px depois da coluna');
  perto(medida.espacoEntrePassos, 24, 'espaço entre passos');
  assert.deepEqual(medida.sintese, Array(3).fill('2px 40px'), 'ol.sintese tem a forma de ol.passos');
});

test('texto em linha: code em Geist Mono a 0,88em; sub e sup a 0,8em, sem mudar a altura das linhas', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const [, comCodigo, comIndices] = document.querySelectorAll('#texto-em-linha .area > p');
    const codigo = getComputedStyle(comCodigo.querySelector('code'));
    return {
      codigo: `${codigo.fontSize} ${codigo.fontFamily}`,
      indices: [getComputedStyle(comIndices.querySelector('sub')).fontSize, getComputedStyle(comIndices.querySelector('sup')).fontSize],
      alturas: [comCodigo.getBoundingClientRect().height, comIndices.getBoundingClientRect().height],
    };
  });
  assert.equal(medida.codigo, '21.12px "Geist Mono", ui-monospace, monospace');
  assert.deepEqual(medida.indices, ['19.2px', '19.2px']);
  for (const altura of medida.alturas) perto(altura, 2 * 24 * 1.42, 'parágrafo de duas linhas de leitura');
});

test('a resposta do exercício é passo no palco e sai revelada na impressão', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/componentes.html#exercicio`);
  t.after(() => pagina.close());
  const visibilidade = () => pagina.evaluate(() => getComputedStyle(document.querySelector('#exercicio .resposta')).visibility);
  assert.equal(await visibilidade(), 'hidden');
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.equal(await visibilidade(), 'visible');
  assert.deepEqual(erros, []);
});

test('tabela: réguas de 4 px no topo e na base, de 2 px sob o cabeçalho e de 1 px entre linhas; números à direita, alinhados pela borda', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const tabela = document.querySelector('#tabela table');
    const estilo = getComputedStyle(tabela);
    const celula = (elemento) => {
      const e = getComputedStyle(elemento);
      return { alinhamento: e.textAlign, peso: e.fontWeight, fundo: e.backgroundColor, algarismos: e.fontVariantNumeric };
    };
    const direitaDoTexto = (elemento) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(elemento);
      return faixa.getBoundingClientRect().right;
    };
    const linhas = [...tabela.querySelectorAll('tbody tr')];
    const entreLinhas = getComputedStyle(linhas[1].children[1]);
    return {
      largura: tabela.getBoundingClientRect().width,
      reguas: [estilo.borderTopWidth, estilo.borderBottomWidth, estilo.borderTopColor, estilo.borderBottomColor],
      sobCabecalho: getComputedStyle(tabela.querySelector('thead th')).borderBottomWidth,
      entreLinhas: `${entreLinhas.borderTopWidth} ${entreLinhas.borderTopColor}`,
      cabecalho: [...tabela.querySelectorAll('thead th')].map((th) => `${celula(th).alinhamento} ${celula(th).peso}`),
      primeiraLinha: [...linhas[0].children].map(celula),
      bordasDasEpocas: new Set(linhas.map((linha) => direitaDoTexto(linha.children[1]).toFixed(2))).size,
      linhaEmDestaque: [...tabela.querySelector('tr.destaque').children].map((elemento) => celula(elemento).fundo),
      celulaEmDestaque: celula(tabela.querySelector('td.destaque')).fundo,
      naColuna: [document.querySelector('#tabela-na-coluna table').getBoundingClientRect().width, document.querySelectorAll('#tabela-na-coluna .colunas > div')[1].getBoundingClientRect().width],
      cabecalhoNaColuna: [...document.querySelectorAll('#tabela-na-coluna thead th')].map((th) => getComputedStyle(th).textAlign),
    };
  });
  assert.equal(medida.largura, 1152);
  assert.deepEqual(medida.reguas, ['4px', '4px', TINTA, TINTA]);
  assert.equal(medida.sobCabecalho, '2px');
  assert.equal(medida.entreLinhas, `1px ${LINHA}`);
  assert.deepEqual(medida.cabecalho, ['left 600', 'right 600', 'right 600', 'right 600', 'right 600', 'right 600']);
  const [modelo, ...numeros] = medida.primeiraLinha;
  assert.deepEqual([modelo.alinhamento, modelo.peso], ['left', '400']);
  for (const numero of numeros) assert.deepEqual([numero.alinhamento, numero.algarismos, numero.fundo], ['right', 'tabular-nums', TRANSPARENTE]);
  assert.equal(medida.bordasDasEpocas, 1, 'os números da coluna terminam na mesma borda');
  assert.deepEqual(medida.linhaEmDestaque, Array(6).fill(AMARELO));
  assert.equal(medida.celulaEmDestaque, AMARELO);
  assert.equal(medida.naColuna[0], medida.naColuna[1], 'numa coluna, a tabela ocupa a largura da coluna');
  assert.deepEqual(medida.cabecalhoNaColuna, ['right', 'left'], 'coluna com "diverge" não alinha o cabeçalho à direita');
});

test('figuras: imagem pequena sem ampliação, foto grande contida na zona, SVG na largura da coluna, legenda 16 px abaixo', async () => {
  const { pagina } = await folha();
  const { pequena, foto, corpo } = await pagina.evaluate(() => {
    const caixa = (elemento) => {
      const slide = elemento.closest('section').getBoundingClientRect();
      const r = elemento.getBoundingClientRect();
      return { x: r.left - slide.left, largura: r.width, altura: r.height, topo: r.top - slide.top, base: r.bottom - slide.top };
    };
    const figura = (id) => {
      const slide = document.getElementById(id);
      const midia = slide.querySelector('figure > img, figure > svg');
      const legenda = slide.querySelector('figcaption');
      return {
        midia: caixa(midia),
        legenda: caixa(legenda),
        estiloDaLegenda: `${getComputedStyle(legenda).fontSize} ${getComputedStyle(legenda).color}`,
        filtro: getComputedStyle(midia).filter,
      };
    };
    return {
      pequena: figura('imagem-pequena'),
      foto: figura('foto-em-cinza'),
      corpo: { ...figura('figura-no-corpo'), coluna: caixa(document.querySelectorAll('#figura-no-corpo .colunas > div')[1]) },
    };
  });
  assert.deepEqual([pequena.midia.x, pequena.midia.largura, pequena.midia.altura], [64, 320, 180]);
  perto(pequena.legenda.topo - pequena.midia.base, 16, 'legenda da imagem pequena');
  assert.equal(pequena.estiloDaLegenda, '18px rgb(102, 102, 102)');
  assert.equal(foto.filtro, 'grayscale(1)');
  assert.equal(foto.midia.x, 64);
  assert.ok(Math.abs(foto.midia.largura / foto.midia.altura - 1.5) < 0.01, 'a foto mantém a proporção de 3 por 2');
  perto(foto.legenda.base, 652, 'a foto ocupa a zona até a base do conteúdo');
  assert.deepEqual([corpo.midia.x, corpo.midia.largura], [corpo.coluna.x, corpo.coluna.largura]);
  perto(corpo.midia.altura, (corpo.coluna.largura * 320) / 760, 'altura do SVG pela proporção do viewBox');
  perto(corpo.legenda.topo - corpo.midia.base, 16, 'legenda do SVG');
});

test('figuras extremas: cada mídia cabe pela dimensão que a limita, sem distorcer, alinhada à esquerda e com a legenda colada', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/figuras/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medidas = await pagina.evaluate(() => [...document.querySelectorAll('section[data-layout="figura"]')].map((slide) => {
    const s = slide.getBoundingClientRect();
    const midia = slide.querySelector('figure > img, figure > svg');
    const legenda = slide.querySelector('figcaption');
    const r = midia.getBoundingClientRect();
    const viewBox = midia.getAttribute('viewBox')?.split(' ').map(Number);
    return {
      id: slide.id,
      x: r.left - s.left,
      largura: r.width,
      altura: r.height,
      base: r.bottom - s.top,
      proporcao: viewBox ? viewBox[2] / viewBox[3] : midia.naturalWidth / midia.naturalHeight,
      topoDaLegenda: legenda ? legenda.getBoundingClientRect().top - s.top : null,
      baseDaLegenda: legenda ? legenda.getBoundingClientRect().bottom - s.top : null,
    };
  }));
  assert.deepEqual(erros, []);
  assert.equal(medidas.length, 4);
  for (const m of medidas) {
    assert.equal(m.x, 64, `${m.id}: alinhada à esquerda`);
    assert.ok(Math.abs(m.largura / m.altura - m.proporcao) < 0.01, `${m.id}: proporção ${m.largura / m.altura} em vez de ${m.proporcao}`);
    assert.ok(m.largura <= 1152.5, `${m.id}: largura ${m.largura}`);
    if (m.topoDaLegenda !== null) perto(m.topoDaLegenda - m.base, 16, `${m.id}: legenda colada`);
  }
  const porId = Object.fromEntries(medidas.map((m) => [m.id, m]));
  perto(porId['img-larga'].largura, 1152, 'a imagem larga é limitada pela largura');
  perto(porId['sem-legenda'].base, 652, 'sem legenda, a imagem vai até a base da zona');
  perto(porId['svg-alto'].baseDaLegenda, 652, 'o SVG alto é limitado pela altura');
  perto(porId['svg-minusculo'].baseDaLegenda, 652, 'o SVG de viewBox minúsculo é ampliado até a zona');
});
