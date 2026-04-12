// ══════════════ PROVEEDORES ══════════════
let proveedoresFiltrados = [];

function renderProveedores(){
  const tb=$('tbl-prov').querySelector('tbody');
  
  // Aplicar filtros
  const searchTerm = ($('prov-search')?.value||'').toLowerCase();
  const filterType = $('prov-filter')?.value || '';
  
  proveedoresFiltrados = proveedores.filter(p => {
    const matchSearch = !searchTerm || 
      p.nombre.toLowerCase().includes(searchTerm) ||
      (p.contacto && p.contacto.toLowerCase().includes(searchTerm)) ||
      (p.productos && p.productos.toLowerCase().includes(searchTerm));
    
    if (!matchSearch) return false;
    
    // Calcular stats para filtros
    const comprasProv = (historialCompras||[]).filter(c=>c.provId==p.id);
    const tieneCompras = comprasProv.length > 0;
    
    switch(filterType) {
      case 'principal':
        // Calcular proveedor principal
        const gastoPorProv = {};
        (historialCompras||[]).forEach(c=>{
          if(c.provId) { const pid=parseInt(c.provId)||c.provId; gastoPorProv[pid]=(gastoPorProv[pid]||0)+c.qty*c.precio; }
        });
        const maxGasto = Math.max(0,...Object.values(gastoPorProv));
        const provPrincipalId = maxGasto>0?parseInt(Object.entries(gastoPorProv).sort((a,b)=>b[1]-a[1])[0][0]):null;
        return p.id === provPrincipalId;
      case 'con-compras':
        return tieneCompras;
      case 'sin-compras':
        return !tieneCompras;
      default:
        return true;
    }
  });
  
  if(proveedoresFiltrados.length===0){
    tb.innerHTML='<tr><td colspan="8" class="empty">No se encontraron proveedores</td></tr>';
    updateResumenProveedores();
    return;
  }

  // Calcular stats de compras por proveedor para el badge "Principal"
  const gastoPorProv={};
  (historialCompras||[]).forEach(c=>{
    if(c.provId) { const pid=parseInt(c.provId)||c.provId; gastoPorProv[pid]=(gastoPorProv[pid]||0)+c.qty*c.precio; }
  });
  const maxGasto=Math.max(0,...Object.values(gastoPorProv));
  const provPrincipalId=maxGasto>0?parseInt(Object.entries(gastoPorProv).sort((a,b)=>b[1]-a[1])[0][0]):null;

  tb.innerHTML=proveedoresFiltrados.map(p=>{
    const comprasProv=(historialCompras||[]).filter(c=>c.provId==p.id);
    const totalGastado=comprasProv.reduce((a,c)=>a+c.qty*c.precio,0);
    const ultimaCompra=comprasProv.length>0?[...comprasProv].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha))[0].fecha:null;
    const esPrincipal=provPrincipalId===p.id && comprasProv.length>0;
    const badgePrincipal=esPrincipal?'<span class="badge badge-caramel" style="font-size:.6rem;margin-left:5px;vertical-align:middle">★ Principal</span>':'';
    
    // Contacto combinado
    const contactoHtml = p.tel 
      ? `<a href="https://wa.me/${p.tel.replace(/\D/g,'')}" target="_blank" style="color:var(--caramel);text-decoration:none" title="Abrir WhatsApp">📱 ${p.tel}</a>`
      : (p.contacto ? `<span style="color:var(--text2)">${p.contacto}</span>` : '<span style="color:var(--text3)">—</span>');
    
    // Contar ingredientes diferentes comprados a este proveedor
    const ingredientesComprados = new Set(comprasProv.filter(c=>c.ingId).map(c=>c.ingId));
    
    // Estado visual basado en actividad
    const rowStyle = comprasProv.length === 0 ? 'opacity:0.6' : '';
    const actividadBadge = comprasProv.length === 0 
      ? '<span class="badge badge-warn" style="font-size:.6rem">Inactivo</span>'
      : '<span class="badge badge-ok" style="font-size:.6rem">Activo</span>';
    
    return`<tr style="${rowStyle}">
      <td style="font-weight:500">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="cursor:pointer;color:var(--caramel)" onclick="verProv(${p.id})">${p.nombre}</span>
          ${badgePrincipal}
          ${actividadBadge}
        </div>
      </td>
      <td style="font-size:.78rem">${contactoHtml}</td>
      <td style="font-size:.78rem;color:var(--text2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.productos||''}">${p.productos||'—'}</td>
      <td><span class="badge badge-${ingredientesComprados.size>0?'ok':'warn'}" title="Ingredientes comprados">${ingredientesComprados.size}</span></td>
      <td style="text-align:center;font-weight:500;color:var(--text2)">${comprasProv.length||'0'}</td>
      <td style="font-weight:500;color:${totalGastado>0?'var(--caramel)':'var(--text3)'}">${totalGastado>0?fmt(totalGastado):'—'}</td>
      <td style="font-size:.78rem;color:var(--text3)">${ultimaCompra||'—'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editProv(${p.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delProv(${p.id})" title="Eliminar">✕</button>
      </td></tr>`;
  }).join('');
  
  updateResumenProveedores();
}

function updateResumenProveedores() {
  // Actualizar tarjetas de resumen
  const totalCount = $('prov-total-count');
  const principalName = $('prov-principal-name');
  const mesTotal = $('prov-mes-total');
  
  if (totalCount) totalCount.textContent = proveedores.length;
  
  // Calcular proveedor principal
  const gastoPorProv = {};
  (historialCompras||[]).forEach(c => {
    if(c.provId) gastoPorProv[c.provId] = (gastoPorProv[c.provId]||0) + c.qty*c.precio;
  });
  const maxGasto = Math.max(0,...Object.values(gastoPorProv));
  const provPrincipalId = maxGasto>0 ? parseInt(Object.entries(gastoPorProv).sort((a,b)=>b[1]-a[1])[0][0]) : null;
  const provPrincipal = provPrincipalId ? prv(provPrincipalId) : null;
  
  if (principalName) {
    principalName.textContent = provPrincipal ? provPrincipal.nombre : '—';
  }
  
  // Calcular total del mes actual
  const _hoy = getStartOfDay();
  const mesCompras = (historialCompras||[]).filter(c => {
    if(!c.fecha) return false;
    const [y,m,d] = c.fecha.split('-').map(Number);
    return y === _hoy.getFullYear() && m === _hoy.getMonth()+1;
  });
  const totalMes = mesCompras.reduce((a,c) => a + c.qty*c.precio, 0);
  
  if (mesTotal) mesTotal.textContent = fmt(totalMes);
}

function filtrarProveedores() {
  renderProveedores();
}
let editProvId=null;
function abrirModalProv(){
  editProvId=null;$('prov-title').textContent='Agregar proveedor';
  ['prov-nombre','prov-contacto','prov-tel','prov-email','prov-prods','prov-dir','prov-notas'].forEach(id=>$(id).value='');
  openModal('modal-prov');
}
function editProv(id){
  const p=prv(id);if(!p)return;editProvId=id;$('prov-title').textContent='Editar proveedor';
  $('prov-nombre').value=p.nombre;$('prov-contacto').value=p.contacto||'';
  $('prov-tel').value=p.tel||'';$('prov-email').value=p.email||'';
  $('prov-prods').value=p.productos||'';$('prov-dir').value=p.dir||'';$('prov-notas').value=p.notas||'';
  openModal('modal-prov');
}
function guardarProv(){
  const nombre=$('prov-nombre').value.trim();if(!nombre){toast('Ingresá el nombre');return;}
  const data={id:editProvId||nextId.prov++,nombre,contacto:$('prov-contacto').value,tel:$('prov-tel').value,email:$('prov-email').value,productos:$('prov-prods').value,dir:$('prov-dir').value,notas:$('prov-notas').value};
  if(editProvId){proveedores=proveedores.map(p=>p.id===editProvId?data:p);}else proveedores.push(data);
  editProvId=null;closeModal('modal-prov');renderProveedores();refreshProvSelects();saveData();toast('Proveedor guardado ✓');
}
function _doEliminarProv(id){
  proveedores=proveedores.filter(p=>p.id!==id);
  ingredientes.forEach(i=>{if(i.provId===id)i.provId=null;});
  renderProveedores();refreshProvSelects();saveData();toast('Proveedor eliminado');
}
function delProv(id){
  const comprasProv = (historialCompras||[]).filter(c=>c.provId===id);
  const msg = comprasProv.length > 0
    ? `Este proveedor tiene <strong>${comprasProv.length} compra(s)</strong> registrada(s). Se desvinculará de esas compras pero el historial no se eliminará.`
    : '';
  confirmar({ titulo:'Eliminar proveedor', mensaje:msg, labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
      // Desvincular compras (poner provId en null)
      (historialCompras||[]).forEach(c=>{ if(c.provId===id) c.provId=null; });
      _doEliminarProv(id);
    }
  });
}
function verProv(id){
  const p=prv(id);if(!p)return;
  
  // Obtener historial de compras con este proveedor
  const comprasProv = (historialCompras||[]).filter(c => c.provId == id);
  const totalComprado = comprasProv.reduce((a,c) => a + c.qty*c.precio, 0);
  
  // Ordenar compras por fecha (más recientes primero)
  const comprasOrdenadas = [...comprasProv].sort((a,b) => createDate(b.fecha) - createDate(a.fecha));
  
  // Ingredientes asignados (para referencia)
  const ingsAsignados = ingredientes.filter(i=>i.provId===id);
  
  // Calcular estadísticas adicionales
  const ingredientesComprados = new Set(comprasProv.filter(c=>c.ingId).map(c=>c.ingId));
  const promedioCompra = comprasProv.length > 0 ? totalComprado / comprasProv.length : 0;
  const _hace30 = new Date(getStartOfDay().getTime() - 30*864e5);
  const comprasUltimos30Dias = comprasProv.filter(c => createDate(c.fecha) >= _hace30);
  
  $('ver-prov-title').textContent=p.nombre;
  $('ver-prov-body').innerHTML=`
    <!-- Tarjeta de información principal -->
    <div style="background:linear-gradient(135deg,var(--caramel),#8B6B47);color:white;border-radius:var(--r);padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <h3 style="margin:0 0 8px 0;font-size:1.3rem">${p.nombre}</h3>
          <div style="font-size:.85rem;opacity:0.9">
            ${p.contacto ? `<div>📧 ${p.contacto}</div>` : ''}
            ${p.tel ? `<div>📱 ${p.tel}</div>` : ''}
            ${p.email ? `<div>📨 ${p.email}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.75rem;opacity:0.8">Estado</div>
          <div style="font-size:1rem;font-weight:600">${comprasProv.length > 0 ? '🟢 Activo' : '🟡 Inactivo'}</div>
        </div>
      </div>
    </div>
    
    <!-- Tarjetas de estadísticas -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="background:var(--ok-bg);border:1px solid var(--ok);text-align:center;padding:12px">
        <div style="font-size:.75rem;color:var(--ok);font-weight:600;margin-bottom:4px">📋 Compras</div>
        <div style="font-size:1.4rem;font-weight:700;color:var(--ok)">${comprasProv.length}</div>
        <div style="font-size:.7rem;color:var(--text3)">${comprasUltimos30Dias.length} últimos 30 días</div>
      </div>
      <div class="card" style="background:var(--cream2);border:1px solid var(--border);text-align:center;padding:12px">
        <div style="font-size:.75rem;color:var(--caramel);font-weight:600;margin-bottom:4px">💰 Total invertido</div>
        <div style="font-size:1.4rem;font-weight:700;color:var(--caramel)">${fmt(totalComprado)}</div>
        <div style="font-size:.7rem;color:var(--text3)">Promedio: ${fmt(promedioCompra)}</div>
      </div>
      <div class="card" style="background:var(--cream);border:1px solid var(--border);text-align:center;padding:12px">
        <div style="font-size:.75rem;color:var(--text2);font-weight:600;margin-bottom:4px">📦 Ingredientes</div>
        <div style="font-size:1.4rem;font-weight:700;color:var(--text2)">${ingredientesComprados.size}</div>
        <div style="font-size:.7rem;color:var(--text3)">Diferentes comprados</div>
      </div>
    </div>
    
    ${p.productos ? `
    <div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--r);padding:12px;margin-bottom:16px">
      <div style="font-size:.75rem;font-weight:600;color:var(--text2);margin-bottom:6px">🏭 Productos que suministra</div>
      <div style="font-size:.85rem;color:var(--text1)">${p.productos}</div>
    </div>` : ''}
    
    ${p.notas ? `
    <div style="background:var(--warn-bg);border:1px solid var(--warn);border-radius:var(--r);padding:12px;margin-bottom:16px">
      <div style="font-size:.75rem;font-weight:600;color:var(--warn);margin-bottom:6px">📝 Notas</div>
      <div style="font-size:.85rem;color:var(--text1)">${p.notas}</div>
    </div>` : ''}
    
    <!-- Historial de compras -->
    ${comprasProv.length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:.85rem;font-weight:600;color:var(--text2);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>🧾 Historial de compras (${comprasProv.length})</span>
        <button class="btn btn-secondary btn-sm" onclick="exportarComprasProveedor(${id})">📥 Exportar</button>
      </div>
      <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r)">
        <table style="width:100%;font-size:.78rem">
          <thead style="background:var(--cream);position:sticky;top:0;z-index:1">
            <tr style="border-bottom:2px solid var(--border)">
              <th style="padding:8px;text-align:left">Fecha</th>
              <th style="padding:8px;text-align:left">Ingrediente</th>
              <th style="padding:8px;text-align:center">Cantidad</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${comprasOrdenadas.map(c => {
              const i = ing(c.ingId);
              return `
                <tr style="border-bottom:1px solid var(--border2)">
                  <td style="padding:6px">${c.fecha}</td>
                  <td style="padding:6px;font-weight:500">${i ? i.nombre : '?'}</td>
                  <td style="padding:6px;text-align:center">${fmtN(c.qty,3)} ${i ? i.unidad : ''}</td>
                  <td style="padding:6px;text-align:right;font-weight:500;color:var(--caramel)">${fmt(c.qty * c.precio)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : '<div style="margin-bottom:16px"><p class="empty">📋 Sin compras registradas con este proveedor.</p></div>'}
    
    <!-- Ingredientes asignados -->
    ${ingsAsignados.length>0?`<div style="margin-bottom:16px">
      <div style="font-size:.85rem;font-weight:500;color:var(--text2);margin-bottom:8px">📦 Ingredientes asignados (${ingsAsignados.length})</div>
      <div style="display:grid;gap:6px">
        ${ingsAsignados.map(i=>`<div class="prod-check ok" style="margin-bottom:5px"><span class="pc-label">${i.nombre}</span><span class="pc-status">${fmtN(i.stock,3)} ${i.unidad}</span></div>`).join('')}
      </div>
    </div>`:'<div style="margin-bottom:16px"><p class="empty">📦 Sin ingredientes asignados.</p></div>'}
    
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button class="btn btn-secondary btn-sm" onclick="closeModal('modal-ver-prov')">Cerrar</button>
      <button class="btn btn-primary btn-sm" onclick="closeModal('modal-ver-prov');editProv(${p.id})">✏️ Editar</button>
    </div>`;
  openModal('modal-ver-prov');
}

function exportarComprasProveedor(provId) {
  const p = prv(provId);
  if (!p) return;
  
  const comprasProv = (historialCompras||[]).filter(c => c.provId == provId);
  const sorted = [...comprasProv].sort((a,b) => createDate(b.fecha) - createDate(a.fecha));
  
  let csv = 'Fecha,Ingrediente,Cantidad,Unidad,Precio Unitario,Total\n';
  sorted.forEach(c => {
    const i = ing(c.ingId);
    csv += `"${c.fecha}","${i ? i.nombre : '?'}","${fmtN(c.qty,3)}","${i ? i.unidad : ''}","${fmt(c.precio)}","${fmt(c.qty * c.precio)}"\n`;
  });
  
  const blob = new Blob(['\\uFEFF' + csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compras_${p.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast(`📥 Compras de ${p.nombre} exportadas`);
}

