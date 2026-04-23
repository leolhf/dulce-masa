// Compatibilidad bidireccional entre formato legacy y eventos para Google Drive
// Este archivo se debe incluir después de google-drive.js

// Convierte eventos del móvil v2 al formato legacy para compatibilidad con escritorio
function convertEventsToLegacyData(events) {
  const legacyData = {
    ingredientes: [],
    recetas: [],
    ventas: [],
    pedidos: [],
    historialCompras: [],
    producciones: [],
    mermas: [],
    extracciones: [],
    proveedores: [],
    stockProductos: [],
    lotesIngredientes: [],
    catRecetas: ['Tortas','Cupcakes','Galletas','Facturas','Panes','Alfajores','Otros'],
    gastosFijos: [],
    prestamos: [],
    metas: [],
    capital_ajustes: [],
    nextId: {
      ing: 1, rec: 1, prod: 1, venta: 1, comp: 1,
      prov: 1, pedido: 1, ext: 1, prestamo: 1, lote: 1, merma: 1
    }
  };
  
  // Ordenar eventos por timestamp para procesar en secuencia
  const sortedEvents = [...events].sort((a,b) => a.ts.localeCompare(b.ts));
  
  for (const ev of sortedEvents) {
    const p = ev.payload;
    
    switch(ev.type) {
      case 'add_ingrediente':
        if (!legacyData.ingredientes.find(i => i.id === p.id)) {
          legacyData.ingredientes.push({...p});
          legacyData.nextId.ing = Math.max(legacyData.nextId.ing, (p.id || 0) + 1);
        }
        break;
        
      case 'add_receta':
        if (!legacyData.recetas.find(r => r.id === p.id)) {
          legacyData.recetas.push({
            ...p,
            precioVenta: p.precio || 0,
            tiempo: 60,
            desc: '',
            ings: []
          });
          legacyData.nextId.rec = Math.max(legacyData.nextId.rec, (p.id || 0) + 1);
        }
        break;
        
      case 'add_venta':
        if (!legacyData.ventas.find(v => v.id === p.id)) {
          legacyData.ventas.push({
            ...p,
            propina: 0
          });
          legacyData.nextId.venta = Math.max(legacyData.nextId.venta, (p.id || 0) + 1);
        }
        break;
        
      case 'add_pedido':
        if (!legacyData.pedidos.find(existing => existing.id === p.id)) {
          legacyData.pedidos.push({
            ...p,
            notas: '',
            ventaIds: []
          });
          legacyData.nextId.pedido = Math.max(legacyData.nextId.pedido, (p.id || 0) + 1);
        }
        break;
        
      case 'add_compra':
        if (!legacyData.historialCompras.find(c => c.id === p.id)) {
          legacyData.historialCompras.push({
            ...p,
            notas: ''
          });
          legacyData.nextId.comp = Math.max(legacyData.nextId.comp, (p.id || 0) + 1);
        }
        break;
        
      case 'add_produccion':
        if (!legacyData.producciones.find(existing => existing.id === p.id)) {
          legacyData.producciones.push({
            ...p,
            nota: ''
          });
          legacyData.nextId.prod = Math.max(legacyData.nextId.prod, (p.id || 0) + 1);
        }
        break;
        
      case 'add_merma':
        if (!legacyData.mermas.find(m => m.id === p.id)) {
          legacyData.mermas.push({
            ...p,
            nota: ''
          });
          legacyData.nextId.merma = Math.max(legacyData.nextId.merma, (p.id || 0) + 1);
        }
        break;
        
      case 'add_extraccion':
        if (!legacyData.extracciones.find(e => e.id === p.id)) {
          legacyData.extracciones.push({...p});
          legacyData.nextId.ext = Math.max(legacyData.nextId.ext, (p.id || 0) + 1);
        }
        break;
        
      case 'add_proveedor':
        if (!legacyData.proveedores.find(existing => existing.id === p.id)) {
          legacyData.proveedores.push({
            ...p,
            productos: '',
            dir: '',
            notas: ''
          });
          legacyData.nextId.prov = Math.max(legacyData.nextId.prov, (p.id || 0) + 1);
        }
        break;
    }
  }
  
  // Actualizar nextId basado en los IDs máximos reales
  const updateNextIds = (array, key) => {
    if (array.length > 0) {
      const maxId = Math.max(...array.map(item => Number(item.id || 0)));
      legacyData.nextId[key] = Math.max(legacyData.nextId[key], maxId + 1);
    }
  };
  
  updateNextIds(legacyData.ingredientes, 'ing');
  updateNextIds(legacyData.recetas, 'rec');
  updateNextIds(legacyData.ventas, 'venta');
  updateNextIds(legacyData.pedidos, 'pedido');
  updateNextIds(legacyData.historialCompras, 'comp');
  updateNextIds(legacyData.producciones, 'prod');
  updateNextIds(legacyData.mermas, 'merma');
  updateNextIds(legacyData.extracciones, 'ext');
  updateNextIds(legacyData.proveedores, 'prov');
  
  return legacyData;
}

