// Spec 11.2: "tamanhos de dist/ medidos e registrados, com metas de 700 KB para aula-usp.js,
// 800 KB para aula-usp-tex.js e 600 KB para aula-usp-codigo.js; acima disso, o teste emite aviso."
// O "registrados" é o console.log de todos os arquivos, que roda sempre; o "acima disso" é a
// asserção, que só morde quando a folga acaba. Os três números são da spec, não escolhidos aqui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const KB = 1024;
const METAS = {
  'aula-usp.js': 700 * KB,
  'aula-usp-tex.js': 800 * KB,
  'aula-usp-codigo.js': 600 * KB,
};

test('os pacotes de dist/ cabem nas metas da spec 11.2, e todos os tamanhos ficam registrados', () => {
  const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', RAIZ), 'utf8'));
  for (const [nome, arquivo] of Object.entries(manifesto.arquivos)) {
    const meta = METAS[nome];
    const folga = meta ? ` (meta ${(meta / KB).toFixed(0)} KB, folga ${((meta - arquivo.bytes) / KB).toFixed(0)} KB)` : '';
    console.log(`    [tamanhos] ${nome.padEnd(28)} ${(arquivo.bytes / KB).toFixed(0).padStart(4)} KB${folga}`);
  }
  for (const [nome, meta] of Object.entries(METAS)) {
    const arquivo = manifesto.arquivos[nome];
    assert.ok(arquivo, `${nome} não está no manifesto — o dist/ foi gerado?`);
    assert.ok(arquivo.bytes <= meta,
      `${nome} tem ${(arquivo.bytes / KB).toFixed(0)} KB, acima da meta de ${(meta / KB).toFixed(0)} KB da spec 11.2`);
  }
});
