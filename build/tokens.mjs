// Gera estilos/tokens.css e tokens/tokens.js a partir de tokens/aula-usp.tokens.json.
//   node build/tokens.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CABECALHO = 'Gerado por build/tokens.mjs a partir de tokens/aula-usp.tokens.json. Não editar à mão.';

export async function lerTokens(caminho = resolve(RAIZ, 'tokens/aula-usp.tokens.json')) {
  return JSON.parse(await readFile(caminho, 'utf8'));
}

const kebab = (s) => s
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  .toLowerCase();

// "{fonte.sans}" → valor do token referenciado
function resolver(tokens, valor) {
  if (typeof valor !== 'string' || !/^\{[^}]+\}$/.test(valor)) return valor;
  const alvo = valor.slice(1, -1).split('.').reduce((no, chave) => no?.[chave], tokens);
  if (!alvo || !('$value' in alvo)) throw new Error(`referência não encontrada: ${valor}`);
  return alvo.$value;
}

// [nome, token, tipo] de cada filho com $value, herdando $type do grupo
function filhos(grupo) {
  return Object.entries(grupo)
    .filter(([nome, v]) => !nome.startsWith('$') && v && typeof v === 'object' && '$value' in v)
    .map(([nome, v]) => [nome, v, v.$type ?? grupo.$type]);
}

const px = (d) => {
  if (d.unit !== 'px') throw new Error(`unidade não suportada: ${d.unit}`);
  return d.value;
};
const extensao = (token) => token.$extensions?.['br.usp.aula'] ?? {};
const familiaCss = (lista) => lista.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');

export function simplificar(tokens) {
  const saida = {};
  for (const [grupoNome, grupo] of Object.entries(tokens)) {
    if (grupoNome.startsWith('$')) continue;
    saida[grupoNome] = {};
    for (const [nome, token, tipo] of filhos(grupo)) {
      const v = resolver(tokens, token.$value);
      if (tipo === 'color') saida[grupoNome][nome] = v.hex;
      else if (tipo === 'dimension') saida[grupoNome][nome] = px(v);
      else if (tipo === 'number' || tipo === 'fontWeight') saida[grupoNome][nome] = v;
      else if (tipo === 'fontFamily') saida[grupoNome][nome] = v;
      else if (tipo === 'typography') {
        const ext = extensao(token);
        saida[grupoNome][nome] = {
          familia: resolver(tokens, v.fontFamily),
          tamanho: px(v.fontSize),
          peso: v.fontWeight,
          entrelinha: v.lineHeight,
          tracking: px(v.letterSpacing),
          ...(ext.caixa ? { caixa: ext.caixa } : {}),
          ...(ext.pesoEnfase ? { pesoEnfase: ext.pesoEnfase } : {}),
        };
      } else throw new Error(`tipo não suportado: ${tipo} em ${grupoNome}.${nome}`);
    }
  }
  return saida;
}

export function gerarCss(tokens) {
  const s = simplificar(tokens);
  const linhas = [];
  for (const [grupo, itens] of Object.entries(s)) {
    for (const [nome, valor] of Object.entries(itens)) {
      const base = `--${kebab(grupo)}-${kebab(nome)}`;
      const tipo = tokens[grupo][nome].$type ?? tokens[grupo].$type;
      if (tipo === 'color') linhas.push([base, valor]);
      else if (tipo === 'dimension') linhas.push([base, `${valor}px`]);
      else if (tipo === 'number' || tipo === 'fontWeight') linhas.push([base, String(valor)]);
      else if (tipo === 'fontFamily') linhas.push([base, familiaCss(valor)]);
      else if (tipo === 'typography') {
        linhas.push([`${base}-familia`, familiaCss(valor.familia)]);
        linhas.push([`${base}-tamanho`, `${valor.tamanho}px`]);
        linhas.push([`${base}-peso`, String(valor.peso)]);
        linhas.push([`${base}-entrelinha`, String(valor.entrelinha)]);
        linhas.push([`${base}-tracking`, `${valor.tracking}px`]);
        if (valor.caixa) linhas.push([`${base}-caixa`, 'uppercase']);
        if (valor.pesoEnfase) linhas.push([`${base}-peso-enfase`, String(valor.pesoEnfase)]);
      } else throw new Error(`tipo não suportado: ${tipo} em ${grupo}.${nome}`);
    }
  }
  return `/* ${CABECALHO} */\n:root {\n${linhas.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;
}

export function gerarJs(tokens) {
  return `// ${CABECALHO}\nexport const tokens = ${JSON.stringify(simplificar(tokens), null, 2)};\nexport default tokens;\n`;
}

export function luminancia(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(hexA, hexB) {
  const [claro, escuro] = [luminancia(hexA), luminancia(hexB)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

async function principal() {
  const tokens = await lerTokens();
  await mkdir(resolve(RAIZ, 'estilos'), { recursive: true });
  await writeFile(resolve(RAIZ, 'estilos/tokens.css'), gerarCss(tokens));
  await writeFile(resolve(RAIZ, 'tokens/tokens.js'), gerarJs(tokens));
  console.log('estilos/tokens.css e tokens/tokens.js gerados');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
