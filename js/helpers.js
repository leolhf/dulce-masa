// ══════════════ HELPERS DE DOM Y FORMATO ══════════════
// Funciones utilitarias puras — sin efectos secundarios
// Variables globales: globals.js | Fechas: timezone.js | Paginación: paginator.js

const $ = id => document.getElementById(id);

// Lookups rápidos sobre las colecciones globales
const ing       = id => ingredientes.find(i => i.id == id);
const rec       = id => recetas.find(r => r.id == id);
const prod      = id => producciones.find(p => p.id == id);
const stockProd = recetaId => stockProductos.find(s => s.recetaId == recetaId);
const prv       = id => proveedores.find(p => p.id == id);

// Formateadores de valores numéricos
const fmt  = n => (isNaN(n) || n === undefined) ? '—' : '$' + Number(n).toFixed(2);
const fmtN = (n, d = 2) => (isNaN(n) || n === undefined) ? '—' : Number(n).toFixed(d);
// Seguridad: escapar HTML para prevenir inyección
function escapeHTML(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
