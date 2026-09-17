// Regras de estrutura (spec 9.2): a aula tem capa e encerramento, cada slide tem um layout do contrato,
// os ids são únicos e nenhum slide mistura passos numerados com passos sem número.
import { onde, trechoDe, plural } from '../validar.js';
import { textoDeTitulo } from '../../montar/blocos.js';
import { segmentosDeTex } from '../../componentes/tex.js';

const COM_NOTAS = ['conteudo', 'afirmacao', 'figura', 'demo'];
const SEM_ID = ['capa', 'encerramento'];
const PASSO_NO_TEX = /\\passo\s*\{/g;
const DATA_ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function nomeDoLayout(secao) {
  const layout = secao.getAttribute('data-layout');
  return layout ? `"${layout}"` : 'uma section sem data-layout';
}

export const regras = [
  {
    nome: 'estrutura.primeiro-slide',
    *aplicar({ slides }) {
      if (slides.length === 0) {
        yield { mensagem: 'a aula não tem nenhuma section.' };
        return;
      }
      if (slides[0].getAttribute('data-layout') !== 'capa') {
        yield { ...onde(slides, slides[0]), mensagem: `a aula começa com ${nomeDoLayout(slides[0])}, não com capa.` };
      }
    },
  },
  {
    nome: 'estrutura.ultimo-slide',
    *aplicar({ slides }) {
      const ultimo = slides.at(-1);
      if (ultimo && ultimo.getAttribute('data-layout') !== 'encerramento') {
        yield { ...onde(slides, ultimo), mensagem: `a aula termina com ${nomeDoLayout(ultimo)}, não com encerramento.` };
      }
    },
  },
  {
    nome: 'estrutura.layout',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const layout = secao.getAttribute('data-layout');
        if (layout === null) yield { ...onde(slides, secao), mensagem: 'section sem data-layout.', trecho: trechoDe(secao) };
        else if (!Object.hasOwn(contrato.layouts, layout)) {
          yield { ...onde(slides, secao), mensagem: `data-layout "${layout}" não existe no contrato.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.metadados',
    *aplicar({ doc, contrato, unidades }) {
      for (const [nome, regra] of Object.entries(contrato.metadados)) {
        const valor = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
        if (!valor) {
          if (regra.obrigatorio) yield { mensagem: `falta a meta "${nome}" no <head>.` };
          continue;
        }
        if (regra.tipo === 'data-iso' && !DATA_ISO.test(valor)) {
          yield { mensagem: `a meta "${nome}" não está em AAAA-MM-DD: "${valor}".` };
        }
        if (regra.tipo === 'unidade' && unidades && !Object.hasOwn(unidades, valor)) {
          yield { mensagem: `unidade desconhecida: "${valor}". Use ${Object.keys(unidades).join(' ou ')}.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.colunas',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const colunas of secao.querySelectorAll('div.colunas')) {
          const grade = colunas.getAttribute('data-grade');
          const esperadas = contrato.grades[grade];
          if (!esperadas) continue; // grade fora do contrato é vocabulario.atributo, no marco 4b
          const filhos = colunas.children.length;
          if (filhos !== esperadas) {
            yield {
              ...onde(slides, secao),
              mensagem: `div.colunas com data-grade "${grade}" tem ${plural(filhos, 'filho', 'filhos')} (esperados ${esperadas}).`,
              trecho: trechoDe(colunas),
            };
          }
        }
      }
    },
  },
  {
    nome: 'estrutura.blocos',
    *aplicar({ slides, contrato }) {
      const aberturas = slides.filter((secao) => secao.getAttribute('data-layout') === 'abertura').length;
      const minimo = contrato.limites['blocos.min'];
      const maximo = contrato.limites['blocos.maxFileira'];
      if (aberturas < minimo) yield { mensagem: `a aula tem ${plural(aberturas, 'abertura', 'aberturas')}; o mínimo é ${minimo}.` };
      else if (aberturas > maximo) yield { mensagem: `a aula tem ${aberturas} blocos; acima de ${maximo} o mapa vira contador.` };
    },
  },
  {
    nome: 'estrutura.id-duplicado',
    *aplicar({ doc, slides }) {
      const vistos = new Set();
      for (const elemento of doc.body.querySelectorAll('[id]')) {
        const id = elemento.getAttribute('id');
        if (vistos.has(id)) {
          const secao = elemento.closest('section');
          yield { ...(secao ? onde(slides, secao) : {}), mensagem: `id repetido: "${id}".`, trecho: trechoDe(elemento) };
        }
        vistos.add(id);
      }
    },
  },
  {
    nome: 'estrutura.id-ausente',
    *aplicar({ slides }) {
      for (const secao of slides) {
        if (!secao.getAttribute('id') && !SEM_ID.includes(secao.getAttribute('data-layout'))) {
          yield { ...onde(slides, secao), mensagem: `slide de layout ${nomeDoLayout(secao)} sem id.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.nome-curto',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['abertura.h2.caracteresSemDataCurto'];
      for (const secao of slides) {
        if (secao.getAttribute('data-layout') !== 'abertura' || secao.hasAttribute('data-curto')) continue;
        const titulo = textoDeTitulo(secao.querySelector('h2'));
        if (titulo.length > limite) {
          yield { ...onde(slides, secao), mensagem: `abertura com título de ${titulo.length} caracteres (máx. ${limite}) e sem data-curto.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.passos-mistos',
    *aplicar({ slides }) {
      for (const secao of slides) {
        const valores = [...secao.querySelectorAll('[data-passo]')].map((el) => el.getAttribute('data-passo'));
        // \passo{n}{…} no TeX do fonte também é passo numerado, e só o validador o vê antes do KaTeX renderizar.
        const noTex = segmentosDeTex(secao.textContent)
          .filter((segmento) => segmento.tipo !== 'texto')
          .reduce((total, segmento) => total + (segmento.tex.match(PASSO_NO_TEX)?.length ?? 0), 0);
        const semNumero = valores.filter((valor) => valor === '').length;
        const numerados = valores.filter((valor) => valor !== '').length + noTex;
        if (semNumero > 0 && numerados > 0) {
          yield {
            ...onde(slides, secao),
            mensagem: `o slide mistura ${plural(semNumero, 'passo sem número', 'passos sem número')} com ${plural(numerados, 'numerado', 'numerados')}.`,
          };
        }
      }
    },
  },
  {
    nome: 'estrutura.notas-ausentes',
    *aplicar({ slides }) {
      for (const secao of slides) {
        if (COM_NOTAS.includes(secao.getAttribute('data-layout')) && !secao.querySelector(':scope > aside.notas')) {
          yield { ...onde(slides, secao), mensagem: `slide de layout ${nomeDoLayout(secao)} sem notas do apresentador.` };
        }
      }
    },
  },
];
