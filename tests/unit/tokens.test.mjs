import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lerTokens, simplificar, gerarCss, gerarJs, contraste } from '../../build/tokens.mjs';

const tokens = await lerTokens();
const s = simplificar(tokens);

test('cores têm os valores exatos da spec (4.2)', () => {
  assert.deepEqual(s.cor, {
    papel: '#FFFFFF', tinta: '#0A0A0A', cinza: '#666666',
    linha: '#D9D9D9', azul: '#1094AB', amarelo: '#FCB421',
  });
});

test('componentes sRGB coincidem com o hexadecimal', () => {
  for (const [nome, t] of Object.entries(tokens.cor)) {
    if (nome.startsWith('$')) continue;
    const esperado = [1, 3, 5].map((i) => parseInt(t.$value.hex.slice(i, i + 2), 16) / 255);
    t.$value.components.forEach((c, i) => assert.ok(Math.abs(c - esperado[i]) < 0.001, `${nome}[${i}]`));
  }
});

test('contrastes citados na spec (4.2)', () => {
  const c = (a, b) => Math.round(contraste(a, b) * 10) / 10;
  assert.equal(c('#0A0A0A', '#FFFFFF'), 19.8);
  assert.equal(c('#666666', '#FFFFFF'), 5.7);
  assert.equal(c('#1094AB', '#FFFFFF'), 3.6);
  assert.equal(c('#FCB421', '#FFFFFF'), 1.8);
  assert.equal(c('#0A0A0A', '#FCB421'), 11.0);
});

test('tipografia da tabela 4.3', () => {
  const t = s.tipo;
  const linha = (n) => [t[n].tamanho, t[n].entrelinha, t[n].peso];
  assert.deepEqual(linha('capa'), [96, 1, 600]);
  assert.deepEqual(linha('abertura'), [84, 1, 600]);
  assert.deepEqual(linha('afirmacao'), [64, 1.08, 600]);
  assert.deepEqual(linha('titulo'), [44, 1.08, 600]);
  assert.deepEqual(linha('numeral'), [40, 1, 600]);
  assert.deepEqual(linha('lide'), [32, 1.25, 400]);
  assert.deepEqual(linha('leitura'), [24, 1.42, 400]);
  assert.deepEqual(linha('codigo'), [20, 1.45, 400]);
  assert.deepEqual(linha('legenda'), [18, 1.35, 400]);
  assert.deepEqual(linha('rotulo'), [14, 1.2, 700]);
  assert.deepEqual(linha('rodape'), [14, 1.2, 400]);
  assert.deepEqual(linha('rotuloGrande'), [20, 1.2, 700]);
  assert.deepEqual(linha('marcaUsp'), [20, 1.15, 600]);
  assert.equal(t.capa.tracking, -3.36);
  assert.equal(t.abertura.tracking, -2.52);
  assert.equal(t.titulo.tracking, -1.32);
  assert.equal(t.rotulo.tracking, 2.24);
  assert.deepEqual(t.titulo.familia, ['Geist', 'system-ui', 'sans-serif']);
  assert.deepEqual(t.codigo.familia, ['Geist Mono', 'ui-monospace', 'monospace']);
  assert.deepEqual(t.marcaUsp.familia, ['Open Sans', 'sans-serif']);
  assert.equal(t.rotulo.caixa, 'alta');
  assert.equal(t.rodape.caixa, 'alta');
  assert.equal(t.leitura.pesoEnfase, 600);
  assert.equal(t.codigo.pesoEnfase, 600);
});

test('grid, zonas, espaços, réguas e mínimos (4.3 e 4.4)', () => {
  assert.deepEqual(s.palco, { largura: 1280, altura: 720, margem: 64, coluna: 74, calha: 24, util: 1152 });
  assert.equal(12 * s.palco.coluna + 11 * s.palco.calha, s.palco.util);
  assert.equal(s.palco.util + 2 * s.palco.margem, s.palco.largura);
  assert.deepEqual(s.zona, {
    cabecalhoTopo: 40, cabecalhoBase: 64, tituloTopo: 96, conteudoBase: 652,
    rodapeBase: 688, marcaBase: 680, capaConteudoBase: 520, aberturaTituloTopoMin: 360,
  });
  assert.deepEqual(Object.values(s.espaco), [8, 16, 24, 32, 48, 64, 96]);
  assert.deepEqual(s.regua, { fina: 1, normal: 2, forte: 4 });
  assert.deepEqual(s.minimo, { leitura: 24, codigo: 20, legenda: 18, rotulo: 14 });
  assert.deepEqual(s.contraste, { azulTextoMinimo: 32, amareloLinhaMinima: 4 });
  assert.deepEqual(s.mapa, {
    quadradoCabecalho: 16, espacoCabecalho: 8, quadradoAberturaMax: 160, calhaAbertura: 24,
    quadradoCapa: 24, folgaRoteiroCapa: 8, numeroProporcao: 0.55, faixaBlocoNDeM: 220,
  });
  // A folga do roteiro da capa (spec 5.4, 1.0.1) é um passo da escala de espaço.
  assert.ok(Object.values(s.espaco).includes(s.mapa.folgaRoteiroCapa));
  assert.deepEqual(s.marca, { uspAltura: 56 });
});

// Canto do vídeo (spec 4.4, 1.0.1). Os números da spec entram aqui como constantes, com a derivação
// ao lado: 334 é a largura das colunas 10 a 12 mais a margem direita (a coluna 10 começa em
// 64 + 9 × (74 + 24) = 946), e 188 é 334 × 9/16 arredondado para cima. O JSON não traz nenhum dos
// dois: build/tokens.mjs os deriva de video.colunas, video.proporcao e do palco.
const VIDEO_DA_SPEC = { largura: 334, altura: 188, esquerda: 946, topo: 532 };
test('canto do vídeo: 334 × 188, encostado nas bordas direita e de baixo, derivado e não digitado', () => {
  const { colunas, proporcao, aberturaTopoMin, ...medidas } = s.video;
  assert.deepEqual(medidas, VIDEO_DA_SPEC);
  assert.equal(colunas, 3);
  assert.equal(aberturaTopoMin % 8, 0, 'o topo mínimo da abertura com vídeo sai da escala de 8');
  // A borda esquerda do vídeo é o início da coluna 10 (a primeira das `colunas` da direita).
  assert.equal(s.video.esquerda, s.palco.margem + (12 - colunas) * (s.palco.coluna + s.palco.calha));
  assert.equal(s.video.esquerda + s.video.largura, s.palco.largura);
  assert.equal(s.video.topo + s.video.altura, s.palco.altura);
  assert.ok(s.video.altura / s.video.largura >= proporcao, 'o retângulo não cabe um vídeo 16:9');
  for (const nome of Object.keys(VIDEO_DA_SPEC)) {
    assert.ok(!Object.hasOwn(tokens.video, nome), `video.${nome} está digitado no JSON; tem de ser derivado`);
  }
  // A derivação acompanha o dado: com duas colunas, o canto encolhe junto.
  const duas = structuredClone(tokens);
  duas.video.colunas.$value = 2;
  assert.deepEqual(simplificar(duas).video.largura, 2 * 74 + 24 + 64);
  // E um derivado digitado no JSON é recusado, em vez de competir com a conta.
  const digitado = structuredClone(tokens);
  digitado.video.largura = { $type: 'dimension', $value: { value: 334, unit: 'px' } };
  assert.throws(() => simplificar(digitado), /derivado/);
});

test('CSS gerado tem as variáveis esperadas e é determinístico', () => {
  const css = gerarCss(tokens);
  assert.equal(css, gerarCss(tokens));
  for (const v of [
    '--cor-azul: #1094AB;', '--tipo-titulo-tamanho: 44px;', '--tipo-titulo-tracking: -1.32px;',
    '--tipo-codigo-familia: "Geist Mono", ui-monospace, monospace;', '--tipo-rotulo-caixa: uppercase;',
    '--tipo-leitura-peso-enfase: 600;', '--palco-util: 1152px;', '--espaco-7: 96px;',
    '--zona-conteudo-base: 652px;', '--mapa-quadrado-cabecalho: 16px;', '--mapa-numero-proporcao: 0.55;',
    '--contraste-azul-texto-minimo: 32px;', '--mapa-faixa-bloco-n-de-m: 220px;',
    '--video-largura: 334px;', '--video-altura: 188px;', '--video-esquerda: 946px;', '--video-topo: 532px;',
  ]) assert.ok(css.includes(v), `faltou ${v}`);
});

test('arquivos gerados no repositório estão atualizados', async () => {
  const raiz = new URL('../../', import.meta.url);
  assert.equal(await readFile(new URL('estilos/tokens.css', raiz), 'utf8'), gerarCss(tokens));
  assert.equal(await readFile(new URL('tokens/tokens.js', raiz), 'utf8'), gerarJs(tokens));
});

test('tokens.js importável coincide com simplificar', async () => {
  const mod = await import('../../tokens/tokens.js');
  assert.deepEqual(mod.tokens, s);
  assert.equal(mod.default, mod.tokens);
});

test('alias de cor em $value gera o hex resolvido no CSS (F4)', () => {
  const memoria = {
    cor: {
      $type: 'color',
      tinta: { $value: { colorSpace: 'srgb', components: [0.0392, 0.0392, 0.0392], hex: '#0A0A0A' } },
      texto: { $value: '{cor.tinta}' },
    },
  };
  assert.equal(simplificar(memoria).cor.texto, '#0A0A0A');
  assert.match(gerarCss(memoria), /--cor-texto: #0A0A0A;/);
});

test('token $type number gera valor sem unidade no CSS (F4)', () => {
  const memoria = { mapa: { proporcao: { $type: 'number', $value: 0.5 } } };
  assert.equal(simplificar(memoria).mapa.proporcao, 0.5);
  const css = gerarCss(memoria);
  assert.match(css, /--mapa-proporcao: 0\.5;/);
  assert.ok(!css.includes('0.5px'), 'number não deve ganhar sufixo px');
});

test('referência inexistente em $value lança erro claro (F4)', () => {
  const memoria = { cor: { $type: 'color', texto: { $value: '{cor.inexistente}' } } };
  assert.throws(() => simplificar(memoria), /referência não encontrada/);
});

test('unidade de dimension fora de px lança erro (F4)', () => {
  const memoria = { espaco: { $type: 'dimension', base: { $value: { value: 4, unit: 'rem' } } } };
  assert.throws(() => simplificar(memoria), /unidade não suportada: rem/);
});

test('$type desconhecido lança erro (F4)', () => {
  const memoria = { estranho: { $type: 'esquisito', valor: { $value: 42 } } };
  assert.throws(() => simplificar(memoria), /tipo não suportado/);
});
