// ══════════════ AUTOCOMPLETE PARA MODAL DE COMPRA ══════════════
// Extraído de historial.js — búsqueda de ingredientes y proveedores en el modal

let ingredienteSeleccionado = null;
let proveedorSeleccionado   = null;

// ── Ingredientes ──
function filtrarIngredientesCompra() {
  const input      = $('compra-ing-input').value.toLowerCase();
  const sugerencias = $('sugerencias-compra-ing');
  if (input.length < 2) { sugerencias.style.display = 'none'; return; }

  const existentes = ingredientes.filter(i =>
    i.nombre.toLowerCase().includes(input)
  ).slice(0, 8);

  if (existentes.length > 0) {
    sugerencias.innerHTML = existentes.map(i => `
      <div onclick="seleccionarIngredienteCompra(${i.id}, '${escapeHTML(i.nombre).replace(/'/g, "\\'")}', '${escapeHTML(i.unidad)}')">
        <strong>${escapeHTML(i.nombre)}</strong>
        <span style="font-size:.74rem;color:var(--text3);margin-left:8px">${formatCantidad(i.stock, i.unidad)} · ${escapeHTML(i.unidad)}</span>
      </div>
    `).join('');

    const coincidenciaExacta = existentes.some(i => i.nombre.toLowerCase() === input);
    if (!coincidenciaExacta) {
      sugerencias.innerHTML += `
        <div class="nuevo" onclick="mostrarCamposIngredienteNuevo()">
          <strong>➕ Agregar "${escapeHTML(input)}" como ingrediente nuevo</strong>
        </div>`;
    }
  } else {
    sugerencias.innerHTML = `
      <div class="nuevo" onclick="mostrarCamposIngredienteNuevo()">
        <strong>➕ Agregar "${escapeHTML(input)}" como ingrediente nuevo</strong>
      </div>`;
  }
  sugerencias.style.display = 'block';
}

function seleccionarIngredienteCompra(id, nombre, unidad) {
  $('compra-ing').value      = id;
  $('compra-ing-input').value = nombre;
  $('sugerencias-compra-ing').style.display = 'none';
  ingredienteSeleccionado = { id, nombre, unidad };
  $('campos-ingrediente-nuevo').style.display = 'none';

  const ingrediente = ing(id);
  if (ingrediente && ingrediente.precio > 0) $('compra-precio').value = ingrediente.precio;
  updateCompraPrev();
}

function mostrarCamposIngredienteNuevo() {
  $('compra-ing').value = 'nuevo';
  ingredienteSeleccionado = { id: 'nuevo', nombre: $('compra-ing-input').value };
  $('sugerencias-compra-ing').style.display = 'none';
  $('campos-ingrediente-nuevo').style.display = 'block';
  $('nuevo-ing-min').value = '';
  $('nuevo-ing-cat').selectedIndex = 0;
  $('nuevo-ing-unidad').selectedIndex = 0;
}

function mostrarSugerenciasIngredientesCompra() {
  const inputElement = $('compra-ing-input');
  if (inputElement && inputElement.value.length >= 2) filtrarIngredientesCompra();
}

function ocultarSugerenciasIngredientesCompra() {
  setTimeout(() => {
    const el = $('sugerencias-compra-ing');
    if (el) el.style.display = 'none';
  }, 200);
}

// ── Proveedores ──
function filtrarProveedoresCompra() {
  const textoProveedor = $('compra-prov-input').value.trim();
  if (
    proveedorSeleccionado &&
    proveedorSeleccionado.nombre &&
    proveedorSeleccionado.nombre.toLowerCase() !== textoProveedor.toLowerCase()
  ) {
    $('compra-prov').value = '';
    proveedorSeleccionado = null;
  }
  
  const input      = textoProveedor.toLowerCase();
  const sugerencias = $('sugerencias-compra-prov');
  if (input.length < 2) { sugerencias.style.display = 'none'; return; }

  const existentes = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(input)
  ).slice(0, 8);

  if (existentes.length > 0) {
    sugerencias.innerHTML = existentes.map(p => `
      <div onclick="seleccionarProveedorCompra(${p.id}, '${escapeHTML(p.nombre).replace(/'/g, "\\'")}')">
        <strong>${escapeHTML(p.nombre)}</strong>
      </div>
    `).join('');

    const coincidenciaExacta = existentes.some(p => p.nombre.toLowerCase() === input);
    if (!coincidenciaExacta) {
      sugerencias.innerHTML += `
        <div class="nuevo" onclick="mostrarCamposProveedorNuevo()">
          <strong>➕ Agregar "${escapeHTML(input)}" como proveedor nuevo</strong>
        </div>`;
    }
  } else {
    sugerencias.innerHTML = `
      <div class="nuevo" onclick="mostrarCamposProveedorNuevo()">
        <strong>➕ Agregar "${escapeHTML(input)}" como proveedor nuevo</strong>
      </div>`;
  }
  sugerencias.style.display = 'block';
}

function seleccionarProveedorCompra(id, nombre) {
  $('compra-prov').value      = id;
  $('compra-prov-input').value = nombre;
  $('sugerencias-compra-prov').style.display = 'none';
  proveedorSeleccionado = { id, nombre };
}

function mostrarCamposProveedorNuevo() {
  $('compra-prov').value = 'nuevo';
  proveedorSeleccionado  = { id: 'nuevo', nombre: $('compra-prov-input').value };
  $('sugerencias-compra-prov').style.display = 'none';
}

function mostrarSugerenciasProveedores() {
  const input = $('compra-prov-input').value;
  if (input.length >= 2) filtrarProveedoresCompra();
}

function ocultarSugerenciasProveedores() {
  setTimeout(() => {
    const el = $('sugerencias-compra-prov');
    if (el) el.style.display = 'none';
  }, 200);
}
