// Regras de conteúdo do slide (spec 5.3 e 9.2): o que o layout exige e o que ele não aceita, dentro da
// section e dentro dos elementos que o contrato descreve em "filhos".
import { onde, encurtar } from '../validar.js';
import { itensDoConteudo, casarSequencia, casaSeletor, nomeDaEntrada } from '../sequencia.js';

// O parser do navegador cria tbody; o do linkedom, não. Aceitar tr direto na table deixa os dois modos iguais.
const TRANSPARENTES = { table: ['tr'] };

function entradasDeFilhos(seletor, regra) {
  const entradas = [];
  if (regra.grupo) entradas.push({ grupo: regra.grupo, min: 0, max: null });
  for (const nome of regra.exatamenteUmDe ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of regra.elemento ? [regra.elemento] : regra.elementos ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of TRANSPARENTES[seletor] ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of regra.opcionais ?? []) entradas.push({ seletor: nome, min: 0, max: 1 });
  return entradas;
}

function semOpcionais(elemento, contrato) {
  return itensDoConteudo(elemento)
    .filter((item) => !contrato.sempreOpcional.some((opcional) => casaSeletor(item, opcional)));
}

// Fora de uma sequência, os filhos vêm em qualquer ordem: o casamento é por conjunto, não por posição.
// sempreOpcional (aside.notas) só é filtrado no nível da própria section (conferir, abaixo): dentro de
// qualquer outro elemento a nota não está em blocosDeCorpo, então cai em "não é permitido" por conta
// própria — sem isso, uma nota mal colocada numa coluna passava muda e ainda era renderizada no slide.
function conferirFilhos(elemento, seletor, regra, contrato) {
  const itens = itensDoConteudo(elemento);
  if (regra.sequencia) return casarSequencia(itens, regra.sequencia, contrato);
  const entradas = entradasDeFilhos(seletor, regra);
  const faltando = [];
  const sobrando = [];
  const quantos = new Map();
  for (const item of itens) {
    const entrada = entradas.find((e) => (e.grupo
      ? contrato[e.grupo].some((nome) => casaSeletor(item, nome))
      : casaSeletor(item, e.seletor)));
    if (!entrada) {
      sobrando.push({ item, foraDeOrdem: false });
      continue;
    }
    // O max dos opcionais vale: uma segunda figcaption na figura é excesso, não detalhe.
    const chave = entrada.grupo ?? entrada.seletor;
    quantos.set(chave, (quantos.get(chave) ?? 0) + 1);
    if (entrada.max != null && quantos.get(chave) > entrada.max) sobrando.push({ item, excedente: [entrada.seletor] });
  }
  if (regra.exatamenteUmDe) {
    const escolhidos = itens.filter((item) => regra.exatamenteUmDe.some((nome) => casaSeletor(item, nome)));
    if (escolhidos.length === 0) faltando.push({ nomes: regra.exatamenteUmDe });
    // Mais de um é excesso, não falta: sobra cada um depois do primeiro.
    for (const item of escolhidos.slice(1)) sobrando.push({ item, excedente: regra.exatamenteUmDe });
  }
  return { faltando, sobrando };
}

// Um elemento pode casar duas chaves de "filhos": uma div.exercicio escrita como coluna casa
// "div.colunas > div" e "div.exercicio". Vale a mais específica — mais classes no último seletor
// composto, empate pela ordem do contrato —, senão o mesmo elemento é conferido sob regras que se
// contradizem e ganha um erro falso.
//
// Uma chave pode trazer "fase" (figure.grafico, figure.diagrama: spec 7.2), pelo mesmo teste que
// vocabulario.classe e vocabulario.atributo já fazem (regra.fase > fase). Fora da fase dela, a
// chave nem entra na lista: um <figure class="grafico"> na fase 1 cai de volta em "figure" —
// exige img ou svg, recusa o script — porque a classe ainda não é vocabulário válido nessa fase.
// Sem este filtro, a chave mais específica venceria em qualquer fase e a estrutura de fase 2
// passaria a validar limpo mesmo com o contrato ainda recusando a classe (vocabulario.classe).
function chavesPorEspecificidade(contrato, fase) {
  return Object.keys(contrato.filhos)
    .filter((chave) => !(contrato.filhos[chave].fase > fase))
    .map((chave, ordem) => ({ chave, ordem, classes: (chave.split('>').at(-1).match(/\./g) ?? []).length }))
    .sort((a, b) => b.classes - a.classes || a.ordem - b.ordem)
    .map(({ chave }) => chave);
}

// Um achado por alvo: a própria section, e cada elemento que o contrato descreve em "filhos".
function* conferir(secao, contrato, fase) {
  const layout = contrato.layouts[secao.getAttribute('data-layout')];
  if (!layout) return; // layout fora do contrato já é estrutura.layout
  yield { alvo: secao, ...casarSequencia(semOpcionais(secao, contrato), layout.sequencia, contrato) };
  const chaves = chavesPorEspecificidade(contrato, fase);
  for (const elemento of secao.querySelectorAll('*')) {
    const chave = chaves.find((candidata) => elemento.matches(candidata));
    if (chave) yield { alvo: elemento, ...conferirFilhos(elemento, chave, contrato.filhos[chave], contrato) };
  }
}

function dentroDe(alvo, secao, preposicao) {
  return alvo === secao ? `${preposicao} layout "${secao.getAttribute('data-layout')}"` : `${preposicao} <${alvo.nodeName.toLowerCase()}>`;
}

function nomeDoItem(item) {
  if (item.tipo === 'elemento') return `<${item.no.nodeName.toLowerCase()}>`;
  return item.tipo === 'tex-destaque' ? 'equação em destaque' : 'texto solto';
}

export const regras = [
  {
    nome: 'estrutura.obrigatorio',
    *aplicar({ slides, contrato, fase }) {
      for (const secao of slides) {
        for (const { alvo, faltando } of conferir(secao, contrato, fase)) {
          for (const entrada of faltando) {
            yield {
              ...onde(slides, secao),
              mensagem: `${dentroDe(alvo, secao, '').trim()} sem ${nomeDaEntrada(entrada)}.`,
              trecho: alvo === secao ? null : encurtar(alvo.outerHTML),
            };
          }
        }
      }
    },
  },
  {
    nome: 'estrutura.fora-do-layout',
    *aplicar({ slides, contrato, fase }) {
      for (const secao of slides) {
        for (const { alvo, sobrando } of conferir(secao, contrato, fase)) {
          for (const { item, foraDeOrdem, excedente } of sobrando) {
            const lugar = alvo === secao ? dentroDe(alvo, secao, 'no') : dentroDe(alvo, secao, 'dentro de');
            const nome = nomeDoItem(item);
            const mensagem = excedente ? `${nome} a mais ${lugar}: só um ${excedente.join(' ou ')}.`
              : foraDeOrdem ? `${nome} fora de ordem ${lugar}.`
                : `${nome} não é permitido ${lugar}.`;
            yield { ...onde(slides, secao), mensagem, trecho: encurtar(item.trecho) };
          }
        }
      }
    },
  },
];
