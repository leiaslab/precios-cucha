// ---- Eventos ----
document.getElementById('addBtn').onclick=()=>abrirModal(null);
document.getElementById('btnCancel').onclick=cerrarModal;
document.getElementById('btnSave').onclick=guardarModal;
document.getElementById('overlay').onclick=e=>{if(e.target.id==='overlay')cerrarModal();};
document.querySelectorAll('#fUnidad .opt2').forEach(el=>el.onclick=()=>setUnidad(el.dataset.u));
document.getElementById('busqueda').oninput=e=>{busqueda=e.target.value;renderLista();};
document.getElementById('catSelect').onchange=e=>{filtroCat=e.target.value;renderLista();};
document.getElementById('btnNuevaCat').onclick=()=>{
  const p=document.getElementById('nuevaCatPanel');
  const abierto=p.style.display==='block';
  p.style.display=abierto?'none':'block';
  if(!abierto)pintarNuevaCat();
};
document.getElementById('ncAgregar').onclick=agregarCat;
document.getElementById('ncCancel').onclick=()=>{document.getElementById('nuevaCatPanel').style.display='none';};

const h1=document.getElementById('localNombre'), li=document.getElementById('localInput');
h1.onclick=()=>{li.value=estado.nombreLocal;h1.style.display='none';li.style.display='block';li.focus();};
const guardarLocal=()=>{estado.nombreLocal=li.value.trim()||'Local';save();h1.innerHTML=escapeH(estado.nombreLocal)+' <span style="font-size:14px;opacity:.6">✎</span>';li.style.display='none';h1.style.display='block';};
li.onblur=guardarLocal;li.onkeydown=e=>{if(e.key==='Enter')guardarLocal();};

// ---- Copia de seguridad (exportar / importar) ----
function abrirCfg(){document.getElementById('overlayCfg').classList.add('show');}
function cerrarCfg(){document.getElementById('overlayCfg').classList.remove('show');}
document.getElementById('gear').onclick=abrirCfg;
document.getElementById('cfgCerrar').onclick=cerrarCfg;
document.getElementById('overlayCfg').onclick=e=>{if(e.target.id==='overlayCfg')cerrarCfg();};

async function exportar(){
  const imagenes={};
  for(const pr of estado.productos){
    const imgs=(pr.id in imgCache)?imgCache[pr.id]:await loadImgs(pr.id);
    if(imgs&&imgs.length) imagenes[pr.id]=imgs;
  }
  const data={version:1,exportedAt:new Date().toISOString(),nombreLocal:estado.nombreLocal,categorias:estado.categorias,productos:estado.productos,imagenes};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='precios-cucha-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.getElementById('btnExport').onclick=exportar;

document.getElementById('btnImport').onclick=()=>document.getElementById('importInput').click();
document.getElementById('importInput').onchange=async e=>{
  const file=e.target.files&&e.target.files[0];
  if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data||!Array.isArray(data.productos)){alert('El archivo no parece una copia válida de Precios Cucha.');e.target.value='';return;}
    if(!confirm('Esto reemplaza la lista de ESTE dispositivo por la de la copia. ¿Continuar?')){e.target.value='';return;}
    const oldIds=estado.productos.map(x=>x.id);
    for(const id of oldIds) await delImgs(id);
    estado={productos:data.productos,nombreLocal:data.nombreLocal||'Local',categorias:(data.categorias&&data.categorias.length)?data.categorias:CATS_DEFAULT.slice()};
    await save();
    for(const k in imgCache) delete imgCache[k];
    const imgs=data.imagenes||{};
    for(const id in imgs){ await saveImgs(id,imgs[id]); imgCache[id]=imgs[id]; }
    document.getElementById('localNombre').innerHTML=escapeH(estado.nombreLocal)+' <span style="font-size:14px;opacity:.6">✎</span>';
    cerrarCfg();render();
    alert('¡Copia importada con éxito!');
  }catch(err){ alert('No pude leer el archivo. Asegurate de elegir el .json que exportaste.'); }
  e.target.value='';
};

// ---- Init ----
(async()=>{
  const d=await load();
  if(d){
    estado=d;
    if(!estado.categorias||!estado.categorias.length)estado.categorias=CATS_DEFAULT.slice();
    h1.innerHTML=escapeH(estado.nombreLocal)+' <span style="font-size:14px;opacity:.6">✎</span>';
  }
  render();
})();
// ---- Service worker (offline) ----
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});}
