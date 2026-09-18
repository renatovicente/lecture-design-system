#!/usr/bin/env node
// CLI do Aula USP (spec 8.1). Neste marco, `servir` e `validar`.
import { statSync } from 'node:fs';
import { resolve, join } from 'node:path';
// build/servir.mjs e build/validar.mjs só são importados dentro do comando que precisa de cada um
// (import dinâmico): os dois leem disco no escopo do próprio módulo (contrato/contrato.json, e
// build/validar.mjs ainda importa linkedom), e um import estático rodaria essa leitura antes de
// qualquer try/catch — uma dependência ou um arquivo do sistema ausente viraria stack trace e saída 1
// para o comando (a spec 8.1 pede saída 2). A regra vale para os dois módulos de build/: nada que leia
// disco ou dependência externa no escopo do módulo entra na CLI por import estático.
import { linhaDe, cabecalhoDe } from '../validador/validar.js';

const USO = 'uso: aula-usp servir <pasta> [--porta 8765]\n       aula-usp validar <pasta> [--json]';

function sair(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

function lerArgumentos(argumentos) {
  const opcoes = { porta: 8765 };
  const posicionais = [];
  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i] === '--porta') opcoes.porta = Number(argumentos[++i]);
    else if (argumentos[i] === '--json') opcoes.json = true;
    else if (argumentos[i].startsWith('--')) sair(USO); // flag desconhecida: melhor recusar que ignorar em silêncio
    else posicionais.push(argumentos[i]);
  }
  if (posicionais.length > 1) sair(USO); // um alvo só; mais de um é engano do autor, não uma lista
  return { opcoes, posicionais };
}

async function servir(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos);
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
  const { opcoes, posicionais } = lerArgumentos(argumentos);
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

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else if (comando === 'validar') validarComando(argumentos);
else sair(USO);
