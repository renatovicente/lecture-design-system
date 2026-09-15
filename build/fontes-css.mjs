// Gera estilos/fontes.css (modo de desenvolvimento, URLs relativas) a partir de assets/fontes/fontes.json.
//   node build/fontes-css.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);

export function gerarFontesCss(manifesto) {
  const faces = manifesto.map((fonte) => {
    const pesos = fonte.pesos.length > 1
      ? `${Math.min(...fonte.pesos)} ${Math.max(...fonte.pesos)}`
      : String(fonte.pesos[0]);
    return [
      '@font-face {',
      `  font-family: '${fonte.familia}';`,
      `  font-style: ${fonte.estilo};`,
      `  font-weight: ${pesos};`,
      '  font-display: swap;',
      `  src: url('../assets/fontes/${fonte.arquivo}') format('woff2');`,
      `  unicode-range: ${fonte.unicodeRange};`,
      '}',
    ].join('\n');
  });
  return `/* Gerado por build/fontes-css.mjs a partir de assets/fontes/fontes.json. Não editar à mão. */\n${faces.join('\n')}\n`;
}

async function principal() {
  const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', RAIZ), 'utf8'));
  await writeFile(new URL('estilos/fontes.css', RAIZ), gerarFontesCss(manifesto));
  console.log(`estilos/fontes.css gerado com ${manifesto.length} @font-face`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
