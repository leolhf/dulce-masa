// ══════════════ METAS FINANCIERAS ══════════════
// Metas con progreso calculado automáticamente desde los datos reales de la app

// Inicializar array de metas (se guarda en localStorage junto con todo lo demás)
// La variable `metas` se declara en globals.js — aquí solo se usa

// ── Calcular progreso real de una meta según su tipo ──
function _metaProgreso(meta) {
  const hoy  = getStartOfDay();
  const mes  = { desde: inicioMes(0), hasta: finMes(0) };
  const enMes = arr => (arr||[]).filter(x => {
    const d = createDate(x.fecha); return d >= mes.desde && d <= mes.hasta;
  });

  switch (meta.tipo) {
    case 'ingresos_mes': {
      const v = enMes(ventas);
      const actual = v.reduce((a,x) => a + x.unidades*x.precio + (x.propina||0), 0);
      return { actual, unidad: '$', label: 'Ingresos del mes actual' };
    }
    case 'ahorro': {
      // Progreso = lo que NO se retiró del disponible este mes
      const m = _finMetricas('mes_actual');
      const actual = Math.max(0, m.disponible - m.totalExtraido);
      return { actual, unidad: '$', label: 'Saldo disponible no retirado' };
    }
    case 'ventas_unidades': {
      const v = enMes(ventas);
      const actual = v.reduce((a,x) => a + x.unidades, 0);
      return { actual, unidad: 'unid.', label: 'Unidades vendidas este mes' };
    }
    case 'reducir_compras': {
      const c = enMes(historialCompras);
      const actual = c.reduce((a,x) => a + x.qty*x.precio, 0);
      // Para "reducir", la meta es gastar MENOS que el objetivo
      return { actual, unidad: '$', label: 'Gasto en compras este mes', invertido: true };
    }
    case 'personalizada':
    default:
      return { actual: meta.valorActual || 0, unidad: '$', label: 'Valor manual', manual: true };
  }
}

// ── Render principal del tab Metas ──
function renderMetas() {
  if (!metas) metas = [];

  // KPIs resumen
  const resumenEl = $('metas-resumen-kpis');
  if (resumenEl) {
    if (metas.length === 0) {
      resumenEl.innerHTML = `<p class="empty" style="margin:0">Sin metas configuradas. Creá tu primera meta para empezar a hacer seguimiento.</p>`;
    } else {
      const completadas  = metas.filter(m => { const p = _metaProgreso(m); return _metaPct(p, m) >= 100; }).length;
      const enCurso      = metas.length - completadas;
      const promedioAvance = metas.length > 0
        ? Math.round(metas.reduce((a,m) => a + Math.min(100, _metaPct(_metaProgreso(m), m)), 0) / metas.length)
        : 0;
      resumenEl.innerHTML = `
        <div class="stats-row" style="margin-bottom:0">
          <div class="stat-card">
            <div class="stat-label">Total metas</div>
            <div class="stat-value">${metas.length}</div>
          </div>
          <div class="stat-card ok-card">
            <div class="stat-label">Completadas</div>
            <div class="stat-value">${completadas}</div>
          </div>
          <div class="stat-card ${enCurso > 0 ? 'warn-card' : ''}">
            <div class="stat-label">En curso</div>
            <div class="stat-value">${enCurso}</div>
          </div>
          <div class="stat-card ${promedioAvance >= 80 ? 'ok-card' : promedioAvance >= 50 ? 'warn-card' : ''}">
            <div class="stat-label">Avance promedio</div>
            <div class="stat-value">${promedioAvance}%</div>
          </div>
        </div>`;
    }
  }

  // Lista de metas
  const listaEl = $('metas-lista-wrap');
  if (!listaEl) return;
  if (metas.length === 0) { listaEl.innerHTML = ''; return; }

  const tipoLabels = {
    ingresos_mes:    '💰 Ingresos mensuales',
    ahorro:          '🏦 Fondo / Ahorro',
    ventas_unidades: '📦 Unidades vendidas',
    reducir_compras: '🛒 Reducir compras',
    personalizada:   '🎯 Personalizada'
  };

  listaEl.innerHTML = metas.map(meta => {
    const prog    = _metaProgreso(meta);
    const pct     = _metaPct(prog, meta);
    const pctShow = Math.min(100, pct);
    const completada = pct >= 100;
    const barColor = completada ? 'var(--ok)' : pct >= 70 ? 'var(--caramel)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)';

    const fechaLimite = meta.fechaLimite
      ? ` · Límite: <strong>${meta.fechaLimite}</strong>`
      : '';

    const valorActualStr = prog.unidad === '$' ? fmt(prog.actual) : `${prog.actual} ${prog.unidad}`;
    const valorObjetivoStr = prog.unidad === '$' ? fmt(meta.objetivo) : `${meta.objetivo} ${prog.unidad}`;

    // Input manual para metas personalizadas
    const manualInput = prog.manual ? `
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <label style="font-size:.78rem;color:var(--text2);white-space:nowrap">Valor actual:</label>
        <input type="number" value="${meta.valorActual||0}" step="0.01" min="0"
          style="width:120px" class="search-input"
          onchange="actualizarMetaManual(${meta.id}, this.value)">
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:12px;${completada ? 'border-color:var(--ok)' : ''}">
        <div class="card-header" style="padding:12px 16px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <span style="font-weight:600;font-size:.95rem">${meta.nombre}</span>
              ${completada ? '<span class="badge badge-ok">✓ Completada</span>' : ''}
            </div>
            <div style="font-size:.76rem;color:var(--text3)">
              ${tipoLabels[meta.tipo] || meta.tipo}${fechaLimite}
              ${meta.nota ? ` · ${meta.nota}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editarMeta(${meta.id})" title="Editar">✎</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="eliminarMeta(${meta.id})" title="Eliminar">✕</button>
          </div>
        </div>
        <div class="card-body" style="padding:12px 16px">
          <div style="display:flex;justify-content:space-between;font-size:.83rem;color:var(--text2);margin-bottom:6px">
            <span>${prog.label}</span>
            <span style="font-weight:600;color:${completada ? 'var(--ok)' : 'var(--text1)'}">
              ${valorActualStr} <span style="color:var(--text3);font-weight:400">/ ${valorObjetivoStr}</span>
            </span>
          </div>
          <div class="prog-bar" style="height:10px;margin-bottom:6px">
            <div class="prog-fill" style="width:${pctShow}%;background:${barColor};height:100%;border-radius:5px;transition:width .5s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.76rem;color:var(--text3)">
            <span>${prog.invertido ? (pct >= 100 ? '✅ Meta de reducción lograda' : `Gastaste ${fmt(prog.actual)} de ${fmt(meta.objetivo)} máximo`) : `${pctShow}% alcanzado`}</span>
            ${!completada && !prog.invertido ? `<span style="color:var(--caramel)">Falta: ${prog.unidad === '$' ? fmt(Math.max(0, meta.objetivo - prog.actual)) : Math.max(0, meta.objetivo - prog.actual) + ' ' + prog.unidad}</span>` : ''}
          </div>
          ${manualInput}
        </div>
      </div>`;
  }).join('');
}

function _metaPct(prog, meta) {
  if (!meta.objetivo || meta.objetivo <= 0) return 0;
  if (prog.invertido) {
    // "Reducir compras": meta lograda si el gasto es <= objetivo
    return prog.actual <= meta.objetivo ? 100 : Math.round((meta.objetivo / prog.actual) * 100);
  }
  return Math.round((prog.actual / meta.objetivo) * 100);
}

// ── CRUD de metas ──
function abrirModalMeta() {
  $('meta-edit-id').value = '';
  $('meta-nombre').value  = '';
  $('meta-tipo').value    = 'ingresos_mes';
  $('meta-objetivo').value = '';
  $('meta-fecha-limite').value = '';
  $('meta-nota').value    = '';
  $('meta-modal-titulo').textContent = '🎯 Nueva meta';
  openModal('modal-meta');
}

function editarMeta(id) {
  const m = (metas||[]).find(x => x.id === id); if (!m) return;
  $('meta-edit-id').value      = id;
  $('meta-nombre').value       = m.nombre;
  $('meta-tipo').value         = m.tipo;
  $('meta-objetivo').value     = m.objetivo;
  $('meta-fecha-limite').value = m.fechaLimite || '';
  $('meta-nota').value         = m.nota || '';
  $('meta-modal-titulo').textContent = '✎ Editar meta';
  openModal('modal-meta');
}

function guardarMeta() {
  const editId     = parseInt($('meta-edit-id').value) || null;
  const nombre     = $('meta-nombre').value.trim();
  const tipo       = $('meta-tipo').value;
  const objetivo   = parseFloat($('meta-objetivo').value) || 0;
  const fechaLimite = $('meta-fecha-limite').value || '';
  const nota       = $('meta-nota').value.trim();

  if (!nombre)    { toast('Ingresá un nombre para la meta'); return; }
  if (objetivo <= 0) { toast('Ingresá un valor objetivo mayor a cero'); return; }
  if (!metas) metas = [];

  if (editId) {
    const m = metas.find(x => x.id === editId);
    if (m) Object.assign(m, { nombre, tipo, objetivo, fechaLimite, nota });
    toast('Meta actualizada ✓');
  } else {
    metas.push({ id: Date.now(), nombre, tipo, objetivo, fechaLimite, nota, valorActual: 0 });
    toast('🎯 Meta creada ✓');
  }
  closeModal('modal-meta');
  saveData();
  renderMetas();
}

function actualizarMetaManual(id, valor) {
  const m = (metas||[]).find(x => x.id === id); if (!m) return;
  m.valorActual = parseFloat(valor) || 0;
  saveData();
  renderMetas();
}

function eliminarMeta(id) {
  confirmar({ titulo:'Eliminar meta', labelOk:'Eliminar', tipo:'danger',
    onOk: () => {
      metas = metas.filter(m => m.id !== id);
      saveData(); renderMetas(); toast('Meta eliminada');
    }
  });
}
