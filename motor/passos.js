// Passos de um slide (spec 6.4): elementos do corpo com data-passo, revelados em grupos.

const NUMERO = /^[1-9][0-9]*$/;

export function gruposDePassos(slide) {
  const elementos = [...slide.querySelectorAll('.area [data-passo]')];
  const numeros = elementos.map((elemento) => elemento.getAttribute('data-passo'));
  if (!numeros.every((numero) => NUMERO.test(numero))) return elementos.map((elemento) => [elemento]);
  const porNumero = new Map();
  elementos.forEach((elemento, k) => {
    const numero = Number(numeros[k]);
    if (!porNumero.has(numero)) porNumero.set(numero, []);
    porNumero.get(numero).push(elemento);
  });
  return [...porNumero.keys()].sort((a, b) => a - b).map((numero) => porNumero.get(numero));
}

export function aplicarPassos(grupos, revelados) {
  grupos.forEach((grupo, k) => {
    for (const elemento of grupo) {
      if (k < revelados) elemento.setAttribute('data-revelado', '');
      else elemento.removeAttribute('data-revelado');
    }
  });
}

export function passosRevelados(grupos) {
  return grupos.filter((grupo) => grupo[0].hasAttribute('data-revelado')).length;
}
