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
  // aula-usp-graficos.js NÃO tem meta na spec 11.2 (ela só nomeia os três acima — Fato 5 do plano da
  // Tarefa 3): satélite novo da fase 2a, medido aqui, não copiado de lá. Isto é achado a relatar
  // para o autor decidir se a spec ganha uma linha — esta tarefa não edita a spec.
  //
  // Medido (dist/manifesto.json, aula-usp dist desta tarefa): 94203 bytes = 92,0 KB — as três libs
  // do d3 que componentes/graficos.js consome (d3-scale, d3-shape, d3-array), minificadas juntas num
  // satélite só (build/bundle.mjs).
  //
  // Meta: 120 KB, 28,0 KB de folga (30,4 %) sobre o medido. A conta segue a folga dos dois arquivos
  // cuja meta já tem uma razão medida nesta mesma tabela — aula-usp.js (700 KB sobre 558,5 KB
  // medidos na correção final da 2a = 25,3 %) e aula-usp-tex.js (800 KB sobre 622,8 KB = 28,5 %) —
  // não a de aula-usp-codigo.js (600 KB sobre 112,4 KB = 433,8 %), que é um outlier e não uma
  // proporção a repetir.
  'aula-usp-graficos.js': 120 * KB,
  // aula-usp-diagramas.js também não tem meta na spec 11.2 (fase 2b, mesmo achado de cima). Medido
  // (dist/manifesto.json, aula-usp dist da fase 2b): 819116 bytes = 799,9 KB — o dist/index.js de
  // @hpcc-js/wasm-graphviz 1.29.1 com o WASM dentro, em base64, que o esbuild só reescreve de leve
  // (o arquivo do pacote tem 819284 bytes). É o maior satélite, e o tamanho é o do WASM: não há o
  // que cortar sem trocar de Graphviz.
  //
  // Meta: 1024 KB, 224,1 KB de folga (28,0 %) sobre o medido — a mesma proporção de aula-usp-tex.js
  // e aula-usp-graficos.js, acima. A spec 14 põe o tamanho do script entre os modos de bloqueio no
  // artifact; a medição da spec 14 (docs/superpowers/revisoes/2026-09-28-aula-usp-f2b-spec14.md)
  // serviu um script de 819 KB, e ele compilou — acima disso, ninguém mediu.
  'aula-usp-diagramas.js': 1024 * KB,
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
