// ══════════════ INVENTARIO ══════════════
let _invSort = { col: 'nombre', dir: 1 }; // estado de ordenamiento

function invSort(col) {
  if (_invSort.col === col) {
    _invSort.dir *= -1;
  } else {
    _invSort.col = col;
    _invSort.dir = 1;
  }
  renderInventario();
}

function _invSortValue(i, col) {
  switch(col) {
    case 'nombre':  return i.nombre.toLowerCase();
    case 'cat':     return i.cat.toLowerCase();
    case 'stock':   return i.stock;
    case 'min':     return i.min;
    case 'precio':  return i.precio;
    case 'estado': {
      const orden = { danger: 0, warn: 1, ok: 2 };
      return orden[stockColor(i)] ?? 3;
    }
    default: return '';
  }
}

function renderInventario() {
  // ── Rebuild categoría select ──
  const cats = [...new Set(ingredientes.map(i => i.cat))].sort();
  const cs = $('inv-cat'); const cv = cs.value;
  cs.innerHTML = '<option value="">Todas las cat.</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; if(c === cv) o.selected = true; cs.appendChild(o); });

  // ── Filtrar ──
  const q    = ($('inv-q').value || '').toLowerCase();
  const catF = $('inv-cat').value;
  const estF = $('inv-est').value;
  const precioTipo = $('inv-precio-tipo')?.value; // Obtener tipo de precio seleccionado

  let lista = ingredientes.filter(i => {
    if (q    && !i.nombre.toLowerCase().includes(q)) return false;
    if (catF && i.cat !== catF)                       return false;
    if (estF && stockColor(i) !== estF)               return false;
    return true;
  });

  // ── Ordenar ──
  lista = lista.sort((a, b) => {
    const va = _invSortValue(a, _invSort.col);
    const vb = _invSortValue(b, _invSort.col);
    if (va < vb) return -1 * _invSort.dir;
    if (va > vb) return  1 * _invSort.dir;
    return 0;
  });

  // ── Actualizar indicadores visuales en <th> ──
  document.querySelectorAll('#tbl-inv .th-sort').forEach(th => {
    th.classList.remove('asc', 'desc');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
    if (th.dataset.col === _invSort.col) {
      th.classList.add(_invSort.dir === 1 ? 'asc' : 'desc');
      if (icon) icon.textContent = _invSort.dir === 1 ? '↑' : '↓';
    }
  });

  const tb = $('tbl-inv').querySelector('tbody');
  if (lista.length === 0) { tb.innerHTML = `<tr><td colspan="7" class="empty">Sin resultados</td></tr>`; return; }

  tb.innerHTML = lista.map(i => {
    const sc = stockColor(i), sl = stockLabel(i);
    const pct = i.min > 0 ? Math.min(100, Math.round(i.stock / i.min * 100)) : 100;
    // Obtener precio según el tipo seleccionado
    const precioActual = obtenerPrecioSegunTipo(i.id);
    return `<tr>
      <td style="font-weight:500">${i.nombre}</td>
      <td style="font-size:.78rem;color:var(--text2)">${i.cat}</td>
      <td class="cell-editable" data-id="${i.id}" data-campo="stock" ondblclick="inlineEdit(+this.dataset.id,this.dataset.campo,this)" title="Doble clic para editar">
        <span id="inv-stock-${i.id}">${formatCantidad(i.stock, i.unidad)}</span>
        <div class="prog-bar" style="margin-top:4px;width:90%"><div class="prog-fill ${sc}" style="width:${pct}%"></div></div>
      </td>
      <td>${fmtN(i.min, 3)} ${i.unidad}</td>
      <td>${i.unidad}</td>
      <td class="cell-editable" data-id="${i.id}" data-campo="precio" ondblclick="inlineEdit(+this.dataset.id,this.dataset.campo,this)" title="Doble clic para editar">
        <span id="inv-precio-${i.id}">${fmt(precioActual)}</span>
      </td>
      <td><span class="badge badge-${sc}">${sl}</span></td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" data-id="${i.id}" onclick="verLotesIngrediente(+this.dataset.id)" title="Ver lotes FIFO">📦</button>
        <button class="btn btn-ok btn-sm btn-icon" data-id="${i.id}" onclick="abrirAjuste(+this.dataset.id)" title="Ajustar stock">±</button>
        <button class="btn btn-secondary btn-sm btn-icon" data-id="${i.id}" onclick="editIng(+this.dataset.id)" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" data-id="${i.id}" onclick="delIng(+this.dataset.id)" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Obtener precio según tipo seleccionado ──
function obtenerPrecioSegunTipo(ingId) {
  const ingrediente = ingredientes.find(i => i.id == ingId);
  if (!ingrediente) return 0;

  // 1. Precio guardado en el ingrediente (ya preserva el último precio FIFO
  //    gracias a sincronizarStockConLotes cuando no hay stock disponible)
  if (ingrediente.precio > 0) return ingrediente.precio;

  // 2. Último lote registrado (aunque esté agotado) — evita mostrar $0
  //    en ingredientes recién vaciados que aún no pasaron por sync
  if (typeof obtenerUltimoPrecioFIFO === 'function') {
    const ultimoPrecio = obtenerUltimoPrecioFIFO(ingId);
    if (ultimoPrecio !== null && ultimoPrecio > 0) return ultimoPrecio;
  }

  return 0;
}

// ── Edición inline de Stock y Precio ──
function inlineEdit(ingId, campo, td) {
  const i = ing(ingId);
  if (!i) return;

  // Evitar doble apertura
  if (td.querySelector('.cell-inline-input')) return;

  const valorActual = campo === 'stock' ? i.stock : i.precio;
  const unidadTxt   = campo === 'stock' ? ` ${i.unidad}` : '';

  // Guardar contenido original para restaurar si cancela
  const htmlOriginal = td.innerHTML;

  td.innerHTML = `<input class="cell-inline-input" id="inline-${ingId}-${campo}"
    type="number" step="0.001" min="0"
    value="${valorActual}"
    style="width:110px"
    title="Enter para guardar · Esc para cancelar">`;

  const input = td.querySelector('.cell-inline-input');
  input.focus();
  input.select();

  let _guardado = false; // flag para evitar doble guardado (Enter + blur)

  const guardar = () => {
    if (_guardado) return;
    _guardado = true;
    const nuevo = parseFloat(input.value);
    if (isNaN(nuevo) || nuevo < 0) {
      td.innerHTML = htmlOriginal;
      toast('Valor inválido — cambio descartado');
      return;
    }
    const anterior = campo === 'stock' ? i.stock : i.precio;
    if (campo === 'stock') {
      if(typeof ajustarStockManualEnLotes === 'function' && Array.isArray(lotesIngredientes)){
        ajustarStockManualEnLotes(i.id, nuevo, i.precio, 'Ajuste manual (edición inline)');
      } else {
        i.stock = +nuevo.toFixed(4);
      }
    } else {
      // Si el usuario ingresa 0 pero el ingrediente tiene historial de lotes,
      // advertir y conservar el último precio FIFO para no romper el cálculo de recetas
      if (nuevo === 0 && typeof obtenerUltimoPrecioFIFO === 'function') {
        const ultimoFIFO = obtenerUltimoPrecioFIFO(i.id);
        if (ultimoFIFO !== null && ultimoFIFO > 0) {
          toast(`⚠ Precio 0 ignorado — se mantiene último precio FIFO: $${ultimoFIFO.toFixed(2)}`);
          td.innerHTML = htmlOriginal;
          return;
        }
      }
      i.precio = +nuevo.toFixed(2);
    }
    saveData();
    renderInventario();
    updateAlertBadge();
    const label = campo === 'stock' ? 'Stock' : 'Precio';
    toast(`${i.nombre} — ${label}: ${anterior}${unidadTxt} → ${nuevo}${unidadTxt} ✓`);
    if(campo === 'precio' && anterior !== nuevo){
      _alertaPrecioCambiado(i.id, i.nombre, anterior, nuevo);
    }
  };

  const cancelar = () => { if(_guardado) return; td.innerHTML = htmlOriginal; };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); guardar(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
  });

  // blur: guardar si cambió el valor y no se guardó ya por Enter
  input.addEventListener('blur', () => {
    if (_guardado) return;
    const nuevo = parseFloat(input.value);
    if (!isNaN(nuevo) && nuevo !== valorActual) {
      guardar();
    } else {
      cancelar();
    }
  });
}

// ── Alerta de cambio de precio de ingrediente ──
function _alertaPrecioCambiado(ingId, ingNombre, anterior, nuevo){
  const afectadas = recetas.filter(r => r.ings.some(ri => ri.ingId == ingId));
  if(afectadas.length === 0) return;

  const variacion = nuevo > anterior ? '↑' : '↓';
  const pct = anterior > 0 ? Math.abs(Math.round((nuevo - anterior) / anterior * 100)) : 0;

  // Construir lista de recetas con su nuevo costo
  const filas = afectadas.map(r => {
    const costoNuevo = calcCosto(r);
    const costoUnit = r.rinde > 0 ? costoNuevo / r.rinde : 0;
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border2);font-size:.84rem;font-weight:500">${r.nombre}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border2);font-size:.84rem;text-align:right">${fmt(costoNuevo)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border2);font-size:.84rem;text-align:right;color:var(--text3)">${fmt(costoUnit)}/u</td>
    </tr>`;
  }).join('');

  // Remover alerta previa si existe, y crear nueva
  const prevAlert = document.getElementById('modal-precio-alerta');
  if(prevAlert) prevAlert.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modal-precio-alerta';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <span class="modal-title">💰 Precio actualizado</span>
        <button class="modal-close" onclick="document.getElementById('modal-precio-alerta').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:.86rem">
          <strong>${ingNombre}</strong>: ${fmt(anterior)} → ${fmt(nuevo)}
          <span style="color:var(--warn);font-weight:600;margin-left:6px">${variacion} ${pct}%</span>
        </div>
        <div style="font-size:.8rem;color:var(--text2);margin-bottom:10px">
          <strong>${afectadas.length}</strong> receta${afectadas.length !== 1 ? 's' : ''} usan este ingrediente.
          Estos son sus nuevos costos — revisá si tus precios de venta siguen siendo rentables:
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:2px solid var(--border)">
              <th style="padding:6px 10px;text-align:left;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500">Receta</th>
              <th style="padding:6px 10px;text-align:right;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500">Costo total</th>
              <th style="padding:6px 10px;text-align:right;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500">Por unidad</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-secondary" onclick="document.getElementById('modal-precio-alerta').remove()">Cerrar</button>
          <button class="btn btn-primary" onclick="document.getElementById('modal-precio-alerta').remove();goto('costos',document.querySelector('.nav-item[onclick*=costos]'))">Ver análisis de costos →</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
let editIngId=null;
function abrirModalIng(){
  editIngId=null;$('ing-title').textContent='Agregar ingrediente';
  ['ing-nombre','ing-stock','ing-min','ing-precio'].forEach(id=>$(id).value='');
  $('ing-cat').selectedIndex=0;$('ing-unidad').selectedIndex=0;
  openModal('modal-ing');
}
function editIng(id){
  const i=ing(id);if(!i)return;editIngId=id;
  $('ing-title').textContent='Editar ingrediente';
  $('ing-nombre').value=i.nombre;$('ing-cat').value=i.cat;
  $('ing-stock').value=i.stock;$('ing-min').value=i.min;
  $('ing-unidad').value=i.unidad;$('ing-precio').value=i.precio;
  openModal('modal-ing');
}
function guardarIng(){
  const nombre=$('ing-nombre').value.trim();
  if(!nombre){toast('Ingresá un nombre');return;}
  const nuevoPrecio = parseFloat($('ing-precio').value)||0;
  if(nuevoPrecio < 0){toast('El precio no puede ser negativo');return;}

  // Si el usuario pone precio 0 en un ingrediente que ya tiene historial de lotes FIFO,
  // usar el último precio FIFO para no perder la referencia de costo en las recetas
  let precioFinal = nuevoPrecio;
  if(nuevoPrecio === 0 && editIngId && typeof obtenerUltimoPrecioFIFO === 'function'){
    const ultimoFIFO = obtenerUltimoPrecioFIFO(editIngId);
    if(ultimoFIFO !== null && ultimoFIFO > 0){
      precioFinal = ultimoFIFO;
      toast(`⚠ Precio 0 → se conserva último precio FIFO: $${ultimoFIFO.toFixed(2)}`);
    }
  }
  const stockVal = parseFloat($('ing-stock').value)||0;
  if(stockVal < 0){toast('El stock inicial no puede ser negativo');return;}
  const minVal = parseFloat($('ing-min').value)||0;
  if(minVal < 0){toast('El stock mínimo no puede ser negativo');return;}

  // Detectar cambio de precio antes de guardar
  let precioAnterior = null;
  let stockAnterior = null;
  if(editIngId){
    const ingExistente = ing(editIngId);
    if(ingExistente) precioAnterior = ingExistente.precio;
    if(ingExistente) stockAnterior = ingExistente.stock;
  }

  // Preservar campos extra del ingrediente original (ej: provId) que el modal no edita
  const ingBase = editIngId ? (ing(editIngId) || {}) : {};
  const data={
    ...ingBase,  // preservar provId y cualquier otro campo extra
    id:editIngId||nextId.ing++,
    nombre,
    cat:$('ing-cat').value,
    stock:stockVal,
    min:minVal,
    unidad:$('ing-unidad').value,
    precio:precioFinal
  };
  const _esNuevoIng = !editIngId;
  const _valoresAntIng = editIngId ? {...ing(editIngId)} : null;
  if(editIngId){ingredientes=ingredientes.map(i=>i.id===editIngId?data:i);}else ingredientes.push(data);
  const cambioStock = stockAnterior === null || Math.abs((stockAnterior || 0) - (data.stock || 0)) > 0.0001;
  if(cambioStock && typeof ajustarStockManualEnLotes === 'function' && Array.isArray(lotesIngredientes)){
    ajustarStockManualEnLotes(data.id, data.stock, data.precio, editIngId ? 'Ajuste manual (editar ingrediente)' : 'Stock inicial ingrediente');
  }
  if(typeof guardarAccionParaDeshacer === 'function'){
    guardarAccionParaDeshacer('ingrediente', data, { esNuevo: _esNuevoIng, valoresAnteriores: _valoresAntIng });
  }
  editIngId=null;closeModal('modal-ing');renderInventario();saveData();toast('Ingrediente guardado ✓');

  // Alerta si cambió el precio y hay recetas afectadas
  if(precioAnterior !== null && precioAnterior !== precioFinal){
    _alertaPrecioCambiado(data.id, data.nombre, precioAnterior, precioFinal);
  }
}
function delIng(id){
  const nRecetas = recetas.filter(r=>r.ings.some(ri=>ri.ingId==id)).length;
  const msg = nRecetas > 0
    ? `Este ingrediente está en <strong>${nRecetas} receta${nRecetas!==1?'s':''}</strong>. Se eliminará de todas ellas.`
    : '';
  confirmar({ titulo:'Eliminar ingrediente', mensaje:msg, labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
      if(Array.isArray(lotesIngredientes)){
        lotesIngredientes = lotesIngredientes.filter(l => l.ingredienteId !== id);
      }
      ingredientes=ingredientes.filter(i=>i.id!==id);
      recetas=recetas.map(r=>({...r,ings:r.ings.filter(ri=>ri.ingId!=id)}));
      renderInventario();renderRecetas();saveData();toast('Ingrediente eliminado ✓');
    }
  });
}

// ── AJUSTE STOCK ──
let ajusteId=null,ajusteTab='sumar';
function abrirAjuste(id){
  const i=ing(id);if(!i)return;ajusteId=id;
  $('ajuste-title').textContent='Ajustar stock — '+i.nombre;
  $('ajuste-info').innerHTML=`Stock actual: <strong>${formatCantidad(i.stock, i.unidad)}</strong>`;
  $('ajuste-qty').value='';$('ajuste-motivo').value='';
  setTab('sumar');openModal('modal-ajuste');
}
function setTab(t){
  ajusteTab=t;['sumar','restar','fijar'].forEach(x=>$('tab-'+x).classList.toggle('active',x===t));
  $('ajuste-lbl').textContent={sumar:'Cantidad a sumar',restar:'Cantidad a restar',fijar:'Nuevo valor de stock'}[t];
}
function confirmarAjuste(){
  const i=ing(ajusteId);if(!i)return;
  const qty=parseFloat($('ajuste-qty').value);
  if(isNaN(qty)||qty<0){toast('Cantidad inválida');return;}
  const prev=i.stock;
  let nuevoStock = prev;
  if(ajusteTab==='sumar')nuevoStock=+(i.stock+qty).toFixed(4);
  else if(ajusteTab==='restar')nuevoStock=Math.max(0,+(i.stock-qty).toFixed(4));
  else nuevoStock=+qty.toFixed(4);
  if(typeof ajustarStockManualEnLotes === 'function' && Array.isArray(lotesIngredientes)){
    ajustarStockManualEnLotes(i.id, nuevoStock, i.precio, 'Ajuste manual (modal de ajuste)');
  } else {
    i.stock = nuevoStock;
  }
  closeModal('modal-ajuste');renderInventario();saveData();
  toast(`"${i.nombre}": ${formatCantidad(prev, i.unidad)} → ${formatCantidad(i.stock, i.unidad)}`);
}

function verLotesIngrediente(ingId, filtro = null){
  const ingrediente = ing(ingId);
  if(!ingrediente){ toast('Ingrediente no encontrado'); return; }
  if(typeof obtenerDetalleLotesIngrediente !== 'function'){
    toast('Detalle FIFO no disponible');
    return;
  }
  const lotes = obtenerDetalleLotesIngrediente(ingId) || [];
  const filtroActual = filtro || document.getElementById('filtro-lotes-fifo')?.value || 'todos';
  const lotesFiltrados = lotes.filter(l => {
    if(filtroActual === 'activos') return l.estado === 'activo';
    if(filtroActual === 'agotados') return l.estado === 'agotado';
    if(filtroActual === 'enuso') return l.enUso;
    if(filtroActual === 'revisar') return l.sospechoso;
    return true;
  });
  const totalConsumido = lotes.reduce((sum,l) => sum + Number(l.cantidadConsumida || 0), 0);
  const totalRestante = lotes.reduce((sum,l) => sum + Number(l.cantidadRestante || 0), 0);
  const lotesSospechosos = lotes.filter(l => l.sospechoso).length;
  const prev = document.getElementById('modal-lotes-fifo');
  if(prev) prev.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modal-lotes-fifo';
  overlay.innerHTML = `
    <div class="modal" style="max-width:920px">
      <div class="modal-header">
        <span class="modal-title">Lotes FIFO — ${ingrediente.nombre}</span>
        <button class="modal-close" onclick="document.getElementById('modal-lotes-fifo').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <div style="font-size:.78rem;color:var(--text3);background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px">
            Stock actual: <strong style="color:var(--text)">${formatCantidad(ingrediente.stock, ingrediente.unidad)}</strong>
          </div>
          <div style="font-size:.78rem;color:var(--text3);background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px">
            Consumido: <strong style="color:var(--text)">${fmtN(totalConsumido,3)} ${ingrediente.unidad}</strong>
          </div>
          <div style="font-size:.78rem;color:var(--text3);background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px">
            Restante en lotes: <strong style="color:var(--text)">${fmtN(totalRestante,3)} ${ingrediente.unidad}</strong>
          </div>
          <div style="font-size:.78rem;color:var(--text3);background:rgba(107,175,105,.1);border:1px solid rgba(107,175,105,.25);border-radius:var(--r);padding:8px 11px">
            Lote en uso: <strong style="color:var(--ok)">marcado en verde</strong>. FIFO consume primero el lote disponible más antiguo.
          </div>
          ${lotesSospechosos ? `
            <div style="font-size:.78rem;color:var(--warn);background:rgba(212,108,108,.08);border:1px solid rgba(212,108,108,.25);border-radius:var(--r);padding:8px 11px">
              ${lotesSospechosos} lote${lotesSospechosos === 1 ? '' : 's'} para revisar
            </div>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <label style="font-size:.78rem;color:var(--text3)">Filtro</label>
          <select id="filtro-lotes-fifo" onchange="verLotesIngrediente(${ingId}, this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--white);font-size:.82rem">
            <option value="todos" ${filtroActual==='todos'?'selected':''}>Todos</option>
            <option value="activos" ${filtroActual==='activos'?'selected':''}>Solo activos</option>
            <option value="agotados" ${filtroActual==='agotados'?'selected':''}>Solo agotados</option>
            <option value="enuso" ${filtroActual==='enuso'?'selected':''}>En uso</option>
            <option value="revisar" ${filtroActual==='revisar'?'selected':''}>Para revisar</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="recalcularStockDesdeLotesModal(${ingId})">Recalcular stock desde lotes</button>
        </div>
        ${lotes.length === 0 ? `
          <p class="empty">Sin lotes registrados para este ingrediente.</p>
        ` : lotesFiltrados.length === 0 ? `
          <p class="empty">No hay lotes para el filtro seleccionado.</p>
        ` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Uso</th>
                  <th>Fecha</th>
                  <th>Cantidad original</th>
                  <th>Consumido</th>
                  <th>Cantidad restante</th>
                  <th>% restante</th>
                  <th>Costo/u</th>
                  <th>Nota</th>
                  <th>Último cambio</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${lotesFiltrados.map(l => {
                  const estilosFila = [];
                  if(l.enUso) estilosFila.push('background:rgba(107,175,105,.1)', 'outline:2px solid rgba(107,175,105,.28)');
                  if(l.sospechoso && !l.enUso) estilosFila.push('background:rgba(212,108,108,.08)', 'outline:2px solid rgba(212,108,108,.24)');
                  const ultimoCambio = Array.isArray(l.historialEdiciones) && l.historialEdiciones.length ? l.historialEdiciones[l.historialEdiciones.length - 1] : null;
                  return `
                  <tr id="lote-row-${l.id}" style="${estilosFila.join(';')}">
                    <td>
                      ${l.enUso ? '<span class="badge badge-ok" title="Este es el próximo lote que FIFO consume">En uso</span>' : l.estado === 'activo' ? '<span style="font-size:.72rem;color:var(--text3)">En espera</span>' : '<span style="font-size:.72rem;color:var(--text3)">—</span>'}
                      ${l.sospechoso ? '<span class="badge badge-warn" title="Cantidad o costo fuera de lo habitual" style="margin-left:4px">Revisar</span>' : ''}
                    </td>
                    <td>${l.fechaIngreso || '—'}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <input id="lote-cantidad-${l.id}" type="number" min="0" step="0.001" value="${Number(l.cantidad || 0)}" style="width:105px;padding:7px 8px;border:1px solid var(--border);border-radius:8px;background:var(--white);font-size:.82rem">
                        <span style="font-size:.75rem;color:var(--text3)">${ingrediente.unidad}</span>
                        <button class="btn btn-secondary btn-sm" title="Divide la cantidad entre 1000 para corregir errores de decimal" onclick="corregirDecimalLote(${l.id})">÷1000</button>
                      </div>
                    </td>
                    <td>${fmtN(l.cantidadConsumida,3)} ${ingrediente.unidad}</td>
                    <td style="font-weight:600">${fmtN(l.cantidadRestante,3)} ${ingrediente.unidad}</td>
                    <td>${l.porcentajeRestante}%</td>
                    <td>
                      <input id="lote-costo-${l.id}" type="number" min="0" step="0.01" value="${Number(l.costoUnitario || 0)}" style="width:95px;padding:7px 8px;border:1px solid var(--border);border-radius:8px;background:var(--white);font-size:.82rem">
                    </td>
                    <td>
                      <input id="lote-nota-${l.id}" type="text" value="${escapeHTML(l.nota || '')}" placeholder="Nota" style="width:140px;padding:7px 8px;border:1px solid var(--border);border-radius:8px;background:var(--white);font-size:.82rem">
                    </td>
                    <td style="font-size:.72rem;color:var(--text3);min-width:105px">
                      ${ultimoCambio ? new Date(ultimoCambio.fecha).toLocaleString() : '—'}
                    </td>
                    <td><span class="badge badge-${l.estado==='activo'?'ok':'warn'}">${l.estado}</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="guardarEdicionLoteFIFO(${l.id},${ingId})">Guardar</button>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
          <div style="font-size:.75rem;color:var(--text3);margin-top:10px;line-height:1.45">
            Si corriges una cantidad ya parcialmente consumida, se mantiene lo consumido y se recalcula la cantidad restante. El botón ÷1000 sirve para corregir errores típicos de decimal. Los cambios quedan registrados en el historial interno del lote.
          </div>
        `}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function corregirDecimalLote(loteId){
  const input = document.getElementById(`lote-cantidad-${loteId}`);
  if(!input) return;
  const valor = parseFloat(input.value);
  if(isNaN(valor)){ toast('Cantidad inválida'); return; }
  input.value = +(valor / 1000).toFixed(6);
}

function recalcularStockDesdeLotesModal(ingId){
  if(typeof sincronizarStockConLotes !== 'function'){ toast('Recalculo FIFO no disponible'); return; }
  sincronizarStockConLotes();
  renderInventario();
  updateAlertBadge();
  saveData();
  verLotesIngrediente(ingId);
  toast('Stock recalculado desde Lotes FIFO ✓');
}

function guardarEdicionLoteFIFO(loteId, ingId){
  const lote = lotesIngredientes.find(l => l.id === loteId);
  const ingrediente = ing(ingId);
  if(!lote || !ingrediente){ toast('Lote no encontrado'); return; }
  const cantidadInput = document.getElementById(`lote-cantidad-${loteId}`);
  const costoInput = document.getElementById(`lote-costo-${loteId}`);
  const notaInput = document.getElementById(`lote-nota-${loteId}`);
  const nuevaCantidad = parseFloat(cantidadInput?.value);
  const nuevoCosto = parseFloat(costoInput?.value);
  const anteriorCantidad = lote.cantidad;
  const anteriorCosto = lote.costoUnitario;
  const stockAntes = ingrediente.stock;
  const costoAntes = ingrediente.precio;
  const consumido = Math.max(0, Number(lote.cantidad || 0) - Number(lote.cantidadRestante || 0));
  const filtroActual = document.getElementById('filtro-lotes-fifo')?.value || 'todos';
  const cambiosGrandes = (anteriorCantidad > 0 && Math.abs(nuevaCantidad - anteriorCantidad) / anteriorCantidad > .5) || (anteriorCosto > 0 && Math.abs(nuevoCosto - anteriorCosto) / anteriorCosto > .5);

  if(nuevaCantidad < consumido){
    if(!confirm(`Este lote ya consumió ${fmtN(consumido,3)} ${ingrediente.unidad}. Si guardas ${fmtN(nuevaCantidad,3)}, el restante quedará en 0. ¿Continuar?`)){
      return;
    }
  }

  if(cambiosGrandes){
    if(!confirm('La cantidad o el costo cambia más del 50%. ¿Confirmas que quieres guardar esta corrección?')){
      return;
    }
  }

  try{
    editarLoteFIFO(loteId, nuevaCantidad, nuevoCosto, notaInput ? notaInput.value : null);
    renderInventario();
    updateAlertBadge();
    saveData();
    const ingredienteActualizado = ing(ingId);
    const stockDespues = ingredienteActualizado?.stock ?? stockAntes;
    const costoDespues = ingredienteActualizado?.precio ?? costoAntes;
    verLotesIngrediente(ingId, filtroActual);
    toast(`Lote actualizado. Stock: ${fmtN(stockAntes,3)} → ${fmtN(stockDespues,3)} ${ingrediente.unidad} · Costo: ${fmt(costoAntes)} → ${fmt(costoDespues)}`);
  }catch(e){
    toast('No se pudo guardar el lote: ' + e.message);
  }
}

