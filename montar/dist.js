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
// Os três arquivos de marca (mesma rodada, mesmo item). SVG como texto (loader '.svg': 'text' — já
// declarado em COMUM, e até agora morto): percent-encoding custa bem menos que base64 num arquivo de
// 155 kB (ime-usp-horizontal-preta.svg), e é por isso que o loader não é 'dataurl' aqui. O PNG não
// tem essa saída — binário puro — e sai pronto do loader 'dataurl' como data URI completa.
import svgIme from '../assets/marcas/ime-usp-horizontal-preta.svg';
import svgUsp from '../assets/marcas/usp-preto.svg';
import pngIfusp from '../assets/marcas/ifusp-vertical-preto.png';

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

// As três marcas que criarFaixaDeMarca (montar/cromo.js) pediria por <img src>, já como data URI.
const MARCAS = new Map([
  ['ime-usp-horizontal-preta.svg', `data:image/svg+xml,${encodeURIComponent(svgIme)}`],
  ['usp-preto.svg', `data:image/svg+xml,${encodeURIComponent(svgUsp)}`],
  ['ifusp-vertical-preto.png', pngIfusp],
]);

const ocultar = document.createElement('style');
ocultar.setAttribute('data-aula-usp', 'ocultar');
ocultar.textContent = 'body { visibility: hidden; }';
document.head.append(ocultar);

const filaDeDemos = [];
window.AulaUSP = { filaDeDemos, demo(nome, definicao) { filaDeDemos.push({ nome, definicao }); } };

// currentScript só vale durante a execução síncrona; guarde agora, não depois do await.
const base = document.currentScript?.src;

iniciar({
  base,
  // vizinhos em dist/: o empacotador não adivinha, o chamador diz.
  resolver: (nome) => new URL(nome === 'katex' ? 'aula-usp-tex.js'
    : nome.startsWith('@shikijs/langs/') ? `aula-usp-lang-${nome.split('/').pop()}.js`
    : 'aula-usp-codigo.js', base).href,
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
