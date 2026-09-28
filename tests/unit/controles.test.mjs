// Controles de demo (spec 7.2, fase 2): o que é observável no DOM — classes, estado ativo e texto da
// leitura. A aparência (2 px, quadrado, Geist 600) é de composição e é medida no Chrome, em
// tests/integracao/controles.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { criarControles } from '../../componentes/controles.js';
import { instalarDemos } from '../../motor/demos.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));

// Atributos como objeto: o setAttribute do linkedom põe atributo novo na FRENTE (build/validar.mjs),
// e a ordem não é o que se testa aqui.
const atributos = (el) => Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]));

function pagina(lang = 'pt-BR') {
  const janela = parseHTML(`<!DOCTYPE html><html lang="${lang}"><body><div class="demo" data-demo="d"></div></body></html>`);
  return { document: janela.document, Event: janela.Event, raiz: janela.document.querySelector('div.demo') };
}

test('botao cria button.controle type="button", fora de ativo, e chama quem clica', () => {
  const { document, raiz, Event } = pagina();
  const cliques = [];
  const botao = criarControles(document).botao(raiz, 'somar', () => cliques.push('clique'));
  assert.equal(botao.parentNode, raiz);
  assert.equal(botao.nodeName, 'BUTTON');
  assert.deepEqual(atributos(botao), { class: 'controle', type: 'button', 'aria-pressed': 'false' });
  assert.equal(botao.textContent, 'somar');
  botao.dispatchEvent(new Event('click'));
  assert.deepEqual(cliques, ['clique']);
});

test('alternar liga e desliga o estado ativo: a classe e o aria-pressed, sempre juntos', () => {
  const { document, raiz } = pagina();
  const controles = criarControles(document);
  const botao = controles.botao(raiz, 'rodar');
  assert.equal(controles.alternar(botao), true);
  assert.deepEqual([botao.className, botao.getAttribute('aria-pressed')], ['controle ativo', 'true']);
  assert.equal(controles.alternar(botao), false);
  assert.deepEqual([botao.className, botao.getAttribute('aria-pressed')], ['controle', 'false']);
  assert.equal(controles.alternar(botao, false), false, 'estado explícito não inverte');
  assert.equal(botao.className, 'controle');
});

test('deslizante cria input.controle[type=range] com os limites, o nome acessível e o valor numérico', () => {
  const { document, raiz, Event } = pagina();
  const valores = [];
  const deslizante = criarControles(document).deslizante(raiz, { min: 0, max: 1, passo: 0.1, valor: 0.5, rotulo: 'taxa' }, (valor) => valores.push(valor));
  assert.equal(deslizante.nodeName, 'INPUT');
  assert.deepEqual(atributos(deslizante), { class: 'controle', type: 'range', min: '0', max: '1', step: '0.1', value: '0.5', 'aria-label': 'taxa' });
  deslizante.value = '0.7';
  deslizante.dispatchEvent(new Event('input'));
  assert.deepEqual(valores, [0.7]);
});

test('a leitura escreve o número no idioma da aula, com casas fixas quando pedidas', () => {
  const pt = pagina('pt-BR');
  const controles = criarControles(pt.document);
  const saida = controles.leitura(pt.raiz, 0.5, { casas: 2 });
  assert.equal(saida.outerHTML, '<output class="leitura">0,50</output>');
  assert.equal(controles.escrever(saida, 1234.5), '1.234,5');
  assert.equal(controles.escrever(saida, 'parado'), 'parado');
  assert.equal(saida.textContent, 'parado');
  const en = pagina('en');
  assert.equal(criarControles(en.document).leitura(en.raiz, 0.5, { casas: 2 }).textContent, '0.50');
});

// Os controles são criados pela demo no documento RENDERIZADO: as classes deles têm de estar no
// contrato, senão tests/integracao/utilitarios.mjs:classesForaDoContrato as acusa na primeira demo
// que os usar. A lista é a que o próprio módulo escreve, medida aqui, não uma cópia dela.
// Inversão rodada: tirando "controle" de classesDoSistema, este teste acusa ["controle"].
test('toda classe que os controles escrevem está em contrato.classesDoSistema', () => {
  const { document, raiz } = pagina();
  const controles = criarControles(document);
  controles.alternar(controles.botao(raiz, 'b'));
  controles.deslizante(raiz);
  controles.leitura(raiz, 1);
  const escritas = [...new Set([...raiz.querySelectorAll('[class]')].flatMap((el) => [...el.classList]))];
  assert.deepEqual(escritas.sort(), ['ativo', 'controle', 'leitura']);
  assert.deepEqual(escritas.filter((nome) => !contrato.classesDoSistema.includes(nome)), []);
});

// Um só lugar mexe em demo (motor/demos.js); os controles chegam por ele, antes de montar().
test('instalarDemos entrega AulaUSP.controles antes do primeiro montar()', () => {
  const { document, raiz } = pagina();
  const slide = document.createElement('section');
  slide.className = 'slide';
  slide.append(raiz);
  document.body.append(slide);
  const api = {
    filaDeDemos: [{
      nome: 'd',
      definicao: { montar(alvo) { api.controles.botao(alvo, 'somar'); } },
    }],
  };
  const motor = { doc: document, janela: { console }, slides: [slide], estado: () => ({ indice: 0 }), aoMudar() {} };
  instalarDemos(motor, api);
  assert.equal(typeof api.controles?.botao, 'function');
  assert.equal(raiz.querySelector('button.controle')?.textContent, 'somar');
});
