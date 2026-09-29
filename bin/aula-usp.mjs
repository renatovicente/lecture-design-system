#!/usr/bin/env node
// CLI do Aula USP (spec 8.1). Com `novo`, os seis comandos da spec estão implementados; `avaliar`,
// `slide` e `roteiro` são da spec 2026-09-28 (4.1, 5.1 e 6.2).
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// build/servir.mjs, build/validar.mjs, build/bundle.mjs e build/cobertura.mjs só são importados
// dentro do comando que precisa de cada um (import dinâmico): todos leem disco ou uma dependência
// externa no escopo do próprio módulo (contrato/contrato.json; build/validar.mjs ainda importa
// linkedom; build/bundle.mjs importa esbuild; build/cobertura.mjs importa fontkit), e um import
// estático rodaria essa leitura antes de qualquer try/catch — uma dependência ou um arquivo do
// sistema ausente viraria stack trace e saída 1 para o comando (a spec 8.1 pede saída 2). A regra
// vale para todo módulo de build/: nada que leia disco ou dependência externa no escopo do módulo
// entra na CLI por import estático.
import { linhaDe, cabecalhoDe, plural } from '../validador/validar.js';

const USO = 'uso: aula-usp novo <pasta> --unidade ime\n'
  + '       aula-usp servir <pasta> [--porta 8765]\n'
  + '       aula-usp validar <pasta> [--slide <id|n>] [--json]\n'
  + '       aula-usp build <pasta> [--sem-pdf]\n'
  + '       aula-usp avaliar <pasta> [--slide <id|n>] [--minutos N] [--fotos <dir>] [--json]\n'
  + '       aula-usp slide <pasta> <id|n> [--substituir <arquivo> [--dividir] [--forcar]]\n'
  + '       aula-usp roteiro <arquivo.md> <pasta> [--substituir]\n'
  + '       aula-usp dist\n'
  + '       aula-usp pacotes';

function sair(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

// flagsPermitidas é específico de quem chama (servir: --porta; validar: --json; build: --sem-pdf,
// spec 8.1): sem isso, uma flag de OUTRO comando (--sem-pdf em validar, --porta em build) era aceita
// e ignorada em silêncio — o oposto da regra que este arquivo já segue para flag desconhecida
// ("melhor recusar que ignorar em silêncio"), e que vale tanto para uma flag que não existe quanto
// para uma que existe, mas não é deste comando (achado numa rodada de revisão da tarefa 3).
// `maximoDePosicionais` é 1 para todo comando, salvo `slide` e `roteiro`, que recebem dois.
// `booleanas` são as flags que, NESTE comando, não levam valor, mesmo que levem em outro: `--substituir`
// é `--substituir <arquivo>` em `slide` e só `--substituir` em `roteiro`. Elas são lidas antes de
// FLAGS_COM_VALOR, e só para o comando que as declara.
function lerArgumentos(argumentos, flagsPermitidas, maximoDePosicionais = 1, booleanas = new Set()) {
  const opcoes = { porta: 8765 };
  const posicionais = [];
  for (let i = 0; i < argumentos.length; i++) {
    if (booleanas.has(argumentos[i]) && flagsPermitidas.has(argumentos[i])) opcoes[argumentos[i].slice(2)] = true;
    else if (argumentos[i] === '--porta' && flagsPermitidas.has('--porta')) opcoes.porta = Number(argumentos[++i]);
    else if (argumentos[i] === '--json' && flagsPermitidas.has('--json')) opcoes.json = true;
    else if (argumentos[i] === '--sem-pdf' && flagsPermitidas.has('--sem-pdf')) opcoes.semPdf = true;
    else if (argumentos[i] === '--unidade' && flagsPermitidas.has('--unidade')) opcoes.unidade = argumentos[++i];
    else if (argumentos[i] === '--dividir' && flagsPermitidas.has('--dividir')) opcoes.dividir = true;
    else if (argumentos[i] === '--forcar' && flagsPermitidas.has('--forcar')) opcoes.forcar = true;
    else if (FLAGS_COM_VALOR.has(argumentos[i]) && flagsPermitidas.has(argumentos[i])) {
      const valor = argumentos[++i];
      // Sem valor, ou com outra flag no lugar do valor, é engano de uso: `--slide --json` não é o
      // slide "--json".
      if (valor === undefined || valor === '' || valor.startsWith('--')) sair(USO);
      opcoes[FLAGS_COM_VALOR.get(argumentos[i - 1])] = valor;
    }
    else if (argumentos[i].startsWith('--')) sair(USO); // desconhecida OU de outro comando: mesmo tratamento
    else posicionais.push(argumentos[i]);
  }
  if (posicionais.length > maximoDePosicionais) sair(USO); // um alvo só; mais de um é engano do autor, não uma lista
  return { opcoes, posicionais };
}

const FLAGS_SERVIR = new Set(['--porta']);
const FLAGS_VALIDAR = new Set(['--json', '--slide']);
const FLAGS_BUILD = new Set(['--sem-pdf']);
const FLAGS_NOVO = new Set(['--unidade']);
const FLAGS_AVALIAR = new Set(['--slide', '--minutos', '--fotos', '--json']);
const FLAGS_SLIDE = new Set(['--substituir', '--dividir', '--forcar']);
const FLAGS_ROTEIRO = new Set(['--substituir']);

// As flags que levam valor, e o nome da opção que cada uma preenche. Entram em lerArgumentos pelo
// mesmo filtro das outras: fora do conjunto do comando, caem em "desconhecida" e saem com o uso —
// `validar --minutos 3` continua recusado.
const FLAGS_COM_VALOR = new Map([['--slide', 'slide'], ['--minutos', 'minutos'], ['--fotos', 'fotos'], ['--substituir', 'substituir']]);

// O modelo da spec 10.3 — a mesma pasta que `guia/10-estrutura.md` mostra como esqueleto, e que
// `build/guia.mjs` lê para gerar aquele bloco. `novo` copia esta pasta; não guarda uma segunda
// cópia do esqueleto, que divergiria da primeira na primeira vez que alguém editasse uma das duas.
const MODELO = '../modelos/aula/';

// Data local, não UTC: `toISOString()` devolve a data em UTC, e para quem escreve à noite no Brasil
// (UTC-3) isso já é o dia seguinte. A data da aula é do relógio de quem a escreve.
function dataDeHoje(agora = new Date()) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Troca o `content` de uma meta do <head>, e estoura se ela não estiver lá: um modelo sem a meta
// faria `novo` entregar uma aula sem o valor preenchido, e a falta só apareceria no validador, do
// outro lado do comando. A substituição é por FUNÇÃO, como toda injeção de conteúdo deste
// repositório — numa string de substituição `$` é padrão especial.
function trocarMeta(html, nome, valor) {
  const padrao = new RegExp(`(<meta\\s+name="${nome}"\\s+content=")[^"]*(">)`);
  if (!padrao.test(html)) throw new Error(`o modelo não traz a meta "${nome}" no <head>`);
  return html.replace(padrao, (_, antes, depois) => `${antes}${valor}${depois}`);
}

// `aula-usp novo <pasta> --unidade ime` (spec 8.1): copia `modelos/aula/` "com os metadados
// preenchidos".
//
// Das cinco metas do contrato, o comando preenche DUAS — `unidade`, da opção, e `data`, de hoje. As
// outras três (`disciplina`, `aula`, `professor`) ficam com o texto de exemplo do modelo, de
// propósito: um valor inventado para `professor` seria pior que um lugar visivelmente vazio, porque
// "Prof. Nome Sobrenome" numa capa projetada é um engano que o autor vê, e um nome plausível que o
// comando escolheu não é.
function novoComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_NOVO);
  const [pasta] = posicionais;
  if (!pasta) sair(USO);

  let unidades;
  try {
    unidades = JSON.parse(readFileSync(new URL('../assets/marcas/unidades.json', import.meta.url), 'utf8'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}`);
  }
  // Unidade fora do arquivo de marcas é falha de USO (código 2), e não um erro de validação da aula
  // criada: o comando não chega a escrever nada. A lista sai do mesmo arquivo que
  // `estrutura.metadados` consulta — não há uma segunda lista de unidades neste repositório.
  if (!Object.hasOwn(unidades, opcoes.unidade ?? '')) {
    sair(`unidade desconhecida: ${opcoes.unidade ?? '(nenhuma)'}. Use ${Object.keys(unidades).join(' ou ')}.`);
  }

  // Pasta que já existe e tem alguma coisa dentro não é sobrescrita. Uma pasta vazia segue adiante:
  // é o caso de quem criou o diretório antes de chamar o comando.
  let existentes = [];
  try {
    existentes = readdirSync(pasta);
  } catch (erro) {
    if (erro.code !== 'ENOENT') sair(`não foi possível ler ${pasta}: ${erro.message}`);
  }
  if (existentes.length > 0) {
    sair(`${pasta} já existe e não está vazia (${plural(existentes.length, 'item', 'itens')}) — escolha outro nome`);
  }

  // O texto novo sai inteiro ANTES de qualquer escrita: um modelo quebrado (sem uma das metas) para
  // aqui, sem deixar meia pasta no disco de quem chamou.
  const data = dataDeHoje();
  const origem = fileURLToPath(new URL(MODELO, import.meta.url));
  let html;
  try {
    html = readFileSync(join(origem, 'index.html'), 'utf8');
    html = trocarMeta(html, 'unidade', opcoes.unidade);
    html = trocarMeta(html, 'data', data);
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}`);
  }
  try {
    // `dist/` fora da cópia: `aula-usp build modelos/aula` escreve `modelos/aula/dist/` (spec 3.3, e
    // é o que o .gitignore registra), e copiar a saída de uma construção anterior para dentro de uma
    // aula nova entrega ao autor um `dist/` que não é dela.
    cpSync(origem, pasta, { recursive: true, filter: (caminho) => basename(caminho) !== 'dist' });
    writeFileSync(join(pasta, 'index.html'), html);
  } catch (erro) {
    sair(`não foi possível criar ${pasta}: ${erro.message}`);
  }
  console.log(`${pasta} criada a partir de modelos/aula — unidade ${opcoes.unidade}, data ${data}`);
}

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
  let posicao;
  try {
    const { validarArquivo, caminhoDaAula } = await import('../build/validar.mjs');
    // --slide (spec 2026-09-28, 5.1; plano do corrigir, D4): o alvo se resolve ANTES de validar, pelo
    // mesmo localizador e pelo mesmo resolverAlvo de `aula-usp slide`, para os dois comandos nunca
    // discordarem do que é o slide N. Um alvo que não existe sai com 1, sem validar nada.
    if (opcoes.slide !== undefined) {
      const { localizarSecoes, resolverAlvo } = await import('../build/secoes.mjs');
      let secoes;
      try {
        secoes = localizarSecoes(readFileSync(caminhoDaAula(alvo), 'utf8'));
      } catch (erro) {
        if (erro.code) throw erro; // ENOENT e afins: o tratamento de baixo
        recusar(`${alvo}: ${erro.message}`);
      }
      const indice = resolverAlvo(secoes, opcoes.slide);
      if (indice === -1) recusar(`não há slide "${opcoes.slide}" nesta aula (${plural(secoes.length, 'slide', 'slides')}: use um id ou uma posição de 1 a ${secoes.length})`);
      posicao = indice + 1;
    }
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
  const { avisoDeComposicao } = resultado;
  // Com --slide, o relatório e o código de saída são só os daquele slide: a aula foi validada
  // inteira, e o que ficou de fora é contado numa linha, para ninguém tomar o slide limpo pela aula.
  const achados = posicao === undefined ? resultado.achados : resultado.achados.filter((achado) => achado.slide === posicao);
  const erros = posicao === undefined ? resultado.erros : achados.filter((achado) => achado.severidade === 'erro').length;
  // Vai para stderr, não stdout: --json manda só o array de achados para o cano (spec 9.1), e um
  // aviso solto ali quebraria o parse. Spec 8.1: falta de Chrome não é falha, é aviso para o autor.
  if (avisoDeComposicao) console.error(`Aula USP: aviso: ${avisoDeComposicao}`);
  if (opcoes.json) console.log(JSON.stringify(achados, null, 2));
  else {
    for (const achado of achados) console.log(linhaDe(achado));
    console.log(cabecalhoDe(achados));
    if (posicao !== undefined) {
      const daAula = resultado.achados.filter((achado) => achado.slide === null).length;
      const deOutros = resultado.achados.length - achados.length - daAula;
      console.log(`${plural(deOutros, 'achado', 'achados')} em outros slides e ${daAula} da aula, fora deste relatório`);
    }
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

// `aula-usp avaliar` (spec 2026-09-28, 4.1): os critérios medidos da rubrica, por slide e por aula.
// Avaliar não é validar: a saída é 0 com a avaliação feita, com ou sem alertas, e 2 com falha de
// ambiente — nunca 1. Uma aula com erro de validação não é avaliada: sai com 0 e a mensagem
// "valide primeiro". Sem Chrome, só --fotos falha (saída 2); o resto não abre navegador.
async function avaliarComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_AVALIAR);
  const [alvo] = posicionais;
  if (!alvo) sair(USO);
  let minutos;
  if (opcoes.minutos !== undefined) {
    if (!/^[0-9]+$/.test(opcoes.minutos) || Number(opcoes.minutos) < 1) sair(USO);
    minutos = Number(opcoes.minutos);
  }
  let avaliarArquivo;
  let fotografar;
  let resumoDaAvaliacao;
  let linhaDeAvaliacao;
  let lerRubrica;
  try {
    ({ avaliarArquivo, fotografar, lerRubrica } = await import('../build/avaliar.mjs'));
    ({ resumoDaAvaliacao, linhaDeAvaliacao } = await import('../avaliador/avaliar.js'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  let resultado;
  try {
    resultado = await avaliarArquivo(alvo, { slide: opcoes.slide, minutos });
  } catch (erro) {
    // O mesmo critério de validarComando para o caminho da aula; o resto (um --slide que não existe,
    // um arquivo do sistema ausente) sai com 2 e a mensagem de verdade.
    const alvoAbsoluto = resolve(alvo);
    const ehCaminhoDaAula = erro.code === 'ENOENT'
      && (erro.path === alvoAbsoluto || erro.path === join(alvoAbsoluto, 'index.html'));
    if (ehCaminhoDaAula) sair(`não encontrei a aula em ${alvo}: ${erro.message}`);
    else sair(erro.code ? `falha de ambiente: ${erro.message}` : erro.message);
  }
  const { caminho, contrato, erros, achados, resumo } = resultado;
  if (erros > 0) {
    const mensagem = `valide primeiro: ${plural(erros, 'erro', 'erros')}`;
    if (opcoes.json) console.log(JSON.stringify({ achados: null, resumo: null, erros, mensagem }, null, 2));
    else console.log(`${mensagem} — rode aula-usp validar ${alvo}. A avaliação é para aula válida.`);
    process.exitCode = 0;
    return;
  }
  // As fotos antes de imprimir qualquer coisa: se o Chrome falhar, a saída é só a falha (código 2), e
  // não meia avaliação seguida de um erro.
  let fotos;
  if (opcoes.fotos !== undefined) {
    try {
      fotos = await fotografar(caminho, resolve(opcoes.fotos), { contrato, slide: opcoes.slide });
    } catch (erro) {
      sair(`falha de ambiente: ${erro.message}`);
    }
  }
  if (opcoes.json) {
    console.log(JSON.stringify(fotos ? { achados, resumo, fotos: { pasta: resolve(opcoes.fotos), indice: fotos } } : { achados, resumo }, null, 2));
  } else {
    for (const achado of achados) console.log(linhaDeAvaliacao(achado));
    console.log(resumoDaAvaliacao(achados, lerRubrica()));
    if (fotos) console.log(`Fotos: ${plural(fotos.length, 'slide', 'slides')} em ${opcoes.fotos} (indice.json).`);
  }
  process.exitCode = 0;
}

// Recusa de conteúdo (saída 1), em uma linha: o comando rodou, e o que ele recusa é o alvo ou o
// arquivo do autor. Falha de uso ou de ambiente continua em `sair` (saída 2).
function recusar(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

const rotuloDoSlide = (posicao, id) => (id ? `slide ${posicao} #${id}` : `slide ${posicao}`);

// `aula-usp slide <pasta> <id|n> [--substituir <arquivo> [--dividir] [--forcar]]` (spec 2026-09-28,
// 5.1; plano do corrigir, D2 e D3). Sem --substituir, imprime a fatia exata do fonte daquela
// section, sem acrescentar nada. Com --substituir, troca só aquele intervalo de bytes pelo conteúdo
// do arquivo: fora dele, o fonte fica idêntico byte a byte (build/secoes.mjs). Não valida a aula —
// quem valida é `validar --slide`, e a skill aula-usp-corrigir roda os dois.
async function slideComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_SLIDE, 2);
  const [pasta, alvo] = posicionais;
  if (!pasta || alvo === undefined) sair(USO);
  // --dividir e --forcar só qualificam uma substituição; sozinhos, são engano de uso.
  if ((opcoes.dividir || opcoes.forcar) && opcoes.substituir === undefined) sair(USO);
  let localizarSecoes;
  let resolverAlvo;
  let substituirSecao;
  let caminhoDaAula;
  try {
    ({ localizarSecoes, resolverAlvo, substituirSecao } = await import('../build/secoes.mjs'));
    ({ caminhoDaAula } = await import('../build/validar.mjs'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  let caminho;
  let texto;
  try {
    caminho = caminhoDaAula(pasta);
    texto = readFileSync(caminho, 'utf8');
  } catch (erro) {
    sair(`não encontrei a aula em ${pasta}: ${erro.message}`);
  }
  let secoes;
  try {
    secoes = localizarSecoes(texto);
  } catch (erro) {
    recusar(`${caminho}: ${erro.message}`);
  }
  const indice = resolverAlvo(secoes, alvo);
  if (indice === -1) recusar(`não há slide "${alvo}" nesta aula (${plural(secoes.length, 'slide', 'slides')}: use um id ou uma posição de 1 a ${secoes.length})`);
  const original = secoes[indice];

  if (opcoes.substituir === undefined) {
    process.stdout.write(texto.slice(original.inicio, original.fim));
    process.exitCode = 0;
    return;
  }

  let substituto;
  try {
    substituto = readFileSync(opcoes.substituir, 'utf8');
  } catch (erro) {
    sair(`não foi possível ler ${opcoes.substituir}: ${erro.message}`);
  }
  let novas;
  try {
    novas = localizarSecoes(substituto);
  } catch (erro) {
    recusar(`${opcoes.substituir}: ${erro.message}`);
  }
  const esperadas = opcoes.dividir ? 2 : 1;
  if (novas.length !== esperadas) {
    recusar(`${opcoes.substituir} tem ${plural(novas.length, 'section', 'sections')}; ${opcoes.dividir ? 'com --dividir, são exatamente duas' : 'é exatamente uma (duas, só com --dividir)'}`);
  }
  // Fora das sections, só espaço: um parágrafo solto antes ou depois iria parar fora de slide nenhum.
  const inicioNovo = novas[0].inicio;
  const fimNovo = novas.at(-1).fim;
  const entre = novas.length === 2 ? substituto.slice(novas[0].fim, novas[1].inicio) : '';
  if (/\S/.test(substituto.slice(0, inicioNovo) + entre + substituto.slice(fimNovo))) {
    recusar(`${opcoes.substituir} tem texto fora da section; o arquivo é só a section, com espaço em volta`);
  }
  // Os ids das OUTRAS sections da aula: nenhum id novo pode repetir um deles.
  const outros = new Set(secoes.filter((_, k) => k !== indice).map((secao) => secao.id).filter(Boolean));
  const [primeira, segunda] = novas;
  if (primeira.id !== original.id) {
    if (!opcoes.forcar) {
      recusar(`a section nova tem id ${primeira.id ? `"${primeira.id}"` : 'nenhum'} e a original, ${original.id ? `"${original.id}"` : 'nenhum'}; mantenha o id ou use --forcar`);
    }
    if (primeira.id && outros.has(primeira.id)) recusar(`o id "${primeira.id}" já é de outro slide desta aula`);
  }
  if (segunda) {
    if (!segunda.id) recusar('com --dividir, a segunda section precisa de um id novo');
    if (outros.has(segunda.id) || segunda.id === primeira.id || segunda.id === original.id) {
      recusar(`com --dividir, a segunda section precisa de um id novo, e "${segunda.id}" já existe nesta aula`);
    }
  }

  const resultado = substituirSecao(texto, secoes, indice, substituto.slice(inicioNovo, fimNovo));
  // Escrita atômica: um temporário na mesma pasta (o mesmo sistema de arquivos) e um rename por cima.
  // Um processo interrompido no meio deixa o original inteiro, e não meio arquivo.
  const temporario = join(dirname(caminho), `.${basename(caminho)}.${process.pid}.tmp`);
  try {
    writeFileSync(temporario, resultado);
    renameSync(temporario, caminho);
  } catch (erro) {
    rmSync(temporario, { force: true });
    sair(`não foi possível gravar ${caminho}: ${erro.message}`);
  }
  const posicao = indice + 1;
  let mensagem = `${rotuloDoSlide(posicao, primeira.id)} substituído`;
  if (primeira.id !== original.id) mensagem += ` (era ${original.id ? `#${original.id}` : 'sem id'})`;
  if (segunda) mensagem += `; ${rotuloDoSlide(posicao + 1, segunda.id)} acrescentado depois dele`;
  console.log(mensagem);
  process.exitCode = 0;
}

// `aula-usp roteiro <arquivo.md> <pasta> [--substituir]` (spec 2026-09-28, 6.2; plano do gerar, D5):
// converte o roteiro em <pasta>/index.html, copia as figuras para <pasta>/img/ e roda `validar`, cujo
// código de saída é o do comando. Um erro de roteiro sai com 1, uma linha por erro, sem escrever nada;
// uma pasta que já tem index.html sai com 2, como `novo` com pasta cheia, salvo com --substituir, que
// troca o index.html e as figuras e deixa o resto da pasta como está.
async function roteiroComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos, FLAGS_ROTEIRO, 2, FLAGS_ROTEIRO);
  const [arquivo, pasta] = posicionais;
  if (!arquivo || !pasta) sair(USO);
  let converterRoteiro;
  let escreverAula;
  try {
    ({ converterRoteiro, escreverAula } = await import('../build/roteiro.mjs'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  if (existsSync(join(pasta, 'index.html')) && !opcoes.substituir) {
    sair(`${pasta} já tem index.html — escolha outra pasta ou use --substituir`);
  }
  let resultado;
  try {
    resultado = converterRoteiro(arquivo);
  } catch (erro) {
    if (erro.code === 'ENOENT' && erro.path === resolve(arquivo)) sair(`não encontrei o roteiro ${arquivo}: ${erro.message}`);
    sair(`falha de ambiente: ${erro.message}`);
  }
  if (resultado.erros.length > 0) {
    for (const { linha, mensagem } of resultado.erros) console.error(`${arquivo}:${linha} · ${mensagem}`);
    process.exit(1);
  }
  try {
    escreverAula(pasta, resultado);
  } catch (erro) {
    sair(`não foi possível escrever ${pasta}: ${erro.message}`);
  }
  console.log(`${join(pasta, 'index.html')} gerado de ${arquivo}: ${plural(resultado.slides, 'slide', 'slides')}, ${plural(resultado.figuras.length, 'figura', 'figuras')}`);
  await validarComando([pasta]);
}

// `dist` e `pacotes` são manutenção do sistema (spec 8.1): precisam do repositório — especime/, que
// `pacotes` lê, e as devDependencies, como o esbuild de build/bundle.mjs —, e o pacote do npm não leva
// nenhum dos dois (package.json, "files"). Sem esta conferência, no pacote instalado os dois saíam
// com 2 e uma mensagem crua ("Cannot find package 'esbuild'", "ENOENT … especime/") que não diz ao
// autor o que fazer. Roda ANTES de qualquer import() do comando: é a ausência de uma dependência
// desses imports que ela antecipa. `existsSync` dentro da função não fere a regra do topo do arquivo,
// que é sobre ler disco no escopo do módulo.
function exigirRepositorio(comando) {
  if (!existsSync(new URL('../especime/', import.meta.url))) {
    sair(`aula-usp ${comando} é comando de manutenção do sistema: rode-o num clone do repositório, não no pacote instalado.`);
  }
}

async function distComando(argumentos) {
  if (argumentos.length > 0) sair(USO); // dist não recebe alvo: gera sempre o do próprio sistema
  exigirRepositorio('dist');
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

async function pacotesComando(argumentos) {
  if (argumentos.length > 0) sair(USO); // como `dist`: não recebe alvo, gera sempre o do sistema
  exigirRepositorio('pacotes');
  const raiz = new URL('../', import.meta.url);
  let gerarPacotes;
  try {
    ({ gerarPacotes } = await import('../build/pacotes.mjs'));
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  // A ordem das três etapas — tag, guia, pacotes — está DENTRO de gerarPacotes, com a razão de cada
  // uma escrita ao lado. Repeti-la aqui seria uma segunda verdade sobre a mesma ordem, e a ordem é
  // justamente a coisa que erra em silêncio: montar antes de reescrever entrega pacotes com a tag
  // relativa, que num chat sem terminal simplesmente não resolve.
  let resultado;
  try {
    resultado = await gerarPacotes({ raiz });
  } catch (erro) {
    sair(`não foi possível montar os pacotes: ${erro.message}`);
  }
  const { tags, arquivos, violacoes } = resultado;
  // O que MUDOU, não o que foi visitado: `reescreverTags` visita toda tag das três pastas, e numa
  // árvore já em dia — o caso normal, porque o comando é idempotente — nenhuma delas muda. Contar as
  // visitadas fazia o comando afirmar um trabalho que ele não fez.
  const fixadas = [...tags.values()].filter(({ mudou }) => mudou).length;
  console.log(fixadas > 0
    ? `${plural(fixadas, 'tag do runtime fixada', 'tags do runtime fixadas')} (de ${tags.size} conferidas)`
    : `nenhuma tag do runtime mudou — as ${tags.size} conferidas já estavam fixadas`);
  for (const [caminho, texto] of arquivos) console.log(`${caminho} · ${texto.length} caracteres`);
  for (const violacao of violacoes) console.error(`Aula USP: ${violacao}`);
  // Saída 1, não 2 (spec 8.1): o ambiente rodou, os arquivos estão no disco, e o que falhou foi o
  // conteúdo — o conserto é editar guia/ e rodar de novo, não instalar nada.
  process.exitCode = violacoes.length > 0 ? 1 : 0;
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'novo') novoComando(argumentos);
else if (comando === 'servir') servir(argumentos);
else if (comando === 'validar') validarComando(argumentos);
else if (comando === 'build') buildComando(argumentos);
else if (comando === 'avaliar') avaliarComando(argumentos);
else if (comando === 'slide') slideComando(argumentos);
else if (comando === 'roteiro') roteiroComando(argumentos);
else if (comando === 'dist') distComando(argumentos);
else if (comando === 'pacotes') pacotesComando(argumentos);
else sair(USO);
