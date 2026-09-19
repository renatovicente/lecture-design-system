// Entrada do modo de desenvolvimento (spec 3.2): só chama iniciar(). O que ela faz está em entrada.js,
// compartilhado com o pacote do dist — ver o comentário lá sobre por que a separação existe.
import { iniciar } from './entrada.js';
await iniciar({ base: import.meta.url }); // dev: especificador nu pelo importmap, CSS por <link>
