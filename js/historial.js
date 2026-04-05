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
    
    // Parsear fechas manteniendo el día correcto
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    const fechaCompra = parseDate(c.fecha);
    const fechaDesde = desde ? parseDate(desde) : null;
    const fechaHasta = hasta ? parseDate(hasta) : null;
    
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

// ── FUNCIONES AUTOCOMPLETE PARA COMPRA ──
let ingredienteSeleccionado = null;
let proveedorSeleccionado = null;

function filtrarIngredientesCompra() {
  const input = $('compra-ing-input').value.toLowerCase();
  const sugerencias = $('sugerencias-compra-ing');
  
  if (input.length < 2) {
    sugerencias.style.display = 'none';
    return;
  }
  
  // Buscar ingredientes existentes
  const existentes = ingredientes.filter(i => 
    i.nombre.toLowerCase().includes(input)
  ).slice(0, 8);
  
  if (existentes.length > 0) {
    sugerencias.innerHTML = existentes.map(i => `
      <div onclick="seleccionarIngredienteCompra(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', '${i.unidad}')">
        <strong>${i.nombre}</strong>
        <span style="font-size:.74rem;color:var(--text3);margin-left:8px">${formatCantidad(i.stock, i.unidad)} · ${i.unidad}</span>
      </div>
    `).join('');
    
    // Si no hay coincidencia exacta, mostrar opción de agregar nuevo
    const coincidenciaExacta = existentes.some(i => i.nombre.toLowerCase() === input);
    if (!coincidenciaExacta) {
      sugerencias.innerHTML += `
        <div class="nuevo" onclick="mostrarCamposIngredienteNuevo()">
          <strong>➕ Agregar "${input}" como ingrediente nuevo</strong>
        </div>
      `;
    }
  } else {
    sugerencias.innerHTML = `
      <div class="nuevo" onclick="mostrarCamposIngredienteNuevo()">
        <strong>➕ Agregar "${input}" como ingrediente nuevo</strong>
      </div>
    `;
  }
  
  sugerencias.style.display = 'block';
}

function seleccionarIngredienteCompra(id, nombre, unidad) {
  $('compra-ing').value = id;
  $('compra-ing-input').value = nombre;
  $('sugerencias-compra-ing').style.display = 'none';
  ingredienteSeleccionado = { id, nombre, unidad };
  
  // Ocultar campos de ingrediente nuevo
  $('campos-ingrediente-nuevo').style.display = 'none';
  
  // Autocompletar precio si existe
  const ingrediente = ing(id);
  if (ingrediente && ingrediente.precio > 0) {
    $('compra-precio').value = ingrediente.precio;
  }
  
  updateCompraPrev();
}

function mostrarCamposIngredienteNuevo() {
  $('compra-ing').value = 'nuevo';
  ingredienteSeleccionado = { id: 'nuevo', nombre: $('compra-ing-input').value };
  $('sugerencias-compra-ing').style.display = 'none';
  
  // Mostrar campos para ingrediente nuevo
  $('campos-ingrediente-nuevo').style.display = 'block';
  
  // Limpiar campos
  $('nuevo-ing-min').value = '';
  $('nuevo-ing-cat').selectedIndex = 0;
  $('nuevo-ing-unidad').selectedIndex = 0;
}

function mostrarSugerenciasIngredientes() {
  const inputElement = $('compra-ing-input');
  if (!inputElement) return;
  
  const input = inputElement.value;
  if (input.length >= 2) {
    filtrarIngredientesCompra();
  }
}

function ocultarSugerenciasIngredientes() {
  const sugerenciasElement = $('sugerencias-compra-ing');
  if (sugerenciasElement) {
    setTimeout(() => {
      sugerenciasElement.style.display = 'none';
    }, 200);
  }
}

function filtrarProveedoresCompra() {
  const input = $('compra-prov-input').value.toLowerCase();
  const sugerencias = $('sugerencias-compra-prov');
  
  if (input.length < 2) {
    sugerencias.style.display = 'none';
    return;
  }
  
  // Buscar proveedores existentes
  const existentes = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(input)
  ).slice(0, 8);
  
  if (existentes.length > 0) {
    sugerencias.innerHTML = existentes.map(p => `
      <div onclick="seleccionarProveedorCompra(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
        <strong>${p.nombre}</strong>
      </div>
    `).join('');
    
    // Si no hay coincidencia exacta, mostrar opción de agregar nuevo
    const coincidenciaExacta = existentes.some(p => p.nombre.toLowerCase() === input);
    if (!coincidenciaExacta) {
      sugerencias.innerHTML += `
        <div class="nuevo" onclick="mostrarCamposProveedorNuevo()">
          <strong>➕ Agregar "${input}" como proveedor nuevo</strong>
        </div>
      `;
    }
  } else {
    sugerencias.innerHTML = `
      <div class="nuevo" onclick="mostrarCamposProveedorNuevo()">
        <strong>➕ Agregar "${input}" como proveedor nuevo</strong>
      </div>
    `;
  }
  
  sugerencias.style.display = 'block';
}

function seleccionarProveedorCompra(id, nombre) {
  $('compra-prov').value = id;
  $('compra-prov-input').value = nombre;
  $('sugerencias-compra-prov').style.display = 'none';
  proveedorSeleccionado = { id, nombre };
}

function mostrarCamposProveedorNuevo() {
  $('compra-prov').value = 'nuevo';
  proveedorSeleccionado = { id: 'nuevo', nombre: $('compra-prov-input').value };
  $('sugerencias-compra-prov').style.display = 'none';
}

function mostrarSugerenciasProveedores() {
  const input = $('compra-prov-input').value;
  if (input.length >= 2) {
    filtrarProveedoresCompra();
  }
}

function ocultarSugerenciasProveedores() {
  setTimeout(() => {
    $('sugerencias-compra-prov').style.display = 'none';
  }, 200);
}

function guardarCompra(){
  const editId = parseInt($('compra-edit-id').value) || null;
  let ingId  = $('compra-ing').value;
  const qty    = parseFloat($('compra-qty').value);
  const precio = parseFloat($('compra-precio').value);
  
  // Validaciones
  if(!ingId || isNaN(qty) || qty <= 0){ 
    toast('Completá los campos requeridos'); return; 
  }
  if(qty <= 0){ toast('La cantidad debe ser mayor a cero'); return; }
  if(!isNaN(precio) && precio < 0){ toast('El precio no puede ser negativo'); return; }

  let ingrediente = null;
  let proveedorId = $('compra-prov').value;
  
  // Manejar ingrediente nuevo
  if (ingId === 'nuevo' && ingredienteSeleccionado && ingredienteSeleccionado.id === 'nuevo') {
    const cat = $('nuevo-ing-cat').value;
    const min = parseFloat($('nuevo-ing-min').value) || 0;
    const unidad = $('nuevo-ing-unidad').value;
    
    // Crear nuevo ingrediente con stock 0 — el bloque "NUEVA compra" lo sumará enseguida
    ingrediente = {
      id: nextId.ing++,
      nombre: ingredienteSeleccionado.nombre,
      cat: cat,
      stock: 0,
      min: min,
      unidad: unidad,
      precio: precio || 0
    };
    
    ingredientes.push(ingrediente);
    ingId = ingrediente.id;
    
    toast(`✓ Ingrediente "${ingrediente.nombre}" agregado al inventario`);
  } else {
    ingrediente = ing(parseInt(ingId));
  }
  
  // Manejar proveedor nuevo
  if (proveedorId === 'nuevo' && proveedorSeleccionado && proveedorSeleccionado.id === 'nuevo') {
    const nuevoProveedor = {
      id: nextId.prov++,
      nombre: proveedorSeleccionado.nombre
    };
    
    proveedores.push(nuevoProveedor);
    proveedorId = nuevoProveedor.id;
    
    toast(`✓ Proveedor "${nuevoProveedor.nombre}" agregado`);
  }

  if(editId){
    // ── EDICIÓN: ajustar stock con la diferencia ──
    const original = historialCompras.find(c => c.id === editId);
    if(!original){ toast('Compra no encontrada'); return; }
    const diffQty = qty - original.qty;
    if(ingrediente) ingrediente.stock = +(ingrediente.stock + diffQty).toFixed(4);
    
    // Actualizar registro
    original.qty = qty;
    original.precio = isNaN(precio) ? 0 : precio;
    original.fecha = $('compra-fecha').value || today();
    original.provId = proveedorId ? parseInt(proveedorId) : null;
    original.notas = $('compra-notas').value;
    
    if(ingrediente && !isNaN(precio) && precio > 0) ingrediente.precio = precio;
    
    closeModal('modal-compra');
    renderHistorial(); renderInventario(); saveData();
    toast(`Compra editada ✓${diffQty !== 0 ? ` · Stock ajustado ${diffQty > 0 ? '+' : ''}${fmtN(diffQty,3)}` : ''}`);
  } else {
    // ── NUEVA compra ──
    if(ingrediente){ 
      ingrediente.stock = +(ingrediente.stock + qty).toFixed(4); 
      if(!isNaN(precio) && precio > 0) ingrediente.precio = precio; 
    }
    
    historialCompras.push({
      id: nextId.comp++, 
      ingId: ingId, 
      qty: qty, 
      precio: isNaN(precio) ? 0 : precio,
      fecha: $('compra-fecha').value || today(), 
      provId: proveedorId ? parseInt(proveedorId) : null,
      notas: $('compra-notas').value
    });
    
    closeModal('modal-compra');
    limpiarFormularioCompra();
    renderHistorial(); 
    renderInventario(); 
    saveData(); 
    toast('Compra registrada y stock actualizado ✓');
  }
  
  $('compra-ing').disabled = false;
}

function limpiarFormularioCompra() {
  $('compra-ing-input').value = '';
  $('compra-ing').value = '';
  $('compra-prov-input').value = '';
  $('compra-prov').value = '';
  $('compra-qty').value = '';
  $('compra-precio').value = '';
  $('compra-total').value = '';
  $('compra-notas').value = '';
  $('campos-ingrediente-nuevo').style.display = 'none';
  $('sugerencias-compra-ing').style.display = 'none';
  $('sugerencias-compra-prov').style.display = 'none';
  
  // Resetear indicador
  const indicador = $('calculo-indicador');
  indicador.style.opacity = '0.5';
  indicador.title = 'Cálculo automático';
  
  // Resetear colores del detalle
  $('detalle-precio').style.color = 'white';
  $('detalle-cantidad').style.color = 'white';
  
  // Habilitar input de ingrediente
  $('compra-ing-input').disabled = false;
  $('compra-ing-input').style.background = '';
  
  ingredienteSeleccionado = null;
  proveedorSeleccionado = null;
}

function delCompra(id){
  const c = historialCompras.find(x => x.id == id);
  const i = c ? ing(c.ingId) : null;
  const nombreIng = i ? i.nombre : 'ingrediente desconocido';
  const qtyStr = c ? fmtN(c.qty, 3) : '?';

  confirmar({ 
    titulo: 'Eliminar compra', 
    mensaje: `Se eliminará la compra de <strong>${qtyStr} de ${nombreIng}</strong>.<br>El stock se revertirá automáticamente.`, 
    labelOk: 'Eliminar', 
    tipo: 'danger',
    onOk: () => {
      if(c && i){
        i.stock = +(i.stock - c.qty).toFixed(4);
      }
      historialCompras = historialCompras.filter(x => x.id != id);
      renderHistorial();
      renderInventario();
      saveData();
      toast('Compra eliminada y stock revertido ✓');
    }
  });
}

function exportarComprasCSV(){
  const q     = ($('hist-q').value||'').toLowerCase();
  const prvF  = $('hist-prov') ? $('hist-prov').value : '';
  const desde = $('hist-desde') ? $('hist-desde').value : '';
  const hasta = $('hist-hasta') ? $('hist-hasta').value : '';

  // Misma función de parseo que renderHistorial para consistencia exacta
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  const lista = historialCompras.filter(c => {
    const i = ing(c.ingId);
    if(q && !(i && i.nombre.toLowerCase().includes(q))) return false;
    if(prvF && String(c.provId) !== prvF) return false;
    const fechaCompra = parseDate(c.fecha);
    if(desde && fechaCompra && fechaCompra < parseDate(desde)) return false;
    if(hasta && fechaCompra && fechaCompra > parseDate(hasta)) return false;
    return true;
  }).sort((a,b) => parseDate(a.fecha) - parseDate(b.fecha));

  if(lista.length === 0){ toast('No hay compras para exportar'); return; }

  const encabezado = ['Fecha','Ingrediente','Unidad','Cantidad','Precio/u','Total','Proveedor','Notas'];
  const filas = lista.map(c => {
    const i = ing(c.ingId); const pv2 = prv(c.provId);
    return [
      c.fecha,
      i ? i.nombre : '?',
      i ? i.unidad : '',
      c.qty,
      c.precio,
      +(c.qty * c.precio).toFixed(2),
      pv2 ? pv2.nombre : '',
      c.notas || ''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });

  const csv = [encabezado.join(','), ...filas].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fechaHoy = today();
  a.href     = url;
  a.download = `compras_${fechaHoy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`CSV exportado — ${lista.length} registros ✓`);
}

