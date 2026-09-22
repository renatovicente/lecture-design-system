// Gera assets/aula-usp.mplstyle a partir de tokens/aula-usp.tokens.json.
//   node build/mplstyle.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lerTokens, simplificar } from './tokens.mjs';

const RAIZ = new URL('../', import.meta.url);

// Arquivos .mplstyle são lidos linha a linha pelo matplotlib: '#' abre comentário até o
// fim da linha, inclusive dentro do próprio valor. Uma cor hexadecimal com '#' apaga a
// linha inteira em silêncio — por isso toda cor aqui sai sem o prefixo (spec 7.2).
const semAlmohadilha = (hex) => hex.replace(/^#/, '');

export function gerarMplstyle(tokens) {
  const s = simplificar(tokens);
  const ciclo = [s.cor.tinta, s.cor.azul, s.cor.cinza].map(semAlmohadilha);
  const linhas = [
    '# Gerado por build/mplstyle.mjs a partir de tokens/aula-usp.tokens.json. Não editar à mão.',
    '# Cores hexadecimais aqui NÃO levam "#" — em .mplstyle, "#" abre comentário até o fim da linha.',
    '',
    `axes.prop_cycle: cycler('color', ['${ciclo.join("', '")}'])`,
    `axes.linewidth: ${s.regua.normal}`,
    'axes.spines.top: False',
    'axes.spines.right: False',
    'axes.grid: True',
    'axes.grid.axis: y',
    `grid.color: ${semAlmohadilha(s.cor.linha)}`,
    `font.family: ${s.fonte.sans[0]}`,
    '',
  ];
  return linhas.join('\n');
}

async function principal() {
  const tokens = await lerTokens();
  await writeFile(new URL('assets/aula-usp.mplstyle', RAIZ), gerarMplstyle(tokens));
  console.log('assets/aula-usp.mplstyle gerado');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
