// ══════════════ PRÉSTAMOS PERSONALES AL NEGOCIO ══════════════
// Extraído de finanzas.js — CRUD completo de préstamos

// ── Cálculo de saldo de un préstamo ──
function _prestSaldo(p){
  const pagado = (p.pagos || []).reduce((a,x) => a + x.monto, 0);
  return { pagado, pendiente: Math.max(0, p.monto - pagado), saldado: pagado >= p.monto };
}

// Cuánto se ha generado automáticamente por % de producción para un préstamo
function _prestPagoAutoProduccion(p){
  if (!p.devolver || p.modalidad !== 'produccion') return 0;
  const desde = createDate(p.fecha); desde.setHours(0,0,0,0);
  return (producciones || [])
    .filter(pr => createDate(pr.fecha) >= desde)
    .reduce((acc, pr) => {
      const r = rec(pr.recetaId);
      if (!r) return acc;
      const costoLote = calcCosto(r, pr.tandas);
      const valorEst  = costoLote * 2; // estimación: 2× costo como valor de producción
      return acc + valorEst * ((p.pctPorProduccion || 10) / 100);
    }, 0);
}

// ── Tabla de préstamos ──
function renderPrestamos(){
  if (!prestamos) prestamos = [];

  const sr = $('prest-stats-row');
  if (sr){
    const totalDep  = prestamos.reduce((a,p) => a + p.monto, 0);
    const totalPend = prestamos.filter(p => p.devolver).reduce((a,p) => {
      const s = _prestSaldo(p);
      const autoGen = _prestPagoAutoProduccion(p);
      return a + Math.max(0, s.pendiente - autoGen);
    }, 0);
    const totalSaldados = prestamos.filter(p => {
      if (!p.devolver) return false;
      return _prestSaldo(p).saldado;
    }).length;
    const noDevolv = prestamos.filter(p => !p.devolver).length;

    sr.innerHTML = `
      <div class="stat-card ok-card">
        <div class="stat-label">Total depositado</div>
        <div class="stat-value">${fmt(totalDep)}</div>
        <div class="stat-sub">${prestamos.length} préstamo${prestamos.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card ${totalPend > 0 ? 'warn-card' : 'ok-card'}">
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
  if (!tb) return;
  if (prestamos.length === 0){
    tb.innerHTML = '<tr><td colspan="8" class="empty">Sin préstamos registrados</td></tr>';
    return;
  }

  const sorted = [...prestamos].sort((a,b) => createDate(b.fecha) - createDate(a.fecha));
  tb.innerHTML = sorted.map(p => {
    const s = _prestSaldo(p);
    const autoGen  = p.devolver && p.modalidad === 'produccion' ? _prestPagoAutoProduccion(p) : 0;
    const pendReal = p.devolver ? Math.max(0, s.pendiente - autoGen) : 0;
    const saldado  = p.devolver ? (s.pagado + autoGen >= p.monto) : false;
    let estadoBadge;
    if (!p.devolver){
      estadoBadge = `<span class="badge" style="background:var(--cream2);color:var(--text2);border:1px solid var(--border)">Sin retorno</span>`;
    } else if (saldado){
      estadoBadge = `<span class="badge badge-ok">✓ Saldado</span>`;
    } else if (p.modalidad === 'produccion'){
      estadoBadge = `<span class="badge badge-warn">⚙ Auto (${p.pctPorProduccion || 10}%)</span>`;
    } else {
      estadoBadge = `<span class="badge" style="background:var(--warn-bg);color:var(--warn);border:1px solid #E8CCAA">💳 Manual</span>`;
    }
    return `<tr>
      <td style="white-space:nowrap">${p.fecha}</td>
      <td style="font-weight:500">${p.prestamista || '—'}</td>
      <td style="color:var(--text2);font-size:.83rem">${p.concepto || '—'}</td>
      <td style="font-weight:600;color:var(--ok)">${fmt(p.monto)}</td>
      <td style="color:var(--text2)">${p.devolver ? fmt(s.pagado + autoGen) : '—'}</td>
      <td style="font-weight:600;color:${pendReal > 0 ? 'var(--warn)' : 'var(--ok)'}">
        ${p.devolver ? fmt(pendReal) : '—'}
      </td>
      <td>${estadoBadge}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="verDetallePrestamo(${p.id})" title="Ver detalle / pagar">🔍</button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editPrestamo(${p.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delPrestamo(${p.id})" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Modal nuevo/editar préstamo ──
function _setupModalidadListener(){
  document.querySelectorAll('input[name="prest-modalidad"]').forEach(r =>
    r.addEventListener('change', () => {
      $('prest-pct-field').style.display = r.value === 'produccion' && r.checked ? 'block' : 'none';
    })
  );
}

function abrirModalPrestamo(){
  $('prest-edit-id').value = '';
  $('prest-fecha').value   = today();
  $('prest-prestamista').value = '';
  $('prest-monto').value   = '';
  $('prest-concepto').value = '';
  $('prest-devolver').checked = false;
  $('prest-mod-prod').checked = true;
  $('prest-pct').value = '10';
  $('prest-devolucion-opts').style.display = 'none';
  $('prest-pct-field').style.display = 'block';
  $('prest-modal-titulo').textContent = '🏦 Nuevo préstamo';
  openModal('modal-prestamo');
  _setupModalidadListener();
}

function editPrestamo(id){
  const p = (prestamos || []).find(x => x.id === id);
  if (!p) return;
  $('prest-edit-id').value = id;
  $('prest-fecha').value   = p.fecha;
  $('prest-prestamista').value = p.prestamista || '';
  $('prest-monto').value   = p.monto;
  $('prest-concepto').value = p.concepto || '';
  $('prest-devolver').checked = !!p.devolver;
  $('prest-devolucion-opts').style.display = p.devolver ? 'block' : 'none';
  if (p.modalidad === 'manual') $('prest-mod-manual').checked = true;
  else $('prest-mod-prod').checked = true;
  $('prest-pct').value = p.pctPorProduccion || 10;
  $('prest-pct-field').style.display = p.modalidad !== 'manual' ? 'block' : 'none';
  $('prest-modal-titulo').textContent = '✎ Editar préstamo';
  openModal('modal-prestamo');
  _setupModalidadListener();
}

function togglePrestDevolucion(){
  $('prest-devolucion-opts').style.display = $('prest-devolver').checked ? 'block' : 'none';
}

function cerrarModalPrestamo(){ closeModal('modal-prestamo'); }

function guardarPrestamo(){
  const editId   = parseInt($('prest-edit-id').value) || null;
  const fecha    = $('prest-fecha').value || today();
  const prestamista = $('prest-prestamista').value.trim();
  const monto    = parseFloat($('prest-monto').value) || 0;
  const concepto = $('prest-concepto').value.trim();
  const devolver = $('prest-devolver').checked;
  const modalidad = document.querySelector('input[name="prest-modalidad"]:checked')?.value || 'produccion';
  const pctPorProduccion = parseFloat($('prest-pct').value) || 10;

  if (monto <= 0)    { toast('Ingresá un monto válido'); return; }
  if (!prestamista)  { toast('Indicá de quién es el préstamo'); return; }
  if (!prestamos) prestamos = [];

  if (editId){
    const p = prestamos.find(x => x.id === editId);
    if (p) Object.assign(p, { fecha, prestamista, monto, concepto, devolver, modalidad, pctPorProduccion });
    toast('Préstamo actualizado ✓');
  } else {
    prestamos.push({ id: nextId.prestamo++, fecha, prestamista, monto, concepto, devolver, modalidad, pctPorProduccion, pagos: [] });
    toast('🏦 Préstamo registrado ✓');
  }
  cerrarModalPrestamo();
  saveData();
  renderPrestamos();
  renderFinanzas();
}

// ── Modal detalle / pagos ──
function verDetallePrestamo(id){
  const p = (prestamos || []).find(x => x.id === id);
  if (!p) return;
  const s = _prestSaldo(p);
  const autoGen  = p.devolver && p.modalidad === 'produccion' ? _prestPagoAutoProduccion(p) : 0;
  const pendReal = p.devolver ? Math.max(0, p.monto - s.pagado - autoGen) : 0;
  const saldado  = p.devolver && (s.pagado + autoGen >= p.monto);
  $('prest-det-titulo').textContent = `🏦 ${p.prestamista} — ${fmt(p.monto)}`;

  let html = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${_finFila('Monto prestado', p.monto, 'ok')}
      ${p.devolver ? `
        ${_finFila('Ya devuelto (manual)', s.pagado, 'ok')}
        ${p.modalidad === 'produccion' ? _finFila('Generado por producción (' + (p.pctPorProduccion || 10) + '%)', autoGen, 'ok') : ''}
        <div style="height:1px;background:var(--border);margin:4px 0"></div>
        ${_finFila('= Pendiente de devolver', pendReal, pendReal > 0 ? 'danger' : 'ok')}
      ` : `<div style="font-size:.83rem;color:var(--text3);padding:6px 0">Este préstamo no requiere devolución.</div>`}
    </div>`;

  if (p.devolver && p.modalidad === 'produccion'){
    html += `<div style="background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:.82rem;color:var(--text2)">
      <strong>⚙ Devolución automática:</strong> Cada producción registrada desde <strong>${p.fecha}</strong> aporta el
      <strong>${p.pctPorProduccion || 10}%</strong> de su valor estimado (2× costo) hacia este préstamo.
      El acumulado generado hasta hoy es <strong style="color:var(--ok)">${fmt(autoGen)}</strong>.
      ${saldado ? '<br><br>✅ <strong style="color:var(--ok)">Préstamo completamente saldado.</strong>' : ''}
    </div>`;
  }

  if (p.devolver && !saldado && p.modalidad === 'manual'){
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

  if (p.devolver && (p.pagos || []).length > 0){
    html += `<div style="font-size:.85rem;font-weight:600;color:var(--brown2);margin-bottom:8px">Historial de pagos manuales</div>
      <div class="table-wrap"><table style="font-size:.83rem">
        <thead><tr><th>Fecha</th><th>Monto</th><th>Nota</th><th></th></tr></thead>
        <tbody>${[...(p.pagos || [])].sort((a,b) => createDate(b.fecha) - createDate(a.fecha)).map(pg => `
          <tr>
            <td>${pg.fecha}</td>
            <td style="font-weight:600;color:var(--ok)">${fmt(pg.monto)}</td>
            <td style="color:var(--text2)">${pg.nota || '—'}</td>
            <td><button class="btn btn-danger btn-sm btn-icon" onclick="delPagoPrestamo(${p.id},${pg.id})">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  $('prest-det-body').innerHTML = html;
  openModal('modal-prest-detalle');
}

function cerrarModalPrestDetalle(){ closeModal('modal-prest-detalle'); }

function registrarPagoPrestamo(prestId){
  const p = (prestamos || []).find(x => x.id === prestId);
  if (!p) return;
  const monto = parseFloat($('prest-pago-monto')?.value) || 0;
  const fecha = $('prest-pago-fecha')?.value || today();
  const nota  = $('prest-pago-nota')?.value.trim() || '';
  if (monto <= 0){ toast('Ingresá un monto válido'); return; }
  if (!p.pagos) p.pagos = [];
  const pid = (p.pagos.reduce((m,x) => Math.max(m, x.id || 0), 0)) + 1;
  p.pagos.push({ id: pid, fecha, monto, nota });
  toast('💳 Pago registrado ✓');
  saveData();
  renderPrestamos();
  verDetallePrestamo(prestId);
}

function delPagoPrestamo(prestId, pagoId){
  const p = (prestamos || []).find(x => x.id === prestId);
  if (!p) return;
  confirmar({ titulo:'Eliminar pago', labelOk:'Eliminar', tipo:'danger',
    onOk: () => {
      p.pagos = (p.pagos || []).filter(x => x.id !== pagoId);
      saveData(); renderPrestamos(); verDetallePrestamo(prestId); toast('Pago eliminado');
    }
  });
}

function delPrestamo(id){
  confirmar({ titulo:'Eliminar préstamo', labelOk:'Eliminar', tipo:'danger',
    onOk: () => {
      prestamos = prestamos.filter(p => p.id !== id);
      saveData(); renderPrestamos(); renderFinanzas(); toast('Préstamo eliminado');
    }
  });
}
