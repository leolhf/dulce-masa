// Sistema de gestión de lotes FIFO para ingredientes
// Permite consumo por primer entrada/primer salida y cálculo de costos reales

// Colección global de lotes (declarada en globals.js)

// Estructura de un lote:
// {
//   id: number,
//   ingredienteId: number,
//   cantidad: number,
//   cantidadRestante: number,
//   costoUnitario: number,
//   fechaIngreso: string, // YYYY-MM-DD
//   proveedorId: number, // opcional
//   numeroFactura: string, // opcional
//   nota: string // opcional
// }

// Función para crear un nuevo lote de ingrediente
function crearLote(ingredienteId, cantidad, costoUnitario, fechaIngreso = null, proveedorId = null, numeroFactura = null, nota = '') {
  const lote = {
    id: nextId.lote++,
    ingredienteId,
    cantidad,
    cantidadRestante: cantidad,
    costoUnitario,
    fechaIngreso: fechaIngreso || today(),
    proveedorId,
    compraId: null,
    numeroFactura,
    nota
  };
  
  lotesIngredientes.push(lote);
  return lote;
}

function crearLoteDesdeCompra(compra){
  if(!compra) return null;
  const lote = crearLote(
    compra.ingId,
    compra.qty,
    compra.precio,
    compra.fecha || today(),
    compra.provId || null,
    compra.id ? `COMP-${compra.id}` : null,
    compra.notas || ''
  );
  lote.compraId = compra.id || null;
  return lote;
}

function buscarLotePorCompra(compraId){
  return lotesIngredientes.find(l => l.compraId === compraId) || null;
}

function actualizarLoteDesdeCompra(compra){
  if(!compra) return null;
  const loteExistente = buscarLotePorCompra(compra.id);
  if(!loteExistente){
    return crearLoteDesdeCompra(compra);
  }
  const consumido = +(loteExistente.cantidad - loteExistente.cantidadRestante).toFixed(4);
  loteExistente.ingredienteId = compra.ingId;
  loteExistente.fechaIngreso = compra.fecha || today();
  loteExistente.proveedorId = compra.provId || null;
  loteExistente.costoUnitario = compra.precio;
  loteExistente.cantidad = compra.qty;
  loteExistente.cantidadRestante = Math.max(0, +(compra.qty - consumido).toFixed(4));
  loteExistente.numeroFactura = compra.id ? `COMP-${compra.id}` : null;
  loteExistente.nota = compra.notas || '';
  return loteExistente;
}

function eliminarLotePorCompra(compraId){
  const antes = lotesIngredientes.length;
  lotesIngredientes = lotesIngredientes.filter(l => l.compraId !== compraId);
  return antes !== lotesIngredientes.length;
}

// Función para obtener lotes disponibles de un ingrediente (ordenados por fecha, FIFO)
function obtenerLotesDisponibles(ingredienteId) {
  return lotesIngredientes
    .filter(lote => lote.ingredienteId === ingredienteId && lote.cantidadRestante > 0)
    .sort((a, b) => new Date(a.fechaIngreso) - new Date(b.fechaIngreso));
}

// Función para consumir ingredientes usando FIFO
// Retorna el costo real y los lotes consumidos
function consumirIngredientesFIFO(receta, tandas) {
  const detalleConsumo = [];
  let costoTotal = 0;
  
  receta.ings.forEach(ingReceta => {
    const ingrediente = ing(ingReceta.ingId);
    if (!ingrediente) return;
    
    const cantidadNecesaria = ingReceta.qty * tandas;
    const lotesDisponibles = obtenerLotesDisponibles(ingReceta.ingId);
    
    let cantidadPorConsumir = cantidadNecesaria;
    const consumoLotes = [];
    let costoIngrediente = 0;
    
    // Consumir de lotes en orden FIFO
    for (const lote of lotesDisponibles) {
      if (cantidadPorConsumir <= 0) break;
      
      const cantidadConsumida = Math.min(cantidadPorConsumir, lote.cantidadRestante);
      
      // Actualizar cantidad restante del lote
      lote.cantidadRestante = +(lote.cantidadRestante - cantidadConsumida).toFixed(4);
      
      // Calcular costo de este consumo
      const costoConsumo = cantidadConsumida * lote.costoUnitario;
      costoIngrediente += costoConsumo;
      
      consumoLotes.push({
        loteId: lote.id,
        cantidadConsumida,
        costoUnitario: lote.costoUnitario,
        costoTotal: costoConsumo
      });
      
      cantidadPorConsumir -= cantidadConsumida;
    }
    
    // Verificar si hubo stock suficiente
    if (cantidadPorConsumir > 0) {
      throw new Error(`Stock insuficiente para ${ingrediente.nombre}. Faltan ${cantidadPorConsumir} ${ingrediente.unidad}`);
    }
    
    costoTotal += costoIngrediente;
    
    detalleConsumo.push({
      ingredienteId: ingReceta.ingId,
      ingredienteNombre: ingrediente.nombre,
      cantidadTotal: cantidadNecesaria,
      costoTotal: costoIngrediente,
      lotesConsumidos: consumoLotes
    });
  });
  
  return {
    costoTotal,
    costoRealPorUnidad: receta.rinde > 0 ? costoTotal / receta.rinde : 0,
    detalleConsumo
  };
}

function consumirIngredientesFIFOPorReceta(receta, tandas){
  return consumirIngredientesFIFO(receta, tandas);
}

// Función para devolver ingredientes a lotes (cuando se elimina producción)
function devolverIngredientesAFIFO(receta, tandas) {
  const detalleDevolucion = [];
  
  receta.ings.forEach(ingReceta => {
    const ingrediente = ing(ingReceta.ingId);
    if (!ingrediente) return;
    
    const cantidadADevolver = ingReceta.qty * tandas;
    
    // Obtener lotes del ingrediente ordenados por fecha (más recientes primero)
    const lotesIngrediente = lotesIngredientes
      .filter(lote => lote.ingredienteId === ingReceta.ingId)
      .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso));
    
    let cantidadPorDevolver = cantidadADevolver;
    const devolucionLotes = [];
    
    // Devolver a lotes en orden inverso (LIFO para devolución)
    for (const lote of lotesIngrediente) {
      if (cantidadPorDevolver <= 0) break;
      
      const espacioDisponible = lote.cantidad - lote.cantidadRestante;
      const cantidadDevuelta = Math.min(cantidadPorDevolver, espacioDisponible);
      
      if (cantidadDevuelta > 0) {
        lote.cantidadRestante = +(lote.cantidadRestante + cantidadDevuelta).toFixed(4);
        
        devolucionLotes.push({
          loteId: lote.id,
          cantidadDevuelta,
          costoUnitario: lote.costoUnitario
        });
        
        cantidadPorDevolver -= cantidadDevuelta;
      }
    }
    
    detalleDevolucion.push({
      ingredienteId: ingReceta.ingId,
      ingredienteNombre: ingrediente.nombre,
      cantidadTotal: cantidadADevolver,
      lotesDevolucion: devolucionLotes
    });
  });
  
  return detalleDevolucion;
}

function devolverConsumoFIFO(consumoLotes = []){
  (consumoLotes || []).forEach(det => {
    (det.lotesConsumidos || []).forEach(cons => {
      const lote = lotesIngredientes.find(l => l.id === cons.loteId);
      if(!lote) return;
      lote.cantidadRestante = Math.min(
        lote.cantidad,
        +(lote.cantidadRestante + (cons.cantidadConsumida || 0)).toFixed(4)
      );
    });
  });
}

// Función para obtener stock actual de un ingrediente sumando todos sus lotes
function obtenerStockDesdeLotes(ingredienteId) {
  return lotesIngredientes
    .filter(lote => lote.ingredienteId === ingredienteId)
    .reduce((total, lote) => total + lote.cantidadRestante, 0);
}

// Función para obtener costo promedio ponderado de un ingrediente
function obtenerCostoPromedio(ingredienteId) {
  const lotes = obtenerLotesDisponibles(ingredienteId);
  if (lotes.length === 0) return 0;
  
  const costoTotal = lotes.reduce((sum, lote) => sum + (lote.cantidadRestante * lote.costoUnitario), 0);
  const cantidadTotal = lotes.reduce((sum, lote) => sum + lote.cantidadRestante, 0);
  
  return cantidadTotal > 0 ? costoTotal / cantidadTotal : 0;
}

// Función para sincronizar stock de ingredientes con lotes
function sincronizarStockConLotes() {
  ingredientes.forEach(ingrediente => {
    ingrediente.stock = obtenerStockDesdeLotes(ingrediente.id);
    ingrediente.precio = obtenerCostoPromedio(ingrediente.id);
  });
}

// Función para inicializar lotes desde el stock existente (migración)
function inicializarLotesDesdeStock() {
  // Si ya hay lotes, no hacer nada
  if (lotesIngredientes.length > 0) return;
  
  // Crear un lote inicial para cada ingrediente con stock existente
  ingredientes.forEach(ingrediente => {
    if (ingrediente.stock > 0) {
      crearLote(
        ingrediente.id,
        ingrediente.stock,
        ingrediente.precio || 0,
        today(), // Fecha de hoy como fecha de migración
        null,
        null,
        'Lote inicial - migración desde stock existente'
      );
    }
  });
  
  sincronizarStockConLotes();
}

function esLoteSospechosoFIFO(lote, ingrediente) {
  const cantidad = Number(lote.cantidad || 0);
  const costo = Number(lote.costoUnitario || 0);
  const unidad = String(ingrediente?.unidad || '').toLowerCase();
  const costoActual = Number(ingrediente?.precio || 0);

  if (['kg', 'l', 'lt', 'litro', 'litros'].includes(unidad) && cantidad > 100) return true;
  if (['g', 'gr', 'gramo', 'gramos', 'ml'].includes(unidad) && cantidad > 100000) return true;
  if (costoActual > 0 && costo > costoActual * 5) return true;
  return false;
}

// Función para obtener detalle de lotes de un ingrediente
function obtenerDetalleLotesIngrediente(ingredienteId) {
  const loteEnUso = obtenerLotesDisponibles(ingredienteId)[0];
  const ingrediente = typeof ing === 'function' ? ing(ingredienteId) : null;
  return lotesIngredientes
    .filter(lote => lote.ingredienteId === ingredienteId)
    .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso))
    .map(lote => ({
      ...lote,
      cantidadConsumida: +Math.max(0, Number(lote.cantidad || 0) - Number(lote.cantidadRestante || 0)).toFixed(4),
      porcentajeRestante: lote.cantidad > 0 ? (lote.cantidadRestante / lote.cantidad * 100).toFixed(1) : 0,
      estado: lote.cantidadRestante > 0 ? 'activo' : 'agotado',
      enUso: !!loteEnUso && lote.id === loteEnUso.id,
      sospechoso: esLoteSospechosoFIFO(lote, ingrediente)
    }));
}

function editarLoteFIFO(loteId, nuevaCantidad, nuevoCostoUnitario, nuevaNota = null) {
  const lote = lotesIngredientes.find(l => l.id === loteId);
  if (!lote) throw new Error('Lote no encontrado');

  const cantidad = Number(nuevaCantidad);
  const costoUnitario = Number(nuevoCostoUnitario);
  if (isNaN(cantidad) || cantidad < 0) throw new Error('Cantidad inválida');
  if (isNaN(costoUnitario) || costoUnitario < 0) throw new Error('Precio inválido');

  const anterior = {
    cantidad: Number(lote.cantidad || 0),
    costoUnitario: Number(lote.costoUnitario || 0),
    cantidadRestante: Number(lote.cantidadRestante || 0),
    nota: lote.nota || ''
  };
  const consumido = Math.max(0, anterior.cantidad - anterior.cantidadRestante);
  lote.cantidad = +cantidad.toFixed(4);
  lote.costoUnitario = +costoUnitario.toFixed(4);
  lote.cantidadRestante = Math.max(0, +(lote.cantidad - consumido).toFixed(4));
  if (nuevaNota !== null) lote.nota = String(nuevaNota || '').trim();

  const cambioNota = nuevaNota !== null && anterior.nota !== lote.nota;
  if (anterior.cantidad !== lote.cantidad || anterior.costoUnitario !== lote.costoUnitario || anterior.cantidadRestante !== lote.cantidadRestante || cambioNota) {
    if (!Array.isArray(lote.historialEdiciones)) lote.historialEdiciones = [];
    lote.historialEdiciones.push({
      fecha: new Date().toISOString(),
      tipo: 'edicion_manual',
      antes: anterior,
      despues: {
        cantidad: lote.cantidad,
        costoUnitario: lote.costoUnitario,
        cantidadRestante: lote.cantidadRestante,
        nota: lote.nota || ''
      }
    });
  }

  if (lote.compraId != null && Array.isArray(historialCompras)) {
    const compra = historialCompras.find(c => c.id == lote.compraId);
    if (compra) {
      compra.qty = lote.cantidad;
      compra.precio = lote.costoUnitario;
    }
  }

  sincronizarStockConLotes();
  return lote;
}

// Estima costo FIFO sin mutar stock/lotes
function estimarCostoFIFO(receta, tandas) {
  let costoTotal = 0;
  const detalleConsumo = [];

  receta.ings.forEach(ingReceta => {
    const ingrediente = ing(ingReceta.ingId);
    if (!ingrediente) return;

    const cantidadNecesaria = ingReceta.qty * tandas;
    const lotesDisponibles = obtenerLotesDisponibles(ingReceta.ingId)
      .map(l => ({ ...l }));
    let cantidadPorConsumir = cantidadNecesaria;
    let costoIngrediente = 0;
    const consumoLotes = [];

    for (const lote of lotesDisponibles) {
      if (cantidadPorConsumir <= 0) break;
      const cantidadConsumida = Math.min(cantidadPorConsumir, lote.cantidadRestante);
      const costoConsumo = cantidadConsumida * lote.costoUnitario;
      costoIngrediente += costoConsumo;
      consumoLotes.push({
        loteId: lote.id,
        cantidadConsumida,
        costoUnitario: lote.costoUnitario,
        costoTotal: costoConsumo
      });
      cantidadPorConsumir -= cantidadConsumida;
    }

    if (cantidadPorConsumir > 0) {
      throw new Error(`Stock insuficiente para ${ingrediente.nombre}. Faltan ${cantidadPorConsumir} ${ingrediente.unidad}`);
    }

    costoTotal += costoIngrediente;
    detalleConsumo.push({
      ingredienteId: ingReceta.ingId,
      ingredienteNombre: ingrediente.nombre,
      cantidadTotal: cantidadNecesaria,
      costoTotal: costoIngrediente,
      lotesConsumidos: consumoLotes
    });
  });

  return {
    costoTotal,
    costoRealPorUnidad: receta.rinde > 0 ? costoTotal / receta.rinde : 0,
    detalleConsumo
  };
}

// Revierte consumo exacto por lote (usado en edición/eliminación)
function devolverConsumoLotes(consumoLotes = []) {
  consumoLotes.forEach(dc => {
    (dc.lotesConsumidos || []).forEach(lc => {
      const lote = lotesIngredientes.find(l => l.id === lc.loteId);
      if (lote) {
        lote.cantidadRestante = Math.min(
          lote.cantidad,
          +(lote.cantidadRestante + lc.cantidadConsumida).toFixed(4)
        );
      }
    });
  });
  sincronizarStockConLotes();
}

// Reaplica un consumo previamente guardado (rollback de devoluciones)
function consumirDesdeDetalleLotes(consumoLotes = []) {
  (consumoLotes || []).forEach(dc => {
    (dc.lotesConsumidos || []).forEach(lc => {
      const lote = lotesIngredientes.find(l => l.id === lc.loteId);
      if (!lote) return;
      lote.cantidadRestante = Math.max(
        0,
        +(lote.cantidadRestante - (lc.cantidadConsumida || 0)).toFixed(4)
      );
    });
  });
  sincronizarStockConLotes();
}

function eliminarLotePorId(loteId) {
  const idx = lotesIngredientes.findIndex(l => l.id === loteId);
  if (idx === -1) return false;
  lotesIngredientes.splice(idx, 1);
  sincronizarStockConLotes();
  return true;
}

// Ajusta stock manual de un ingrediente preservando consistencia FIFO
function ajustarStockManualEnLotes(ingredienteId, nuevoStock, costoUnitario = null, nota = 'Ajuste manual de inventario') {
  const stock = Math.max(0, +Number(nuevoStock || 0).toFixed(4));
  const lotesIng = lotesIngredientes.filter(l => l.ingredienteId === ingredienteId);
  const costo = costoUnitario !== null && !isNaN(costoUnitario)
    ? +Number(costoUnitario).toFixed(4)
    : (() => {
        const i = ing(ingredienteId);
        return i && !isNaN(i.precio) ? +Number(i.precio).toFixed(4) : 0;
      })();
  const stockActual = lotesIng.reduce((acc, l) => acc + (l.cantidadRestante || 0), 0);
  const delta = +(stock - stockActual).toFixed(4);

  if (delta > 0) {
    // Entrada manual adicional
    crearLote(ingredienteId, delta, costo, today(), null, null, nota);
  } else if (delta < 0) {
    // Salida manual: consumir de lotes más recientes para no destruir historial
    let pendiente = Math.abs(delta);
    const orden = lotesIng
      .filter(l => l.cantidadRestante > 0)
      .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso));
    for (const lote of orden) {
      if (pendiente <= 0) break;
      const take = Math.min(pendiente, lote.cantidadRestante);
      lote.cantidadRestante = +(lote.cantidadRestante - take).toFixed(4);
      pendiente -= take;
    }
  }
  sincronizarStockConLotes();
}
