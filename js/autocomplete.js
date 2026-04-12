// ══════════════ AUTOCOMPLETAR CLIENTES ══════════════
function obtenerClientesUnicos() {
  const clientes = new Set();
  
  // Extraer clientes de ventas
  if (ventas) {
    ventas.forEach(v => {
      if (v.nota && v.nota.trim()) {
        clientes.add(v.nota.trim());
      }
    });
  }
  
  // Extraer clientes de pedidos
  if (pedidos) {
    pedidos.forEach(p => {
      if (p.cliente && p.cliente.trim()) {
        clientes.add(p.cliente.trim());
      }
    });
  }
  
  return Array.from(clientes).sort();
}

function mostrarSugerenciasVentas(query) {
  const div = $('sugerencias-ventas');
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  
  const clientes = obtenerClientesUnicos();
  const filtrados = clientes.filter(cliente => 
    cliente.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8); // Limitar a 8 sugerencias
  
  if (filtrados.length === 0) {
    div.style.display = 'none';
    return;
  }
  
  div.innerHTML = filtrados.map(cliente => `
    <div style="padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border2);transition:background .2s" 
         onmouseover="this.style.background='var(--cream)'" 
         onmouseout="this.style.background='white'"
         onclick="seleccionarClienteVenta('${cliente.replace(/'/g, "\\'")}')">
      ${cliente}
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function mostrarSugerenciasPedidos(query) {
  const div = $('sugerencias-pedidos');
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  
  const clientes = obtenerClientesUnicos();
  const filtrados = clientes.filter(cliente => 
    cliente.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8); // Limitar a 8 sugerencias
  
  if (filtrados.length === 0) {
    div.style.display = 'none';
    return;
  }
  
  div.innerHTML = filtrados.map(cliente => `
    <div style="padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border2);transition:background .2s" 
         onmouseover="this.style.background='var(--cream)'" 
         onmouseout="this.style.background='white'"
         onclick="seleccionarClientePedido('${cliente.replace(/'/g, "\\'")}')">
      ${cliente}
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function seleccionarClienteVenta(cliente) {
  $('venta-nota').value = cliente;
  $('sugerencias-ventas').style.display = 'none';
}

function seleccionarClientePedido(cliente) {
  $('pedido-cliente').value = cliente;
  $('sugerencias-pedidos').style.display = 'none';
}

function ocultarSugerenciasVentas() {
  setTimeout(() => {
    $('sugerencias-ventas').style.display = 'none';
  }, 200); // Pequeño delay para permitir clic en sugerencia
}

function ocultarSugerenciasPedidos() {
  setTimeout(() => {
    $('sugerencias-pedidos').style.display = 'none';
  }, 200); // Pequeño delay para permitir clic en sugerencia
}

// ══════════════ AUTOCOMPLETAR INGREDIENTES EN RECETAS ══════════════
function mostrarSugerenciasIngredientes(rowIndex, query) {
  const div = $(`sugerencias-ingredientes-${rowIndex}`);
  const input = $(`ri-ing-${rowIndex}`);
  const hiddenSelect = $(`ri-ing-hidden-${rowIndex}`);
  
  if (!div || !input || !hiddenSelect) {
    return;
  }
  
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  
  // Ordenar ingredientes alfabéticamente
  const ingredientesOrdenados = [...ingredientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const filtrados = ingredientesOrdenados.filter(ingrediente => 
    ingrediente.nombre.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10); // Limitar a 10 sugerencias
  
  if (filtrados.length === 0) {
    div.style.display = 'none';
    return;
  }
  
  div.innerHTML = filtrados.map(ingrediente => `
    <div style="padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border2);transition:background .2s" 
         onmouseover="this.style.background='var(--cream)'" 
         onmouseout="this.style.background='white'"
         data-ing-id="${ingrediente.id}" data-row="${rowIndex}"
         onclick="seleccionarIngredientePorId(this)">
      <div style="font-weight:500">${ingrediente.nombre}</div>
      <div style="font-size:.73rem;color:var(--text3)">Stock: ${formatCantidad(ingrediente.stock, ingrediente.unidad)} · ${ingrediente.unidad}</div>
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function mostrarTodosLosIngredientes(rowIndex) {
  const div = $(`sugerencias-ingredientes-${rowIndex}`);
  const input = $(`ri-ing-${rowIndex}`);
  const hiddenSelect = $(`ri-ing-hidden-${rowIndex}`);
  
  // Ordenar ingredientes alfabéticamente
  const ingredientesOrdenados = [...ingredientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  
  div.innerHTML = ingredientesOrdenados.map(ingrediente => `
    <div style="padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border2);transition:background .2s" 
         onmouseover="this.style.background='var(--cream)'" 
         onmouseout="this.style.background='white'"
         data-ing-id="${ingrediente.id}" data-row="${rowIndex}"
         onclick="seleccionarIngredientePorId(this)">
      <div style="font-weight:500">${ingrediente.nombre}</div>
      <div style="font-size:.73rem;color:var(--text3)">Stock: ${formatCantidad(ingrediente.stock, ingrediente.unidad)} · ${ingrediente.unidad}</div>
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function seleccionarIngredientePorId(el) {
  const ingId = parseInt(el.dataset.ingId);
  const rowIndex = parseInt(el.dataset.row);
  const i = ing(ingId);
  if(!i) return;
  seleccionarIngrediente(rowIndex, i.nombre, ingId, i.unidad);
}
function seleccionarIngrediente(rowIndex, nombre, id, unidad) {
  const input = $(`ri-ing-${rowIndex}`);
  const hiddenSelect = $(`ri-ing-hidden-${rowIndex}`);
  const unitInput = $(`ri-unit-${rowIndex}`);
  const div = $(`sugerencias-ingredientes-${rowIndex}`);
  
  input.value = nombre;
  hiddenSelect.value = id;
  unitInput.value = unidad;
  div.style.display = 'none';
}

function ocultarSugerenciasIngredientes(rowIndex) {
  const div = $(`sugerencias-ingredientes-${rowIndex}`);
  if (div) {
    setTimeout(() => {
      div.style.display = 'none';
    }, 200);
  }
} // Pequeño delay para permitir clic en sugerencia

