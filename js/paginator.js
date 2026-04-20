// ══════════════ PAGINACIÓN ══════════════
// Extraído de helpers.js para separación de responsabilidades

const _pag = {
  ventas:  { page: 1, size: 25 },
  hist:    { page: 1, size: 25 },
  pedidos: { page: 1, size: 25 }
};

// Mapa de funciones de render por clave — se completa en init.js
const _pagRenderFns = {};

function renderPaginator(key, total) {
  const p = _pag[key];
  const totalPags = Math.max(1, Math.ceil(total / p.size));
  if (p.page > totalPags) p.page = totalPags;
  const el = $('pag-' + key);
  if (!el) return;
  if (total <= p.size) { el.innerHTML = ''; return; }

  let pagBtns = '';
  const rango = 2;
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || (i >= p.page - rango && i <= p.page + rango)) {
      pagBtns += `<button class="pag-btn${i === p.page ? ' active' : ''}" onclick="_pagGo('${key}',${i})">${i}</button>`;
    } else if (i === p.page - rango - 1 || i === p.page + rango + 1) {
      pagBtns += `<span style="padding:0 3px;color:var(--text3);font-size:.8rem">…</span>`;
    }
  }

  const desde = (p.page - 1) * p.size + 1;
  const hasta = Math.min(p.page * p.size, total);
  el.innerHTML = `<div class="pag-wrap">
    <span class="pag-info">${desde}–${hasta} de ${total}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <select class="pag-size" onchange="_pagSize('${key}',this.value)">
        ${[25,50,100].map(n=>`<option value="${n}"${p.size===n?' selected':''}>${n} por página</option>`).join('')}
      </select>
      <div class="pag-btns">
        <button class="pag-btn" onclick="_pagGo('${key}',${p.page-1})" ${p.page===1?'disabled':''}>‹</button>
        ${pagBtns}
        <button class="pag-btn" onclick="_pagGo('${key}',${p.page+1})" ${p.page===totalPags?'disabled':''}>›</button>
      </div>
    </div>
  </div>`;
}

function _pagGo(key, page) {
  const p = _pag[key];
  const fn = _pagRenderFns[key];
  if (!fn) return;
  const totalPags = Math.max(1, Math.ceil(
    key==='ventas'  ? (ventas||[]).length :
    key==='hist'    ? (ventas||[]).length :
    key==='pedidos' ? (pedidos||[]).length : 0
  ) / p.size);
  p.page = Math.max(1, Math.min(page, totalPags));
  fn();
  const tbl = $('tbl-' + key);
  if (tbl) {
    const wrap = tbl.closest('.table-wrap') || tbl.closest('.card-body');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _pagSize(key, size) {
  _pag[key].size = parseInt(size);
  _pag[key].page = 1;
  const fn = _pagRenderFns[key];
  if (fn) fn();
}

function _pagReset(key) { _pag[key].page = 1; }
