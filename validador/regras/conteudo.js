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
function conferirFilhos(elemento, seletor, regra, contrato) {
  const itens = semOpcionais(elemento, contrato);
  if (regra.sequencia) return casarSequencia(itens, regra.sequencia, contrato);
  const entradas = entradasDeFilhos(seletor, regra);
  const faltando = [];
  const sobrando = [];
  for (const item of itens) {
    const permitido = entradas.some((entrada) => (entrada.grupo
      ? contrato[entrada.grupo].some((nome) => casaSeletor(item, nome))
      : casaSeletor(item, entrada.seletor)));
    if (!permitido) sobrando.push({ item, foraDeOrdem: false });
  }
  if (regra.exatamenteUmDe) {
    const escolhidos = itens.filter((item) => regra.exatamenteUmDe.some((nome) => casaSeletor(item, nome)));
    if (escolhidos.length === 0) faltando.push({ nomes: regra.exatamenteUmDe });
    // Mais de um é excesso, não falta: sobra cada um depois do primeiro.
    for (const item of escolhidos.slice(1)) sobrando.push({ item, excedente: regra.exatamenteUmDe });
  }
  return { faltando, sobrando };
}

// Um achado por alvo: a própria section, e cada elemento que o contrato descreve em "filhos".
function* conferir(secao, contrato) {
  const layout = contrato.layouts[secao.getAttribute('data-layout')];
  if (!layout) return; // layout fora do contrato já é estrutura.layout
  yield { alvo: secao, ...casarSequencia(semOpcionais(secao, contrato), layout.sequencia, contrato) };
  for (const [seletor, regra] of Object.entries(contrato.filhos)) {
    for (const elemento of secao.querySelectorAll(seletor)) {
      yield { alvo: elemento, ...conferirFilhos(elemento, seletor, regra, contrato) };
    }
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
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const { alvo, faltando } of conferir(secao, contrato)) {
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
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const { alvo, sobrando } of conferir(secao, contrato)) {
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
