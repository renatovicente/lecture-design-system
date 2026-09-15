// Textos do sistema em pt-BR e en (spec 6.8). O idioma vem do lang da aula.
export const ROTULOS = {
  'pt-BR': {
    introducao: 'Introdução',
    encerramento: 'Encerramento',
    bloco: 'Bloco',
    de: 'de',
    aula: 'Aula',
    meses: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  },
  en: {
    introducao: 'Introduction',
    encerramento: 'Closing',
    bloco: 'Block',
    de: 'of',
    aula: 'Lecture',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

export function rotulosPara(lang) {
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('en')) return ROTULOS.en;
  return ROTULOS['pt-BR'];
}
