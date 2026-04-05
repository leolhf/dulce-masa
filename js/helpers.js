// ══════════════ ZONA HORARIA GLOBAL ══════════════
const TIMEZONE_CONFIG = {
  timezone: 'America/Argentina/Buenos_Aires', // Zona horaria predeterminada
  locale: 'es-AR' // Idioma y formato regional
};

// Función para obtener la fecha actual en la zona horaria configurada
function today() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone })).toISOString().split('T')[0];
}

// Función para formatear fecha con zona horaria consistente
function formatDateWithTimezone(date, options = {}) {
  const dateObj = new Date(date);
  const defaultOptions = {
    timeZone: TIMEZONE_CONFIG.timezone,
    locale: TIMEZONE_CONFIG.locale,
    ...options
  };
  
  if (defaultOptions.format === 'date') {
    return dateObj.toLocaleDateString(defaultOptions.locale, { timeZone: defaultOptions.timeZone });
  } else if (defaultOptions.format === 'time') {
    return dateObj.toLocaleTimeString(defaultOptions.locale, { timeZone: defaultOptions.timeZone });
  } else if (defaultOptions.format === 'datetime') {
    return dateObj.toLocaleString(defaultOptions.locale, { timeZone: defaultOptions.timeZone });
  }
  
  return dateObj.toLocaleDateString(defaultOptions.locale, { timeZone: defaultOptions.timeZone });
}

// Función para crear fecha en zona horaria local
function createLocalDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Ajustar para que la fecha se interprete en la zona horaria configurada
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() + offset);
  return localDate;
}

// Función para obtener inicio del día en zona horaria configurada
function getStartOfDay(date = new Date()) {
  const dateObj = new Date(date);
  const startOfDay = new Date(dateObj.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone }));
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

// Función para obtener fin del día en zona horaria configurada
function getEndOfDay(date = new Date()) {
  const dateObj = new Date(date);
  const endOfDay = new Date(dateObj.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone }));
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

// Función para crear fecha en zona horaria configurada (reemplazo directo de new Date())
function createDate(dateString) {
  if (!dateString) return getStartOfDay();
  
  // Si es formato ISO (YYYY-MM-DD), mantener la fecha exacta sin conversión de zona horaria
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  const date = new Date(dateString);
  // Convertir a zona horaria configurada solo para fechas con hora
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone }));
}

// ══════════════ HELPERS ══════════════
const $=id=>document.getElementById(id);
const ing=id=>ingredientes.find(i=>i.id==id);
const rec=id=>recetas.find(r=>r.id==id);
const prod=id=>producciones.find(p=>p.id==id);
const stockProd=recetaId=>stockProductos.find(s=>s.recetaId==recetaId);
const prv=id=>proveedores.find(p=>p.id==id);
const fmt=n=>(isNaN(n)||n===undefined)?'—':'$'+Number(n).toFixed(2);
const fmtN=(n,d=2)=>(isNaN(n)||n===undefined)?'—':Number(n).toFixed(d);

// ══════════════ GLOBAL VARIABLES ══════════════
let ingredientes, recetas, producciones, ventas, pedidos, stockProductos, proveedores, historialCompras, nextId;
let catRecetas = ['Tortas','Cupcakes','Galletas','Facturas','Panes','Alfajores','Otros'];
let gastosFijos = []; // {id, nombre, monto, periodo:'mensual'|'semanal'|'anual'}
let extracciones = []; // {id, fecha, monto, tipo, concepto}
let prestamos; // {id, fecha, prestamista, monto, concepto, devolver:bool, pctPorProduccion, pagos:[{id,fecha,monto,nota}]} - Se inicializa en load()

// Variables para variaciones de receta en producción
let variacionesProduccion = []; // Array de variaciones temporales para la producción actual
let recetaBaseActual = null; // Receta base seleccionada para producción
const TITLES={dashboard:'Panel general',inventario:'Inventario de ingredientes',recetas:'Recetas',producción:'Producción',pedidos:'Pedidos',costos:'Análisis de costos',ventas:'Ventas y ganancias',historial:'Compras de insumos',proveedores:'Proveedores',finanzas:'Finanzas del negocio'};
const EXPORTS=['inventario','recetas','historial','produccion','proveedores','ventas'];
let curSection='dashboard';

// Variables para manejo de archivos
let _fileHandle = null;
let _ultimoGuardado = null;
let _guardandoArchivo = false;

// ══════════════ PAGINACIÓN ══════════════
const _pag = {
  ventas:   { page: 1, size: 25 },
  hist:     { page: 1, size: 25 },
  pedidos:  { page: 1, size: 25 }
};

// Mapa de funciones de render por clave — se completa después de definir las funciones
const _pagRenderFns = {};

function renderPaginator(key, total) {
  const p = _pag[key];
  const totalPags = Math.max(1, Math.ceil(total / p.size));
  if (p.page > totalPags) p.page = totalPags;
  const el = $('pag-' + key);
  if (!el) return;
  if (total <= p.size) { el.innerHTML = ''; return; }

  let pagBtns = '';
  const rango = 2;
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || (i >= p.page - rango && i <= p.page + rango)) {
      pagBtns += `<button class="pag-btn${i === p.page ? ' active' : ''}" onclick="_pagGo('${key}',${i})">${i}</button>`;
    } else if (i === p.page - rango - 1 || i === p.page + rango + 1) {
      pagBtns += `<span style="padding:0 3px;color:var(--text3);font-size:.8rem">…</span>`;
    }
  }

  const desde = (p.page - 1) * p.size + 1;
  const hasta = Math.min(p.page * p.size, total);
  el.innerHTML = `<div class="pag-wrap">
    <span class="pag-info">${desde}–${hasta} de ${total}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <select class="pag-size" onchange="_pagSize('${key}',this.value)">
        ${[25,50,100].map(n=>`<option value="${n}"${p.size===n?' selected':''}>${n} por página</option>`).join('')}
      </select>
      <div class="pag-btns">
        <button class="pag-btn" onclick="_pagGo('${key}',${p.page-1})" ${p.page===1?'disabled':''}>‹</button>
        ${pagBtns}
        <button class="pag-btn" onclick="_pagGo('${key}',${p.page+1})" ${p.page===totalPags?'disabled':''}>›</button>
      </div>
    </div>
  </div>`;
}

function _pagGo(key, page) {
  const p = _pag[key];
  const fn = _pagRenderFns[key];
  if (!fn) return;
  const totalPags = Math.max(1, Math.ceil(
    key==='ventas' ? (ventas||[]).length :
    key==='hist'   ? (historialCompras||[]).length :
    key==='pedidos'? (pedidos||[]).length : 0
  ) / p.size);
  p.page = Math.max(1, Math.min(page, totalPags));
  fn();
  const tbl = $('tbl-' + key);
  if (tbl) {
    const wrap = tbl.closest('.table-wrap') || tbl.closest('.card-body');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _pagSize(key, size) {
  _pag[key].size = parseInt(size);
  _pag[key].page = 1;
  const fn = _pagRenderFns[key];
  if (fn) fn();
}

function _pagReset(key) { _pag[key].page = 1; }



