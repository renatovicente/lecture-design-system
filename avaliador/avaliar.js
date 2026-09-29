// Avaliador (spec 2026-09-28, seções 3 e 4): julga uma aula já válida pelas boas práticas de Naegle
// (2021) e da UCSD. Só os critérios MEDIDOS moram aqui; os julgados são da skill, que olha as fotos.
//
// Do lado do navegador, como validador/: só API padrão do DOM, nenhum módulo do Node. A rubrica e o contrato
// chegam por parâmetro. Avaliar não é validar: nenhum achado daqui é erro — só `alerta` e `conselho`,
// e o nível vem da rubrica, nunca do código.
import { slidesDoFonte, plural } from '../validador/validar.js';
import { CRITERIOS_DE_SLIDE } from './criterios/slide.js';
import { CRITERIOS_DE_AULA } from './criterios/aula.js';

// O registro, por id. Um critério medido da rubrica que não esteja aqui é defeito, e avaliar() estoura
// em vez de pulá-lo calado (tests/unit/avaliador.test.mjs confere o registro contra a spec).
export const CRITERIOS = { ...CRITERIOS_DE_SLIDE, ...CRITERIOS_DE_AULA };

const CAIXA = { alerta: 'ALERTA', conselho: 'CONSELHO' };

const fonteDe = (criterio) => criterio.fonte.join(', ');

// --slide aceita o id da section ou a posição (começando em 1, como o validador conta), com a regra de
// `aula-usp slide` e de `validar --slide` (build/secoes.mjs, resolverAlvo): um id que existe ganha de
// um número que parece posição, e um número sem id igual é posição. A regra é repetida aqui, e não
// importada, porque avaliador/ é do lado do navegador e não importa de build/; quem prova que as duas
// concordam é tests/unit/secoes.test.mjs ("os três comandos escolhem o mesmo slide"). Revisão da
// 1.2.0: com "número é sempre posição", numa aula com id="5" o avaliar e o slide apontavam slides
// diferentes para o alvo "5", e a skill de corrigir fotografaria um slide e trocaria outro.
export function indiceDoAlvo(slides, alvo) {
  const texto = String(alvo);
  const porId = slides.findIndex((candidata) => candidata.getAttribute('id') === texto);
  if (porId !== -1) return porId;
  if (/^[0-9]+$/.test(texto) && Number(texto) >= 1 && Number(texto) <= slides.length) return Number(texto) - 1;
  return -1;
}

function escolherSlide(slides, slide) {
  const texto = String(slide);
  const secao = slides[indiceDoAlvo(slides, texto)];
  if (!secao) throw new Error(`não há slide "${texto}" nesta aula: use a posição (1 a ${slides.length}) ou o id da section.`);
  return secao;
}

function medidosDaRubrica(rubrica) {
  return Object.entries(rubrica.criterios).filter(([, criterio]) => criterio.tipo === 'medido');
}

export function avaliar(doc, { rubrica, contrato, minutos, slide } = {}) {
  doc.body.normalize(); // como validar(): o linkedom parte o texto em cada entidade, e o TeX some
  const slides = slidesDoFonte(doc.body);
  const alvos = slide === undefined || slide === null ? slides : [escolherSlide(slides, slide)];
  const achados = [];
  medidosDaRubrica(rubrica).forEach(([id, regra], ordem) => {
    const implementacao = CRITERIOS[id];
    if (!implementacao) throw new Error(`avaliador: o critério medido "${id}" da rubrica não tem implementação`);
    if (implementacao.alcance !== regra.alcance) {
      throw new Error(`avaliador: o critério "${id}" é de alcance "${regra.alcance}" na rubrica e "${implementacao.alcance}" no código`);
    }
    const contexto = { slides, contrato, regra, minutos };
    const brutos = regra.alcance === 'aula'
      ? (alvos === slides ? [...implementacao.aplicar(contexto)] : [])
      : alvos.flatMap((secao) => [...implementacao.aplicar(secao, contexto)]);
    for (const bruto of brutos) {
      achados.push({
        slide: bruto.slide ?? null,
        id: bruto.id ?? null,
        criterio: id,
        fonte: fonteDe(regra),
        tipo: 'medido',
        nivel: regra.nivel,
        mensagem: bruto.mensagem,
        acao: regra.acao,
        trecho: bruto.trecho ?? null,
        ordem,
      });
    }
  });
  // A ordem do validador: o que é da aula inteira primeiro, depois por slide, e dentro do slide na
  // ordem da rubrica.
  achados.sort((a, b) => (a.slide ?? 0) - (b.slide ?? 0) || a.ordem - b.ordem);
  return achados.map(({ ordem, ...achado }) => achado);
}

export function linhaDeAvaliacao({ nivel, slide, id, criterio, fonte, mensagem, acao, trecho }) {
  const lugar = slide === null ? 'aula' : `slide ${slide}${id ? ` #${id}` : ''}`;
  const cabeca = `${CAIXA[nivel]} · ${lugar} · ${criterio} (${fonte}) · ${mensagem} ${acao}`;
  return trecho ? `${cabeca}\n    ${trecho}` : cabeca;
}

// A contagem que vai no JSON de --json: o total e, por critério medido da rubrica, quantos alertas e
// quantos conselhos — inclusive os critérios que não acharam nada, com zero.
export function contarAvaliacao(achados, rubrica) {
  const vazio = () => ({ alertas: 0, conselhos: 0 });
  const criterios = Object.fromEntries(medidosDaRubrica(rubrica).map(([id]) => [id, vazio()]));
  const total = vazio();
  for (const { criterio, nivel } of achados) {
    const chave = nivel === 'alerta' ? 'alertas' : 'conselhos';
    total[chave] += 1;
    if (criterios[criterio]) criterios[criterio][chave] += 1;
  }
  return { total, criterios };
}

const contagem = ({ alertas, conselhos }) => `${plural(alertas, 'alerta', 'alertas')}, ${plural(conselhos, 'conselho', 'conselhos')}`;

export function resumoDaAvaliacao(achados, rubrica) {
  const { total, criterios } = contarAvaliacao(achados, rubrica);
  const linhas = [`Avaliação Aula USP: ${contagem(total)}`];
  for (const [id, numeros] of Object.entries(criterios)) {
    linhas.push(`  ${id} (${fonteDe(rubrica.criterios[id])}) · ${contagem(numeros)}`);
  }
  return linhas.join('\n');
}
