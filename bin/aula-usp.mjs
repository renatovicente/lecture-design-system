#!/usr/bin/env node
// CLI do Aula USP (spec 8.1). Neste marco, `servir`, `validar`, `build` e `dist`.
import { statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
// build/servir.mjs, build/validar.mjs, build/bundle.mjs e build/cobertura.mjs só são importados
// dentro do comando que precisa de cada um (import dinâmico): todos leem disco ou uma dependência
// externa no escopo do próprio módulo (contrato/contrato.json; build/validar.mjs ainda importa
// linkedom; build/bundle.mjs importa esbuild; build/cobertura.mjs importa fontkit), e um import
// estático rodaria essa leitura antes de qualquer try/catch — uma dependência ou um arquivo do
// sistema ausente viraria stack trace e saída 1 para o comando (a spec 8.1 pede saída 2). A regra
// vale para todo módulo de build/: nada que leia disco ou dependência externa no escopo do módulo
// entra na CLI por import estático.
import { linhaDe, cabecalhoDe, plural } from '../validador/validar.js';

const USO = 'uso: aula-usp servir <pasta> [--porta 8765]\n'
  + '       aula-usp validar <pasta> [--json]\n'
  + '       aula-usp build <pasta> [--sem-pdf]\n'
  + '       aula-usp dist';

function sair(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

// flagsPermitidas é específico de quem chama (servir: --porta; validar: --json; build: --sem-pdf,
// spec 8.1): sem isso, uma flag de OUTRO comando (--sem-pdf em validar, --porta em build) era aceita
// e ignorada em silêncio — o oposto da regra que este arquivo já segue para flag desconhecida
// ("melhor recusar que ignorar em silêncio"), e que vale tanto para uma flag que não existe quanto
// para uma que existe, mas não é deste comando (achado numa rodada de revisão da tarefa 3).
function lerArgumentos(argumentos, flagsPermitidas) {
  const opcoes = { porta: 8765 };
  const posicionais = [];
  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i] === '--porta' && flagsPermitidas.has('--porta')) opcoes.porta = Number(argumentos[++i]);
    else if (argumentos[i] === '--json' && flagsPermitidas.has('--json')) opcoes.json = true;
    else if (argumentos[i] === '--sem-pdf' && flagsPermitidas.has('--sem-pdf')) opcoes.semPdf = true;
    else if (argumentos[i].startsWith('--')) sair(USO); // desconhecida OU de outro comando: mesmo tratamento
    else posicionais.push(argumentos[i]);
  }
  if (posicionais.length > 1) sair(USO); // um alvo só; mais de um é engano do autor, não uma lista
  return { opcoes, posicionais };
}

const FLAGS_SERVIR = new Set(['--porta']);
const FLAGS_VALIDAR = new Set(['--json']);
const FLAGS_BUILD = new Set(['--sem-pdf']);

async function servir(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_SERVIR);
  const [pasta] = posicionais;
  if (!pasta || !Number.isInteger(opcoes.porta) || opcoes.porta < 0 || opcoes.porta > 65535) sair(USO);
  let ehPasta = false;
  try {
    ehPasta = statSync(pasta).isDirectory();
  } catch {
    ehPasta = false;
  }
  if (!ehPasta) sair(`pasta não encontrada: ${pasta}`);
  let servidor;
  try {
    const { criarServidor } = await import('../build/servir.mjs');
    servidor = criarServidor({ pastaAula: pasta });
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  servidor.on('error', (erro) => sair(`não foi possível servir: ${erro.message}`));
  servidor.listen(opcoes.porta, '127.0.0.1', () => {
    console.log(`servindo ${pasta} em http://127.0.0.1:${servidor.address().port}/`);
  });
}

async function validarComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_VALIDAR);
  const [alvo] = posicionais;
  if (!alvo) sair(USO);
  let resultado;
  try {
    const { validarArquivo } = await import('../build/validar.mjs');
    resultado = await validarArquivo(alvo);
  } catch (erro) {
    // "não encontrei" só quando o caminho ausente é o da própria aula (o alvo, ou o index.html
    // dentro dele); ENOENT de qualquer outro arquivo — contrato, unidades, ou a própria dependência
    // ausente do import acima — é o ambiente que está com problema, não um engano de caminho.
    const alvoAbsoluto = resolve(alvo);
    const ehCaminhoDaAula = erro.code === 'ENOENT'
      && (erro.path === alvoAbsoluto || erro.path === join(alvoAbsoluto, 'index.html'));
    if (ehCaminhoDaAula) sair(`não encontrei a aula em ${alvo}: ${erro.message}`);
    else sair(`falha de ambiente: ${erro.message}`);
  }
  const { achados, erros, avisoDeComposicao } = resultado;
  // Vai para stderr, não stdout: --json manda só o array de achados para o cano (spec 9.1), e um
  // aviso solto ali quebraria o parse. Spec 8.1: falta de Chrome não é falha, é aviso para o autor.
  if (avisoDeComposicao) console.error(`Aula USP: aviso: ${avisoDeComposicao}`);
  if (opcoes.json) console.log(JSON.stringify(achados, null, 2));
  else {
    for (const achado of achados) console.log(linhaDe(achado));
    console.log(cabecalhoDe(achados));
  }
  // process.exitCode, não process.exit: process.exit descarta escrita pendente em stdout, e num
  // cano (o jeito que --json costuma ser consumido) o JSON grande sai truncado.
  process.exitCode = erros > 0 ? 1 : 0;
}

async function buildComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_BUILD);
  const [pasta] = posicionais;
  if (!pasta) sair(USO);
  // Dois try, não um (I4 da revisão final). O de cima é o ÚNICO lugar onde falta de dependência pode
  // aparecer — build/validar.mjs e build/build.mjs só entram por import dinâmico (mesma regra do
  // topo do arquivo), e build/build.mjs arrasta playwright-core e pdf-lib —, e é só nele que "rode
  // npm install" é o conselho certo. Com um try só, QUALQUER estouro das sete etapas saía como
  // "falha de ambiente: … rode npm install na pasta do sistema": uma montagem que falha na etapa 6,
  // uma pasta sem permissão de escrita, um disco cheio. Nenhum npm install conserta nada disso, e o
  // autor perdia a mensagem que dizia o que de fato quebrou.
  let caminhoDaAula;
  let build;
  try {
    ({ caminhoDaAula } = await import('../build/validar.mjs'));
    ({ build } = await import('../build/build.mjs'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  let resultado;
  try {
    const alvo = caminhoDaAula(pasta); // ENOENT sobe: mesma origem de erro que validarComando trata abaixo
    resultado = await build({
      raiz: new URL('../', import.meta.url),
      caminhoDaAula: pathToFileURL(alvo),
      destino: join(dirname(alvo), 'dist'), // spec 3.3: "escreve só em <pasta>/dist/"
      semPdf: opcoes.semPdf ?? false,
    });
  } catch (erro) {
    // Mesmo critério de validarComando para o caminho da aula: "não encontrei" só quando o ausente é
    // o alvo (ou o index.html dentro dele). Tudo o mais que chega aqui já rodou — os imports
    // passaram —, então é falha do pipeline, e a mensagem de verdade (inclusive o caminho de um
    // ENOENT de arquivo do sistema) aponta melhor que um conselho de instalação. A saída continua 2
    // (spec 8.1: "não deu para rodar"), como antes.
    const alvoAbsoluto = resolve(pasta);
    const ehCaminhoDaAula = erro.code === 'ENOENT'
      && (erro.path === alvoAbsoluto || erro.path === join(alvoAbsoluto, 'index.html'));
    if (ehCaminhoDaAula) sair(`não encontrei a aula em ${pasta}: ${erro.message}`);
    else sair(`o build falhou: ${erro.message}`);
  }
  const { achados, codigo, avisoSemChrome, paginas } = resultado;
  // Vai para stderr, como o aviso equivalente de validarComando: spec 8.1, falta de Chrome não é
  // falha, é aviso para o autor — `build` não tem --json (spec 8.1 só lista --sem-pdf para este
  // comando), mas o aviso fica fora do stdout de qualquer forma, pela mesma razão daquele comando.
  if (avisoSemChrome) console.error(`Aula USP: aviso: ${avisoSemChrome}`);
  for (const achado of achados) console.log(linhaDe(achado));
  console.log(cabecalhoDe(achados));
  if (paginas !== undefined) console.log(`PDF: ${plural(paginas, 'página', 'páginas')}.`);
  process.exitCode = codigo;
}

async function distComando(argumentos) {
  if (argumentos.length > 0) sair(USO); // dist não recebe alvo: gera sempre o do próprio sistema
  const raiz = new URL('../', import.meta.url);
  try {
    const [{ empacotar }, { escreverCobertura }] = await Promise.all([
      import('../build/bundle.mjs'),
      import('../build/cobertura.mjs'),
    ]);
    // cobertura ANTES de empacotar: desde a rodada de correção 1 (item 1), montar/dist.js importa
    // validador/cobertura.json estaticamente para embuti-lo em aula-usp.js — se empacotar rodasse
    // primeiro, o esbuild leria o cobertura.json da execução ANTERIOR de `aula-usp dist`, sempre uma
    // geração atrasado em relação às fontes que o mesmo artefato também embute.
    const cobertura = await escreverCobertura({ raiz });
    const arquivos = await empacotar({ raiz });
    for (const [nome, { bytes }] of arquivos) console.log(`dist/${nome} · ${(bytes / 1024).toFixed(1)} kB`);
    console.log(`validador/cobertura.json · ${cobertura.fontes.length} fontes`);
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else if (comando === 'validar') validarComando(argumentos);
else if (comando === 'build') buildComando(argumentos);
else if (comando === 'dist') distComando(argumentos);
else sair(USO);
