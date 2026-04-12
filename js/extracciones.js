// ══════════════ EXTRACCIONES / RETIROS ══════════════
// Extraído de finanzas.js — CRUD de retiros de capital

const _extTipoLabels = {
  salario:       '🏠 Sueldo personal',
  dividendo:     '💰 Dividendo',
  reinversion:   '🔄 Reinversión',
  reserva:       '🏦 Fondo de reserva',
  gasto_personal:'🛍 Gasto personal',
  impuesto:      '📑 Impuestos',
  otro:          '📌 Otro'
};

// ── Tabla de retiros ──
function _renderExtTable(){
  if (!extracciones) extracciones = [];
  const tb = $('tbl-ext')?.querySelector('tbody');
  if (!tb) return;

  const total = extracciones.reduce((a,e) => a + e.monto, 0);
  const el = $('ext-stats');
  if (el) el.textContent = `${extracciones.length} retiros · Total: ${fmt(total)}`;

  if (extracciones.length === 0){
    tb.innerHTML = '<tr><td colspan="6" class="empty">Sin retiros registrados</td></tr>';
    return;
  }

  const sorted = [...extracciones].sort((a,b) => createDate(b.fecha) - createDate(a.fecha));
  const _periodoLabel = { mes_actual:'Mes actual', mes_anterior:'Mes anterior', semana:'Última semana', todo:'Todo' };
  tb.innerHTML = sorted.map(e => `
    <tr>
      <td>${e.fecha}</td>
      <td><span class="badge badge-warn" style="font-size:.7rem">${_extTipoLabels[e.tipo] || e.tipo}</span></td>
      <td style="color:var(--text2)">${e.concepto || '—'}</td>
      <td style="font-weight:600;color:var(--danger)">${fmt(e.monto)}</td>
      <td style="font-size:.78rem;color:var(--text3)">${_periodoLabel[e.periodo] || '—'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editExtraccion(${e.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delExtraccion(${e.id})" title="Eliminar">✕</button>
      </td>
    </tr>`).join('');
}

// ── Preview al calcular monto ──
function calcExtraccion(){
  const monto = parseFloat($('ext-monto')?.value) || 0;
  const prev = $('ext-preview');
  if (!prev || monto <= 0){ if (prev) prev.innerHTML = ''; return; }

  const periodo = $('ext-periodo')?.value || 'mes_actual';
  const m = _finMetricas(periodo);
  const excede    = monto > m.disponible;
  const superaSug = monto > m.retiroSugerido && !excede;

  const bgColor     = excede ? 'var(--danger-bg)' : superaSug ? 'var(--warn-bg)' : 'var(--ok-bg)';
  const borderColor = excede ? '#E8BFBE' : superaSug ? '#E8CCAA' : '#BCCFBC';
  const mensaje = excede
    ? `⚠ <strong>Excede el disponible</strong> (${fmt(m.disponible)}). Vas a quedar ${fmt(monto - m.disponible)} en negativo.`
    : superaSug
    ? `⚠ Supera el retiro sugerido de ${fmt(m.retiroSugerido)} (70% del disponible). Aún así es posible registrarlo.`
    : `✅ Retiro dentro del rango saludable. Quedarán ${fmt(m.disponible - monto)} disponibles.`;

  prev.innerHTML = `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:var(--r);padding:10px 13px;font-size:.83rem">${mensaje}</div>`;
}

// ── Guardar / editar extracción ──
function registrarExtraccion(){
  const editId  = parseInt($('ext-edit-id').value) || null;
  const fecha   = $('ext-fecha').value || today();
  const tipo    = $('ext-tipo').value;
  const monto   = parseFloat($('ext-monto').value) || 0;
  const concepto = $('ext-concepto').value.trim();
  const periodo = $('ext-periodo')?.value || 'mes_actual';

  if (monto <= 0){ toast('Ingresá un monto válido'); return; }
  if (!extracciones) extracciones = [];

  if (editId){
    const e = extracciones.find(x => x.id === editId);
    if (e) Object.assign(e, { fecha, tipo, monto, concepto, periodo });
    $('ext-edit-id').value = '';
    $('ext-btn-guardar').textContent = '💵 Registrar retiro';
    $('ext-btn-cancelar').style.display = 'none';
    toast('Retiro actualizado ✓');
  } else {
    extracciones.push({ id: nextId.ext++, fecha, tipo, monto, concepto, periodo });
    toast('💵 Retiro registrado ✓');
  }

  $('ext-fecha').value   = today();
  $('ext-monto').value   = '';
  $('ext-concepto').value = '';
  $('ext-preview').innerHTML = '';

  saveData();
  renderFinanzas();
}

function editExtraccion(id){
  const e = extracciones.find(x => x.id === id);
  if (!e) return;

  $('ext-edit-id').value  = id;
  $('ext-fecha').value    = e.fecha;
  $('ext-tipo').value     = e.tipo;
  $('ext-monto').value    = e.monto;
  $('ext-concepto').value = e.concepto || '';
  if ($('ext-periodo')) $('ext-periodo').value = e.periodo || 'mes_actual';
  $('ext-btn-guardar').textContent = '✓ Guardar cambios';
  $('ext-btn-cancelar').style.display = 'inline-flex';
  calcExtraccion();
  document.querySelector('#s-finanzas .card').scrollIntoView({ behavior:'smooth' });
  toast('Editando retiro — modificá los datos y guardá.');
}

function cancelarEdicionExtraccion(){
  $('ext-edit-id').value   = '';
  $('ext-fecha').value     = today();
  $('ext-monto').value     = '';
  $('ext-concepto').value  = '';
  $('ext-preview').innerHTML = '';
  $('ext-btn-guardar').textContent = '💵 Registrar retiro';
  $('ext-btn-cancelar').style.display = 'none';
}

function delExtraccion(id){
  confirmar({ titulo:'Eliminar retiro', labelOk:'Eliminar', tipo:'danger',
    onOk: () => {
      extracciones = extracciones.filter(e => e.id !== id);
      saveData();
      renderFinanzas();
      toast('Retiro eliminado');
    }
  });
}
