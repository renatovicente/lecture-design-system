// Expande as faixas de validador/cobertura.json no conjunto de pontos de código com glifo.
// Puro de propósito: roda no navegador, como todo o resto de validador/ (spec 3.5). Quem GERA o
// arquivo é build/cobertura.mjs, que é Node; quem o LÊ é este módulo, que não pode ser.
export function lerCobertura({ pontos }) {
  const conjunto = new Set();
  for (const [inicio, fim] of pontos) for (let p = inicio; p <= fim; p++) conjunto.add(p);
  return conjunto;
}
