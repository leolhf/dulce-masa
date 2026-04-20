// ══════════════ MERMAS ══════════════
// Registro de pérdidas de producto terminado (vencido, dañado, degustación, etc.)

const _mermaMotivos = {
  vencido:    { label: 'Vencido',           icon: '🗓️', color: 'var(--danger)' },
  danado:     { label: 'Dañado',            icon: '💔', color: '#E67E4D' },
  degustacion:{ label: 'Degustación',       icon: '🍽️', color: 'var(--caramel)' },
  regalo:     { label: 'Regalo/Muestra',    icon: '🎁', color: 'var(--sage)' },
  error:      { label: 'Error producción',  icon: '⚠️', color: 'var(--warn)' },
  otro:       { label: 'Otro',              icon: '📝', color: 'var(--text3)' }
};

// ── Calcular costo estimado de una merma ──
function calcCostoMerma(recetaId, cantidad) {
  const r = rec(recetaId);
  if (!r) return 0;
  return calcCosto(r, cantidad / (r.rinde || 1));
}

// ── Renderizar el card completo de control de merma ──
function renderMermaControl() {
  const el = $('merma-control');
  if (!el) return;

  const lista = (mermas || []);
  const hoy = today();
  const mermasHoy = lista.filter(m => m.fecha === hoy);
  const costoMermasHoy = mermasHoy.reduce((a, m) => a + calcCostoMerma(m.recetaId, m.cantidad), 0);
  const unidadesHoy = mermasHoy.reduce((a, m) => a + (m.cantidad || 0), 0);

  // Resumen del mes actual
  const inicioMesStr = (() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();
  const mermasMes = lista.filter(m => m.fecha >= inicioMesStr);
  const costoMermasMes = mermasMes.reduce((a, m) => a + calcCostoMerma(m.recetaId, m.cantidad), 0);

  el.innerHTML = `
    <!-- Formulario rápido -->
    <div style="margin-bottom:14px">
      <div style="font-size:.78rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">
        Registrar pérdida
      </div>
      <input type="hidden" id="merma-edit-id" value="">
      <div class="form-grid" style="margin-bottom:10px">
        <div class="form-group">
          <label>Producto</label>
          <select id="merma-prod">
            <option value="">— Seleccionar —</option>
            ${recetas.map(r => {
              const sp = stockProd(r.id);
              const stock = sp ? sp.stock : 0;
              return `<option value="${r.id}">${escapeHTML(r.nombre)} (stock: ${stock})</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Cantidad</label>
          <input type="number" id="merma-cant" value="1" min="1" oninput="calcMermaPreview()">
        </div>
        <div class="form-group">
          <label>Motivo</label>
          <select id="merma-motivo">
            <option value="">— Seleccionar —</option>
            ${Object.entries(_mermaMotivos).map(([k,v]) =>
              `<option value="${k}">${v.icon} ${v.label}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="merma-fecha" value="${hoy}">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Nota <span style="font-size:.7rem;color:var(--text3);font-weight:400">opcional</span></label>
          <input type="text" id="merma-nota" placeholder="Ej: Se cayó la bandeja, abierto para degustación en feria…">
        </div>
      </div>
      <div id="merma-preview" style="font-size:.81rem;color:var(--text3);margin-bottom:8px;min-height:18px"></div>
      <div class="form-actions">
        <button class="btn btn-danger btn-sm" id="merma-btn-guardar" onclick="registrarMerma()">✕ Registrar merma</button>
        <button class="btn btn-secondary btn-sm" id="btn-cancelar-merma" style="display:none" onclick="cancelarEdicionMerma()">✕ Cancelar</button>
      </div>
    </div>

    <!-- Mini resumen -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="text-align:center;padding:10px;background:var(--danger-bg);border-radius:6px;border:1px solid #E8BFBE">
        <div style="font-size:1.1rem;font-weight:700;color:var(--danger)">${unidadesHoy}</div>
        <div style="font-size:.72rem;color:var(--text3)">unidades hoy</div>
        <div style="font-size:.78rem;font-weight:600;color:var(--danger)">${fmt(costoMermasHoy)}</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--cream2);border-radius:6px;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:700;color:var(--brown)">${mermasMes.length}</div>
        <div style="font-size:.72rem;color:var(--text3)">registros este mes</div>
        <div style="font-size:.78rem;font-weight:600;color:var(--brown)">${fmt(costoMermasMes)} perdidos</div>
      </div>
    </div>

    <!-- Historial reciente -->
    ${lista.length === 0 ? `<div style="text-align:center;padding:18px;color:var(--text3);font-size:.83rem">Sin mermas registradas</div>` : `
    <div style="font-size:.75rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Últimas mermas</div>
    <div style="max-height:220px;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.8rem">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="padding:4px 6px;text-align:left;color:var(--text3);font-weight:500">Fecha</th>
            <th style="padding:4px 6px;text-align:left;color:var(--text3);font-weight:500">Producto</th>
            <th style="padding:4px 6px;text-align:center;color:var(--text3);font-weight:500">Cant.</th>
            <th style="padding:4px 6px;text-align:left;color:var(--text3);font-weight:500">Motivo</th>
            <th style="padding:4px 6px;text-align:right;color:var(--text3);font-weight:500">Costo</th>
            <th style="padding:4px 6px"></th>
          </tr>
        </thead>
        <tbody>
          ${[...lista].sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id-a.id).slice(0,20).map(m => {
            const r = rec(m.recetaId);
            const motivo = _mermaMotivos[m.motivo] || { label: m.motivo || '—', icon: '📝', color: 'var(--text3)' };
            const costo = calcCostoMerma(m.recetaId, m.cantidad);
            return `<tr style="border-bottom:1px solid var(--border2)">
              <td style="padding:5px 6px;color:var(--text3)">${m.fecha}</td>
              <td style="padding:5px 6px;font-weight:500">${r ? escapeHTML(r.nombre) : '?'}</td>
              <td style="padding:5px 6px;text-align:center">${m.cantidad}</td>
              <td style="padding:5px 6px">
                <span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:10px;font-size:.68rem;font-weight:500;background:${motivo.color}22;color:${motivo.color};border:1px solid ${motivo.color}44">
                  ${motivo.icon} ${motivo.label}
                </span>
              </td>
              <td style="padding:5px 6px;text-align:right;color:var(--danger);font-size:.78rem">${costo > 0 ? fmt(costo) : '—'}</td>
              <td style="padding:5px 6px;white-space:nowrap">
                <button class="btn btn-secondary btn-sm btn-icon" onclick="editMerma(${m.id})" title="Editar">✎</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="delMerma(${m.id})" title="Eliminar">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
  `;

  // Restaurar estado de edición si está en curso
  const editId = parseInt($('merma-edit-id')?.value) || null;
  if (editId) {
    $('merma-btn-guardar').textContent = '✓ Guardar cambios';
    $('btn-cancelar-merma').style.display = 'inline-flex';
  }
}

// ── Preview del costo antes de guardar ──
function calcMermaPreview() {
  const recetaId = parseInt($('merma-prod')?.value);
  const cantidad = parseInt($('merma-cant')?.value) || 0;
  const el = $('merma-preview');
  if (!el) return;
  if (!recetaId || cantidad <= 0) { el.textContent = ''; return; }
  const costo = calcCostoMerma(recetaId, cantidad);
  const r = rec(recetaId);
  const sp = stockProd(recetaId);
  const stock = sp ? sp.stock : 0;
  el.innerHTML = costo > 0
    ? `Costo estimado de la pérdida: <strong style="color:var(--danger)">${fmt(costo)}</strong> · Stock disponible: ${stock}`
    : `Stock disponible: ${stock}`;
}

// ── Registrar / editar merma ──
function registrarMerma() {
  const editId = parseInt($('merma-edit-id').value) || null;
  const recetaId = parseInt($('merma-prod').value);
  const cantidad = parseInt($('merma-cant').value) || 0;
  const motivo = $('merma-motivo').value;
  const nota = $('merma-nota').value.trim();
  const fecha = $('merma-fecha').value || today();

  if (!recetaId || cantidad <= 0 || !motivo) {
    toast('Completá producto, cantidad y motivo'); return;
  }

  const sp = stockProd(recetaId);

  if (editId) {
    const original = (mermas || []).find(m => m.id === editId);
    if (!original) { toast('Merma no encontrada'); return; }

    // Restaurar stock anterior y descontar el nuevo
    if (sp) {
      sp.stock = Math.max(0, sp.stock + original.cantidad);
    }
    if (sp && sp.stock < cantidad) {
      toast(`Stock insuficiente. Disponible: ${sp ? sp.stock : 0}`);
      // revertir
      if (sp) sp.stock = Math.max(0, sp.stock - original.cantidad);
      return;
    }
    if (sp) sp.stock = Math.max(0, sp.stock - cantidad);

    Object.assign(original, { fecha, recetaId, cantidad, motivo, nota });
    _limpiarFormMerma();
    refreshAllStockViews();
    renderMermaControl();
    renderFinanzas();
    saveData();
    toast('Merma editada ✓');

  } else {
    const stockDisp = sp ? sp.stock : 0;
    if (cantidad > stockDisp) {
      toast(`Stock insuficiente. Disponible: ${stockDisp}`); return;
    }
    if (!mermas) mermas = [];
    const merma = { id: nextId.merma++, fecha, recetaId, cantidad, motivo, nota };
    mermas.push(merma);
    if (sp) sp.stock -= cantidad;
    _limpiarFormMerma();
    refreshAllStockViews();
    renderMermaControl();
    renderFinanzas();
    saveData();
    toast('Merma registrada ✓');
  }
}

function _limpiarFormMerma() {
  $('merma-edit-id').value = '';
  $('merma-prod').value = '';
  $('merma-cant').value = 1;
  $('merma-motivo').value = '';
  $('merma-nota').value = '';
  $('merma-fecha').value = today();
  $('merma-preview').textContent = '';
  const btn = $('merma-btn-guardar');
  if (btn) btn.textContent = '✕ Registrar merma';
  const btnCancelar = $('btn-cancelar-merma');
  if (btnCancelar) btnCancelar.style.display = 'none';
}

function editMerma(id) {
  const m = (mermas || []).find(x => x.id === id);
  if (!m) return;
  $('merma-edit-id').value = id;
  $('merma-prod').value = m.recetaId;
  $('merma-cant').value = m.cantidad;
  $('merma-motivo').value = m.motivo;
  $('merma-nota').value = m.nota || '';
  $('merma-fecha').value = m.fecha;
  const btn = $('merma-btn-guardar');
  if (btn) btn.textContent = '✓ Guardar cambios';
  const btnCancelar = $('btn-cancelar-merma');
  if (btnCancelar) btnCancelar.style.display = 'inline-flex';
  calcMermaPreview();
  if(typeof switchVentasTab==='function') switchVentasTab('mermas');
  $('merma-control').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Editando merma — modificá los datos y guardá.');
}

function cancelarEdicionMerma() {
  _limpiarFormMerma();
  renderMermaControl();
}

function delMerma(id) {
  confirmar({
    titulo: 'Eliminar merma',
    mensaje: 'Se restaurará el stock del producto.',
    labelOk: 'Eliminar',
    tipo: 'danger',
    onOk: () => {
      const m = (mermas || []).find(x => x.id === id);
      if (m) {
        const sp = stockProd(m.recetaId);
        if (sp) sp.stock += m.cantidad;
      }
      mermas = (mermas || []).filter(x => x.id !== id);
      refreshAllStockViews();
      renderMermaControl();
      renderFinanzas();
      saveData();
      toast('Merma eliminada');
    }
  });
}
