// Painéis do motor (spec 6.5): notas (N), visão geral (Esc), ajuda (?) e validador (V), fora do palco.
import { elemento, clonarSemIds } from './dom.js';
import { textoDeTitulo, estadosDosQuadrados } from '../montar/blocos.js';
import { doisDigitos } from '../montar/cromo.js';
import { linhaDe, cabecalhoDe, contar } from '../validador/validar.js';

const LARGURA_DAS_NOTAS = 380;

function criarPainel(doc, nome, titulo) {
  const painel = elemento(doc, 'div', 'painel');
  painel.setAttribute('data-painel', nome);
  painel.setAttribute('tabindex', '-1');
  painel.hidden = true;
  const corpo = elemento(doc, 'div', 'painel-corpo');
  painel.append(elemento(doc, 'h2', 'painel-titulo', titulo), corpo);
  doc.body.append(painel);
  return { painel, corpo };
}

function preencherNotas(doc, corpo, slide, rot) {
  const notas = slide.querySelector(':scope > aside.notas');
  if (notas) corpo.replaceChildren(...[...notas.childNodes].map(clonarSemIds));
  else corpo.replaceChildren(elemento(doc, 'p', null, rot.semNotas));
}

function tituloDoSlide(slide) {
  return textoDeTitulo(slide.querySelector('.area h1, .area h2, .area p.afirmacao')) || slide.id;
}

function preencherVisaoGeral(doc, corpo, motor) {
  const { slides, resumo, rot } = motor;
  const atual = motor.estado().indice;
  const slideAtual = slides[atual];
  const estados = estadosDosQuadrados(resumo.blocos.length, Number(slideAtual.getAttribute('data-bloco')) || null, {
    encerramento: slideAtual.getAttribute('data-layout') === 'encerramento',
  });
  corpo.replaceChildren();
  let grupo = null;
  slides.forEach((slide, indice) => {
    const encerramento = slide.getAttribute('data-layout') === 'encerramento';
    const numero = encerramento ? 0 : Number(slide.getAttribute('data-bloco')) || 0;
    const chave = encerramento ? 'encerramento' : numero;
    if (!grupo || grupo.chave !== chave) {
      const titulo = encerramento ? rot.encerramento
        : numero ? `${doisDigitos(numero)} · ${resumo.blocos[numero - 1].titulo}` : rot.introducao;
      const cartoes = elemento(doc, 'div', 'cartoes');
      const bloco = elemento(doc, 'div', 'grupo');
      bloco.append(elemento(doc, 'h3', 'grupo-titulo', titulo), cartoes);
      corpo.append(bloco);
      grupo = { chave, cartoes };
    }
    const cartao = elemento(doc, 'button', 'cartao');
    cartao.type = 'button';
    cartao.setAttribute('data-indice', String(indice));
    if (indice === atual) cartao.setAttribute('aria-current', 'true');
    if (numero) cartao.append(elemento(doc, 'span', `quadrado ${estados[numero - 1]}`));
    cartao.append(elemento(doc, 'span', 'cartao-numero', String(indice + 1)), elemento(doc, 'span', 'cartao-titulo', tituloDoSlide(slide)));
    grupo.cartoes.append(cartao);
  });
}

function preencherAjuda(doc, corpo, rot) {
  const linhaDoCabecalho = elemento(doc, 'tr');
  for (const texto of [rot.tecla, rot.acao]) {
    const celula = elemento(doc, 'th', null, texto);
    celula.setAttribute('scope', 'col');
    linhaDoCabecalho.append(celula);
  }
  const cabecalho = elemento(doc, 'thead');
  cabecalho.append(linhaDoCabecalho);
  const linhas = elemento(doc, 'tbody');
  for (const [tecla, acao] of rot.teclas) {
    const celula = elemento(doc, 'th', null, tecla);
    celula.setAttribute('scope', 'row');
    const linha = elemento(doc, 'tr');
    linha.append(celula, elemento(doc, 'td', null, acao));
    linhas.append(linha);
  }
  const tabela = elemento(doc, 'table', 'teclas');
  tabela.append(cabecalho, linhas);
  corpo.replaceChildren(tabela);
}

// O texto que o botão copia: o mesmo cabeçalho da CLI, e uma linha por achado no formato de linhaDe
// (spec 9.1) — quem lê no chat vê exatamente o que veria no terminal.
function textoDosAchados(achados) {
  return [cabecalhoDe(achados), ...achados.map(linhaDe)].join('\n');
}

function preencherValidador(doc, corpo, achados, rot) {
  const lista = elemento(doc, 'ul', 'achados');
  for (const achado of achados) {
    const linha = elemento(doc, 'li', null, linhaDe(achado));
    linha.setAttribute('data-severidade', achado.severidade);
    lista.append(linha);
  }
  const copiar = elemento(doc, 'button', 'copiar', rot.copiarParaOChat);
  copiar.type = 'button';
  // file:// não é contexto seguro: navigator.clipboard nem existe ali. Desabilita em vez de deixar
  // um botão morto — sem isso, o autor clica e nada acontece, sem saber por quê.
  copiar.disabled = !doc.defaultView.navigator.clipboard;
  copiar.addEventListener('click', () => {
    doc.defaultView.navigator.clipboard?.writeText(textoDosAchados(achados)).catch(() => {});
  });
  corpo.replaceChildren(lista, copiar);
}

export function instalarPaineis(motor) {
  const { doc, rot } = motor;
  const paineis = {
    notas: criarPainel(doc, 'notas', rot.notas),
    'visao-geral': criarPainel(doc, 'visao-geral', rot.visaoGeral),
    ajuda: criarPainel(doc, 'ajuda', rot.ajuda),
    validador: criarPainel(doc, 'validador', rot.validador),
  };
  preencherAjuda(doc, paineis.ajuda.corpo, rot);
  const aviso = elemento(doc, 'p', 'aviso');
  aviso.hidden = true;
  paineis.notas.painel.insertBefore(aviso, paineis.notas.corpo);
  let aberto = null;

  function atualizar() {
    if (aberto === 'notas') preencherNotas(doc, paineis.notas.corpo, motor.slides[motor.estado().indice], rot);
    if (aberto === 'visao-geral') preencherVisaoGeral(doc, paineis['visao-geral'].corpo, motor);
  }

  function fechar() {
    if (!aberto) return;
    paineis[aberto].painel.hidden = true;
    if (aberto === 'notas') {
      motor.reservarDireita(0);
      aviso.hidden = true;
    }
    aberto = null;
  }

  function abrir(nome) {
    if (!Object.hasOwn(paineis, nome)) throw new Error(`painel desconhecido: "${nome}"`);
    fechar();
    aberto = nome;
    atualizar();
    paineis[nome].painel.hidden = false;
    if (nome === 'notas') motor.reservarDireita(LARGURA_DAS_NOTAS);
    else paineis[nome].painel.focus();
  }

  const alternar = (nome) => (aberto === nome ? fechar() : abrir(nome));
  motor.definirAcao('notas', () => alternar('notas'));
  motor.definirAcao('ajuda', () => alternar('ajuda'));
  motor.definirAcao('validador', () => alternar('validador'));
  motor.definirAcao('escape', () => (aberto ? fechar() : abrir('visao-geral')));
  motor.aoMudar(atualizar);

  paineis['visao-geral'].corpo.addEventListener('click', (evento) => {
    const cartao = evento.target.closest('button.cartao');
    if (!cartao) return;
    fechar();
    motor.irPara({ indice: Number(cartao.getAttribute('data-indice')), passo: 0 });
  });

  return {
    abrir,
    fechar,
    aberto: () => aberto,
    avisar(texto) {
      aviso.textContent = texto;
      abrir('notas');
      aviso.hidden = false;
    },
    mostrarAchados(achados) {
      paineis.validador.painel.querySelector('.painel-titulo').textContent = cabecalhoDe(achados);
      preencherValidador(doc, paineis.validador.corpo, achados, rot);
      // Spec 3.2: o painel abre sozinho só com erro, e não interrompe quem está projetando.
      if (contar(achados).erros > 0 && !doc.fullscreenElement) abrir('validador');
    },
  };
}
