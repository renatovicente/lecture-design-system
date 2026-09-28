// build/conferir-cdn.mjs com dublês no lugar da rede: nenhum teste aqui faz pedido de rede. O dublê
// "CDN honesta" devolve os bytes de dist/, e as variações dele são as três formas de a CDN não servir
// o que o manifesto registra — um byte a mais, um arquivo ausente, e bytes do mesmo tamanho com
// conteúdo trocado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conferirCdn } from '../../build/conferir-cdn.mjs';
import { tagFixada } from '../../build/pacotes.mjs';

const RAIZ = new URL('../../', import.meta.url);
const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', RAIZ), 'utf8'));
const nomes = Object.keys(manifesto.arquivos);

const resposta = (bytes, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});
const nomeDe = (url) => url.slice(url.lastIndexOf('/') + 1);
const bytesDe = (nome) => readFileSync(new URL(`dist/${nome}`, RAIZ));

function cdnHonesta(pedidos = []) {
  return async (url) => {
    pedidos.push(url);
    return resposta(bytesDe(nomeDe(url)));
  };
}

test('com a CDN servindo os bytes de dist/, todo arquivo do manifesto sai ok, um pedido por arquivo', async () => {
  const pedidos = [];
  const resultados = await conferirCdn({ buscar: cdnHonesta(pedidos) });
  assert.deepEqual(resultados.map(({ nome }) => nome), nomes);
  assert.deepEqual(resultados.filter(({ ok }) => !ok), []);
  assert.equal(pedidos.length, nomes.length);
  assert.ok(nomes.length > 0);
});

test('o endereço conferido de aula-usp.js é o mesmo que a tag fixada manda o navegador pedir', async () => {
  const pedidos = [];
  await conferirCdn({ buscar: cdnHonesta(pedidos) });
  const src = /src="([^"]+)"/.exec(tagFixada())[1];
  assert.ok(pedidos.includes(src), `a tag pede ${src}; a conferência pediu ${pedidos.find((url) => url.endsWith('/aula-usp.js'))}`);
});

test('um byte a mais em aula-usp-tex.js: só ele sai ok false, e o motivo diz o tamanho', async () => {
  const honesta = cdnHonesta();
  const buscar = async (url) => nomeDe(url) === 'aula-usp-tex.js'
    ? resposta(Buffer.concat([bytesDe('aula-usp-tex.js'), Buffer.from(' ')]))
    : honesta(url);
  const falhas = (await conferirCdn({ buscar })).filter(({ ok }) => !ok);
  assert.deepEqual(falhas.map(({ nome }) => nome), ['aula-usp-tex.js']);
  assert.match(falhas[0].motivo, /bytes, o manifesto registra/);
});

test('bytes do mesmo tamanho com conteúdo trocado: sai ok false pelo hash', async () => {
  const honesta = cdnHonesta();
  const buscar = async (url) => {
    if (nomeDe(url) !== 'aula-usp-motor.js') return honesta(url);
    const trocados = Buffer.from(bytesDe('aula-usp-motor.js'));
    trocados[0] ^= 1;
    return resposta(trocados);
  };
  const falhas = (await conferirCdn({ buscar })).filter(({ ok }) => !ok);
  assert.deepEqual(falhas.map(({ nome }) => nome), ['aula-usp-motor.js']);
  assert.match(falhas[0].motivo, /^hash sha384-/);
});

test('a CDN respondendo 404: todo arquivo sai ok false com motivo HTTP 404', async () => {
  const resultados = await conferirCdn({ buscar: async () => resposta(Buffer.alloc(0), 404) });
  assert.equal(resultados.length, nomes.length);
  for (const { ok, motivo } of resultados) {
    assert.equal(ok, false);
    assert.equal(motivo, 'HTTP 404');
  }
});
