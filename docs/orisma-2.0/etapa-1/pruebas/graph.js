// Genera el grafo de llamadas entre funciones del index.html original.
// Uso: node graph.js <index.html> <salida.md>  (requiere acorn y eslint-scope@7)
const fs=require('fs'),acorn=require('acorn'),es=require('eslint-scope');
const lines=fs.readFileSync(process.argv[2],'utf8').split('\n');
const s=lines.findIndex(l=>l.trim()==='(function(){'), e=lines.findLastIndex(l=>l.trim()==='})();');
const src='function __app(){\n'+lines.slice(s+1,e).join('\n')+'\n}';
const ast=acorn.parse(src,{ecmaVersion:'latest',ranges:true,locations:true});
const sm=es.analyze(ast,{ecmaVersion:2022});const fn=ast.body[0];const app=sm.acquire(fn);
const L=n=>n.loc.start.line+s; // línea original
const AREA=[[515,'Núcleo/Navegación'],[546,'Créditos'],[623,'Clientes'],[644,'Inventario'],[847,'Pedidos/Apartados'],[1534,'Ventas'],[1575,'Gastos'],[1600,'Reportes/Caja/Flujo'],[1907,'UI (overlay)'],[1921,'Clientes'],[1994,'Inventario'],[2276,'Gastos'],[2584,'Venta (asistente)'],[3217,'Facturas'],[3558,'UI (imágenes/toggles)'],[3627,'Ventas (WhatsApp/anulación)'],[3672,'Créditos'],[3789,'Respaldo'],[3874,'Ajustes'],[4106,'Arranque']];
const area=l=>{let a='Datos/Utilidades';for(const[f,n]of AREA)if(l>f)a=n;return a};
const decl={};for(const st of fn.body.body){if(st.type==='FunctionDeclaration')decl[st.id.name]={l:L(st),k:'fn',node:st};else if(st.type==='VariableDeclaration')st.declarations.forEach(d=>decl[d.id.name]={l:L(st),k:'var',node:st});}
const refs={};const all=[];(function c(sc){sc.references.forEach(r=>r.resolved&&r.resolved.scope===app&&all.push(r));sc.childScopes.forEach(c)})(app);
for(const r of all){const owner=Object.entries(decl).find(([n,d])=>d.node.range[0]<=r.identifier.range[0]&&r.identifier.range[1]<=d.node.range[1]);if(!owner)continue;const[on]=owner;if(on===r.identifier.name)continue;(refs[on]??=new Set()).add(r.identifier.name);}
const DATA=['clientes','inventario','ventas','gastos','movimientos','pedidos','config'];
const writes={};for(const r of all){if(!r.isWrite()||!DATA.includes(r.identifier.name))continue;const owner=Object.entries(decl).find(([n,d])=>d.node.range[0]<=r.identifier.range[0]&&r.identifier.range[1]<=d.node.range[1]);if(owner&&owner[0]!==r.identifier.name)(writes[owner[0]]??=new Set()).add(r.identifier.name);}
// config se modifica por propiedad
for(const[n,d]of Object.entries(decl)){const t=src.slice(d.node.range[0],d.node.range[1]);if(/config\.[a-zA-Z]+\s*(\+?=)(?!=)/.test(t)&&n!=='config')(writes[n]??=new Set()).add('config');const sv=[...t.matchAll(/save\('cuentas_(\w+)'/g)].map(m=>m[1]);if(sv.length)decl[n].saves=[...new Set(sv)];}
const fns=Object.entries(decl).filter(([,d])=>d.k==='fn').sort((a,b)=>a[1].l-b[1].l);
const out=[];out.push(`Total de funciones de nivel superior: ${fns.length}. Variables de nivel superior: ${Object.values(decl).filter(d=>d.k==='var').length}.\n`);
let cur='';for(const[n,d]of fns){const a=area(d.l);if(a!==cur){out.push(`\n#### ${a}\n\n| Función | Línea | Llama a | Lee datos | Escribe datos (localStorage) |\n|---|---|---|---|---|`);cur=a;}
const r=[...(refs[n]||[])];const calls=r.filter(x=>decl[x]&&decl[x].k==='fn').sort();const reads=r.filter(x=>DATA.includes(x)).sort();
out.push(`| \`${n}\` | ${d.l} | ${calls.map(c=>'`'+c+'`').join(', ')||'—'} | ${reads.join(', ')||'—'} | ${(d.saves||[]).join(', ')||'—'} |`);}
// quién llama a quién: más usadas
const inbound={};for(const[n,set]of Object.entries(refs))for(const x of set)if(decl[x]&&decl[x].k==='fn')(inbound[x]??=new Set()).add(n);
const top=Object.entries(inbound).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1]).slice(0,20);
fs.writeFileSync(process.argv[3],out.join('\n')+'\n');
console.log(JSON.stringify({fns:fns.length,top}));
// funciones nunca llamadas
console.log('sin llamadas:',fns.map(([n])=>n).filter(n=>!inbound[n]));
