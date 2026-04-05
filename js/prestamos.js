// ════════════ FUNCIONES DE BORRAR TODO ══════════════
function borrarTodoConfirm() {
  confirmar({
    titulo: '⚠️ Borrar todo el contenido',
    mensaje: 'Esta acción eliminará PERMANENTEMENTE todos los datos:<br><br>' +
             '• Ventas y pedidos<br>' +
             '• Compras y stock de ingredientes<br>' +
             '• Recetas y productos<br>' +
             '• Producción<br>' +
             '• Préstamos y retiros<br>' +
             '• Todo el historial<br><br>' +
             '<strong style="color: var(--danger)">Esta acción no se puede deshacer.</strong>',
    labelOk: '🗑️ Borrar todo',
    tipo: 'danger',
    onOk: borrarTodo
  });
}

function borrarTodo() {
  try {
    // Resetear todas las variables globales
    ventas = [];
    pedidos = [];
    compras = [];
    ingredientes = [];
    recetas = [];
    producciones = [];
    prestamos = [];
    extracciones = [];
    proveedores = [];
    
    // Guardar datos vacíos
    saveData();
    
    // Refrescar todas las vistas
    renderVentas();
    renderPedidos();
    renderHistorial();
    renderIngredientes();
    renderRecetas();
    renderProduccion();
    renderPrestamos();
    renderFinanzas();
    renderDashboard();
    
    // Mostrar mensaje de éxito
    toast('🗑️ Todo el contenido ha sido eliminado');
    
    // Ocultar botón de borrar todo ya que no hay archivo
    const btnBorrarTodo = document.getElementById('btn-borrar-todo');
    if (btnBorrarTodo) {
      btnBorrarTodo.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error al borrar todo:', error);
    toast('❌ Error al eliminar el contenido');
  }
}

// ════════════ FUNCIONES DE PESTAÑAS FINANZAS ══════════════
function showFinanzasTab(tabName) {
  console.log(`🔄 showFinanzasTab() llamado con: "${tabName}"`);
  
  // Ocultar todos los contenidos de pestañas
  document.querySelectorAll('.fin-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Quitar clase active de todos los botones
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mostrar la pestaña seleccionada
  const selectedTab = document.getElementById(`fin-tab-${tabName}`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  } else {
    // Si no se encuentra el tab, intentar con el antiguo nombre (retiros -> movimientos)
    if(tabName === 'movimientos'){
      const fallbackTab = document.getElementById('fin-tab-retiros');
      if(fallbackTab) fallbackTab.classList.add('active');
    }
  }
  
  // Activar el botón correspondiente
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    if (btn.onclick && btn.onclick.toString().includes(tabName)) {
      btn.classList.add('active');
    }
  });
  
  // Renderizar contenido específico de la pestaña
  if (tabName === 'analisis') {
    console.log('📊 Renderizando análisis tab');
    renderAnalisisTab();
    renderAnalisisGrafico();
  } else if (tabName === 'estadisticas') {
    console.log('📈 Renderizando estadísticas tab');
    renderEstadisticas();
  } else if (tabName === 'analisis-detallado' || tabName === 'analisis_detallado') {
    console.log('📊 Renderizando análisis detallado tab');
    renderEstadisticasDetallado();
  }
}

function renderAnalisisTab() {
  const periodo = document.getElementById('analisis-periodo')?.value || '6meses';
  
  // Calcular fechas según el período
  const hoy = getStartOfDay();
  let fechaInicio;
  if (periodo === '6meses') {
    fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth()-5, 1);
  } else if (periodo === '1ano') {
    fechaInicio = new Date(hoy.getFullYear()-1, hoy.getMonth(), 1);
  } else {
    const todasLasFechas = [
      ...(ventas||[]).map(v=>createDate(v.fecha)),
      ...(historialCompras||[]).map(c=>createDate(c.fecha))
    ].filter(Boolean);
    fechaInicio = todasLasFechas.length > 0
      ? new Date(Math.min(...todasLasFechas))
      : new Date(hoy.getFullYear()-1, hoy.getMonth(), 1);
    fechaInicio.setDate(1);
  }
  fechaInicio.setHours(0,0,0,0);
  const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0, 23, 59, 59, 999);

  const inRng = arr => (arr||[]).filter(x => {
    const d = createDate(x.fecha); return d >= fechaInicio && d <= fechaFin;
  });

  const ventasP   = inRng(ventas);
  const comprasP  = inRng(historialCompras);

  const totalIngresos = ventasP.reduce((a,v) => a + v.unidades*v.precio + (v.propina||0), 0);
  const totalEgresos  = comprasP.reduce((a,c) => a + c.qty*c.precio, 0);
  const flujoNeto     = totalIngresos - totalEgresos;
  const margenPct     = totalIngresos > 0 ? Math.round(flujoNeto/totalIngresos*100) : 0;

  // Proyección al cierre del mes actual
  const diasMes    = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0).getDate();
  const diaActual  = hoy.getDate();
  const diasRest   = diasMes - diaActual;
  const ventasMes  = (ventas||[]).filter(v => {
    const d = createDate(v.fecha);
    return d.getFullYear()===hoy.getFullYear() && d.getMonth()===hoy.getMonth();
  });
  const ingMes = ventasMes.reduce((a,v) => a + v.unidades*v.precio + (v.propina||0), 0);
  const ritmo  = diaActual > 0 ? ingMes / diaActual : 0;
  const proyMes = ingMes + ritmo * diasRest;

  // Renderizar análisis de flujo de caja
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
  
  // Renderizar proyecciones
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

function renderAnalisisGrafico() {
  console.log('📈 Renderizando gráfico de evolución financiera');
  
  const canvas = document.getElementById('grafico-evolucion-financiera');
  if (!canvas) {
    console.error('❌ Canvas grafico-evolucion-financiera no encontrado');
    return;
  }
  
  const periodo = document.getElementById('analisis-periodo')?.value || '6meses';
  console.log('📊 Período seleccionado:', periodo);
  
  // Calcular fechas según el período
  const hoy = getStartOfDay();
  
  let fechaInicio;
  if (periodo === '6meses') {
    fechaInicio = new Date(hoy.getTime() - 6 * 30 * 864e5);
  } else if (periodo === '1ano') {
    fechaInicio = new Date(hoy.getTime() - 365 * 864e5);
  } else if (periodo === 'todo') {
    // Usar la fecha más antigua de los datos
    const todasLasFechas = [
      ...(ventas||[]).map(v=>createDate(v.fecha)),
      ...(historialCompras||[]).map(c=>createDate(c.fecha)),
      ...(extracciones||[]).map(e=>createDate(e.fecha))
    ];
    fechaInicio = todasLasFechas.length > 0 ? new Date(Math.min(...todasLasFechas)) : new Date(hoy.getTime() - 365 * 864e5);
  }
  
  // Agrupar datos por mes
  const datosPorMes = {};
  
  // Inicializar todos los meses en el rango
  let current = new Date(fechaInicio);
  current.setDate(1);
  while (current <= hoy) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    datosPorMes[key] = { ingresos: 0, gastos: 0, extracciones: 0 };
    current.setMonth(current.getMonth() + 1);
  }
  
  // Agregar ventas
  (ventas||[]).forEach(v => {
    const fecha = createDate(v.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (datosPorMes[key]) {
        datosPorMes[key].ingresos += v.unidades * v.precio + (v.propina || 0);
      }
    }
  });
  
  // Agregar compras
  (historialCompras||[]).forEach(c => {
    const fecha = createDate(c.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (datosPorMes[key]) {
        datosPorMes[key].gastos += c.qty * c.precio;
      }
    }
  });
  
  // Agregar extracciones
  (extracciones||[]).forEach(e => {
    const fecha = createDate(e.fecha);
    if (fecha >= fechaInicio && fecha <= hoy) {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (datosPorMes[key]) {
        datosPorMes[key].extracciones += e.monto;
      }
    }
  });
  
  // Preparar datos para el gráfico
  const labels = Object.keys(datosPorMes).map(key => {
    const [year, month] = key.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  });
  
  const datosIngresos = Object.values(datosPorMes).map(d => d.ingresos);
  const datosGastos = Object.values(datosPorMes).map(d => d.gastos);
  const datosExtracciones = Object.values(datosPorMes).map(d => d.extracciones);
  
  console.log('📈 Datos del gráfico:', { labels, datosIngresos, datosGastos, datosExtracciones });
  
  // Verificar si hay datos
  const hayDatos = datosIngresos.some(v => v > 0) || datosGastos.some(v => v > 0) || datosExtracciones.some(v => v > 0);
  
  if (!hayDatos) {
    console.log('⚠ No hay datos para el gráfico de evolución');
    canvas.style.display = 'none';
    return;
  }
  
  canvas.style.display = '';
  
  // Destruir gráfico anterior si existe
  if (window.evolucionChart) {
    window.evolucionChart.destroy();
    window.evolucionChart = null;
  }
  
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js no está cargado');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  window.evolucionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: datosIngresos,
          borderColor: '#C47C2B',
          backgroundColor: 'rgba(196, 124, 43, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Gastos',
          data: datosGastos,
          borderColor: '#B85450',
          backgroundColor: 'rgba(184, 84, 80, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Retiros',
          data: datosExtracciones,
          borderColor: '#6B5A44',
          backgroundColor: 'rgba(107, 90, 68, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: { size: 11 },
            color: '#6B5A44',
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: '#4A3218',
          titleColor: '#E8A84A',
          bodyColor: '#F9F4EC',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(ctx) {
              return ' ' + ctx.dataset.label + ': $' + ctx.raw.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: '#9C8A74', 
            font: { size: 11 }, 
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: {
          grid: { 
            color: 'rgba(216, 204, 188, 0.5)', 
            drawTicks: false 
          },
          border: { display: false },
          ticks: { 
            color: '#9C8A74', 
            font: { size: 11 },
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
  
  console.log('✅ Gráfico de evolución financiera renderizado');
}


// ════════════ DIAGNÓSTICO DE FINANZAS ══════════════
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

  const desdeStr = desde.toLocaleDateString('es', {day:'2-digit',month:'short',year:'numeric'});
  const hastaStr = hasta.toLocaleDateString('es', {day:'2-digit',month:'short',year:'numeric'});

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

// ════════════ PERÍODO ANÁLISIS DETALLADO ══════════════
let periodoActualDetallado = '30';

function cambiarPeriodoDetallado() {
  periodoActualDetallado = $('periodo-selector-detallado')?.value || '30';
  // Reutiliza renderEstadisticas pero apuntando a los elementos del tab detallado
  renderEstadisticasDetallado();
}

function renderEstadisticasDetallado() {
  // Sincronizar el selector del tab "Estadísticas" con el detallado y reutilizar su render
  const sel = $('periodo-selector');
  const selDet = $('periodo-selector-detallado');
  if (sel && selDet) sel.value = selDet.value;
  renderEstadisticas();
  // Actualizar label del tab detallado
  const labelDet = $('periodo-actual-detallado');
  const labelMain = $('periodo-actual');
  if (labelDet && labelMain) labelDet.textContent = labelMain.textContent;
}
