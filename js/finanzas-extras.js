// ══════════════ FINANZAS — MEJORAS EXTRA ══════════════
// 1. Badge de salud financiera en el header
// 2. Mini-widget de flujo de los últimos 7 días
// 3. Comparativa automática vs mes anterior integrada en renderFinanzas

// ─────────────────────────────────────────────────────
// 1. BADGE DE SALUD FINANCIERA
// Semáforo visual: verde / amarillo / rojo según el estado del mes actual
// ─────────────────────────────────────────────────────
function _renderSaludFinanciera() {
  const el = $('fin-salud-badge');
  if (!el) return;

  const m = _finMetricas('mes_actual');

  // Criterios de salud
  const margen    = m.ingresosTotal > 0 ? (m.flujoBruto / m.ingresosTotal) * 100 : 0;
  const sobreGiro = m.saldoLibre < 0;
  const sinVentas = m.nVentas === 0;

  let nivel, icono, texto, bg, color, borde;

  if (sinVentas) {
    nivel = 'sin-datos'; icono = '⬜'; texto = 'Sin datos';
    bg = 'var(--cream2)'; color = 'var(--text3)'; borde = 'var(--border)';
  } else if (sobreGiro || margen < 0) {
    nivel = 'critico'; icono = '🔴'; texto = 'En déficit';
    bg = 'var(--danger-bg)'; color = 'var(--danger)'; borde = '#E8BFBE';
  } else if (margen < 20 || m.saldoLibre < m.reservaOp * 0.5) {
    nivel = 'alerta'; icono = '🟡'; texto = 'Atención';
    bg = 'var(--warn-bg)'; color = 'var(--warn)'; borde = '#E8CCAA';
  } else if (margen >= 40) {
    nivel = 'excelente'; icono = '🟢'; texto = 'Excelente';
    bg = 'var(--ok-bg)'; color = 'var(--ok)'; borde = '#BCCFBC';
  } else {
    nivel = 'ok'; icono = '🟢'; texto = 'Saludable';
    bg = 'var(--ok-bg)'; color = 'var(--ok)'; borde = '#BCCFBC';
  }

  el.style.cssText = `display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:.78rem;font-weight:600;cursor:pointer;background:${bg};color:${color};border:1px solid ${borde}`;
  el.innerHTML = `${icono} ${texto} <span style="font-weight:400;opacity:.8">${margen >= 0 ? margen.toFixed(0) + '% margen' : 'déficit'}</span>`;
  el.title = `Margen: ${margen.toFixed(1)}% · Flujo: ${fmt(m.flujoBruto)} · Saldo libre: ${fmt(m.saldoLibre)}`;
}

// ─────────────────────────────────────────────────────
// 2. MINI-WIDGET: FLUJO ÚLTIMOS 7 DÍAS
// Barras diarias de ingresos (verde) y gastos (rojo)
// ─────────────────────────────────────────────────────
function _renderSemanaFinanciera() {
  const barrasEl  = $('fin-semana-barras');
  const labelsEl  = $('fin-semana-labels');
  const balanceEl = $('fin-semana-balance');
  if (!barrasEl) return;

  const hoy = getStartOfDay();
  const diasKeys = rangoUltimosDias(7);
  const dias = diasKeys.map(key => ({ key, d: createDate(key) }));

  const diaNombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  const dataDias = dias.map(({ key, d }) => {
    const ing = (ventas || []).filter(v => v.fecha === key)
      .reduce((a, v) => a + v.unidades * v.precio + (v.propina || 0), 0);
    const gas = (historialCompras || []).filter(c => c.fecha === key)
      .reduce((a, c) => a + c.qty * c.precio, 0);
    return { key, dia: diaNombres[d.getDay()], ing, gas, neto: ing - gas };
  });

  const maxVal = Math.max(...dataDias.map(d => Math.max(d.ing, d.gas)), 1);
  const totalIng = dataDias.reduce((a, d) => a + d.ing, 0);
  const totalGas = dataDias.reduce((a, d) => a + d.gas, 0);
  const totalNeto = totalIng - totalGas;

  if (balanceEl) {
    balanceEl.style.color = totalNeto >= 0 ? 'var(--ok)' : 'var(--danger)';
    balanceEl.textContent = `${totalNeto >= 0 ? '+' : ''}${fmt(totalNeto)} neto`;
  }

  // Barras apiladas por día
  barrasEl.innerHTML = dataDias.map(({ dia, ing, gas, key }) => {
    const hIng = ing  > 0 ? Math.max(4, Math.round((ing  / maxVal) * 44)) : 0;
    const hGas = gas  > 0 ? Math.max(4, Math.round((gas  / maxVal) * 44)) : 0;
    const esHoy = key === today();
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0"
              title="${dia}: ingresos ${fmt(ing)} · gastos ${fmt(gas)}">
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:44px;gap:1px">
        ${hIng > 0 ? `<div style="width:100%;height:${hIng}px;background:var(--ok);border-radius:2px;opacity:.85"></div>` : ''}
        ${hGas > 0 ? `<div style="width:100%;height:${hGas}px;background:var(--danger);border-radius:2px;opacity:.7"></div>` : ''}
        ${hIng === 0 && hGas === 0 ? `<div style="width:100%;height:3px;background:var(--border);border-radius:2px;margin-top:auto"></div>` : ''}
      </div>
    </div>`;
  }).join('');

  labelsEl.innerHTML = dataDias.map(({ dia, key }) => {
    const esHoy = key === today();
    return `<div style="flex:1;text-align:center;font-size:.6rem;color:${esHoy ? 'var(--caramel)' : 'var(--text3)'};font-weight:${esHoy ? '700' : '400'}">${esHoy ? 'Hoy' : dia}</div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────
// 3. COMPARATIVA MES ANTERIOR en el resumen ejecutivo
// Muestra flechas ↑↓ y diferencias junto a cada KPI
// ─────────────────────────────────────────────────────
function _renderComparativaMes() {
  const mAct  = _finMetricas('mes_actual');
  const mAnt  = _finMetricas('mes_anterior');

  const _diff = (actual, anterior) => {
    if (anterior === 0) return null;
    return ((actual - anterior) / Math.abs(anterior)) * 100;
  };

  const _badge = (pct, invertido = false) => {
    if (pct === null) return '';
    const bueno = invertido ? pct < 0 : pct > 0;
    const neutro = Math.abs(pct) < 1;
    if (neutro) return `<span style="font-size:.68rem;color:var(--text3);margin-left:4px">→ sin cambio</span>`;
    const color = bueno ? 'var(--ok)' : 'var(--danger)';
    const flecha = pct > 0 ? '↑' : '↓';
    return `<span style="font-size:.68rem;color:${color};font-weight:600;margin-left:4px">${flecha} ${Math.abs(pct).toFixed(0)}%</span>`;
  };

  // Actualizar subtextos del resumen ejecutivo con comparativas
  const updEl = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

  updEl('resumen-ingresos-det',   `${mAct.nVentas} ventas ${_badge(_diff(mAct.ingresosTotal, mAnt.ingresosTotal))}`);
  updEl('resumen-gastos-det',     `${fmt(mAct.costoCompras)} compras + ${fmt(mAct.costosVariables + mAct.gastosFijosMes)} op. ${_badge(_diff(mAct.gastosTotales, mAnt.gastosTotales), true)}`);
  updEl('resumen-disponible-det', `Para retiros ${_badge(_diff(mAct.disponible, mAnt.disponible))}`);
}

// ─────────────────────────────────────────────────────
// HOOK: extender renderFinanzas para incluir las extras
// Se llama al final de la función principal
// ─────────────────────────────────────────────────────
const _renderFinanzasOriginal = typeof renderFinanzas === 'function' ? renderFinanzas : null;

function renderFinanzasConExtras() {
  if (_renderFinanzasOriginal) _renderFinanzasOriginal();
  // Extras
  _renderSaludFinanciera();
  _renderSemanaFinanciera();
  _renderComparativaMes();
  // Refrescar metas si el tab está visible
  if (document.getElementById('fin-tab-metas')?.classList.contains('active')) renderMetas();
}
