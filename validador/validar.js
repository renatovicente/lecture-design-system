// Validador (spec 9): roda as regras do contrato sobre o fonte da aula e devolve os achados em ordem estável.
// Só API padrão do DOM, para o mesmo módulo rodar no navegador (marco 4c) e no build, sobre o linkedom.

const CAIXA = { erro: 'ERRO', aviso: 'AVISO' };

// O fonte pode ter section sem data-layout: o montar a ignora, e o validador a acusa (estrutura.layout).
export function slidesDoFonte(corpo) {
  return [...corpo.children].filter((el) => el.nodeName === 'SECTION');
}

// Onde o achado aconteceu: o número do slide, contado no documento, e o id do autor, quando houver.
export function onde(slides, secao) {
  const indice = slides.indexOf(secao);
  return { slide: indice < 0 ? null : indice + 1, id: secao.getAttribute('id') || null };
}

export function encurtar(texto, limite = 80) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1)}…`;
}

// Trecho do fonte numa linha só, para a mensagem apontar o lugar sem despejar o slide inteiro.
export function trechoDe(elemento, limite = 80) {
  return encurtar(elemento.outerHTML ?? '', limite);
}

export function validar(doc, { contrato, regras, grupo, fase = 1, ...dados }) {
  doc.body.normalize(); // o linkedom parte o texto em cada entidade; sem juntar, o TeX do fonte não é achado
  const slides = slidesDoFonte(doc.body);
  // O que vier além do que o motor conhece vai para as regras: é assim que o marco 4c injeta cobertura
  // de glifos e imagens carregadas sem mexer aqui. fase também vai: uma regra que só existe a partir
  // da fase 2 (ou que tem entradas do contrato marcadas fase:2) precisa saber qual fase está rodando.
  const contexto = { doc, slides, contrato, fase, ...dados };
  const achados = [];
  regras.forEach((regra, ordem) => {
    const definicao = contrato.regras[regra.nome];
    if (!definicao || definicao.grupo !== grupo || definicao.fase > fase) return;
    for (const achado of regra.aplicar(contexto)) {
      achados.push({
        severidade: definicao.severidade,
        slide: achado.slide ?? null,
        id: achado.id ?? null,
        regra: regra.nome,
        mensagem: achado.mensagem,
        acao: definicao.acao,
        trecho: achado.trecho ?? null,
        ordem,
      });
    }
  });
  // Ordem estável: o que é da aula inteira vem primeiro, depois por slide, e dentro do slide na ordem das regras.
  achados.sort((a, b) => (a.slide ?? 0) - (b.slide ?? 0) || a.ordem - b.ordem);
  return achados.map(({ ordem, ...achado }) => achado);
}

export function linhaDe({ severidade, slide, id, regra, mensagem, acao, trecho }) {
  const lugar = slide === null ? 'aula' : `slide ${slide}${id ? ` #${id}` : ''}`;
  const cabeca = `${CAIXA[severidade]} · ${lugar} · ${regra} · ${mensagem} ${acao}`;
  return trecho ? `${cabeca}\n    ${trecho}` : cabeca;
}

export function contar(achados) {
  const erros = achados.filter((achado) => achado.severidade === 'erro').length;
  return { erros, avisos: achados.length - erros };
}

export function cabecalhoDe(achados) {
  const { erros, avisos } = contar(achados);
  return `Validador Aula USP: ${plural(erros, 'erro', 'erros')}, ${plural(avisos, 'aviso', 'avisos')}`;
}

export function plural(quantos, um, muitos) {
  return `${quantos} ${quantos === 1 ? um : muitos}`;
}
