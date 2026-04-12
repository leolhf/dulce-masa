// ══════════════ VARIABLES GLOBALES ══════════════
// Extraído de helpers.js para separación de responsabilidades

// Colecciones de datos — se inicializan en data-init.js / buildData()
let ingredientes, recetas, producciones, ventas, pedidos, stockProductos, proveedores, historialCompras, nextId;
let catRecetas = ['Tortas','Cupcakes','Galletas','Facturas','Panes','Alfajores','Otros'];
let gastosFijos = [];    // {id, nombre, monto, periodo:'mensual'|'semanal'|'anual'}
let extracciones = [];   // {id, fecha, monto, tipo, concepto, periodo}
let prestamos;           // {id, fecha, prestamista, monto, concepto, devolver:bool, pctPorProduccion, pagos:[...]}
let metas = [];          // {id, nombre, tipo, objetivo, fechaLimite, nota, valorActual}

// Variaciones temporales para producción actual
let variacionesProduccion = [];
let recetaBaseActual = null;

// Constantes de navegación
const TITLES = {
  dashboard: 'Panel general',
  inventario: 'Inventario de ingredientes',
  recetas: 'Recetas',
  producción: 'Producción',
  pedidos: 'Pedidos',
  costos: 'Análisis de costos',
  ventas: 'Ventas y ganancias',
  historial: 'Compras de insumos',
  proveedores: 'Proveedores',
  finanzas: 'Finanzas del negocio'
};
const EXPORTS = ['inventario','recetas','historial','produccion','proveedores','ventas'];
let curSection = 'dashboard';

// Manejo de archivo (File System Access API)
let _fileHandle = null;
let _ultimoGuardado = null;
let _guardandoArchivo = false;
