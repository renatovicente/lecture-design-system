// Textos do sistema em pt-BR e en (spec 6.8). O idioma vem do lang da aula.
export const ROTULOS = {
  'pt-BR': {
    introducao: 'Introdução',
    encerramento: 'Encerramento',
    bloco: 'Bloco',
    de: 'de',
    aula: 'Aula',
    meses: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    notas: 'Notas',
    semNotas: 'Este slide não tem notas.',
    visaoGeral: 'Visão geral',
    ajuda: 'Ajuda',
    tecla: 'Tecla',
    acao: 'Ação',
    teclas: [
      ['→, espaço, PageDown', 'revela o próximo passo; sem passos pendentes, avança o slide'],
      ['←, PageUp', 'esconde o último passo revelado; sem passos revelados, volta o slide'],
      ['Home, End', 'primeiro e último slide'],
      ['1 a 8', 'abertura do bloco correspondente'],
      ['Esc', 'fecha o painel aberto; sem painel aberto, abre a visão geral'],
      ['N', 'painel de notas'],
      ['F', 'tela cheia'],
      ['?', 'ajuda'],
      ['clique nas laterais', 'volta ou avança'],
      ['clique num quadrado do mapa', 'abertura do bloco'],
    ],
  },
  en: {
    introducao: 'Introduction',
    encerramento: 'Closing',
    bloco: 'Block',
    de: 'of',
    aula: 'Lecture',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    notas: 'Notes',
    semNotas: 'This slide has no notes.',
    visaoGeral: 'Overview',
    ajuda: 'Help',
    tecla: 'Key',
    acao: 'Action',
    teclas: [
      ['→, Space, PageDown', 'reveals the next step; with no pending steps, goes to the next slide'],
      ['←, PageUp', 'hides the last revealed step; with no revealed steps, goes to the previous slide'],
      ['Home, End', 'first and last slide'],
      ['1 to 8', 'opening slide of that block'],
      ['Esc', 'closes the open panel; with no open panel, opens the overview'],
      ['N', 'notes panel'],
      ['F', 'full screen'],
      ['?', 'help'],
      ['click on the sides', 'back or forward'],
      ['click on a map square', 'opening slide of that block'],
    ],
  },
};

export function rotulosPara(lang) {
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('en')) return ROTULOS.en;
  return ROTULOS['pt-BR'];
}
