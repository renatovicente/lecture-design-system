import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { rotularExercicios } from '../../montar/corpo.js';
import { rotulosPara } from '../../motor/rotulos.js';

const aula = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document;

test('rotularExercicios dá ao enunciado e à resposta os rótulos do idioma da aula', () => {
  for (const [lang, exercicio, resposta] of [['pt-BR', 'Exercício', 'Resposta'], ['en', 'Exercise', 'Answer']]) {
    const doc = aula('<section><div class="exercicio"><div class="enunciado">Quanto?</div><div class="resposta">Dois.</div></div><div class="enunciado">Fora do exercício.</div></section>');
    rotularExercicios(doc, rotulosPara(lang));
    const rotulos = [...doc.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo'));
    assert.deepEqual(rotulos, [exercicio, resposta, null], lang);
  }
});
