// ══════════════ FINANZAS — TABS Y ANÁLISIS ══════════════
// Extraído de prestamos.js — control de pestañas y análisis gráfico de evolución

// ── Control de pestañas ──
function showFinanzasTab(tabName) {
  document.querySelectorAll('.fin-tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const selectedTab = document.getElementById(`fin-tab-${tabName}`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  } else if (tabName === 'movimientos') {
    // Compatibilidad con nombre antiguo
    const fallbackTab = document.getElementById('fin-tab-retiros');
    if (fallbackTab) fallbackTab.classList.add('active');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.onclick && btn.onclick.toString().includes(tabName)) btn.classList.add('active');
  });

  if (tabName === 'analisis') {
    renderAnalisisTab();
    renderAnalisisGrafico();
  } else if (tabName === 'estadisticas') {
    renderEstadisticas();
  } else if (tabName === 'analisis-detallado' || tabName === 'analisis_detallado') {
    renderEstadisticasDetallado();
  } else if (tabName === 'rentabilidad') {
    renderRentabilidad();
  } else if (tabName === 'metas') {
    renderMetas();
  } else if (tabName === 'ajuste-capital') {
    // Cargar datos e historial al abrir el tab de Ajuste Capital
    if (typeof cargarDatosCapital === 'function') {
      cargarDatosCapital();
    }
    if (typeof actualizarHistorialAjustes === 'function') {
      actualizarHistorialAjustes();
    }
  }
}

// ── Tab análisis de flujo ──
function renderAnalisisTab() {
  const periodo = document.getElementById('analisis-periodo')?.value || '6meses';
  const hoy = getStartOfDay();
  let fechaInicio;
  if (periodo === '6meses') {
    fechaInicio = inicioMes(-5);
  } else if (periodo === '1ano') {
    fechaInicio = inicioMes(-11);
  } else {
    const todasLasFechas = [
      ...(ventas||[]).map(v => createDate(v.fecha)),
      ...(historialCompras||[]).map(c => createDate(c.fecha))
    ].filter(Boolean);
    fechaInicio = todasLasFechas.length > 0
      ? new Date(Math.min(...todasLasFechas))
      : inicioMes(-11);
    fechaInicio.setDate(1);
  }
  fechaInicio.setHours(0,0,0,0);
  const fechaFin = finMes(0);

  const inRng = arr => (arr||[]).filter(x => {
    const d = createDate(x.fecha); return d >= fechaInicio && d <= fechaFin;
  });

  const ventasP  = inRng(ventas);
  const comprasP = inRng(historialCompras);

  const totalIngresos = ventasP.reduce((a,v) => a + v.unidades*v.precio + (v.propina||0), 0);
  const totalEgresos  = comprasP.reduce((a,c) => a + c.qty*c.precio, 0);
  const flujoNeto     = totalIngresos - totalEgresos;
  const margenPct     = totalIngresos > 0 ? Math.round(flujoNeto/totalIngresos*100) : 0;

  const diasMes   = parseInt(_tzDateStr(finMes(0)).split('-')[2]);
  const diaActual = hoy.getDate();
  const diasRest  = diasMes - diaActual;
  const ventasMes = (ventas||[]).filter(v => {
    const d = createDate(v.fecha);
    return d.getFullYear()===hoy.getFullYear() && d.getMonth()===hoy.getMonth();
  });
  const ingMes  = ventasMes.reduce((a,v) => a + v.unidades*v.precio + (v.propina||0), 0);
  const ritmo   = diaActual > 0 ? ingMes / diaActual : 0;
  const proyMes = ingMes + ritmo * diasRest;

  const analisisFlujo = document.getElementById('analisis-flujo');
  if (analisisFlujo) {
    analisisFlujo.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="text-align:center;padding:14px;background:var(--ok-bg);border-radius:var(--r);border:1px solid var(--ok)">
          <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">💰 Ingresos</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--ok)">${fmt(totalIngresos)}</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${ventasP.length} ventas</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--danger-bg);border-radius:var(--r);border:1px solid var(--danger)">
          <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">💸 Egresos</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--danger)">${fmt(totalEgresos)}</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${comprasP.length} compras</div>
        </div>
      </div>
      <div style="text-align:center;padding:14px;background:var(--cream);border-radius:var(--r);border:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">📈 Flujo neto del período</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:var(--${flujoNeto>=0?'ok':'danger'})">${fmt(flujoNeto)}</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:3px">Margen ${margenPct}%</div>
      </div>`;
  }

  const analisisProyecciones = document.getElementById('analisis-proyecciones');
  if (analisisProyecciones) {
    analisisProyecciones.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="text-align:center;padding:14px;background:var(--ok-bg);border-radius:var(--r)">
          <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">📅 Proyección mes actual</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--ok)">${fmt(proyMes)}</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">Ritmo: ${fmt(ritmo)}/día</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--cream2);border-radius:var(--r)">
          <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">📊 Margen promedio</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--caramel)">${margenPct}%</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">Ingresos vs Egresos</div>
        </div>
      </div>
      <div style="font-size:.76rem;color:var(--text3);padding:10px;background:var(--cream);border-radius:var(--r);text-align:center">
        Quedan <strong>${diasRest}</strong> días en el mes · Ingresos hasta hoy: <strong>${fmt(ingMes)}</strong>
      </div>`;
  }
}

// ── Gráfico de evolución financiera ──
function renderAnalisisGrafico() {
  const canvas = document.getElementById('grafico-evolucion-financiera');
  if (!canvas) return;

  const periodo = document.getElementById('analisis-periodo')?.value || '6meses';
  const hoy = getStartOfDay();

  let fechaInicio;
  if (periodo === '6meses') {
    fechaInicio = createDate(rangoUltimosDias(180)[0]);
  } else if (periodo === '1ano') {
    fechaInicio = createDate(rangoUltimosDias(365)[0]);
  } else {
    const todasLasFechas = [
      ...(ventas||[]).map(v => createDate(v.fecha)),
      ...(historialCompras||[]).map(c => createDate(c.fecha)),
      ...(extracciones||[]).map(e => createDate(e.fecha))
    ];
    fechaInicio = todasLasFechas.length > 0 ? _tzStartOfDay(new Date(Math.min(...todasLasFechas))) : createDate(rangoUltimosDias(365)[0]);
  }

  const datosPorMes = {};
  let current = _tzStartOfDay(fechaInicio); // ya normalizado
  while (current <= hoy) {
    const key = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
    datosPorMes[key] = { ingresos:0, gastos:0, extracciones:0 };
    current.setMonth(current.getMonth() + 1);
  }

  (ventas||[]).forEach(v => {
    const fecha = createDate(v.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
      if (datosPorMes[key]) datosPorMes[key].ingresos += v.unidades * v.precio + (v.propina||0);
    }
  });
  (historialCompras||[]).forEach(c => {
    const fecha = createDate(c.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
      if (datosPorMes[key]) datosPorMes[key].gastos += c.qty * c.precio;
    }
  });
  (extracciones||[]).forEach(e => {
    const fecha = createDate(e.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
      if (datosPorMes[key]) datosPorMes[key].extracciones += e.monto;
    }
  });

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const labels = Object.keys(datosPorMes).map(key => {
    const [year, month] = key.split('-');
    return `${months[parseInt(month)-1]} ${year}`;
  });

  const datosIngresos     = Object.values(datosPorMes).map(d => d.ingresos);
  const datosGastos       = Object.values(datosPorMes).map(d => d.gastos);
  const datosExtracciones = Object.values(datosPorMes).map(d => d.extracciones);

  const hayDatos = datosIngresos.some(v=>v>0) || datosGastos.some(v=>v>0) || datosExtracciones.some(v=>v>0);
  if (!hayDatos){ canvas.style.display = 'none'; return; }
  canvas.style.display = '';

  if (window.evolucionChart){ window.evolucionChart.destroy(); window.evolucionChart = null; }
  if (typeof Chart === 'undefined') return;

  window.evolucionChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Ingresos',  data:datosIngresos,     borderColor:'#C47C2B', backgroundColor:'rgba(196,124,43,.1)',  borderWidth:2, fill:true, tension:.4 },
        { label:'Gastos',    data:datosGastos,       borderColor:'#B85450', backgroundColor:'rgba(184,84,80,.1)',   borderWidth:2, fill:true, tension:.4 },
        { label:'Retiros',   data:datosExtracciones, borderColor:'#6B5A44', backgroundColor:'rgba(107,90,68,.1)',   borderWidth:2, fill:false, tension:.4 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:true, position:'top', labels:{ boxWidth:10, boxHeight:10, font:{size:11}, color:'#6B5A44', padding:16 } },
        tooltip:{ backgroundColor:'#4A3218', titleColor:'#E8A84A', bodyColor:'#F9F4EC', padding:10, cornerRadius:8,
          callbacks:{ label: ctx => ' ' + ctx.dataset.label + ': $' + ctx.raw.toFixed(2) } }
      },
      scales:{
        x:{ grid:{display:false}, ticks:{color:'#9C8A74',font:{size:11},maxRotation:0,autoSkip:true,maxTicksLimit:12} },
        y:{ grid:{color:'rgba(216,204,188,.5)',drawTicks:false}, border:{display:false},
          ticks:{color:'#9C8A74',font:{size:11}, callback:v=>'$'+v } }
      }
    }
  });
}

// ── Diagnóstico de finanzas ──
function diagnosticarFinanzasCompras() {
  const periodo = $('fin-periodo-analisis')?.value || 'mes_actual';
  const { desde, hasta } = _finRango(periodo);
  const comprasEnRango = (historialCompras||[]).filter(c => {
    const d = createDate(c.fecha); return d >= desde && d <= hasta;
  });
  const totalCompras = comprasEnRango.reduce((a,c) => a + c.qty*c.precio, 0);
  const totalVentas  = (ventas||[]).filter(v => {
    const d = createDate(v.fecha); return d >= desde && d <= hasta;
  }).length;

  const desdeStr = formatDateWithTimezone(desde, {format:'date'});
  const hastaStr = formatDateWithTimezone(hasta, {format:'date'});

  const info = [
    `📅 Rango: ${desdeStr} → ${hastaStr}`,
    `🛒 Compras en rango: ${comprasEnRango.length} registros · ${fmt(totalCompras)}`,
    `💰 Ventas en rango: ${totalVentas}`,
    `📦 Total historialCompras: ${(historialCompras||[]).length} registros`,
    '',
    comprasEnRango.length > 0
      ? comprasEnRango.slice(0,5).map(c => `  · ${c.fecha} | qty:${c.qty} × $${c.precio}`).join('\n')
      : '  (ninguna compra coincide con el rango de fechas)',
  ].join('\n');

  alert('🔍 Diagnóstico de Finanzas — Compras\n\n' + info);
}

// ── Período análisis detallado ──
let periodoActualDetallado = '30';

function cambiarPeriodoDetallado() {
  periodoActualDetallado = $('periodo-selector-detallado')?.value || '30';
  renderEstadisticasDetallado();
}

function renderEstadisticasDetallado() {
  const sel    = $('periodo-selector');
  const selDet = $('periodo-selector-detallado');
  if (sel && selDet) sel.value = selDet.value;
  renderEstadisticas();
  const labelDet  = $('periodo-actual-detallado');
  const labelMain = $('periodo-actual');
  if (labelDet && labelMain) labelDet.textContent = labelMain.textContent;
}
