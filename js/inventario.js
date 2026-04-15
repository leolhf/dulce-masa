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
        <button class="btn btn-ok btn-sm btn-icon" data-id="${i.id}" onclick="abrirAjuste(+this.dataset.id)" title="Ajustar stock">±</button>
        <button class="btn btn-secondary btn-sm btn-icon" data-id="${i.id}" onclick="editIng(+this.dataset.id)" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" data-id="${i.id}" onclick="delIng(+this.dataset.id)" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Obtener precio según tipo seleccionado ──
function obtenerPrecioSegunTipo(ingId) {
  if (typeof obtenerPrecioPromedioIngrediente === 'function') {
    return obtenerPrecioPromedioIngrediente(ingId);
  }
  // Fallback a precio fijo si la función no está disponible
  const ingrediente = ingredientes.find(i => i.id == ingId);
  return ingrediente && ingrediente.precio > 0 ? ingrediente.precio : 0;
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
      i.stock = +nuevo.toFixed(4);
    } else {
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
  const stockVal = parseFloat($('ing-stock').value)||0;
  if(stockVal < 0){toast('El stock inicial no puede ser negativo');return;}
  const minVal = parseFloat($('ing-min').value)||0;
  if(minVal < 0){toast('El stock mínimo no puede ser negativo');return;}

  // Detectar cambio de precio antes de guardar
  let precioAnterior = null;
  if(editIngId){
    const ingExistente = ing(editIngId);
    if(ingExistente) precioAnterior = ingExistente.precio;
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
    precio:nuevoPrecio
  };
  const _esNuevoIng = !editIngId;
  const _valoresAntIng = editIngId ? {...ing(editIngId)} : null;
  if(editIngId){ingredientes=ingredientes.map(i=>i.id===editIngId?data:i);}else ingredientes.push(data);
  if(typeof guardarAccionParaDeshacer === 'function'){
    guardarAccionParaDeshacer('ingrediente', data, { esNuevo: _esNuevoIng, valoresAnteriores: _valoresAntIng });
  }
  editIngId=null;closeModal('modal-ing');renderInventario();saveData();toast('Ingrediente guardado ✓');

  // Alerta si cambió el precio y hay recetas afectadas
  if(precioAnterior !== null && precioAnterior !== nuevoPrecio){
    _alertaPrecioCambiado(data.id, data.nombre, precioAnterior, nuevoPrecio);
  }
}
function delIng(id){
  const nRecetas = recetas.filter(r=>r.ings.some(ri=>ri.ingId==id)).length;
  const msg = nRecetas > 0
    ? `Este ingrediente está en <strong>${nRecetas} receta${nRecetas!==1?'s':''}</strong>. Se eliminará de todas ellas.`
    : '';
  confirmar({ titulo:'Eliminar ingrediente', mensaje:msg, labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
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
  if(ajusteTab==='sumar')i.stock=+(i.stock+qty).toFixed(4);
  else if(ajusteTab==='restar')i.stock=Math.max(0,+(i.stock-qty).toFixed(4));
  else i.stock=+qty.toFixed(4);
  closeModal('modal-ajuste');renderInventario();saveData();
  toast(`"${i.nombre}": ${formatCantidad(prev, i.unidad)} → ${formatCantidad(i.stock, i.unidad)}`);
}

