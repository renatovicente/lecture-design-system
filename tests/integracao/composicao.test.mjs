// Composição (spec 9.2 e 9.3): as cinco regras medidas no Chrome, sobre o espécime e sobre mutações.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarChrome, servirPasta, RAIZ } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

// Dentro da página: importa o validador pelo caminho do servidor e roda o grupo de composição.
const RODAR = async (contrato) => {
  const { validar } = await import('/_aula-usp/validador/validar.js');
  const { regras } = await import('/_aula-usp/validador/regras/composicao.js');
  return validar(document, { contrato, regras, grupo: 'composicao', janela: window })
    .map((achado) => ({ regra: achado.regra, slide: achado.slide, mensagem: achado.mensagem }));
};

const navegador = await iniciarChrome();
const sitio = await servirPasta('especime');

test.after(async () => {
  await navegador.close();
  await sitio.fechar();
});

async function medir(arquivo, mutacao) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.goto(`${sitio.endereco}/${arquivo}?folha`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  await pagina.evaluate(() => document.fonts.ready);
  if (mutacao) await pagina.evaluate(mutacao);
  const achados = await pagina.evaluate(RODAR, contrato);
  await pagina.close();
  return achados;
}

test('os seis decks do espécime não têm problema de composição', async () => {
  for (const arquivo of ['index.html', 'componentes.html', 'matematica.html', 'codigo.html', 'ifusp.html', 'muitos-blocos.html']) {
    const achados = await medir(arquivo);
    assert.deepEqual(achados, [], `${arquivo}: ${achados.map((a) => a.mensagem).join(' / ')}`);
  }
});

test('elemento que passa da zona de conteúdo acusa transbordo', async () => {
  const achados = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.width = '2000px';
  });
  assert.equal(achados[0].regra, 'composicao.transbordo');
  assert.match(achados[0].mensagem, /^<p> passa \d+ px da zona de conteúdo\.$/);
});

// A lição do marco 3c: a caixa do <pre> não muda quando uma linha é larga demais.
test('código mais largo que o bloco acusa, mesmo sem mudar a caixa', async () => {
  const achados = await medir('codigo.html', () => {
    const linha = document.querySelector('.slide .area pre .linha');
    linha.textContent = `x = "${'a'.repeat(200)}"`;
  });
  assert.ok(achados.some((achado) => /px de conteúdo além da largura/.test(achado.mensagem)), JSON.stringify(achados));
});

test('título que passa de duas linhas acusa', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area h2').textContent = 'Um título muito comprido '.repeat(6);
  });
  assert.equal(achados[0].regra, 'composicao.linhas-titulo');
  assert.match(achados[0].mensagem, /título renderizado em 3 linhas \(máx\. 2\)\./);
});

test('texto abaixo do mínimo do seu papel acusa, e o papel vem do seletor mais específico', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area p').style.fontSize = '18px';
  });
  assert.equal(achados[0].regra, 'composicao.tamanho-minimo');
  assert.match(achados[0].mensagem, /<p> em 18 px, abaixo do mínimo de 24 px do papel leitura\./);
});

// O roteiro da capa renderiza a 14 px e casa "li" (leitura, 24) e ".roteiro li" (rotulo, 14):
// sem precedência por especificidade, todo deck do espécime acusaria.
test('o roteiro da capa é rótulo, não leitura', async () => {
  const achados = await medir('index.html');
  assert.deepEqual(achados.filter((achado) => /roteiro|li /.test(achado.mensagem)), []);
});

test('azul pequeno e texto sobre amarelo fora da tinta acusam', async () => {
  const azul = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.color = '#1094AB';
    p.style.fontSize = '24px';
  });
  assert.ok(azul.some((achado) => achado.regra === 'composicao.azul-pequeno'), JSON.stringify(azul));

  const amarelo = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.background = '#FCB421';
    p.style.color = '#FFFFFF';
  });
  assert.ok(amarelo.some((achado) => achado.regra === 'composicao.texto-no-amarelo'), JSON.stringify(amarelo));
});
