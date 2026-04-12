// ══════════════ PEDIDOS — CALENDARIO ══════════════
// Extraído de pedidos.js — vista de calendario mensual

// ── Render del calendario ──
function renderCalendarioPedidos(){
  const el = $('pedidos-vista-cal'); if (!el) return;
  const hoy = createDate();
  if (!_calMes) _calMes = { year: hoy.getFullYear(), month: hoy.getMonth() };
  const { year, month } = _calMes;

  const q      = ($('pedidos-q').value || '').toLowerCase();
  const filtro = $('pedidos-filtro').value;

  const pedidosMes = (pedidos || []).filter(p => {
    if (p.estado === 'entregado') return false;
    if (!p.fechaEntrega) return false;
    const fe = createDate(p.fechaEntrega);
    if (fe.getFullYear() !== year || fe.getMonth() !== month) return false;
    if (q && !(p.cliente || '').toLowerCase().includes(q)) return false;
    if (filtro && p.estado !== filtro) return false;
    return true;
  });

  const porDia = {};
  pedidosMes.forEach(p => {
    const d = createDate(p.fechaEntrega).getDate();
    if (!porDia[d]) porDia[d] = [];
    porDia[d].push(p);
  });

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const primerDia = createDate(`${year}-${String(month+1).padStart(2,'0')}-01`).getDay();
  const diasMes   = new Date(year, month+1, 0).getDate(); // getDate() es invariante a TZ
  const hoyStr    = today();
  const diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const offset    = (primerDia + 6) % 7; // lunes = 0

  let celdas = '';
  for (let i = 0; i < offset; i++){
    const dPrev = new Date(year, month, -offset+i+1).getDate();
    celdas += `<div class="cal-day other-month"><div class="cal-day-num">${dPrev}</div></div>`;
  }
  for (let d = 1; d <= diasMes; d++){
    const fechaStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const esHoy      = fechaStr === hoyStr;
    const eventos    = porDia[d] || [];
    const eventosHTML = eventos.slice(0,3).map(p => {
      const ahora = getStartOfDay();
      const fe    = createDate(p.fechaEntrega);
      const diff  = Math.ceil((fe - ahora) / (1000*60*60*24));
      const cls   = p.estado === 'listo' ? 'listo' : diff <= 0 ? 'urgente' : '';
      return `<span class="cal-event ${cls}" data-id="${p.id}" onclick="verPedido(+this.dataset.id)"
        title="${p.cliente}: ${(p.items||[]).map(it=>rec(it.recetaId)?.nombre||'?').join(', ')}">${p.cliente}</span>`;
    }).join('');
    const mas = eventos.length > 3 ? `<span style="font-size:.63rem;color:var(--text3)">+${eventos.length-3} más</span>` : '';
    celdas += `<div class="cal-day${esHoy?' today':''}">
      <div class="cal-day-num">${d}</div>
      ${eventosHTML}${mas}
    </div>`;
  }
  const total = offset + diasMes;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= resto; i++){
    celdas += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }

  el.innerHTML = `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="_calNavegar(-1)">‹</button>
      <span class="cal-mes-label">${meses[month]} ${year}</span>
      <button class="cal-nav-btn" onclick="_calNavegar(1)">›</button>
      <button class="cal-nav-btn" onclick="_calMes=null;renderCalendarioPedidos()" style="font-size:.75rem">Hoy</button>
    </div>
    <div class="cal-grid">
      ${diasSemana.map(d=>`<div class="cal-header-day">${d}</div>`).join('')}
      ${celdas}
    </div>
    ${pedidosMes.length === 0 ? '<p class="empty" style="margin-top:12px">Sin pedidos este mes.</p>' : ''}`;
}

function _calNavegar(dir){
  if (!_calMes){ const h = createDate(); _calMes = { year: h.getFullYear(), month: h.getMonth() }; }
  _calMes.month += dir;
  if (_calMes.month > 11){ _calMes.month = 0; _calMes.year++; }
  if (_calMes.month < 0) { _calMes.month = 11; _calMes.year--; }
  renderCalendarioPedidos();
}
