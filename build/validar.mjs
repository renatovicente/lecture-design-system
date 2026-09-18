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

// Um navegador normaliza o nome de todo atributo para minúsculas no parser, e restaura a grafia
// canônica de uma tabela própria dentro de SVG (viewBox, markerWidth, refX...); o linkedom preserva
// a grafia do autor como está no fonte. Isso é inofensivo para as regras de vocabulário, que já
// comparam atributo.name.toLowerCase() (vocabulario.js) — mas é fatal para casamento por seletor:
// <div Class="colunas"> não bate com elemento.matches('div.colunas') nem aparece em classList, então
// estrutura.colunas, o casador de sequência (sequencia.js) e o próprio montar() em tempo de execução
// silenciosamente deixam de ver uma grade de colunas que um navegador real veria (medido). Por isso
// a correção mora aqui, na fronteira onde o fonte vira DOM — não em validador/, que fica livre de
// qualquer conhecimento de parser, e o marco 4c ganha a normalização de graça, porque quem faz o
// parse lá é o próprio navegador. O marco 5, quando o build de fato ler uma aula com linkedom, vai
// precisar da mesma chamada.
function nomeCanonico(nome, dentroDoSvg, grafiaSvg) {
  const minusculo = nome.toLowerCase();
  return dentroDoSvg ? (grafiaSvg.get(minusculo) ?? minusculo) : minusculo;
}

function normalizarAtributos(documento, contrato) {
  const grafiaSvg = new Map(contrato.svg.atributos.map((nome) => [nome.toLowerCase(), nome]));
  for (const elemento of documento.querySelectorAll('*')) {
    const dentroDoSvg = elemento.closest('svg') !== null;
    const originais = [...elemento.attributes].map((atributo) => ({ nome: atributo.name, valor: atributo.value }));
    const mudou = originais.some(({ nome }) => nome !== nomeCanonico(nome, dentroDoSvg, grafiaSvg));
    if (!mudou) continue;
    // Tira todos e recoloca na ordem original, com o nome canônico: só remover e recolocar o que
    // mudou de nome jogaria esse atributo para o fim, depois dos que não precisaram de troca. O
    // setAttribute do linkedom põe atributo novo na frente, não no fim (medido); recoloca de trás
    // para a frente para a ordem final bater com a original.
    for (const { nome } of originais) elemento.removeAttribute(nome);
    for (const { nome, valor } of [...originais].reverse()) elemento.setAttribute(nomeCanonico(nome, dentroDoSvg, grafiaSvg), valor);
  }
}

export function lerAula(caminho, contrato) {
  const { document } = parseHTML(readFileSync(caminho, 'utf8'));
  normalizarAtributos(document, contrato);
  return document;
}

export function validarArquivo(alvo, { regras = REGRAS_ESTATICAS, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const caminho = caminhoDaAula(alvo);
  const contrato = JSON.parse(readFileSync(join(raizDoSistema, 'contrato/contrato.json'), 'utf8'));
  const unidades = JSON.parse(readFileSync(join(raizDoSistema, 'assets/marcas/unidades.json'), 'utf8'));
  const achados = validar(lerAula(caminho, contrato), { contrato, regras, grupo: 'estatica', unidades });
  return { achados, ...contar(achados) };
}
