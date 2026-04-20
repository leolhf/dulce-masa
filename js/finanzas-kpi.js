// ══════════════ FINANZAS — KPIs Y MÉTRICAS ══════════════
// Núcleo de finanzas.js: métricas, render principal y retiro sugerido
// CRUD de extracciones: extracciones.js | Préstamos: prestamos-mod.js

// ── Rango de fechas según período ──
function _finRango(periodo){
  // Usa inicioMes()/finMes() de timezone.js → siempre en zona configurada
  let desde, hasta;
  if (periodo === 'semana'){
    desde = createDate(rangoUltimosDias(7)[0]);
    hasta = finDia(0);
  } else if (periodo === 'mes_actual'){
    desde = inicioMes(0);
    hasta = finMes(0);
  } else if (periodo === 'mes_anterior'){
    desde = inicioMes(-1);
    hasta = finMes(-1);
  } else if (periodo === '3meses'){
    desde = inicioMes(-2);
    hasta = finMes(0);
  } else {
    desde = createDate('2000-01-01');
    hasta = finMes(0);
  }
  return { desde, hasta };
}

// ── Métricas financieras para un período ──
function _finMetricas(periodo){
  const { desde, hasta } = _finRango(periodo);
  const enRango = arr => (arr || []).filter(x => {
    const d = createDate(x.fecha); return d >= desde && d <= hasta;
  });

  const ventasPer   = enRango(ventas);
  const comprasPer  = enRango(historialCompras);
  const extPer      = enRango(extracciones);

  const ingresosBrutos = ventasPer.filter(v => v.cobrado !== false).reduce((a,v) => a + v.unidades * v.precio, 0);
  const totalPropinas  = ventasPer.filter(v => v.cobrado !== false).reduce((a,v) => a + (v.propina || 0), 0);
  const ingresosTotal  = ingresosBrutos + totalPropinas;

  const costosVariables = ventasPer.filter(v => v.cobrado !== false).reduce((a,v) => {
    const r = rec(v.recetaId);
    return a + (r ? calcCosto(r, v.unidades / (r.rinde || 1)) : 0);
  }, 0);

  // Calcular cuántos meses abarca el período
  let mesesEnPeriodo = 1;
  if (periodo === 'mes_actual' || periodo === 'mes_anterior') {
    mesesEnPeriodo = 1;
  } else if (periodo === '3meses') {
    mesesEnPeriodo = 3;
  } else if (periodo === 'todo') {
    // Calcular meses desde la fecha más antigua hasta hoy
    let fechaMasAntigua = new Date();
    if (ventas && ventas.length > 0) {
      const primeraVenta = ventas.reduce((min, v) => {
        const fechaVenta = createDate(v.fecha);
        return fechaVenta < min ? fechaVenta : min;
      }, createDate(ventas[0].fecha));
      fechaMasAntigua = primeraVenta < fechaMasAntigua ? primeraVenta : fechaMasAntigua;
    }
    if (historialCompras && historialCompras.length > 0) {
      const primeraCompra = historialCompras.reduce((min, c) => {
        const fechaCompra = createDate(c.fecha);
        return fechaCompra < min ? fechaCompra : min;
      }, createDate(historialCompras[0].fecha));
      fechaMasAntigua = primeraCompra < fechaMasAntigua ? primeraCompra : fechaMasAntigua;
    }
    const hoy = finMes(0);
    const mesesTotales = Math.max(1, Math.ceil((hoy - fechaMasAntigua) / (1000 * 60 * 60 * 24 * 30)));
    mesesEnPeriodo = mesesTotales;
  }

  const gastosFijosMes = gastosFijos.reduce((a,g) => {
    if (g.periodo === 'mensual') return a + g.monto;
    if (g.periodo === 'semanal') return a + g.monto * 4.33;
    if (g.periodo === 'anual')   return a + g.monto / 12;
    return a;
  }, 0);

  const costoCompras  = comprasPer.reduce((a,c) => a + c.qty * c.precio, 0);

  // Pérdida por mermas del período
  const mermasPer = enRango(mermas || []);
  const perdidaMermas = mermasPer.reduce((a, m) => {
    const r = rec(m.recetaId);
    return a + (r ? calcCosto(r, m.cantidad / (r.rinde || 1)) : 0);
  }, 0);

  const gastosTotales = costosVariables + gastosFijosMes;
  const flujoBruto    = ingresosTotal - gastosTotales;
  const reservaOp     = Math.max(0, flujoBruto * 0.20);
  const disponible    = Math.max(0, flujoBruto - reservaOp);
  const retiroSugerido = Math.max(0, disponible * 0.70);
  const totalExtraido  = extPer.reduce((a,e) => a + e.monto, 0);

  const prestamosPer           = enRango(prestamos || []);
  const capitalPrestamos        = prestamosPer.reduce((a,p) => a + p.monto, 0);
  const prestamosConDevolucion  = prestamosPer.filter(p => p.devolver).reduce((a,p) => a + p.monto, 0);
  const prestamosSinDevolucion  = prestamosPer.filter(p => !p.devolver).reduce((a,p) => a + p.monto, 0);

  const deudaPrestamos = (prestamos || []).filter(p => p.devolver).reduce((a,p) => {
    const s = _prestSaldo(p);
    const autoGen = _prestPagoAutoProduccion(p);
    return a + Math.max(0, s.pendiente - autoGen);
  }, 0);

  const saldoLibre        = disponible - totalExtraido;
  // CORRECCIÓN: Eliminamos prestamosConDevolución del efectivo operativo para evitar doble conteo
  const efectivoOperativo = ingresosTotal - gastosTotales - totalExtraido;
  // Los préstamos con devolución ya están siendo devueltos (saldados), por lo que no se suman al capital total
  const capitalTotal      = efectivoOperativo + prestamosSinDevolucion;

  // Desglose por medio de pago
  const ventasCobradas = ventasPer.filter(v => v.cobrado !== false);
  const megmaBreakdown = {};
  ventasCobradas.forEach(v => {
    const k = v.megma || '';
    if (!megmaBreakdown[k]) megmaBreakdown[k] = 0;
    megmaBreakdown[k] += v.unidades * v.precio + (v.propina || 0);
  });

  return {
    ingresosBrutos, totalPropinas, ingresosTotal,
    costosVariables, gastosFijosMes, costoCompras,
    gastosTotales, flujoBruto,
    reservaOp, disponible, retiroSugerido,
    totalExtraido, saldoLibre,
    capitalPrestamos, deudaPrestamos,
    prestamosConDevolucion, prestamosSinDevolucion,
    efectivoOperativo, capitalTotal,
    nVentas: ventasPer.length,
    megmaBreakdown,
    perdidaMermas
  };
}

function _finGastoFijoMensualBase(){
  return (gastosFijos || []).reduce((a, g) => {
    if (g.periodo === 'mensual') return a + g.monto;
    if (g.periodo === 'semanal') return a + g.monto * 4.33;
    if (g.periodo === 'anual') return a + g.monto / 12;
    return a;
  }, 0);
}

function _finSerieMensual(meses = 6){
  const base = [];
  for(let i = meses - 1; i >= 0; i--){
    const ini = inicioMes(-i);
    const fin = finMes(-i);
    const key = _tzDateStr(ini).slice(0,7);
    base.push({
      key,
      ini,
      fin,
      label: formatDateWithTimezone(ini, { format: 'month-year' }),
      ingresos: 0,
      costosIngredientes: 0,
      gastosFijos: _finGastoFijoMensualBase(),
      prestamosEntrantes: 0,
      extracciones: 0,
      flujoNeto: 0
    });
  }

  const buscarMes = fecha => {
    const d = createDate(fecha);
    if(!d) return null;
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return base.find(m => m.key === k) || null;
  };

  (ventas || []).forEach(v => {
    if(v.cobrado === false) return;
    const m = buscarMes(v.fecha);
    if(!m) return;
    m.ingresos += v.unidades * v.precio + (v.propina || 0);
    const r = rec(v.recetaId);
    m.costosIngredientes += (r ? calcCosto(r, v.unidades / (r.rinde || 1)) : 0);
  });

  (extracciones || []).forEach(e => {
    const m = buscarMes(e.fecha);
    if(m) m.extracciones += e.monto || 0;
  });

  (prestamos || []).forEach(p => {
    const m = buscarMes(p.fecha);
    if(m) m.prestamosEntrantes += p.monto || 0;
  });

  base.forEach(m => {
    m.flujoNeto = m.ingresos - m.costosIngredientes - m.gastosFijos + m.prestamosEntrantes - m.extracciones;
  });
  return base;
}

// ──// Toggle detalles KPI (eliminado - los Indicadores Detallados fueron removidos)
// La función toggleKPIDetails() ha sido eliminada para simplificar la interfaz

// ── Fila de resumen financiero ──
function _finFila(label, valor, tipo, negativo = false){
  const color   = tipo === 'ok' ? 'var(--ok)' : tipo === 'danger' ? 'var(--danger)' : 'var(--warn)';
  const display = negativo ? fmt(Math.abs(valor)) : fmt(valor);
  return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.85rem">
    <span style="color:var(--text2)">${label}</span>
    <span style="font-weight:600;color:${color}">${display}</span>
  </div>`;
}

// ── Render principal de finanzas ──
function renderFinanzas(){
  if (!extracciones) extracciones = [];
  const periodo = $('fin-periodo-analisis')?.value || 'mes_actual';
  const m = _finMetricas(periodo);

  const updateElement = (id, content) => { const el = $(id); if (el) el.textContent = content; };
  const updateHTML    = (id, content) => { const el = $(id); if (el) el.innerHTML   = content; };

  // KPIs superiores (eliminados - se muestran en el Resumen del Período)
  // Los KPIs detallados han sido eliminados para simplificar la interfaz

  // Resumen ejecutivo
  updateElement('resumen-ingresos', fmt(m.ingresosTotal));
  updateElement('resumen-ingresos-det', `${m.nVentas || 0} ventas`);
  updateElement('resumen-gastos', fmt(m.gastosTotales));
  updateElement('resumen-gastos-det', `${fmt(m.costosVariables)} ingredientes + ${fmt(m.gastosFijosMes)} fijos · compras: ${fmt(m.costoCompras)}`);
  updateElement('resumen-flujo', fmt(m.flujoBruto));
  updateElement('resumen-disponible', fmt(m.disponible));
  updateElement('resumen-disponible-det', `Para retiros`);

  // Capital total histórico (todo el historial, sin filtro de período)
  // Reutilizar m si el período ya es 'todo' para evitar cálculo duplicado
  const mTodo = periodo === 'todo' ? m : _finMetricas('todo');
  console.log('[Finanzas KPI] mTodo:', mTodo, 'periodo:', periodo);
  console.log('[Finanzas KPI] mTodo.capitalTotal:', mTodo?.capitalTotal, 'typeof:', typeof mTodo?.capitalTotal);
  // Aplicar ajuste manual si existe
  let capitalAjustado = null;
  if (typeof CapitalAdjustment !== 'undefined') {
    capitalAjustado = CapitalAdjustment.getCapitalAjustado();
    console.log('[Finanzas KPI] CapitalAdjustment encontrado, capitalAjustado:', capitalAjustado);
    console.log('[Finanzas KPI] typeof capitalAjustado:', typeof capitalAjustado);
    console.log('[Finanzas KPI] Ajustes guardados:', CapitalAdjustment.ajustes);
  } else {
    console.log('[Finanzas KPI] CapitalAdjustment no encontrado');
  }
  // Verificación robusta del capital total
  let capitalHistorico = 0;
  if (capitalAjustado !== null) {
    console.warn('[Finanzas KPI] AJUSTE MANUAL ACTIVO - Usando capital ajustado:', capitalAjustado);
    console.warn('[Finanzas KPI] mTodo.capitalTotal calculado sería:', mTodo?.capitalTotal);
    capitalHistorico = capitalAjustado;
  } else if (mTodo && typeof mTodo.capitalTotal === 'number' && !isNaN(mTodo.capitalTotal)) {
    console.log('[Finanzas KPI] Usando capitalTotal calculado:', mTodo.capitalTotal);
    capitalHistorico = mTodo.capitalTotal;
  } else {
    // Calcular manualmente si mTodo.capitalTotal es inválido
    console.warn('[Finanzas KPI] mTodo.capitalTotal inválido, calculando manualmente');
    const efectivoOp = (mTodo?.ingresosTotal || 0) - (mTodo?.gastosTotales || 0) - (mTodo?.totalExtraido || 0);
    const prestamosSinDev = mTodo?.prestamosSinDevolucion || 0;
    capitalHistorico = efectivoOp + prestamosSinDev;
    console.log('[Finanzas KPI] Capital calculado manualmente:', capitalHistorico);
  }
  console.log('[Finanzas KPI] capitalHistorico FINAL:', capitalHistorico, 'capitalAjustado:', capitalAjustado);
  const tieneAjuste = capitalAjustado !== null;
  updateElement('resumen-capital-total', fmt(capitalHistorico));
  updateElement('resumen-capital-total-det', tieneAjuste ? '✏️ Ajustado manualmente' : `Efectivo + Préstamos`);
  // Color dinámico en la tarjeta
  const tarjCapital = document.getElementById('resumen-capital-total-card');
  if (tarjCapital) {
    tarjCapital.style.background = capitalHistorico >= 0 ? 'var(--ok-bg)' : 'var(--danger-bg)';
    tarjCapital.style.borderColor = capitalHistorico >= 0 ? 'var(--ok)' : 'var(--danger)';
    const valEl = tarjCapital.querySelector('.resumen-capital-valor');
    if (valEl) valEl.style.color = capitalHistorico >= 0 ? 'var(--ok)' : 'var(--danger)';
  }
  updateHTML('capital-origen-detalle', `
    <div style="padding:9px 10px;border:1px solid var(--border2);border-radius:10px;background:var(--cream2)">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Ingresos acumulados</div>
      <div style="font-weight:700;color:var(--ok)">${fmt(mTodo.ingresosTotal)}</div>
    </div>
    <div style="padding:9px 10px;border:1px solid var(--border2);border-radius:10px;background:var(--cream2)">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Costos ingredientes</div>
      <div style="font-weight:700;color:var(--danger)">-${fmt(mTodo.costosVariables)}</div>
    </div>
    <div style="padding:9px 10px;border:1px solid var(--border2);border-radius:10px;background:var(--cream2)">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Gastos fijos</div>
      <div style="font-weight:700;color:var(--danger)">-${fmt(mTodo.gastosFijosMes)}</div>
    </div>
    <div style="padding:9px 10px;border:1px solid var(--border2);border-radius:10px;background:var(--cream2)">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Extracciones</div>
      <div style="font-weight:700;color:var(--danger)">-${fmt(mTodo.totalExtraido)}</div>
    </div>
    <div style="padding:9px 10px;border:1px solid var(--border2);border-radius:10px;background:var(--cream2)">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Préstamos no devolutivos</div>
      <div style="font-weight:700;color:var(--caramel)">+${fmt(mTodo.prestamosSinDevolucion)}</div>
    </div>
  `);
  // Exponer para Ajuste Capital
  window._capitalHistoricoActual = mTodo.capitalTotal;

  const textos = { mes_actual:'Este mes', mes_anterior:'Mes anterior', '3meses':'Últimos 3 meses', todo:'Todo el historial' };
  updateElement('periodo-badge', textos[periodo] || 'Este mes');

  updateHTML('fin-stats-row', `
    <div class="stat-card ok-card">
      <div class="stat-label">Efectivo operativo</div>
      <div class="stat-value">${fmt(m.efectivoOperativo)}</div>
      <div class="stat-sub">Ventas - Gastos operativos - Retiros</div>
    </div>
    <div class="stat-card ${m.capitalTotal >= 0 ? 'ok-card' : 'danger-card'}">
      <div class="stat-label">Capital total</div>
      <div class="stat-value">${fmt(m.capitalTotal)}</div>
      <div class="stat-sub">Efectivo operativo + Todos los préstamos</div>
    </div>
    <div class="stat-card ${m.flujoBruto >= 0 ? 'ok-card' : 'danger-card'}">
      <div class="stat-label">Flujo neto</div>
      <div class="stat-value">${fmt(m.flujoBruto)}</div>
      <div class="stat-sub">Ingresos − gastos operativos</div>
    </div>
    <div class="stat-card ${m.saldoLibre >= 0 ? 'ok-card' : 'danger-card'}">
      <div class="stat-label">Saldo libre</div>
      <div class="stat-value">${fmt(m.saldoLibre)}</div>
      <div class="stat-sub">(Ingresos - Gastos - Reserva 20%) - Retiros</div>
    </div>`);

  _renderRetiroSugerido(m);
  _renderExtTable();      // extracciones.js
  renderPrestamos();      // prestamos-mod.js
  // Extras: badge de salud, widget semanal y comparativa (finanzas-extras.js)
  if (typeof _renderSaludFinanciera === 'function')  _renderSaludFinanciera();
  if (typeof _renderSemanaFinanciera === 'function') _renderSemanaFinanciera();
  if (typeof _renderComparativaMes === 'function')   _renderComparativaMes();
}

// ── Panel de retiro sugerido ──
function _renderRetiroSugerido(m){
  const sb = $('fin-sugerido-body');
  if (!sb) return;

  const pctRetiro = m.disponible > 0 ? Math.round(m.totalExtraido / m.disponible * 100) : 0;
  const pctColor  = pctRetiro > 100 ? 'var(--danger)' : pctRetiro > 70 ? 'var(--warn)' : 'var(--sage)';
  const alertaMsg = m.saldoLibre < 0
    ? `<div style="background:var(--danger-bg);border:1px solid #E8BFBE;border-radius:var(--r);padding:10px 13px;font-size:.83rem;color:var(--danger);margin-bottom:12px">
         ⚠ Retiraste <strong>${fmt(Math.abs(m.saldoLibre))}</strong> más de lo disponible. Considerá reducir próximos retiros.
       </div>`
    : m.saldoLibre < m.reservaOp
    ? `<div style="background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);padding:10px 13px;font-size:.83rem;color:var(--warn);margin-bottom:12px">
         ⚠ Saldo libre bajo. Asegurate de mantener el fondo de reserva.
       </div>` : '';

  sb.innerHTML = `
    ${alertaMsg}
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${_finFila('💰 Ingresos totales', m.ingresosTotal, 'ok')}
      ${_finFila('− Costo ingredientes vendidos', -m.costosVariables, 'danger', true)}
      ${m.perdidaMermas > 0 ? _finFila('− Pérdida por mermas', -m.perdidaMermas, 'danger', true) : ''}
      ${_finFila('− Gastos fijos del negocio', -m.gastosFijosMes, 'danger', true)}
      <div style="height:1px;background:var(--border);margin:4px 0"></div>
      ${_finFila('= Flujo neto', m.flujoBruto, m.flujoBruto >= 0 ? 'ok' : 'danger')}
      ${_finFila('− Reserva operativa (20%)', -m.reservaOp, 'warn', true)}
      <div style="height:1px;background:var(--border);margin:4px 0"></div>
      ${_finFila('= Disponible para retirar', m.disponible, 'ok')}
    </div>
    ${m.costoCompras > 0 ? `
    <div style="background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:10px 13px;margin-bottom:14px;font-size:.81rem">
      <span style="color:var(--text3)">🛒 Inversión en stock este período:</span>
      <strong style="color:var(--caramel);margin-left:6px">${fmt(m.costoCompras)}</strong>
      <span style="font-size:.73rem;color:var(--text3);display:block;margin-top:3px">Las compras no son gasto del período — se contabilizan cuando el ingrediente se usa en ventas.</span>
    </div>` : ''}

    ${(()=>{
      const bd = m.megmaBreakdown || {};
      const keys = Object.keys(bd).filter(k=>bd[k]>0);
      if(!keys.length) return '';
      const megmaL = {efectivo:'💵 Efectivo',transferencia:'🏦 Transferencia',tarjeta:'💳 Tarjeta',yape:'📱 Yape/Plin',qr:'🔲 QR',otro:'Otro','':`Sin especificar`};
      const megmaC = {efectivo:'var(--sage)',transferencia:'#5B7FA6',tarjeta:'#9B6BB5',yape:'#E67E4D',qr:'var(--caramel)',otro:'var(--text3)','':`var(--text3)`};
      const total = keys.reduce((a,k)=>a+bd[k],0);
      const filas = keys.sort((a,b)=>bd[b]-bd[a]).map(k=>{
        const pct = total>0?Math.round(bd[k]/total*100):0;
        const color = megmaC[k]||'var(--text3)';
        const label = megmaL[k]||k||'Sin especificar';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="min-width:110px;font-size:.8rem;color:var(--text2)">${label}</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
          </div>
          <span style="font-size:.78rem;font-weight:600;color:var(--text1);min-width:60px;text-align:right">${fmt(bd[k])}</span>
          <span style="font-size:.72rem;color:var(--text3);min-width:28px;text-align:right">${pct}%</span>
        </div>`;
      }).join('');
      return `<div style="background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:11px 13px;margin-bottom:14px">
        <div style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">💳 Ingresos por medio de pago</div>
        ${filas}
      </div>`;
    })()}

    <div style="background:var(--ok-bg);border:1px solid #BCCFBC;border-radius:var(--r);padding:13px 15px;margin-bottom:14px">
      <div style="font-size:.72rem;font-weight:600;color:var(--ok);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Retiro sugerido (máx. 70%)</div>
      <div style="font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:700;color:var(--sage)">${fmt(m.retiroSugerido)}</div>
      <div style="font-size:.77rem;color:var(--text3);margin-top:3px">70% de ${fmt(m.disponible)} disponible</div>
    </div>

    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text2);margin-bottom:5px">
        <span>Ya retirado este período: <strong>${fmt(m.totalExtraido)}</strong></span>
        <span style="color:${pctColor};font-weight:600">${pctRetiro}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill ${pctRetiro > 100 ? 'danger' : pctRetiro > 70 ? 'warn' : 'ok'}" style="width:${Math.min(100, pctRetiro)}%"></div></div>
    </div>

    <div style="font-size:.76rem;color:var(--text3);border-top:1px solid var(--border2);padding-top:10px;margin-top:10px;line-height:1.7">
      <strong style="color:var(--text2)">Recomendaciones:</strong><br>
      🏠 Pagarte un <strong>sueldo fijo mensual</strong> evita la incertidumbre<br>
      🏦 Mantené siempre <strong>2–3 meses de gastos fijos</strong> como fondo<br>
      📅 Retirá con <strong>periodicidad fija</strong> (mensual o quincenal)<br>
      🔄 Reinvertí al menos el <strong>20%</strong> en stock e infraestructura
    </div>
    ${m.capitalPrestamos > 0 ? `
    <div style="margin-top:12px;background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:11px 13px;font-size:.82rem">
      <div style="font-weight:600;color:var(--brown2);margin-bottom:5px">🏦 Capital inyectado este período</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="color:var(--text2)">Préstamos recibidos</span>
        <span style="font-weight:600;color:var(--ok)">${fmt(m.capitalPrestamos)}</span>
      </div>
      ${m.deudaPrestamos > 0 ? `<div style="display:flex;justify-content:space-between">
        <span style="color:var(--text2)">Deuda pendiente total</span>
        <span style="font-weight:600;color:var(--warn)">${fmt(m.deudaPrestamos)}</span>
      </div>` : `<div style="color:var(--ok);font-size:.78rem">✓ Sin deuda pendiente</div>`}
    </div>` : ''}
  `;
}
