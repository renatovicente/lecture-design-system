// Entrada de dist/aula-usp-motor.js (spec 3.3 etapa 4 e 3.5). O que o build do marco 5b põe no lugar
// da tag do runtime numa aula já pré-renderizada: "só interação: navegação, passos, notas, visão
// geral, apresentador e impressão". Reexporta as seis capacidades (motor.js cobre navegação e passos
// por si; paineis.js cobre notas e visão geral; apresentador.js e impressao.js as duas últimas) para
// que aula-usp-motor.js as tenha, e não só motor/motor.js sozinho (achado da revisão final do 5a, I1:
// prepararImpressao, que a spec 8.4 pede como AulaUSP.prepararImpressao() na página, não aparecia no
// artefato). instalarDemos entra também: instalarImpressao recebe `demos` para trocar as demos por
// imagem antes de imprimir (motor/impressao.js), então impressão funcionando depende da instalação.
// A LIGAÇÃO destas funções numa página construída (de onde vem `resumo`, quando montar() já rodou em
// build time) é trabalho do marco 5b, que consome este artefato — aqui só garante que os nomes que a
// spec cita existem nele.
export { iniciarMotor, LARGURA_DO_PALCO, ALTURA_DO_PALCO } from './motor.js';
export { instalarPaineis } from './paineis.js';
export { instalarApresentador, instalarAberturaDoApresentador, modoApresentador } from './apresentador.js';
export { instalarDemos } from './demos.js';
export { instalarImpressao, paginasEsperadas } from './impressao.js';
