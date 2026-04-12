// ══════════════ COSTOS ══════════════
// ── Helper: costo fijo mensual total ──
function _gastoFijoMensual(){
  return (gastosFijos||[]).reduce((a,g)=>{
    if(g.periodo==='mensual') return a+g.monto;
    if(g.periodo==='semanal') return a+g.monto*4.33;
    if(g.periodo==='anual')   return a+g.monto/12;
    return a;
  },0);
}

// ── Helper: calcCosto incluyendo gastos fijos por unidad ──
function calcCostoConFijos(r, tandas=1){
  const costoIng = calcCosto(r, tandas);
  const gfMensual = _gastoFijoMensual();
  if(gfMensual <= 0) return costoIng;
  // Unidades producidas este mes
  const hoy = getStartOfDay();
  const mesInicio = _tzDateStr(inicioMes(0));
  const mesFin    = _tzDateStr(finMes(0));
  const uMes = producciones.filter(p=>p.fecha>=mesInicio&&p.fecha<=mesFin).reduce((a,p)=>{
    const rr=rec(p.recetaId); return a+(p.unidadesReales||(rr?rr.rinde*p.tandas:0));
  },0) || 1;
  const costoFijoPorUnidad = gfMensual / uMes;
  const unidades = (r.rinde||1) * tandas;
  return costoIng + costoFijoPorUnidad * unidades;
}

function renderCostos(){
  const lista = $('costos-lista');
  if(recetas.length===0){lista.innerHTML='<p class="empty">Sin recetas.</p>';return;}

  const gfMensual = _gastoFijoMensual();
  const maxC = Math.max(...recetas.map(r=>calcCostoConFijos(r)));
  const label = $('costos-resumen-label');
  if(label) label.textContent = gfMensual>0 ? `Gastos fijos incluidos: ${fmt(gfMensual)}/mes` : 'Sin gastos fijos cargados';

  lista.innerHTML = recetas.map(r=>{
    const c   = calcCostoConFijos(r);
    const cIng= calcCosto(r);
    const cU  = r.rinde>0 ? c/r.rinde : 0;
    const pct = maxC>0 ? Math.round(c/maxC*100) : 0;
    const pventa = r.precioVenta||0;
    const margenReal = pventa>0 && cU>0 ? Math.round((pventa-cU)/pventa*100) : null;

    // Badge de margen si tiene precio de venta fijo
    const margenBadge = pventa>0
      ? `<span class="badge badge-${margenReal>=40?'ok':margenReal>=20?'warn':'danger'}" style="font-size:.65rem">${margenReal}% margen</span>`
      : `<span style="font-size:.72rem;color:var(--text3)">Sin precio fijo</span>`;

    return`<div onclick="showCostoDetalle(${r.id})" style="cursor:pointer;padding:12px 14px;border-radius:var(--r);border:1px solid var(--border2);margin-bottom:8px;transition:background .14s" onmouseover="this.style.background='var(--cream2)'" onmouseout="this.style.background=''">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <span style="font-weight:500;font-size:.9rem">${r.nombre}</span>
        <div style="display:flex;align-items:center;gap:7px">
          ${margenBadge}
          <span style="font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--caramel)">${fmt(c)}</span>
        </div>
      </div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:2px">
        ${r.rinde} unid. · ${fmt(cU)}/unidad${pventa>0?` · Precio: ${fmt(pventa)}`:''}
        ${gfMensual>0&&cIng<c?` · (ing: ${fmt(calcCosto(r))})`:''}</div>
      <div class="prog-bar" style="margin-top:5px"><div class="prog-fill warn" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  // Panel de gastos fijos
  _renderGastosFijosLista();
}

function showCostoDetalle(rId){
  const r = rec(rId); if(!r) return;
  const costoIng  = calcCosto(r);
  const costoTotal= calcCostoConFijos(r);
  const cU        = r.rinde>0 ? costoTotal/r.rinde : 0;
  const cUing     = r.rinde>0 ? costoIng/r.rinde : 0;
  const gfMensual = _gastoFijoMensual();
  const costoFijoU= cU - cUing;
  const pventa    = r.precioVenta||0;
  const margenReal= pventa>0 && cU>0 ? Math.round((pventa-cU)/pventa*100) : null;
  const gananciaU = pventa>0 ? pventa-cU : null;

  $('costo-det-title').textContent = r.nombre;
  $('costos-det').innerHTML=`
    <div style="font-size:.77rem;color:var(--text3);margin-bottom:12px">${r.cat} · ${r.rinde} unidades · ${r.tiempo} min</div>

    <!-- Desglose de ingredientes -->
    ${r.ings.map(ri=>{
      const i=ing(ri.ingId); if(!i)return'';
      const sub=ri.qty*i.precio;
      const pct=costoIng>0?Math.round(sub/costoIng*100):0;
      return`<div class="costo-row">
        <span>${i.nombre} <span style="color:var(--text3);font-size:.76rem">${fmtN(ri.qty,3)} ${i.unidad}</span></span>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:46px;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--caramel);border-radius:2px"></div></div>
          <span style="font-weight:500;min-width:50px;text-align:right">${fmt(sub)}</span>
        </div></div>`;
    }).join('')}
    <div class="costo-total"><span>Costo ingredientes</span><span style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--caramel)">${fmt(costoIng)}</span></div>

    ${gfMensual>0?`
    <div class="costo-row" style="color:var(--text3)">
      <span style="font-size:.83rem">Gastos fijos distribuidos (${fmt(gfMensual)}/mes)</span>
      <span style="font-weight:500;color:var(--text2)">${fmt(costoTotal-costoIng)}</span>
    </div>
    <div class="costo-total"><span style="font-weight:700">Costo total por tanda</span><span style="font-family:'Playfair Display',serif;font-size:1.15rem;color:var(--brown2)">${fmt(costoTotal)}</span></div>
    <div style="font-size:.76rem;color:var(--text3);margin-bottom:12px">Ingredientes ${fmt(cUing)}/u + gastos fijos ${fmt(costoFijoU)}/u</div>
    `:''}

    <!-- Precio de venta fijo -->
    <div style="background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);padding:13px 15px;margin-top:4px">
      <div style="font-size:.72rem;font-weight:600;color:var(--warn);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Precio de venta</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <label style="font-size:.82rem;color:var(--text2);flex-shrink:0">Precio fijo ($)</label>
        <input type="number" id="precio-venta-input-${r.id}" value="${pventa||''}" placeholder="0.00" step="0.01" min="0"
          style="width:100px;padding:6px 9px;border:1px solid #E8CCAA;border-radius:var(--r);font-size:.9rem;font-weight:600;color:var(--brown2);background:var(--white);outline:none"
          onfocus="this.style.borderColor='var(--caramel)'" onblur="this.style.borderColor='#E8CCAA'"
          oninput="_actualizarAnalisisPrecio(${r.id})">
        <button class="btn btn-primary btn-sm" onclick="_guardarPrecioVenta(${r.id})">Guardar</button>
      </div>
      <div id="precio-analisis-${r.id}">
        ${_htmlAnalisisPrecio(r, pventa, cU)}
      </div>
    </div>

    <!-- Precios sugeridos -->
    <div style="margin-top:12px">
      <div style="font-size:.72rem;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px">Precios sugeridos por margen</div>
      <div class="price-row"><span>Costo/unidad</span><span style="font-weight:500">${fmt(cU)}</span></div>
      <div class="price-row"><span>× 2 — margen 50%</span><span>${fmt(cU*2)}</span></div>
      <div class="price-row"><span>× 2.5 — margen 60%</span><span>${fmt(cU*2.5)}</span></div>
      <div class="price-row"><span>× 3 — margen 67%</span><span>${fmt(cU*3)}</span></div>
    </div>`;
}

function _htmlAnalisisPrecio(r, pventa, cU){
  if(!pventa || pventa<=0 || !cU || cU<=0) return `<div style="font-size:.78rem;color:var(--text3)">Ingresá un precio para ver el análisis de margen.</div>`;
  const ganU    = pventa - cU;
  const margen  = Math.round(ganU/pventa*100);
  const color   = margen>=50?'ok':margen>=30?'warn':'danger';
  const icon    = margen>=50?'✓':margen>=30?'~':'✗';
  return`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:.78rem">
    <div style="text-align:center;padding:8px;background:var(--white);border-radius:var(--r);border:1px solid #E8CCAA">
      <div style="font-weight:600;color:var(--${color});font-size:1rem">${margen}%</div>
      <div style="color:var(--text3)">Margen ${icon}</div>
    </div>
    <div style="text-align:center;padding:8px;background:var(--white);border-radius:var(--r);border:1px solid #E8CCAA">
      <div style="font-weight:600;color:var(--${color})">${fmt(ganU)}</div>
      <div style="color:var(--text3)">Ganancia/u</div>
    </div>
    <div style="text-align:center;padding:8px;background:var(--white);border-radius:var(--r);border:1px solid #E8CCAA">
      <div style="font-weight:600;color:var(--caramel)">${fmt(ganU*r.rinde)}</div>
      <div style="color:var(--text3)">Gan./tanda</div>
    </div>
  </div>`;
}

function _actualizarAnalisisPrecio(rId){
  const r = rec(rId); if(!r) return;
  const input = $(`precio-venta-input-${rId}`); if(!input) return;
  const pv  = parseFloat(input.value)||0;
  const cU  = calcCostoConFijos(r) / (r.rinde||1);
  const el  = $(`precio-analisis-${rId}`); if(!el) return;
  el.innerHTML = _htmlAnalisisPrecio(r, pv, cU);
}

function _guardarPrecioVenta(rId){
  const r = rec(rId); if(!r) return;
  const input = $(`precio-venta-input-${rId}`); if(!input) return;
  const pv = parseFloat(input.value)||0;
  r.precioVenta = pv > 0 ? +pv.toFixed(2) : 0;
  saveData(); renderCostos(); showCostoDetalle(rId);
  toast(pv>0 ? `Precio de venta guardado: ${fmt(pv)} ✓` : 'Precio de venta eliminado');
}

