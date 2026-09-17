// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';
import { instalarDemos } from '../motor/demos.js';
import { instalarApresentador, instalarAberturaDoApresentador, modoApresentador } from '../motor/apresentador.js';
import { instalarImpressao } from '../motor/impressao.js';
import { renderizarTex } from '../componentes/tex.js';

const BASE = new URL('../', import.meta.url);
const TEX = /\\\(|\\\[/;
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/componentes.css', 'estilos/motor.css', 'estilos/impressao.css'];

function carregarEstilo(caminho) {
  return new Promise((pronto, falha) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(caminho, BASE).href;
    link.addEventListener('load', pronto, { once: true });
    link.addEventListener('error', () => falha(new Error(`não carregou ${caminho}`)), { once: true });
    document.head.append(link);
  });
}

async function lerJson(caminho) {
  const resposta = await fetch(new URL(caminho, BASE));
  if (!resposta.ok) throw new Error(`não carregou ${caminho} (HTTP ${resposta.status})`);
  return resposta.json();
}

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

try {
  await documentoLido();
  const [unidades, usp, contrato] = await Promise.all([
    lerJson('assets/marcas/unidades.json'),
    lerJson('assets/marcas/usp.json'),
    lerJson('contrato/contrato.json'),
    ...ESTILOS.map(carregarEstilo),
  ]);
  const resumo = montar(document, {
    unidades,
    usp,
    urlMarcas: new URL('assets/marcas', BASE).href,
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });
  // A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta ao iniciar (spec 6.4).
  if (TEX.test(document.body.textContent)) {
    const [{ default: katex }] = await Promise.all([
      import('katex'),
      carregarEstilo('modulos/katex/dist/katex.min.css'),
    ]);
    for (const erro of renderizarTex(document.body, { katex })) {
      console.error(`Aula USP: TeX inválido em ${erro.trecho}: ${erro.mensagem}`);
    }
  }
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
  else {
    const api = window.AulaUSP ?? (window.AulaUSP = {});
    const motor = iniciarMotor({ doc: document, janela: window, resumo });
    if (modoApresentador(window)) {
      instalarApresentador(motor);
    } else {
      const paineis = instalarPaineis(motor);
      const demos = instalarDemos(motor, api);
      instalarAberturaDoApresentador(motor, paineis);
      instalarImpressao(motor, { demos, paineis, api });
    }
  }
  void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
  await document.fonts.ready;
  document.body.dataset.montado = 'sim';
} catch (erro) {
  document.body.dataset.montado = 'erro';
  const aviso = document.createElement('pre');
  aviso.className = 'painel';
  aviso.textContent = `Aula USP: ${erro.message}`;
  document.body.prepend(aviso);
  console.error(erro);
} finally {
  document.querySelector('style[data-aula-usp="ocultar"]')?.remove();
}
