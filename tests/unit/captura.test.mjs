// A captura automática (build/captura.mjs, spec 7.2) nas duas partes que não precisam de Chrome: quem
// é fotografado e como a foto entra no HTML construído. A foto em si, e o PDF, são de
// tests/integracao/captura.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { alvosDeCaptura, embutirCapturas, CAPTURA_MS_PADRAO } from '../../build/captura.mjs';
import { demosDosScripts } from '../../build/carregar.mjs';
import { validar } from '../../validador/validar.js';
import { regras as carga } from '../../validador/regras/carga.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));

const DECK = `<!DOCTYPE html><html lang="pt-BR"><head><title>T</title></head><body>
<section data-layout="demo" id="com-imagem"><h2>A</h2><div class="demo" data-demo="a"><img class="estatico" alt="x" src="data:image/png;base64,AA=="></div></section>
<section data-layout="demo" id="com-capturar"><h2>B</h2><div class="demo" data-demo="b"></div></section>
<section data-layout="demo" id="sem-nada"><h2>C</h2><div class="demo" data-demo="c" data-captura-ms="250"></div></section>
<section data-layout="demo" id="sem-registro"><h2>D</h2><div class="demo" data-demo="d"></div></section>
<section data-layout="demo" id="outra-sem-nada"><h2>E</h2><div class="demo" data-demo="e"></div></section>
<script>
AulaUSP.demo('a', { montar() {} });
AulaUSP.demo('b', { montar() {}, capturar() { return 'data:,'; } });
AulaUSP.demo('c', { montar() {} });
AulaUSP.demo('e', { montar() {} });
</script>
</body></html>`;

function deck() {
  const { document } = parseHTML(DECK);
  return { document, recursos: { demos: demosDosScripts(document) } };
}

test('alvos: só as demos registradas sem img.estatico e sem capturar(), com data-captura-ms ou o padrão da spec', () => {
  const { document, recursos } = deck();
  const alvos = alvosDeCaptura(document, recursos);
  assert.deepEqual(alvos.map(({ indice, nome, ms }) => ({ indice, nome, ms })), [
    { indice: 2, nome: 'c', ms: 250 },
    { indice: 4, nome: 'e', ms: CAPTURA_MS_PADRAO },
  ]);
  assert.equal(CAPTURA_MS_PADRAO, 3000, 'spec 7.2: "padrão 3000 ms"');
});

// O contrato entre a captura e a regra (plano da 2c, tarefas 3 e 4): o build fotografa EXATAMENTE as
// demos que recursos.demo-sem-estatico acusa quando ninguém fotografa (fase 1). As duas pontas usam
// validador/regras/carga.js:demoSemImagem; se uma delas passar a decidir sozinha, isto fica vermelho.
test('os alvos da captura são exatamente as demos que recursos.demo-sem-estatico acusa sem captura', () => {
  const { document, recursos } = deck();
  const regra = carga.filter(({ nome }) => nome === 'recursos.demo-sem-estatico');
  const acusadas = validar(document, { contrato, regras: regra, grupo: 'carga', recursos, fase: 1 }).map((achado) => achado.id);
  const alvos = alvosDeCaptura(document, recursos).map(({ elemento }) => elemento.closest('section').id);
  assert.deepEqual(acusadas, ['sem-nada', 'outra-sem-nada']);
  assert.deepEqual(alvos, acusadas);
});

test('embutirCapturas põe a foto como primeiro filho da div.demo, com o alt no idioma da aula, e não mexe em mais nada', () => {
  const original = `<!DOCTYPE html>\n${parseHTML(DECK).document.documentElement.outerHTML}\n`;
  assert.equal(embutirCapturas(original, new Map()), original, 'sem foto, o HTML sai byte a byte igual');
  const uri = 'data:image/png;base64,iVBORw0KGgo=';
  const novo = embutirCapturas(original, new Map([[2, uri]]));
  const { document } = parseHTML(novo);
  const demo = document.querySelectorAll('section div.demo[data-demo]')[2];
  const foto = demo.firstElementChild;
  assert.equal(foto.nodeName, 'IMG');
  assert.equal(foto.getAttribute('class'), 'estatico');
  assert.equal(foto.getAttribute('src'), uri);
  assert.equal(foto.getAttribute('alt'), 'Demo interativa: abra o HTML');
  assert.equal(novo.replace(foto.outerHTML, ''), original, 'a única diferença é a img inserida');
  const emIngles = embutirCapturas(original.replace('lang="pt-BR"', 'lang="en"'), new Map([[2, uri]]));
  assert.match(emIngles, /alt="Interactive demo: open the HTML"/);
});
