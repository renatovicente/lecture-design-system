// Regras de vocabulário (spec 5.5 e 9.2): no corpo da aula só entram os elementos, classes e atributos
// que o contrato lista. Tudo aqui é lido do contrato; o código só sabe percorrer o DOM.
import { onde, trechoDe } from '../validar.js';

const AMARELO = '#FCB421';
const AZUL = '#1094AB';
const MINIMO_AZUL = 32; // spec 4.2: azul em texto só a partir de 32 px
const MINIMO_TRACO_AMARELO = 4; // spec 4.2: amarelo em traço só de 4 px para cima

function nomeDe(elemento) {
  return elemento.nodeName.toLowerCase();
}

// O SVG tem vocabulário próprio (spec 5.5), então cada elemento é lido no seu contexto. O próprio <svg>
// conta como SVG: ele está nas duas listas de elementos, mas os atributos dele são os de SVG.
function emSvg(elemento) {
  return elemento.closest('svg') !== null;
}

// O linkedom devolve nodeName em caixa alta para todo elemento, SVG incluso, apagando a grafia de
// "foreignObject" e "clipPath" do contrato; nomeDe já normaliza para minúsculas, então o achado aqui
// compara sem caixa e devolve a grafia do contrato, para a mensagem nomear o elemento como o autor o leu.
function casaNome(nome, lista) {
  return lista.find((candidato) => candidato.toLowerCase() === nome);
}

// Mesmo problema, para atributos: o linkedom preserva a grafia do autor em atributos (ao contrário de
// um navegador, que normaliza para minúsculas no parser, com tabela própria para SVG); <p Class="lide">
// ou <svg VIEWBOX="..."> não batem com uma busca por nome exato. Acha o atributo comparando sem caixa;
// quem chama lê .value ou só testa a presença — undefined quando o elemento não tem esse atributo.
function atributoDe(elemento, nomeCanonico) {
  for (const atributo of elemento.attributes) {
    if (atributo.name.toLowerCase() === nomeCanonico) return atributo;
  }
  return undefined;
}

// classList lê o atributo "class" pelo nome exato; puxa por atributoDe para não perder classes
// escritas como Class="..." ou CLASS="...".
function classesDe(elemento) {
  return atributoDe(elemento, 'class')?.value.trim().split(/\s+/).filter(Boolean) ?? [];
}

// A própria section entra: data-layout, id, data-curto e data-pdf são atributos do autor como os outros.
function* elementosDoCorpo(slides) {
  for (const secao of slides) {
    yield { secao, elemento: secao };
    for (const elemento of secao.querySelectorAll('*')) yield { secao, elemento };
  }
}

// Atributos que outra regra já é dona: acusar duas vezes o mesmo erro só faz o autor duvidar das duas.
const DE_OUTRA_REGRA = new Set(['data-lang']);

// Atributos que o contrato permite neste elemento: os de "*" mais os de cada seletor que ele casa.
function atributosPermitidos(elemento, contrato) {
  const permitidos = new Map();
  for (const [seletor, atributos] of Object.entries(contrato.html.atributos)) {
    if (seletor !== '*' && !elemento.matches(seletor)) continue;
    for (const [nome, regra] of Object.entries(atributos)) permitidos.set(nome, regra);
  }
  return permitidos;
}

function valorInvalido(valor, regra) {
  if (regra.valores && !regra.valores.includes(valor)) return `valor fora do contrato: "${valor}"`;
  if (regra.padrao && !new RegExp(regra.padrao).test(valor)) return `valor fora da forma esperada: "${valor}"`;
  if (regra.json) {
    let interpretado;
    try {
      interpretado = JSON.parse(valor);
    } catch {
      return 'valor não é JSON válido';
    }
    // data-opcoes alimenta montar(raiz, opcoes) como objeto (spec 6.7); "42" e "[1,2,3]" são JSON
    // válido mas não um conjunto de opções, e quebrariam a demo em tempo de execução sem avisar aqui.
    if (typeof interpretado !== 'object' || interpretado === null || Array.isArray(interpretado)) {
      return 'valor não é um objeto JSON';
    }
  }
  return null;
}

// fill, stroke, stroke-width e font-size são herdados em SVG: um <g fill="..."> pinta os <text> de
// dentro, e um <text> sem font-size herda o do ancestral (spec 4.2 mede o valor que chega à tela, não
// o que o elemento escreve). Sobe pelos ancestrais dentro do próprio <svg> até achar quem define o
// atributo; o marco 4c vai precisar da mesma ideia para medir a cor e o tamanho já renderizados.
function atributoHerdado(elemento, nome) {
  for (let no = elemento; no; no = no.parentElement) {
    const valor = atributoDe(no, nome)?.value;
    if (valor !== undefined) return valor;
    if (nomeDe(no) === 'svg') return undefined;
  }
  return undefined;
}

function corHerdada(elemento, nome) {
  return atributoHerdado(elemento, nome)?.toUpperCase();
}

function numeroHerdado(elemento, nome, padrao) {
  const valor = atributoHerdado(elemento, nome);
  if (valor === undefined) return padrao;
  const numero = Number.parseFloat(valor);
  return Number.isNaN(numero) ? padrao : numero;
}

export const regras = [
  {
    nome: 'vocabulario.elemento',
    *aplicar({ slides, contrato }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (elemento === secao) continue; // a section é o slide; quem confere o layout dela é estrutura.layout
        const nome = nomeDe(elemento);
        if (nome === 'style' || nome === 'script') continue; // vocabulario.style e vocabulario.script
        const proibido = casaNome(nome, contrato.proibidos.elementos);
        if (proibido) {
          yield { ...onde(slides, secao), mensagem: `<${proibido}> é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
          continue;
        }
        // Spec 5.5: SVG inline só dentro de figure. svg está no vocabulário do corpo (o casaNome
        // abaixo não pega isso sozinho): é o único elemento cuja posição, não só a presença, importa.
        if (nome === 'svg' && !elemento.closest('figure')) {
          yield { ...onde(slides, secao), mensagem: '<svg> só pode ficar dentro de <figure>.', trecho: trechoDe(elemento) };
          continue;
        }
        const lista = emSvg(elemento) ? contrato.svg.elementos : contrato.html.elementos;
        if (!casaNome(nome, lista)) {
          const onde_ = emSvg(elemento) ? 'no SVG' : 'no corpo';
          yield { ...onde(slides, secao), mensagem: `<${nome}> não está no vocabulário ${onde_}.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.classe',
    *aplicar({ slides, contrato, fase }) {
      const doSistema = new Set(contrato.classesDoSistema);
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        const nome = nomeDe(elemento);
        // Elemento que nem está no vocabulário já foi acusado por vocabulario.elemento; enumerar as
        // classes dele por cima é a mesma dupla contagem que vocabulario.atributo já evita.
        if (elemento !== secao && !emSvg(elemento) && !contrato.html.elementos.includes(nome)) continue;
        for (const classe of classesDe(elemento)) {
          if (emSvg(elemento)) {
            if (!contrato.svg.classes.includes(classe)) {
              yield { ...onde(slides, secao), mensagem: `classe "${classe}" não existe no vocabulário do SVG.`, trecho: trechoDe(elemento) };
            }
            continue;
          }
          if (doSistema.has(classe)) {
            yield { ...onde(slides, secao), mensagem: `"${classe}" é classe do sistema: o autor não a escreve no fonte.`, trecho: trechoDe(elemento) };
            continue;
          }
          const regra = contrato.html.classes[classe];
          if (!regra || regra.fase > fase) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" não existe no contrato.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (regra.em && !regra.em.includes(nome)) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" não vale em <${nome}>, só em ${regra.em.map((e) => `<${e}>`).join(' ou ')}.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (regra.dentro && !regra.dentro.some((pai) => elemento.parentElement?.closest(pai))) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" só vale dentro de ${regra.dentro.join(' ou ')}.`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'vocabulario.atributo',
    *aplicar({ slides, contrato, fase }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        const nome = nomeDe(elemento);
        // Elemento que nem está no vocabulário já foi acusado; enumerar os atributos dele é ruído.
        if (elemento !== secao && !emSvg(elemento) && !contrato.html.elementos.includes(nome)) continue;
        const permitidos = emSvg(elemento) ? null : atributosPermitidos(elemento, contrato);
        for (const atributo of elemento.attributes) {
          // O contrato só conhece grafia minúscula; um navegador já normaliza o nome do atributo no
          // parser, o linkedom não — daí comparar por atributo.name puro perderia Class, VIEWBOX etc.
          const chave = atributo.name.toLowerCase();
          if (chave === 'class' || chave === 'style' || DE_OUTRA_REGRA.has(chave)) continue;
          if (contrato.proibidos.prefixosDeAtributo.some((prefixo) => chave.startsWith(prefixo))) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (contrato.proibidos.atributos.includes(chave)) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (emSvg(elemento)) {
            const doElemento = contrato.svg.atributosPorElemento[nome] ?? [];
            if (!casaNome(chave, contrato.svg.atributos) && !casaNome(chave, doElemento)) {
              yield { ...onde(slides, secao), mensagem: `atributo "${chave}" não está no vocabulário do SVG.`, trecho: trechoDe(elemento) };
              continue;
            }
            if (chave === 'href' && !new RegExp(contrato.svg.hrefPadrao).test(atributo.value)) {
              yield { ...onde(slides, secao), mensagem: `href de SVG só aponta para um id da própria figura: "${atributo.value}".`, trecho: trechoDe(elemento) };
            }
            continue;
          }
          const regra = permitidos.get(chave);
          if (!regra || regra.fase > fase) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" não vale em <${nome}>.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (regra.layouts && !regra.layouts.includes(atributoDe(secao, 'data-layout')?.value)) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" só vale no layout ${regra.layouts.join(' ou ')}.`, trecho: trechoDe(elemento) };
            continue;
          }
          const problema = valorInvalido(atributo.value, regra);
          if (problema) yield { ...onde(slides, secao), mensagem: `${chave} com ${problema}.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.style',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (nomeDe(elemento) === 'style') {
          yield { ...onde(slides, secao), mensagem: 'elemento <style> no corpo da aula.', trecho: trechoDe(elemento) };
        } else if (atributoDe(elemento, 'style')) {
          yield { ...onde(slides, secao), mensagem: `estilo em linha em <${nomeDe(elemento)}>.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.cor-svg',
    *aplicar({ slides, contrato }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        for (const chave of ['fill', 'stroke']) {
          const valor = atributoDe(elemento, chave)?.value;
          if (valor === undefined) continue;
          // "none" é a única palavra-chave da lista (o resto é hexadecimal); os tokens hex já são
          // comparados em maiúsculas, então "none" também merece aceitar qualquer caixa do autor.
          if (!contrato.svg.cores.includes(valor.toUpperCase()) && !contrato.svg.cores.includes(valor.toLowerCase())) {
            yield { ...onde(slides, secao), mensagem: `${chave}="${valor}" não é cor do contrato.`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'vocabulario.amarelo-svg',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        const nome = nomeDe(elemento);
        const preenchimento = corHerdada(elemento, 'fill');
        if (preenchimento === AMARELO && (nome === 'text' || nome === 'tspan')) {
          yield { ...onde(slides, secao), mensagem: 'amarelo em texto de SVG.', trecho: trechoDe(elemento) };
          continue;
        }
        const traco = corHerdada(elemento, 'stroke');
        if (traco !== AMARELO) continue;
        const largura = numeroHerdado(elemento, 'stroke-width', 1);
        if (largura < MINIMO_TRACO_AMARELO) {
          yield { ...onde(slides, secao), mensagem: `amarelo em traço de ${largura} px (mín. ${MINIMO_TRACO_AMARELO}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.azul-svg',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        const nome = nomeDe(elemento);
        if (nome !== 'text' && nome !== 'tspan') continue;
        if (corHerdada(elemento, 'fill') !== AZUL) continue;
        const tamanho = numeroHerdado(elemento, 'font-size', 16);
        if (tamanho < MINIMO_AZUL) {
          yield { ...onde(slides, secao), mensagem: `azul em texto de ${tamanho} px (mín. ${MINIMO_AZUL}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.script',
    *aplicar({ slides, contrato, fase }) {
      const permitido = contrato.html.elementosFase2?.script;
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (nomeDe(elemento) !== 'script') continue;
        const dentro = permitido?.dentro?.some((pai) => elemento.closest(pai));
        // Na fase 2 o script de gráfico e de diagrama é legítimo. "dentro && fase < 2" não acontece
        // pelos dois pontos de entrada do produto (build/validar.mjs, montar/entrada.js): os dois
        // calculam `fase` com faseDaAula sobre este mesmo documento, e seletoresDeFase2 constrói,
        // para cada pai de contrato.html.elementosFase2.script, o seletor "<pai> script" — o mesmo
        // script que cai aqui com dentro=true já fez faseDaAula devolver 2. A mensagem de "fase 2"
        // que existia para esse ramo nunca chegava a um autor; um script fora desses pais continua
        // erro em qualquer fase, com uma única frase.
        if (dentro && fase >= 2) continue;
        yield {
          ...onde(slides, secao),
          mensagem: 'script dentro da section: registros de demo ficam fora dos slides.',
          trecho: trechoDe(elemento),
        };
      }
    },
  },
];
