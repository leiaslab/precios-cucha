const KEY='petshop-precios-v1';
const IMG_PREFIX='petshop-img-';
const CATS_DEFAULT=[
  {n:'Alimento',c:'#0E7A5F'},{n:'Snacks',c:'#C77D0A'},{n:'Higiene',c:'#2A6FB0'},
  {n:'Accesorios',c:'#8B5C9E'},{n:'Juguetes',c:'#C24A5B'},{n:'Salud',c:'#3E8E7E'},{n:'Otros',c:'#78716C'}
];
const COLORES=['#0E7A5F','#C77D0A','#2A6FB0','#8B5C9E','#C24A5B','#3E8E7E','#D08C1F','#5B7A2A','#B4432E','#7A5AA8','#0E8F9B','#78716C'];
let estado={productos:[],nombreLocal:'Local 2',categorias:CATS_DEFAULT.slice()};
let filtroCat='Todos', busqueda='', editId=null, modalUnidad='unidad', modalCat='Alimento', ncColor=COLORES[0];
let modalImgs=[]; // array de dataURLs en el formulario (máx 5)
const imgCache={}; // id -> array de dataURLs
const MAX_FOTOS=5;
let lightboxImgs=[], lightboxIdx=0;

const catColor=n=>(estado.categorias.find(c=>c.n===n)||{}).c||'#66766E';
const esDefault=n=>CATS_DEFAULT.some(c=>c.n===n);
const fmt=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const escapeH=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---- Persistencia (metadatos) ----
async function load(){
  try{ if(window.storage){const r=await window.storage.get(KEY); if(r&&r.value) return JSON.parse(r.value);} }catch(e){}
  try{ const v=localStorage.getItem(KEY); if(v) return JSON.parse(v); }catch(e){}
  return null;
}
async function save(){
  const s=JSON.stringify(estado);
  try{ if(window.storage){await window.storage.set(KEY,s); return;} }catch(e){}
  try{ localStorage.setItem(KEY,s); }catch(e){}
}
// ---- Persistencia (imágenes: array por producto, una clave) ----
async function saveImgs(id,arr){
  const k=IMG_PREFIX+id;
  if(!arr||!arr.length){ await delImgs(id); return; }
  const s=JSON.stringify(arr);
  try{ if(window.storage){await window.storage.set(k,s); return;} }catch(e){}
  try{ localStorage.setItem(k,s); }catch(e){}
}
async function loadImgs(id){
  const k=IMG_PREFIX+id;
  let raw=null;
  try{ if(window.storage){const r=await window.storage.get(k); raw=r&&r.value?r.value:null;} }catch(e){}
  if(raw===null){ try{ raw=localStorage.getItem(k); }catch(e){} }
  if(!raw) return [];
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed;
    if(typeof parsed==='string') return [parsed];
    return [];
  }catch(e){
    return raw.indexOf('data:')===0 ? [raw] : [];
  }
}
async function delImgs(id){
  const k=IMG_PREFIX+id;
  try{ if(window.storage){await window.storage.delete(k); return;} }catch(e){}
  try{ localStorage.removeItem(k); }catch(e){}
}

// ---- Redimensionar imagen ----
function resizeImage(file,maxSize=360,quality=0.65){
  return new Promise((res,rej)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let w=img.width,h=img.height;
      if(w>h){ if(w>maxSize){h=Math.round(h*maxSize/w);w=maxSize;} }
      else { if(h>maxSize){w=Math.round(w*maxSize/h);h=maxSize;} }
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      res(cv.toDataURL('image/jpeg',quality));
    };
    img.onerror=rej;
    img.src=url;
  });
}

// ---- Render principal ----
function renderChips(){
  const cats=['Todos',...new Set(estado.productos.map(p=>p.categoria))];
  if(filtroCat!=='Todos' && !cats.includes(filtroCat)) filtroCat='Todos';
  const bar=document.getElementById('catBar');
  bar.style.display=estado.productos.length?'block':'none';
  const sel=document.getElementById('catSelect');
  sel.innerHTML='';
  cats.forEach(c=>{
    const o=document.createElement('option');
    o.value=c; o.textContent=(c==='Todos'?'Todas las categorías':c);
    if(filtroCat===c) o.selected=true;
    sel.appendChild(o);
  });
}
function thumbHTML(p){
  const imgs=imgCache[p.id];
  if(imgs&&imgs.length){
    const badge=imgs.length>1?`<span class="thumb-badge">${imgs.length}</span>`:'';
    return `<div class="thumb-wrap"><img class="thumb" src="${imgs[0]}" data-full="${p.id}">${badge}</div>`;
  }
  return `<div class="thumb ph">🛍️</div>`;
}
function renderLista(){
  const main=document.getElementById('lista');
  main.innerHTML='';
  if(!estado.productos.length){
    main.innerHTML='<div class="empty"><div class="big">🦴</div><p style="font-weight:600;color:var(--ink);margin-bottom:4px">Todavía no cargaste productos</p><p style="font-size:14px;margin-top:0">Tocá el botón de abajo para agregar el primero.</p></div>';
    return;
  }
  const q=busqueda.trim().toLowerCase();
  const vis=estado.productos
    .filter(p=>filtroCat==='Todos'||p.categoria===filtroCat)
    .filter(p=>p.nombre.toLowerCase().includes(q)||p.categoria.toLowerCase().includes(q))
    .sort((a,b)=>(Number(a.precio)||0)-(Number(b.precio)||0));
  if(!vis.length){main.innerHTML='<p class="empty">Nada coincide con la búsqueda.</p>';return;}
  vis.forEach(p=>{
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML=`
      <div class="row">
        ${thumbHTML(p)}
        <div class="info">
          <div class="nombre">${escapeH(p.nombre)}</div>
          <div class="meta">
            <span class="cat" style="color:${catColor(p.categoria)}"><span class="dot" style="background:${catColor(p.categoria)}"></span>${escapeH(p.categoria)}</span>
            <span class="unidad">· por ${p.unidad}</span>
          </div>
          ${p.descripcion?`<div class="desc">${escapeH(p.descripcion)}</div>`:''}
        </div>
        <button class="precio">${fmt(p.precio)}</button>
      </div>
      <div class="acciones">
        <button class="link editar" style="color:var(--muted)">Editar</button>
        <button class="link borrar" style="color:var(--danger)">Borrar</button>
      </div>`;
    const th=card.querySelector('.thumb[data-full]');
    if(th)th.onclick=()=>abrirLightbox(imgCache[p.id],0);
    card.querySelector('.precio').onclick=e=>{
      const btn=e.currentTarget;
      const inp=document.createElement('input');
      inp.className='precio-input';inp.type='number';inp.inputMode='decimal';inp.value=p.precio;
      btn.replaceWith(inp);inp.focus();inp.select();
      const conf=()=>{const v=parseFloat(String(inp.value).replace(',','.'));if(!isNaN(v)){p.precio=v;save();}render();};
      inp.onblur=conf;inp.onkeydown=ev=>{if(ev.key==='Enter')conf();};
    };
    card.querySelector('.editar').onclick=()=>abrirModal(p);
    card.querySelector('.borrar').onclick=()=>{
      estado.productos=estado.productos.filter(x=>x.id!==p.id);
      delImgs(p.id);delete imgCache[p.id];save();render();
    };
    main.appendChild(card);
  });
  ensureImages(vis.map(p=>p.id));
}
async function ensureImages(ids){
  const missing=ids.filter(id=>!(id in imgCache));
  if(!missing.length)return;
  await Promise.all(missing.map(async id=>{imgCache[id]=await loadImgs(id);}));
  renderLista();
}
function render(){renderChips();renderLista();}
