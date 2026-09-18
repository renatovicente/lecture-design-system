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
  if (!item) return false;
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

export function nomeDaEntrada(entrada) {
  if (entrada.nomes) return entrada.nomes.join(' nem ');
  return entrada.grupo ? 'bloco de corpo' : entrada.seletor;
}

function consumir(itens, inicio, entradas, contrato, nomeados) {
  let i = inicio;
  const faltando = [];
  for (const entrada of entradas) {
    if (entrada.umDe) {
      const escolhida = entrada.umDe.find((alternativa) => casa(itens[i], alternativa[0], contrato, nomeados));
      if (!escolhida) {
        // Nenhuma alternativa começou: a mensagem nomeia todas, em vez de escolher a primeira por acaso.
        faltando.push({ nomes: entrada.umDe.map((alternativa) => nomeDaEntrada(alternativa[0])) });
        continue;
      }
      const parcial = consumir(itens, i, escolhida, contrato, nomeados);
      i = parcial.i;
      faltando.push(...parcial.faltando);
      continue;
    }
    let quantos = 0;
    while (casa(itens[i], entrada, contrato, nomeados) && (entrada.max === null || quantos < entrada.max)) {
      i += 1;
      quantos += 1;
    }
    if (quantos < (entrada.min ?? 0)) faltando.push(entrada);
  }
  return { i, faltando };
}

// O que falta e o que sobra. Sobra é o item que não coube: ou não é permitido ali, ou está fora de ordem.
export function casarSequencia(itens, sequencia, contrato) {
  const nomeados = seletoresNomeados(sequencia);
  const { i, faltando } = consumir(itens, 0, sequencia, contrato, nomeados);
  const sobrando = itens.slice(i).map((item) => ({
    item,
    foraDeOrdem: sequencia.some((entrada) => (entrada.umDe ?? [[entrada]]).flat().some((e) => casa(item, e, contrato, nomeados))),
  }));
  return { faltando, sobrando };
}
