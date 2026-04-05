// ══════════════ FINANZAS — PROPINAS Y EXTRACCIONES ══════════════

const _extTipoLabels = {
  salario:'🏠 Sueldo personal', dividendo:'� Dividendo', reinversion:'🔄 Reinversión',
  reserva:'🏦 Fondo de reserva', gasto_personal:'🛍 Gasto personal',
  impuesto:'📑 Impuestos', otro:'📌 Otro'
};

// Toggle para mostrar/ocultar detalles KPI
function toggleKPIDetails(){
  const content = $('kpi-details-content');
  const button = $('toggle-kpi-btn');
  
  if(content.style.display === 'none'){
    content.style.display = 'block';
    button.textContent = '📉 Ocultar detalles';
  } else {
    content.style.display = 'none';
    button.textContent = '� Ver detalles';
  }
}

// Calcula el rango de fechas según período
function _finRango(periodo){
  // Usamos getStartOfDay() igual que estadisticas.js para consistencia en comparaciones
  const hoy = getStartOfDay();
  let desde, hasta;
  if(periodo === 'semana'){
    desde = new Date(hoy.getTime() - 7 * 864e5);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0, 23, 59, 59, 999);
  } else if(periodo === 'mes_actual'){
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0, 23, 59, 59, 999); // último día del mes actual
  } else if(periodo === 'mes_anterior'){
    desde = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999); // último día del mes anterior
  } else if(periodo === '3meses'){
    desde = new Date(hoy.getFullYear(), hoy.getMonth()-2, 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0, 23, 59, 59, 999);
  } else {
    desde = createDate('2000-01-01');
    hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0, 23, 59, 59, 999);
  }
  desde.setHours(0, 0, 0, 0);
  return { desde, hasta };
}

// Calcula métricas financieras para un período
function _finMetricas(periodo){
  const { desde, hasta } = _finRango(periodo);
  const enRango = arr => (arr||[]).filter(x => {
    const d = createDate(x.fecha); return d >= desde && d <= hasta;
  });

  const ventasPer = enRango(ventas);
  const comprasPer = enRango(historialCompras);
  const extPer = enRango(extracciones);

  const ingresosBrutos = ventasPer.reduce((a,v)=>a + v.unidades*v.precio, 0);
  const totalPropinas  = ventasPer.reduce((a,v)=>a + (v.propina||0), 0);
  const ingresosTotal  = ingresosBrutos + totalPropinas;

  const costosVariables = ventasPer.reduce((a,v)=>{
    const r = rec(v.recetaId);
    return a + (r ? calcCosto(r, v.unidades/(r.rinde||1)) : 0);
  }, 0);

  const gastosFijosMes = gastosFijos.reduce((a,g)=>{
    if(g.periodo==='mensual') return a + g.monto;
    if(g.periodo==='semanal') return a + g.monto*4.33;
    if(g.periodo==='anual')   return a + g.monto/12;
    return a;
  }, 0);

  const costoCompras = comprasPer.reduce((a,c)=>a + c.qty*c.precio, 0);
  const gastosTotales = costosVariables + gastosFijosMes + costoCompras;
  const flujoBruto = ingresosTotal - gastosTotales;
  const reservaOp = Math.max(0, flujoBruto * 0.20);
  const disponible = Math.max(0, flujoBruto - reservaOp);
  const retiroSugerido = Math.max(0, disponible * 0.70);
  const totalExtraido = extPer.reduce((a,e)=>a + e.monto, 0);

  // Préstamos
  const prestamosPer = enRango(prestamos||[]);
  const capitalPrestamos = prestamosPer.reduce((a,p)=>a+p.monto,0);
  const prestamosConDevolucion = prestamosPer.filter(p=>p.devolver).reduce((a,p)=>a+p.monto,0);
  const prestamosSinDevolucion = prestamosPer.filter(p=>!p.devolver).reduce((a,p)=>a+p.monto,0);
  
  const deudaPrestamos = (prestamos||[]).filter(p=>p.devolver).reduce((a,p)=>{
    const s = _prestSaldo(p);
    const autoGen = _prestPagoAutoProduccion(p);
    return a + Math.max(0, s.pendiente - autoGen);
  },0);

  const saldoLibre = disponible - totalExtraido;
  
  // Cálculos profesionales
  const efectivoOperativo = ingresosTotal + prestamosConDevolucion - gastosTotales - totalExtraido;
  const capitalTotal = efectivoOperativo + prestamosSinDevolucion;

  return {
    ingresosBrutos, totalPropinas, ingresosTotal,
    costosVariables, gastosFijosMes, costoCompras,
    gastosTotales, flujoBruto,
    reservaOp, disponible, retiroSugerido,
    totalExtraido, saldoLibre,
    capitalPrestamos, deudaPrestamos,
    prestamosConDevolucion, prestamosSinDevolucion,
    efectivoOperativo, capitalTotal,
    nVentas: ventasPer.length
  };
}

function renderFinanzas(){
  if(!extracciones) extracciones = [];
  const periodo = $('fin-periodo-analisis')?.value || 'mes_actual';
  const m = _finMetricas(periodo);

  // Actualizar elementos del DOM de forma condicional
  const updateElement = (id, content) => { const el = $(id); if(el) el.textContent = content; };
  const updateHTML = (id, content) => { const el = $(id); if(el) el.innerHTML = content; };

  // KPIs superiores
  updateElement('kpi-efectivo-operativo', fmt(m.efectivoOperativo));
  updateElement('kpi-efectivo-operativo-detalle', `${fmt(m.ingresosTotal)} + ${fmt(m.prestamosConDevolucion)} - ${fmt(m.gastosTotales)} - ${fmt(m.totalExtraido)}`);
  updateElement('kpi-capital-total', fmt(m.capitalTotal));
  updateElement('kpi-capital-total-detalle', `${fmt(m.efectivoOperativo)} + ${fmt(m.prestamosSinDevolucion)}`);
  updateElement('kpi-ingresos', fmt(m.ingresosTotal));
  updateElement('kpi-ingresos-detalle', `${fmt(m.ingresosBrutos)} ventas + ${fmt(m.totalPropinas)} propinas`);
  updateElement('kpi-gastos', fmt(m.gastosTotales));
  updateElement('kpi-gastos-detalle', `${fmt(m.costosVariables)} costos + ${fmt(m.gastosFijosMes)} fijos + ${fmt(m.costoCompras)} compras`);
  updateElement('kpi-flujo', fmt(m.flujoBruto));
  updateElement('kpi-saldo', fmt(m.saldoLibre));
  updateElement('kpi-saldo-detalle', `Disponible - ya retirado (${fmt(m.totalExtraido)})`);

  // Resumen ejecutivo
  updateElement('resumen-ingresos', fmt(m.ingresosTotal));
  updateElement('resumen-ingresos-det', `${m.nVentas || 0} ventas`);
  updateElement('resumen-gastos', fmt(m.gastosTotales));
  updateElement('resumen-gastos-det', `${fmt(m.costoCompras)} compras + ${fmt(m.costosVariables + m.gastosFijosMes)} operativos`);
  updateElement('resumen-flujo', fmt(m.flujoBruto));
  updateElement('resumen-disponible', fmt(m.disponible));
  updateElement('resumen-disponible-det', `Para retiros`);
  
  // Badge de período
  const textos = {
    'mes_actual': 'Este mes', 'mes_anterior': 'Mes anterior', 
    '3meses': 'Últimos 3 meses', 'todo': 'Todo el historial'
  };
  updateElement('periodo-badge', textos[periodo] || 'Este mes');

  // Stats row
  updateHTML('fin-stats-row', `
    <div class="stat-card ok-card">
      <div class="stat-label">Efectivo operativo</div>
      <div class="stat-value">${fmt(m.efectivoOperativo)}</div>
      <div class="stat-sub">Ventas + Préstamos con devolución - Gastos operativos - Retiros</div>
    </div>
    <div class="stat-card ${m.capitalTotal>=0?'ok-card':'danger-card'}">
      <div class="stat-label">Capital total</div>
      <div class="stat-value">${fmt(m.capitalTotal)}</div>
      <div class="stat-sub">Efectivo operativo + Préstamos sin devolución</div>
    </div>
    <div class="stat-card ${m.flujoBruto>=0?'ok-card':'danger-card'}">
      <div class="stat-label">Flujo neto</div>
      <div class="stat-value">${fmt(m.flujoBruto)}</div>
      <div class="stat-sub">Ingresos − gastos operativos</div>
    </div>
    <div class="stat-card ${m.saldoLibre>=0?'ok-card':'danger-card'}">
      <div class="stat-label">Saldo libre</div>
      <div class="stat-value">${fmt(m.saldoLibre)}</div>
      <div class="stat-sub">(Ingresos - Gastos - Reserva 20%) - Retiros</div>
    </div>`);

  // Panel de retiro sugerido
  _renderRetiroSugerido(m);
  
  // Tabla de retiros y préstamos
  _renderExtTable();
  renderPrestamos();
}

function _renderRetiroSugerido(m){
  const sb = $('fin-sugerido-body');
  if(!sb) return;
  
  const pctRetiro = m.disponible > 0 ? Math.round(m.totalExtraido / m.disponible * 100) : 0;
  const pctColor = pctRetiro > 100 ? 'var(--danger)' : pctRetiro > 70 ? 'var(--warn)' : 'var(--sage)';
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
      ${_finFila('− Costos de ingredientes', -m.costosVariables, 'danger', true)}
      ${_finFila('− Gastos fijos del negocio', -m.gastosFijosMes, 'danger', true)}
      <div style="height:1px;background:var(--border);margin:4px 0"></div>
      ${_finFila('= Flujo neto', m.flujoBruto, m.flujoBruto>=0?'ok':'danger')}
      ${_finFila('− Reserva operativa (20%)', -m.reservaOp, 'warn', true)}
      <div style="height:1px;background:var(--border);margin:4px 0"></div>
      ${_finFila('= Disponible para retirar', m.disponible, 'ok')}
    </div>

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
      <div class="prog-bar"><div class="prog-fill ${pctRetiro>100?'danger':pctRetiro>70?'warn':'ok'}" style="width:${Math.min(100,pctRetiro)}%"></div></div>
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

function _finFila(label, valor, tipo, negativo=false){
  const color = tipo==='ok' ? 'var(--ok)' : tipo==='danger' ? 'var(--danger)' : 'var(--warn)';
  const display = negativo ? fmt(Math.abs(valor)) : fmt(valor);
  return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.85rem">
    <span style="color:var(--text2)">${label}</span>
    <span style="font-weight:600;color:${color}">${display}</span>
  </div>`;
}

function _renderExtTable(){
  if(!extracciones) extracciones = [];
  const tb = $('tbl-ext')?.querySelector('tbody');
  if(!tb) return;
  
  const total = extracciones.reduce((a,e)=>a+e.monto,0);
  const el = $('ext-stats');
  if(el) el.textContent = `${extracciones.length} retiros · Total: ${fmt(total)}`;
  
  if(extracciones.length===0){
    tb.innerHTML='<tr><td colspan="6" class="empty">Sin retiros registrados</td></tr>'; 
    return;
  }
  
  const sorted = [...extracciones].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha));
  const _periodoLabel = {mes_actual:'Mes actual', mes_anterior:'Mes anterior', semana:'Última semana', todo:'Todo'};
  tb.innerHTML = sorted.map(e => `
    <tr>
      <td>${e.fecha}</td>
      <td><span class="badge badge-warn" style="font-size:.7rem">${_extTipoLabels[e.tipo]||e.tipo}</span></td>
      <td style="color:var(--text2)">${e.concepto||'—'}</td>
      <td style="font-weight:600;color:var(--danger)">${fmt(e.monto)}</td>
      <td style="font-size:.78rem;color:var(--text3)">${_periodoLabel[e.periodo]||'—'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editExtraccion(${e.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delExtraccion(${e.id})" title="Eliminar">✕</button>
      </td>
    </tr>`).join('');
}

function calcExtraccion(){
  const monto = parseFloat($('ext-monto')?.value)||0;
  const prev = $('ext-preview'); 
  if(!prev || monto<=0){ 
    if(prev) prev.innerHTML=''; 
    return; 
  }
  
  const periodo = $('ext-periodo')?.value || 'mes_actual';
  const m = _finMetricas(periodo);
  const excede = monto > m.disponible;
  const superaSug = monto > m.retiroSugerido && !excede;
  
  const bgColor = excede ? 'var(--danger-bg)' : superaSug ? 'var(--warn-bg)' : 'var(--ok-bg)';
  const borderColor = excede ? '#E8BFBE' : superaSug ? '#E8CCAA' : '#BCCFBC';
  
  let mensaje = excede
    ? `⚠ <strong>Excede el disponible</strong> (${fmt(m.disponible)}). Vas a quedar ${fmt(monto-m.disponible)} en negativo.`
    : superaSug
    ? `⚠ Supera el retiro sugerido de ${fmt(m.retiroSugerido)} (70% del disponible). Aún así es posible registrarlo.`
    : `✅ Retiro dentro del rango saludable. Quedarán ${fmt(m.disponible-monto)} disponibles.`;
  
  prev.innerHTML = `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:var(--r);padding:10px 13px;font-size:.83rem">${mensaje}</div>`;
}

function registrarExtraccion(){
  const editId = parseInt($('ext-edit-id').value)||null;
  const fecha  = $('ext-fecha').value || today();
  const tipo   = $('ext-tipo').value;
  const monto  = parseFloat($('ext-monto').value)||0;
  const concepto = $('ext-concepto').value.trim();
  const periodo = $('ext-periodo')?.value || 'mes_actual';
  
  if(monto<=0){ toast('Ingresá un monto válido'); return; }
  if(!extracciones) extracciones=[];

  if(editId){
    const e = extracciones.find(x=>x.id===editId);
    if(e) Object.assign(e,{fecha,tipo,monto,concepto,periodo});
    $('ext-edit-id').value='';
    $('ext-btn-guardar').textContent='💵 Registrar retiro';
    $('ext-btn-cancelar').style.display='none';
    toast('Retiro actualizado ✓');
  } else {
    extracciones.push({id:nextId.ext++, fecha, tipo, monto, concepto, periodo});
    toast('💵 Retiro registrado ✓');
  }
  
  // Limpiar formulario
  $('ext-fecha').value=today();
  $('ext-monto').value='';
  $('ext-concepto').value='';
  $('ext-preview').innerHTML='';
  
  saveData();
  renderFinanzas();
}

function editExtraccion(id){
  const e = extracciones.find(x=>x.id===id); 
  if(!e) return;
  
  $('ext-edit-id').value=id;
  $('ext-fecha').value=e.fecha;
  $('ext-tipo').value=e.tipo;
  $('ext-monto').value=e.monto;
  $('ext-concepto').value=e.concepto||'';
  if($('ext-periodo')) $('ext-periodo').value=e.periodo||'mes_actual';
  $('ext-btn-guardar').textContent='✓ Guardar cambios';
  $('ext-btn-cancelar').style.display='inline-flex';
  calcExtraccion();
  document.querySelector('#s-finanzas .card').scrollIntoView({behavior:'smooth'});
  toast('Editando retiro — modificá los datos y guardá.');
}

function cancelarEdicionExtraccion(){
  $('ext-edit-id').value='';
  $('ext-fecha').value=today();
  $('ext-monto').value='';
  $('ext-concepto').value='';
  $('ext-preview').innerHTML='';
  $('ext-btn-guardar').textContent='💵 Registrar retiro';
  $('ext-btn-cancelar').style.display='none';
}

function delExtraccion(id){
  confirmar({ titulo:'Eliminar retiro', labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
      extracciones = extracciones.filter(e=>e.id!==id);
      saveData(); 
      renderFinanzas(); 
      toast('Retiro eliminado');
    }
  });
}

// ══════════════ PRÉSTAMOS PERSONALES AL NEGOCIO ══════════════

function _prestSaldo(p){
  const pagado = (p.pagos||[]).reduce((a,x)=>a+x.monto,0);
  return { pagado, pendiente: Math.max(0, p.monto - pagado), saldado: pagado >= p.monto };
}

// Calcula cuánto se ha generado automáticamente por % de producción para un préstamo
function _prestPagoAutoProduccion(p){
  if(!p.devolver || p.modalidad !== 'produccion') return 0;
  // Sólo producciones registradas DESPUÉS de la fecha del préstamo
  const desde = createDate(p.fecha); desde.setHours(0,0,0,0);
  return (producciones||[])
    .filter(pr => createDate(pr.fecha) >= desde)
    .reduce((acc, pr) => {
      const r = rec(pr.recetaId);
      if(!r) return acc;
      const costoLote = calcCosto(r, pr.tandas);
      const valorEst = costoLote * 2; // estimación: 2× costo como valor de producción
      return acc + valorEst * ((p.pctPorProduccion||10)/100);
    }, 0);
}

function renderPrestamos(){
  if(!prestamos) prestamos=[];
  const sr = $('prest-stats-row');
  if(sr){
    const totalDep = prestamos.reduce((a,p)=>a+p.monto,0);
    const totalPend = prestamos.filter(p=>p.devolver).reduce((a,p)=>{
      const s = _prestSaldo(p);
      const autoGen = _prestPagoAutoProduccion(p);
      return a + Math.max(0, s.pendiente - autoGen);
    },0);
    const totalSaldados = prestamos.filter(p=>{
      if(!p.devolver) return false;
      const s = _prestSaldo(p);
      return s.saldado;
    }).length;
    const noDevolv = prestamos.filter(p=>!p.devolver).length;
    sr.innerHTML = `
      <div class="stat-card ok-card">
        <div class="stat-label">Total depositado</div>
        <div class="stat-value">${fmt(totalDep)}</div>
        <div class="stat-sub">${prestamos.length} préstamo${prestamos.length!==1?'s':''}</div>
      </div>
      <div class="stat-card ${totalPend>0?'warn-card':'ok-card'}">
        <div class="stat-label">Deuda pendiente</div>
        <div class="stat-value">${fmt(totalPend)}</div>
        <div class="stat-sub">Por devolver al prestamista</div>
      </div>
      <div class="stat-card ok-card">
        <div class="stat-label">Préstamos saldados</div>
        <div class="stat-value">${totalSaldados}</div>
        <div class="stat-sub">Devueltos completamente</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sin devolución</div>
        <div class="stat-value">${noDevolv}</div>
        <div class="stat-sub">Aportes / donaciones al negocio</div>
      </div>`;
  }
  const tb = $('tbl-prest')?.querySelector('tbody');
  if(!tb) return;
  if(prestamos.length===0){
    tb.innerHTML='<tr><td colspan="8" class="empty">Sin préstamos registrados</td></tr>'; return;
  }
  const sorted = [...prestamos].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha));
  tb.innerHTML = sorted.map(p => {
    const s = _prestSaldo(p);
    const autoGen = p.devolver && p.modalidad==='produccion' ? _prestPagoAutoProduccion(p) : 0;
    const pendReal = p.devolver ? Math.max(0, s.pendiente - autoGen) : 0;
    const saldado = p.devolver ? (s.pagado + autoGen >= p.monto) : false;
    let estadoBadge;
    if(!p.devolver){
      estadoBadge = `<span class="badge" style="background:var(--cream2);color:var(--text2);border:1px solid var(--border)">Sin retorno</span>`;
    } else if(saldado){
      estadoBadge = `<span class="badge badge-ok">✓ Saldado</span>`;
    } else if(p.modalidad==='produccion'){
      estadoBadge = `<span class="badge badge-warn">⚙ Auto (${p.pctPorProduccion||10}%)</span>`;
    } else {
      estadoBadge = `<span class="badge" style="background:var(--warn-bg);color:var(--warn);border:1px solid #E8CCAA">💳 Manual</span>`;
    }
    return `<tr>
      <td style="white-space:nowrap">${p.fecha}</td>
      <td style="font-weight:500">${p.prestamista||'—'}</td>
      <td style="color:var(--text2);font-size:.83rem">${p.concepto||'—'}</td>
      <td style="font-weight:600;color:var(--ok)">${fmt(p.monto)}</td>
      <td style="color:var(--text2)">${p.devolver ? fmt(s.pagado + autoGen) : '—'}</td>
      <td style="font-weight:600;color:${pendReal>0?'var(--warn)':'var(--ok)'}">${p.devolver ? fmt(pendReal) : '—'}</td>
      <td>${estadoBadge}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="verDetallePrestamo(${p.id})" title="Ver detalle / pagar">🔍</button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editPrestamo(${p.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delPrestamo(${p.id})" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function abrirModalPrestamo(id){
  $('prest-edit-id').value = '';
  $('prest-fecha').value = today();
  $('prest-prestamista').value = '';
  $('prest-monto').value = '';
  $('prest-concepto').value = '';
  $('prest-devolver').checked = false;
  $('prest-mod-prod').checked = true;
  $('prest-pct').value = '10';
  $('prest-devolucion-opts').style.display = 'none';
  $('prest-pct-field').style.display = 'block';
  $('prest-modal-titulo').textContent = '🏦 Nuevo préstamo';
  openModal('modal-prestamo');
  document.querySelectorAll('input[name="prest-modalidad"]').forEach(r =>
    r.addEventListener('change', () => {
      $('prest-pct-field').style.display = r.value==='produccion' && r.checked ? 'block' : 'none';
    })
  );
}

function editPrestamo(id){
  const p = (prestamos||[]).find(x=>x.id===id); if(!p) return;
  $('prest-edit-id').value = id;
  $('prest-fecha').value = p.fecha;
  $('prest-prestamista').value = p.prestamista||'';
  $('prest-monto').value = p.monto;
  $('prest-concepto').value = p.concepto||'';
  $('prest-devolver').checked = !!p.devolver;
  $('prest-devolucion-opts').style.display = p.devolver ? 'block' : 'none';
  if(p.modalidad==='manual') $('prest-mod-manual').checked = true;
  else $('prest-mod-prod').checked = true;
  $('prest-pct').value = p.pctPorProduccion||10;
  $('prest-pct-field').style.display = p.modalidad!=='manual' ? 'block' : 'none';
  $('prest-modal-titulo').textContent = '✎ Editar préstamo';
  openModal('modal-prestamo');
  document.querySelectorAll('input[name="prest-modalidad"]').forEach(r =>
    r.addEventListener('change', () => {
      $('prest-pct-field').style.display = r.value==='produccion' && r.checked ? 'block' : 'none';
    })
  );
}

function togglePrestDevolucion(){
  $('prest-devolucion-opts').style.display = $('prest-devolver').checked ? 'block' : 'none';
}

function cerrarModalPrestamo(){ closeModal('modal-prestamo'); }

function guardarPrestamo(){
  const editId = parseInt($('prest-edit-id').value)||null;
  const fecha  = $('prest-fecha').value || today();
  const prestamista = $('prest-prestamista').value.trim();
  const monto  = parseFloat($('prest-monto').value)||0;
  const concepto = $('prest-concepto').value.trim();
  const devolver = $('prest-devolver').checked;
  const modalidad = document.querySelector('input[name="prest-modalidad"]:checked')?.value || 'produccion';
  const pctPorProduccion = parseFloat($('prest-pct').value)||10;
  if(monto<=0){ toast('Ingresá un monto válido'); return; }
  if(!prestamista){ toast('Indicá de quién es el préstamo'); return; }
  if(!prestamos) prestamos=[];
  if(editId){
    const p = prestamos.find(x=>x.id===editId);
    if(p) Object.assign(p,{fecha,prestamista,monto,concepto,devolver,modalidad,pctPorProduccion});
    toast('Préstamo actualizado ✓');
  } else {
    prestamos.push({id:nextId.prestamo++, fecha, prestamista, monto, concepto, devolver, modalidad, pctPorProduccion, pagos:[]});
    toast('🏦 Préstamo registrado ✓');
  }
  cerrarModalPrestamo();
  saveData();
  renderPrestamos();
  renderFinanzas();
}

function verDetallePrestamo(id){
  const p = (prestamos||[]).find(x=>x.id===id); if(!p) return;
  const s = _prestSaldo(p);
  const autoGen = p.devolver && p.modalidad==='produccion' ? _prestPagoAutoProduccion(p) : 0;
  const pendReal = p.devolver ? Math.max(0, p.monto - s.pagado - autoGen) : 0;
  const saldado  = p.devolver && (s.pagado + autoGen >= p.monto);
  $('prest-det-titulo').textContent = `🏦 ${p.prestamista} — ${fmt(p.monto)}`;

  let html = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${_finFila('Monto prestado', p.monto, 'ok')}
      ${p.devolver ? `
        ${_finFila('Ya devuelto (manual)', s.pagado, 'ok')}
        ${p.modalidad==='produccion' ? _finFila('Generado por producción ('+( p.pctPorProduccion||10)+'%)', autoGen, 'ok') : ''}
        <div style="height:1px;background:var(--border);margin:4px 0"></div>
        ${_finFila('= Pendiente de devolver', pendReal, pendReal>0?'danger':'ok')}
      ` : `<div style="font-size:.83rem;color:var(--text3);padding:6px 0">Este préstamo no requiere devolución.</div>`}
    </div>`;

  if(p.devolver && p.modalidad==='produccion'){
    html += `<div style="background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:.82rem;color:var(--text2)">
      <strong>⚙ Devolución automática:</strong> Cada producción registrada desde <strong>${p.fecha}</strong> aporta el
      <strong>${p.pctPorProduccion||10}%</strong> de su valor estimado (2× costo) hacia este préstamo.
      El acumulado generado hasta hoy es <strong style="color:var(--ok)">${fmt(autoGen)}</strong>.
      ${saldado ? '<br><br>✅ <strong style="color:var(--ok)">Préstamo completamente saldado.</strong>' : ''}
    </div>`;
  }

  if(p.devolver && !saldado && p.modalidad==='manual'){
    html += `<div style="margin-bottom:16px">
      <div style="font-size:.85rem;font-weight:600;color:var(--brown2);margin-bottom:8px">Registrar pago manual</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="number" id="prest-pago-monto" placeholder="Monto $" step="0.01" min="0" style="flex:1;min-width:120px" class="search-input">
        <input type="date" id="prest-pago-fecha" value="${today()}" class="search-input" style="flex:1;min-width:140px">
        <input type="text" id="prest-pago-nota" placeholder="Nota (opcional)" class="search-input" style="flex:2;min-width:160px">
        <button class="btn btn-ok btn-sm" onclick="registrarPagoPrestamo(${p.id})">+ Pago</button>
      </div>
    </div>`;
  }

  if(p.devolver && (p.pagos||[]).length>0){
    html += `<div style="font-size:.85rem;font-weight:600;color:var(--brown2);margin-bottom:8px">Historial de pagos manuales</div>
      <div class="table-wrap"><table style="font-size:.83rem">
        <thead><tr><th>Fecha</th><th>Monto</th><th>Nota</th><th></th></tr></thead>
        <tbody>${[...(p.pagos||[])].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha)).map(pg=>`
          <tr>
            <td>${pg.fecha}</td>
            <td style="font-weight:600;color:var(--ok)">${fmt(pg.monto)}</td>
            <td style="color:var(--text2)">${pg.nota||'—'}</td>
            <td><button class="btn btn-danger btn-sm btn-icon" onclick="delPagoPrestamo(${p.id},${pg.id})">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  $('prest-det-body').innerHTML = html;
  openModal('modal-prest-detalle');
}

function cerrarModalPrestDetalle(){
  closeModal('modal-prest-detalle');
}

function registrarPagoPrestamo(prestId){
  const p = (prestamos||[]).find(x=>x.id===prestId); if(!p) return;
  const monto = parseFloat($('prest-pago-monto')?.value)||0;
  const fecha  = $('prest-pago-fecha')?.value || today();
  const nota   = $('prest-pago-nota')?.value.trim()||'';
  if(monto<=0){ toast('Ingresá un monto válido'); return; }
  if(!p.pagos) p.pagos=[];
  const pid = (p.pagos.reduce((m,x)=>Math.max(m,x.id||0),0))+1;
  p.pagos.push({id:pid, fecha, monto, nota});
  toast('💳 Pago registrado ✓');
  saveData();
  renderPrestamos();
  verDetallePrestamo(prestId); // refrescar modal
}

function delPagoPrestamo(prestId, pagoId){
  const p = (prestamos||[]).find(x=>x.id===prestId); if(!p) return;
  confirmar({ titulo:'Eliminar pago', labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
      p.pagos = (p.pagos||[]).filter(x=>x.id!==pagoId);
      saveData(); renderPrestamos(); verDetallePrestamo(prestId); toast('Pago eliminado');
    }
  });
}

function delPrestamo(id){
  confirmar({ titulo:'Eliminar préstamo', labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{
      prestamos = prestamos.filter(p=>p.id!==id);
      saveData(); renderPrestamos(); renderFinanzas(); toast('Préstamo eliminado');
    }
  });
}

