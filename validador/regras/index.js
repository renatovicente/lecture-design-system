// Registro das regras (spec 9.3): a lista que o validador roda, em ES module puro, sem Node.
// O marco 4c importa este arquivo no navegador; por isso ele não pode viver em build/.
// A ordem é a ordem das mensagens dentro de um slide: estrutura, conteúdo, vocabulário, limites, recursos.
import { regras as estrutura } from './estrutura.js';
import { regras as conteudo } from './conteudo.js';
import { regras as vocabulario } from './vocabulario.js';
import { regras as limites } from './limites.js';
import { regras as recursos } from './recursos.js';
import { regras as carga } from './carga.js';
import { regras as composicao } from './composicao.js';
import { regras as saida } from './saida.js';

export const REGRAS_ESTATICAS = [...estrutura, ...conteudo, ...vocabulario, ...limites, ...recursos];

export const REGRAS_DE_CARGA = carga;

export const REGRAS_DE_COMPOSICAO = composicao;

export const REGRAS_DE_SAIDA = saida;
