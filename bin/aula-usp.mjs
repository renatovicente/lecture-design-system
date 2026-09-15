#!/usr/bin/env node
// CLI do Aula USP. Neste marco, só o comando `servir`.
import { statSync } from 'node:fs';
import { criarServidor } from '../build/servir.mjs';

const USO = 'uso: aula-usp servir <pasta> [--porta 8765]';

function sair(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

function lerArgumentos(argumentos) {
  const opcoes = { porta: 8765 };
  const posicionais = [];
  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i] === '--porta') opcoes.porta = Number(argumentos[++i]);
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
  const servidor = criarServidor({ pastaAula: pasta });
  servidor.on('error', (erro) => sair(`não foi possível servir: ${erro.message}`));
  servidor.listen(opcoes.porta, '127.0.0.1', () => {
    console.log(`servindo ${pasta} em http://127.0.0.1:${servidor.address().port}/`);
  });
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else sair(USO);
