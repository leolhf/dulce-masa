// ══════════════ RECETAS ══════════════
function renderRecetas(){
  const cats=[...new Set(recetas.map(r=>r.cat))].sort();
  const rcf=$('rec-cat-f');const cv=rcf.value;
  rcf.innerHTML='<option value="">Todas</option>';
  cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===cv)o.selected=true;rcf.appendChild(o);});
  const q=($('rec-q').value||'').toLowerCase();
  const catF=$('rec-cat-f').value;
  const dispF=$('rec-disp-f').value;
  const lista=recetas.filter(r=>{
    if(q&&!r.nombre.toLowerCase().includes(q))return false;
    if(catF&&r.cat!==catF)return false;
    if(dispF==='ok'&&!canProduce(r))return false;
    if(dispF==='nok'&&canProduce(r))return false;
    return true;
  }).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const tb=$('tbl-rec').querySelector('tbody');
  if(lista.length===0){tb.innerHTML='<tr><td colspan="8" class="empty">Sin resultados</td></tr>';return;}
  tb.innerHTML=lista.map(r=>{
    const c=calcCosto(r);const can=canProduce(r);
    return`<tr><td style="font-weight:500;cursor:pointer;color:var(--caramel)" data-id="${r.id}" onclick="verReceta(+this.dataset.id)">${r.nombre}</td>
    <td style="font-size:.78rem;color:var(--text2)">${r.cat}</td>
    <td>${r.rinde} unid.</td><td style="font-size:.82rem;color:var(--text2)">${r.tiempo} min</td>
    <td>${fmt(c)}</td><td>${r.rinde>0?fmt(c/r.rinde):'—'}</td>
    <td><span class="badge badge-${can?'ok':'danger'}">${can?'Listo':'Falta stock'}</span></td>
    <td class="td-actions">
      <button class="btn btn-secondary btn-sm btn-icon" data-id="${r.id}" onclick="duplicarRec(+this.dataset.id)" title="Duplicar receta">⧉</button>
      <button class="btn btn-secondary btn-sm btn-icon" data-id="${r.id}" onclick="editRec(+this.dataset.id)" title="Editar">✎</button>
      <button class="btn btn-danger btn-sm btn-icon" data-id="${r.id}" onclick="delRec(+this.dataset.id)" title="Eliminar">✕</button>
    </td></tr>`;
  }).join('');
}

let editRecId=null,iRows=[];
function abrirModalReceta(){
  editRecId=null;iRows=[];$('rec-title').textContent='Nueva receta';
  ['rec-nombre','rec-desc'].forEach(id=>$(id).value='');
  $('rec-rinde').value=1;$('rec-tiempo').value=60;
  _fillRecCatSelect(catRecetas[0]||'');
  $('rec-ings').innerHTML='';addIngRow();openModal('modal-rec');
}
function editRec(id){
  const r=rec(id);if(!r)return;editRecId=id;iRows=[];
  $('rec-title').textContent='Editar receta';
  $('rec-nombre').value=r.nombre;
  _fillRecCatSelect(r.cat);
  $('rec-rinde').value=r.rinde;$('rec-tiempo').value=r.tiempo;
  $('rec-desc').value=r.desc;$('rec-ings').innerHTML='';
  r.ings.forEach(ri=>addIngRow(ri));openModal('modal-rec');
}
function addIngRow(data=null){
  const idx=iRows.length;iRows.push(idx);
  const div=document.createElement('div');
  div.className='ing-row';div.id='irow-'+idx;
  const opts=ingredientes.map(i=>`<option value="${i.id}">${i.nombre}</option>`).join('');
  const ingData=data?ing(data.ingId):null;
  const uv=ingData?ingData.unidad:'';
  const selectedValue=ingData?ingData.nombre:'';
  div.innerHTML=`<div class="form-group">${idx===0?'<label>Ingrediente</label>':''}
    <div style="position:relative">
      <input type="text" id="ri-ing-${idx}" value="${selectedValue}" placeholder="Escribir para buscar..." 
             oninput="mostrarSugerenciasIngredientes(${idx}, this.value)" 
             onfocus="mostrarSugerenciasIngredientes(${idx}, this.value)" 
             onblur="ocultarSugerenciasIngredientes(${idx})"
             style="padding-right:35px">
      <button type="button" onclick="mostrarTodosLosIngredientes(${idx})" 
              style="position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text2);padding:2px"
              title="Mostrar todos los ingredientes">▼</button>
      <div id="sugerencias-ingredientes-${idx}" style="position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:var(--r);max-height:200px;overflow-y:auto;z-index:1000;display:none;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>
      <select id="ri-ing-hidden-${idx}" style="display:none">${opts}</select>
    </div>
  </div>
    <div class="form-group">${idx===0?'<label>Cantidad</label>':''}<input type="number" id="ri-qty-${idx}" step="0.001" min="0.001" value="${data?data.qty:''}" placeholder="0"></div>
    <div class="form-group">${idx===0?'<label>Unidad</label>':''}<input id="ri-unit-${idx}" value="${uv}" readonly></div>
    <button class="ing-del" onclick="delIRow(${idx})" ${idx===0?'style="margin-top:20px"':''}>✕</button>`;
  
  // Agregar evento change al select oculto para mantener compatibilidad
  div.querySelector('#ri-ing-hidden-'+idx).addEventListener('change', function(){const i=ing(parseInt(this.value));if(i)document.getElementById('ri-unit-'+idx).value=i.unidad;});
  
  $('rec-ings').appendChild(div);
  
  // IMPORTANTE: setear el valor del select oculto DESPUÉS de insertar en el DOM
  if(data && data.ingId){
    const hs = $('ri-ing-hidden-'+idx);
    if(hs) hs.value = String(data.ingId);
    // Si el ingId no existe entre los ingredientes, limpiar el campo para no mostrar datos incorrectos
    if(!ingData){
      const ti=$('ri-ing-'+idx); if(ti) ti.value='';
      const ui=$('ri-unit-'+idx); if(ui) ui.value='';
    }
  }
}
function delIRow(idx){const el=$('irow-'+idx);if(el)el.remove();}
function guardarReceta(){
  const nombre=$('rec-nombre').value.trim();
  if(!nombre){toast('Ingresá el nombre');return;}
  const ings=[];
  document.querySelectorAll('[id^="ri-ing-hidden-"]').forEach(hiddenSelect=>{
    const idx=hiddenSelect.id.replace('ri-ing-hidden-','');
    const qty=parseFloat(($('ri-qty-'+idx)||{}).value);
    const ingId=hiddenSelect.value?parseInt(hiddenSelect.value):null;
    if(!isNaN(qty)&&qty>0&&ingId)ings.push({ingId,qty});
  });
  if(ings.length===0){toast('Agregá al menos un ingrediente');return;}
  // Preservar precioVenta si existía (se edita desde sección Costos, no desde aquí)
  const recExistente = editRecId ? rec(editRecId) : null;
  const data={id:editRecId||nextId.rec++,nombre,cat:$('rec-cat').value,rinde:parseInt($('rec-rinde').value)||1,tiempo:parseInt($('rec-tiempo').value)||60,desc:$('rec-desc').value,ings,
    ...(recExistente?.precioVenta ? {precioVenta: recExistente.precioVenta} : {})};
  if(editRecId){recetas=recetas.map(r=>r.id===editRecId?data:r);}else recetas.push(data);
  editRecId=null;iRows=[];closeModal('modal-rec');renderRecetas();saveData();toast('Receta guardada ✓');
}

// ── Duplicar receta ──
function duplicarRec(id){
  const r = rec(id); if(!r) return;
  const copia = {
    ...JSON.parse(JSON.stringify(r)), // deep copy
    id: nextId.rec++,
    nombre: r.nombre + ' (copia)'
  };
  recetas.push(copia);
  renderRecetas(); saveData();
  toast(`"${copia.nombre}" creada ✓`);
}

// ── Gestión de categorías de recetas ──
function _fillRecCatSelect(valorActual){
  const s = $('rec-cat'); if(!s) return;
  s.innerHTML = catRecetas.map(c =>
    `<option value="${c}"${c === valorActual ? ' selected' : ''}>${c}</option>`
  ).join('');
}

function abrirModalCategorias(){
  _renderCatRecLista();
  $('cat-rec-nueva').value = '';
  openModal('modal-cat-rec');
}

function _renderCatRecLista(){
  const el = $('cat-rec-lista'); if(!el) return;
  const usadas = new Set(recetas.map(r => r.cat));
  if(catRecetas.length === 0){
    el.innerHTML = '<p class="empty" style="padding:8px 0">Sin categorías definidas.</p>';
    return;
  }
  el.innerHTML = catRecetas.map((c, idx) => {
    const enUso = usadas.has(c);
    const nRecetas = recetas.filter(r => r.cat === c).length;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border2)">
      <span style="flex:1;font-size:.87rem;font-weight:500">${c}</span>
      ${enUso
        ? `<span class="badge badge-ok" style="font-size:.68rem">${nRecetas} receta${nRecetas!==1?'s':''}</span>`
        : ''}
      <button class="btn btn-danger btn-sm btn-icon" onclick="eliminarCatRec(${idx})"
        ${enUso ? 'disabled title="Tiene recetas asignadas"' : 'title="Eliminar categoría"'}>✕</button>
    </div>`;
  }).join('');
}

function agregarCatRec(){
  const val = $('cat-rec-nueva').value.trim();
  if(!val){ toast('Escribí un nombre'); return; }
  if(catRecetas.map(c=>c.toLowerCase()).includes(val.toLowerCase())){
    toast('Esa categoría ya existe'); return;
  }
  catRecetas.push(val);
  $('cat-rec-nueva').value = '';
  _renderCatRecLista();
  saveData();
  toast(`Categoría "${val}" agregada ✓`);
}

function eliminarCatRec(idx){
  const nombre = catRecetas[idx];
  const enUso = recetas.some(r => r.cat === nombre);
  if(enUso){ toast('No se puede eliminar — hay recetas con esta categoría'); return; }
  catRecetas.splice(idx, 1);
  _renderCatRecLista();
  saveData();
  toast(`Categoría "${nombre}" eliminada`);
}
function delRec(id){
  const r = rec(id); if(!r) return;
  const nProd    = (producciones||[]).filter(p=>p.recetaId==id).length;
  const nVentas  = (ventas||[]).filter(v=>v.recetaId==id).length;
  const nPedidos = (pedidos||[]).filter(p=>p.estado!=='entregado'&&(p.items||[]).some(it=>it.recetaId==id)).length;
  
  let advertencias = [];
  if(nProd    > 0) advertencias.push(`${nProd} producción${nProd!==1?'es':''} registrada${nProd!==1?'s':''}`);
  if(nVentas  > 0) advertencias.push(`${nVentas} venta${nVentas!==1?'s':''} registrada${nVentas!==1?'s':''}`);
  if(nPedidos > 0) advertencias.push(`${nPedidos} pedido${nPedidos!==1?'s':''} activo${nPedidos!==1?'s':''}`);
  
  const msg = advertencias.length > 0
    ? `Esta receta tiene: <strong>${advertencias.join(', ')}</strong>.<br>Esos registros quedarán con receta desconocida ("?"). ¿Eliminar igual?`
    : '';
  
  confirmar({ titulo:'Eliminar receta', mensaje:msg, labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{ recetas=recetas.filter(r=>r.id!==id);renderRecetas();saveData();toast('Receta eliminada'); }
  });
}
function verReceta(id){
  const r=rec(id);if(!r)return;
  const c=calcCosto(r);const cU=r.rinde>0?c/r.rinde:0;const can=canProduce(r);
  $('ver-rec-title').textContent=r.nombre;
  $('ver-rec-body').innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      <span class="badge badge-${can?'ok':'danger'}">${can?'Stock disponible':'Falta stock'}</span>
      <span class="badge" style="background:var(--cream2);color:var(--text2);border:1px solid var(--border)">${r.cat}</span>
      <span class="badge" style="background:var(--cream2);color:var(--text2);border:1px solid var(--border)">Rinde ${r.rinde} unid.</span>
      <span class="badge" style="background:var(--cream2);color:var(--text2);border:1px solid var(--border)">${r.tiempo} min</span>
    </div>
    ${r.desc?`<p style="font-size:.84rem;color:var(--text2);padding:10px 14px;background:var(--cream);border-radius:var(--r);margin-bottom:14px">${r.desc}</p>`:''}
    <div style="font-size:.77rem;font-weight:500;color:var(--text2);margin-bottom:8px">Ingredientes por tanda</div>
    ${r.ings.sort((a,b)=>{const iA=ing(a.ingId);const iB=ing(b.ingId);return iA?.nombre?.localeCompare(iB?.nombre)||0;}).map(ri=>{const i=ing(ri.ingId);if(!i)return'';const ok=i.stock>=ri.qty;
    return`<div class="prod-check ${ok?'ok':'nok'}" style="margin-bottom:5px"><span class="pc-label">${i.nombre}</span><span class="pc-status">${fmtN(ri.qty,3)} ${i.unidad} · hay ${formatCantidad(i.stock, i.unidad)}</span></div>`;}).join('')}
    <div class="price-box" style="margin-top:14px">
      <div class="price-box-title">Costos y precios sugeridos</div>
      <div class="price-row"><span>Costo total ingredientes</span><span style="font-weight:500">${fmt(c)}</span></div>
      <div class="price-row"><span>Costo por unidad</span><span>${fmt(cU)}</span></div>
      <div class="price-row" style="color:var(--text2)"><span>Precio sugerido × 2 (margen 50%)</span><span>${fmt(cU*2)}</span></div>
      <div class="price-row" style="color:var(--text2)"><span>Precio sugerido × 2.5 (margen 60%)</span><span>${fmt(cU*2.5)}</span></div>
      <div class="price-row" style="color:var(--text2)"><span>Precio sugerido × 3 (margen 67%)</span><span>${fmt(cU*3)}</span></div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-secondary btn-sm" data-id="${r.id}" onclick="closeModal('modal-ver-rec');editRec(+this.dataset.id)">Editar receta</button>
    </div>`;
  openModal('modal-ver-rec');
}

