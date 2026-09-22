// Gráficos (spec 7.2): a especificação em JSON de figure.grafico vira SVG. O d3 chega por parâmetro,
// para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.

// Cores das séries (spec 7.2): uma série sai em tinta. Duas ou três: a de foco (campo `foco`; na
// falta dele, a ÚLTIMA de `y`) sai em azul, e as demais em tinta e em cinza tracejada, NESSA ORDEM.
// O validador (recursos.grafico) é quem recusa um `foco` que não está em `y`; aqui a entrada já veio
// conferida, e o ?? só cobre a ausência, que é legítima.
export function coresDasSeries(y, foco) {
  if (y.length === 1) return [{ serie: y[0], cor: 'tinta', tracejada: false }];
  const emFoco = foco ?? y.at(-1);
  const sobra = [{ cor: 'tinta', tracejada: false }, { cor: 'cinza', tracejada: true }];
  return y.map((serie) => (serie === emFoco
    ? { serie, cor: 'azul', tracejada: false }
    : { serie, ...sobra.shift() }));
}
