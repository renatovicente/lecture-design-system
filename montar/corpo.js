// Blocos de corpo que a montagem completa (spec 7.1): rótulos do exercício.

export function rotularExercicios(raiz, rot) {
  for (const enunciado of raiz.querySelectorAll('div.exercicio > div.enunciado')) enunciado.setAttribute('data-rotulo', rot.exercicio);
  for (const resposta of raiz.querySelectorAll('div.exercicio > div.resposta')) resposta.setAttribute('data-rotulo', rot.resposta);
}
