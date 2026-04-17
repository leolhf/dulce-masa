// ══════════════ HISTORIAL ══════════════

function renderHistorial(){
  // Rebuild proveedor filter
  const ps = $('hist-prov'); const pv = ps ? ps.value : '';
  if(ps){
    ps.innerHTML = '<option value="">Todos los proveedores</option>';
    proveedores.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.nombre;
      if(String(p.id) === pv) o.selected = true;
      ps.appendChild(o);
    });
  }

  const q      = ($('hist-q').value||'').toLowerCase();
  const prvF   = $('hist-prov') ? $('hist-prov').value : '';
  const desde  = $('hist-desde') ? $('hist-desde').value : '';
  const hasta  = $('hist-hasta') ? $('hist-hasta').value : '';

  const lista = historialCompras.filter(c => {
    const i = ing(c.ingId);
    if(q && !(i && i.nombre.toLowerCase().includes(q))) return false;
    if(prvF && String(c.provId) !== prvF) return false;
    
    // Usa createDate de timezone.js para parseo consistente
    const fechaCompra = createDate(c.fecha);
    const fechaDesde  = desde ? createDate(desde) : null;
    const fechaHasta  = hasta ? createDate(hasta) : null;
    
    if(desde && fechaCompra && fechaCompra < fechaDesde) return false;
    if(hasta && fechaCompra && fechaCompra > fechaHasta) return false;
    return true;
  });

  const tb = $('tbl-hist').querySelector('tbody');
  if(lista.length === 0){
    tb.innerHTML = '<tr><td colspan="8" class="empty">Sin resultados</td></tr>';
    $('pag-hist').innerHTML = '';
  } else {
    const sorted = [...lista].sort((a, b) => {
      const da = new Date(a.fecha), db = new Date(b.fecha);
      return db - da || b.id - a.id; // más reciente primero; mismo día → mayor id primero
    });
    const p = _pag.hist;
    const inicio = (p.page-1)*p.size;
    const pagina = sorted.slice(inicio, inicio+p.size);
    tb.innerHTML = pagina.map(c => {
      const i = ing(c.ingId); const pv2 = prv(c.provId);
      return `<tr>
        <td>${c.fecha}</td>
        <td>${i ? i.nombre : '?'}</td>
        <td>${fmtN(c.qty,3)} ${i ? i.unidad : ''}</td>
        <td>${fmt(c.precio)}</td>
        <td style="font-weight:500">${fmt(c.qty*c.precio)}</td>
        <td style="font-size:.78rem;color:var(--text3)">${pv2 ? pv2.nombre : '—'}</td>
        <td style="font-size:.75rem;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.notas||''}">${c.notas||'—'}</td>
        <td class="td-actions">
          <button class="btn btn-secondary btn-sm btn-icon" data-id="${c.id}" onclick="editCompra(+this.dataset.id)" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm btn-icon" data-id="${c.id}" onclick="delCompra(+this.dataset.id)" title="Eliminar">✕</button>
        </td>
      </tr>`;
    }).join('');
    renderPaginator('hist', sorted.length);
  }

  // Panel de análisis — usa el conjunto filtrado si hay filtros activos, sino todo
  const conjuntoAnalisis = (q || prvF || desde || hasta) ? lista : historialCompras;
  const totalFiltrado = conjuntoAnalisis.reduce((a,c)=>a+c.qty*c.precio,0);
  const hayFiltro = q || prvF || desde || hasta;

  const byIng = {};
  conjuntoAnalisis.forEach(c => { byIng[c.ingId] = (byIng[c.ingId]||0) + c.qty*c.precio; });
  const top = Object.entries(byIng).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = top.length > 0 ? top[0][1] : 1;

  const provSelId = $('hist-prov') ? parseInt($('hist-prov').value)||null : null;
  const provSel = provSelId ? prv(provSelId) : null;
  const provPanel = provSel ? `
    <div style="background:rgba(196,124,43,.08);border:1px solid rgba(196,124,43,.2);border-radius:var(--r);padding:11px 14px;margin-bottom:12px;font-size:.82rem">
      <div style="font-weight:600;color:var(--brown2);margin-bottom:5px">🏪 ${provSel.nombre}</div>
      ${provSel.tel?`<div style="color:var(--text2);margin-bottom:2px">📞 <a href="https://wa.me/${provSel.tel.replace(/\D/g,'')}" target="_blank" style="color:var(--caramel)">${provSel.tel}</a></div>`:''}
      ${provSel.productos?`<div style="color:var(--text3)">Productos: ${provSel.productos}</div>`:''}
      ${provSel.dir?`<div style="color:var(--text3)">📍 ${provSel.dir}</div>`:''}
    </div>` : '';

  $('hist-resumen').innerHTML = `
    ${provPanel}
    <div class="stat-card ${hayFiltro?'warn-card':''}" style="margin-bottom:14px">
      <div class="stat-label">${hayFiltro ? 'Total filtrado' : 'Total en compras'}</div>
      <div class="stat-value" style="color:var(--caramel);font-size:1.5rem">${fmt(totalFiltrado)}</div>
      <div class="stat-sub">${conjuntoAnalisis.length} compras${hayFiltro?' (filtradas)':' registradas'}</div>
    </div>
    ${hayFiltro ? `<div style="font-size:.77rem;font-weight:500;color:var(--text2);margin-bottom:9px">Mayor gasto (filtro actual)</div>` :
      `<div style="font-size:.77rem;font-weight:500;color:var(--text2);margin-bottom:9px">Mayor gasto por ingrediente</div>`}
    <div class="chart-bar-wrap">
      ${top.map(([id,v]) => {
        const i = ing(parseInt(id)); const pct = Math.round(v/max*100);
        return `<div class="chart-bar-row">
          <span class="chart-bar-label" title="${i?i.nombre:'?'}">${i?i.nombre:'?'}</span>
          <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
          <span class="chart-bar-val">${fmt(v)}</span>
        </div>`;
      }).join('')}
    </div>`;
}

function limpiarFiltrosHist(){
  $('hist-q').value = '';
  if($('hist-prov')) $('hist-prov').value = '';
  if($('hist-desde')) $('hist-desde').value = '';
  if($('hist-hasta')) $('hist-hasta').value = '';
  _pagReset('hist');
  renderHistorial();
}
function limpiarFormularioCompra(){
  // Campos de texto e inputs
  $('compra-ing-input').value  = '';
  $('compra-ing-input').disabled = false;
  $('compra-ing-input').style.background = '';
  $('compra-ing').value        = '';
  $('compra-prov-input').value = '';
  $('compra-prov').value       = '';
  $('compra-qty').value        = '';
  $('compra-precio').value     = '';
  $('compra-total').value      = '';
  $('compra-notas').value      = '';

  // Ocultar sugerencias y sección de ingrediente nuevo
  const sIng  = $('sugerencias-compra-ing');
  const sProv = $('sugerencias-compra-prov');
  const sNuevo = $('campos-ingrediente-nuevo');
  if (sIng)   sIng.style.display   = 'none';
  if (sProv)  sProv.style.display  = 'none';
  if (sNuevo) sNuevo.style.display = 'none';

  // Resetear variables de autocompletado
  if (typeof ingredienteSeleccionado !== 'undefined') ingredienteSeleccionado = null;
  if (typeof proveedorSeleccionado   !== 'undefined') proveedorSeleccionado   = null;

  // Resetear indicador de cálculo y detalle
  const indicador = $('calculo-indicador');
  if (indicador) { indicador.style.opacity = '0.5'; indicador.title = 'Cálculo automático'; }
  const detCant  = $('detalle-cantidad');
  const detPrecio = $('detalle-precio');
  if (detCant)   { detCant.textContent   = '0'; detCant.style.color   = 'white'; }
  if (detPrecio) { detPrecio.textContent = '$0.00'; detPrecio.style.color = 'white'; }
}

function abrirModalCompra(){
  limpiarFormularioCompra();
  $('compra-edit-id').value = '';
  $('compra-modal-title').textContent = 'Registrar compra de insumo';
  $('compra-edit-aviso').style.display = 'none';
  $('compra-fecha').value = today();
  $('compra-btn-guardar').textContent = 'Registrar compra';
  openModal('modal-compra');
}

function editCompra(id){
  const c = historialCompras.find(x => x.id == id); if(!c) return;
  
  limpiarFormularioCompra();
  $('compra-edit-id').value = id;
  $('compra-modal-title').textContent = 'Editar compra';
  $('compra-btn-guardar').textContent = '✓ Guardar cambios';
  $('compra-edit-aviso').style.display = '';
  
  // Cargar valores
  const ingrediente = ing(c.ingId);
  if (ingrediente) {
    $('compra-ing').value = c.ingId;
    $('compra-ing-input').value = ingrediente.nombre;
    ingredienteSeleccionado = { id: ingrediente.id, nombre: ingrediente.nombre, unidad: ingrediente.unidad };
  }
  
  if (c.provId) {
    const proveedor = proveedores.find(p => p.id === c.provId);
    if (proveedor) {
      $('compra-prov').value = c.provId;
      $('compra-prov-input').value = proveedor.nombre;
      proveedorSeleccionado = { id: proveedor.id, nombre: proveedor.nombre };
    }
  }
  
  $('compra-fecha').value = c.fecha;
  $('compra-qty').value = c.qty;
  $('compra-precio').value = c.precio;
  $('compra-total').value = (c.qty * c.precio).toFixed(2);
  $('compra-notas').value = c.notas || '';
  
  // Deshabilitar edición de ingrediente en modo edición
  $('compra-ing-input').disabled = true;
  $('compra-ing-input').style.background = 'var(--cream)';
  
  // Actualizar indicador y detalle
  const indicador = $('calculo-indicador');
  indicador.style.opacity = '0.8';
  indicador.title = 'Modo edición: total fijo';
  actualizarDetalle();
  
  openModal('modal-compra');
}

function autoFillCompra(){
  const i = ing(parseInt($('compra-ing').value));
  if(i && i.precio > 0) $('compra-precio').value = i.precio;
  updateCompraPrev();
}

function updateCompraPrev(){
  const qty = parseFloat($('compra-qty').value); 
  const p = parseFloat($('compra-precio').value);
  const totalInput = $('compra-total');
  const indicador = $('calculo-indicador');
  
  if (!isNaN(qty) && qty > 0 && !isNaN(p) && p > 0) {
    const total = qty * p;
    totalInput.value = total.toFixed(2);
    indicador.style.opacity = '1';
    indicador.title = 'Cálculo automático: cantidad × precio unitario';
  } else {
    totalInput.value = '';
    indicador.style.opacity = '0.5';
    indicador.title = 'Cálculo automático';
  }
  
  actualizarDetalle();
}

function calcularDesdeTotal(){
  const total = parseFloat($('compra-total').value);
  const qty = parseFloat($('compra-qty').value);
  const precioInput = $('compra-precio');
  const indicador = $('calculo-indicador');
  
  if (!isNaN(total) && total > 0) {
    if (!isNaN(qty) && qty > 0) {
      // Calcular precio unitario desde total y cantidad
      const precioUnitario = total / qty;
      precioInput.value = precioUnitario.toFixed(2);
      indicador.style.opacity = '0.8';
      indicador.title = 'Precio unitario calculado: total ÷ cantidad';
    } else {
      // No hay cantidad, no se puede calcular
      precioInput.value = '';
      indicador.style.opacity = '0.5';
      indicador.title = 'Ingrese cantidad para calcular precio unitario';
    }
  } else {
    precioInput.value = '';
    indicador.style.opacity = '0.5';
    indicador.title = 'Cálculo automático';
  }
  
  actualizarDetalle();
}

function calcularDesdeCantidad(){
  const qty = parseFloat($('compra-qty').value);
  const precio = parseFloat($('compra-precio').value);
  const totalInput = $('compra-total');
  const indicador = $('calculo-indicador');
  
  if (!isNaN(qty) && qty > 0 && !isNaN(precio) && precio > 0) {
    const total = qty * precio;
    totalInput.value = total.toFixed(2);
    indicador.style.opacity = '1';
    indicador.title = 'Cálculo automático: cantidad × precio unitario';
  } else {
    totalInput.value = '';
    indicador.style.opacity = '0.5';
    indicador.title = 'Cálculo automático';
  }
  
  actualizarDetalle();
}

function guardarCompra(){
  const ingId = parseInt($('compra-ing').value);
  let provId = parseInt($('compra-prov').value) || null;
  const provNombreInput = $('compra-prov-input').value.trim();
  const provValor = $('compra-prov').value;
  if (!provId && provNombreInput) {
    const proveedorExistente = proveedores.find(p =>
      p.nombre.trim().toLowerCase() === provNombreInput.toLowerCase()
    );
    if (proveedorExistente) {
      provId = proveedorExistente.id;
    } else {
      const nuevoProveedor = {
        id: nextId.prov++,
        nombre: provNombreInput,
        contacto: '',
        tel: '',
        email: '',
        productos: '',
        dir: '',
        notas: ''
      };
      proveedores.push(nuevoProveedor);
      provId = nuevoProveedor.id;
    }
  }
  const fecha = $('compra-fecha').value;
  const qty = parseFloat($('compra-qty').value);
  const precio = parseFloat($('compra-precio').value);
  const total = parseFloat($('compra-total').value);
  const notas = $('compra-notas').value.trim();
  const editId = $('compra-edit-id').value;
  
  // Validaciones
  if (!ingId) { toast('Selecciona un ingrediente'); return; }
  if (!fecha) { toast('Ingresa la fecha'); return; }
  if (!qty || qty <= 0) { toast('Ingresa una cantidad válida'); return; }
  if (!precio || precio <= 0) { toast('Ingresa un precio válido'); return; }
  if (!total || total <= 0) { toast('El total debe ser mayor a 0'); return; }
  
  const ingrediente = ing(ingId);
  if (!ingrediente) { toast('Ingrediente no encontrado'); return; }
  
  const compraData = {
    id: editId ? parseInt(editId) : nextId.comp++,
    ingId,
    ingNombre: ingrediente.nombre,
    ingUnidad: ingrediente.unidad,
    provId,
    provNombre: provId ? (proveedores.find(p => p.id === provId)?.nombre || '') : '',
    fecha,
    qty,
    precio,
    total,
    notas,
    timestamp: Date.now(),
    loteId: null
  };
  
  if (editId) {
    // Editar compra existente
    const index = historialCompras.findIndex(c => c.id === parseInt(editId));
    if (index !== -1) {
      const compraAnterior = historialCompras[index];
      const loteAnterior = compraAnterior.loteId ? lotesIngredientes.find(l => l.id === compraAnterior.loteId) : null;
      if (loteAnterior && loteAnterior.cantidadRestante < loteAnterior.cantidad) {
        toast('No se puede editar: esta compra ya fue consumida en producción FIFO');
        return;
      }
      if (compraAnterior.loteId) eliminarLotePorId(compraAnterior.loteId);
      historialCompras[index] = compraData;
      const lote = crearLote(ingId, qty, precio, fecha, provId, null, notas || '');
      compraData.loteId = lote.id;
      sincronizarStockConLotes();
      
      toast('Compra actualizada correctamente');
    }
  } else {
    // Guardar estado anterior para deshacer
    const estadoAnterior = {
      stockIngrediente: ingrediente ? ingrediente.stock : null,
      precioIngrediente: ingrediente ? ingrediente.precio : null
    };
    
    // Nueva compra
    historialCompras.push(compraData);
    
    const lote = crearLote(ingId, qty, precio, fecha, provId, null, notas || '');
    compraData.loteId = lote.id;
    sincronizarStockConLotes();
    
    // Guardar en historial para deshacer
    if(typeof guardarAccionParaDeshacer === 'function'){
      guardarAccionParaDeshacer('compra', compraData, estadoAnterior);
    }
    
    toast('Compra registrada correctamente');
  }
  
  // Cerrar modal y actualizar vistas
  closeModal('modal-compra');
  renderHistorial();
  renderFinanzas();
  renderProveedores();
  refreshProvSelects();
  saveData();
  
  // Limpiar formulario
  limpiarFormularioCompra();
}

function delCompra(id){
  const compra = historialCompras.find(c => c.id === id);
  if (!compra) return;
  
  // Confirmación de eliminación
  if (!confirm(`¿Eliminar compra de "${compra.ingNombre}" (${compra.qty} ${compra.ingUnidad}) por $${fmt(compra.total)}?`)) {
    return;
  }
  
  const loteAsociado = compra.loteId ? lotesIngredientes.find(l => l.id === compra.loteId) : null;
  if (loteAsociado && loteAsociado.cantidadRestante < loteAsociado.cantidad) {
    toast('No se puede eliminar: la compra ya fue consumida en producción FIFO');
    return;
  }
  if (compra.loteId) eliminarLotePorId(compra.loteId);
  
  // Eliminar la compra
  historialCompras = historialCompras.filter(c => c.id !== id);
  
  // Guardar cambios y actualizar vista
  saveData();
  renderHistorial();
  renderFinanzas();
  
  toast('Compra eliminada correctamente');
}

function actualizarDetalle(){
  const qty = parseFloat($('compra-qty').value) || 0;
  const precio = parseFloat($('compra-precio').value) || 0;
  const total = parseFloat($('compra-total').value) || 0;
  
  // Actualizar valores en el detalle
  $('detalle-cantidad').textContent = formatCantidad(qty, 'unidad');
  $('detalle-precio').textContent = fmt(precio);
  
  // Validar consistencia
  const calculado = qty * precio;
  if (Math.abs(calculado - total) > 0.01 && total > 0) {
    $('detalle-precio').style.color = '#ffeb3b';
    $('detalle-cantidad').style.color = '#ffeb3b';
  } else {
    $('detalle-precio').style.color = 'white';
    $('detalle-cantidad').style.color = 'white';
  }
}
