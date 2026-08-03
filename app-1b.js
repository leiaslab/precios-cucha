// ---- Lightbox (galería) ----
function abrirLightbox(imgs,idx){
  if(!imgs||!imgs.length)return;
  lightboxImgs=imgs; lightboxIdx=idx||0;
  pintarLightbox();
  document.getElementById('lightbox').classList.add('show');
}
function pintarLightbox(){
  document.getElementById('lightboxImg').src=lightboxImgs[lightboxIdx];
  const multi=lightboxImgs.length>1;
  document.getElementById('lbPrev').style.display=multi?'flex':'none';
  document.getElementById('lbNext').style.display=multi?'flex':'none';
  const dots=document.getElementById('lbDots');dots.innerHTML='';
  if(multi){lightboxImgs.forEach((_,i)=>{const d=document.createElement('div');d.className='d'+(i===lightboxIdx?' on':'');dots.appendChild(d);});}
}
function lbMover(dir){lightboxIdx=(lightboxIdx+dir+lightboxImgs.length)%lightboxImgs.length;pintarLightbox();}
document.getElementById('lightbox').onclick=e=>{if(e.target.id==='lightbox'||e.target.id==='lightboxImg')document.getElementById('lightbox').classList.remove('show');};
document.getElementById('lbPrev').onclick=e=>{e.stopPropagation();lbMover(-1);};
document.getElementById('lbNext').onclick=e=>{e.stopPropagation();lbMover(1);};

// ---- Modal producto: fotos (hasta 5) ----
function pintarFotosModal(){
  const box=document.getElementById('fFotos');box.innerHTML='';
  modalImgs.forEach((src,i)=>{
    const item=document.createElement('div');item.className='foto-item';
    const img=document.createElement('img');img.src=src;img.onclick=()=>abrirLightbox(modalImgs,i);
    const x=document.createElement('button');x.className='foto-x';x.textContent='×';
    x.onclick=()=>{modalImgs.splice(i,1);pintarFotosModal();};
    item.appendChild(img);item.appendChild(x);box.appendChild(item);
  });
  if(modalImgs.length<MAX_FOTOS){
    const add=document.createElement('button');add.className='foto-add';
    add.innerHTML='📷<small>Agregar</small>';
    add.onclick=()=>document.getElementById('fImgInput').click();
    box.appendChild(add);
  }
}
document.getElementById('fImgInput').onchange=async e=>{
  const files=Array.from(e.target.files||[]);
  for(const file of files){
    if(modalImgs.length>=MAX_FOTOS){ alert('Máximo 5 fotos por producto.'); break; }
    try{ modalImgs.push(await resizeImage(file)); }catch(err){}
  }
  pintarFotosModal();
  e.target.value='';
};

// ---- Contador de descripción ----
function actualizarContador(){
  const t=document.getElementById('fDesc');
  document.getElementById('descCount').textContent=t.value.length+'/100';
}
document.getElementById('fDesc').addEventListener('input',actualizarContador);

// ---- Modal producto ----
function pintarCatsModal(){
  const box=document.getElementById('fCats');box.innerHTML='';
  estado.categorias.forEach(c=>{
    const b=document.createElement('div');
    b.className='opt';b.textContent=c.n;
    if(modalCat===c.n){b.style.background=c.c;b.style.color='#fff';b.style.borderColor=c.c;}
    b.onclick=()=>{modalCat=c.n;pintarCatsModal();};
    box.appendChild(b);
  });
}
function setUnidad(u){modalUnidad=u;document.querySelectorAll('#fUnidad .opt2').forEach(el=>el.classList.toggle('on',el.dataset.u===u));}
async function abrirModal(p){
  editId=p?p.id:null;
  document.getElementById('modalTitulo').textContent=p?'Editar producto':'Nuevo producto';
  document.getElementById('fNombre').value=p?p.nombre:'';
  document.getElementById('fDesc').value=p&&p.descripcion?p.descripcion:'';
  actualizarContador();
  document.getElementById('fPrecio').value=p?p.precio:'';
  modalCat=p?p.categoria:(estado.categorias[0]?estado.categorias[0].n:'Otros');
  pintarCatsModal();setUnidad(p?p.unidad:'unidad');
  document.getElementById('nuevaCatPanel').style.display='none';
  modalImgs = p ? ((p.id in imgCache) ? (imgCache[p.id]||[]).slice() : await loadImgs(p.id)) : [];
  if(p) imgCache[p.id]=modalImgs.slice();
  pintarFotosModal();
  document.getElementById('overlay').classList.add('show');
  document.getElementById('fNombre').focus();
}
function cerrarModal(){document.getElementById('overlay').classList.remove('show');}
async function guardarModal(){
  const nombre=document.getElementById('fNombre').value.trim();
  if(!nombre)return;
  const descripcion=document.getElementById('fDesc').value.trim();
  const precio=parseFloat(String(document.getElementById('fPrecio').value).replace(',','.'))||0;
  let id;
  if(editId){
    const p=estado.productos.find(x=>x.id===editId);
    Object.assign(p,{nombre,descripcion,categoria:modalCat,unidad:modalUnidad,precio});id=editId;
  }else{
    id=uid();estado.productos.push({id,nombre,descripcion,categoria:modalCat,unidad:modalUnidad,precio});
  }
  // guardar fotos
  await saveImgs(id,modalImgs); imgCache[id]=modalImgs.slice();
  await save();cerrarModal();render();
}

// ---- Crear / borrar categorías ----
function pintarNuevaCat(){
  const box=document.getElementById('ncColores');box.innerHTML='';
  COLORES.forEach(col=>{
    const d=document.createElement('div');
    d.className='swatch';d.style.background=col;
    if(ncColor===col)d.style.borderColor='#16211D';
    d.onclick=()=>{ncColor=col;pintarNuevaCat();};
    box.appendChild(d);
  });
  pintarCustomCats();
}
function pintarCustomCats(){
  const box=document.getElementById('ncLista');box.innerHTML='';
  const custom=estado.categorias.filter(c=>!esDefault(c.n));
  if(!custom.length){box.style.display='none';return;}
  box.style.display='block';
  const t=document.createElement('div');t.style.cssText='font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px';t.textContent='Tus categorías';
  box.appendChild(t);
  custom.forEach(c=>{
    const row=document.createElement('div');row.className='custom-row';
    row.innerHTML=`<span style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${c.c}"></span>${escapeH(c.n)}</span>`;
    const x=document.createElement('button');x.className='custom-x';x.textContent='×';
    x.onclick=()=>{
      if(estado.productos.some(p=>p.categoria===c.n)){alert('Esa categoría tiene productos. Cambialos de categoría antes de borrarla.');return;}
      estado.categorias=estado.categorias.filter(k=>k.n!==c.n);
      if(modalCat===c.n)modalCat=estado.categorias[0].n;
      save();pintarCatsModal();pintarNuevaCat();
    };
    row.appendChild(x);box.appendChild(row);
  });
}
function agregarCat(){
  const nombre=document.getElementById('ncNombre').value.trim();
  if(!nombre)return;
  if(estado.categorias.some(c=>c.n.toLowerCase()===nombre.toLowerCase())){alert('Esa categoría ya existe.');return;}
  estado.categorias.push({n:nombre,c:ncColor});
  save();
  modalCat=nombre;
  document.getElementById('ncNombre').value='';
  document.getElementById('nuevaCatPanel').style.display='none';
  pintarCatsModal();
}
