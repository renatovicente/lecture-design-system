// O roteiro em markdown (spec 2026-09-28, 6.1; plano do gerar, D1 a D4): lê o texto do autor, slide a
// slide, e gera a aula HTML. Do lado do navegador, sem `node:`, para um dia poder rodar num artifact:
// quem lê o arquivo, copia as figuras e valida é build/roteiro.mjs.
//
// Duas funções puras. `lerRoteiro(texto)` só conhece a sintaxe; `gerarAula(roteiro, { contrato,
// tagDoRuntime })` só conhece o contrato. O que cada layout aceita, as grades, as linguagens, as metas,
// o padrão do id e os limites vêm de `contrato`, sem lista própria: a escolha entre `p` e
// `p.afirmacao`, ou entre `ul` e `ol.sintese`, é a do candidato que a sequência do layout aceita, e a
// conferência de ordem e de quantidade é o próprio casador do validador (validador/sequencia.js),
// rodando sobre os elementos que o gerador vai escrever.
//
// Determinismo: a mesma entrada dá os mesmos bytes. Nada de data, aleatoriedade ou ordem instável — as
// metas saem na ordem do contrato, e os erros na ordem das linhas.
import { segmentosDeTex, textoSemTex } from '../componentes/tex.js';
import { casarSequencia } from '../validador/sequencia.js';
import { slug } from './montar.js';

// ---------------------------------------------------------------------------------------------
// Texto em linha.

const escapar = (texto) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Dentro de \( \) e \[ \], só `<` e `&`: o KaTeX recebe o texto do nó, e `>` é texto válido em HTML.
const escaparTex = (texto) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escaparAtributo = (texto) => escapar(texto).replace(/"/g, '&quot;');

const NEGRITO = /\*\*(?=\S)(.+?)(?<=\S)\*\*/g;
const ITALICO = /\*(?=\S)(.+?)(?<=\S)\*/g;

// `**negrito**` e `*itálico*`, fora da matemática; nenhum outro markdown em linha (D1).
function emLinha(texto) {
  return segmentosDeTex(texto).map((segmento) => (segmento.tipo === 'texto'
    ? escapar(segmento.texto).replace(NEGRITO, '<strong>$1</strong>').replace(ITALICO, '<em>$1</em>')
    : escaparTex(segmento.trecho))).join('');
}

// O texto que a plateia lê, sem marcação e com o TeX em texto simples: o mesmo que textoDeTitulo
// (montar/blocos.js) tira do h2 montado, para o slug e o nome curto saírem como o montar os tiraria.
function textoPlano(texto) {
  const semMarcas = segmentosDeTex(texto).map((segmento) => (segmento.tipo === 'texto'
    ? segmento.texto.replace(NEGRITO, '$1').replace(ITALICO, '$1')
    : segmento.trecho)).join('');
  return textoSemTex(semMarcas).replace(/\s+/g, ' ').trim();
}

// `A | B`: o primeiro `|` fora da matemática separa o sinal. Devolve null com mais de um.
function dividirTitulo(texto) {
  const partes = [''];
  for (const segmento of segmentosDeTex(texto)) {
    if (segmento.tipo !== 'texto') {
      partes[partes.length - 1] += segmento.trecho;
      continue;
    }
    const pedacos = segmento.texto.split('|');
    partes[partes.length - 1] += pedacos[0];
    for (const pedaco of pedacos.slice(1)) partes.push(pedaco);
  }
  if (partes.length > 2) return null;
  return { titulo: partes[0].trim(), segunda: partes.length === 2 ? partes[1].trim() : undefined };
}

// ---------------------------------------------------------------------------------------------
// lerRoteiro: a sintaxe, sem contrato.

const CERCA = /^```\s*(\S*)\s*$/;
const FIM_DE_CERCA = /^```\s*$/;
const MARCADOR = /^(nota|fonte|legenda|próxima|proxima):\s*(.*)$/;
const CAIXA = /^\[([a-zà-ÿ]+)(?::\s*([^\]]*))?\]\s*(.*)$/;
const FIGURA = /^!\[([^\]]*)\]\(([^()\s]+)\)$/;
const ITEM_SIMPLES = /^-\s+(.*)$/;
const ITEM_NUMERADO = /^[0-9]+\.\s+(.*)$/;

function lerCabecalhoDoSlide(resto, linha, erro) {
  let atributos = '';
  const chaves = /\s*\{([^{}]*)\}\s*$/.exec(resto);
  let cabeca = resto;
  if (chaves) {
    atributos = chaves[1];
    cabeca = resto.slice(0, chaves.index);
  }
  const partes = /^([^\s:]+)\s*(?::\s*(.*))?$/.exec(cabeca.trim());
  if (!partes) {
    erro(linha, `cabeçalho de slide malformado: escreva "## layout: título {#id}"`);
    return null;
  }
  const slide = { layout: partes[1], titulo: undefined, segunda: undefined, id: undefined, curto: undefined, blocos: [], notas: [], linha };
  const textoDoTitulo = (partes[2] ?? '').trim();
  if (textoDoTitulo) {
    const dividido = dividirTitulo(textoDoTitulo);
    if (!dividido) erro(linha, 'título com mais de um "|": o título tem no máximo duas linhas');
    else Object.assign(slide, dividido);
  }
  const atributo = /\s*(?:#([^\s"{}]+)|curto="([^"]*)")/y;
  let posicao = 0;
  while (posicao < atributos.length) {
    atributo.lastIndex = posicao;
    const achado = atributo.exec(atributos);
    if (!achado) {
      if (atributos.slice(posicao).trim()) erro(linha, `atributo desconhecido em {…}: "${atributos.slice(posicao).trim()}"; use {#id curto="…"}`);
      break;
    }
    if (achado[1] !== undefined) slide.id = achado[1];
    else slide.curto = achado[2];
    posicao = atributo.lastIndex;
  }
  return slide;
}

// Lê o corpo de um slide em blocos. Os blocos de uma coluna vão para a coluna; `nota:` vai sempre para
// o slide; `fonte:` fica no recipiente em que foi escrita (o slide ou a coluna).
function lerCorpo(slide, linhas, erro) {
  let recipiente = slide.blocos;
  let colunas = null;
  let paragrafo = null;
  let lista = null;
  let figurado = null; // a última figura, gráfico ou diagrama, para um `legenda:` logo depois
  const fechar = () => {
    paragrafo = null;
    lista = null;
  };
  const acrescentar = (bloco) => {
    fechar();
    figurado = null;
    recipiente.push(bloco);
    return bloco;
  };

  for (let k = 0; k < linhas.length; k++) {
    const { texto: bruto, linha } = linhas[k];
    const texto = bruto.trim();
    if (!texto) {
      fechar();
      continue;
    }

    const cerca = CERCA.exec(texto);
    if (cerca) {
      const conteudo = [];
      let fechada = false;
      for (k += 1; k < linhas.length; k++) {
        if (FIM_DE_CERCA.test(linhas[k].texto.trim())) {
          fechada = true;
          break;
        }
        conteudo.push(linhas[k].texto);
      }
      if (!fechada) erro(linha, 'bloco cercado sem o ``` de fechamento');
      const linguagem = cerca[1];
      const corpo = conteudo.join('\n');
      if (!linguagem) {
        erro(linha, 'bloco cercado sem linguagem: escreva ```python, ```grafico, ```dot…');
        continue;
      }
      if (linguagem === 'grafico' || linguagem === 'dot') {
        if (/<\/script/i.test(corpo)) erro(linha, `o ${linguagem === 'grafico' ? 'JSON do gráfico' : 'DOT do diagrama'} não pode conter "</script"`);
        if (linguagem === 'grafico') {
          try {
            JSON.parse(corpo);
          } catch (falha) {
            erro(linha, `JSON do gráfico inválido: ${falha.message}`);
          }
        }
        figurado = acrescentar({ tipo: linguagem === 'grafico' ? 'grafico' : 'diagrama', conteudo, linha });
        continue;
      }
      acrescentar({ tipo: 'codigo', linguagem, conteudo, linha });
      continue;
    }

    // Fórmula em destaque: `$$ … $$` ou `\[ … \]`, numa linha ou em várias.
    const delimitadores = texto.startsWith('$$') ? ['$$', '$$'] : texto.startsWith('\\[') ? ['\\[', '\\]'] : null;
    if (delimitadores) {
      const [abre, fecha] = delimitadores;
      const partes = [];
      let resto = texto.slice(abre.length);
      let fechada = false;
      for (;;) {
        const fim = resto.trimEnd();
        if (fim.endsWith(fecha) && !(partes.length === 0 && fim.length === 0)) {
          partes.push(fim.slice(0, fim.length - fecha.length));
          fechada = true;
          break;
        }
        partes.push(resto);
        k += 1;
        if (k >= linhas.length) break;
        resto = linhas[k].texto;
      }
      if (!fechada) erro(linha, `fórmula em destaque sem o ${fecha} de fechamento`);
      const tex = partes.map((parte) => parte.trim()).filter(Boolean).join('\n');
      if (fechada && !tex) erro(linha, 'fórmula em destaque vazia');
      acrescentar({ tipo: 'tex', tex, linha });
      continue;
    }

    const aberturaDeColunas = /^:::colunas(?:\s+(\S+))?\s*$/.exec(texto);
    if (aberturaDeColunas) {
      if (colunas) {
        erro(linha, 'colunas dentro de colunas: feche as primeiras com ::: antes');
        continue;
      }
      if (!aberturaDeColunas[1]) erro(linha, 'colunas sem grade: escreva ":::colunas 6-6"');
      recipiente = slide.blocos;
      colunas = acrescentar({ tipo: 'colunas', grade: aberturaDeColunas[1] ?? '', colunas: [[]], linha });
      recipiente = colunas.colunas[0];
      continue;
    }
    if (texto === ':::') {
      if (!colunas) erro(linha, '::: sem :::colunas aberto');
      else {
        fechar();
        figurado = null;
        colunas = null;
        recipiente = slide.blocos;
      }
      continue;
    }
    if (texto === '---') {
      if (!colunas) erro(linha, '--- só separa colunas, dentro de :::colunas … :::');
      else {
        fechar();
        figurado = null;
        colunas.colunas.push([]);
        recipiente = colunas.colunas.at(-1);
      }
      continue;
    }
    if (/^:::/.test(texto)) {
      erro(linha, `marcação desconhecida "${texto}"; use ":::colunas 6-6", "---" e ":::"`);
      continue;
    }

    const marcador = MARCADOR.exec(texto);
    if (marcador) {
      const [, nome, valor] = marcador;
      if (nome === 'nota') {
        fechar();
        slide.notas.push({ texto: valor.trim(), linha });
        continue;
      }
      if (nome === 'legenda') {
        fechar();
        if (!figurado) erro(linha, 'legenda: solta; ela vale só logo depois de uma figura, gráfico ou diagrama');
        else if (figurado.legenda !== undefined) erro(linha, 'legenda: repetida; a figura tem uma legenda só');
        else figurado.legenda = valor.trim();
        continue;
      }
      const tipo = nome === 'fonte' ? 'fonte' : 'proxima';
      if (recipiente.some((bloco) => bloco.tipo === tipo)) {
        erro(linha, `${nome}: repetida; ${tipo === 'fonte' ? 'junte as fontes numa linha' : 'a próxima aula é uma só'}`);
        continue;
      }
      acrescentar({ tipo, texto: valor.trim(), linha });
      continue;
    }

    if (texto.startsWith('> ') || texto === '>') {
      acrescentar({ tipo: 'lide', texto: texto.slice(1).trim(), linha });
      continue;
    }
    if (texto.startsWith('? ') || texto === '?') {
      acrescentar({ tipo: 'pergunta', texto: texto.slice(1).trim(), linha });
      continue;
    }

    const simples = ITEM_SIMPLES.exec(texto);
    const numerado = simples ? null : ITEM_NUMERADO.exec(texto);
    if (simples || numerado) {
      const tipo = simples ? 'ul' : 'ol';
      let item = (simples ?? numerado)[1];
      const passo = /^\+\s+/.test(item);
      if (passo) item = item.replace(/^\+\s+/, '');
      if (!lista || lista.lista !== tipo) {
        const nova = acrescentar({ tipo: 'lista', lista: tipo, itens: [], linha });
        lista = nova;
      }
      lista.itens.push({ texto: item.trim(), passo, linha });
      continue;
    }

    const caixa = CAIXA.exec(texto);
    if (caixa) {
      acrescentar({ tipo: 'caixa', caixa: caixa[1], rotulo: caixa[2]?.trim(), texto: caixa[3].trim(), linha });
      continue;
    }

    const figura = FIGURA.exec(texto);
    if (figura) {
      figurado = acrescentar({ tipo: 'figura', alt: figura[1].trim(), caminho: figura[2], linha });
      continue;
    }
    if (texto.startsWith('![')) {
      erro(linha, 'figura malformada: escreva "![descrição](caminho/da/figura.png)", sozinha na linha');
      continue;
    }
    if (/^#{3,}\s/.test(texto)) {
      erro(linha, `"${texto.split(/\s/)[0]}" não existe no roteiro: um slide é "## layout: título"`);
      continue;
    }

    if (paragrafo) {
      paragrafo.texto += ` ${texto}`;
      continue;
    }
    paragrafo = acrescentar({ tipo: 'paragrafo', texto, linha });
  }
  if (colunas) erro(colunas.linha, 'colunas sem o ::: de fechamento');
}

export function lerRoteiro(texto) {
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n');
  if (linhas.at(-1) === '') linhas.pop();
  const erros = [];
  const erro = (linha, mensagem) => erros.push({ linha, mensagem });
  const metas = {};
  let capa = null;
  const slides = [];

  let i = 0;
  if (linhas[0]?.trim() === '---') {
    let fechado = false;
    for (i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      if (linha.trim() === '---') {
        fechado = true;
        i += 1;
        break;
      }
      if (!linha.trim()) continue;
      const par = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(linha);
      if (!par) {
        erro(i + 1, `cabeçalho: "${linha.trim()}" não é "chave: valor"`);
        continue;
      }
      let valor = par[2].trim();
      if (valor.length >= 2 && /^(["']).*\1$/.test(valor)) valor = valor.slice(1, -1);
      if (Object.hasOwn(metas, par[1])) erro(i + 1, `meta "${par[1]}" repetida`);
      else metas[par[1]] = valor;
    }
    if (!fechado) erro(1, 'cabeçalho sem o --- de fechamento');
  }

  // Primeira passada: capa e slides, com as linhas de cada slide. Uma cerca de código pode ter `# ` e
  // `## ` (um comentário em Python), e dentro dela nada é cabeçalho.
  let atual = null;
  let corpo = [];
  const corpos = [];
  let emCerca = false;
  for (; i < linhas.length; i++) {
    const linha = linhas[i];
    const numero = i + 1;
    if (atual && CERCA.test(linha.trim()) && (emCerca ? FIM_DE_CERCA.test(linha.trim()) : true)) emCerca = !emCerca;
    if (!emCerca) {
      const capaAqui = /^#\s+(.*)$/.exec(linha);
      if (capaAqui) {
        if (capa) erro(numero, `duas capas: a capa já é a linha ${capa.linha}`);
        else if (atual) erro(numero, 'a capa vem antes do primeiro slide: mova "# Título | segunda linha" para cima');
        else {
          const dividido = dividirTitulo(capaAqui[1].trim());
          if (!dividido || !dividido.titulo) erro(numero, 'capa malformada: escreva "# Título | segunda linha"');
          capa = { ...(dividido ?? { titulo: capaAqui[1].trim() }), linha: numero };
        }
        continue;
      }
      const slideAqui = /^##\s+(.*)$/.exec(linha);
      if (slideAqui) {
        atual = lerCabecalhoDoSlide(slideAqui[1], numero, erro);
        corpo = [];
        if (atual) {
          slides.push(atual);
          corpos.push(corpo);
        }
        continue;
      }
    }
    if (!atual) {
      if (linha.trim()) {
        erro(numero, capa
          ? 'texto fora de slide: a capa é só a linha "# Título | segunda linha", e o que vem depois dela precisa de um "## layout: título"'
          : 'texto antes da capa: o roteiro começa pelo cabeçalho e por "# Título | segunda linha"');
      }
      continue;
    }
    corpo.push({ texto: linha, linha: numero });
  }
  if (!capa) erro(1, 'falta a capa: "# Título | segunda linha", antes do primeiro slide');
  slides.forEach((slide, k) => lerCorpo(slide, corpos[k], erro));
  return { metas, capa, slides, erros: ordenarErros(erros) };
}

const ordenarErros = (erros) => erros.map((e, k) => ({ e, k }))
  .sort((a, b) => a.e.linha - b.e.linha || a.k - b.k).map(({ e }) => e);

// ---------------------------------------------------------------------------------------------
// gerarAula: o contrato decide o que cada bloco vira e se cabe onde está.

// Um seletor simples do contrato (`tag`, `tag.classe`, `tex-destaque`) contra um elemento que o
// gerador vai escrever. Qualquer outra forma de seletor não casa: os de sequência e de blocos de corpo
// são todos simples.
function casaSimples(seletor, elemento) {
  if (seletor === 'tex-destaque' || elemento.tag === 'tex-destaque') return seletor === elemento.tag;
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)*$/.test(seletor)) return false;
  const [tag, ...classes] = seletor.split('.');
  return tag === elemento.tag && classes.every((classe) => elemento.classes.includes(classe));
}

const elemento = (seletor) => {
  if (seletor === 'tex-destaque') return { tag: 'tex-destaque', classes: [], seletor };
  const [tag, ...classes] = seletor.split('.');
  return { tag, classes, seletor };
};

// Os seletores que uma sequência nomeia, com os grupos expandidos.
function aceitosPor(sequencia, contrato) {
  return sequencia.flatMap((entrada) => {
    if (entrada.umDe) return aceitosPor(entrada.umDe.flat(), contrato);
    if (entrada.grupo) return contrato[entrada.grupo] ?? [];
    return entrada.seletor ? [entrada.seletor] : [];
  });
}

// O que cada bloco pode virar, em ordem de preferência; vale o primeiro que o recipiente aceita.
const CANDIDATOS = {
  paragrafo: ['p', 'p.afirmacao'],
  lide: ['p.lide'],
  pergunta: ['p.pergunta'],
  fonte: ['p.fonte'],
  proxima: ['p.proxima'],
  ul: ['ul', 'ol.sintese'],
  ol: ['ol.passos', 'ol.sintese'],
  figura: ['figure'],
  grafico: ['figure.grafico'],
  diagrama: ['figure.diagrama'],
  codigo: ['pre'],
  tex: ['tex-destaque'],
  colunas: ['div.colunas'],
};

function escolherSeletor(bloco, aceitos) {
  const candidatos = bloco.tipo === 'caixa' ? [`aside.${bloco.caixa}`]
    : CANDIDATOS[bloco.tipo === 'lista' ? bloco.lista : bloco.tipo];
  return candidatos.find((candidato) => aceitos.some((aceito) => casaSimples(aceito, elemento(candidato)))) ?? candidatos[0];
}

// O nome que o autor escreveu, para as mensagens: ele lê o roteiro, não o HTML.
function nomeNoRoteiro(seletor) {
  const nomes = {
    h2: 'título', p: 'parágrafo', 'p.afirmacao': 'parágrafo', 'p.lide': '"> lide"', 'p.pergunta': '"? pergunta"',
    'p.fonte': '"fonte:"', 'p.proxima': '"próxima:"', ul: 'lista', 'ol.passos': 'lista numerada', 'ol.sintese': 'lista',
    figure: 'figura', 'figure.grafico': 'gráfico', 'figure.diagrama': 'diagrama', pre: 'código',
    'tex-destaque': 'fórmula em destaque', 'div.colunas': 'colunas',
  };
  if (nomes[seletor]) return nomes[seletor];
  if (seletor.startsWith('aside.')) return `[${seletor.slice(6)}: …]`;
  return seletor;
}

// O que o roteiro não exprime e se escreve no HTML depois (spec 6.1: o roteiro é esqueleto).
const FORA_DO_ROTEIRO = {
  'div.demo': 'demo se escreve no HTML, com o script dela: veja guia/50',
};

function nomeDaFalta(entrada) {
  if (entrada.nomes) return entrada.nomes.map((nome) => (nome === 'bloco de corpo' ? 'um bloco de corpo' : nomeNoRoteiro(nome))).join(' ou ');
  if (entrada.grupo) return 'um bloco de corpo';
  return nomeNoRoteiro(entrada.seletor);
}

// Os blocos de um recipiente, com o seletor escolhido e a fonte e a próxima aula no fim, antes das
// notas (D1: "fonte: vira p.fonte, logo depois do corpo").
function ordenarRecipiente(blocos, aceitos) {
  const corpo = blocos.filter((bloco) => bloco.tipo !== 'fonte' && bloco.tipo !== 'proxima');
  const fim = [...blocos.filter((bloco) => bloco.tipo === 'fonte'), ...blocos.filter((bloco) => bloco.tipo === 'proxima')];
  return [...corpo, ...fim].map((bloco) => ({ ...bloco, seletor: escolherSeletor(bloco, aceitos) }));
}

const itemDe = (seletor) => {
  const alvo = elemento(seletor);
  return alvo.tag === 'tex-destaque'
    ? { tipo: 'tex-destaque', trecho: seletor }
    : { tipo: 'elemento', trecho: seletor, no: { matches: (outro) => casaSimples(outro, alvo) } };
};

function conferirSlide(slide, blocos, contrato, erro) {
  const { layout } = slide;
  // Uma marcação desconhecida já deu o seu erro, e sem saber o que ela seria a conferência de ordem e
  // de quantidade só inventaria outros.
  if (blocos.some((bloco) => bloco.invalido)) return;
  const sequencia = contrato.layouts[layout].sequencia;
  const elementos = [];
  if (slide.titulo !== undefined) elementos.push({ seletor: 'h2', linha: slide.linha });
  for (const bloco of blocos) elementos.push({ seletor: bloco.seletor, linha: bloco.linha });
  const itens = elementos.map(({ seletor }) => itemDe(seletor));
  const { faltando, sobrando } = casarSequencia(itens, sequencia, contrato);
  for (const entrada of faltando) {
    if (entrada.seletor && FORA_DO_ROTEIRO[entrada.seletor]) erro(slide.linha, FORA_DO_ROTEIRO[entrada.seletor]);
    else if (entrada.seletor === 'h2') erro(slide.linha, `${layout} pede título: "## ${layout}: título"`);
    else erro(slide.linha, `${layout} pede ${nomeDaFalta(entrada)}`);
  }
  const aceitaFigura = aceitosPor(sequencia, contrato).some((seletor) => casaSimples(seletor, elemento('figure')));
  const temColunas = blocos.some((bloco) => bloco.tipo === 'colunas');
  for (const { item, foraDeOrdem, excedente } of sobrando) {
    const alvo = elementos[itens.indexOf(item)];
    const nome = nomeNoRoteiro(alvo.seletor);
    if (alvo.seletor === 'h2' && !excedente) {
      erro(alvo.linha, `${layout} não tem título: a frase é o slide`);
    } else if (excedente) {
      erro(alvo.linha, `${nome} a mais em ${layout}: só um`);
    } else if (foraDeOrdem) {
      erro(alvo.linha, `${nome} fora de ordem em ${layout}`);
    } else {
      let mensagem = `${nome} não cabe em ${layout}`;
      if (alvo.seletor === 'p.fonte' && temColunas) mensagem += '; com colunas, escreva "fonte:" dentro de uma coluna';
      else if (alvo.seletor === 'p.fonte' && aceitaFigura) mensagem += '; aqui, o crédito vai na "legenda:" da figura';
      erro(alvo.linha, mensagem);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// A escrita do HTML, no desenho do modelo (modelos/aula/index.html): dois espaços por nível, o `pre`
// na primeira coluna do arquivo.

function escreverLegenda(bloco, recuo) {
  return bloco.legenda === undefined ? [] : [`${recuo}  <figcaption>${emLinha(bloco.legenda)}</figcaption>`];
}

function escreverScript(bloco, tipo, recuo) {
  const linhas = bloco.conteudo.map((linha) => (linha.trim() ? `${recuo}  ${linha}` : ''));
  return [`${recuo}  <script type="${tipo}">`, ...linhas, `${recuo}  </script>`];
}

function escreverBloco(bloco, recuo, figuras) {
  const { seletor } = bloco;
  const [tag, ...classes] = seletor.split('.');
  const classe = classes.length ? ` class="${classes.join(' ')}"` : '';
  switch (bloco.tipo) {
    case 'paragrafo': case 'lide': case 'pergunta': case 'fonte': case 'proxima': {
      const texto = bloco.tipo === 'proxima' ? `Próxima aula: ${bloco.texto}` : bloco.texto;
      return [`${recuo}<p${classe}>${emLinha(texto)}</p>`];
    }
    case 'lista':
      return [
        `${recuo}<${tag}${classe}>`,
        ...bloco.itens.map((item) => `${recuo}  <li${item.passo ? ' data-passo' : ''}>${emLinha(item.texto)}</li>`),
        `${recuo}</${tag}>`,
      ];
    case 'caixa': {
      const rotulo = bloco.rotulo ? ` data-rotulo="${escaparAtributo(bloco.rotulo)}"` : '';
      return [`${recuo}<aside class="${bloco.caixa}"${rotulo}>${emLinha(bloco.texto)}</aside>`];
    }
    case 'figura':
      return [
        `${recuo}<figure>`,
        `${recuo}  <img src="${escaparAtributo(figuras.get(bloco.linha).destino)}" alt="${escaparAtributo(bloco.alt)}">`,
        ...escreverLegenda(bloco, recuo),
        `${recuo}</figure>`,
      ];
    case 'grafico':
      return [`${recuo}<figure class="grafico">`, ...escreverScript(bloco, 'application/json', recuo), ...escreverLegenda(bloco, recuo), `${recuo}</figure>`];
    case 'diagrama':
      return [`${recuo}<figure class="diagrama">`, ...escreverScript(bloco, 'text/vnd.graphviz', recuo), ...escreverLegenda(bloco, recuo), `${recuo}</figure>`];
    case 'codigo':
      return [`<pre data-lang="${escaparAtributo(bloco.linguagem)}">`, ...bloco.conteudo.map(escapar), '</pre>'];
    case 'tex':
      return [`${recuo}\\[ ${escaparTex(bloco.tex)} \\]`];
    case 'colunas':
      return [
        `${recuo}<div class="colunas" data-grade="${escaparAtributo(bloco.grade)}">`,
        ...bloco.colunas.flatMap((coluna) => [
          `${recuo}  <div>`,
          ...coluna.flatMap((filho) => escreverBloco(filho, `${recuo}    `, figuras)),
          `${recuo}  </div>`,
        ]),
        `${recuo}</div>`,
      ];
    default:
      throw new Error(`bloco sem escrita: ${bloco.tipo}`);
  }
}

function escreverTitulo(tag, titulo, segunda) {
  const sinal = segunda !== undefined ? `<br><span class="sinal">${emLinha(segunda)}</span>` : '';
  return `<${tag}>${emLinha(titulo)}${sinal}</${tag}>`;
}

// O nome curto que o autor não deu: o título truncado no limite do contrato, numa fronteira de palavra
// quando há uma dentro do limite.
function curtoAutomatico(texto, maximo) {
  if (texto.length <= maximo) return texto;
  const cortado = texto.slice(0, maximo);
  const espaco = texto[maximo] === ' ' ? maximo : cortado.lastIndexOf(' ');
  return (espaco > 0 ? cortado.slice(0, espaco) : cortado).trim();
}

const EH_URL = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

// D4: cada figura relativa ao roteiro vai para img/<nome>; nomes iguais de origens diferentes ganham
// sufixo, na ordem em que aparecem.
function planejarFiguras(slides, erro) {
  const porLinha = new Map();
  const porOrigem = new Map();
  const destinos = new Set();
  const lista = [];
  const visitar = (blocos) => {
    for (const bloco of blocos) {
      if (bloco.tipo === 'colunas') bloco.colunas.forEach(visitar);
      if (bloco.tipo !== 'figura') continue;
      const { caminho, linha } = bloco;
      if (EH_URL.test(caminho) || caminho.startsWith('/') || caminho.startsWith('\\')) {
        erro(linha, `a figura "${caminho}" tem de estar junto do roteiro, num caminho relativo a ele`);
        porLinha.set(bloco.linha, { destino: '' });
        continue;
      }
      const origem = caminho.split('/').filter((parte) => parte !== '.' && parte !== '').join('/');
      if (!porOrigem.has(origem)) {
        const nome = origem.split('/').at(-1);
        const ponto = nome.lastIndexOf('.');
        const [base, extensao] = ponto > 0 ? [nome.slice(0, ponto), nome.slice(ponto)] : [nome, ''];
        let destino = `img/${nome}`;
        for (let n = 2; destinos.has(destino); n++) destino = `img/${base}-${n}${extensao}`;
        destinos.add(destino);
        const figura = { origem, destino, linha };
        porOrigem.set(origem, figura);
        lista.push(figura);
      }
      porLinha.set(bloco.linha, porOrigem.get(origem));
    }
  };
  for (const slide of slides) visitar(slide.blocos);
  return { porLinha, lista };
}

export function gerarAula(roteiro, { contrato, tagDoRuntime }) {
  if (!contrato || !tagDoRuntime) throw new Error('gerarAula: faltam o contrato e a tag do runtime');
  const erros = [...roteiro.erros];
  const erro = (linha, mensagem) => erros.push({ linha, mensagem });

  // Metas: as do contrato, na ordem dele; uma obrigatória ausente ou uma desconhecida é erro (D2).
  const nomesDasMetas = Object.keys(contrato.metadados);
  for (const nome of Object.keys(roteiro.metas)) {
    if (!nomesDasMetas.includes(nome)) erro(1, `meta "${nome}" não existe; use uma de: ${nomesDasMetas.join(', ')}`);
  }
  for (const [nome, regra] of Object.entries(contrato.metadados)) {
    if (regra.obrigatorio && !(roteiro.metas[nome] ?? '').trim()) erro(1, `falta a meta obrigatória "${nome}" no cabeçalho`);
  }

  // Os layouts que um `##` pode pedir: todos os do contrato, menos o da capa, que sai do `#`.
  const layoutsDeSlide = Object.keys(contrato.layouts)
    .filter((nome) => !contrato.layouts[nome].sequencia.some((entrada) => entrada.seletor === 'h1'));
  const padraoDoId = new RegExp(contrato.html.atributos.section.id.padrao);
  const layoutsComCurto = contrato.html.atributos.section['data-curto']?.layouts ?? [];
  const tiposDeCaixa = contrato.blocosDeCorpo.filter((seletor) => seletor.startsWith('aside.')).map((seletor) => seletor.slice(6));
  const aceitosNaColuna = contrato[contrato.filhos['div.colunas > div'].grupo];

  // Confere os blocos de um recipiente e devolve cópias, na ordem de escrita e com o seletor
  // escolhido; o roteiro que entrou não é tocado.
  const prepararBlocos = (blocos, aceitos) => ordenarRecipiente(blocos.map((bloco) => {
    const copia = { ...bloco };
    if (bloco.tipo === 'caixa' && !tiposDeCaixa.includes(bloco.caixa)) {
      copia.invalido = true;
      erro(bloco.linha, `marcação desconhecida [${bloco.caixa}: …]; use ${tiposDeCaixa.map((tipo) => `[${tipo}: …]`).join(', ')}`);
    }
    if (bloco.tipo === 'codigo' && !contrato.linguagens.includes(bloco.linguagem)) {
      erro(bloco.linha, `linguagem "${bloco.linguagem}" não existe; use uma de: ${contrato.linguagens.join(', ')}, ou grafico e dot`);
    }
    if (bloco.tipo === 'colunas') {
      if (bloco.grade && !Object.hasOwn(contrato.grades, bloco.grade)) {
        erro(bloco.linha, `grade "${bloco.grade}" não existe; use uma de: ${Object.keys(contrato.grades).join(', ')}`);
      } else if (bloco.grade && contrato.grades[bloco.grade] !== bloco.colunas.length) {
        erro(bloco.linha, `a grade ${bloco.grade} pede ${contrato.grades[bloco.grade]} colunas, e há ${bloco.colunas.length}; separe-as com ---`);
      }
      copia.colunas = bloco.colunas.map((coluna) => {
        const preparada = prepararBlocos(coluna, aceitosNaColuna);
        for (const filho of preparada) {
          if (!filho.invalido && !aceitosNaColuna.some((aceito) => casaSimples(aceito, elemento(filho.seletor)))) {
            erro(filho.linha, `${nomeNoRoteiro(filho.seletor)} não cabe numa coluna`);
          }
        }
        return preparada;
      });
    }
    return copia;
  }), aceitos);

  const figuras = planejarFiguras(roteiro.slides, erro);

  // Ids: o do autor, ou o slug do título pela regra do montar (montar/montar.js); repetidos ganham
  // -2, -3 (D3). A capa e o encerramento ficam sem id, como no modelo, salvo {#id} do autor.
  const explicitos = new Map();
  for (const slide of roteiro.slides) {
    if (slide.id === undefined) continue;
    if (!padraoDoId.test(slide.id)) erro(slide.linha, `id "${slide.id}" inválido: letras minúsculas, números e hífens`);
    if (explicitos.has(slide.id)) erro(slide.linha, `id "${slide.id}" repetido: já é do slide da linha ${explicitos.get(slide.id)}`);
    else explicitos.set(slide.id, slide.linha);
  }
  const usados = new Set(explicitos.keys());

  const secoes = [];
  roteiro.slides.forEach((slide, indice) => {
    const { layout } = slide;
    if (!Object.hasOwn(contrato.layouts, layout) || !layoutsDeSlide.includes(layout)) {
      erro(slide.linha, Object.hasOwn(contrato.layouts, layout)
        ? `a ${layout} sai da linha "# Título | segunda linha", não de um "##"`
        : `layout "${layout}" não existe; use um de: ${layoutsDeSlide.join(', ')}`);
      return;
    }
    if (slide.curto !== undefined && !layoutsComCurto.includes(layout)) {
      erro(slide.linha, `curto="…" só vale em ${layoutsComCurto.join(', ')}`);
    }
    const sequencia = contrato.layouts[layout].sequencia;
    const blocos = prepararBlocos(slide.blocos, aceitosPor(sequencia, contrato));
    conferirSlide(slide, blocos, contrato, erro);

    let { id } = slide;
    const planoDoTitulo = textoPlano([slide.titulo, slide.segunda].filter((parte) => parte !== undefined).join(' '));
    if (id === undefined && layout !== 'encerramento') {
      const afirmacao = blocos.find((bloco) => bloco.seletor === 'p.afirmacao');
      const base = slug(slide.titulo !== undefined ? planoDoTitulo : textoPlano(afirmacao?.texto ?? '')) || `slide-${indice + 2}`;
      id = base;
      for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
      usados.add(id);
    }
    let { curto } = slide;
    if (curto === undefined && layoutsComCurto.includes(layout)
      && planoDoTitulo.length > contrato.limites['abertura.h2.caracteresSemDataCurto']) {
      curto = curtoAutomatico(planoDoTitulo, contrato.limites['abertura.dataCurto.caracteres']);
    }

    const linhas = [`<section data-layout="${layout}"${id !== undefined ? ` id="${escaparAtributo(id)}"` : ''}${curto !== undefined ? ` data-curto="${escaparAtributo(curto)}"` : ''}>`];
    if (slide.titulo !== undefined) linhas.push(`  ${escreverTitulo('h2', slide.titulo, slide.segunda)}`);
    for (const bloco of blocos) linhas.push(...escreverBloco(bloco, '  ', figuras.porLinha));
    if (slide.notas.length) linhas.push(`  <aside class="notas">${slide.notas.map((nota) => emLinha(nota.texto)).join('\n\n')}</aside>`);
    linhas.push('</section>');
    secoes.push(linhas.join('\n'));
  });

  const ordenados = ordenarErros(erros);
  if (ordenados.length) return { html: null, figuras: figuras.lista, erros: ordenados };

  const { capa } = roteiro;
  const metas = nomesDasMetas.filter((nome) => Object.hasOwn(roteiro.metas, nome))
    .map((nome) => `<meta name="${nome}" content="${escaparAtributo(roteiro.metas[nome])}">`);
  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapar(textoPlano(capa.titulo))}</title>`,
    ...metas,
    tagDoRuntime,
    '</head>',
    '<body>',
    '',
    ['<section data-layout="capa">', `  ${escreverTitulo('h1', capa.titulo, capa.segunda)}`, '</section>'].join('\n'),
    '',
    ...secoes.flatMap((secao) => [secao, '']),
    '</body>',
    '</html>',
    '',
  ].join('\n');
  return { html, figuras: figuras.lista, erros: [] };
}
