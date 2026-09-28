// Entrada do pacote dist/aula-usp.js (spec 3.3/8.1). Script CLÁSSICO, de propósito: roda durante a
// leitura do <head> e instala window.AulaUSP.demo ANTES do <script> do autor, que chama AulaUSP.demo
// durante o parsing. Por isso não pode ser módulo — e por isso iniciar(), lá embaixo, não é esperada
// aqui: sem await de nível superior (o formato iife do esbuild não aceita), o retorno dela é tratado
// com o .catch() de baixo, e o topo do artefato continua um IIFE comum, (()=>{...})().
import { iniciar } from './entrada.js';
import tokens from '../estilos/tokens.css';
import fontes from '../estilos/fontes.css';
import estiloBase from '../estilos/base.css';
import layouts from '../estilos/layouts.css';
import componentes from '../estilos/componentes.css';
import motorCss from '../estilos/motor.css';
import impressao from '../estilos/impressao.css';
// As quatro buscas de rede que entrada.js faria por padrão (rodada de correção 1, item 1): a spec 3.2
// proíbe qualquer recurso que não seja script, e três destas quatro estavam num Promise.all sem
// guarda — bloqueadas, a aula não montava. O loader de .json do esbuild já as devolve como objeto.
import unidades from '../assets/marcas/unidades.json';
import usp from '../assets/marcas/usp.json';
import contrato from '../contrato/contrato.json';
import cobertura from '../validador/cobertura.json';
// Os arquivos de marca (os três primeiros na mesma rodada, mesmo item; o do ACS depois). SVG como texto (loader '.svg': 'text' — já
// declarado em COMUM, e até agora morto): percent-encoding custa bem menos que base64 num arquivo de
// 155 kB (ime-usp-horizontal-preta.svg), e é por isso que o loader não é 'dataurl' aqui. O PNG não
// tem essa saída — binário puro — e sai pronto do loader 'dataurl' como data URI completa.
import svgIme from '../assets/marcas/ime-usp-horizontal-preta.svg';
import svgUsp from '../assets/marcas/usp-preto.svg';
import pngIfusp from '../assets/marcas/ifusp-vertical-preto.png';
import pngAcs from '../assets/marcas/acs-preto.png';
// O do CIAAM (1.0.1), o único em cor, pela exceção da spec 4.5.
import pngCiaam from '../assets/marcas/ciaam-azul.png';

// As chaves são os mesmos caminhos que iniciar() pede; quem empacota resolveu o conteúdo.
const EMBUTIDAS = new Map([
  ['estilos/tokens.css', tokens], ['estilos/fontes.css', fontes], ['estilos/base.css', estiloBase],
  ['estilos/layouts.css', layouts], ['estilos/componentes.css', componentes],
  ['estilos/motor.css', motorCss], ['estilos/impressao.css', impressao],
  // A CSS do KaTeX NÃO está aqui: aula-usp-tex.js injeta a sua, já com as 20 fontes como data URI
  // (tarefa 2). Uma aula sem matemática não deve pagar 361 kB por ela.
]);

// Os quatro JSON que iniciar() pediria por fetch (chave = o mesmo caminho que `dados()` recebe).
const DADOS = new Map([
  ['assets/marcas/unidades.json', unidades],
  ['assets/marcas/usp.json', usp],
  ['contrato/contrato.json', contrato],
  ['validador/cobertura.json', cobertura],
]);

// As marcas que criarFaixaDeMarca (montar/cromo.js) pediria por <img src>, já como data URI.
const MARCAS = new Map([
  ['ime-usp-horizontal-preta.svg', `data:image/svg+xml,${encodeURIComponent(svgIme)}`],
  ['usp-preto.svg', `data:image/svg+xml,${encodeURIComponent(svgUsp)}`],
  ['ifusp-vertical-preto.png', pngIfusp],
  ['acs-preto.png', pngAcs],
  ['ciaam-azul.png', pngCiaam],
]);

const ocultar = document.createElement('style');
ocultar.setAttribute('data-aula-usp', 'ocultar');
ocultar.textContent = 'body { visibility: hidden; }';
document.head.append(ocultar);

const filaDeDemos = [];
window.AulaUSP = { filaDeDemos, demo(nome, definicao) { filaDeDemos.push({ nome, definicao }); } };

// currentScript só vale durante a execução síncrona; guarde agora, não depois do await.
const base = document.currentScript?.src;

// Um só lugar traduz nome de arquivo em endereço — o resolver abaixo e o import map usam este. Dois
// lugares resolvendo o mesmo nome é como o integrity de um satélite passa a valer para um endereço e
// o pedido sai para outro: o navegador não acha chave para a URL pedida e não confere nada, calado.
const urlDoSatelite = (arquivo) => new URL(arquivo, base).href;

// As três libs de gráficos (spec 3.5) resolvem para o MESMO satélite — a mesma ideia de
// '@shikijs/primitive'/'@shikijs/engine-javascript' caindo em aula-usp-codigo.js, duas linhas abaixo.
const D3_DO_GRAFICO = new Set(['d3-scale', 'd3-shape', 'd3-array']);

// Qual satélite atende cada especificador que entrada.js pede. Só nomes de arquivo: o endereço é de
// urlDoSatelite, e o hash de cada um vem de SATELITES_EMBUTIDOS, chaveado pelo mesmo nome de arquivo.
const arquivoDoSatelite = (nome) => nome === 'katex' ? 'aula-usp-tex.js'
  : nome.startsWith('@shikijs/langs/') ? `aula-usp-lang-${nome.split('/').pop()}.js`
  : D3_DO_GRAFICO.has(nome) ? 'aula-usp-graficos.js'
  : nome === '@hpcc-js/wasm-graphviz' ? 'aula-usp-diagramas.js'
  : 'aula-usp-codigo.js';

// Spec 3.2, passo 5: "cada script secundário é carregado com o seu integrity, que aula-usp.js traz
// embutido para a mesma versão". O mecanismo é o import map, e não o atributo: os secundários entram
// por import() dinâmico, que NÃO tem onde receber integrity — não existe argumento para isso, e é por
// isso que a promessa ficou sem cumprir desde a spec. O import map tem a chave `integrity`, chaveada
// pela URL do módulo, e o Chrome a honra também no import() dinâmico.
//
// Medido nas duas direções, com Chrome de verdade, exatamente nesta forma (mapa só com `integrity`,
// sem `imports`, injetado por script CLÁSSICO, import() por URL absoluta): com o hash certo o módulo
// carrega; com o hash corrompido o import() rejeita com "Failed to fetch dynamically imported module"
// e o console traz "Failed to find a valid digest in the 'integrity' attribute … has been blocked".
//
// Sem `imports`: entrada.js pede pelo especificador e o resolver já devolve a URL final, então não há
// nome nu para o mapa traduzir. Uma seção `imports` aqui seria a segunda tradução de nome em endereço
// — a duplicação que urlDoSatelite existe para não haver.
//
// SATELITES_EMBUTIDOS é `define` do empacotador (build/bundle.mjs): nome de arquivo → sha384. Não é
// declarado em lugar nenhum — de propósito, para que empacotar sem o define lance na carga em vez de
// entregar uma aula que carrega tudo sem conferir nada.
//
// Aqui, e não dentro de iniciar(): o mapa precisa estar no documento ANTES do primeiro import(), e
// iniciar() é assíncrona (o primeiro import() dela vem depois de dois await). E `base` é lido acima,
// antes de qualquer await, pela mesma razão de sempre — currentScript já seria null.
if (base) {
  const mapa = document.createElement('script');
  mapa.type = 'importmap';
  mapa.textContent = JSON.stringify({
    integrity: Object.fromEntries(Object.entries(SATELITES_EMBUTIDOS)
      .map(([arquivo, hash]) => [urlDoSatelite(arquivo), hash])),
  });
  document.head.append(mapa);
}

iniciar({
  base,
  // vizinhos em dist/: o empacotador não adivinha, o chamador diz.
  resolver: (nome) => urlDoSatelite(arquivoDoSatelite(nome)),
  dados: (caminho) => DADOS.get(caminho),
  marca: (arquivo) => MARCAS.get(arquivo),
  estilo: (caminho) => {
    // Chave desconhecida (hoje só a do KaTeX): nada a fazer. Injetar <style> vazio funcionaria e
    // esconderia o caso; retornar cedo deixa explícito que o satélite é quem cuida dela.
    const texto = EMBUTIDAS.get(caminho);
    if (texto === undefined) return;
    const folha = document.createElement('style');
    folha.textContent = texto;
    document.head.append(folha);
  },
}).catch((erro) => {
  ocultar.remove();
  console.error('Aula USP: o runtime não carregou.', erro);
});
