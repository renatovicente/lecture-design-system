(()=>{var xe={"pt-BR":{introducao:"Introdu\xE7\xE3o",encerramento:"Encerramento",bloco:"Bloco",de:"de",aula:"Aula",exercicio:"Exerc\xEDcio",resposta:"Resposta",meses:["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],notas:"Notas",semNotas:"Este slide n\xE3o tem notas.",visaoGeral:"Vis\xE3o geral",ajuda:"Ajuda",validador:"Validador",copiarParaOChat:"Copiar para o chat",tecla:"Tecla",acao:"A\xE7\xE3o",apresentador:"Apresentador",apresentadorBloqueado:"O navegador bloqueou a janela do apresentador. Libere as janelas pop-up para este endere\xE7o e tecle P de novo.",atual:"Atual",proximo:"Pr\xF3ximo",fimDaAula:"Fim da aula",slide:"slide",passo:"passo",iniciarCronometro:"Iniciar",pausarCronometro:"Pausar",zerarCronometro:"Zerar",demoInterativa:"Demo interativa: abra o HTML",teclas:[["\u2192, espa\xE7o, PageDown","revela o pr\xF3ximo passo; sem passos pendentes, avan\xE7a o slide"],["\u2190, PageUp","esconde o \xFAltimo passo revelado; sem passos revelados, volta o slide"],["Home, End","primeiro e \xFAltimo slide"],["1 a 8","abertura do bloco correspondente"],["Esc","fecha o painel aberto; sem painel aberto, abre a vis\xE3o geral"],["N","painel de notas"],["P","janela do apresentador"],["F","tela cheia"],["?","ajuda"],["V","validador"],["clique nas laterais","volta ou avan\xE7a"],["clique num quadrado do mapa","abertura do bloco"]]},en:{introducao:"Introduction",encerramento:"Closing",bloco:"Block",de:"of",aula:"Lecture",exercicio:"Exercise",resposta:"Answer",meses:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],notas:"Notes",semNotas:"This slide has no notes.",visaoGeral:"Overview",ajuda:"Help",validador:"Validator",copiarParaOChat:"Copy to chat",tecla:"Key",acao:"Action",apresentador:"Presenter",apresentadorBloqueado:"The browser blocked the presenter window. Allow pop-ups for this address and press P again.",atual:"Current",proximo:"Next",fimDaAula:"End of the lecture",slide:"slide",passo:"step",iniciarCronometro:"Start",pausarCronometro:"Pause",zerarCronometro:"Reset",demoInterativa:"Interactive demo: open the HTML",teclas:[["\u2192, Space, PageDown","reveals the next step; with no pending steps, goes to the next slide"],["\u2190, PageUp","hides the last revealed step; with no revealed steps, goes to the previous slide"],["Home, End","first and last slide"],["1 to 8","opening slide of that block"],["Esc","closes the open panel; with no open panel, opens the overview"],["N","notes panel"],["P","presenter window"],["F","full screen"],["?","help"],["V","validator"],["click on the sides","back or forward"],["click on a map square","opening slide of that block"]]}};function z(e){return typeof e=="string"&&e.toLowerCase().startsWith("en")?xe.en:xe["pt-BR"]}var ja=["unidade","disciplina","aula","data","professor"];function ye(e){let a={};for(let o of ja)a[o]=e.querySelector(`meta[name="${o}"]`)?.getAttribute("content")?.trim()??"";return a.lang=e.documentElement.getAttribute("lang")||"pt-BR",a}function Ae(e,a){let o=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e??"");if(!o)return e??"";let t=Number(o[2]);return t<1||t>12?e:`${Number(o[3])} ${z(a).meses[t-1]} ${o[1]}`}var Ba={"\\(":{fechamento:"\\)",tipo:"inline"},"\\[":{fechamento:"\\]",tipo:"destaque"}},Ia="pre, code, script, style, textarea, svg, [data-tex]",we="#010203",Ga={"\\passo":"\\htmlData{passo=#1}{#2}"},_a=/^[1-9][0-9]*$/,Va=new Set(["text","textrm","textbf","textit","mathrm","mathbf","mathit","mathsf","mathtt","mathcal","mathbb","boldsymbol","operatorname","displaystyle","left","right"]);function Ha(e,a,o){for(let t=a;t<e.length-1;t+=1)if(e[t]==="\\"){if(e.startsWith(o,t))return t;t+=1}return-1}function U(e){let a=[],o=0;for(let t=0;t<e.length-1;t+=1){if(e[t]!=="\\")continue;let r=Ba[e.slice(t,t+2)],n=r?Ha(e,t+2,r.fechamento):-1;if(n<0){t+=1;continue}t>o&&a.push({tipo:"texto",texto:e.slice(o,t)}),a.push({tipo:r.tipo,tex:e.slice(t+2,n),trecho:e.slice(t,n+2)}),o=n+2,t=o-1}return o<e.length&&a.push({tipo:"texto",texto:e.slice(o)}),a}function te(e){return e.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,"$1/$2").replace(/\\(?:[,;:! ]|qquad|quad)/g," ").replace(/\\([a-zA-Z]+)/g,(a,o)=>Va.has(o)?" ":` ${o}`).replace(/\\/g,"").replace(/[{}]/g,"").replace(/\s+/g," ").replace(/([_^]) /g,"$1").trim()}function R(e){return U(e).map(a=>a.tipo==="texto"?a.texto:te(a.tex)).join("")}function Wa(e){return e.replace(/\s(?:mathcolor|mathbackground)="[^"]*"/g,"").replace(/\sstyle="([^"]*)"/g,(a,o)=>{let t=o.split(";").filter(r=>r.trim()&&!/^\s*(?:color|background-color|border-color|border)\s*:/i.test(r));return t.length?` style="${t.join(";")};"`:""})}function Xa(e,a,o){let t=e.renderToString(a,{displayMode:o==="destaque",throwOnError:!0,strict:"ignore",errorColor:we,macros:{...Ga},trust:r=>r.command==="\\htmlData"});if(t.toLowerCase().includes(we))throw new Error("comando n\xE3o permitido no TeX");for(let[,r]of t.matchAll(/data-passo="([^"]*)"/g))if(!_a.test(r))throw new Error(`n\xFAmero de passo inv\xE1lido em \\passo: "${r}"`);return Wa(t)}function re(e){let a=[],o=t=>{for(let r of t.childNodes)r.nodeType===3?a.push(r):r.nodeType===1&&!r.matches(Ia)&&o(r)};return o(e),a}function j(e){return re(e).filter(a=>a.nodeValue.includes("\\(")||a.nodeValue.includes("\\["))}function Ja(e,a,o,t){if(o.tipo==="texto")return e.createTextNode(o.texto);let r=o.tipo==="destaque";try{let n=e.createElement("template");n.innerHTML=Xa(a,o.tex,o.tipo);let i=n.content.firstChild;if(!r)return i.setAttribute("data-tex",o.tex),i;let s=e.createElement("div");return s.className="equacao",s.setAttribute("data-tex",o.tex),s.append(i),s}catch(n){let i=String(n.message).replace(/^KaTeX parse error: /,"");t.push({trecho:o.trecho,mensagem:i});let s=e.createElement(r?"div":"span");return s.className=r?"equacao tex-invalido":"tex-invalido",s.setAttribute("data-tex",o.tex),s.setAttribute("title",i),s.textContent=o.trecho,s}}function $e(e,{katex:a}){let o=e.ownerDocument??e,t=[];e.normalize();for(let r of j(e)){let n=U(r.nodeValue);n.every(i=>i.tipo==="texto")||r.replaceWith(...n.map(i=>Ja(o,a,i,t)))}return t}function O(e){if(!e)return"";let a=[],o=t=>{for(let r of t.childNodes)r.nodeType===3?a.push(r.nodeValue):r.nodeType===1&&r.nodeName==="BR"?a.push(" "):r.nodeType===1&&r.hasAttribute("data-tex")?a.push(te(r.getAttribute("data-tex"))):r.nodeType===1&&o(r)};return o(e),R(a.join("")).replace(/\s+/g," ").trim()}function Se(e,{minBlocos:a,maxFileira:o}){let t=[],r=[];e.forEach((i,s)=>{if(i.getAttribute("data-layout")==="abertura"){let c=O(i.querySelector("h2"));t.push({numero:t.length+1,titulo:c,curto:i.getAttribute("data-curto")||c,indice:s})}r.push(t.length>0?t.length:null)});let n="fileira";return t.length<a?n="nenhum":t.length>o&&(n="contador"),{blocos:t,blocoDaSecao:r,modo:n}}function M(e,a,{encerramento:o=!1}={}){return Array.from({length:e},(t,r)=>{let n=r+1;return o?"visto":a===null?"futuro":n<a?"visto":n===a?"atual":"futuro"})}function g(e,a,o,t){let r=e.createElement(a);return o&&(r.className=o),t!==void 0&&(r.textContent=t),r}function _(e){let a=e.cloneNode(!0);if(a.nodeType===1){a.removeAttribute("id");for(let o of a.querySelectorAll("[id]"))o.removeAttribute("id")}return a}var B=e=>String(e).padStart(2,"0");function ne(e,a,o,t){return g(e,"span","bloco-n-de-m",`${a.bloco} ${o} ${a.de} ${t}`)}function De(e,{rotulo:a,blocos:o,estados:t,modo:r,blocoAtual:n,contador:i,rot:s}){let c=g(e,"header","cabecalho");if(c.append(g(e,"span","rotulo",a)),r==="fileira"){let p=g(e,"nav","mapa");o.forEach((l,d)=>{let u=g(e,"a",`quadrado ${t[d]}`);u.setAttribute("href",`#${l.id}`),u.setAttribute("aria-label",`${s.bloco} ${l.numero}: ${l.titulo}`),p.append(u)}),c.append(p)}else r==="contador"&&n!==null&&c.append(ne(e,s,n,o.length));return c.append(g(e,"span","contador",i)),c}function Ue(e,a){return g(e,"footer","rodape",a)}function Ee(e,a){let o=g(e,"div","metadados-capa");for(let t of a)o.append(g(e,"p",null,t));return o}function Ce(e,a){let o=g(e,"ol","roteiro");o.setAttribute("data-n",String(a.length));for(let t of a){let r=e.createElement("li");r.append(g(e,"span","quadrado futuro"),g(e,"span","nome-curto",t.curto)),o.append(r)}return o}function qe(e,a,o){let t=g(e,"ol","fileira");return t.setAttribute("data-n",String(a.length)),a.forEach((r,n)=>{let i=e.createElement("li");i.setAttribute("data-estado",o[n]);let s=g(e,"span",`quadrado ${o[n]}`);o[n]==="atual"&&s.append(g(e,"span","numero-bloco",B(r.numero))),i.append(s,g(e,"span","nome-curto",r.curto)),t.append(i)}),t}function ie(e,{unidade:a,usp:o,urlMarcas:t}){let r=g(e,"div","faixa-de-marca"),n=g(e,"img","marca-unidade");if(n.setAttribute("src",`${t}/${a.arquivo}`),n.setAttribute("alt",a.integraUSP?`${a.nome} \xB7 ${o.texto}`:a.nome),n.setAttribute("height",String(a.altura)),r.append(n),!a.integraUSP){let i=g(e,"div","marca-usp"),s=e.createElement("span"),[c,...p]=o.texto.split(" ");s.append(e.createTextNode(c),e.createElement("br"),e.createTextNode(p.join(" ")));let l=e.createElement("img");l.setAttribute("src",`${t}/${o.arquivo}`),l.setAttribute("alt",o.texto),l.setAttribute("height",String(o.altura)),i.append(s,l),r.append(i)}return r}var Za=/^(?:[+\-−]?(?:R\$ ?)?|R\$ ?[+\-−])(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d+)? ?%?$/;function Ne(e){return Za.test(e.replace(/\s+/g," ").trim())}function Qa(e){return[...e.querySelectorAll("tr")].filter(a=>a.closest("table")===e)}function Ka(e){let a=[],o=new Map;return e.forEach((t,r)=>{let n=0;for(let i of t.children){for(;a[r]?.has(n);)n+=1;let s=Number(i.getAttribute("colspan"))||1,c=Number(i.getAttribute("rowspan"))||1;o.set(i,s===1?n:null);for(let p=0;p<c;p+=1)for(let l=0;l<s;l+=1)(a[r+p]??=new Set).add(n+l);n+=s}}),o}function ke(e){for(let a of e.querySelectorAll("section table")){let o=Qa(a),t=Ka(o),r=new Set,n=new Set;for(let i of o)if(i.parentNode.nodeName!=="THEAD")for(let s of i.children){let c=t.get(s);Ne(s.textContent)?(s.classList.add("numerica"),r.add(c)):s.textContent.trim()!==""&&n.add(c)}for(let i of o)if(i.parentNode.nodeName==="THEAD")for(let s of i.children){let c=t.get(s);(c!==null&&r.has(c)&&!n.has(c)||Ne(s.textContent))&&s.classList.add("numerica")}}}function Fe(e,a){for(let o of e.querySelectorAll("div.exercicio > div.enunciado"))o.setAttribute("data-rotulo",a.exercicio);for(let o of e.querySelectorAll("div.exercicio > div.resposta"))o.setAttribute("data-rotulo",a.resposta)}function Ya(e){return e.normalize("NFD").replace(new RegExp("\\p{M}","gu"),"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40).replace(/-+$/,"")}function eo(e){return[...e.body.children].filter(a=>a.nodeName==="SECTION"&&a.hasAttribute("data-layout"))}function ao(e,a){let o=new Set([...e.querySelectorAll("[id]")].map(t=>t.getAttribute("id")));a.forEach((t,r)=>{if(t.getAttribute("id"))return;let n=t.getAttribute("data-layout"),i=n==="capa"||n==="encerramento"?n:Ya(O(t.querySelector("h1, h2, p.afirmacao")))||`slide-${r+1}`,s=i;for(let c=2;o.has(s);c++)s=`${i}-${c}`;o.add(s),t.setAttribute("id",s)})}function oo(e,a){let o=e.createElement("div");o.className="area";for(let t of[...a.childNodes])t.nodeType===1&&t.nodeName==="ASIDE"&&t.classList.contains("notas")||o.append(t);return a.prepend(o),o}function Te(e,{unidades:a,usp:o,urlMarcas:t,limites:r}){if(e.documentElement.getAttribute("data-aula-usp")==="montada")throw new Error("aula j\xE1 montada");let n=ye(e),i=Object.hasOwn(a,n.unidade)?a[n.unidade]:void 0;if(!i)throw new Error(`unidade desconhecida: "${n.unidade}"`);let s=z(n.lang),c=eo(e);ao(e,c),Fe(e,s),ke(e);let{blocos:p,blocoDaSecao:l,modo:d}=Se(c,r);for(let h of p)h.id=c[h.indice].getAttribute("id");let u=c.length,b=`${n.disciplina} \xB7 ${s.aula} ${n.aula}`;return c.forEach((h,m)=>{let v=h.getAttribute("data-layout"),A=l[m];h.classList.add("slide"),h.setAttribute("data-indice",String(m+1)),h.setAttribute("data-mapa",d),A!==null&&h.setAttribute("data-bloco",String(A));let y=oo(e,h);if(v==="capa"){y.append(Ee(e,[b,`${n.professor} \xB7 ${Ae(n.data,n.lang)}`])),d!=="nenhum"&&y.append(Ce(e,p)),h.append(ie(e,{unidade:i,usp:o,urlMarcas:t}));return}if(v==="abertura"){if(d==="nenhum")return;h.prepend(qe(e,p,M(p.length,A))),y.querySelector("h2")?.after(ne(e,s,A,p.length));return}let w=v==="encerramento",S=s.introducao;w?S=s.encerramento:A!==null&&(S=`${B(A)} \xB7 ${p[A-1].titulo}`),h.prepend(De(e,{rotulo:S,blocos:p,modo:d,rot:s,estados:M(p.length,A,{encerramento:w}),blocoAtual:w?null:A,contador:`${m+1} / ${u}`})),h.append(w?ie(e,{unidade:i,usp:o,urlMarcas:t}):Ue(e,b))}),e.documentElement.setAttribute("data-aula-usp","montada"),{total:u,modo:d,blocos:p.map(({numero:h,titulo:m,curto:v,id:A})=>({numero:h,titulo:m,curto:v,id:A}))}}var to=/^[1-9][0-9]*$/;function q(e){let a=[...e.querySelectorAll(".area [data-passo]")],o=a.map(r=>r.getAttribute("data-passo"));if(!o.every(r=>to.test(r)))return a.map(r=>[r]);let t=new Map;return a.forEach((r,n)=>{let i=Number(o[n]);t.has(i)||t.set(i,[]),t.get(i).push(r)}),[...t.keys()].sort((r,n)=>r-n).map(r=>t.get(r))}function k(e,a){e.forEach((o,t)=>{for(let r of o)t<a?r.setAttribute("data-revelado",""):r.removeAttribute("data-revelado")})}function Oe(e){return e.filter(a=>a[0].hasAttribute("data-revelado")).length}var Me={ArrowRight:"avancar"," ":"avancar",PageDown:"avancar",ArrowLeft:"voltar",PageUp:"voltar",Home:"primeiro",End:"ultimo",Escape:"escape",n:"notas",N:"notas",p:"apresentador",P:"apresentador",f:"tela-cheia",F:"tela-cheia",v:"validador",V:"validador","?":"ajuda"};function ze({key:e,ctrlKey:a=!1,metaKey:o=!1,altKey:t=!1}){let r=a&&t&&!o&&e.length===1;return(a||o||t)&&!r?null:/^[1-8]$/.test(e)?`bloco-${e}`:Object.hasOwn(Me,e)?Me[e]:null}function Pe({indice:e,passo:a},o){return a<o[e]?{indice:e,passo:a+1}:e<o.length-1?{indice:e+1,passo:0}:{indice:e,passo:a}}function Le({indice:e,passo:a},o){return a>0?{indice:e,passo:a-1}:e>0?{indice:e-1,passo:o[e-1]}:{indice:e,passo:a}}function V(e,a,o){let[t,r=""]=e.replace(/^#/,"").split("/"),n=a.indexOf(t);if(n<0)return null;let i=/^[0-9]+$/.test(r)?Math.min(Number(r),o[n]):0;return{indice:n,passo:i}}function se({indice:e,passo:a},o){return a>0?`#${o[e]}/${a}`:`#${o[e]}`}var ce=1280,le=720,Re=.12,ro="input, select, textarea, [contenteditable]",no="a, button, input, select, textarea, label, [contenteditable], .demo, [data-painel]";function je({doc:e,janela:a,resumo:o}){let t=z(e.documentElement.getAttribute("lang")??void 0),r=[...e.querySelectorAll("section.slide")],n=r.map(m=>m.id),i=r.map(q),s=i.map(m=>m.length),c=new Map,p=[],l=null,d=0,u=e.createElement("div");u.className="palco",u.append(...r),e.body.prepend(u),e.body.classList.add("modo-palco");function b(){let m=a.innerWidth-d,v=Math.min(m/ce,a.innerHeight/le);u.style.setProperty("--escala",String(v)),u.style.setProperty("--centro-x",`${m/2}px`)}function h(m){if(!Number.isInteger(m?.indice)||!Number.isInteger(m?.passo)){a.console.warn("Aula USP: posi\xE7\xE3o inv\xE1lida.",m);return}let v=Math.max(0,Math.min(r.length-1,m.indice)),A=Math.max(0,Math.min(s[v],m.passo));if(l&&l.indice===v&&l.passo===A)return;let y=l;y?.indice!==v&&(y&&r[y.indice].classList.remove("ativo"),r[v].classList.add("ativo")),k(i[v],A),l={indice:v,passo:A},a.history.replaceState(null,"",se(l,n));for(let w of p)try{w(l,y)}catch(S){a.console.error("Aula USP: um ouvinte de navega\xE7\xE3o falhou.",S)}}return c.set("avancar",()=>h(Pe(l,s))),c.set("voltar",()=>h(Le(l,s))),c.set("primeiro",()=>h({indice:0,passo:0})),c.set("ultimo",()=>h({indice:r.length-1,passo:0})),c.set("tela-cheia",()=>{(e.fullscreenElement?e.exitFullscreen():e.documentElement.requestFullscreen()).catch(v=>a.console.warn("Aula USP: tela cheia indispon\xEDvel.",v))}),o.blocos.slice(0,8).forEach(m=>{c.set(`bloco-${m.numero}`,()=>h({indice:n.indexOf(m.id),passo:0}))}),a.addEventListener("keydown",m=>{let v=m.target;if(v?.closest?.(ro)||m.key===" "&&v?.closest?.("button"))return;let A=c.get(ze(m));A&&(m.preventDefault(),A())}),e.addEventListener("click",m=>{let v=m.target.closest?.('a[href^="#"]'),A=v?V(v.getAttribute("href"),n,s):null;if(A){m.preventDefault(),h(A);return}if(m.target.closest?.(no)||e.body.classList.contains("modo-apresentador"))return;let y=a.innerWidth-d;m.clientX<y*Re?c.get("voltar")():m.clientX>y*(1-Re)&&c.get("avancar")()}),a.addEventListener("hashchange",()=>{let m=V(a.location.hash,n,s);m&&h(m),a.history.replaceState(null,"",se(l,n))}),a.addEventListener("resize",b),b(),h(V(a.location.hash,n,s)??{indice:0,passo:0}),{doc:e,janela:a,rot:t,resumo:o,slides:r,ids:n,grupos:i,estado:()=>l,irPara:h,aoMudar:m=>p.push(m),definirAcao:(m,v)=>c.set(m,v),reservarDireita:m=>{d=m,b()}}}var io={erro:"ERRO",aviso:"AVISO"};function H(e){return[...e.children].filter(a=>a.nodeName==="SECTION")}function f(e,a){let o=e.indexOf(a);return{slide:o<0?null:o+1,id:a.getAttribute("id")||null}}function P(e,a=80){let o=e.replace(/\s+/g," ").trim();return o.length<=a?o:`${o.slice(0,a-1)}\u2026`}function x(e,a=80){return P(e.outerHTML??"",a)}function W(e,{contrato:a,regras:o,grupo:t,fase:r=1,...n}){e.body.normalize();let i=H(e.body),s={doc:e,slides:i,contrato:a,fase:r,...n},c=[];return o.forEach((p,l)=>{let d=a.regras[p.nome];if(!(!d||d.grupo!==t||d.fase>r))for(let u of p.aplicar(s))c.push({severidade:d.severidade,slide:u.slide??null,id:u.id??null,regra:p.nome,mensagem:u.mensagem,acao:d.acao,trecho:u.trecho??null,ordem:l})}),c.sort((p,l)=>(p.slide??0)-(l.slide??0)||p.ordem-l.ordem),c.map(({ordem:p,...l})=>l)}function I({severidade:e,slide:a,id:o,regra:t,mensagem:r,acao:n,trecho:i}){let s=a===null?"aula":`slide ${a}${o?` #${o}`:""}`,c=`${io[e]} \xB7 ${s} \xB7 ${t} \xB7 ${r} ${n}`;return i?`${c}
    ${i}`:c}function pe(e){let a=e.filter(o=>o.severidade==="erro").length;return{erros:a,avisos:e.length-a}}function ue(e){let{erros:a,avisos:o}=pe(e);return`Validador Aula USP: ${$(a,"erro","erros")}, ${$(o,"aviso","avisos")}`}function $(e,a,o){return`${e} ${e===1?a:o}`}var so=380;function X(e,a,o){let t=g(e,"div","painel");t.setAttribute("data-painel",a),t.setAttribute("tabindex","-1"),t.hidden=!0;let r=g(e,"div","painel-corpo");return t.append(g(e,"h2","painel-titulo",o),r),e.body.append(t),{painel:t,corpo:r}}function co(e,a,o,t){let r=o.querySelector(":scope > aside.notas");r?a.replaceChildren(...[...r.childNodes].map(_)):a.replaceChildren(g(e,"p",null,t.semNotas))}function lo(e){return O(e.querySelector(".area h1, .area h2, .area p.afirmacao"))||e.id}function po(e,a,o){let{slides:t,resumo:r,rot:n}=o,i=o.estado().indice,s=t[i],c=M(r.blocos.length,Number(s.getAttribute("data-bloco"))||null,{encerramento:s.getAttribute("data-layout")==="encerramento"});a.replaceChildren();let p=null;t.forEach((l,d)=>{let u=l.getAttribute("data-layout")==="encerramento",b=u?0:Number(l.getAttribute("data-bloco"))||0,h=u?"encerramento":b;if(!p||p.chave!==h){let v=u?n.encerramento:b?`${B(b)} \xB7 ${r.blocos[b-1].titulo}`:n.introducao,A=g(e,"div","cartoes"),y=g(e,"div","grupo");y.append(g(e,"h3","grupo-titulo",v),A),a.append(y),p={chave:h,cartoes:A}}let m=g(e,"button","cartao");m.type="button",m.setAttribute("data-indice",String(d)),d===i&&m.setAttribute("aria-current","true"),b&&m.append(g(e,"span",`quadrado ${c[b-1]}`)),m.append(g(e,"span","cartao-numero",String(d+1)),g(e,"span","cartao-titulo",lo(l))),p.cartoes.append(m)})}function uo(e,a,o){let t=g(e,"tr");for(let s of[o.tecla,o.acao]){let c=g(e,"th",null,s);c.setAttribute("scope","col"),t.append(c)}let r=g(e,"thead");r.append(t);let n=g(e,"tbody");for(let[s,c]of o.teclas){let p=g(e,"th",null,s);p.setAttribute("scope","row");let l=g(e,"tr");l.append(p,g(e,"td",null,c)),n.append(l)}let i=g(e,"table","teclas");i.append(r,n),a.replaceChildren(i)}function mo(e){return[ue(e),...e.map(I)].join(`
`)}function fo(e,a,o,t){let r=g(e,"ul","achados");for(let i of o){let s=g(e,"li",null,I(i));s.setAttribute("data-severidade",i.severidade),r.append(s)}let n=g(e,"button","copiar",t.copiarParaOChat);n.type="button",n.disabled=!e.defaultView.navigator.clipboard,n.addEventListener("click",()=>{e.defaultView.navigator.clipboard?.writeText(mo(o)).catch(()=>{})}),a.replaceChildren(r,n)}function Be(e){let{doc:a,rot:o}=e,t={notas:X(a,"notas",o.notas),"visao-geral":X(a,"visao-geral",o.visaoGeral),ajuda:X(a,"ajuda",o.ajuda),validador:X(a,"validador",o.validador)};uo(a,t.ajuda.corpo,o);let r=g(a,"p","aviso");r.hidden=!0,t.notas.painel.insertBefore(r,t.notas.corpo);let n=null;function i(){n==="notas"&&co(a,t.notas.corpo,e.slides[e.estado().indice],o),n==="visao-geral"&&po(a,t["visao-geral"].corpo,e)}function s(){n&&(t[n].painel.hidden=!0,n==="notas"&&(e.reservarDireita(0),r.hidden=!0),n=null)}function c(l){if(!Object.hasOwn(t,l))throw new Error(`painel desconhecido: "${l}"`);s(),n=l,i(),t[l].painel.hidden=!1,l==="notas"?e.reservarDireita(so):t[l].painel.focus()}let p=l=>n===l?s():c(l);return e.definirAcao("notas",()=>p("notas")),e.definirAcao("ajuda",()=>p("ajuda")),e.definirAcao("validador",()=>p("validador")),e.definirAcao("escape",()=>n?s():c("visao-geral")),e.aoMudar(i),t["visao-geral"].corpo.addEventListener("click",l=>{let d=l.target.closest("button.cartao");d&&(s(),e.irPara({indice:Number(d.getAttribute("data-indice")),passo:0}))}),{abrir:c,fechar:s,aberto:()=>n,avisar(l){r.textContent=l,c("notas"),r.hidden=!1},mostrarAchados(l){t.validador.painel.querySelector(".painel-titulo").textContent=ue(l),fo(a,t.validador.corpo,l,o),pe(l).erros>0&&!a.fullscreenElement&&c("validador")}}}function go({api:e,console:a}){let o=new Map,t=new WeakSet,r=(l,d)=>o.set(l,d);for(let l of e.filaDeDemos??[])r(l.nome,l.definicao);e.filaDeDemos&&(e.filaDeDemos.length=0),e.demo=r;let n=l=>[...l.querySelectorAll("div.demo[data-demo]")];function i(l,d,u){try{u()}catch(b){a.error(`Aula USP: a demo "${l}" falhou em ${d}.`,b)}}function s(l,d){let u=l.getAttribute("data-opcoes");if(!u)return{};try{return JSON.parse(u)}catch(b){return a.error(`Aula USP: data-opcoes inv\xE1lido na demo "${d}".`,b),{}}}function c(l){let d=l.getAttribute("data-demo"),u=o.get(d);return u||a.warn(`Aula USP: demo sem registro: "${d}".`),{nome:d,definicao:u}}function p(l){let{nome:d,definicao:u}=c(l);return!u||t.has(l)?u??null:(t.add(l),i(d,"montar",()=>u.montar?.(l,s(l,d))),u)}return{tem:l=>o.has(l),montarSeNecessario:p,entrar(l){for(let d of n(l)){let u=p(d);u&&i(d.getAttribute("data-demo"),"iniciar",()=>u.iniciar?.())}},sair(l){for(let d of n(l)){if(!t.has(d))continue;let{nome:u,definicao:b}=c(d);b&&i(u,"parar",()=>b.parar?.())}}}}function Ie(e,a){let o=go({api:a,console:e.janela.console});return e.aoMudar((t,r)=>{r&&r.indice===t.indice||(r&&o.sair(e.slides[r.indice]),o.entrar(e.slides[t.indice]))}),o.entrar(e.slides[e.estado().indice]),o}var ho=["href","clip-path","marker-start","marker-end","fill","stroke"];function vo(e,a,o){if(o==="href"){let t=/^#(.+)$/.exec(e);if(t)return a.has(t[1])?`#${a.get(t[1])}`:e}return e.replace(/url\(\s*(['"]?)\s*#([^'")\s]+)\s*\1\s*\)/g,(t,r,n)=>a.has(n)?`url(${r}#${a.get(n)}${r})`:t)}function J(e,a){let o=e.cloneNode(!0),t=new Map;for(let r of[o,...o.querySelectorAll("[id]")]){let n=r.getAttribute("id");n&&(t.set(n,`${n}-${a}`),r.setAttribute("id",`${n}-${a}`))}if(t.size>0)for(let r of[o,...o.querySelectorAll("*")])for(let n of ho){let i=r.getAttribute(n);if(!i)continue;let s=vo(i,t,n);s!==i&&r.setAttribute(n,s)}return o}var Ge="aula-usp";function bo(e,a){let o=e.data;return!o||o.tipo!==Ge||e.origin!=="null"&&e.origin!==a.location.origin?null:o.acao==="ola"?{acao:"ola"}:o.acao==="posicao"&&Number.isInteger(o.indice)&&Number.isInteger(o.passo)?{acao:"posicao",indice:o.indice,passo:o.passo}:null}function me(e,{par:a=null,intervaloDeOla:o=0}={}){let{janela:t}=e,r=a,n=null;function i(s){if(r)try{r.postMessage({tipo:Ge,...s},"*")}catch(c){t.console.warn("Aula USP: n\xE3o foi poss\xEDvel falar com a outra janela.",c),r=null}}return t.addEventListener("message",s=>{let c=bo(s,t);if(c){if(s.source&&(r=s.source),c.acao==="ola"){i({acao:"posicao",...e.estado()});return}n=`${c.indice}/${c.passo}`,e.irPara({indice:c.indice,passo:c.passo})}}),e.aoMudar(s=>{`${s.indice}/${s.passo}`!==n&&i({acao:"posicao",...s})}),o>0&&(i({acao:"ola"}),t.setInterval(()=>i({acao:"ola"}),o)),{definirPar(s){r=s}}}var xo=2e3;function He(e){return new URLSearchParams(e.location.search).has("apresentador")}function _e(e,a,o){let t=g(e,"div","miniatura");t.setAttribute("data-miniatura",o);let r=g(e,"div","quadro-miniatura");return t.append(g(e,"span","rotulo",a),r),{caixa:t,quadro:r}}function Ve(e){let a=Math.floor(e/1e3),o=[Math.floor(a/60)%60,a%60].map(r=>String(r).padStart(2,"0")),t=Math.floor(a/3600);return t>0?`${t}:${o.join(":")}`:o.join(":")}function yo(e,a,o){let t=g(e,"output","tempo",Ve(0)),r=g(e,"output","relogio"),n=g(e,"div","cronometro"),i=null,s=0,c=()=>{t.textContent=Ve(s+(i===null?0:Date.now()-i))},p=(l,d)=>{let u=g(e,"button",null,l);return u.type="button",u.addEventListener("click",()=>{d(),c()}),u};return n.append(t,p(a.iniciarCronometro,()=>{i===null&&(i=Date.now())}),p(a.pausarCronometro,()=>{i!==null&&(s+=Date.now()-i,i=null)}),p(a.zerarCronometro,()=>{s=0,i=i===null?null:Date.now()}),r),o.setInterval(()=>{c(),r.textContent=new Date().toLocaleTimeString(e.documentElement.lang||"pt-BR",{hour:"2-digit",minute:"2-digit"})},1e3),r.textContent=new Date().toLocaleTimeString(e.documentElement.lang||"pt-BR",{hour:"2-digit",minute:"2-digit"}),n}function We(e){let{doc:a,janela:o,rot:t,resumo:r,slides:n,grupos:i}=e;a.body.classList.add("modo-apresentador");let s=_e(a,t.atual,"atual"),c=_e(a,t.proximo,"proxima"),p=g(a,"p","posicao"),l=g(a,"nav","mapa"),d=g(a,"div","notas-apresentador"),u=g(a,"div","painel-apresentador");u.append(p,l,yo(a,t,o),d);let b=g(a,"div","apresentador");b.append(s.caixa,c.caixa,u),a.body.append(b);let h=({indice:y,passo:w})=>w<i[y].length?{indice:y,passo:w+1}:y<n.length-1?{indice:y+1,passo:0}:null;function m(y,w,S){if(y.replaceChildren(),!w){y.append(g(a,"p","fim-da-aula",t.fimDaAula));return}let E=J(n[w.indice],S);E.classList.add("ativo"),k(q(E),w.passo),y.append(E)}function v(){for(let y of[s.quadro,c.quadro]){let w=Math.min(y.clientWidth/ce,y.clientHeight/le);y.style.setProperty("--escala-miniatura",String(w))}}function A(){let y=e.estado(),w=n[y.indice];m(s.quadro,y,"atual"),m(c.quadro,h(y),"proxima");let S=i[y.indice].length;p.textContent=S>0?`${t.slide} ${y.indice+1} / ${n.length} \xB7 ${t.passo} ${y.passo} / ${S}`:`${t.slide} ${y.indice+1} / ${n.length}`;let E=M(r.blocos.length,Number(w.getAttribute("data-bloco"))||null,{encerramento:w.getAttribute("data-layout")==="encerramento"});l.replaceChildren(...r.blocos.map((L,Ra)=>{let oe=g(a,"a",`quadrado ${E[Ra]}`);return oe.setAttribute("href",`#${L.id}`),oe.setAttribute("aria-label",`${t.bloco} ${L.numero}: ${L.titulo}`),oe}));let D=w.querySelector(":scope > aside.notas");d.replaceChildren(...D?[...D.childNodes].map(_):[g(a,"p",null,t.semNotas)]),v()}return e.aoMudar(A),o.addEventListener("resize",v),A(),me(e,{par:o.opener,intervaloDeOla:xo}),{atualizar:A}}function Xe(e,a){let{janela:o,rot:t}=e,r=me(e);return e.definirAcao("apresentador",()=>{let n=new URL(o.location.href);n.searchParams.set("apresentador","1");let i=o.open(n.href,"aula-usp-apresentador");if(!i){a.avisar(t.apresentadorBloqueado);return}r.definirPar(i)}),r}var Ao="passos";function Je(e,{demos:a,paineis:o,api:t}){let{doc:r,janela:n,rot:i}=e,s=null;function c(u){let b=a?.montarSeNecessario(u);if(!b?.capturar)return null;try{let h=b.capturar();return h?typeof h=="string"?h:h.toDataURL?.()??null:null}catch(h){return n.console.error(`Aula USP: a demo "${u.getAttribute("data-demo")}" falhou em capturar.`,h),null}}function p(){for(let u of r.querySelectorAll("div.demo")){if(u.querySelector(":scope > img.estatico"))continue;let b=c(u);if(b){let h=g(r,"img","captura-demo");h.setAttribute("src",b),h.setAttribute("alt",i.demoInterativa),u.append(h)}else u.append(g(r,"div","demo-substituta",i.demoInterativa))}}function l(){if(!s){s={estado:e.estado(),painel:o?.aberto()??null,contagens:e.slides.map(u=>Oe(q(u)))},o?.fechar(),p();for(let u of e.slides){let b=q(u);u.getAttribute("data-pdf")===Ao&&b.forEach((h,m)=>{let v=J(u,`impressao-${m}`);v.setAttribute("data-copia",""),k(q(v),m),u.parentNode.insertBefore(v,u)}),k(b,b.length)}r.body.classList.add("imprimindo")}}function d(){if(!s)return;for(let m of r.querySelectorAll("[data-copia], .captura-demo, .demo-substituta"))m.remove();r.body.classList.remove("imprimindo");let{estado:u,painel:b,contagens:h}=s;s=null,e.slides.forEach((m,v)=>{k(q(m),v===u.indice?u.passo:h[v])}),b&&o?.abrir(b)}return n.addEventListener("beforeprint",l),n.addEventListener("afterprint",d),t.prepararImpressao=l,t.restaurarImpressao=d,{preparar:l,restaurar:d}}var Ze={cor:{papel:"#FFFFFF",tinta:"#0A0A0A",cinza:"#666666",linha:"#D9D9D9",azul:"#1094AB",amarelo:"#FCB421"},fonte:{sans:["Geist","system-ui","sans-serif"],mono:["Geist Mono","ui-monospace","monospace"],marca:["Open Sans","sans-serif"]},tipo:{capa:{familia:["Geist","system-ui","sans-serif"],tamanho:96,peso:600,entrelinha:1,tracking:-3.36},abertura:{familia:["Geist","system-ui","sans-serif"],tamanho:84,peso:600,entrelinha:1,tracking:-2.52},afirmacao:{familia:["Geist","system-ui","sans-serif"],tamanho:64,peso:600,entrelinha:1.08,tracking:-1.92},titulo:{familia:["Geist","system-ui","sans-serif"],tamanho:44,peso:600,entrelinha:1.08,tracking:-1.32},numeral:{familia:["Geist","system-ui","sans-serif"],tamanho:40,peso:600,entrelinha:1,tracking:0},lide:{familia:["Geist","system-ui","sans-serif"],tamanho:32,peso:400,entrelinha:1.25,tracking:0},leitura:{familia:["Geist","system-ui","sans-serif"],tamanho:24,peso:400,entrelinha:1.42,tracking:0,pesoEnfase:600},codigo:{familia:["Geist Mono","ui-monospace","monospace"],tamanho:20,peso:400,entrelinha:1.45,tracking:0,pesoEnfase:600},legenda:{familia:["Geist","system-ui","sans-serif"],tamanho:18,peso:400,entrelinha:1.35,tracking:0},rotulo:{familia:["Geist Mono","ui-monospace","monospace"],tamanho:14,peso:700,entrelinha:1.2,tracking:2.24,caixa:"alta"},rodape:{familia:["Geist Mono","ui-monospace","monospace"],tamanho:14,peso:400,entrelinha:1.2,tracking:2.24,caixa:"alta"},rotuloGrande:{familia:["Geist Mono","ui-monospace","monospace"],tamanho:20,peso:700,entrelinha:1.2,tracking:3.2,caixa:"alta"},marcaUsp:{familia:["Open Sans","sans-serif"],tamanho:20,peso:600,entrelinha:1.15,tracking:0}},minimo:{leitura:24,codigo:20,legenda:18,rotulo:14},palco:{largura:1280,altura:720,margem:64,coluna:74,calha:24,util:1152},zona:{cabecalhoTopo:40,cabecalhoBase:64,tituloTopo:96,conteudoBase:652,rodapeBase:688,marcaBase:680,capaConteudoBase:520,aberturaTituloTopoMin:360},espaco:{1:8,2:16,3:24,4:32,5:48,6:64,7:96},regua:{fina:1,normal:2,forte:4},contraste:{azulTextoMinimo:32,amareloLinhaMinima:4},mapa:{quadradoCabecalho:16,espacoCabecalho:8,quadradoAberturaMax:160,calhaAbertura:24,quadradoCapa:24,numeroProporcao:.55,faixaBlocoNDeM:220},marca:{uspAltura:56}};var{tinta:Qe,cinza:Ye,papel:wo}=Ze.cor,$o=2,Ke={name:"aula-usp",type:"light",fg:Qe,bg:wo,settings:[{settings:{foreground:Qe}},{scope:["comment","punctuation.definition.comment"],settings:{foreground:Ye}},{scope:["keyword","storage.type","storage.modifier","constant.language"],settings:{fontStyle:"bold"}},{scope:["keyword.operator","storage.type.function.arrow","storage.type.string"],settings:{fontStyle:""}},{scope:["keyword.operator.logical.python","keyword.operator.new","keyword.operator.expression","keyword.operator.word"],settings:{fontStyle:"bold"}},{scope:["text.tex support.function","text.tex punctuation.definition.function","text.tex constant.character.math","text.tex punctuation.definition.constant.math","text.tex constant.other.general.math"],settings:{fontStyle:"bold"}}]};function So(e){let a=new Set;for(let o of(e??"").split(",")){let t=/^\s*(\d+)(?:-(\d+))?\s*$/.exec(o);if(!t)continue;let r=Number(t[1]),n=Number(t[2]??t[1]);for(let i=r;i<=n;i+=1)a.add(i)}return a}function Z(e){return e.textContent.replace(/\r\n?/g,`
`).replace(/^\n+/,"").replace(/\n+$/,"")}function ea({createShikiPrimitive:e,codeToTokensBase:a,createJavaScriptRegexEngine:o,gramaticas:t}){let r=e({engine:o(),langs:Object.values(t),themes:[Ke]});return{linguagens:new Set(Object.keys(t)),linhas:(n,i)=>a(r,n,{lang:i,theme:Ke.name}).map(s=>s.map(c=>({texto:c.content,tipo:c.color.toUpperCase()===Ye?"comentario":c.fontStyle&$o?"palavra-chave":null})))}}function Do(e,a,o){let t=e.createElement("span");t.className=o?"linha marcada":"linha";for(let{texto:r,tipo:n}of a){if(!n){t.append(r);continue}let i=e.createElement("span");i.className=n,i.textContent=r,t.append(i)}return t}function aa(e,{destacador:a}){let o=e.ownerDocument??e,t=[];for(let r of e.querySelectorAll("pre[data-lang]")){if(r.firstElementChild?.classList.contains("linha"))continue;let n=r.getAttribute("data-lang"),i=Z(r),s;a.linguagens.has(n)?s=a.linhas(i,n):(t.push({linguagem:n,mensagem:`linguagem fora da lista em data-lang: "${n}"`}),s=i.split(`
`).map(p=>[{texto:p,tipo:null}]));let c=So(r.getAttribute("data-linhas"));r.replaceChildren(...s.flatMap((p,l)=>[...l>0?[`
`]:[],Do(o,p,c.has(l+1))]))}return t}var Uo=["conteudo","afirmacao","figura","demo"],Eo=["capa","encerramento"],Co=/\\passo\s*\{/g,qo=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;function de(e){let a=e.getAttribute("data-layout");return a?`"${a}"`:"uma section sem data-layout"}var oa=[{nome:"estrutura.primeiro-slide",*aplicar({slides:e}){if(e.length===0){yield{mensagem:"a aula n\xE3o tem nenhuma section."};return}e[0].getAttribute("data-layout")!=="capa"&&(yield{...f(e,e[0]),mensagem:`a aula come\xE7a com ${de(e[0])}, n\xE3o com capa.`})}},{nome:"estrutura.ultimo-slide",*aplicar({slides:e}){let a=e.at(-1);a&&a.getAttribute("data-layout")!=="encerramento"&&(yield{...f(e,a),mensagem:`a aula termina com ${de(a)}, n\xE3o com encerramento.`})}},{nome:"estrutura.layout",*aplicar({slides:e,contrato:a}){for(let o of e){let t=o.getAttribute("data-layout");t===null?yield{...f(e,o),mensagem:"section sem data-layout.",trecho:x(o)}:Object.hasOwn(a.layouts,t)||(yield{...f(e,o),mensagem:`data-layout "${t}" n\xE3o existe no contrato.`})}}},{nome:"estrutura.metadados",*aplicar({doc:e,contrato:a,unidades:o}){for(let[t,r]of Object.entries(a.metadados)){let n=e.querySelector(`meta[name="${t}"]`)?.getAttribute("content")?.trim()??"";if(!n){r.obrigatorio&&(yield{mensagem:`falta a meta "${t}" no <head>.`});continue}r.tipo==="data-iso"&&!qo.test(n)&&(yield{mensagem:`a meta "${t}" n\xE3o est\xE1 em AAAA-MM-DD: "${n}".`}),r.tipo==="unidade"&&o&&!Object.hasOwn(o,n)&&(yield{mensagem:`unidade desconhecida: "${n}". Use ${Object.keys(o).join(" ou ")}.`})}}},{nome:"estrutura.colunas",*aplicar({slides:e,contrato:a}){for(let o of e)for(let t of o.querySelectorAll("div.colunas")){let r=t.getAttribute("data-grade");if(!Object.hasOwn(a.grades,r))continue;let n=a.grades[r],i=t.children.length;i!==n&&(yield{...f(e,o),mensagem:`div.colunas com data-grade "${r}" tem ${$(i,"filho","filhos")} (esperados ${n}).`,trecho:x(t)})}}},{nome:"estrutura.blocos",*aplicar({slides:e,contrato:a}){let o=e.filter(n=>n.getAttribute("data-layout")==="abertura").length,t=a.limites["blocos.min"],r=a.limites["blocos.maxFileira"];o<t?yield{mensagem:`a aula tem ${$(o,"abertura","aberturas")}; o m\xEDnimo \xE9 ${t}.`}:o>r&&(yield{mensagem:`a aula tem ${o} blocos; acima de ${r} o mapa vira contador.`})}},{nome:"estrutura.id-duplicado",*aplicar({doc:e,slides:a}){let o=new Set;for(let t of e.body.querySelectorAll("[id]")){let r=t.getAttribute("id");if(o.has(r)){let n=t.closest("section");yield{...n?f(a,n):{},mensagem:`id repetido: "${r}".`,trecho:x(t)}}o.add(r)}}},{nome:"estrutura.id-ausente",*aplicar({slides:e}){for(let a of e){let o=a.getAttribute("data-layout");if(!a.getAttribute("id")&&!Eo.includes(o)){let t=o?`slide de layout "${o}" sem id.`:"section sem data-layout e sem id.";yield{...f(e,a),mensagem:t}}}}},{nome:"estrutura.nome-curto",*aplicar({slides:e,contrato:a}){let o=a.limites["abertura.h2.caracteresSemDataCurto"];for(let t of e){let r=t.getAttribute("data-curto");if(t.getAttribute("data-layout")!=="abertura"||r!==null&&r.trim()!=="")continue;let n=O(t.querySelector("h2"));n.length>o&&(yield{...f(e,t),mensagem:`abertura com t\xEDtulo de ${n.length} caracteres (m\xE1x. ${o}) e sem data-curto.`})}}},{nome:"estrutura.passos-mistos",*aplicar({slides:e}){for(let a of e){let o=[...a.querySelectorAll("[data-passo]")].map(i=>i.getAttribute("data-passo")),t=j(a).flatMap(i=>U(i.data)).filter(i=>i.tipo!=="texto").reduce((i,s)=>i+(s.tex.match(Co)?.length??0),0),r=o.filter(i=>i.trim()==="").length,n=o.length-r+t;r>0&&n>0&&(yield{...f(e,a),mensagem:`o slide mistura ${$(r,"passo sem n\xFAmero","passos sem n\xFAmero")} com ${$(n,"numerado","numerados")}.`})}}},{nome:"estrutura.notas-ausentes",*aplicar({slides:e}){for(let a of e)Uo.includes(a.getAttribute("data-layout"))&&!a.querySelector(":scope > aside.notas")&&(yield{...f(e,a),mensagem:`slide de layout ${de(a)} sem notas do apresentador.`})}}];function fe(e){let a=[];for(let o of e.childNodes){if(o.nodeType===1){a.push({tipo:"elemento",no:o,trecho:o.outerHTML});continue}if(o.nodeType===3)for(let t of U(o.data))if(t.tipo==="destaque")a.push({tipo:"tex-destaque",no:o,trecho:t.trecho});else{let r=t.texto??t.trecho;r.trim()&&a.push({tipo:"texto-solto",no:o,trecho:r.trim()})}}return a}function F(e,a){return a==="tex-destaque"?e.tipo==="tex-destaque":e.tipo==="elemento"&&e.no.matches(a)}function ta(e,a,o,t=[]){return!e||!a.seletor&&!a.grupo?!1:a.grupo?t.some(r=>F(e,r))?!1:o[a.grupo].some(r=>F(e,r)):F(e,a.seletor)}function ra(e){return e.flatMap(a=>a.umDe?ra(a.umDe.flat()):a.seletor?[a.seletor]:[])}function Q(e){return e.nomes?e.nomes.join(" nem "):e.grupo?"bloco de corpo":e.seletor}function No(e,a,o,t){let r=null,n=0;for(let i of a){let s=e.filter(c=>i.some(p=>ta(c,p,o,t))).length;s>n&&(n=s,r=i)}return r}function ko(e,a,o,t){return a.flatMap(r=>r.umDe?No(e,r.umDe,o,t)??[{nomes:r.umDe.map(n=>Q(n[0])),min:1,max:null}]:[r])}function ge(e,a,o){let t=ra(a),r=ko(e,a,o,t),n=e.map(l=>r.findIndex(d=>ta(l,d,o,t))),i=[],s=new Map;r.forEach((l,d)=>{let u=n.flatMap((b,h)=>b===d?[h]:[]);if(u.length<(l.min??0)&&i.push(l),l.max!=null)for(let b of u.slice(l.max))s.set(b,l)});let c=[],p=-1;return e.forEach((l,d)=>{n[d]<0?c.push({item:l}):s.has(d)?c.push({item:l,excedente:[Q(s.get(d))]}):n[d]<p?c.push({item:l,foraDeOrdem:!0}):p=n[d]}),{faltando:i,sobrando:c}}var Fo={table:["tr"]};function To(e,a){let o=[];a.grupo&&o.push({grupo:a.grupo,min:0,max:null});for(let t of a.exatamenteUmDe??[])o.push({seletor:t,min:0,max:null});for(let t of a.elemento?[a.elemento]:a.elementos??[])o.push({seletor:t,min:0,max:null});for(let t of Fo[e]??[])o.push({seletor:t,min:0,max:null});for(let t of a.opcionais??[])o.push({seletor:t,min:0,max:1});return o}function Oo(e,a){return fe(e).filter(o=>!a.sempreOpcional.some(t=>F(o,t)))}function Mo(e,a,o,t){let r=fe(e);if(o.sequencia)return ge(r,o.sequencia,t);let n=To(a,o),i=[],s=[],c=new Map;for(let p of r){let l=n.find(u=>u.grupo?t[u.grupo].some(b=>F(p,b)):F(p,u.seletor));if(!l){s.push({item:p,foraDeOrdem:!1});continue}let d=l.grupo??l.seletor;c.set(d,(c.get(d)??0)+1),l.max!=null&&c.get(d)>l.max&&s.push({item:p,excedente:[l.seletor]})}if(o.exatamenteUmDe){let p=r.filter(l=>o.exatamenteUmDe.some(d=>F(l,d)));p.length===0&&i.push({nomes:o.exatamenteUmDe});for(let l of p.slice(1))s.push({item:l,excedente:o.exatamenteUmDe})}return{faltando:i,sobrando:s}}function zo(e){return Object.keys(e.filhos).map((a,o)=>({chave:a,ordem:o,classes:(a.split(">").at(-1).match(/\./g)??[]).length})).sort((a,o)=>o.classes-a.classes||a.ordem-o.ordem).map(({chave:a})=>a)}function*na(e,a){let o=a.layouts[e.getAttribute("data-layout")];if(!o)return;yield{alvo:e,...ge(Oo(e,a),o.sequencia,a)};let t=zo(a);for(let r of e.querySelectorAll("*")){let n=t.find(i=>r.matches(i));n&&(yield{alvo:r,...Mo(r,n,a.filhos[n],a)})}}function he(e,a,o){return e===a?`${o} layout "${a.getAttribute("data-layout")}"`:`${o} <${e.nodeName.toLowerCase()}>`}function Po(e){return e.tipo==="elemento"?`<${e.no.nodeName.toLowerCase()}>`:e.tipo==="tex-destaque"?"equa\xE7\xE3o em destaque":"texto solto"}var ia=[{nome:"estrutura.obrigatorio",*aplicar({slides:e,contrato:a}){for(let o of e)for(let{alvo:t,faltando:r}of na(o,a))for(let n of r)yield{...f(e,o),mensagem:`${he(t,o,"").trim()} sem ${Q(n)}.`,trecho:t===o?null:P(t.outerHTML)}}},{nome:"estrutura.fora-do-layout",*aplicar({slides:e,contrato:a}){for(let o of e)for(let{alvo:t,sobrando:r}of na(o,a))for(let{item:n,foraDeOrdem:i,excedente:s}of r){let c=t===o?he(t,o,"no"):he(t,o,"dentro de"),p=Po(n),l=s?`${p} a mais ${c}: s\xF3 um ${s.join(" ou ")}.`:i?`${p} fora de ordem ${c}.`:`${p} n\xE3o \xE9 permitido ${c}.`;yield{...f(e,o),mensagem:l,trecho:P(n.trecho)}}}}];var sa="#FCB421",Lo="#1094AB",ca=32,la=4;function N(e){return e.nodeName.toLowerCase()}function C(e){return e.closest("svg")!==null}function K(e,a){return a.find(o=>o.toLowerCase()===e)}function G(e,a){for(let o of e.attributes)if(o.name.toLowerCase()===a)return o}function Ro(e){return G(e,"class")?.value.trim().split(/\s+/).filter(Boolean)??[]}function*T(e){for(let a of e){yield{secao:a,elemento:a};for(let o of a.querySelectorAll("*"))yield{secao:a,elemento:o}}}var jo=new Set(["data-lang"]);function Bo(e,a){let o=new Map;for(let[t,r]of Object.entries(a.html.atributos))if(!(t!=="*"&&!e.matches(t)))for(let[n,i]of Object.entries(r))o.set(n,i);return o}function Io(e,a){if(a.valores&&!a.valores.includes(e))return`valor fora do contrato: "${e}"`;if(a.padrao&&!new RegExp(a.padrao).test(e))return`valor fora da forma esperada: "${e}"`;if(a.json){let o;try{o=JSON.parse(e)}catch{return"valor n\xE3o \xE9 JSON v\xE1lido"}if(typeof o!="object"||o===null||Array.isArray(o))return"valor n\xE3o \xE9 um objeto JSON"}return null}function ua(e,a){for(let o=e;o;o=o.parentElement){let t=G(o,a)?.value;if(t!==void 0)return t;if(N(o)==="svg")return}}function ve(e,a){return ua(e,a)?.toUpperCase()}function pa(e,a,o){let t=ua(e,a);if(t===void 0)return o;let r=Number.parseFloat(t);return Number.isNaN(r)?o:r}var ma=[{nome:"vocabulario.elemento",*aplicar({slides:e,contrato:a}){for(let{secao:o,elemento:t}of T(e)){if(t===o)continue;let r=N(t);if(r==="style"||r==="script")continue;let n=K(r,a.proibidos.elementos);if(n){yield{...f(e,o),mensagem:`<${n}> \xE9 proibido no corpo da aula.`,trecho:x(t)};continue}if(r==="svg"&&!t.closest("figure")){yield{...f(e,o),mensagem:"<svg> s\xF3 pode ficar dentro de <figure>.",trecho:x(t)};continue}let i=C(t)?a.svg.elementos:a.html.elementos;if(!K(r,i)){let s=C(t)?"no SVG":"no corpo";yield{...f(e,o),mensagem:`<${r}> n\xE3o est\xE1 no vocabul\xE1rio ${s}.`,trecho:x(t)}}}}},{nome:"vocabulario.classe",*aplicar({slides:e,contrato:a,fase:o}){let t=new Set(a.classesDoSistema);for(let{secao:r,elemento:n}of T(e)){let i=N(n);if(!(n!==r&&!C(n)&&!a.html.elementos.includes(i)))for(let s of Ro(n)){if(C(n)){a.svg.classes.includes(s)||(yield{...f(e,r),mensagem:`classe "${s}" n\xE3o existe no vocabul\xE1rio do SVG.`,trecho:x(n)});continue}if(t.has(s)){yield{...f(e,r),mensagem:`"${s}" \xE9 classe do sistema: o autor n\xE3o a escreve no fonte.`,trecho:x(n)};continue}let c=a.html.classes[s];if(!c||c.fase>o){yield{...f(e,r),mensagem:`classe "${s}" n\xE3o existe no contrato.`,trecho:x(n)};continue}if(c.em&&!c.em.includes(i)){yield{...f(e,r),mensagem:`classe "${s}" n\xE3o vale em <${i}>, s\xF3 em ${c.em.map(p=>`<${p}>`).join(" ou ")}.`,trecho:x(n)};continue}c.dentro&&!c.dentro.some(p=>n.parentElement?.closest(p))&&(yield{...f(e,r),mensagem:`classe "${s}" s\xF3 vale dentro de ${c.dentro.join(" ou ")}.`,trecho:x(n)})}}}},{nome:"vocabulario.atributo",*aplicar({slides:e,contrato:a,fase:o}){for(let{secao:t,elemento:r}of T(e)){let n=N(r);if(r!==t&&!C(r)&&!a.html.elementos.includes(n))continue;let i=C(r)?null:Bo(r,a);for(let s of r.attributes){let c=s.name.toLowerCase();if(c==="class"||c==="style"||jo.has(c))continue;if(a.proibidos.prefixosDeAtributo.some(d=>c.startsWith(d))){yield{...f(e,t),mensagem:`atributo "${c}" \xE9 proibido no corpo da aula.`,trecho:x(r)};continue}if(a.proibidos.atributos.includes(c)){yield{...f(e,t),mensagem:`atributo "${c}" \xE9 proibido no corpo da aula.`,trecho:x(r)};continue}if(C(r)){let d=a.svg.atributosPorElemento[n]??[];if(!K(c,a.svg.atributos)&&!K(c,d)){yield{...f(e,t),mensagem:`atributo "${c}" n\xE3o est\xE1 no vocabul\xE1rio do SVG.`,trecho:x(r)};continue}c==="href"&&!new RegExp(a.svg.hrefPadrao).test(s.value)&&(yield{...f(e,t),mensagem:`href de SVG s\xF3 aponta para um id da pr\xF3pria figura: "${s.value}".`,trecho:x(r)});continue}let p=i.get(c);if(!p||p.fase>o){yield{...f(e,t),mensagem:`atributo "${c}" n\xE3o vale em <${n}>.`,trecho:x(r)};continue}if(p.layouts&&!p.layouts.includes(G(t,"data-layout")?.value)){yield{...f(e,t),mensagem:`atributo "${c}" s\xF3 vale no layout ${p.layouts.join(" ou ")}.`,trecho:x(r)};continue}let l=Io(s.value,p);l&&(yield{...f(e,t),mensagem:`${c} com ${l}.`,trecho:x(r)})}}}},{nome:"vocabulario.style",*aplicar({slides:e}){for(let{secao:a,elemento:o}of T(e))N(o)==="style"?yield{...f(e,a),mensagem:"elemento <style> no corpo da aula.",trecho:x(o)}:G(o,"style")&&(yield{...f(e,a),mensagem:`estilo em linha em <${N(o)}>.`,trecho:x(o)})}},{nome:"vocabulario.cor-svg",*aplicar({slides:e,contrato:a}){for(let{secao:o,elemento:t}of T(e))if(C(t))for(let r of["fill","stroke"]){let n=G(t,r)?.value;n!==void 0&&!a.svg.cores.includes(n.toUpperCase())&&!a.svg.cores.includes(n.toLowerCase())&&(yield{...f(e,o),mensagem:`${r}="${n}" n\xE3o \xE9 cor do contrato.`,trecho:x(t)})}}},{nome:"vocabulario.amarelo-svg",*aplicar({slides:e}){for(let{secao:a,elemento:o}of T(e)){if(!C(o))continue;let t=N(o);if(ve(o,"fill")===sa&&(t==="text"||t==="tspan")){yield{...f(e,a),mensagem:"amarelo em texto de SVG.",trecho:x(o)};continue}if(ve(o,"stroke")!==sa)continue;let i=pa(o,"stroke-width",1);i<la&&(yield{...f(e,a),mensagem:`amarelo em tra\xE7o de ${i} px (m\xEDn. ${la}).`,trecho:x(o)})}}},{nome:"vocabulario.azul-svg",*aplicar({slides:e}){for(let{secao:a,elemento:o}of T(e)){if(!C(o))continue;let t=N(o);if(t!=="text"&&t!=="tspan"||ve(o,"fill")!==Lo)continue;let r=pa(o,"font-size",16);r<ca&&(yield{...f(e,a),mensagem:`azul em texto de ${r} px (m\xEDn. ${ca}).`,trecho:x(o)})}}},{nome:"vocabulario.script",*aplicar({slides:e,contrato:a}){let o=a.html.elementosFase2?.script;for(let{secao:t,elemento:r}of T(e)){if(N(r)!=="script")continue;let n=o?.dentro?.some(i=>r.closest(i));yield{...f(e,t),mensagem:n?"script dentro da section: gr\xE1ficos e diagramas s\xE3o da fase 2.":"script dentro da section: registros de demo ficam fora dos slides.",trecho:x(r)}}}}];function da(e){if(!e)return[];let a=[[]];for(let o of e.childNodes)o.nodeType===1&&o.nodeName==="BR"?a.push([]):a.at(-1).push(o.textContent??"");return a.map(o=>R(o.join("")).replace(/\s+/g," ").trim()).filter(Boolean)}var Go="pre, code, aside.notas",_o=new Set(["strong","em","sub","sup","a","span"]);function Vo(e){let a="",o=t=>{if(t.nodeType===3){a+=t.nodeValue;return}if(t.nodeType!==1||t.matches(Go))return;let r=_o.has(t.nodeName.toLowerCase());r||(a+=" ");for(let n of t.childNodes)o(n);r||(a+=" ")};for(let t of e.childNodes)o(t);return a}function fa(e){return U(Vo(e)).filter(a=>a.tipo==="texto").reduce((a,o)=>a+o.texto.split(/\s+/).filter(Boolean).length,0)}function va(e){return R(e.textContent).replace(/\s+/g," ").trim()}var Ho=[["limites.pergunta","p.pergunta","pergunta.caracteres","a pergunta"],["limites.lide","p.lide","lide.caracteres","o lide"],["limites.afirmacao","p.afirmacao","afirmacao.caracteres","a afirma\xE7\xE3o"],["limites.fonte","p.fonte","fonte.caracteres","a fonte"],["limites.legenda","figcaption","legenda.caracteres","a legenda"],["limites.proxima","p.proxima","proxima.caracteres","a pr\xF3xima aula"]];function*Wo(e,a,o,{slides:t,contrato:r}){let n=r.limites[a];for(let i of t)for(let s of i.querySelectorAll(e)){let c=va(s);c.length>n&&(yield{...f(t,i),mensagem:`${o} tem ${c.length} caracteres (m\xE1x. ${n}).`,trecho:x(s)})}}var ga={capa:{seletor:"h1",porSegmento:"capa.h1.caracteresPorSegmento",segmentos:"capa.h1.segmentos"},abertura:{seletor:"h2",porSegmento:"abertura.h2.caracteresPorSegmento",segmentos:"abertura.h2.segmentos"},outros:{seletor:"h2",porSegmento:"titulo.caracteresPorSegmento",segmentos:"titulo.segmentos"}};function ha(e){let a=e.getAttribute("data-layout"),o=ga[a]??ga.outros;return{regra:o,elemento:e.querySelector(`:scope > ${o.seletor}`)}}function Xo(e,a){let t=[...(a.closest("thead, tbody, tfoot")??e).querySelectorAll(":scope > tr")];return t.length-t.indexOf(a)-1}function Jo(e,a,o){let t=o.getAttribute("rowspan");if(t===null)return 0;let r=Number.parseInt(t,10);return r===0?Xo(e,a):(Number.isNaN(r)||r<1?1:r)-1}var ba=[{nome:"limites.titulo",*aplicar({slides:e,contrato:a}){for(let o of e){let{regra:t,elemento:r}=ha(o),n=a.limites[t.porSegmento];for(let i of da(r))i.length>n&&(yield{...f(e,o),mensagem:`t\xEDtulo com ${i.length} caracteres num segmento (m\xE1x. ${n}).`,trecho:i})}}},{nome:"limites.segmentos-titulo",*aplicar({slides:e,contrato:a}){for(let o of e){let{regra:t,elemento:r}=ha(o),n=a.limites[t.segmentos],i=da(r).length;i>n&&(yield{...f(e,o),mensagem:`t\xEDtulo em ${$(i,"segmento","segmentos")} (m\xE1x. ${n}).`,trecho:x(r)})}}},{nome:"limites.nome-curto",*aplicar({slides:e,contrato:a}){let o=a.limites["abertura.dataCurto.caracteres"];for(let t of e){if(t.getAttribute("data-layout")!=="abertura")continue;let r=t.getAttribute("data-curto");r!==null&&r.trim().length>o&&(yield{...f(e,t),mensagem:`data-curto com ${r.trim().length} caracteres (m\xE1x. ${o}).`})}}},...Ho.map(([e,a,o,t])=>({nome:e,aplicar:r=>Wo(a,o,t,r)})),{nome:"limites.palavras-corpo",*aplicar({slides:e,contrato:a}){let o=a.limites["corpo.palavras"];for(let t of e){if(t.getAttribute("data-layout")!=="conteudo")continue;let r=t.cloneNode(!0);for(let i of r.querySelectorAll("h1, h2, p.lide"))i.remove();let n=fa(r);n>o&&(yield{...f(e,t),mensagem:`${$(n,"palavra","palavras")} no corpo (m\xE1x. ${o}).`})}}},{nome:"limites.palavras-coluna",*aplicar({slides:e,contrato:a}){let o=a.limites["coluna.palavras"];for(let t of e)for(let r of t.querySelectorAll("div.colunas > div")){let n=fa(r);n>o&&(yield{...f(e,t),mensagem:`${$(n,"palavra","palavras")} numa coluna (m\xE1x. ${o}).`,trecho:x(r)})}}},{nome:"limites.itens",*aplicar({slides:e,contrato:a}){let o=a.limites["lista.itens"];for(let t of e)for(let r of t.querySelectorAll("ul, ol.passos")){let n=r.querySelectorAll(":scope > li").length;n>o&&(yield{...f(e,t),mensagem:`lista com ${$(n,"item","itens")} (m\xE1x. ${o}).`,trecho:x(r)})}}},{nome:"limites.destaques",*aplicar({slides:e,contrato:a}){let o=a.limites["destaque.maxPorSlide"];for(let t of e){let r=t.querySelectorAll("aside.destaque").length;r>o&&(yield{...f(e,t),mensagem:`${$(r,"destaque","destaques")} no slide (m\xE1x. ${o}).`})}}},{nome:"limites.alertas",*aplicar({slides:e,contrato:a}){let o=a.limites["alerta.maxPorSlide"];for(let t of e){let r=t.querySelectorAll("aside.alerta").length;r>o&&(yield{...f(e,t),mensagem:`${$(r,"alerta","alertas")} no slide (m\xE1x. ${o}).`})}}},{nome:"limites.rotulo",*aplicar({slides:e,contrato:a}){let o=a.limites["rotulo.caracteres"];for(let t of e)for(let r of t.querySelectorAll("[data-rotulo]")){let n=r.getAttribute("data-rotulo").trim();n.length>o&&(yield{...f(e,t),mensagem:`r\xF3tulo com ${n.length} caracteres (m\xE1x. ${o}).`,trecho:x(r)})}}},{nome:"limites.sintese",*aplicar({slides:e,contrato:a}){let o=a.limites["sintese.itens"],t=a.limites["sintese.caracteresPorItem"];for(let r of e)for(let n of r.querySelectorAll("ol.sintese")){let i=[...n.querySelectorAll(":scope > li")];i.length>o&&(yield{...f(e,r),mensagem:`s\xEDntese com ${$(i.length,"item","itens")} (m\xE1x. ${o}).`});for(let s of i){let c=va(s);c.length>t&&(yield{...f(e,r),mensagem:`item da s\xEDntese com ${c.length} caracteres (m\xE1x. ${t}).`,trecho:x(s)})}}}},{nome:"limites.codigo-linhas",*aplicar({slides:e,contrato:a}){let o=a.limites["codigo.linhas"];for(let t of e)for(let r of t.querySelectorAll("pre")){let n=Z(r).split(`
`).length;n>o&&(yield{...f(e,t),mensagem:`bloco com ${$(n,"linha","linhas")} de c\xF3digo (m\xE1x. ${o}).`})}}},{nome:"limites.codigo-colunas",*aplicar({slides:e,contrato:a}){let o=a.limites["codigo.colunas"];for(let t of e)for(let r of t.querySelectorAll("pre")){let n=Z(r).split(`
`).reduce((i,s)=>Math.max(i,s.length),0);n>o&&(yield{...f(e,t),mensagem:`linha de c\xF3digo com ${n} colunas (m\xE1x. ${o}).`})}}},{nome:"limites.tabela",*aplicar({slides:e,contrato:a}){let o=a.limites["tabela.linhasDeDados"],t=a.limites["tabela.colunas"];for(let r of e)for(let n of r.querySelectorAll("table")){let i=[...n.querySelectorAll("tr")],s=i.filter(l=>!l.closest("thead")).length;s>o&&(yield{...f(e,r),mensagem:`tabela com ${$(s,"linha","linhas")} de dados (m\xE1x. ${o}).`});let c=[],p=0;for(let l of i){let d=[...l.children].reduce((u,b)=>u+(Number.parseInt(b.getAttribute("colspan")??"1",10)||1),0);p=Math.max(p,c.length+d),c=c.map(u=>u-1).filter(u=>u>0);for(let u of l.children){let b=Number.parseInt(u.getAttribute("colspan")??"1",10)||1,h=Jo(n,l,u);if(h>0)for(let m=0;m<b;m+=1)c.push(h)}}p>t&&(yield{...f(e,r),mensagem:`tabela com ${$(p,"coluna","colunas")} (m\xE1x. ${t}).`})}}},{nome:"limites.metadado",*aplicar({doc:e,contrato:a}){for(let[o,t]of Object.entries(a.metadados)){if(!t.max)continue;let r=e.querySelector(`meta[name="${o}"]`)?.getAttribute("content")?.trim()??"";r.length>t.max&&(yield{mensagem:`a meta "${o}" tem ${r.length} caracteres (m\xE1x. ${t.max}).`})}}}];var Zo=/\$[^$\n]*[\\^_][^$\n]*\$/g;function*Qo(e){for(let a of j(e))for(let o of U(a.data))o.tipo!=="texto"&&(yield o)}var xa=[{nome:"matematica.comando-proibido",*aplicar({slides:e,contrato:a}){for(let o of e)for(let t of Qo(o)){for(let r of a.proibidos.comandosTex)new RegExp(`${r.replace("\\","\\\\")}(?![a-zA-Z])`).test(t.tex)&&(yield{...f(e,o),mensagem:`comando proibido no TeX: ${r}.`,trecho:t.trecho});for(let r of a.proibidos.comandosTexPorPadrao??[])for(let n of t.tex.matchAll(new RegExp(r,"g")))yield{...f(e,o),mensagem:`comando de cor no TeX: ${n[0]}.`,trecho:t.trecho}}}},{nome:"matematica.cifrao-suspeito",*aplicar({slides:e}){for(let a of e)for(let o of re(a))for(let t of U(o.data))if(t.tipo==="texto")for(let r of t.texto.matchAll(Zo))yield{...f(e,a),mensagem:`"${r[0]}" parece matem\xE1tica entre cifr\xF5es.`,trecho:r[0]}}},{nome:"recursos.alt",*aplicar({slides:e,contrato:a}){if(a.html.atributos.img.alt.obrigatorio)for(let o of e)for(let t of o.querySelectorAll("img"))t.hasAttribute("alt")||(yield{...f(e,o),mensagem:"imagem sem alt.",trecho:x(t)})}},{nome:"recursos.imagem-externa",*aplicar({slides:e}){for(let a of e)for(let o of a.querySelectorAll('img[src^="https://" i]'))yield{...f(e,a),mensagem:`imagem de fora: "${o.getAttribute("src")}".`,trecho:x(o)}}},{nome:"recursos.linguagem",*aplicar({slides:e,contrato:a}){for(let o of e)for(let t of o.querySelectorAll("pre[data-lang]")){let r=t.getAttribute("data-lang");a.linguagens.includes(r)||(yield{...f(e,o),mensagem:`linguagem fora da lista em data-lang: "${r}".`,trecho:x(t)})}}}];var ya=[{nome:"matematica.tex-invalido",*aplicar({slides:e,recursos:a}){for(let o of a?.tex??[]){let t=o.elemento?.closest("section");yield{...t?f(e,t):{},mensagem:`TeX que o KaTeX n\xE3o compila: ${o.mensagem}`,trecho:P(o.trecho??"")}}}},{nome:"recursos.imagem",*aplicar({slides:e,recursos:a}){if(a?.imagens)for(let o of e)for(let t of o.querySelectorAll("img")){let r=t.getAttribute("src")??"";r.startsWith("data:")||a.imagens.get(r)===!1&&(yield{...f(e,o),mensagem:`imagem que n\xE3o carregou: "${r}".`,trecho:x(t)})}}},{nome:"recursos.demo-sem-registro",*aplicar({slides:e,recursos:a}){if(a?.demos)for(let o of e)for(let t of o.querySelectorAll("div.demo[data-demo]")){let r=t.getAttribute("data-demo");a.demos.has(r)||(yield{...f(e,o),mensagem:`demo sem registro: "${r}".`,trecho:x(t)})}}},{nome:"recursos.demo-sem-estatico",*aplicar({slides:e,recursos:a}){if(a?.demos)for(let o of e)for(let t of o.querySelectorAll("div.demo[data-demo]")){let r=t.getAttribute("data-demo"),n=a.demos.get(r);n&&(t.querySelector("img.estatico")||n.capturar||(yield{...f(e,o),mensagem:`demo "${r}" sem img.estatico e sem capturar(): o PDF sai vazio.`,trecho:x(t)}))}}}];var Aa=.5,Ko="rgb(252, 180, 33)",Yo="rgb(16, 148, 171)",et="rgb(10, 10, 10)",wa=32;function at(e){let a=(e.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)??[]).length,o=(e.match(/(^|[\s>+~])[a-zA-Z]+/g)??[]).length;return a*100+o}function ot(e,a){let o=null,t=-1;for(let[r,n]of Object.entries(a))if(!(r==="precedencia"||r==="excecoes"))for(let i of n.seletores){if(!e.matches(i))continue;let s=at(i);s>t&&(t=s,o={nome:r,minimo:n.minimo,seletor:i})}return o}function $a(e){return!(e.nodeName==="BR"||e.closest("aside.notas")||e.parentElement?.closest(".katex, .katex-display"))}function*Y(e){for(let a of e.querySelectorAll("*"))$a(a)&&(yield a)}function tt(e){return e.width>0&&e.height>0}function*Sa(e){if(e.nodeType===Node.TEXT_NODE){if(!e.textContent.trim())return;let a=e.ownerDocument.createRange();a.selectNodeContents(e),yield*a.getClientRects();return}if(!(e.nodeType!==Node.ELEMENT_NODE||e.nodeName==="BR")){if(e.matches(".katex, .katex-display")){yield e.getBoundingClientRect();return}for(let a of e.childNodes)yield*Sa(a)}}function rt(e){let a=[...Sa(e)].filter(n=>n.width>0&&n.height>0).sort((n,i)=>n.top-i.top),o=0,t=0,r=0;for(let n of a){let i=Math.min(r,n.bottom)-Math.max(t,n.top);o>0&&i/Math.min(n.height,r-t)>.5?(t=Math.min(t,n.top),r=Math.max(r,n.bottom)):(o+=1,t=n.top,r=n.bottom)}return o}var Da=[{nome:"composicao.transbordo",*aplicar({slides:e,janela:a}){for(let o of e){let t=o.querySelector(".area"),r=t?.getBoundingClientRect(),n=o.getBoundingClientRect();for(let i of Y(o)){let s=i.getBoundingClientRect();if(!tt(s))continue;let c=t?.contains(i)?r:n,p=Math.max(s.right-c.right,s.bottom-c.bottom,c.left-s.left,c.top-s.top);if(p>Aa){let l=t?.contains(i)?"da zona de conte\xFAdo":"do palco";yield{...f(e,o),mensagem:`<${i.nodeName.toLowerCase()}> passa ${Math.round(p)} px ${l}.`,trecho:x(i)};continue}(i.nodeName==="PRE"||i.matches(".katex-display"))&&i.scrollWidth>i.clientWidth+1&&(yield{...f(e,o),mensagem:`<${i.nodeName.toLowerCase()}> tem ${i.scrollWidth-i.clientWidth} px de conte\xFAdo al\xE9m da largura.`,trecho:x(i)})}}}},{nome:"composicao.linhas-titulo",*aplicar({slides:e,contrato:a}){for(let o of e){let t=o.querySelector(".area h1, .area h2");if(!t)continue;let r=o.getAttribute("data-layout"),n=r==="capa"?"capa.h1.linhas":r==="abertura"?"abertura.h2.linhas":"titulo.linhas",i=a.limites[n],s=rt(t);s>i&&(yield{...f(e,o),mensagem:`t\xEDtulo renderizado em ${s} linhas (m\xE1x. ${i}).`,trecho:x(t)})}}},{nome:"composicao.tamanho-minimo",*aplicar({slides:e,contrato:a,janela:o}){for(let t of e)for(let r of Y(t)){if(a.papeis.excecoes.some(s=>r.matches(s)))continue;let n=ot(r,a.papeis);if(!n)continue;let i=Number.parseFloat(o.getComputedStyle(r).fontSize);i<n.minimo-Aa&&(yield{...f(e,t),mensagem:`<${r.nodeName.toLowerCase()}> em ${i} px, abaixo do m\xEDnimo de ${n.minimo} px do papel ${n.nome}.`,trecho:x(r)})}}},{nome:"composicao.azul-pequeno",*aplicar({slides:e,janela:a}){for(let o of e)for(let t of Y(o)){if(!t.textContent.trim())continue;let r=a.getComputedStyle(t);if(r.color!==Yo)continue;let n=Number.parseFloat(r.fontSize);n<wa&&(yield{...f(e,o),mensagem:`texto em azul com ${n} px (m\xEDn. ${wa}).`,trecho:x(t)})}}},{nome:"composicao.texto-no-amarelo",*aplicar({slides:e,janela:a}){for(let o of e)for(let t of Y(o))if(a.getComputedStyle(t).backgroundColor===Ko)for(let n of[t,...t.querySelectorAll("*")].filter($a)){if(!n.textContent.trim())continue;let i=a.getComputedStyle(n).color;i!==et&&(yield{...f(e,o),mensagem:`texto sobre amarelo em ${i}, n\xE3o em tinta.`,trecho:x(n)})}}}];var Ua=[...oa,...ia,...ma,...ba,...xa],Ea=ya,Ca=Da;var ee,nt=/\\\(|\\\[/,it=["estilos/tokens.css","estilos/fontes.css","estilos/base.css","estilos/layouts.css","estilos/componentes.css","estilos/motor.css","estilos/impressao.css"];function st(e){return new Promise((a,o)=>{let t=document.createElement("link");t.rel="stylesheet",t.href=new URL(e,ee).href,t.addEventListener("load",a,{once:!0}),t.addEventListener("error",()=>o(new Error(`n\xE3o carregou ${e}`)),{once:!0}),document.head.append(t)})}async function be(e){let a=await fetch(new URL(e,ee));if(!a.ok)throw new Error(`n\xE3o carregou ${e} (HTTP ${a.status})`);return a.json()}function ct(){return document.readyState!=="loading"?Promise.resolve():new Promise(e=>document.addEventListener("DOMContentLoaded",e,{once:!0}))}async function qa({base:e,resolver:a=t=>t,estilo:o}={}){ee=new URL("../",e);let t=o??st;try{await ct();let[r,n,i]=await Promise.all([be("assets/marcas/unidades.json"),be("assets/marcas/usp.json"),be("contrato/contrato.json")]),s=document.cloneNode(!0),c=W(s,{contrato:i,regras:Ua,grupo:"estatica",unidades:r});await Promise.all(it.map(t));let p=Te(document,{unidades:r,usp:n,urlMarcas:new URL("assets/marcas",ee).href,limites:{minBlocos:i.limites["blocos.min"],maxFileira:i.limites["blocos.maxFileira"]}}),l=[];if(nt.test(document.body.textContent)){let[{default:m}]=await Promise.all([import(a("katex")),t("modulos/katex/dist/katex.min.css")]);l=$e(document.body,{katex:m});let v=document.querySelectorAll(".tex-invalido"),A=H(document.body),y=H(s.body);l=l.map((w,S)=>{let E=A.indexOf(v[S]?.closest("section"));return{...w,elemento:E<0?void 0:y[E]}});for(let w of l)console.error(`Aula USP: TeX inv\xE1lido em ${w.trecho}: ${w.mensagem}`)}let d=[...document.querySelectorAll("pre[data-lang]")];if(d.length>0){let m=[...new Set(d.map(D=>D.getAttribute("data-lang")))].filter(D=>i.linguagens.includes(D)),[{createShikiPrimitive:v,codeToTokensBase:A},{createJavaScriptRegexEngine:y},...w]=await Promise.all([import(a("@shikijs/primitive")),import(a("@shikijs/engine-javascript")),...m.map(D=>import(a(`@shikijs/langs/${D}`)))]),S=Object.fromEntries(m.map((D,L)=>[D,w[L].default])),E=ea({createShikiPrimitive:v,codeToTokensBase:A,createJavaScriptRegexEngine:y,gramaticas:S});for(let D of aa(document.body,{destacador:E}))console.error(`Aula USP: c\xF3digo com ${D.mensagem}`)}document.readyState!=="complete"&&await new Promise(m=>{let v=setTimeout(m,2e3);window.addEventListener("load",()=>{clearTimeout(v),m()},{once:!0})}),document.body.offsetHeight,await document.fonts.ready;let u={tex:l,imagens:new Map([...document.querySelectorAll("img")].filter(m=>m.complete).map(m=>[m.getAttribute("src")??"",m.naturalWidth>0])),demos:new Map((window.AulaUSP?.filaDeDemos??[]).map(({nome:m,definicao:v})=>[m,{capturar:typeof v.capturar=="function"}]))},b=!new URLSearchParams(location.search).has("folha"),h=[...c,...W(s,{contrato:i,regras:Ea,grupo:"carga",recursos:u}),...b?W(document,{contrato:i,regras:Ca,grupo:"composicao",janela:window}):[]];for(let m of h)m.severidade==="aviso"&&console.warn(`Aula USP: ${I(m)}`);if(!b)document.body.classList.add("folha");else{let m=window.AulaUSP??(window.AulaUSP={}),v=je({doc:document,janela:window,resumo:p});if(He(window))We(v);else{let A=Be(v);A.mostrarAchados(h);let y=Ie(v,m);Xe(v,A),Je(v,{demos:y,paineis:A,api:m})}}document.body.dataset.montado="sim"}catch(r){document.body.dataset.montado="erro";let n=document.createElement("pre");n.className="painel",n.textContent=`Aula USP: ${r.message}`,document.body.prepend(n),console.error(r)}finally{document.querySelector('style[data-aula-usp="ocultar"]')?.remove()}}var Na=`/* Gerado por build/tokens.mjs a partir de tokens/aula-usp.tokens.json. N\xE3o editar \xE0 m\xE3o. */
:root {
  --cor-papel: #FFFFFF;
  --cor-tinta: #0A0A0A;
  --cor-cinza: #666666;
  --cor-linha: #D9D9D9;
  --cor-azul: #1094AB;
  --cor-amarelo: #FCB421;
  --fonte-sans: Geist, system-ui, sans-serif;
  --fonte-mono: "Geist Mono", ui-monospace, monospace;
  --fonte-marca: "Open Sans", sans-serif;
  --tipo-capa-familia: Geist, system-ui, sans-serif;
  --tipo-capa-tamanho: 96px;
  --tipo-capa-peso: 600;
  --tipo-capa-entrelinha: 1;
  --tipo-capa-tracking: -3.36px;
  --tipo-abertura-familia: Geist, system-ui, sans-serif;
  --tipo-abertura-tamanho: 84px;
  --tipo-abertura-peso: 600;
  --tipo-abertura-entrelinha: 1;
  --tipo-abertura-tracking: -2.52px;
  --tipo-afirmacao-familia: Geist, system-ui, sans-serif;
  --tipo-afirmacao-tamanho: 64px;
  --tipo-afirmacao-peso: 600;
  --tipo-afirmacao-entrelinha: 1.08;
  --tipo-afirmacao-tracking: -1.92px;
  --tipo-titulo-familia: Geist, system-ui, sans-serif;
  --tipo-titulo-tamanho: 44px;
  --tipo-titulo-peso: 600;
  --tipo-titulo-entrelinha: 1.08;
  --tipo-titulo-tracking: -1.32px;
  --tipo-numeral-familia: Geist, system-ui, sans-serif;
  --tipo-numeral-tamanho: 40px;
  --tipo-numeral-peso: 600;
  --tipo-numeral-entrelinha: 1;
  --tipo-numeral-tracking: 0px;
  --tipo-lide-familia: Geist, system-ui, sans-serif;
  --tipo-lide-tamanho: 32px;
  --tipo-lide-peso: 400;
  --tipo-lide-entrelinha: 1.25;
  --tipo-lide-tracking: 0px;
  --tipo-leitura-familia: Geist, system-ui, sans-serif;
  --tipo-leitura-tamanho: 24px;
  --tipo-leitura-peso: 400;
  --tipo-leitura-entrelinha: 1.42;
  --tipo-leitura-tracking: 0px;
  --tipo-leitura-peso-enfase: 600;
  --tipo-codigo-familia: "Geist Mono", ui-monospace, monospace;
  --tipo-codigo-tamanho: 20px;
  --tipo-codigo-peso: 400;
  --tipo-codigo-entrelinha: 1.45;
  --tipo-codigo-tracking: 0px;
  --tipo-codigo-peso-enfase: 600;
  --tipo-legenda-familia: Geist, system-ui, sans-serif;
  --tipo-legenda-tamanho: 18px;
  --tipo-legenda-peso: 400;
  --tipo-legenda-entrelinha: 1.35;
  --tipo-legenda-tracking: 0px;
  --tipo-rotulo-familia: "Geist Mono", ui-monospace, monospace;
  --tipo-rotulo-tamanho: 14px;
  --tipo-rotulo-peso: 700;
  --tipo-rotulo-entrelinha: 1.2;
  --tipo-rotulo-tracking: 2.24px;
  --tipo-rotulo-caixa: uppercase;
  --tipo-rodape-familia: "Geist Mono", ui-monospace, monospace;
  --tipo-rodape-tamanho: 14px;
  --tipo-rodape-peso: 400;
  --tipo-rodape-entrelinha: 1.2;
  --tipo-rodape-tracking: 2.24px;
  --tipo-rodape-caixa: uppercase;
  --tipo-rotulo-grande-familia: "Geist Mono", ui-monospace, monospace;
  --tipo-rotulo-grande-tamanho: 20px;
  --tipo-rotulo-grande-peso: 700;
  --tipo-rotulo-grande-entrelinha: 1.2;
  --tipo-rotulo-grande-tracking: 3.2px;
  --tipo-rotulo-grande-caixa: uppercase;
  --tipo-marca-usp-familia: "Open Sans", sans-serif;
  --tipo-marca-usp-tamanho: 20px;
  --tipo-marca-usp-peso: 600;
  --tipo-marca-usp-entrelinha: 1.15;
  --tipo-marca-usp-tracking: 0px;
  --minimo-leitura: 24px;
  --minimo-codigo: 20px;
  --minimo-legenda: 18px;
  --minimo-rotulo: 14px;
  --palco-largura: 1280px;
  --palco-altura: 720px;
  --palco-margem: 64px;
  --palco-coluna: 74px;
  --palco-calha: 24px;
  --palco-util: 1152px;
  --zona-cabecalho-topo: 40px;
  --zona-cabecalho-base: 64px;
  --zona-titulo-topo: 96px;
  --zona-conteudo-base: 652px;
  --zona-rodape-base: 688px;
  --zona-marca-base: 680px;
  --zona-capa-conteudo-base: 520px;
  --zona-abertura-titulo-topo-min: 360px;
  --espaco-1: 8px;
  --espaco-2: 16px;
  --espaco-3: 24px;
  --espaco-4: 32px;
  --espaco-5: 48px;
  --espaco-6: 64px;
  --espaco-7: 96px;
  --regua-fina: 1px;
  --regua-normal: 2px;
  --regua-forte: 4px;
  --contraste-azul-texto-minimo: 32px;
  --contraste-amarelo-linha-minima: 4px;
  --mapa-quadrado-cabecalho: 16px;
  --mapa-espaco-cabecalho: 8px;
  --mapa-quadrado-abertura-max: 160px;
  --mapa-calha-abertura: 24px;
  --mapa-quadrado-capa: 24px;
  --mapa-numero-proporcao: 0.55;
  --mapa-faixa-bloco-n-de-m: 220px;
  --marca-usp-altura: 56px;
}
`;var ka=`/* Gerado por build/fontes-css.mjs a partir de assets/fontes/fontes.json. N\xE3o editar \xE0 m\xE3o. */
@font-face {
  font-family: 'Geist';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fontes/geist-italico-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Geist';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fontes/geist-italico-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: url('../assets/fontes/geist-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: url('../assets/fontes/geist-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Geist Mono';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('../assets/fontes/geist-mono-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Geist Mono';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('../assets/fontes/geist-mono-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../assets/fontes/open-sans-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../assets/fontes/open-sans-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;var Fa=`/* Base do Aula USP: caixa, papel e tinta, texto de leitura e o modo folha (spec 4.2 a 4.4). */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--cor-papel);
  color: var(--cor-tinta);
}

body {
  font-family: var(--tipo-leitura-familia);
  font-size: var(--tipo-leitura-tamanho);
  font-weight: var(--tipo-leitura-peso);
  line-height: var(--tipo-leitura-entrelinha);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
p,
ol,
ul,
figure {
  margin: 0;
}

strong {
  font-weight: var(--tipo-leitura-peso-enfase);
}

img,
svg {
  display: block;
}

/* Modo folha (?folha na URL): slides um abaixo do outro, sem motor. */
body.folha {
  display: grid;
  justify-content: center;
  gap: var(--espaco-5);
  padding: var(--espaco-5);
}

body.folha .slide {
  outline: var(--regua-fina) solid var(--cor-linha);
}
`;var Ta=`/* Slide, cromo e os sete layouts (spec 4.4, 5.3 e 5.4), em px l\xF3gicos do palco de 1280 \xD7 720. */

/* ---------- slide e \xE1rea ---------- */

.slide {
  position: relative;
  width: var(--palco-largura);
  height: var(--palco-altura);
  overflow: hidden;
  background: var(--cor-papel);
  color: var(--cor-tinta);
}

.slide > aside.notas {
  display: none;
}

.area {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: var(--zona-titulo-topo);
  bottom: calc(var(--palco-altura) - var(--zona-conteudo-base));
  display: flex;
  flex-direction: column;
}

.area > h2 {
  font-family: var(--tipo-titulo-familia);
  font-size: var(--tipo-titulo-tamanho);
  font-weight: var(--tipo-titulo-peso);
  line-height: var(--tipo-titulo-entrelinha);
  letter-spacing: var(--tipo-titulo-tracking);
  margin-bottom: var(--espaco-4);
}

.sinal {
  color: var(--cor-azul);
}

/* Ritmo entre blocos de corpo; a forma de cada bloco est\xE1 em componentes.css. */
.slide[data-layout="conteudo"] > .area > :not(h2, .lide) + *,
.colunas > div > * + * {
  margin-top: var(--espaco-3);
}

.area > p.lide {
  font-family: var(--tipo-lide-familia);
  font-size: var(--tipo-lide-tamanho);
  font-weight: var(--tipo-lide-peso);
  line-height: var(--tipo-lide-entrelinha);
  margin-bottom: var(--espaco-3);
}

/* ---------- grades (spec 4.4) ---------- */

.colunas {
  --col-4: calc(4 * var(--palco-coluna) + 3 * var(--palco-calha));
  --col-6: calc(6 * var(--palco-coluna) + 5 * var(--palco-calha));
  --col-8: calc(8 * var(--palco-coluna) + 7 * var(--palco-calha));
  display: grid;
  column-gap: var(--palco-calha);
  align-items: start;
}

.colunas[data-grade="12"] { grid-template-columns: var(--palco-util); }
.colunas[data-grade="6-6"] { grid-template-columns: var(--col-6) var(--col-6); }
.colunas[data-grade="8-4"] { grid-template-columns: var(--col-8) var(--col-4); }
.colunas[data-grade="4-8"] { grid-template-columns: var(--col-4) var(--col-8); }
.colunas[data-grade="4-4-4"] { grid-template-columns: var(--col-4) var(--col-4) var(--col-4); }

/* ---------- r\xF3tulos do cromo (spec 4.3) ---------- */

.cabecalho,
.nome-curto,
.roteiro {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

/* ---------- quadrados do mapa (spec 5.4) ---------- */

.quadrado {
  display: block;
}

.quadrado.visto { background: var(--cor-tinta); }
.quadrado.atual { background: var(--cor-azul); }
.quadrado.futuro { border: var(--regua-normal) solid var(--cor-tinta); }
.fileira .quadrado.atual { background: var(--cor-amarelo); }

/* ---------- cabe\xE7alho e rodap\xE9 ---------- */

.cabecalho {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: var(--zona-cabecalho-topo);
  height: calc(var(--zona-cabecalho-base) - var(--zona-cabecalho-topo));
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
  white-space: nowrap;
}

.cabecalho .rotulo {
  margin-right: auto;
}

.cabecalho .mapa {
  display: flex;
  gap: var(--mapa-espaco-cabecalho);
}

.cabecalho .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cabecalho .contador {
  min-width: calc(7 * (1ch + var(--tipo-rodape-tracking)));
  text-align: right;
  font-weight: var(--tipo-rodape-peso);
  font-variant-numeric: tabular-nums;
}

.rodape {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: calc(var(--zona-rodape-base) - var(--rodape-linha-de-base));
  font-family: var(--tipo-rodape-familia);
  font-size: var(--tipo-rodape-tamanho);
  font-weight: var(--tipo-rodape-peso);
  line-height: var(--tipo-rodape-entrelinha);
  letter-spacing: var(--tipo-rodape-tracking);
  text-transform: var(--tipo-rodape-caixa);
  color: var(--cor-cinza);
  --rodape-linha-de-base: 13px;
}

/* ---------- capa e encerramento ---------- */

.slide[data-layout="capa"] > .area,
.slide[data-layout="encerramento"] > .area {
  bottom: calc(var(--palco-altura) - var(--zona-capa-conteudo-base));
}

.slide[data-layout="capa"] h1 {
  font-family: var(--tipo-capa-familia);
  font-size: var(--tipo-capa-tamanho);
  font-weight: var(--tipo-capa-peso);
  line-height: var(--tipo-capa-entrelinha);
  letter-spacing: var(--tipo-capa-tracking);
}

.metadados-capa {
  margin-top: var(--espaco-4);
}

.fileira,
.roteiro {
  --lado: var(--mapa-quadrado-abertura-max);
  list-style: none;
  padding: 0;
  display: flex;
  gap: var(--mapa-calha-abertura);
}

.fileira[data-n="7"],
.roteiro[data-n="7"] {
  --lado: calc((var(--palco-util) - 6 * var(--mapa-calha-abertura)) / 7);
}

.fileira[data-n="8"],
.roteiro[data-n="8"] {
  --lado: calc((var(--palco-util) - 7 * var(--mapa-calha-abertura)) / 8);
}

.roteiro {
  margin-top: auto;
}

.roteiro > li {
  width: var(--lado);
}

.roteiro .quadrado {
  width: var(--mapa-quadrado-capa);
  height: var(--mapa-quadrado-capa);
  margin-bottom: var(--espaco-2);
}

.slide[data-mapa="contador"] .roteiro {
  flex-wrap: wrap;
  row-gap: var(--espaco-1);
  counter-reset: bloco;
}

.slide[data-mapa="contador"] .roteiro > li {
  width: auto;
  counter-increment: bloco;
}

.slide[data-mapa="contador"] .roteiro > li::before {
  content: counter(bloco, decimal-leading-zero) " ";
}

.slide[data-mapa="contador"] .roteiro .quadrado {
  display: none;
}

.slide[data-layout="encerramento"] .proxima {
  margin-top: var(--espaco-4);
}

/* ---------- faixa de marca (spec 4.5) ---------- */

.faixa-de-marca {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  bottom: calc(var(--palco-altura) - var(--zona-marca-base));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.marca-usp {
  display: flex;
  align-items: center;
  gap: 20px;
}

.marca-usp > span {
  font-family: var(--tipo-marca-usp-familia);
  font-size: var(--tipo-marca-usp-tamanho);
  font-weight: var(--tipo-marca-usp-peso);
  line-height: var(--tipo-marca-usp-entrelinha);
  text-align: right;
}

/* ---------- abertura ---------- */

.fileira {
  position: absolute;
  left: var(--palco-margem);
  top: var(--zona-titulo-topo);
  margin: 0;
}

.fileira > li {
  width: var(--lado);
}

.fileira .quadrado {
  width: var(--lado);
  height: var(--lado);
  display: flex;
  align-items: flex-end;
  padding: var(--espaco-2);
}

.fileira .numero-bloco {
  font-family: var(--tipo-abertura-familia);
  font-size: calc(var(--lado) * var(--mapa-numero-proporcao));
  font-weight: var(--tipo-abertura-peso);
  line-height: 0.8;
  letter-spacing: -0.03em;
  color: var(--cor-tinta);
}

.fileira .nome-curto {
  display: block;
  margin-top: var(--espaco-2);
}

.fileira > li[data-estado="futuro"] .nome-curto {
  color: var(--cor-cinza);
}

.slide[data-mapa="contador"] .fileira {
  --lado: var(--mapa-quadrado-abertura-max);
}

.slide[data-mapa="contador"] .fileira > li:not([data-estado="atual"]),
.slide[data-mapa="contador"] .fileira .nome-curto {
  display: none;
}

.slide[data-layout="abertura"] > .area {
  top: auto;
  max-height: calc(var(--zona-conteudo-base) - var(--zona-abertura-titulo-topo-min));
  display: grid;
  grid-template-columns: 1fr var(--mapa-faixa-bloco-n-de-m);
  column-gap: var(--palco-calha);
  align-items: baseline;
}

.slide[data-layout="abertura"] > .area > h2 {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
  font-family: var(--tipo-abertura-familia);
  font-size: var(--tipo-abertura-tamanho);
  font-weight: var(--tipo-abertura-peso);
  line-height: var(--tipo-abertura-entrelinha);
  letter-spacing: var(--tipo-abertura-tracking);
}

.slide[data-layout="abertura"] .bloco-n-de-m {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  font-family: var(--tipo-rotulo-grande-familia);
  font-size: var(--tipo-rotulo-grande-tamanho);
  font-weight: var(--tipo-rotulo-grande-peso);
  line-height: var(--tipo-rotulo-grande-entrelinha);
  letter-spacing: var(--tipo-rotulo-grande-tracking);
  text-transform: var(--tipo-rotulo-grande-caixa);
  white-space: nowrap;
}

.slide[data-layout="abertura"] .pergunta {
  grid-column: 1;
  grid-row: 2;
  margin-top: var(--espaco-3);
  font-family: var(--tipo-lide-familia);
  font-size: var(--tipo-lide-tamanho);
  font-weight: var(--tipo-lide-peso);
  line-height: var(--tipo-lide-entrelinha);
}

/* ---------- afirma\xE7\xE3o ---------- */

.slide[data-layout="afirmacao"] > .area {
  justify-content: center;
}

.afirmacao {
  font-family: var(--tipo-afirmacao-familia);
  font-size: var(--tipo-afirmacao-tamanho);
  font-weight: var(--tipo-afirmacao-peso);
  line-height: var(--tipo-afirmacao-entrelinha);
  letter-spacing: var(--tipo-afirmacao-tracking);
}

.fonte,
figcaption {
  font-family: var(--tipo-legenda-familia);
  font-size: var(--tipo-legenda-tamanho);
  font-weight: var(--tipo-legenda-peso);
  line-height: var(--tipo-legenda-entrelinha);
  color: var(--cor-cinza);
}

.afirmacao + .fonte {
  margin-top: var(--espaco-3);
}

/* ---------- demo ---------- */

.slide[data-layout="demo"] .demo {
  flex: 1;
  min-height: 0;
  position: relative;
}

.demo > img.estatico {
  display: none;
}
`;var Oa=`/* Blocos de corpo (spec 7.1): campos, exerc\xEDcio, listas, tabela, figura e texto em linha, em px l\xF3gicos do palco. */

/* ---------- campos e exerc\xEDcio ---------- */

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado) {
  padding: var(--espaco-2) var(--espaco-3);
}

.area aside.destaque {
  background: var(--cor-amarelo);
  color: var(--cor-tinta);
}

.area :is(aside.quadro, div.enunciado) {
  border: var(--regua-normal) solid var(--cor-tinta);
}

.area aside.alerta {
  background: var(--cor-tinta);
  color: var(--cor-papel);
}

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado, div.resposta)[data-rotulo]::before {
  content: attr(data-rotulo);
  display: block;
  margin-bottom: var(--espaco-1);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado, div.resposta) > * + * {
  margin-top: var(--espaco-2);
}

.area div.exercicio > * + * {
  margin-top: var(--espaco-3);
}

/* ---------- listas ---------- */

.area :is(ul, ol.passos, ol.sintese) {
  list-style: none;
  padding: 0;
}

.area ul > li {
  padding-left: var(--espaco-3);
  text-indent: calc(-1 * var(--espaco-3));
}

.area ul > li + li {
  margin-top: var(--espaco-1);
}

.area ul > li::before {
  content: "";
  display: inline-block;
  width: var(--espaco-1);
  height: var(--espaco-1);
  margin-right: var(--espaco-2);
  vertical-align: middle;
  background: currentColor; /* tinta fora de campo, papel dentro de aside.alerta */
}

.area :is(ol.passos, ol.sintese) {
  counter-reset: passo;
}

.area :is(ol.passos, ol.sintese) > li {
  counter-increment: passo;
  padding-top: var(--espaco-2);
  padding-left: var(--espaco-6);
  text-indent: calc(-1 * var(--espaco-6));
  border-top: var(--regua-normal) solid currentColor; /* tinta fora de campo, papel dentro de aside.alerta */
}

.area :is(ol.passos, ol.sintese) > li + li {
  margin-top: var(--espaco-3);
}

.area :is(ol.passos, ol.sintese) > li::before {
  content: counter(passo);
  display: inline-block;
  width: var(--espaco-6);
  text-indent: 0;
  font-family: var(--tipo-numeral-familia);
  font-size: var(--tipo-numeral-tamanho);
  font-weight: var(--tipo-numeral-peso);
  line-height: var(--tipo-numeral-entrelinha);
  letter-spacing: var(--tipo-numeral-tracking);
}

.area :is(ul, ol.passos, ol.sintese) > li > * {
  text-indent: 0;
}

/* ---------- texto em linha ---------- */

.area :not(pre) > code {
  font-family: var(--tipo-codigo-familia);
  font-size: 0.88em; /* spec 7.1 */
}

.area :is(sub, sup) {
  font-size: 0.8em; /* spec 4.3 */
  line-height: 0;
}

/* ---------- tabela ---------- */

.area table {
  width: 100%;
  border-collapse: collapse;
  border-top: var(--regua-forte) solid var(--cor-tinta);
  border-bottom: var(--regua-forte) solid var(--cor-tinta);
}

.area :is(th, td) {
  padding: var(--espaco-1) var(--espaco-2);
  font-weight: var(--tipo-leitura-peso);
  text-align: left;
  vertical-align: baseline;
  border-top: var(--regua-fina) solid var(--cor-linha);
}

.area thead :is(th, td) {
  font-weight: var(--tipo-leitura-peso-enfase);
  border-bottom: var(--regua-normal) solid var(--cor-tinta);
}

.area :is(th, td).numerica {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.area :is(tr.destaque > *, td.destaque) {
  background: var(--cor-amarelo);
}

/* ---------- figura ---------- */

.area figure > :is(img, svg) {
  max-width: 100%;
  height: auto;
}

.area figcaption {
  margin-top: var(--espaco-2);
}

.area figure[data-foto="pb"] img {
  filter: grayscale(1);
}

.slide[data-layout="figura"] figure {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.slide[data-layout="figura"] figure > :is(img, svg) {
  flex: 0 1 auto;
  min-height: 0;
}

/* ---------- matem\xE1tica ---------- */

.area .katex {
  font-size: 1.1em; /* spec 4.3 */
  letter-spacing: normal; /* a matem\xE1tica n\xE3o herda o espa\xE7amento negativo dos t\xEDtulos (spec 4.3) */
}

.area .equacao > .katex-display {
  margin: 0;
  text-align: left;
}

.area .equacao > .katex-display > .katex {
  text-align: left;
}

.area .tex-invalido {
  padding: 0 var(--espaco-1);
  background: var(--cor-tinta);
  color: var(--cor-papel);
  font-family: var(--tipo-codigo-familia);
  font-size: 0.88em; /* spec 7.1, como o c\xF3digo em linha */
}

.area div.tex-invalido {
  padding: var(--espaco-2) var(--espaco-3);
  font-size: var(--tipo-codigo-tamanho);
}

/* ---------- c\xF3digo ---------- */

.area pre {
  margin: 0;
  padding: var(--espaco-1) var(--espaco-1) 0;
  border-top: var(--regua-normal) solid currentColor; /* tinta fora de campo, papel dentro do alerta */
  font-family: var(--tipo-codigo-familia);
  font-size: var(--tipo-codigo-tamanho);
  font-weight: var(--tipo-codigo-peso);
  line-height: var(--tipo-codigo-entrelinha);
  letter-spacing: var(--tipo-codigo-tracking);
  counter-reset: linha;
}

/* Cada linha cobre a largura do bloco, recuo inclu\xEDdo, para o campo amarelo; entre elas fica a quebra de linha do c\xF3digo. */
.area pre .linha {
  display: inline-block;
  width: calc(100% + 2 * var(--espaco-1));
  min-height: 1lh; /* a linha vazia tamb\xE9m ocupa uma linha */
  margin-inline: calc(-1 * var(--espaco-1));
  padding-inline: var(--espaco-1);
  vertical-align: top;
}

.area pre .palavra-chave {
  font-weight: var(--tipo-codigo-peso-enfase);
}

.area pre .comentario {
  color: var(--cor-cinza);
}

.area pre[data-numeros] .linha::before {
  counter-increment: linha;
  content: counter(linha);
  display: inline-block;
  min-width: 2ch;
  margin-right: 2ch;
  text-align: right;
  color: var(--cor-cinza);
}

/* Dentro de um campo, coment\xE1rio e n\xFAmero seguem a cor do campo; :where deixa a linha marcada passar na frente. */
.area :where(aside.destaque, aside.alerta) pre .comentario,
.area :where(aside.destaque, aside.alerta) pre[data-numeros] .linha::before {
  color: inherit;
}

.area pre .marcada {
  background: var(--cor-amarelo);
  color: var(--cor-tinta);
}

/* Sobre amarelo, s\xF3 tinta (spec 4.2): na linha marcada, coment\xE1rio e n\xFAmero deixam o cinza. */
.area pre .marcada .comentario,
.area pre[data-numeros] .marcada::before {
  color: var(--cor-tinta);
}
`;var Ma=`/* Motor (spec 6.1 e 6.4): palco escalado no centro da janela, um slide por vez, passos ocultos sem mover nada. */

body.modo-palco {
  height: 100vh;
  overflow: hidden;
}

.palco {
  --escala: 1;
  --centro-x: 50vw;
  position: fixed;
  left: var(--centro-x);
  top: 50%;
  width: var(--palco-largura);
  height: var(--palco-altura);
  transform: translate(-50%, -50%) scale(var(--escala));
}

.palco > .slide {
  display: none;
  position: absolute;
  inset: 0;
}

.palco > .slide.ativo {
  display: block;
}

body.modo-palco [data-passo]:not([data-revelado]) {
  visibility: hidden;
}

/* Pain\xE9is (spec 6.5): fora do palco, sem escala; notas \xE0 direita, vis\xE3o geral e ajuda na janela inteira. */

[data-painel] {
  position: fixed;
  z-index: 1;
  overflow: auto;
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font-family: var(--fonte-sans);
}

[data-painel][hidden] {
  display: none;
}

[data-painel]:focus {
  outline: none;
}

.painel-titulo {
  margin-bottom: var(--espaco-3);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

[data-painel="notas"] {
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  padding: var(--espaco-3);
  border-left: var(--regua-normal) solid var(--cor-linha);
  font-size: 20px;
  line-height: 1.4;
}

[data-painel="notas"] .painel-corpo > * + * {
  margin-top: var(--espaco-2);
}

[data-painel="visao-geral"],
[data-painel="ajuda"],
[data-painel="validador"] {
  inset: 0;
  padding: var(--espaco-5) var(--espaco-6);
}

.grupo + .grupo {
  margin-top: var(--espaco-4);
}

.grupo-titulo {
  margin: 0 0 var(--espaco-2);
  font-size: 20px;
  font-weight: var(--tipo-titulo-peso);
}

.cartoes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--espaco-2);
}

.cartao {
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: start;
  align-items: center;
  gap: var(--espaco-1);
  padding: var(--espaco-2);
  border: var(--regua-normal) solid var(--cor-linha);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font: inherit;
  font-size: 18px;
  text-align: left;
  cursor: pointer;
}

.cartao[aria-current="true"] {
  border-color: var(--cor-tinta);
}

.cartao .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cartao-numero {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  letter-spacing: var(--tipo-rotulo-tracking);
  color: var(--cor-cinza);
}

.cartao-titulo {
  grid-column: 1 / -1;
}

.teclas {
  border-collapse: collapse;
  font-size: 20px;
}

.teclas th,
.teclas td {
  padding: var(--espaco-1) var(--espaco-3) var(--espaco-1) 0;
  border-bottom: var(--regua-fina) solid var(--cor-linha);
  text-align: left;
  vertical-align: top;
}

.teclas tbody th {
  font-family: var(--tipo-codigo-familia);
  font-weight: var(--tipo-codigo-peso-enfase);
  white-space: nowrap;
}

/* Painel do validador (spec 3.2 e 9.1): a mensagem j\xE1 vem pronta de linhaDe, s\xF3 o estilo \xE9 daqui. */

.achados {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--tipo-codigo-familia);
  font-size: 18px;
  line-height: var(--tipo-codigo-entrelinha);
}

.achados li {
  white-space: pre-wrap; /* linhaDe quebra o trecho numa segunda linha recuada; preserva a quebra */
}

.achados li + li {
  margin-top: var(--espaco-2);
}

.achados li[data-severidade="erro"] {
  font-weight: var(--tipo-codigo-peso-enfase);
}

.achados li[data-severidade="aviso"] {
  color: var(--cor-cinza);
}

[data-painel="validador"] .copiar {
  position: absolute;
  top: var(--espaco-5);
  right: var(--espaco-6);
  padding: var(--espaco-1) var(--espaco-2);
  border: var(--regua-normal) solid var(--cor-tinta);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font: inherit;
  font-size: var(--tipo-rotulo-tamanho);
  text-transform: var(--tipo-rotulo-caixa);
  letter-spacing: var(--tipo-rotulo-tracking);
  cursor: pointer;
}

[data-painel="validador"] .copiar:disabled {
  border-color: var(--cor-cinza);
  color: var(--cor-cinza);
  cursor: default;
}

/* Janela do apresentador (spec 6.6): miniaturas fi\xE9is \xE0 esquerda, notas e controles \xE0 direita. */

body.modo-apresentador .palco {
  display: none;
}

.apresentador {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    "atual painel"
    "proxima painel"
    ". painel";
  gap: var(--espaco-3);
  padding: var(--espaco-3);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font-family: var(--fonte-sans);
}

.miniatura[data-miniatura="atual"] { grid-area: atual; }
.miniatura[data-miniatura="proxima"] { grid-area: proxima; width: 60%; }

.miniatura > .rotulo {
  display: block;
  margin-bottom: var(--espaco-1);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.quadro-miniatura {
  --escala-miniatura: 0.5;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: var(--regua-normal) solid var(--cor-linha);
}

.quadro-miniatura > .slide {
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(var(--escala-miniatura));
  transform-origin: top left;
}

.quadro-miniatura .demo > img.estatico {
  display: block;
}

.fim-da-aula {
  padding: var(--espaco-3);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
  color: var(--cor-cinza);
}

.painel-apresentador {
  grid-area: painel;
  display: flex;
  flex-direction: column;
  gap: var(--espaco-3);
  min-height: 0;
}

.posicao {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-grande-tamanho);
  font-weight: var(--tipo-rotulo-grande-peso);
  letter-spacing: var(--tipo-rotulo-grande-tracking);
  text-transform: var(--tipo-rotulo-grande-caixa);
}

.painel-apresentador .mapa {
  display: flex;
  gap: var(--mapa-espaco-cabecalho);
}

.painel-apresentador .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cronometro {
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
  font-family: var(--tipo-codigo-familia);
  font-size: var(--tipo-codigo-tamanho);
}

.cronometro .tempo {
  font-size: var(--tipo-numeral-tamanho);
  font-weight: var(--tipo-numeral-peso);
  font-variant-numeric: tabular-nums;
}

.cronometro .relogio {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--cor-cinza);
}

.cronometro button {
  padding: var(--espaco-1) var(--espaco-2);
  border: var(--regua-normal) solid var(--cor-tinta);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font: inherit;
  font-size: var(--tipo-rotulo-tamanho);
  text-transform: var(--tipo-rotulo-caixa);
  letter-spacing: var(--tipo-rotulo-tracking);
  cursor: pointer;
}

.notas-apresentador {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 24px;
  line-height: 1.4;
}

.notas-apresentador > * + * {
  margin-top: var(--espaco-2);
}

.aviso {
  margin-bottom: var(--espaco-3);
  padding: var(--espaco-2);
  background: var(--cor-amarelo);
  color: var(--cor-tinta);
  font-size: 18px;
  line-height: 1.4;
}
`;var za=`/* Impress\xE3o e PDF (spec 6.9 e 8.4): um slide ou estado por p\xE1gina, sem pain\xE9is nem janelas do motor. */

@page {
  size: 1280px 720px;
  margin: 0;
}

@media print {
  body.modo-palco {
    height: auto;
    overflow: visible;
  }

  .palco {
    position: static;
    width: auto;
    height: auto;
    transform: none;
  }

  .palco > .slide {
    display: block;
    position: relative;
    break-after: page;
  }

  .palco > .slide:last-child {
    break-after: auto;
  }

  /* A caixa "Gr\xE1ficos de plano de fundo" do di\xE1logo de impress\xE3o do Chrome vem desligada por padr\xE3o
     (spec 8.4); sem isto, os campos, o alerta e os destaques de tabela perdem a cor de fundo. */
  .slide {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  [data-painel],
  .apresentador {
    display: none;
  }

  .demo > img.estatico {
    display: block;
  }

  .demo > *:not(img.estatico):not(.captura-demo):not(.demo-substituta) {
    display: none;
  }
}

.demo-substituta {
  padding: var(--espaco-2) var(--espaco-3);
  border: var(--regua-normal) solid var(--cor-tinta);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.demo > img.estatico,
.captura-demo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
`;var ht=new Map([["estilos/tokens.css",Na],["estilos/fontes.css",ka],["estilos/base.css",Fa],["estilos/layouts.css",Ta],["estilos/componentes.css",Oa],["estilos/motor.css",Ma],["estilos/impressao.css",za]]),ae=document.createElement("style");ae.setAttribute("data-aula-usp","ocultar");ae.textContent="body { visibility: hidden; }";document.head.append(ae);var Pa=[];window.AulaUSP={filaDeDemos:Pa,demo(e,a){Pa.push({nome:e,definicao:a})}};var La=document.currentScript?.src;qa({base:La,resolver:e=>new URL(e==="katex"?"aula-usp-tex.js":e.startsWith("@shikijs/langs/")?`aula-usp-lang-${e.split("/").pop()}.js`:"aula-usp-codigo.js",La).href,estilo:e=>{let a=ht.get(e);if(a===void 0)return;let o=document.createElement("style");o.textContent=a,document.head.append(o)}}).catch(e=>{ae.remove(),console.error("Aula USP: o runtime n\xE3o carregou.",e)});})();
