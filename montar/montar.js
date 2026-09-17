// Montagem da aula: seções viram slides, com ids, área e cromo (spec 3.1, 5.3, 5.4 e 6.3).
import { lerMetadados, formatarData } from './metadados.js';
import { derivarBlocos, estadosDosQuadrados, textoDeTitulo } from './blocos.js';
import {
  criarCabecalho, criarRodape, criarMetadadosCapa, criarRoteiro, criarFileira, criarFaixaDeMarca, criarBlocoNdeM,
  doisDigitos,
} from './cromo.js';
import { rotulosPara } from '../motor/rotulos.js';
import { rotularExercicios } from './corpo.js';

export function slug(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/, '');
}

export function secoesDaAula(doc) {
  return [...doc.body.children].filter((el) => el.nodeName === 'SECTION' && el.hasAttribute('data-layout'));
}

function atribuirIds(doc, secoes) {
  const usados = new Set([...doc.querySelectorAll('[id]')].map((el) => el.getAttribute('id')));
  secoes.forEach((secao, i) => {
    if (secao.getAttribute('id')) return;
    const layout = secao.getAttribute('data-layout');
    const base = layout === 'capa' || layout === 'encerramento'
      ? layout
      : slug(textoDeTitulo(secao.querySelector('h1, h2, p.afirmacao'))) || `slide-${i + 1}`;
    let id = base;
    for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
    usados.add(id);
    secao.setAttribute('id', id);
  });
}

function envolverEmArea(doc, secao) {
  const area = doc.createElement('div');
  area.className = 'area';
  for (const no of [...secao.childNodes]) {
    const ehNota = no.nodeType === 1 && no.nodeName === 'ASIDE' && no.classList.contains('notas');
    if (!ehNota) area.append(no);
  }
  secao.prepend(area);
  return area;
}

export function montar(doc, { unidades, usp, urlMarcas, limites }) {
  if (doc.documentElement.getAttribute('data-aula-usp') === 'montada') throw new Error('aula já montada');
  const meta = lerMetadados(doc);
  const unidade = Object.hasOwn(unidades, meta.unidade) ? unidades[meta.unidade] : undefined;
  if (!unidade) throw new Error(`unidade desconhecida: "${meta.unidade}"`);
  const rot = rotulosPara(meta.lang);
  const secoes = secoesDaAula(doc);
  atribuirIds(doc, secoes);
  rotularExercicios(doc, rot);
  const { blocos, blocoDaSecao, modo } = derivarBlocos(secoes, limites);
  for (const bloco of blocos) bloco.id = secoes[bloco.indice].getAttribute('id');
  const total = secoes.length;
  const rodape = `${meta.disciplina} · ${rot.aula} ${meta.aula}`;

  secoes.forEach((secao, i) => {
    const layout = secao.getAttribute('data-layout');
    const numero = blocoDaSecao[i];
    secao.classList.add('slide');
    secao.setAttribute('data-indice', String(i + 1));
    secao.setAttribute('data-mapa', modo);
    if (numero !== null) secao.setAttribute('data-bloco', String(numero));
    const area = envolverEmArea(doc, secao);

    if (layout === 'capa') {
      area.append(criarMetadadosCapa(doc, [rodape, `${meta.professor} · ${formatarData(meta.data, meta.lang)}`]));
      if (modo !== 'nenhum') area.append(criarRoteiro(doc, blocos));
      secao.append(criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }));
      return;
    }
    if (layout === 'abertura') {
      if (modo === 'nenhum') return;
      secao.prepend(criarFileira(doc, blocos, estadosDosQuadrados(blocos.length, numero)));
      area.querySelector('h2')?.after(criarBlocoNdeM(doc, rot, numero, blocos.length));
      return;
    }
    const encerramento = layout === 'encerramento';
    let rotulo = rot.introducao;
    if (encerramento) rotulo = rot.encerramento;
    else if (numero !== null) rotulo = `${doisDigitos(numero)} · ${blocos[numero - 1].titulo}`;
    secao.prepend(criarCabecalho(doc, {
      rotulo,
      blocos,
      modo,
      rot,
      estados: estadosDosQuadrados(blocos.length, numero, { encerramento }),
      blocoAtual: encerramento ? null : numero,
      contador: `${i + 1} / ${total}`,
    }));
    secao.append(encerramento ? criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }) : criarRodape(doc, rodape));
  });

  doc.documentElement.setAttribute('data-aula-usp', 'montada');
  return { total, modo, blocos: blocos.map(({ numero, titulo, curto, id }) => ({ numero, titulo, curto, id })) };
}
