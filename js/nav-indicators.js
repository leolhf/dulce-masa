// ════════════ FUNCIONES DE INDICADORES DE MENÚ ══════════════
function updateNavIndicators() {
  // Actualizar indicadores de pedidos
  const pedidosNav = document.getElementById('nav-pedidos');
  if (pedidosNav && pedidos) {
    const urgentes = pedidos.filter(p => {
      if (p.estado === 'entregado') return false;
      if (!p.fechaEntrega) return false;
      const ahora = getStartOfDay();
      const limite = new Date(ahora.getTime() + 2*24*60*60*1000);
      const fe = new Date(p.fechaEntrega);
      return fe >= ahora && fe <= limite;
    });
    
    pedidosNav.classList.remove('has-alert', 'has-warning', 'has-success');
    if (urgentes.length > 0) {
      pedidosNav.classList.add('has-alert');
      pedidosNav.setAttribute('data-tooltip', `${urgentes.length} pedido${urgentes.length > 1 ? 's' : ''} urgente${urgentes.length > 1 ? 's' : ''}`);
    } else {
      pedidosNav.setAttribute('data-tooltip', 'Gestión de pedidos y entregas');
    }
  }
  
  // Actualizar indicadores de inventario
  const invNav = document.getElementById('nav-inv');
  if (invNav && ingredientes) {
    const criticos = ingredientes.filter(i => i.stock <= i.min);
    invNav.classList.remove('has-alert', 'has-warning', 'has-success');
    if (criticos.length > 0) {
      invNav.classList.add('has-warning');
      invNav.setAttribute('data-tooltip', `${criticos.length} ingrediente${criticos.length > 1 ? 's' : ''} crítico${criticos.length > 1 ? 's' : ''}`);
    } else {
      invNav.setAttribute('data-tooltip', 'Gestión de ingredientes y stock');
    }
  }
  
  // Actualizar indicadores de producción
  const prodNav = document.querySelector('[onclick*="produccion"]');
  if (prodNav && producciones) {
    const hoy = today();
    const produccionesHoy = producciones.filter(p => p.fecha === hoy);
    prodNav.classList.remove('has-alert', 'has-warning', 'has-success');
    if (produccionesHoy.length > 0) {
      prodNav.classList.add('has-success');
      prodNav.setAttribute('data-tooltip', `${produccionesHoy.length} producción${produccionesHoy.length > 1 ? 'es' : ''} hoy`);
    } else {
      prodNav.setAttribute('data-tooltip', 'Control de fabricación');
    }
  }
}

// Llamar a la función cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  updateNavIndicators();
  // Inicializar sección de producción si es la sección actual
  if(curSection === 'produccion' || !curSection){
    renderProduccion();
  }
});

// Actualizar indicadores periódicamente
setInterval(updateNavIndicators, 30000); // Cada 30 segundos

// ══════════════ FUNCIONES DE AUTOCOMPLETADO PARA VARIACIONES ══════════════
function mostrarSugerenciasIngredientesVariacion(query) {
  const div = $('var-sugerencias-ingredientes');
  if (!div) return;
  
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  
  const filtrados = ingredientes.filter(i => 
    i.nombre.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);
  
  if (filtrados.length === 0) {
    div.style.display = 'none';
    return;
  }
  
  div.innerHTML = filtrados.map(i => `
    <div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border2);font-size:.85rem"
         onmouseover="this.style.background='var(--cream)'"
         onmouseout="this.style.background='white'"
         onclick="seleccionarIngredienteVariacion(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', '${i.unidad}')">
      <div style="font-weight:500">${i.nombre}</div>
      <div style="font-size:.75rem;color:var(--text3)">Stock: ${formatCantidad(i.stock, i.unidad)}</div>
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function ocultarSugerenciasIngredientesVariacion() {
  const div = $('var-sugerencias-ingredientes');
  if (div) div.style.display = 'none';
}

function seleccionarIngredienteVariacion(id, nombre, unidad) {
  $('var-ingrediente-nuevo-text').value = nombre;
  
  // Crear campo hidden para guardar el ID
  let hiddenField = $('var-ingrediente-nuevo-hidden');
  if (!hiddenField) {
    hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.id = 'var-ingrediente-nuevo-hidden';
    $('var-campos-dinamicos').appendChild(hiddenField);
  }
  hiddenField.value = id;
  
  ocultarSugerenciasIngredientesVariacion();
}

function mostrarSugerenciasIngredientesReemplazo(query) {
  const div = $('var-sugerencias-reemplazo');
  if (!div) return;
  
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  
  const filtrados = ingredientes.filter(i => 
    i.nombre.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);
  
  if (filtrados.length === 0) {
    div.style.display = 'none';
    return;
  }
  
  div.innerHTML = filtrados.map(i => `
    <div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border2);font-size:.85rem"
         onmouseover="this.style.background='var(--cream)'"
         onmouseout="this.style.background='white'"
         onclick="seleccionarIngredienteReemplazo(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', '${i.unidad}')">
      <div style="font-weight:500">${i.nombre}</div>
      <div style="font-size:.75rem;color:var(--text3)">Stock: ${formatCantidad(i.stock, i.unidad)}</div>
    </div>
  `).join('');
  
  div.style.display = 'block';
}

function ocultarSugerenciasIngredientesReemplazo() {
  const div = $('var-sugerencias-reemplazo');
  if (div) div.style.display = 'none';
}

function seleccionarIngredienteReemplazo(id, nombre, unidad) {
  $('var-ing-nuevo-text').value = nombre;
  
  // Crear campo hidden para guardar el ID
  let hiddenField = $('var-ing-nuevo-hidden');
  if (!hiddenField) {
    hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.id = 'var-ing-nuevo-hidden';
    $('var-campos-dinamicos').appendChild(hiddenField);
  }
  hiddenField.value = id;
  
  ocultarSugerenciasIngredientesReemplazo();
}
