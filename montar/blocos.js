// Blocos da aula derivados das aberturas (spec 5.4).

export function textoDeTitulo(elemento) {
  if (!elemento) return '';
  const partes = [];
  const percorrer = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) partes.push(filho.nodeValue);
      else if (filho.nodeType === 1 && filho.nodeName === 'BR') partes.push(' ');
      else if (filho.nodeType === 1) percorrer(filho);
    }
  };
  percorrer(elemento);
  return partes.join('').replace(/\s+/g, ' ').trim();
}

export function derivarBlocos(secoes, { minBlocos, maxFileira }) {
  const blocos = [];
  const blocoDaSecao = [];
  secoes.forEach((secao, indice) => {
    if (secao.getAttribute('data-layout') === 'abertura') {
      const titulo = textoDeTitulo(secao.querySelector('h2'));
      blocos.push({ numero: blocos.length + 1, titulo, curto: secao.getAttribute('data-curto') || titulo, indice });
    }
    blocoDaSecao.push(blocos.length > 0 ? blocos.length : null);
  });
  let modo = 'fileira';
  if (blocos.length < minBlocos) modo = 'nenhum';
  else if (blocos.length > maxFileira) modo = 'contador';
  return { blocos, blocoDaSecao, modo };
}

export function estadosDosQuadrados(total, blocoAtual, { encerramento = false } = {}) {
  return Array.from({ length: total }, (_, k) => {
    const numero = k + 1;
    if (encerramento) return 'visto';
    if (blocoAtual === null) return 'futuro';
    if (numero < blocoAtual) return 'visto';
    return numero === blocoAtual ? 'atual' : 'futuro';
  });
}
