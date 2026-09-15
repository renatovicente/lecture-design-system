// Motor de apresentação (spec 6.1 a 6.4): palco escalado, um slide por vez, passos, teclado, cliques e endereço.
import { gruposDePassos, aplicarPassos } from './passos.js';
import { acaoDaTecla, avancar, voltar, lerEndereco, escreverEndereco } from './navegacao.js';
import { rotulosPara } from './rotulos.js';

const LARGURA_DO_PALCO = 1280;
const ALTURA_DO_PALCO = 720;
const FAIXA_DE_CLIQUE = 0.12;
const CONTROLES = 'input, select, textarea, [contenteditable]';
const INTERATIVOS = 'a, button, input, select, textarea, label, [contenteditable], .demo, [data-painel]';

export function iniciarMotor({ doc, janela, resumo }) {
  const rot = rotulosPara(doc.documentElement.getAttribute('lang') ?? undefined);
  const slides = [...doc.querySelectorAll('section.slide')];
  const ids = slides.map((slide) => slide.id);
  const grupos = slides.map(gruposDePassos);
  const passosPorSlide = grupos.map((lista) => lista.length);
  const acoes = new Map();
  const ouvintes = [];
  let estado = null;
  let reservaDireita = 0;

  const palco = doc.createElement('div');
  palco.className = 'palco';
  palco.append(...slides);
  doc.body.prepend(palco);
  doc.body.classList.add('modo-palco');

  function ajustarEscala() {
    const largura = janela.innerWidth - reservaDireita;
    const escala = Math.min(largura / LARGURA_DO_PALCO, janela.innerHeight / ALTURA_DO_PALCO);
    palco.style.setProperty('--escala', String(escala));
    palco.style.setProperty('--centro-x', `${largura / 2}px`);
  }

  function irPara(alvo) {
    const indice = Math.max(0, Math.min(slides.length - 1, alvo.indice));
    const passo = Math.max(0, Math.min(passosPorSlide[indice], alvo.passo));
    if (estado && estado.indice === indice && estado.passo === passo) return;
    const anterior = estado;
    if (anterior?.indice !== indice) {
      if (anterior) slides[anterior.indice].classList.remove('ativo');
      slides[indice].classList.add('ativo');
    }
    aplicarPassos(grupos[indice], passo);
    estado = { indice, passo };
    janela.history.replaceState(null, '', escreverEndereco(estado, ids));
    for (const ouvinte of ouvintes) ouvinte(estado, anterior);
  }

  acoes.set('avancar', () => irPara(avancar(estado, passosPorSlide)));
  acoes.set('voltar', () => irPara(voltar(estado, passosPorSlide)));
  acoes.set('primeiro', () => irPara({ indice: 0, passo: 0 }));
  acoes.set('ultimo', () => irPara({ indice: slides.length - 1, passo: 0 }));
  acoes.set('tela-cheia', () => {
    const pedido = doc.fullscreenElement ? doc.exitFullscreen() : doc.documentElement.requestFullscreen();
    pedido.catch((erro) => janela.console.warn('Aula USP: tela cheia indisponível.', erro));
  });
  resumo.blocos.slice(0, 8).forEach((bloco) => {
    acoes.set(`bloco-${bloco.numero}`, () => irPara({ indice: ids.indexOf(bloco.id), passo: 0 }));
  });

  janela.addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    if (alvo?.closest?.(`.demo, ${CONTROLES}`)) return;
    if (evento.key === ' ' && alvo?.closest?.('button')) return;
    const acao = acoes.get(acaoDaTecla(evento));
    if (!acao) return;
    evento.preventDefault();
    acao();
  });

  doc.addEventListener('click', (evento) => {
    const link = evento.target.closest?.('a[href^="#"]');
    const alvo = link ? lerEndereco(link.getAttribute('href'), ids, passosPorSlide) : null;
    if (alvo) {
      evento.preventDefault();
      irPara(alvo);
      return;
    }
    if (evento.target.closest?.(INTERATIVOS)) return;
    const largura = janela.innerWidth - reservaDireita;
    if (evento.clientX < largura * FAIXA_DE_CLIQUE) acoes.get('voltar')();
    else if (evento.clientX > largura * (1 - FAIXA_DE_CLIQUE)) acoes.get('avancar')();
  });

  janela.addEventListener('hashchange', () => {
    const alvo = lerEndereco(janela.location.hash, ids, passosPorSlide);
    if (alvo) irPara(alvo);
    janela.history.replaceState(null, '', escreverEndereco(estado, ids));
  });

  janela.addEventListener('resize', ajustarEscala);
  ajustarEscala();
  irPara(lerEndereco(janela.location.hash, ids, passosPorSlide) ?? { indice: 0, passo: 0 });

  return {
    doc,
    janela,
    rot,
    resumo,
    slides,
    ids,
    grupos,
    estado: () => estado,
    irPara,
    aoMudar: (ouvinte) => ouvintes.push(ouvinte),
    definirAcao: (nome, acao) => acoes.set(nome, acao),
    reservarDireita: (largura) => {
      reservaDireita = largura;
      ajustarEscala();
    },
  };
}
