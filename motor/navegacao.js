// Navegação (spec 6.2 e 6.3): ação de cada tecla, avanço e retorno com passos, endereço #id/n.

const TECLAS = {
  ArrowRight: 'avancar',
  ' ': 'avancar',
  PageDown: 'avancar',
  ArrowLeft: 'voltar',
  PageUp: 'voltar',
  Home: 'primeiro',
  End: 'ultimo',
  Escape: 'escape',
  n: 'notas',
  N: 'notas',
  p: 'apresentador',
  P: 'apresentador',
  f: 'tela-cheia',
  F: 'tela-cheia',
  '?': 'ajuda',
};

export function acaoDaTecla({ key, ctrlKey = false, metaKey = false, altKey = false }) {
  const altGr = ctrlKey && altKey && !metaKey && key.length === 1;
  if ((ctrlKey || metaKey || altKey) && !altGr) return null;
  if (/^[1-8]$/.test(key)) return `bloco-${key}`;
  return Object.hasOwn(TECLAS, key) ? TECLAS[key] : null;
}

export function avancar({ indice, passo }, passosPorSlide) {
  if (passo < passosPorSlide[indice]) return { indice, passo: passo + 1 };
  if (indice < passosPorSlide.length - 1) return { indice: indice + 1, passo: 0 };
  return { indice, passo };
}

export function voltar({ indice, passo }, passosPorSlide) {
  if (passo > 0) return { indice, passo: passo - 1 };
  if (indice > 0) return { indice: indice - 1, passo: passosPorSlide[indice - 1] };
  return { indice, passo };
}

export function lerEndereco(hash, ids, passosPorSlide) {
  const [id, textoDoPasso = ''] = hash.replace(/^#/, '').split('/');
  const indice = ids.indexOf(id);
  if (indice < 0) return null;
  const passo = /^[0-9]+$/.test(textoDoPasso) ? Math.min(Number(textoDoPasso), passosPorSlide[indice]) : 0;
  return { indice, passo };
}

export function escreverEndereco({ indice, passo }, ids) {
  return passo > 0 ? `#${ids[indice]}/${passo}` : `#${ids[indice]}`;
}
