#!/usr/bin/env node
// CLI do Aula USP (spec 8.1). Neste marco, `servir` e `validar`.
import { statSync } from 'node:fs';
import { criarServidor } from '../build/servir.mjs';
import { validarArquivo } from '../build/validar.mjs';
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
    else posicionais.push(argumentos[i]);
  }
  return { opcoes, posicionais };
}

function servir(argumentos) {
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
    servidor = criarServidor({ pastaAula: pasta });
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
  servidor.on('error', (erro) => sair(`não foi possível servir: ${erro.message}`));
  servidor.listen(opcoes.porta, '127.0.0.1', () => {
    console.log(`servindo ${pasta} em http://127.0.0.1:${servidor.address().port}/`);
  });
}

function validarComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos);
  const [alvo] = posicionais;
  if (!alvo) sair(USO);
  let resultado;
  try {
    resultado = validarArquivo(alvo);
  } catch (erro) {
    sair(`não encontrei a aula em ${alvo}: ${erro.message}`);
  }
  const { achados, erros } = resultado;
  if (opcoes.json) console.log(JSON.stringify(achados, null, 2));
  else {
    for (const achado of achados) console.log(linhaDe(achado));
    console.log(cabecalhoDe(achados));
  }
  process.exit(erros > 0 ? 1 : 0);
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else if (comando === 'validar') validarComando(argumentos);
else sair(USO);
