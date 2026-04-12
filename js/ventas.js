// ══════════════ VENTAS ══════════════
function calcVenta(){
  const unidades = parseFloat($('venta-unidades').value) || 0;
  const precio = parseFloat($('venta-precio').value) || 0;
  const propina = parseFloat($('venta-propina').value) || 0;
  const subtotal = unidades * precio;
  const total = subtotal + propina;
  
  // Actualizar campos de total
  const subtotalEl = $('venta-subtotal');
  const totalEl = $('venta-total');
  const propinaDisplayEl = $('venta-propina-display');
  
  if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
  if (totalEl) totalEl.textContent = fmt(total);
  if (propinaDisplayEl) propinaDisplayEl.textContent = fmt(propina);
  
  // Actualizar información adicional
  const infoEl = $('venta-info');
  if (infoEl) {
    if (unidades > 0 && precio > 0) {
      infoEl.innerHTML = `
        <div style="font-size:.78rem;color:var(--text3)">
          ${unidades} unidad${unidades !== 1 ? 'es' : ''} × ${fmt(precio)} c/u = ${fmt(subtotal)}
          ${propina > 0 ? ` + propina ${fmt(propina)}` : ''}
        </div>
      `;
    } else {
      infoEl.innerHTML = '';
    }
  }
}

function renderVentasDia(){
  // Función para renderizar estadísticas de ventas del día
  const hoy = today();
  const ventasHoy = ventas.filter(v => v.fecha === hoy);
  const totalHoy = ventasHoy.reduce((a, v) => {
    const subtotal = (v.unidades || 0) * (v.precio || 0);
    const total = subtotal + (v.propina || 0);
    return a + total;
  }, 0);
  const unidadesHoy = ventasHoy.reduce((a, v) => a + (v.unidades || 0), 0);
  
  const diaEl = $('ventas-dia');
  if (diaEl) {
    diaEl.innerHTML = `
      <div class="stats-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div class="stat-item" style="text-align:center;padding:12px;background:var(--cream);border-radius:6px">
          <div class="stat-value" style="font-size:1.2rem;font-weight:600;color:var(--text1)">${ventasHoy.length}</div>
          <div class="stat-label" style="font-size:.78rem;color:var(--text3)">Ventas hoy</div>
        </div>
        <div class="stat-item" style="text-align:center;padding:12px;background:var(--cream);border-radius:6px">
          <div class="stat-value" style="font-size:1.2rem;font-weight:600;color:var(--caramel)">${fmt(totalHoy)}</div>
          <div class="stat-label" style="font-size:.78rem;color:var(--text3)">Total hoy</div>
        </div>
        <div class="stat-item" style="text-align:center;padding:12px;background:var(--cream);border-radius:6px">
          <div class="stat-value" style="font-size:1.2rem;font-weight:600;color:var(--text1)">${unidadesHoy}</div>
          <div class="stat-label" style="font-size:.78rem;color:var(--text3)">Unidades hoy</div>
        </div>
      </div>
    `;
  }
}

function renderVentas(){
  const opciones=recetas.map(r=>{
    const sp=stockProd(r.id);
    const stock=sp?sp.stock:0;
    return [r.id, `${r.nombre} - Stock: ${stock} unidades`];
  }).filter(([_,label])=>!label.includes('Stock: 0'));
  fillSelect('venta-prod',opciones,'— Seleccionar —');
  // Solo resetear fecha si NO hay una edición en curso
  if(!$('venta-edit-id').value) $('venta-fecha').value=today();
  renderVentasTable();renderVentasDia();
}
function refreshVentaSelector(){
  // Función para actualizar solo el selector de productos
  const opciones=recetas.map(r=>{
    const sp=stockProd(r.id);
    const stock=sp?sp.stock:0;
    return [r.id, `${r.nombre} - Stock: ${stock} unidades`];
  }).filter(([_,label])=>!label.includes('Stock: 0'));
  fillSelect('venta-prod',opciones,'— Seleccionar —');
}
function recalcStockProducto(recetaId){
  // Recalcula el stock de producto terminado desde cero: producido - vendido
  const totalProducido = producciones
    .filter(p => p.recetaId === recetaId)
    .reduce((a, p) => {
      const r = rec(p.recetaId);
      return a + (p.unidadesReales || (r ? r.rinde * p.tandas : 0));
    }, 0);
  const totalVendido = ventas
    .filter(v => v.recetaId === recetaId)
    .reduce((a, v) => a + v.unidades, 0);
  // Descontar pedidos con stock reservado: 'listo' y 'entregado_sin_cobrar'
  // - 'listo': producto reservado, no entregado aún
  // - 'entregado_sin_cobrar': producto ya salió físicamente pero aún no hay venta registrada
  // - 'entregado': ya está en ventas, no se cuenta aquí para evitar doble descuento
  const totalPedidosListo = (pedidos||[])
    .filter(p => p.estado === 'listo' || p.estado === 'entregado_sin_cobrar')
    .reduce((a, p) => {
      return a + p.items.filter(it => it.recetaId === recetaId).reduce((b, it) => b + it.cantidad, 0);
    }, 0);
  let sp = stockProd(recetaId);
  if (!sp) { sp = {recetaId, stock: 0, total: 0}; stockProductos.push(sp); }
  sp.total = Math.max(0, totalProducido);
  sp.stock = Math.max(0, totalProducido - totalVendido - totalPedidosListo);
}

function refreshAllStockViews(){
  // Función para actualizar todas las vistas que dependen del stock
  renderProdDisp();
  refreshVentaSelector();
  renderDashboard();
  if(curSection==='estadisticas'){goto('finanzas');showFinanzasTab('estadisticas');}
}
const _canalLabels = {directo:'Directo',encargo:'Encargo',tienda:'Tienda',delivery:'Delivery',evento:'Evento',otro:'Otro'};
const _canalColors = {directo:'var(--caramel)',encargo:'var(--sage)',tienda:'var(--brown)',delivery:'#5B7FA6',evento:'#9B6BB5',otro:'var(--text3)'};

function renderVentasTable(){
  const tb = $('tbl-ventas').querySelector('tbody');
  if(!ventas || ventas.length===0){
    tb.innerHTML='<tr><td colspan="11" class="empty">Sin ventas registradas</td></tr>';
    $('pag-ventas').innerHTML=''; return;
  }
  const canalF = $('ventas-canal-f') ? $('ventas-canal-f').value : '';
  let lista = canalF ? ventas.filter(v=>(v.canal||'')===canalF) : [...ventas];
  const totalIng      = lista.reduce((a,v)=>a+v.unidades*v.precio,0);
  const totalPropinas = lista.reduce((a,v)=>a+(v.propina||0),0);
  const gananciaTotal = lista.reduce((a,v)=>{const r=rec(v.recetaId);return a+(r?v.unidades*v.precio+(v.propina||0)-calcCosto(r,v.unidades/(r.rinde||1)):0);},0);
  const totalAnticiposPend=(pedidos||[]).filter(p=>p.estado!=='entregado').reduce((a,p)=>a+p.anticipo,0);
  $('ventas-stats').textContent=`${lista.length} ventas · ${fmt(totalIng)} · Propinas: ${fmt(totalPropinas)} · Ganancia: ${fmt(gananciaTotal)}${totalAnticiposPend>0?' · Anticipos: '+fmt(totalAnticiposPend):''}`;
  const sorted=[...lista].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha)||b.id-a.id);
  const p=_pag.ventas;
  const inicio=(p.page-1)*p.size;
  const pagina=sorted.slice(inicio,inicio+p.size);
  tb.innerHTML=pagina.map(v=>{
    const r=rec(v.recetaId);
    const tot=v.unidades*v.precio;
    const costo=r?calcCosto(r,v.unidades/(r.rinde||1)):0;
    const gan=tot-costo;
    const margen=tot>0?Math.round(gan/tot*100):0;
    const canal=v.canal||'';
    const canalBadge=canal?`<span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:.68rem;font-weight:500;background:${_canalColors[canal]}22;color:${_canalColors[canal]};border:1px solid ${_canalColors[canal]}44">${_canalLabels[canal]||canal}</span>`:'<span style="color:var(--text3);font-size:.75rem">—</span>';
    const margenBar=`<div style="display:flex;align-items:center;gap:5px"><div style="width:36px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,margen))}%;background:var(--${gan>=0?'sage':'rose'});border-radius:3px"></div></div><span style="font-size:.75rem;color:var(--${gan>=0?'ok':'danger'})">${margen}%</span></div>`;
    const propina = v.propina||0;
    const propinaTd = propina>0 ? `<span style="color:var(--sage);font-weight:500">${fmt(propina)}</span>` : `<span style="color:var(--text3);font-size:.75rem">—</span>`;
    return`<tr><td>${v.fecha}</td><td style="font-weight:500">${r?r.nombre:'?'}</td><td>${v.unidades}</td><td>${fmt(v.precio)}</td><td style="font-weight:500">${fmt(tot)}</td><td>${propinaTd}</td><td style="font-size:.79rem;color:var(--text3)">${fmt(costo)}</td><td style="color:var(--${gan>=0?'ok':'danger'});font-weight:500">${fmt(gan)}</td><td>${margenBar}</td><td>${canalBadge}</td><td style="font-size:.79rem;color:var(--text3);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.nota||''}">${v.nota||'—'}</td><td class="td-actions"><button class="btn btn-secondary btn-sm btn-icon" data-id="${v.id}" onclick="editVenta(+this.dataset.id)" title="Editar">✎</button><button class="btn btn-danger btn-sm btn-icon" data-id="${v.id}" onclick="delVenta(+this.dataset.id)" title="Eliminar">✕</button></td></tr>`;
  }).join('');
  renderPaginator('ventas',sorted.length);
}
function editVenta(id){
  const v=ventas.find(x=>x.id==id);if(!v)return;
  const opciones=recetas.map(r=>{const sp=stockProd(r.id);const stock=sp?sp.stock:0;return[r.id,`${r.nombre} - Stock: ${stock} unidades`];});
  fillSelect('venta-prod',opciones,'— Seleccionar —');
  $('venta-edit-id').value=id;
  $('venta-prod').value=v.recetaId;
  $('venta-unidades').value=v.unidades;
  $('venta-precio').value=v.precio;
  if($('venta-propina')) $('venta-propina').value=v.propina||0;
  $('venta-fecha').value=v.fecha;
  $('venta-canal').value=v.canal||'';
  $('venta-nota').value=v.nota||'';
  $('venta-form-title').textContent='Editar venta';
  $('venta-btn-guardar').textContent='✓ Guardar cambios';
  $('btn-cancelar-venta').style.display='inline-flex';
  calcVenta();
  document.querySelector('#s-ventas .card').scrollIntoView({behavior:'smooth'});
  toast('Editando venta — modificá los datos y guardá.');
}
function cancelarEdicionVenta(){
  $('venta-edit-id').value='';
  $('venta-prod').value='';$('venta-unidades').value=1;
  $('venta-precio').value='';if($('venta-propina'))$('venta-propina').value='';$('venta-nota').value='';$('venta-canal').value='';
  $('venta-form-title').textContent='Registrar venta';
  $('venta-btn-guardar').textContent='✓ Registrar venta';
  $('btn-cancelar-venta').style.display='none';
  calcVenta();renderVentas();
}
function registrarVenta(){
  const editId=parseInt($('venta-edit-id').value)||null;
  const recetaId=parseInt($('venta-prod').value);
  const unidades=parseInt($('venta-unidades').value)||1;
  const precio=parseFloat($('venta-precio').value)||0;
  const propina=parseFloat($('venta-propina')?.value)||0;
  const canal=$('venta-canal').value;
  const nota=$('venta-nota').value.trim();
  const fecha=$('venta-fecha').value||today();
  if(!recetaId||unidades<=0||precio<=0){toast('Completá todos los campos');return;}
  if(editId){
    const original=ventas.find(v=>v.id==editId);if(!original){toast('Venta no encontrada');return;}
    const recetaOriginalId=original.recetaId;
    const spOriginal=stockProd(recetaOriginalId);
    const sp=stockProd(recetaId);
    if(recetaId !== recetaOriginalId){
      // Receta cambió: restaurar stock original y descontar del nuevo
      if(spOriginal) spOriginal.stock=Math.max(0,spOriginal.stock+original.unidades);
      const stockDisp=sp?sp.stock:0;
      if(unidades>stockDisp){toast(`Stock insuficiente para la nueva receta. Solo hay ${stockDisp} unidades disponibles`);return;}
      if(sp) sp.stock=Math.max(0,sp.stock-unidades);
    } else {
      const diffUnidades=unidades-original.unidades;
      if(diffUnidades>0){const stockDisp=sp?sp.stock:0;if(diffUnidades>stockDisp){toast(`Stock insuficiente. Solo hay ${stockDisp} unidades disponibles`);return;}}
      if(sp)sp.stock=Math.max(0,sp.stock-diffUnidades);
    }
    Object.assign(original,{fecha,recetaId,unidades,precio,propina,canal,nota});
    $('venta-edit-id').value='';
    $('venta-form-title').textContent='Registrar venta';
    $('venta-btn-guardar').textContent='✓ Registrar venta';
    $('btn-cancelar-venta').style.display='none';
    $('venta-prod').value='';$('venta-unidades').value=1;$('venta-precio').value='';$('venta-nota').value='';$('venta-canal').value='';
    calcVenta();renderVentas();refreshAllStockViews();renderFinanzas();saveData();
    toast(`Venta editada ✓${diffUnidades!==0?' · Stock ajustado '+(-diffUnidades>0?'+':'')+(-diffUnidades):''}`)
  }else{
    const sp=stockProd(recetaId);
    const stockDisponible=sp?sp.stock:0;
    if(unidades>stockDisponible){toast(`Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles`);return;}
    if(!ventas)ventas=[];
    ventas.push({id:nextId.venta++,fecha,recetaId,unidades,precio,propina,canal,nota});
    if(sp)sp.stock-=unidades;
    $('venta-prod').value='';$('venta-unidades').value=1;$('venta-precio').value='';$('venta-nota').value='';$('venta-canal').value='';
    calcVenta();renderVentas();refreshAllStockViews();renderFinanzas();saveData();toast('Venta registrada ✓');
  }
}
function _doEliminarVenta(id){
  if(!ventas)ventas=[];
  const venta=ventas.find(v=>v.id==id);
  if(venta){const sp=stockProd(venta.recetaId);if(sp)sp.stock+=venta.unidades;}
  ventas=ventas.filter(v=>v.id!=id);renderVentas();refreshAllStockViews();renderFinanzas();saveData();toast('Venta eliminada');
}
function delVenta(id){
  confirmar({ titulo:'Eliminar venta', mensaje:'Se restaurará el stock del producto.', labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{ _doEliminarVenta(id); }
  });
}

