// Cola de Node do validador (spec 9.3): lê a aula do disco, monta o contexto e roda o grupo estático.
// O validador em si não sabe de arquivos: aqui é o único lugar com node:fs e linkedom.
import { readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { validar, contar } from '../validador/validar.js';
import { REGRAS_ESTATICAS } from '../validador/regras/index.js';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url));

export { REGRAS_ESTATICAS };

export function caminhoDaAula(alvo) {
  const absoluto = resolve(alvo);
  const info = statSync(absoluto); // ENOENT sobe: quem chama traduz em saída 2
  return info.isDirectory() ? join(absoluto, 'index.html') : absoluto;
}

export function lerAula(caminho) {
  const { document } = parseHTML(readFileSync(caminho, 'utf8'));
  return document;
}

export function validarArquivo(alvo, { regras = REGRAS_ESTATICAS, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const caminho = caminhoDaAula(alvo);
  const contrato = JSON.parse(readFileSync(join(raizDoSistema, 'contrato/contrato.json'), 'utf8'));
  const unidades = JSON.parse(readFileSync(join(raizDoSistema, 'assets/marcas/unidades.json'), 'utf8'));
  const achados = validar(lerAula(caminho), { contrato, regras, grupo: 'estatica', unidades });
  return { achados, ...contar(achados) };
}
