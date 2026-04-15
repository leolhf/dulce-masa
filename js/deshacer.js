// ══════════════════════════════════════════════
//  SISTEMA DE DESHACER
// ══════════════════════════════════════════════
const _DESHACER_KEY = 'dulcemasa_historial_deshacer';
const _DESHACER_MAX = 20;
const _DESHACER_TTL = 24 * 60 * 60 * 1000; // 24 horas en ms
let   _historial    = [];

// ── Persistencia ──────────────────────────────

function _cargarHistorial() {
  try {
    const raw = localStorage.getItem(_DESHACER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const ahora  = Date.now();
    _historial   = parsed.filter(a => (ahora - a.timestamp) < _DESHACER_TTL);
    if (_historial.length !== parsed.length) _guardarHistorial();
  } catch(e) {
    console.warn('[Deshacer] Error al cargar historial:', e);
    _historial = [];
  }
}

function _guardarHistorial() {
  try {
    localStorage.setItem(_DESHACER_KEY, JSON.stringify(_historial));
  } catch(e) {
    console.warn('[Deshacer] Error al guardar historial:', e);
  }
}

// ── Botón ──────────────────────────────────────

function actualizarBotonDeshacer() {
  const btn = document.getElementById('btn-deshacer');
  if (!btn) return;
  if (_historial.length > 0) {
    const seg = Math.floor((Date.now() - _historial[0].timestamp) / 1000);
    btn.disabled        = false;
    btn.style.opacity   = '1';
    btn.style.cursor    = 'pointer';
    btn.innerHTML = seg < 60 ? `↶ Deshacer (${seg}s)` : '↶ Deshacer';
  } else {
    btn.disabled        = true;
    btn.style.opacity   = '0.5';
    btn.style.cursor    = 'not-allowed';
    btn.innerHTML       = '↶ Deshacer';
  }
}

// ── Guardar acción ─────────────────────────────

function guardarAccionParaDeshacer(tipo, datos, estadoAnterior) {
  try {
    _historial.unshift({
      tipo,
      datos,
      estadoAnterior: JSON.parse(JSON.stringify(estadoAnterior)),
      timestamp: Date.now()
    });
    if (_historial.length > _DESHACER_MAX) _historial.length = _DESHACER_MAX;
    _guardarHistorial();
  } catch(e) {
    console.warn('[Deshacer] Error al guardar acción:', e);
  }
  // setTimeout garantiza que se ejecuta DESPUÉS de cualquier re-render
  setTimeout(actualizarBotonDeshacer, 0);
}

// ── Ejecutar deshacer ──────────────────────────

async function deshacerUltimaAccion() {
  if (_historial.length === 0) { toast('⚠ No hay acciones para deshacer'); return; }

  const accion = _historial.shift();
  try {
    switch (accion.tipo) {
      case 'venta':                await _deshacerVenta(accion);              break;
      case 'pedido':               await _deshacerPedido(accion);             break;
      case 'compra':               await _deshacerCompra(accion);             break;
      case 'produccion':           await _deshacerProduccion(accion);         break;
      case 'cambio_estado_pedido': await _deshacerCambioEstadoPedido(accion); break;
      case 'ingrediente':          await _deshacerIngrediente(accion);        break;
      case 'receta':               await _deshacerReceta(accion);             break;
      case 'gasto_fijo':           await _deshacerGastoFijo(accion);          break;
      case 'extraccion':           await _deshacerExtraccion(accion);         break;
      case 'prestamo':             await _deshacerPrestamo(accion);           break;
      case 'proveedor':           await _deshacerProveedor(accion);         break;
      default:
        toast('⚠ Tipo de acción no reconocida');
        _historial.unshift(accion);
        return;
    }

    _guardarHistorial();
    toast('✅ Acción deshecha correctamente');

    // Refrescar vista actual
    const sec = typeof curSection !== 'undefined' ? curSection : '';
    if (sec === 'dashboard')  renderDashboard();
    if (sec === 'inventario') renderInventario();
    if (sec === 'recetas')    renderRecetas();
    if (sec === 'produccion') renderProduccion();
    if (sec === 'pedidos')  { renderPedidos(); }
    if (sec === 'ventas')   { renderVentas(); }
    if (sec === 'costos')     renderCostos();
    if (sec === 'finanzas')   renderFinanzas();

    // Refrescar vistas de stock
    if (typeof refreshAllStockViews === 'function') {
      refreshAllStockViews();
    }

    // Guardar datos al final de todo
    saveData();

  } catch(err) {
    console.error('[Deshacer] Error al deshacer:', err);
    toast('⚠ Error al deshacer la acción');
    _historial.unshift(accion); // revertir
  }
  actualizarBotonDeshacer();
}

// ── Handlers por tipo ──────────────────────────

function _deshacerVenta(accion) {
  if (!ventas) return;
  const idx = ventas.findIndex(v => v.id === accion.datos.id);
  if (idx !== -1) ventas.splice(idx, 1);
  // Restaurar stock del producto usando la función stockProd
  if (accion.datos.recetaId) {
    const sp = stockProd(accion.datos.recetaId);
    if (sp) {
      sp.stock = accion.estadoAnterior.stockProducto ?? (sp.stock + accion.datos.unidades);
    }
  }
}

function _deshacerPedido(accion) {
  if (!pedidos) return;
  const idx = pedidos.findIndex(p => p.id === accion.datos.id);
  if (idx !== -1) pedidos.splice(idx, 1);
}

function _deshacerCompra(accion) {
  const c = accion.datos;
  if (historialCompras) {
    const idx = historialCompras.findIndex(x => x.id === c.id);
    if (idx !== -1) historialCompras.splice(idx, 1);
  }
  if (c.ingId && ingredientes) {
    const ing = ingredientes.find(i => i.id == c.ingId);
    if (ing) {
      ing.stock = accion.estadoAnterior.stockIngrediente ?? Math.max(0, ing.stock - c.qty);
      if (accion.estadoAnterior.precioIngrediente != null) ing.precio = accion.estadoAnterior.precioIngrediente;
    }
  }
}

function _deshacerProduccion(accion) {
  const prod = accion.datos;
  if (producciones) {
    const idx = producciones.findIndex(p => p.id === prod.id);
    if (idx !== -1) producciones.splice(idx, 1);
  }
  
  // Restaurar la producción eliminada (deshacer eliminación)
  if (accion.estadoAnterior.valoresAnteriores) {
    producciones.push(accion.estadoAnterior.valoresAnteriores);
    console.log('[Deshacer] Producción restaurada:', accion.estadoAnterior.valoresAnteriores);
    
    // Restaurar ingredientes consumidos
    if (prod.ingredientesUsados && ingredientes) {
      console.log('[Deshacer] Restaurando ingredientes consumidos...');
      prod.ingredientesUsados.forEach(u => {
        const ing = ingredientes.find(i => i.id == u.id);
        if (ing) {
          ing.stock = (ing.stock || 0) + u.cantidad;
          console.log('[Deshacer] Ingrediente restaurado:', ing.nombre, 'stock:', ing.stock);
        }
      });
    }
    
    // Restar stock del producto terminado
    if (prod.recetaId && stockProductos) {
      console.log('[Deshacer] Restando stock del producto...');
      const sp = stockProductos.find(s => s.recetaId == prod.recetaId);
      if (sp) {
        const uds = prod.unidadesReales || (prod.tandas * (recetas?.find(r=>r.id==prod.recetaId)?.rinde||0));
        sp.stock = Math.max(0, sp.stock - uds);
        console.log('[Deshacer] Stock del producto actualizado:', sp.stock);
      }
    }
    
    // Forzar actualización del inventario
    setTimeout(() => {
      console.log('[Deshacer] Forzando actualización del inventario...');
      if (typeof renderInventario === 'function') {
        renderInventario();
        console.log('[Deshacer] Inventario actualizado');
      }
    }, 300);
  }
}

function _deshacerCambioEstadoPedido(accion) {
  const pedido = (pedidos||[]).find(p => p.id === accion.datos.id);
  if (!pedido) return;
  pedido.estado = accion.estadoAnterior.estado;
  if (accion.estadoAnterior.fechaEntregaReal !== undefined) pedido.fechaEntregaReal = accion.estadoAnterior.fechaEntregaReal;
  if (accion.estadoAnterior.fechaCobro      !== undefined) pedido.fechaCobro       = accion.estadoAnterior.fechaCobro;
  if (accion.estadoAnterior.ventaIds        !== undefined) pedido.ventaIds         = accion.estadoAnterior.ventaIds;
}

function _deshacerIngrediente(accion) {
  console.log('[Deshacer] Restaurando ingrediente:', accion);
  if (!ingredientes) return;
  if (accion.estadoAnterior.esNuevo) {
    const idx = ingredientes.findIndex(i => i.id === accion.datos.id);
    if (idx !== -1) ingredientes.splice(idx, 1);
  } else {
    // Restaurar el ingrediente eliminado
    if (accion.estadoAnterior.valoresAnteriores) {
      console.log('[Deshacer] Restaurando ingrediente con datos:', accion.estadoAnterior.valoresAnteriores);
      ingredientes.push(accion.estadoAnterior.valoresAnteriores);
      console.log('[Deshacer] Ingredientes después de restaurar:', ingredientes.length);
    }
    
    // Restaurar las recetas afectadas
    if (accion.estadoAnterior.recetasAfectadas && recetas) {
      console.log('[Deshacer] Restaurando recetas afectadas:', accion.estadoAnterior.recetasAfectadas.length);
      accion.estadoAnterior.recetasAfectadas.forEach(recetaOriginal => {
        const idx = recetas.findIndex(r => r.id === recetaOriginal.id);
        if (idx !== -1) {
          recetas[idx] = {...recetaOriginal};
        }
      });
    }
  }
}

function _deshacerReceta(accion) {
  console.log('[Deshacer] Restaurando receta:', accion);
  if (!recetas) return;
  
  if (accion.estadoAnterior.esNuevo) {
    // Eliminar receta nueva (deshacer creación)
    const idx = recetas.findIndex(r => r.id === accion.datos.id);
    if (idx !== -1) {
      recetas.splice(idx, 1);
      console.log('[Deshacer] Receta nueva eliminada:', accion.datos.id);
    }
  } else {
    // Restaurar receta eliminada (deshacer eliminación)
    if (accion.estadoAnterior.valoresAnteriores) {
      console.log('[Deshacer] Restaurando receta eliminada con datos:', accion.estadoAnterior.valoresAnteriores);
      recetas.push(accion.estadoAnterior.valoresAnteriores);
      console.log('[Deshacer] Receta restaurada, total recetas:', recetas.length);
    }
  }
}

function _deshacerGastoFijo(accion) {
  if (!gastosFijos) return;
  if (accion.estadoAnterior.esNuevo) {
    const idx = gastosFijos.findIndex(g => g.id === accion.datos.id);
    if (idx !== -1) gastosFijos.splice(idx, 1);
  } else {
    const g = gastosFijos.find(g => g.id === accion.datos.id);
    if (g) Object.assign(g, accion.estadoAnterior.valoresAnteriores);
  }
}

function _deshacerExtraccion(accion) {
  if (!extracciones) return;
  const idx = extracciones.findIndex(e => e.id === accion.datos.id);
  if (idx !== -1) extracciones.splice(idx, 1);
  if (accion.estadoAnterior.capital !== undefined) capital = accion.estadoAnterior.capital;
}

function _deshacerPrestamo(accion) {
  if (!prestamos) return;
  const idx = prestamos.findIndex(p => p.id === accion.datos.id);
  if (idx !== -1) prestamos.splice(idx, 1);
  if (accion.estadoAnterior.capital !== undefined) capital = accion.estadoAnterior.capital;
}

function _deshacerProveedor(accion) {
  if (!proveedores) return;
  if (accion.estadoAnterior.esNuevo) {
    const idx = proveedores.findIndex(p => p.id === accion.datos.id);
    if (idx !== -1) proveedores.splice(idx, 1);
  } else {
    if (accion.estadoAnterior.valoresAnteriores) {
      proveedores.push(accion.estadoAnterior.valoresAnteriores);
    }
  }
}

// ── Inicialización ─────────────────────────────

_cargarHistorial();
// Actualizar label del botón cada 30s (muestra "hace Xs")
setInterval(actualizarBotonDeshacer, 30000);
// Primer render del botón (DOM ya disponible porque scripts están al final del body)
document.addEventListener('DOMContentLoaded', actualizarBotonDeshacer);
if (document.readyState !== 'loading') actualizarBotonDeshacer();

// ── API pública ────────────────────────────────
window.guardarAccionParaDeshacer = guardarAccionParaDeshacer;
window.deshacerUltimaAccion      = deshacerUltimaAccion;
window.actualizarBotonDeshacer   = actualizarBotonDeshacer;
