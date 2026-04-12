// ══════════════ ZONA HORARIA GLOBAL ══════════════
// ÚNICA fuente de verdad para fechas en toda la app.
// Cambiar TIMEZONE_CONFIG.timezone aquí afecta todo el sistema.
//
// Problema que resuelve:
//   new Date().toISOString() usa UTC → en La Habana (UTC-5) a las 23:00
//   devuelve el día SIGUIENTE → las ventas aparecen en la fecha equivocada.
//   Todas las funciones aquí trabajan siempre en la zona configurada.

const TIMEZONE_CONFIG = {
  timezone: 'America/Havana',   // ← cambiar aquí para ajustar toda la app
  locale:   'es-CU'
};

// ─────────────────────────────────────────────────
// FUNCIÓN CENTRAL: fecha local como string YYYY-MM-DD
// Reemplaza: new Date().toISOString().split('T')[0]  ← INCORRECTO en UTC-5
// ─────────────────────────────────────────────────
function today() {
  return _tzDateStr(new Date());
}

// Convierte cualquier Date a 'YYYY-MM-DD' en la zona configurada
function _tzDateStr(date) {
  const d = new Date(date);
  // Usar Intl para obtener año/mes/día en la zona correcta
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_CONFIG.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// ─────────────────────────────────────────────────
// PARSEO SEGURO: string 'YYYY-MM-DD' → Date local
// El problema: new Date('2026-03-14') interpreta como UTC medianoche
// → en UTC-5 eso cae el 13 de marzo. Esta función evita ese desfase.
// ─────────────────────────────────────────────────
function createDate(dateStringOrTimestamp) {
  if (!dateStringOrTimestamp && dateStringOrTimestamp !== 0) return _tzStartOfDay(new Date());

  // Número o Date: interpretar como timestamp
  if (typeof dateStringOrTimestamp === 'number' || dateStringOrTimestamp instanceof Date) {
    return new Date(dateStringOrTimestamp);
  }

  // String ISO con hora (contiene 'T' o ':'): respetar como está
  if (typeof dateStringOrTimestamp === 'string' && (dateStringOrTimestamp.includes('T') || dateStringOrTimestamp.includes(' '))) {
    return new Date(dateStringOrTimestamp);
  }

  // String YYYY-MM-DD: parsear como fecha LOCAL (sin conversión UTC)
  if (typeof dateStringOrTimestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStringOrTimestamp)) {
    const [year, month, day] = dateStringOrTimestamp.split('-').map(Number);
    // Crear fecha en medianoche de la zona configurada
    return _tzMidnight(year, month - 1, day);
  }

  // Fallback
  const d = new Date(dateStringOrTimestamp);
  return isNaN(d) ? _tzStartOfDay(new Date()) : d;
}

// Medianoche de un año/mes/día en la zona horaria configurada
function _tzMidnight(year, month, day) {
  // Construir string ISO en la zona y convertir a Date
  const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  // Calcular offset de la zona en ese momento para convertir correctamente
  const probe = new Date(`${str}Z`);
  const tzStr = probe.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone });
  const tzDate = new Date(tzStr);
  const offset = probe - tzDate;
  return new Date(probe.getTime() + offset);
}

// ─────────────────────────────────────────────────
// INICIO Y FIN DE DÍA en la zona configurada
// ─────────────────────────────────────────────────
function getStartOfDay(date) {
  const d = date ? new Date(date) : new Date();
  return _tzStartOfDay(d);
}

function _tzStartOfDay(date) {
  const s = _tzDateStr(date);
  return createDate(s); // medianoche local
}

function getEndOfDay(date) {
  const d = date ? new Date(date) : new Date();
  const start = _tzStartOfDay(d);
  return new Date(start.getTime() + 86399999); // +23h59m59s999ms
}

// ─────────────────────────────────────────────────
// COMPATIBILIDAD: createLocalDate — usado en pedidos
// Igual comportamiento que createDate para strings YYYY-MM-DD
// ─────────────────────────────────────────────────
function createLocalDate(dateString) {
  if (!dateString) return null;
  return createDate(dateString);
}

// ─────────────────────────────────────────────────
// FORMATEO PARA MOSTRAR al usuario
// ─────────────────────────────────────────────────
function formatDateWithTimezone(date, options) {
  if (!date) return '—';
  const d = typeof date === 'string' ? createDate(date) : new Date(date);
  if (isNaN(d)) return '—';
  const opts = options || {};
  const tz = TIMEZONE_CONFIG.timezone;
  const loc = TIMEZONE_CONFIG.locale;

  if (opts.format === 'time') {
    return d.toLocaleTimeString(loc, { timeZone: tz });
  }
  if (opts.format === 'datetime') {
    return d.toLocaleString(loc, { timeZone: tz });
  }
  // date o default
  return d.toLocaleDateString(loc, { timeZone: tz });
}

// Formateo rápido con zona para mostrar en tablas/listas
function fmtFecha(dateStr) {
  if (!dateStr) return '—';
  return formatDateWithTimezone(dateStr, { format: 'date' });
}

// ─────────────────────────────────────────────────
// TIMESTAMP DE GUARDADO en la zona local
// Reemplaza: new Date().toISOString()  (que da UTC)
// Devuelve ISO con offset local, ej: "2026-03-14T23:05:00-05:00"
// ─────────────────────────────────────────────────
function nowISOLocal() {
  const now = new Date();
  // Obtener offset de la zona configurada
  const tzStr = now.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.timezone });
  const tzDate = new Date(tzStr);
  const offsetMs = now - tzDate;   // ms de diferencia UTC vs zona
  const offsetMin = -Math.round(offsetMs / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  // Fecha/hora en la zona
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().replace('Z', `${sign}${hh}:${mm}`);
}

// ─────────────────────────────────────────────────
// GENERACIÓN DE RANGO DE DÍAS: reemplaza el patrón
//   new Date(hoy.getTime() - i*864e5).toISOString().split('T')[0]
// que falla en zonas horarias negativas
// ─────────────────────────────────────────────────
function rangoUltimosDias(n) {
  // Devuelve array de strings YYYY-MM-DD de los últimos n días (incluyendo hoy)
  const resultado = [];
  const todayStr = today();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ty, tm - 1, td - i);
    resultado.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return resultado;
}

// ─────────────────────────────────────────────────
// INICIO DE MES / FIN DE MES en la zona configurada
// Reemplaza el patrón new Date(hoy.getFullYear(), hoy.getMonth(), 1)
// ─────────────────────────────────────────────────
function inicioMes(offsetMeses) {
  const hoy = getStartOfDay();
  const s = _tzDateStr(hoy);
  const [y, m] = s.split('-').map(Number);
  const mes = m - 1 + (offsetMeses || 0); // mes base 0
  const year = y + Math.floor(mes / 12);
  const month = ((mes % 12) + 12) % 12;
  return createDate(`${year}-${String(month + 1).padStart(2, '0')}-01`);
}

function finMes(offsetMeses) {
  const inicio = inicioMes((offsetMeses || 0) + 1);
  return new Date(inicio.getTime() - 1); // un ms antes del inicio del mes siguiente
}

// Primer día del año en la zona configurada
function inicioAnio(offsetAnios) {
  const s = _tzDateStr(getStartOfDay());
  const year = parseInt(s.split('-')[0]) + (offsetAnios || 0);
  return createDate(`${year}-01-01`);
}
