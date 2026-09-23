// Casador de sequência (spec 5.3): compara o conteúdo de um elemento com a sequência do contrato.
// O conteúdo de um slide não é só elemento: a equação em destaque é texto solto (\[ … \]), que o
// contrato chama de "tex-destaque"; o resto do texto solto não é bloco nenhum.
import { segmentosDeTex } from '../componentes/tex.js';

// Itens do conteúdo, na ordem do documento. Chame normalize() antes: o linkedom parte o texto em cada entidade.
export function itensDoConteudo(elemento) {
  const itens = [];
  for (const no of elemento.childNodes) {
    if (no.nodeType === 1) {
      itens.push({ tipo: 'elemento', no, trecho: no.outerHTML });
      continue;
    }
    if (no.nodeType !== 3) continue;
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo === 'destaque') itens.push({ tipo: 'tex-destaque', no, trecho: segmento.trecho });
      else {
        const texto = segmento.texto ?? segmento.trecho;
        if (texto.trim()) itens.push({ tipo: 'texto-solto', no, trecho: texto.trim() });
      }
    }
  }
  return itens;
}

export function casaSeletor(item, seletor) {
  if (seletor === 'tex-destaque') return item.tipo === 'tex-destaque';
  return item.tipo === 'elemento' && item.no.matches(seletor);
}

// Um grupo não engole o que outra entrada da mesma sequência nomeia: assim p.lide depois do corpo
// não passa por bloco de corpo, e sim por elemento fora de ordem.
function casa(item, entrada, contrato, nomeados = []) {
  if (!item || (!entrada.seletor && !entrada.grupo)) return false;
  if (!entrada.grupo) return casaSeletor(item, entrada.seletor);
  if (nomeados.some((seletor) => casaSeletor(item, seletor))) return false;
  return contrato[entrada.grupo].some((seletor) => casaSeletor(item, seletor));
}

function seletoresNomeados(entradas) {
  return entradas.flatMap((entrada) => {
    if (entrada.umDe) return seletoresNomeados(entrada.umDe.flat());
    return entrada.seletor ? [entrada.seletor] : [];
  });
}

// O autor lê tag, não seletor CSS: `script[type="application/json"]` (o seletor que o contrato usa
// para parear o tipo do script ao pai) sai como `<script type="application/json">`, que é o que ele
// escreve no fonte. Qualquer outro seletor (img, svg, div.colunas…) sai como está, como já saía.
export function nomeLegivel(seletor) {
  const comAtributo = /^([a-z][a-z0-9]*)\[([a-z-]+)="([^"]*)"\]$/.exec(seletor);
  return comAtributo ? `<${comAtributo[1]} ${comAtributo[2]}="${comAtributo[3]}">` : seletor;
}

export function nomeDaEntrada(entrada) {
  if (entrada.nomes) return entrada.nomes.map(nomeLegivel).join(' nem ');
  return entrada.grupo ? 'bloco de corpo' : nomeLegivel(entrada.seletor);
}

// Alternativa de umDe que mais casa itens; empate fica com a escrita primeiro no contrato.
function melhorAlternativa(itens, umDe, contrato, nomeados) {
  let escolhida = null;
  let maior = 0;
  for (const alternativa of umDe) {
    const casados = itens.filter((item) => alternativa.some((entrada) => casa(item, entrada, contrato, nomeados))).length;
    if (casados > maior) {
      maior = casados;
      escolhida = alternativa;
    }
  }
  return escolhida;
}

// A sequência com os umDe já resolvidos. A alternativa que não casa nada vira uma entrada que nomeia todas,
// para a mensagem dizer "sem div.colunas nem bloco de corpo" em vez de escolher uma por acaso.
function entradasEfetivas(itens, sequencia, contrato, nomeados) {
  return sequencia.flatMap((entrada) => {
    if (!entrada.umDe) return [entrada];
    return melhorAlternativa(itens, entrada.umDe, contrato, nomeados)
      ?? [{ nomes: entrada.umDe.map((alternativa) => nomeDaEntrada(alternativa[0])), min: 1, max: null }];
  });
}

// Duas passadas, porque são duas perguntas: quantos de cada elemento existem, e em que ordem aparecem.
// Um casamento guloso de uma passada só confunde elemento deslocado com elemento ausente, e manda o autor
// acrescentar o que já está no slide.
export function casarSequencia(itens, sequencia, contrato) {
  const nomeados = seletoresNomeados(sequencia);
  const entradas = entradasEfetivas(itens, sequencia, contrato, nomeados);
  const de = itens.map((item) => entradas.findIndex((entrada) => casa(item, entrada, contrato, nomeados)));

  // Passada 1: cardinalidade, por conjunto, sem olhar a ordem.
  const faltando = [];
  const excedentes = new Map();
  entradas.forEach((entrada, indice) => {
    const meus = de.flatMap((qual, k) => (qual === indice ? [k] : []));
    if (meus.length < (entrada.min ?? 0)) faltando.push(entrada);
    if (entrada.max != null) for (const k of meus.slice(entrada.max)) excedentes.set(k, entrada);
  });

  // Passada 2: os índices atribuídos, lidos na ordem do documento, não podem decrescer.
  const sobrando = [];
  let maior = -1;
  itens.forEach((item, k) => {
    if (de[k] < 0) sobrando.push({ item });
    else if (excedentes.has(k)) sobrando.push({ item, excedente: [nomeDaEntrada(excedentes.get(k))] });
    else if (de[k] < maior) sobrando.push({ item, foraDeOrdem: true });
    else maior = de[k];
  });
  return { faltando, sobrando };
}
