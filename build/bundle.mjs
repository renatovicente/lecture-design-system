// Empacotador de dist/ (spec 3.3 etapa 4, 3.5 e 8.1). Node, não navegador.
// Os quatro scripts da spec, mais uma gramática do Shiki por linguagem do contrato.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

// sha384 em base64, o formato que o atributo integrity espera (spec 8.1; o `pacotes` do marco 6 escreve).
const integridade = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

const COMUM = {
  bundle: true,
  minify: true,
  target: ['chrome120'],
  logLevel: 'silent',
  write: false,
  // O CSS entra como TEXTO (montar/dist.js o importa e injeta), e binário como data URI.
  loader: { '.css': 'text', '.woff2': 'dataurl', '.svg': 'text', '.png': 'dataurl' },
};

// A CSS do KaTeX com as 20 woff2 dentro. Só woff2: woff e ttf são o fallback para navegadores que
// este sistema não atende (spec 8.2 pede Chrome), e embutir os três triplicaria 296 kB à toa.
async function cssDoTexComFontes(raiz) {
  const pastaKatex = new URL('node_modules/katex/dist/', raiz);
  const css = await readFile(new URL('katex.min.css', pastaKatex), 'utf8');
  const arquivos = [...new Set([...css.matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]))];
  const dados = new Map();
  for (const arquivo of arquivos.filter((a) => a.endsWith('.woff2'))) {
    dados.set(arquivo, (await readFile(new URL(`fonts/${arquivo}`, pastaKatex))).toString('base64'));
  }
  return css.replace(/url\(fonts\/([^)]+)\)/g, (_, arquivo) => {
    const base64 = dados.get(arquivo);
    // Sem data: a regra @font-face que sobrar aponta para lugar nenhum. url() vazio é a forma de
    // dizer "não tenho", e o Chrome simplesmente pula essa fonte da lista de src.
    return base64 ? `url(data:font/woff2;base64,${base64})` : 'url()';
  });
}

// Achado na rodada de correção 1 (item 2) do relatório da tarefa 2, ao testar uma fixture fora de
// especime/. estilos/fontes.css (gerado por build/fontes-css.mjs) referencia as fontes do sistema por
// url('../assets/fontes/X.woff2') — caminho relativo ao PRÓPRIO arquivo CSS. O loader 'text' não olha
// para dentro do CSS, então esse texto entra intacto em aula-usp.js; montar/dist.js injeta como
// <style> inline, e é aí que a conta muda: o navegador resolve url() de <style> inline contra a
// página HOSPEDEIRA, não contra o pacote. Para os três decks de especime/ (um nível abaixo da raiz,
// como estilos/) o acidente acerta. Para tests/fixtures/painel/demo.html (três níveis abaixo) não:
// medido, dois 404 de geist-*.woff2 ao abrir a fixture pelo dist/. Mesma classe do fato 8 do plano
// (fonte de CSS injetada não pode depender de profundidade de quem hospeda), mesmo remédio: fonte
// vira data URI. Plugin, não edição em montar/dist.js — a tarefa 1 já revisou aquele arquivo, e o
// import ali (`import fontes from '../estilos/fontes.css'`) não precisa saber que isto acontece.
function pluginFontesDoSistemaEmbutidas(raiz) {
  return {
    name: 'fontes-do-sistema-embutidas',
    setup(build) {
      build.onLoad({ filter: /estilos\/fontes\.css$/ }, async (args) => {
        const css = await readFile(args.path, 'utf8');
        const pastaFontes = new URL('assets/fontes/', raiz);
        const arquivos = [...new Set([...css.matchAll(/url\('\.\.\/assets\/fontes\/([^']+)'\)/g)].map((m) => m[1]))];
        const dados = new Map();
        for (const arquivo of arquivos) {
          dados.set(arquivo, (await readFile(new URL(arquivo, pastaFontes))).toString('base64'));
        }
        const contents = css.replace(/url\('\.\.\/assets\/fontes\/([^']+)'\)/g, (_, arquivo) => {
          const base64 = dados.get(arquivo);
          return base64 ? `url(data:font/woff2;base64,${base64})` : 'url()';
        });
        return { contents, loader: 'text' };
      });
    },
  };
}

export async function empacotar({ raiz, escrever = true } = {}) {
  const dir = fileURLToPath(raiz);
  const { linguagens } = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));
  const { version } = JSON.parse(await readFile(new URL('package.json', raiz), 'utf8'));
  const saidas = new Map();

  const guardar = (nome, resultado) => {
    const arquivo = resultado.outputFiles[0];
    saidas.set(nome, { bytes: arquivo.contents.length, integrity: integridade(arquivo.contents), texto: arquivo.text, conteudo: arquivo.contents });
  };

  // 1. o pacote do navegador: CLÁSSICO (iife), pelos motivos na tarefa 1. O plugin embute as fontes
  //    do sistema (Geist/Open Sans) como data URI dentro de estilos/fontes.css — ver o comentário dele.
  guardar('aula-usp.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, entryPoints: ['montar/dist.js'], format: 'iife', plugins: [pluginFontesDoSistemaEmbutidas(raiz)] }));

  // 2. o motor sozinho, que o build do marco 5b põe no lugar da tag do runtime.
  guardar('aula-usp-motor.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, entryPoints: ['motor/motor.js'], format: 'iife', globalName: 'AulaUSPMotor' }));

  // 3. matemática: KaTeX + a CSS dele + as fontes dele. Injeta a própria folha ao ser importado,
  //    para que entrada.js não precise de um ramo só para este caso.
  const entradaTex = `
import katex from 'katex';
const folha = document.createElement('style');
folha.textContent = ${JSON.stringify(await cssDoTexComFontes(raiz))};
document.head.append(folha);
export default katex;
`;
  guardar('aula-usp-tex.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, stdin: { contents: entradaTex, resolveDir: dir, loader: 'js' }, format: 'esm' }));

  // 4. código: o núcleo do Shiki. As gramáticas vão à parte, uma por linguagem — uma aula de
  //    Python não deve baixar a de LaTeX. (E `splitting: true` não serve: colide nos nomes.)
  guardar('aula-usp-codigo.js', await esbuild.build({ ...COMUM, absWorkingDir: dir,
    stdin: { contents: "export * from '@shikijs/primitive'; export * from '@shikijs/engine-javascript';", resolveDir: dir, loader: 'js' }, format: 'esm' }));

  for (const linguagem of linguagens) {
    guardar(`aula-usp-lang-${linguagem}.js`, await esbuild.build({ ...COMUM, absWorkingDir: dir,
      stdin: { contents: `export { default } from '@shikijs/langs/${linguagem}';`, resolveDir: dir, loader: 'js' }, format: 'esm' }));
  }

  if (escrever) {
    await mkdir(new URL('dist/', raiz), { recursive: true });
    for (const [nome, { conteudo }] of saidas) await writeFile(new URL(`dist/${nome}`, raiz), conteudo);
    const arquivos = Object.fromEntries([...saidas].map(([nome, { bytes, integrity }]) => [nome, { bytes, integrity }]));
    // Sem timestamp: um artefato gerado-e-versionado só é confiável se regerar não mudar nada
    // (mesma razão de validador/cobertura.json, tarefa 3 rodada de correção 1, item 3) — compra a
    // guarda de reprodutibilidade em tests/unit/bundle.test.mjs.
    await writeFile(new URL('dist/manifesto.json', raiz),
      `${JSON.stringify({ versao: version, arquivos }, null, 2)}\n`);
  }
  return saidas;
}
