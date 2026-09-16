// Cópias de slides (spec 6.6 e 6.9): ids ganham sufixo e as referências internas passam a apontar para a cópia.

const REFERENCIAS = ['href', 'clip-path', 'marker-start', 'marker-end', 'fill', 'stroke'];

function reescrever(valor, mapa) {
  const direta = /^#(.+)$/.exec(valor);
  if (direta) return mapa.has(direta[1]) ? `#${mapa.get(direta[1])}` : valor;
  return valor.replace(/url\((['"]?)#([^'")]+)\1\)/g, (todo, aspas, id) => (mapa.has(id) ? `url(${aspas}#${mapa.get(id)}${aspas})` : todo));
}

export function copiarSlide(slide, sufixo) {
  const copia = slide.cloneNode(true);
  const mapa = new Map();
  for (const elemento of [copia, ...copia.querySelectorAll('[id]')]) {
    const id = elemento.getAttribute('id');
    if (!id) continue;
    mapa.set(id, `${id}-${sufixo}`);
    elemento.setAttribute('id', `${id}-${sufixo}`);
  }
  if (mapa.size > 0) {
    for (const elemento of [copia, ...copia.querySelectorAll('*')]) {
      for (const atributo of REFERENCIAS) {
        const valor = elemento.getAttribute(atributo);
        if (!valor) continue;
        const novo = reescrever(valor, mapa);
        if (novo !== valor) elemento.setAttribute(atributo, novo);
      }
    }
  }
  return copia;
}
