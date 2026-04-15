// ══════════════ NAVEGACIÓN ══════════════
function goto(sec,el){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  $('s-'+sec).classList.add('active');
  if(el)el.classList.add('active');
  $('page-title').textContent=TITLES[sec]||sec;
  curSection=sec;
  const tr=$('topbar-right');
  let btns='';
  if(sec==='dashboard') btns+=`<button class="btn btn-secondary btn-sm" onclick="importarDesdeJSON()" title="Cargar datos desde archivo JSON">📂 Importar</button>`;
  if(EXPORTS.includes(sec)) btns+=`<button class="btn btn-secondary btn-sm" onclick="exportCSV()" title="Exportar a CSV">↓ CSV</button>`;
  // Botón PWA — se conserva si está disponible
  const pwaVisible = _pwaPrompt !== null;
  btns += `<button id="btn-pwa-install" onclick="pwaInstall()" style="display:${pwaVisible?'inline-flex':'none'};align-items:center;gap:5px;background:rgba(196,124,43,.15);color:var(--caramel);border:1px solid rgba(196,124,43,.4);font-size:.78rem;padding:6px 12px;border-radius:var(--r);cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500">⬇ Instalar app</button>`;
  tr.innerHTML=btns;
  render(sec);
  if(window.innerWidth<=768) closeSidebar();
}

function render(sec){
  ({dashboard:renderDashboard,inventario:renderInventario,recetas:renderRecetas,produccion:renderProduccion,pedidos:renderPedidos,costos:renderCostos,ventas:renderVentas,historial:renderHistorial,proveedores:renderProveedores,estadisticas:()=>{goto('finanzas');showFinanzasTab('estadisticas');},finanzas:renderFinanzas}[sec]||Function)();
  updateAlertBadge();
}

function toggleSidebar(){
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
