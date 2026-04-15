// ══════════════ PEDIDOS — FORMULARIO, LISTA Y TABLA ══════════════
// Vista calendario: pedidos-calendario.js
let pedidoActual = [];
let _pedidosVista = 'lista'; // 'lista' | 'calendario'
let _calMes = null;          // { year, month } — null = mes actual

function setPedidosVista(v){
  _pedidosVista = v;
  $('pedidos-vista-lista').style.display = v === 'lista' ? '' : 'none';
  $('pedidos-vista-cal').style.display  = v === 'calendario' ? '' : 'none';
  $('btn-vista-lista').style.cssText = v==='lista'
    ? 'background:var(--caramel);color:#fff;border-color:var(--caramel)' : '';
  $('btn-vista-cal').style.cssText = v==='calendario'
    ? 'background:var(--caramel);color:#fff;border-color:var(--caramel)' : '';
  if(v === 'calendario') renderCalendarioPedidos();
  else renderPedidosActivos();
}

function renderPedidos(){
  fillSelect('pedido-prod', recetas.map(r=>[r.id,r.nombre]), '— Seleccionar —');
  $('pedido-fecha').value = today();
  _renderAlerta48h();
  renderPedidosActivos();
  renderPedidosTable();
}

// ── Alerta pedidos que vencen en 48h ──
function _renderAlerta48h(){
  const el = $('pedidos-alerta-48h'); if(!el) return;
  const ahora = getStartOfDay();
  const limite = new Date(ahora.getTime() + 2*24*60*60*1000);
  const urgentes = (pedidos||[]).filter(p => {
    if(p.estado === 'entregado') return false;
    if(!p.fechaEntrega) return false;
    const fe = createLocalDate(p.fechaEntrega);
    return fe >= ahora && fe <= limite;
  }).sort((a,b) => createLocalDate(a.fechaEntrega) - createLocalDate(b.fechaEntrega));

  if(urgentes.length === 0){ el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `<div style="background:var(--danger-bg);border:1px solid #E8BFBE;border-radius:var(--r);padding:12px 16px;display:flex;align-items:flex-start;gap:12px">
    <span style="font-size:1.3rem;flex-shrink:0">⚠</span>
    <div style="flex:1">
      <div style="font-weight:600;color:var(--danger);font-size:.88rem;margin-bottom:6px">
        ${urgentes.length} pedido${urgentes.length>1?'s':''} vence${urgentes.length>1?'n':''} en las próximas 48 horas
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px">
        ${urgentes.map(p => {
          const fe = createDate(p.fechaEntrega);
          const diff = Math.ceil((fe - ahora)/(1000*60*60*24));
          const diffTxt = diff === 0 ? '¡Hoy!' : diff === 1 ? 'Mañana' : `En ${diff} días`;
          const total = (p.items||[]).reduce((a,it)=>a+it.cantidad*it.precio,0);
          return `<div style="background:var(--white);border:1px solid #E8BFBE;border-radius:7px;padding:7px 11px;font-size:.8rem">
            <span style="font-weight:600">${p.cliente}</span>
            <span style="color:var(--danger);font-weight:500;margin-left:6px">${diffTxt}</span>
            <span style="color:var(--text3);margin-left:6px">${fmt(total)}</span>
            <span style="margin-left:6px;font-size:.73rem;color:var(--text3)">${(p.items||[]).map(it=>rec(it.recetaId)?.nombre||'?').join(', ')}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// ── Lista de pedidos activos ──
function renderPedidosActivos(){
  if(_pedidosVista === 'calendario'){ renderCalendarioPedidos(); return; }
  const q = ($('pedidos-q').value||'').toLowerCase();
  const filtro = $('pedidos-filtro').value;
  const activos = (pedidos||[]).filter(p => p.estado !== 'entregado');
  const filtrados = activos.filter(p => {
    if(q && !(p.cliente||'').toLowerCase().includes(q)) return false;
    if(filtro && p.estado !== filtro) return false;
    return true;
  }).sort((a,b) => {
    const da = a.fechaEntrega ? createDate(a.fechaEntrega) : createDate('9999');
    const db = b.fechaEntrega ? createDate(b.fechaEntrega) : createDate('9999');
    return da - db;
  });

  const lista = $('pedidos-list');
  if(filtrados.length === 0){
    lista.innerHTML = `<p class="empty" style="padding:20px">${q ? 'Sin resultados para "'+q+'"' : 'No hay pedidos activos.'}</p>`;
    return;
  }
  const ahora = getStartOfDay();
  const estadoColors = {pendiente:'warn',listo:'ok',entregado_sin_cobrar:'caramel',entregado:'text3'};
  const estadoLabels = {pendiente:'Pendiente',listo:'Listo para entregar',entregado_sin_cobrar:'Entregado — Cobro pendiente',entregado:'Cobrado ✓'};

  lista.innerHTML = filtrados.map(p => {
    const total = (p.items||[]).reduce((a,it)=>a+it.cantidad*it.precio,0);
    const saldo = total - (p.anticipo||0);
    const fe = p.fechaEntrega ? createDate(p.fechaEntrega) : null;
    const diasEntrega = fe ? Math.ceil((fe - ahora)/(1000*60*60*24)) : null;
    const esUrgente = diasEntrega !== null && diasEntrega <= 1;
    const borderColor = esUrgente ? '#E8BFBE' : p.estado==='listo' ? '#BCCFBC' : 'var(--border)';
    const bgColor = esUrgente ? 'var(--danger-bg)' : p.estado==='listo' ? 'var(--ok-bg)' : 'var(--cream)';

    let diffTxt = '—';
    if(diasEntrega !== null){
      if(diasEntrega < 0) diffTxt = `<span style="color:var(--danger);font-weight:600">Vencido (${Math.abs(diasEntrega)}d)</span>`;
      else if(diasEntrega === 0) diffTxt = `<span style="color:var(--danger);font-weight:600">¡Hoy!</span>`;
      else if(diasEntrega === 1) diffTxt = `<span style="color:var(--warn);font-weight:600">Mañana</span>`;
      else diffTxt = `En ${diasEntrega} día${diasEntrega>1?'s':''}`;
    }

    return `<div style="border:1px solid ${borderColor};border-radius:var(--r);padding:12px;margin-bottom:8px;background:${bgColor}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:7px">
        <div>
          <div style="font-weight:600;font-size:.95rem">${p.cliente}</div>
          <div style="font-size:.75rem;color:var(--text3)">${p.telefono||''}${p.email?' · '+p.email:''}</div>
        </div>
        <span class="badge badge-${estadoColors[p.estado]}">${estadoLabels[p.estado]}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:6px">
        <span>Entrega: <strong>${fe?formatDateWithTimezone(fe,{format:'date'}):'—'}</strong> · ${diffTxt}</span>
        <span>Saldo: <strong style="color:var(--${saldo>0?'danger':'ok'})">${fmt(saldo)}</strong></span>
      </div>
      <div style="font-size:.75rem;color:var(--text3);margin-bottom:9px">
        ${(p.items||[]).map(it=>`${rec(it.recetaId)?.nombre||'?'} ×${it.cantidad}`).join(' · ')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${p.estado==='pendiente' ? `<button class="btn btn-primary btn-sm" data-id="${p.id}" onclick="actualizarEstadoPedido(+this.dataset.id,'listo')">✓ Listo</button>` : ''}
        ${p.estado==='listo'     ? `<button class="btn btn-ok btn-sm" data-id="${p.id}" onclick="_mostrarModalEntrega(+this.dataset.id)">📦 Entregar</button>` : ''}
        ${p.estado==='entregado_sin_cobrar' ? `<button class="btn btn-primary btn-sm" data-id="${p.id}" onclick="actualizarEstadoPedido(+this.dataset.id,'entregado')">💰 Registrar cobro</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-id="${p.id}" onclick="verPedido(+this.dataset.id)">👁 Ver</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarPedido(${p.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderPedidosTable(){
  const tb=$('tbl-pedidos').querySelector('tbody');
  if(!pedidos || pedidos.length===0){
    tb.innerHTML='<tr><td colspan="9" class="empty">Sin pedidos registrados</td></tr>';
    $('pedidos-stats').textContent='';
    $('pag-pedidos').innerHTML='';
    return;
  }
  
  const total=pedidos.reduce((a,p)=>a+p.items.reduce((sum,item)=>sum+item.cantidad*item.precio,0),0);
  const entregados=pedidos.filter(p=>p.estado==='entregado').length;
  $('pedidos-stats').textContent=`${pedidos.length} pedidos · ${entregados} entregados · Total: ${fmt(total)}`;

  const estadoColors={pendiente:'warn',listo:'caramel',entregado_sin_cobrar:'warn',entregado:'text3'};
  const estadoLabels={pendiente:'Pendiente',listo:'Listo para entregar',entregado_sin_cobrar:'Cobro pendiente',entregado:'Cobrado ✓'};
  const sorted=[...pedidos].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha)||b.id-a.id);
  const pg=_pag.pedidos;
  const inicio=(pg.page-1)*pg.size;
  const pagina=sorted.slice(inicio, inicio+pg.size);

  tb.innerHTML=pagina.map(p=>{
    const tot=p.items.reduce((a,item)=>a+item.cantidad*item.precio,0);
    const productos=p.items.map(item=>`${rec(item.recetaId)?.nombre||'?'} x${item.cantidad}`).join(', ');
    return`<tr>
      <td>${p.fecha}</td>
      <td style="font-weight:500">${p.cliente}</td>
      <td style="font-size:.78rem;color:var(--text3)">${productos}</td>
      <td>${fmt(tot)}</td>
      <td>${fmt(p.anticipo)}</td>
      <td style="color:var(--${tot-p.anticipo>0?'danger':'ok'})">${fmt(tot-p.anticipo)}</td>
      <td>${formatDateWithTimezone(p.fechaEntrega, {format: 'date'})}</td>
      <td><span class="badge badge-${estadoColors[p.estado]||'text3'}">${estadoLabels[p.estado]||p.estado}</span></td>
      <td style="font-size:.77rem;color:var(--text3)">${p.estado==='entregado'&&p.fechaCobro?p.fechaCobro:p.estado==='entregado_sin_cobrar'?'<span style="color:var(--danger);font-weight:500">⏳ Pendiente</span>':'—'}</td>
      <td><button class="btn btn-danger btn-sm btn-icon" data-id="${p.id}" onclick="eliminarPedido(+this.dataset.id)">✕</button></td>
    </tr>`;
  }).join('');
  renderPaginator('pedidos', sorted.length);
}
function agregarItemPedido(){
  const recetaId=parseInt($('pedido-prod').value);
  const cantidad=parseInt($('pedido-cantidad').value)||1;
  const precio=parseFloat($('pedido-precio').value)||0;
  
  if(!recetaId || cantidad<=0 || precio<=0){
    toast('Completá producto, cantidad y precio');
    return;
  }
  
  pedidoActual.push({recetaId,cantidad,precio});
  actualizarItemsPedido();
  
  // Limpiar solo los campos del ítem — NO tocar pedido-notas (es del pedido completo)
  $('pedido-prod').value='';
  $('pedido-cantidad').value=1;
  $('pedido-precio').value='';
}
function actualizarItemsPedido(){
  const el=$('pedido-items');
  if(pedidoActual.length===0){
    el.innerHTML='';
    $('pedido-total').innerHTML='';
    return;
  }
  
  el.innerHTML=pedidoActual.map((item,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;background:var(--cream);border-radius:var(--r);margin-bottom:4px">
    <div style="flex:1">
      <div style="font-size:.85rem;font-weight:500">${rec(item.recetaId)?.nombre||'?'}</div>
      <div style="font-size:.73rem;color:var(--text3)">${item.cantidad} x ${fmt(item.precio)}${item.notas?' · '+item.notas:''}</div>
    </div>
    <button class="btn btn-danger btn-sm btn-icon" onclick="removerItemPedido(${i})" style="margin-left:8px">✕</button>
  </div>`).join('');
  
  const total=pedidoActual.reduce((a,item)=>a+item.cantidad*item.precio,0);
  $('pedido-total').innerHTML=`<div style="display:flex;justify-content:space-between;font-size:.95rem">
    <span>Total:</span><span style="font-weight:500;color:var(--caramel)">${fmt(total)}</span>
  </div>`;
}
function removerItemPedido(index){
  pedidoActual.splice(index,1);
  actualizarItemsPedido();
}
function registrarPedido(){
  const cliente=$('pedido-cliente').value.trim();
  const telefono=$('pedido-telefono').value.trim();
  const email=$('pedido-email').value.trim();
  const fechaEntrega=$('pedido-fecha').value;
  const anticipo=parseFloat($('pedido-anticipo').value)||0;
  const estado=$('pedido-estado').value;
  const notas=$('pedido-notas').value.trim();
  
  if(!cliente || !fechaEntrega || pedidoActual.length===0){
    toast('Completá cliente, fecha de entrega y agregá productos');
    return;
  }
  
  if(!pedidos) pedidos=[];
  const total=pedidoActual.reduce((a,item)=>a+item.cantidad*item.precio,0);
  
  // Guardar estado anterior para deshacer (pedido nuevo no tiene estado anterior)
  const estadoAnterior = {};
  
  const pedido = {
    id:nextId.pedido++,
    fecha:today(),
    cliente,
    telefono,
    email,
    fechaEntrega,
    anticipo,
    estado,
    items:[...pedidoActual],
    notas
  };
  
  pedidos.push(pedido);
  
  // Guardar en historial para deshacer
  if(typeof guardarAccionParaDeshacer === 'function'){
    guardarAccionParaDeshacer('pedido', pedido, estadoAnterior);
  }
  
  // Limpiar formulario
  $('pedido-cliente').value='';
  $('pedido-telefono').value='';
  $('pedido-email').value='';
  $('pedido-fecha').value=today();
  $('pedido-anticipo').value='';
  $('pedido-estado').value='pendiente';
  pedidoActual=[];
  actualizarItemsPedido();
  
  renderPedidos();
  refreshAllStockViews();
  renderFinanzas();
  saveData();
  toast('✓ Pedido registrado correctamente');
}
function actualizarEstadoPedido(id,nuevoEstado){
  const p=pedidos.find(pe=>pe.id==id);
  if(!p) return;

  // ── PENDIENTE → LISTO ──
  // 1. Recalcular stock fresco de cada producto del pedido
  // 2. Verificar que el stock actual cubra la cantidad solicitada
  // 3. Si no alcanza: bloquear y mostrar error
  // 4. Si alcanza: marcar como listo y recalcular (el pedido ahora entra en totalPedidosListo)
  if(nuevoEstado==='listo'){
    // Paso 1: actualizar sp.stock desde cero para tener datos frescos
    const recetasUnicas = [...new Set(p.items.map(it=>it.recetaId))];
    recetasUnicas.forEach(rid => recalcStockProducto(rid));

    // Paso 2: verificar stock ítem por ítem
    const sinStock=[];
    p.items.forEach(item=>{
      const sp=stockProd(item.recetaId);
      const disponible=sp?sp.stock:0;
      if(disponible<item.cantidad){
        const r=rec(item.recetaId);
        sinStock.push(`• ${r?r.nombre:'?'}: necesita ${item.cantidad}, hay ${disponible}`);
      }
    });

    // Paso 3: bloquear si no hay stock
    if(sinStock.length>0){
      toast('⚠ Stock insuficiente: ' + sinStock.join(' | '), 6000);
      return;
    }

    // Paso 4: marcar listo y descontar stock
    // Al pasar a 'listo', recalcStockProducto incluye este pedido en totalPedidosListo
    p.estado='listo';
    recetasUnicas.forEach(rid => recalcStockProducto(rid));
    refreshAllStockViews();
    renderPedidos();
    saveData();
    toast('✓ Pedido listo para entregar — stock descontado');
    return;
  }

  // ── LISTO → ENTREGADO SIN COBRAR ──
  // El producto se entrega pero el pago queda pendiente.
  // Stock: el pedido sale de totalPedidosListo pero NO entra en ventas todavía.
  // La venta se registra solo cuando se cobra (estado 'entregado').
  if(nuevoEstado==='entregado_sin_cobrar'){
    p.estado='entregado_sin_cobrar';
    p.fechaEntregaReal = today();
    // Recalcular stock: el pedido sale de pedidosListo
    // Como entregado_sin_cobrar no está en ventas aún, recalcStockProducto lo excluye
    // pero tampoco lo cuenta como pedidoListo → el stock sube temporalmente
    // Esto es correcto: el producto ya salió físicamente
    const recetasUnicasEsc=[...new Set(p.items.map(it=>it.recetaId))];
    recetasUnicasEsc.forEach(rid=>recalcStockProducto(rid));
    refreshAllStockViews();
    renderPedidos();
    saveData();
    toast('📦 Pedido entregado — cobro pendiente');
    return;
  }

  // ── ENTREGADO SIN COBRAR → COBRADO ──
  // También aplica LISTO → COBRADO directo (si el cliente paga al recibir).
  // Registra la venta en finanzas.
  if(nuevoEstado==='entregado'){
    if(!ventas) ventas=[];
    p.ventaIds=[];
    p.items.forEach(item=>{
      const vid=nextId.venta++;
      p.ventaIds.push(vid);
      ventas.push({
        id:vid,
        fecha:today(),
        recetaId:item.recetaId,
        unidades:item.cantidad,
        precio:item.precio,
        propina:0,
        canal:'encargo',
        nota:`Pedido #${p.id}: ${p.cliente}`
      });
    });
    p.estado='entregado';
    p.fechaCobro = today();
    // Si venía de entregado_sin_cobrar: el stock ya fue recalculado,
    // solo necesitamos que las ventas entren en totalVendido
    const recetasUnicas=[...new Set(p.items.map(it=>it.recetaId))];
    recetasUnicas.forEach(rid=>recalcStockProducto(rid));
    refreshAllStockViews();
    renderPedidos();
    renderFinanzas();
    saveData();
    toast('💰 Cobro registrado — venta guardada en finanzas');
    return;
  }

  p.estado=nuevoEstado;
  renderPedidos();
  saveData();
}
function verPedido(id){
  const p=pedidos.find(pe=>pe.id==id);
  if(!p)return;
  
  const total=p.items.reduce((a,item)=>a+item.cantidad*item.precio,0);
  const itemsHtml=p.items.map(item=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border2)">
    <div>${rec(item.recetaId)?.nombre||'?'} x${item.cantidad}</div>
    <div>${fmt(item.cantidad*item.precio)}</div>
  </div>`).join('');
  
  openModal('modal-ver-pedido');
  $('modal-ver-pedido-inner').innerHTML=`
    <div class="modal-header">
      <span class="modal-title">Pedido #${id} - ${p.cliente}</span>
      <button class="modal-close" onclick="closeModal('modal-ver-pedido')">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><strong>Teléfono:</strong> ${p.telefono||'—'}</div>
        <div><strong>Email:</strong> ${p.email||'—'}</div>
        <div><strong>Fecha pedido:</strong> ${formatDateWithTimezone(p.fecha, {format: 'date'})}</div>
        <div><strong>Fecha entrega:</strong> ${formatDateWithTimezone(p.fechaEntrega, {format: 'date'})}</div>
        ${p.fechaEntregaReal?`<div><strong>Entregado el:</strong> ${p.fechaEntregaReal}</div>`:''}
        ${p.fechaCobro?`<div><strong>Cobrado el:</strong> <span style="color:var(--ok);font-weight:500">${p.fechaCobro}</span></div>`:''}
      </div>
      
      <div style="margin-bottom:16px">
        <h4 style="margin-bottom:8px">Productos:</h4>
        ${itemsHtml}
      </div>
      
      <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:500;margin-bottom:16px">
        <span>Total:</span>
        <span style="color:var(--caramel)">${fmt(total)}</span>
      </div>
      
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <span>Anticipo:</span>
        <span>${fmt(p.anticipo)}</span>
      </div>
      
      <div style="display:flex;justify-content:space-between;font-weight:500;margin-bottom:16px">
        <span>Saldo:</span>
        <span style="color:var(--${total-p.anticipo>0?'danger':'ok'})">${fmt(total-p.anticipo)}</span>
      </div>
      
      ${p.notas?`<div style="margin-bottom:16px"><strong>Notas:</strong> ${p.notas}</div>`:''}
      
      <div style="text-align:center;margin-bottom:12px">
        <span class="badge badge-${p.estado==='pendiente'?'warn':p.estado==='listo'?'caramel':p.estado==='entregado_sin_cobrar'?'warn':'text3'}">
          ${p.estado==='pendiente'?'Pendiente':p.estado==='listo'?'Listo para entregar':p.estado==='entregado_sin_cobrar'?'📦 Entregado — cobro pendiente':'💰 Cobrado ✓'}
        </span>
      </div>
      ${p.estado==='entregado_sin_cobrar'?`
      <div style="text-align:center">
        <button class="btn btn-primary btn-sm" onclick="closeModal('modal-ver-pedido');actualizarEstadoPedido(${p.id},'entregado')">💰 Registrar cobro</button>
      </div>`:''}
    </div>
  `;
}
function _doEliminarPedido(id){
  const p=pedidos.find(pe=>pe.id==id);
  if(!p) return;
  // Eliminar el pedido primero
  pedidos=pedidos.filter(pe=>pe.id!=id);
  // 'listo': al eliminar el pedido del array, recalcStockProducto ya no lo cuenta
  if(p.estado==='listo'){
    p.items.forEach(item=>recalcStockProducto(item.recetaId));
  }
  // 'entregado': eliminar las ventas automáticas (guardadas con ventaIds si existen, o por nota+receta+cantidad)
  if(p.estado==='entregado'){
    if(p.ventaIds && p.ventaIds.length>0){
      const idsSet = new Set(p.ventaIds);
      ventas = (ventas||[]).filter(v => !idsSet.has(v.id));
    } else {
      // Fallback: buscar por nota con formato "Pedido #id: cliente"
      const notaPedido = `Pedido #${p.id}: ${p.cliente}`;
      const notaVieja   = `Pedido: ${p.cliente}`; // compatibilidad con registros anteriores
      ventas = (ventas||[]).filter(v => {
        const nota = v.nota||'';
        if(nota !== notaPedido && nota !== notaVieja) return true;
        return !p.items.some(it => it.recetaId===v.recetaId && it.cantidad===v.unidades);
      });
    }
  }
  refreshAllStockViews();renderPedidos();renderFinanzas();saveData();toast('Pedido eliminado');
}
function eliminarPedido(id){
  const p=pedidos.find(pe=>pe.id==id);
  const msg = p && p.estado==='entregado'
    ? 'Este pedido ya fue <strong>entregado</strong> — se eliminarán también las ventas que generó automáticamente.'
    : p && p.estado==='listo'
    ? 'El stock reservado para este pedido se restaurará automáticamente.'
    : '';
  confirmar({ titulo:'Eliminar pedido', mensaje:msg, labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{ _doEliminarPedido(id); }
  });
}


// ── Modal de entrega: elegir si cobró o queda pendiente ──
function _mostrarModalEntrega(id){
  const p = pedidos.find(pe=>pe.id==id); if(!p) return;
  const total = (p.items||[]).reduce((a,it)=>a+it.cantidad*it.precio,0);
  const saldo = total - (p.anticipo||0);

  // Crear overlay temporal
  const prevModal = document.getElementById('modal-entrega-cobro');
  if(prevModal) prevModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modal-entrega-cobro';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">📦 Entregar pedido — ${p.cliente}</span>
        <button class="modal-close" onclick="document.getElementById('modal-entrega-cobro').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--cream);border-radius:var(--r);padding:12px 14px;margin-bottom:16px;font-size:.86rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span>Total del pedido:</span><strong>${fmt(total)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span>Anticipo recibido:</span><span style="color:var(--ok)">${fmt(p.anticipo||0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
            <span style="font-weight:600">Saldo pendiente:</span>
            <strong style="color:var(--${saldo>0?'danger':'ok'})">${fmt(saldo)}</strong>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-primary" style="justify-content:flex-start;padding:12px 16px"
            onclick="document.getElementById('modal-entrega-cobro').remove();actualizarEstadoPedido(${id},'entregado')">
            <div style="text-align:left">
              <div style="font-weight:600">💰 Entregar y cobrar ahora</div>
              <div style="font-size:.76rem;opacity:.8">El saldo se cobra en el momento de la entrega</div>
            </div>
          </button>
          <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px 16px;border-color:var(--warn)"
            onclick="document.getElementById('modal-entrega-cobro').remove();actualizarEstadoPedido(${id},'entregado_sin_cobrar')">
            <div style="text-align:left">
              <div style="font-weight:600" style="color:var(--warn)">📦 Entregar — cobro pendiente</div>
              <div style="font-size:.76rem;opacity:.8">Se entrega el producto, el pago queda pendiente</div>
            </div>
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
