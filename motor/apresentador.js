// Janela do apresentador (spec 6.6): miniaturas fiéis, notas, cronômetro, relógio, posição e mapa de blocos.
import { elemento, clonarSemIds } from './dom.js';
import { copiarSlide } from './copias.js';
import { gruposDePassos, aplicarPassos } from './passos.js';
import { estadosDosQuadrados } from '../montar/blocos.js';
import { instalarSincronia } from './sincronia.js';
import { LARGURA_DO_PALCO, ALTURA_DO_PALCO } from './motor.js';

const INTERVALO_DE_OLA = 2000;

export function modoApresentador(janela) {
  return new URLSearchParams(janela.location.search).has('apresentador');
}

function criarMiniatura(doc, rotulo, qual) {
  const caixa = elemento(doc, 'div', 'miniatura');
  caixa.setAttribute('data-miniatura', qual);
  const quadro = elemento(doc, 'div', 'quadro-miniatura');
  caixa.append(elemento(doc, 'span', 'rotulo', rotulo), quadro);
  return { caixa, quadro };
}

function formatarTempo(milissegundos) {
  const total = Math.floor(milissegundos / 1000);
  const partes = [Math.floor(total / 60) % 60, total % 60].map((parte) => String(parte).padStart(2, '0'));
  const horas = Math.floor(total / 3600);
  return horas > 0 ? `${horas}:${partes.join(':')}` : partes.join(':');
}

function criarCronometro(doc, rot, janela) {
  const tempo = elemento(doc, 'output', 'tempo', formatarTempo(0));
  const relogio = elemento(doc, 'output', 'relogio');
  const caixa = elemento(doc, 'div', 'cronometro');
  let inicio = null;
  let acumulado = 0;

  const mostrar = () => {
    tempo.textContent = formatarTempo(acumulado + (inicio === null ? 0 : Date.now() - inicio));
  };
  const botao = (texto, acao) => {
    const elementoBotao = elemento(doc, 'button', null, texto);
    elementoBotao.type = 'button';
    elementoBotao.addEventListener('click', () => {
      acao();
      mostrar();
    });
    return elementoBotao;
  };

  caixa.append(
    tempo,
    botao(rot.iniciarCronometro, () => { if (inicio === null) inicio = Date.now(); }),
    botao(rot.pausarCronometro, () => {
      if (inicio === null) return;
      acumulado += Date.now() - inicio;
      inicio = null;
    }),
    botao(rot.zerarCronometro, () => { acumulado = 0; inicio = inicio === null ? null : Date.now(); }),
    relogio,
  );

  janela.setInterval(() => {
    mostrar();
    relogio.textContent = new Date().toLocaleTimeString(doc.documentElement.lang || 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, 1000);
  relogio.textContent = new Date().toLocaleTimeString(doc.documentElement.lang || 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  return caixa;
}

export function instalarApresentador(motor) {
  const { doc, janela, rot, resumo, slides, grupos } = motor;
  doc.body.classList.add('modo-apresentador');

  const atual = criarMiniatura(doc, rot.atual, 'atual');
  const proxima = criarMiniatura(doc, rot.proximo, 'proxima');
  const posicao = elemento(doc, 'p', 'posicao');
  const mapa = elemento(doc, 'nav', 'mapa');
  const notas = elemento(doc, 'div', 'notas-apresentador');
  const painel = elemento(doc, 'div', 'painel-apresentador');
  painel.append(posicao, mapa, criarCronometro(doc, rot, janela), notas);
  const raiz = elemento(doc, 'div', 'apresentador');
  raiz.append(atual.caixa, proxima.caixa, painel);
  doc.body.append(raiz);

  const proximoEstado = ({ indice, passo }) => {
    if (passo < grupos[indice].length) return { indice, passo: passo + 1 };
    if (indice < slides.length - 1) return { indice: indice + 1, passo: 0 };
    return null;
  };

  function preencher(quadro, estado, sufixo) {
    quadro.replaceChildren();
    if (!estado) {
      quadro.append(elemento(doc, 'p', 'fim-da-aula', rot.fimDaAula));
      return;
    }
    const copia = copiarSlide(slides[estado.indice], sufixo);
    copia.classList.add('ativo');
    aplicarPassos(gruposDePassos(copia), estado.passo);
    quadro.append(copia);
  }

  function ajustarEscalas() {
    for (const quadro of [atual.quadro, proxima.quadro]) {
      const escala = Math.min(quadro.clientWidth / LARGURA_DO_PALCO, quadro.clientHeight / ALTURA_DO_PALCO);
      quadro.style.setProperty('--escala-miniatura', String(escala));
    }
  }

  function atualizar() {
    const estado = motor.estado();
    const slide = slides[estado.indice];
    preencher(atual.quadro, estado, 'atual');
    preencher(proxima.quadro, proximoEstado(estado), 'proxima');
    const passos = grupos[estado.indice].length;
    posicao.textContent = passos > 0
      ? `${rot.slide} ${estado.indice + 1} / ${slides.length} · ${rot.passo} ${estado.passo} / ${passos}`
      : `${rot.slide} ${estado.indice + 1} / ${slides.length}`;
    const estados = estadosDosQuadrados(resumo.blocos.length, Number(slide.getAttribute('data-bloco')) || null, {
      encerramento: slide.getAttribute('data-layout') === 'encerramento',
    });
    mapa.replaceChildren(...resumo.blocos.map((bloco, k) => {
      const quadrado = elemento(doc, 'a', `quadrado ${estados[k]}`);
      quadrado.setAttribute('href', `#${bloco.id}`);
      quadrado.setAttribute('aria-label', `${rot.bloco} ${bloco.numero}: ${bloco.titulo}`);
      return quadrado;
    }));
    const aside = slide.querySelector(':scope > aside.notas');
    notas.replaceChildren(...(aside
      ? [...aside.childNodes].map(clonarSemIds)
      : [elemento(doc, 'p', null, rot.semNotas)]));
    ajustarEscalas();
  }

  motor.aoMudar(atualizar);
  janela.addEventListener('resize', ajustarEscalas);
  atualizar();
  instalarSincronia(motor, { par: janela.opener, intervaloDeOla: INTERVALO_DE_OLA });
  return { atualizar };
}

export function instalarAberturaDoApresentador(motor, paineis) {
  const { janela, rot } = motor;
  const sincronia = instalarSincronia(motor);
  motor.definirAcao('apresentador', () => {
    const endereco = new URL(janela.location.href);
    endereco.searchParams.set('apresentador', '1');
    const outra = janela.open(endereco.href, 'aula-usp-apresentador');
    if (!outra) {
      paineis.avisar(rot.apresentadorBloqueado);
      return;
    }
    sincronia.definirPar(outra);
  });
  return sincronia;
}
