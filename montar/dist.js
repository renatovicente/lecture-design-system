// Entrada do pacote dist/aula-usp.js (spec 3.3/8.1). Script CLÁSSICO, de propósito: roda durante a
// leitura do <head> e instala window.AulaUSP.demo ANTES do <script> do autor, que chama AulaUSP.demo
// durante o parsing. Por isso não pode ser módulo, e por isso iniciar() é chamada dentro de um async
// IIFE: o formato iife do esbuild não aceita top-level await.
import { iniciar } from './entrada.js';
import tokens from '../estilos/tokens.css';
import fontes from '../estilos/fontes.css';
import estiloBase from '../estilos/base.css';
import layouts from '../estilos/layouts.css';
import componentes from '../estilos/componentes.css';
import motorCss from '../estilos/motor.css';
import impressao from '../estilos/impressao.css';

// As chaves são os mesmos caminhos que iniciar() pede; quem empacota resolveu o conteúdo.
const EMBUTIDAS = new Map([
  ['estilos/tokens.css', tokens], ['estilos/fontes.css', fontes], ['estilos/base.css', estiloBase],
  ['estilos/layouts.css', layouts], ['estilos/componentes.css', componentes],
  ['estilos/motor.css', motorCss], ['estilos/impressao.css', impressao],
  // A CSS do KaTeX NÃO está aqui: aula-usp-tex.js injeta a sua, já com as 20 fontes como data URI
  // (tarefa 2). Uma aula sem matemática não deve pagar 361 kB por ela.
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
