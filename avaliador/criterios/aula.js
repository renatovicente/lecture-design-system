// Critérios medidos de alcance "aula" (spec 2026-09-28, 3.1): olham a aula inteira e devolvem achados
// sem slide. Com --slide, avaliar() não os roda. Os limiares e as listas vêm da rubrica.
import { segmentosDeTex } from '../../componentes/tex.js';
import { plural } from '../../validador/validar.js';

const NOTAS = 'aside.notas';

// Há fórmula em destaque (\[ … \]) no slide, fora das notas e do código? Procura em todo nó de texto,
// e não só nos filhos diretos da section: a fórmula pode estar numa coluna ou numa caixa.
function temTexDestaque(secao) {
  const pilha = [secao];
  while (pilha.length) {
    const no = pilha.pop();
    if (no.nodeType === 3) {
      if (segmentosDeTex(no.data).some((segmento) => segmento.tipo === 'destaque')) return true;
      continue;
    }
    if (no.nodeType !== 1 || (no !== secao && no.matches(`${NOTAS}, pre, code`))) continue;
    pilha.push(...no.childNodes);
  }
  return false;
}

// `visuais` é a lista da rubrica: seletores CSS, e o nome `tex-destaque` que o contrato já usa para a
// fórmula em destaque (que é texto, e não elemento).
function temVisual(secao, visuais) {
  return visuais.some((visual) => (visual === 'tex-destaque'
    ? temTexDestaque(secao)
    : [...secao.querySelectorAll(visual)].some((elemento) => !elemento.closest(NOTAS))));
}

const porcento = (fracao) => `${Math.round(fracao * 100)}%`;

export const CRITERIOS_DE_AULA = {
  'so-texto': {
    alcance: 'aula',
    *aplicar({ slides, regra }) {
      const medidos = slides.filter((secao) => regra.layouts.includes(secao.getAttribute('data-layout')));
      if (medidos.length === 0) return;
      const soTexto = medidos.filter((secao) => !temVisual(secao, regra.visuais));
      const fracao = soTexto.length / medidos.length;
      if (fracao <= regra.maxFracao) return;
      const quais = soTexto.map((secao) => {
        const id = secao.getAttribute('id');
        return `${slides.indexOf(secao) + 1}${id ? ` #${id}` : ''}`;
      });
      yield {
        slide: null,
        id: null,
        mensagem: `${soTexto.length} de ${medidos.length} slides de conteúdo só têm texto (${porcento(fracao)}; rubrica: até ${porcento(regra.maxFracao)}).`,
        trecho: `slides ${quais.join(', ')}`,
      };
    },
  },
  tempo: {
    alcance: 'aula',
    *aplicar({ slides, regra, minutos }) {
      if (minutos === undefined || minutos === null) return;
      const contados = slides.filter((secao) => !regra.layoutsSemTempo.includes(secao.getAttribute('data-layout'))).length;
      const cabem = minutos / regra.minutosPorSlide;
      const teto = regra.fatorMaximo * cabem;
      if (contados <= teto) return;
      yield {
        slide: null,
        id: null,
        mensagem: `${plural(contados, 'slide toma', 'slides tomam')} tempo para ${plural(minutos, 'minuto', 'minutos')}: acima de ${String(Number(teto.toFixed(1))).replace('.', ',')} (${String(regra.fatorMaximo).replace('.', ',')} × ${cabem}).`,
        trecho: null,
      };
    },
  },
};
