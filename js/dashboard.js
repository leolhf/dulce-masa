// ══════════════ DASHBOARD ══════════════
let _dashVentasChart = null; // instancia Chart.js del gráfico de ventas

function renderDashboard(){
  const bajos = ingredientes.filter(i => stockColor(i) !== 'ok');
  const sinStock = ingredientes.filter(i => i.stock <= 0);
  const disp = recetas.filter(r => canProduce(r));
  
  // Pedidos pendientes y urgentes
  const pedidosPendientes = (pedidos||[]).filter(p => p.estado !== 'entregado');
  const pedidosUrgentes = pedidosPendientes.filter(p => {
    if(!p.fechaEntrega) return false;
    const diff = (createLocalDate(p.fechaEntrega) - getStartOfDay()) / (1000*60*60*24);
    return diff <= 2 && diff >= 0;
  });

  // Cálculos financieros
  const hoy = getStartOfDay();
  const hoyStr = today(); // 'YYYY-MM-DD' — comparación directa sin riesgo de timezone
  const [anioActual, mesActualNum] = hoyStr.split('-').map(Number);
  const mesActual = mesActualNum; // 1-based

  const ventasHoy = (ventas||[]).filter(v => v.fecha === hoyStr);
  const ingresosHoy = ventasHoy.filter(v => v.cobrado !== false).reduce((a,v) => a + (v.unidades * v.precio) + (v.propina||0), 0);

  const ventasMes = (ventas||[]).filter(v => {
    if(!v.fecha) return false;
    const [y, m] = v.fecha.split('-').map(Number);
    return y === anioActual && m === mesActual;
  });
  const ingresosMes = ventasMes.filter(v => v.cobrado !== false).reduce((a,v) => a + (v.unidades * v.precio) + (v.propina||0), 0);
  
  // Ingresos mes anterior (para comparación de tendencia)
  const mesAnteriorNum = mesActual === 1 ? 12 : mesActual - 1;
  const anioMesAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
  const ventasMesAnterior = (ventas||[]).filter(v => {
    if(!v.fecha) return false;
    const [y, m] = v.fecha.split('-').map(Number);
    return y === anioMesAnterior && m === mesAnteriorNum;
  });
  const ingresosMesAnterior = ventasMesAnterior.filter(v => v.cobrado !== false).reduce((a,v) => a + (v.unidades * v.precio) + (v.propina||0), 0);

  // Eficiencia operativa (últimos 30 días para ser más relevante)
  const hace30 = createDate(rangoUltimosDias(30)[0]);
  const totalProduccion = producciones.reduce((a,p) => {
    const r = rec(p.recetaId);
    return a + (r ? r.rinde * p.tandas : 0);
  }, 0);
  const totalVentasUnidades = ventas.filter(v => v.cobrado !== false).reduce((a,v) => a + v.unidades, 0);
  const eficiencia = totalProduccion > 0 ? Math.round((totalVentasUnidades / totalProduccion) * 100) : 0;

  // ── KPIs Ejecutivos ──
  const kpiRow = $('kpi-executive-row');
  if(kpiRow) {
    kpiRow.innerHTML = `
      <div class="kpi-executive-card ${ingresosHoy > 0 ? 'success' : ''}">
        <div class="kpi-title">Ingresos del día</div>
        <div class="kpi-value">${fmt(ingresosHoy)}</div>
        <div class="kpi-subtitle">
          <span class="kpi-trend ${ingresosHoy > 0 ? 'up' : ''}">${ingresosHoy > 0 ? '↑' : '→'}</span>
          <span>${ventasHoy.length} ventas</span>
        </div>
      </div>
      <div class="kpi-executive-card ${ingresosMes > ingresosMesAnterior ? 'success' : ingresosMes > 0 ? 'warning' : ''}">
        <div class="kpi-title">Ingresos del mes</div>
        <div class="kpi-value">${fmt(ingresosMes)}</div>
        <div class="kpi-subtitle">
          <span class="kpi-trend ${ingresosMes >= ingresosMesAnterior ? 'up' : 'down'}">${ingresosMes >= ingresosMesAnterior ? '↑' : '↓'}</span>
          <span>${ventasMes.length} ventas${ingresosMesAnterior > 0 ? ' · ' + (ingresosMes >= ingresosMesAnterior ? '+' : '') + Math.round((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior * 100) + '% vs mes ant.' : ''}</span>
        </div>
      </div>
      <div class="kpi-executive-card ${eficiencia >= 80 ? 'success' : eficiencia >= 60 ? 'warning' : 'danger'}">
        <div class="kpi-title">Eficiencia operativa</div>
        <div class="kpi-value">${eficiencia}%</div>
        <div class="kpi-subtitle">
          <span class="kpi-trend ${eficiencia >= 80 ? 'up' : eficiencia >= 60 ? '' : 'down'}">${eficiencia >= 80 ? '↑' : eficiencia >= 60 ? '→' : '↓'}</span>
          <span>Producción vs Ventas</span>
        </div>
      </div>
      <div class="kpi-executive-card ${pedidosUrgentes.length > 0 ? 'danger' : pedidosPendientes.length > 0 ? 'warning' : 'success'}" style="cursor:pointer" onclick="goto('pedidos',document.getElementById('nav-pedidos')||document.querySelector('.nav-item[onclick*=pedidos]'))">
        <div class="kpi-title">Pedidos activos</div>
        <div class="kpi-value">${pedidosPendientes.length}</div>
        <div class="kpi-subtitle">
          <span class="kpi-trend ${pedidosUrgentes.length > 0 ? 'down' : ''}">${pedidosUrgentes.length > 0 ? '!' : '✓'}</span>
          <span>${pedidosUrgentes.length > 0 ? pedidosUrgentes.length + ' urgentes' : 'Al día'}</span>
        </div>
      </div>
    `;
  }

  // ── Centro de Alertas ──
  const alertCount = $('alert-count');
  const criticalAlerts = $('critical-alerts');
  const totalAlerts = sinStock.length + bajos.length + pedidosUrgentes.length;
  
  if(alertCount) alertCount.textContent = totalAlerts > 0 ? totalAlerts : '';
  if(criticalAlerts) {
    if(totalAlerts === 0) {
      criticalAlerts.innerHTML = '<p class="empty">✅ Todo en orden, sin alertas críticas</p>';
    } else {
      let alertsHtml = '';
      if(sinStock.length > 0) {
        alertsHtml += `<div class="alert-item danger">🚨 <strong>${sinStock.length} ingredientes</strong> sin stock: ${sinStock.slice(0,3).map(i => i.nombre).join(', ')}${sinStock.length > 3 ? '...' : ''}</div>`;
      }
      if(bajos.length > sinStock.length) {
        alertsHtml += `<div class="alert-item warning">⚠️ <strong>${bajos.length - sinStock.length} ingredientes</strong> con stock bajo: ${bajos.filter(i => i.stock > 0).slice(0,3).map(i => i.nombre).join(', ')}${bajos.length > 3 ? '...' : ''}</div>`;
      }
      if(pedidosUrgentes.length > 0) {
        alertsHtml += `<div class="alert-item danger">📋 <strong>${pedidosUrgentes.length} pedidos</strong> urgentes por entregar</div>`;
      }
      criticalAlerts.innerHTML = alertsHtml;
    }
  }

  // ── Dashboard Principal ──
  const dashPeriod = parseInt($('dashboard-period')?.value) || 30;
  renderMainDashboardChart(dashPeriod);
  
  // Actualizar métricas laterales
  const productionEff = $('production-efficiency');
  const salesTrend = $('sales-trend');
  const activeOrders = $('active-orders');
  
  if(productionEff) productionEff.textContent = eficiencia + '%';
  if(salesTrend) salesTrend.textContent = ingresosMes > 0 ? '↑' : '→';
  if(salesTrend) salesTrend.className = 'metric-trend ' + (ingresosMes > 0 ? 'positive' : 'negative');
  if(activeOrders) activeOrders.textContent = pedidosPendientes.length;

  // ── Estado del Sistema ──
  const stockStatus = $('stock-status');
  const ordersStatus = $('orders-status');
  
  if(stockStatus) {
    stockStatus.className = 'status-dot ' + (sinStock.length > 0 ? 'danger' : bajos.length > 0 ? 'warning' : 'online');
  }
  if(ordersStatus) {
    ordersStatus.className = 'status-dot ' + (pedidosUrgentes.length > 0 ? 'danger' : pedidosPendientes.length > 5 ? 'warning' : 'online');
  }

  // ── Resumen Operativo ──
  const totalIngredients = $('total-ingredients');
  const activeRecipes = $('active-recipes');
  const criticalStock = $('critical-stock');
  const efficiencyRate = $('efficiency-rate');
  
  if(totalIngredients) totalIngredients.textContent = ingredientes.length;
  if(activeRecipes) activeRecipes.textContent = disp.length;
  if(criticalStock) criticalStock.textContent = sinStock.length;
  if(efficiencyRate) efficiencyRate.textContent = eficiencia + '%';
}

// ── Funciones auxiliares del dashboard ──
function renderMainDashboardChart(days = 30) {
  const canvas = $('main-performance-chart');
  if (!canvas) return;
  
  // Obtener datos de ventas y producción para el período
  const endDate = getStartOfDay();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  
  const ventasData = (ventas || []).filter(v => {
    const fecha = createDate(v.fecha);
    return fecha >= startDate && fecha <= endDate;
  });
  
  // Agrupar por día
  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    const key = `${y}-${m}-${d}`;
    dailyData[key] = { ventas: 0, produccion: 0 };
  }
  
  ventasData.forEach(v => {
    const key = v.fecha; // ya es YYYY-MM-DD, sin riesgo de timezone
    if (dailyData[key]) {
      dailyData[key].ventas += v.unidades * v.precio;
    }
  });
  
  const dates = Object.keys(dailyData);
  const valores = dates.map(d => dailyData[d].ventas);
  const hayDatos = valores.some(v => v > 0);

  if(!hayDatos){ canvas.style.display='none'; return; }
  canvas.style.display='';

  const labelsCortos = dates.map((f, i) => {
    if(i % Math.ceil(days/7) === 0 || i === dates.length-1){
      const [,m,d] = f.split('-'); return `${d}/${m}`;
    }
    return '';
  });

  if(_dashVentasChart){ _dashVentasChart.destroy(); _dashVentasChart = null; }

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 200);
  grad.addColorStop(0, 'rgba(196,124,43,.28)');
  grad.addColorStop(1, 'rgba(196,124,43,.02)');

  _dashVentasChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labelsCortos,
      datasets: [{
        data: valores,
        borderColor: '#C47C2B',
        borderWidth: 2,
        backgroundColor: grad,
        pointRadius: valores.map(v => v > 0 ? 3 : 0),
        pointBackgroundColor: '#C47C2B',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          title: (items) => dates[items[0].dataIndex],
          label: (item) => ' ' + fmt(item.raw)
        },
        backgroundColor: '#4A3218', titleColor: '#E8A84A', bodyColor: '#F9F4EC',
        padding: 10, cornerRadius: 8
      }},
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9C8A74', font: { size: 11 }, maxRotation: 0 } },
        y: { grid: { color: 'rgba(216,204,188,.5)', drawTicks: false }, border: { display: false },
             ticks: { color: '#9C8A74', font: { size: 11 }, callback: v => fmt(v) } }
      }
    }
  });
}

// Funciones de acción rápida
function openNewPedido() {
  goto('pedidos', document.querySelector('.nav-item[onclick*=pedidos]'));
  // Scroll al formulario de nuevo pedido
  setTimeout(() => {
    const form = document.querySelector('#s-pedidos .card');
    if(form) form.scrollIntoView({behavior:'smooth'});
  }, 300);
}

function generateDailyReport() {
  goto('finanzas', document.querySelector('.nav-item[onclick*=finanzas]'));
  showFinanzasTab('estadisticas');
}

// ── Funciones de gráficos antiguas (mantenidas para compatibilidad) ──
function _renderDashVentasChart(){
  const canvas = $('dash-ventas-chart');
  const empty  = $('dash-ventas-empty');
  const label  = $('dash-ventas-total');
  if(!canvas) return;

  // Construir mapa día→ingresos para los últimos 30 días
  const hoy = getStartOfDay();
  const dias = 30;
  const mapaFechas = {};
  // rangoUltimosDias genera las claves YYYY-MM-DD en la zona configurada
  rangoUltimosDias(dias).forEach(s => { mapaFechas[s] = 0; });
  (ventas||[]).forEach(v => {
    if(mapaFechas[v.fecha] !== undefined) mapaFechas[v.fecha] += v.unidades * v.precio;
  });
  // También sumar anticipos de pedidos creados en ese período
  (pedidos||[]).forEach(p => {
    if(p.anticipo > 0 && p.fecha && mapaFechas[p.fecha] !== undefined)
      mapaFechas[p.fecha] += p.anticipo;
  });

  const labels  = Object.keys(mapaFechas);
  const valores = Object.values(mapaFechas);
  const totalPeriodo = valores.reduce((a,v)=>a+v, 0);
  const hayDatos = valores.some(v => v > 0);

  if(label) label.textContent = hayDatos ? fmt(totalPeriodo) : '';

  if(!hayDatos){
    canvas.style.display = 'none';
    if(empty) empty.style.display = '';
    return;
  }
  canvas.style.display = '';
  if(empty) empty.style.display = 'none';

  // Etiquetas abreviadas: solo mostrar día/mes cada 5 días
  const labelsCortos = labels.map((f, i) => {
    if(i % 5 === 0 || i === labels.length-1){
      const [,m,d] = f.split('-');
      return `${d}/${m}`;
    }
    return '';
  });

  // Destruir instancia previa si existe
  if(_dashVentasChart){ _dashVentasChart.destroy(); _dashVentasChart = null; }

  const ctx = canvas.getContext('2d');
  // Degradado de relleno
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 160);
  grad.addColorStop(0, 'rgba(196,124,43,.28)');
  grad.addColorStop(1, 'rgba(196,124,43,.02)');

  _dashVentasChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labelsCortos,
      datasets: [{
        data: valores,
        borderColor: '#C47C2B',
        borderWidth: 2,
        backgroundColor: grad,
        pointRadius: valores.map(v => v > 0 ? 3 : 0),
        pointBackgroundColor: '#C47C2B',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          title: (items) => { const idx = items[0].dataIndex; return labels[idx]; },
          label: (item) => ' $' + item.raw.toFixed(2)
        },
        backgroundColor: '#4A3218', titleColor: '#E8A84A', bodyColor: '#F9F4EC',
        padding: 10, cornerRadius: 8
      }},
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9C8A74', font: { size: 11 }, maxRotation: 0 } },
        y: { grid: { color: 'rgba(216,204,188,.5)', drawTicks: false }, border: { display: false },
             ticks: { color: '#9C8A74', font: { size: 11 }, callback: v => '$'+v } }
      }
    }
  });
}

function updateAlertBadge(){
  // Badge de inventario (stock crítico)
  const nInv = $('nav-inv');
  const exInv = nInv.querySelector('.nav-badge'); if(exInv) exInv.remove();
  const cntInv = ingredientes.filter(i => stockColor(i) !== 'ok').length;
  if(cntInv > 0){ const b=document.createElement('span'); b.className='nav-badge'; b.textContent=cntInv; nInv.appendChild(b); }

  // Badge de pedidos pendientes
  const nPed = document.querySelector('.nav-item[onclick*="pedidos"]');
  if(nPed){
    const exPed = nPed.querySelector('.nav-badge'); if(exPed) exPed.remove();
    const cntPed = (pedidos||[]).filter(p => p.estado !== 'entregado').length;
    if(cntPed > 0){ const b=document.createElement('span'); b.className='nav-badge'; b.style.background='var(--caramel)'; b.textContent=cntPed; nPed.appendChild(b); }
  }
}

