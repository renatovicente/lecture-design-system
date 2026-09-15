// Carregador clássico do modo de desenvolvimento (spec 3.2), posto por `aula-usp servir` no lugar da tag do runtime.
// Roda durante a leitura do <head>: esconde o corpo, cria a fila de AulaUSP.demo e importa a entrada modular.
(() => {
  const ocultar = document.createElement('style');
  ocultar.setAttribute('data-aula-usp', 'ocultar');
  ocultar.textContent = 'body { visibility: hidden; }';
  document.head.append(ocultar);

  const filaDeDemos = [];
  window.AulaUSP = {
    filaDeDemos,
    demo(nome, definicao) {
      filaDeDemos.push({ nome, definicao });
    },
  };

  import(new URL('navegador.js', document.currentScript.src).href).catch((erro) => {
    ocultar.remove();
    console.error('Aula USP: a entrada do navegador não carregou.', erro);
  });
})();
