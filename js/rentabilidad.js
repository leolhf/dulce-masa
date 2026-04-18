// ══════════════ RENTABILIDAD POR PRODUCTO ══════════════
// Cruza ventas × costos de recetas para mostrar margen real por producto

function renderRentabilidad() {
  const periodo = $('rent-periodo')?.value || 'mes_actual';
  const orden   = $('rent-orden')?.value  || 'margen_abs';

  const { desde, hasta } = _finRango(periodo);
  const enRango = arr => (arr || []).filter(x => {
    const d = createDate(x.fecha); return d >= desde && d <= hasta;
  });

  const ventasPer = enRango(ventas);

  // ── Agrupar ventas por receta ──
  const porReceta = {};
  ventasPer.filter(v => v.cobrado !== false).forEach(v => {
    const r = rec(v.recetaId);
    if (!r) return;
    if (!porReceta[r.id]) {
      porReceta[r.id] = {
        receta: r,
        unidades: 0,
        ingresos: 0,
        propinas: 0,
        costo: 0,
        nVentas: 0
      };
    }
    const entrada = porReceta[r.id];
    entrada.unidades += v.unidades;
    entrada.ingresos += v.unidades * v.precio;
    entrada.propinas += v.propina || 0;
    entrada.costo    += calcCosto(r, v.unidades / (r.rinde || 1));
    entrada.nVentas  += 1;
  });

  const filas = Object.values(porReceta).map(e => {
    const ingresosTotal = e.ingresos + e.propinas;
    const ganancia      = ingresosTotal - e.costo;
    const margenPct     = ingresosTotal > 0 ? (ganancia / ingresosTotal) * 100 : 0;
    const precioPromedio = e.nVentas > 0 ? e.ingresos / e.unidades : 0;
    return { ...e, ingresosTotal, ganancia, margenPct, precioPromedio };
  });

  // Ordenar
  if (orden === 'margen_abs') filas.sort((a,b) => b.ganancia - a.ganancia);
  else if (orden === 'margen_pct') filas.sort((a,b) => b.margenPct - a.margenPct);
  else filas.sort((a,b) => b.unidades - a.unidades);

  // ── KPIs de resumen ──
  const totalIngresos = filas.reduce((a,f) => a + f.ingresosTotal, 0);
  const totalCosto    = filas.reduce((a,f) => a + f.costo, 0);
  const totalGanancia = filas.reduce((a,f) => a + f.ganancia, 0);
  const margenGlobal  = totalIngresos > 0 ? (totalGanancia / totalIngresos) * 100 : 0;
  const mejorProducto = filas.length > 0 ? filas[0] : null;

  const resumenEl = $('rent-resumen-row');
  if (resumenEl) {
    resumenEl.innerHTML = filas.length === 0
      ? '<p class="empty">Sin ventas en el período seleccionado.</p>'
      : `<div class="stats-row" style="margin-bottom:0">
          <div class="stat-card ok-card">
            <div class="stat-label">Ganancia bruta</div>
            <div class="stat-value">${fmt(totalGanancia)}</div>
            <div class="stat-sub">Ingresos: ${fmt(totalIngresos)}</div>
          </div>
          <div class="stat-card ${margenGlobal >= 50 ? 'ok-card' : margenGlobal >= 30 ? 'warn-card' : 'danger-card'}">
            <div class="stat-label">Margen global</div>
            <div class="stat-value">${margenGlobal.toFixed(1)}%</div>
            <div class="stat-sub">Costo total: ${fmt(totalCosto)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mejor producto</div>
            <div class="stat-value" style="font-size:1rem">${mejorProducto ? mejorProducto.receta.nombre : '—'}</div>
            <div class="stat-sub">${mejorProducto ? fmt(mejorProducto.ganancia) + ' ganancia' : ''}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Productos activos</div>
            <div class="stat-value">${filas.length}</div>
            <div class="stat-sub">Con ventas en el período</div>
          </div>
        </div>`;
  }

  // ── Tabla de productos ──
  const wrap = $('rent-tabla-wrap');
  if (!wrap) return;
  if (filas.length === 0) { wrap.innerHTML = ''; return; }

  const maxGanancia = Math.max(...filas.map(f => Math.abs(f.ganancia)), 1);

  wrap.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Detalle por producto</span>
        <span style="font-size:.76rem;color:var(--text3)">${filas.length} productos · período: ${$('rent-periodo')?.options[$('rent-periodo')?.selectedIndex]?.text || ''}</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table id="tbl-rent">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Precio prom.</th>
                <th>Ingresos</th>
                <th>Costo</th>
                <th>Ganancia</th>
                <th>Margen %</th>
                <th>Barra</th>
              </tr>
            </thead>
            <tbody>
              ${filas.map((f, i) => {
                const barPct  = Math.round(Math.abs(f.ganancia) / maxGanancia * 100);
                const barColor = f.margenPct >= 50 ? 'var(--ok)' : f.margenPct >= 25 ? 'var(--warn)' : 'var(--danger)';
                const margenBadge = f.margenPct >= 50
                  ? `<span class="badge badge-ok">${f.margenPct.toFixed(0)}%</span>`
                  : f.margenPct >= 25
                  ? `<span class="badge badge-warn">${f.margenPct.toFixed(0)}%</span>`
                  : `<span class="badge" style="background:var(--danger-bg);color:var(--danger);border:1px solid #E8BFBE">${f.margenPct.toFixed(0)}%</span>`;
                return `<tr>
                  <td style="color:var(--text3);font-size:.8rem">${i+1}</td>
                  <td style="font-weight:500">${f.receta.nombre}</td>
                  <td style="text-align:right">${f.unidades}</td>
                  <td style="text-align:right">${fmt(f.precioPromedio)}</td>
                  <td style="text-align:right;color:var(--ok);font-weight:500">${fmt(f.ingresosTotal)}</td>
                  <td style="text-align:right;color:var(--text2)">${fmt(f.costo)}</td>
                  <td style="text-align:right;font-weight:600;color:${f.ganancia >= 0 ? 'var(--ok)' : 'var(--danger)'}">${fmt(f.ganancia)}</td>
                  <td style="text-align:center">${margenBadge}</td>
                  <td style="min-width:80px">
                    <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
                      <div style="width:${barPct}%;height:100%;background:${barColor};border-radius:4px;transition:width .4s"></div>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Alerta productos con margen bajo -->
    ${filas.filter(f => f.margenPct < 25 && f.unidades > 0).length > 0 ? `
    <div style="background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);padding:12px 16px;margin-top:14px;font-size:.83rem">
      <strong style="color:var(--warn)">⚠ Productos con margen bajo (&lt;25%):</strong>
      <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
        ${filas.filter(f => f.margenPct < 25 && f.unidades > 0).map(f =>
          `<span style="background:var(--white);border:1px solid #E8CCAA;border-radius:6px;padding:3px 10px;font-size:.78rem">
            ${f.receta.nombre} <strong style="color:var(--warn)">${f.margenPct.toFixed(0)}%</strong>
          </span>`
        ).join('')}
      </div>
      <div style="margin-top:8px;color:var(--text2);font-size:.78rem">
        Considerá ajustar el precio de venta o revisar los costos de ingredientes en cada receta.
      </div>
    </div>` : ''}
  `;
}
