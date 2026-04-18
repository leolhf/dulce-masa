// ══════════════ ESTADÍSTICAS ══════════════
let periodoActual = '30'; // período seleccionado por defecto

function cambiarPeriodo() {
  periodoActual = $('periodo-selector').value;
  renderEstadisticas();
}

function getPeriodoFechas(tipo) {
  const hoy = getStartOfDay();
  if (tipo === '7')  return { inicio: createDate(rangoUltimosDias(7)[0]),  fin: hoy, label:'Últimos 7 días' };
  if (tipo === '30') return { inicio: createDate(rangoUltimosDias(30)[0]), fin: hoy, label:'Últimos 30 días' };
  if (tipo === '90') return { inicio: createDate(rangoUltimosDias(90)[0]), fin: hoy, label:'Últimos 90 días' };
  if (tipo === 'mes_actual') {
    return { inicio: inicioMes(0), fin: hoy, label:'Este mes' };
  }
  if (tipo === 'mes_pasado') {
    return {
      inicio: inicioMes(-1),
      fin:    finMes(-1),
      label:  'Mes pasado'
    };
  }
}

function getPeriodoAnterior(tipo) {
  const actual = getPeriodoFechas(tipo);
  const dias   = Math.ceil((actual.fin - actual.inicio) / 864e5);
  return {
    inicio: new Date(actual.inicio.getTime() - dias*864e5),
    fin:    new Date(actual.fin.getTime()    - dias*864e5),
    label:  'Período anterior'
  };
}

// ── instancia del gráfico de línea ──
let _statsLineChart = null;

function renderEstadisticas(){
  console.log('🚀 Iniciando renderEstadisticas()');
  const periodo         = getPeriodoFechas(periodoActual);
  const periodoAnterior = getPeriodoAnterior(periodoActual);
  $('periodo-actual').textContent = periodo.label;

  // ─── Filtrar datos ───
  const enPer = arr => arr.filter(x=>{ const f=createDate(x.fecha); return f>=periodo.inicio && f<=periodo.fin; });
  const enAnt = arr => arr.filter(x=>{ const f=createDate(x.fecha); return f>=periodoAnterior.inicio && f<=periodoAnterior.fin; });

  const ventasPer  = enPer(ventas||[]);
  const ventasAnt  = enAnt(ventas||[]);
  const prodPer    = enPer(producciones);
  const prodAnt    = enAnt(producciones);
  const comprasPer = enPer(historialCompras||[]);
  const comprasAnt = enAnt(historialCompras||[]);

  // ─── Anticipos ───
  const antPend = (pedidos||[]).filter(p=>p.estado!=='entregado'&&p.fecha&&createDate(p.fecha)>=periodo.inicio&&createDate(p.fecha)<=periodo.fin).reduce((a,p)=>a+p.anticipo,0);
  const antAnt  = (pedidos||[]).filter(p=>p.estado!=='entregado'&&p.fecha&&createDate(p.fecha)>=periodoAnterior.inicio&&createDate(p.fecha)<=periodoAnterior.fin).reduce((a,p)=>a+p.anticipo,0);

  // ─── KPIs financieros ───
  const ingresos        = ventasPer.filter(v=>v.cobrado!==false).reduce((a,v)=>a+v.unidades*v.precio,0) + antPend;
  const ingresosAnt     = ventasAnt.filter(v=>v.cobrado!==false).reduce((a,v)=>a+v.unidades*v.precio,0) + antAnt;
  const costos          = prodPer.reduce((a,p)=>{const r=rec(p.recetaId);return a+(r?calcCosto(r,p.tandas):0);},0);
  const costosAnt       = prodAnt.reduce((a,p)=>{const r=rec(p.recetaId);return a+(r?calcCosto(r,p.tandas):0);},0);
  const ganancia        = ingresos - costos;
  const gananciaAnt     = ingresosAnt - costosAnt;
  const margen          = ingresos>0 ? Math.round(ganancia/ingresos*100) : 0;
  const margenAnt       = ingresosAnt>0 ? Math.round(gananciaAnt/ingresosAnt*100) : 0;
  const gastosCom       = comprasPer.reduce((a,c)=>a+c.qty*c.precio,0);
  const gastosComAnt    = comprasAnt.reduce((a,c)=>a+c.qty*c.precio,0);
  const balanceReal     = ingresos - gastosCom;
  const balanceRealAnt  = ingresosAnt - gastosComAnt;

  // ─── KPIs producción ───
  const uProd    = prodPer.reduce((a,p)=>{const r=rec(p.recetaId);return a+(p.unidadesReales||(r?r.rinde*p.tandas:0));},0);
  const uProdAnt = prodAnt.reduce((a,p)=>{const r=rec(p.recetaId);return a+(p.unidadesReales||(r?r.rinde*p.tandas:0));},0);
  const diasPer  = Math.ceil((periodo.fin-periodo.inicio)/864e5)||1;
  const plan     = prodPer.reduce((a,p)=>{const r=rec(p.recetaId);return a+(r?r.rinde*p.tandas:0);},0);
  const planAnt  = prodAnt.reduce((a,p)=>{const r=rec(p.recetaId);return a+(r?r.rinde*p.tandas:0);},0);
  const realProd = prodPer.reduce((a,p)=>a+(p.unidadesReales||0),0);
  const realAnt  = prodAnt.reduce((a,p)=>a+(p.unidadesReales||0),0);
  const merma    = plan>0  ? Math.round((plan-realProd)/plan*100) : 0;
  const mermaAnt = planAnt>0? Math.round((planAnt-realAnt)/planAnt*100) : 0;
  const tasaProd = Math.round(uProd/diasPer);
  const tasaAnt  = Math.round(uProdAnt/diasPer);

  // ─── KPIs ventas ───
  const uVend        = ventasPer.reduce((a,v)=>a+v.unidades,0);
  const uVendAnt     = ventasAnt.reduce((a,v)=>a+v.unidades,0);
  const ticket       = ventasPer.length>0 ? ingresos/ventasPer.length : 0;
  const ticketAnt    = ventasAnt.length>0 ? ingresosAnt/ventasAnt.length : 0;
  const precioUnitario    = uVend>0 ? ingresos/uVend : 0;
  const precioUnitarioAnt = uVendAnt>0 ? ingresosAnt/uVendAnt : 0;

  // ─── Helpers de variación ───
  const varPct = (cur, ant) => ant>0 ? Math.round((cur-ant)/Math.abs(ant)*100) : 0;
  const varBadge = (v, good='up') => {
    if(v===0) return '';
    const isGood = good==='up' ? v>0 : v<0;
    return `<span style="font-size:.72rem;color:var(--${isGood?'ok':'danger'})">${v>0?'+':''}${v}%</span>`;
  };

  const varIng  = varPct(ingresos, ingresosAnt);
  const varGan  = varPct(ganancia, gananciaAnt);
  const varUnid = varPct(uVend, uVendAnt);
  const varProd = varPct(tasaProd, tasaAnt);

  // ─── 2. Stats principales ───
  $('stats-financieros').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Ingresos</div>
      <div class="stat-value" style="color:var(--caramel)">${fmt(ingresos)}</div>
      <div class="stat-sub">${varBadge(varIng)} Margen ${margen}%</div>
    </div>
    <div class="stat-card ${ganancia>=0?'ok-card':'danger-card'}">
      <div class="stat-label">Ganancia neta</div>
      <div class="stat-value" style="color:var(--${ganancia>=0?'ok':'danger'})">${fmt(ganancia)}</div>
      <div class="stat-sub">${varBadge(varGan)} Costos ${fmt(costos)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Gastos reales</div>
      <div class="stat-value" style="color:var(--danger)">${fmt(gastosCom)}</div>
      <div class="stat-sub">Balance ${fmt(balanceReal)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Unidades vendidas</div>
      <div class="stat-value">${uVend}</div>
      <div class="stat-sub">${varBadge(varUnid)} Ticket ${fmt(ticket)}</div>
    </div>`;

  // ─── 3. Gráfico temporal ingresos vs gastos ───
  console.log('📊 Llamando al gráfico con:', {periodo: periodo.label, ingresos, gastosCom});
  _renderStatsLineChart(periodo, ingresos, gastosCom);

  // ─── 4. Alertas ───
  const alertas = [];
  if(gastosComAnt>0){ const v=Math.round((gastosCom-gastosComAnt)/gastosComAnt*100); if(Math.abs(v)>=20) alertas.push({tipo:v>0?'danger':'ok',texto:`Gastos ${v>0?'+':''}${v}% vs período anterior`}); }
  if(margenAnt>0){ const v=margen-margenAnt; if(Math.abs(v)>=10) alertas.push({tipo:v<0?'danger':'ok',texto:`Margen ${v>0?'+':''}${v} puntos vs período anterior`}); }
  if(tasaAnt>0){ const v=Math.round((tasaProd-tasaAnt)/tasaAnt*100); if(v<-20) alertas.push({tipo:'warn',texto:`Producción ${v}% vs período anterior`}); }
  if(alertas.length>0){
    $('alertas-card').style.display='block';
    $('alertas-contenido').innerHTML=alertas.map(a=>`
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--${a.tipo==='danger'?'danger-bg':a.tipo==='warn'?'warn-bg':'ok-bg'});border:1px solid var(--${a.tipo==='danger'?'danger':a.tipo==='warn'?'warn':'ok'});border-radius:var(--r);margin-bottom:7px">
        <span style="font-size:1.1rem">${a.tipo==='danger'?'🚨':a.tipo==='warn'?'⚠':'✅'}</span>
        <span style="font-size:.85rem;font-weight:500">${a.texto}</span>
      </div>`).join('');
  } else { $('alertas-card').style.display='none'; }

  // ─── 5. Proyección + Punto de equilibrio ───
  // Proyección: funciona para 7, 30 y mes_actual
  let proyeccion = null;
  if(periodoActual==='7'||periodoActual==='30'||periodoActual==='mes_actual'){
    const hoy2        = getStartOfDay();
    const diasMes     = finMes(0).getDate();
    const diaActual   = hoy2.getDate();
    const diasRest    = diasMes - diaActual;
    const diasTransc  = diasPer > 0 ? diasPer : 1;
    const ritmoIngr   = ingresos / diasTransc;
    const ritmoGasto  = gastosCom > 0 ? gastosCom / diasTransc : 0;
    proyeccion = {
      ingresos: ingresos + ritmoIngr*diasRest,
      gastos:   gastosCom + ritmoGasto*diasRest,
      ganancia: (ingresos + ritmoIngr*diasRest) - (gastosCom + ritmoGasto*diasRest),
      diasRest
    };
  }

  if(proyeccion){
    $('proyeccion-card').style.display='block';
    $('proyeccion-mensual').innerHTML=`
      <div style="text-align:center;margin-bottom:13px">
        <div style="font-size:.76rem;color:var(--text3);margin-bottom:4px">A este ritmo, cerrarás el mes con:</div>
        <div style="font-size:1.6rem;font-weight:700;color:var(--${proyeccion.ganancia>=0?'ok':'danger'})">${fmt(proyeccion.ganancia)}</div>
        <div style="font-size:.71rem;color:var(--text3)">${proyeccion.ganancia>=0?'de ganancia':'de pérdida'} proyectada</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:.77rem">
        <div style="text-align:center;padding:7px;background:var(--cream);border-radius:var(--r)">
          <div style="font-weight:500;color:var(--caramel)">${fmt(proyeccion.ingresos)}</div>
          <div style="color:var(--text3)">Ingresos proy.</div>
        </div>
        <div style="text-align:center;padding:7px;background:var(--cream);border-radius:var(--r)">
          <div style="font-weight:500;color:var(--danger)">${fmt(proyeccion.gastos)}</div>
          <div style="color:var(--text3)">Gastos proy.</div>
        </div>
      </div>
      <div style="margin-top:9px;font-size:.72rem;color:var(--text3);text-align:center">Quedan ${proyeccion.diasRest} días en el mes</div>`;
  } else {
    $('proyeccion-card').style.display='none';
  }

  const precioPromedio = precioUnitario || 1;
  const puntoEq = Math.ceil(gastosCom / precioPromedio);
  $('punto-equilibrio').innerHTML=`
    <div style="text-align:center;margin-bottom:13px">
      <div style="font-size:.76rem;color:var(--text3);margin-bottom:4px">Unidades para cubrir gastos</div>
      <div style="font-size:2rem;font-weight:700;color:var(--${puntoEq<=uVend?'ok':'warn'})">${puntoEq}</div>
      <div style="font-size:.71rem;color:var(--text3)">${puntoEq<=uVend?`✅ Cubierto — ${uVend-puntoEq} unid. de margen`:`🎯 Faltan ${puntoEq-uVend} unidades`}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:.77rem">
      <div style="text-align:center;padding:7px;background:var(--cream);border-radius:var(--r)">
        <div style="font-weight:500;color:var(--caramel)">${fmt(precioPromedio)}</div>
        <div style="color:var(--text3)">Precio prom./u</div>
      </div>
      <div style="text-align:center;padding:7px;background:var(--cream);border-radius:var(--r)">
        <div style="font-weight:500;color:var(--danger)">${fmt(gastosCom)}</div>
        <div style="color:var(--text3)">Gastos totales</div>
      </div>
    </div>`;

  // ─── 6. Comparativa de productos entre períodos ───
  const rankPer = {}, rankAnt = {};
  ventasPer.forEach(v=>{const r=rec(v.recetaId);const n=r?r.nombre:'?';rankPer[n]=(rankPer[n]||0)+v.unidades*v.precio;});
  ventasAnt.forEach(v=>{const r=rec(v.recetaId);const n=r?r.nombre:'?';rankAnt[n]=(rankAnt[n]||0)+v.unidades*v.precio;});
  const todosProds = [...new Set([...Object.keys(rankPer),...Object.keys(rankAnt)])];
  if($('stats-comp-label')) $('stats-comp-label').textContent = periodoAnterior.label;

  if(todosProds.length===0){
    $('stats-comparativa-productos').innerHTML='<p class="empty">Sin ventas registradas en estos períodos.</p>';
  } else {
    const sorted = todosProds
      .map(n=>({ n, cur:rankPer[n]||0, ant:rankAnt[n]||0 }))
      .sort((a,b)=>b.cur-a.cur);
    const maxVal = Math.max(...sorted.map(x=>Math.max(x.cur,x.ant)),1);
    $('stats-comparativa-productos').innerHTML=`
      <div style="display:grid;grid-template-columns:140px 1fr 1fr 80px 80px 70px;gap:6px;align-items:center;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);font-weight:500;padding:0 0 7px;border-bottom:2px solid var(--border);margin-bottom:8px">
        <span>Producto</span><span>Período actual</span><span>Período anterior</span><span style="text-align:right">Actual</span><span style="text-align:right">Anterior</span><span style="text-align:right">Variación</span>
      </div>
      ${sorted.map(({n,cur,ant})=>{
        const varV = ant>0 ? Math.round((cur-ant)/ant*100) : cur>0 ? 100 : 0;
        const isNew = ant===0 && cur>0;
        const isGone= cur===0 && ant>0;
        return `<div style="display:grid;grid-template-columns:140px 1fr 1fr 80px 80px 70px;gap:6px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border2)">
          <span style="font-size:.83rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${n}">${n}</span>
          <div style="background:var(--border);border-radius:4px;overflow:hidden;height:10px">
            <div style="height:100%;width:${Math.round(cur/maxVal*100)}%;background:var(--caramel);border-radius:4px"></div>
          </div>
          <div style="background:var(--border);border-radius:4px;overflow:hidden;height:10px">
            <div style="height:100%;width:${Math.round(ant/maxVal*100)}%;background:var(--border2);border-radius:4px;filter:brightness(.85)"></div>
          </div>
          <span style="font-size:.82rem;font-weight:500;text-align:right">${fmt(cur)}</span>
          <span style="font-size:.82rem;color:var(--text3);text-align:right">${fmt(ant)}</span>
          <span style="font-size:.79rem;font-weight:600;text-align:right;color:var(--${isNew?'ok':isGone?'danger':varV>0?'ok':varV<0?'danger':'text3'})">
            ${isNew?'Nuevo':isGone?'Sin ventas':varV>0?'+'+varV+'%':varV+'%'}
          </span>
        </div>`;
      }).join('')}`;
  }

  // ─── 7. Top productos + Top clientes ───
  const topProductos = Object.entries(rankPer).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('stats-top-productos').innerHTML = topProductos.length>0 ? topProductos.map(([n,v],i)=>{
    const pct=topProductos[0]?Math.round(v/topProductos[0][1]*100):0;
    return`<div class="costo-row"><span>${i+1}. ${n}</span><div style="display:flex;align-items:center;gap:8px"><div style="width:40px;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--caramel);border-radius:2px"></div></div><span style="font-weight:500;min-width:60px;text-align:right">${fmt(v)}</span></div></div>`;
  }).join('') : '<p class="empty">Sin ventas en este período</p>';

  // Top clientes
  const clientesR={};
  ventasPer.forEach(v=>{const c=v.nota||'Venta directa';if(!clientesR[c])clientesR[c]={ingresos:0,unidades:0};clientesR[c].ingresos+=v.unidades*v.precio;clientesR[c].unidades+=v.unidades;});
  (pedidos||[]).filter(p=>{const f=createDate(p.fecha);return f>=periodo.inicio&&f<=periodo.fin;}).forEach(p=>{const tot=p.items.reduce((a,it)=>a+it.cantidad*it.precio,0);if(!clientesR[p.cliente])clientesR[p.cliente]={ingresos:0,unidades:0};clientesR[p.cliente].ingresos+=tot;clientesR[p.cliente].unidades+=p.items.reduce((a,it)=>a+it.cantidad,0);});
  const topCli=Object.entries(clientesR).sort((a,b)=>b[1].ingresos-a[1].ingresos).slice(0,5);
  $('top-clientes').innerHTML=topCli.length>0?topCli.map(([c,d],i)=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border2)">
      <div><div style="font-size:.85rem;font-weight:500">${i+1}. ${c}</div><div style="font-size:.72rem;color:var(--text3)">${d.unidades} unid.</div></div>
      <span style="font-size:.83rem;color:var(--caramel);font-weight:500">${fmt(d.ingresos)}</span>
    </div>`).join(''):'<p class="empty" style="font-size:.8rem">Sin clientes en este período</p>';

  // ─── 8. Indicadores financieros ───
  $('stats-financieros-detalle').innerHTML=`
    <div class="costo-row"><span>Ingresos</span><span style="font-weight:500;color:var(--caramel)">${fmt(ingresos)}</span></div>
    <div class="costo-row"><span>Costos producción</span><span style="font-weight:500;color:var(--warn)">${fmt(costos)}</span></div>
    <div class="costo-row"><span>Ganancia neta</span><span style="font-weight:500;color:var(--${ganancia>=0?'ok':'danger'})">${fmt(ganancia)}</span></div>
    <div class="costo-row"><span>Margen beneficio</span><span style="font-weight:500">${margen}%</span></div>
    <div class="costo-row"><span>Precio promedio/unidad</span><span style="font-weight:500">${fmt(precioUnitario)}</span></div>
    ${ingresosAnt>0?`<div style="height:1px;background:var(--border2);margin:8px 0"></div>
    <div class="costo-row"><span>Variación ingresos</span><span style="font-weight:500;color:var(--${varIng>=0?'ok':'danger'})">${varIng>0?'+':''}${varIng}%</span></div>
    <div class="costo-row"><span>Variación ganancia</span><span style="font-weight:500;color:var(--${varGan>=0?'ok':'danger'})">${varGan>0?'+':''}${varGan}%</span></div>`:''}`;

  // ─── 8b. Indicadores de producción ───
  $('stats-produccion-detalle').innerHTML=`
    <div class="costo-row"><span>Total producido</span><span style="font-weight:500">${uProd} unid.</span></div>
    <div class="costo-row"><span>Tasa producción</span><span style="font-weight:500">${tasaProd} unid./día</span></div>
    <div class="costo-row"><span>Merma promedio</span><span style="font-weight:500;color:var(--${merma>10?'danger':merma>5?'warn':'ok'})">${merma}%</span></div>
    <div class="costo-row"><span>Producciones registradas</span><span style="font-weight:500">${prodPer.length}</span></div>
    <div class="costo-row"><span>Costo promedio/unidad</span><span style="font-weight:500">${uProd>0?fmt(costos/uProd):'—'}</span></div>
    ${tasaAnt>0?`<div style="height:1px;background:var(--border2);margin:8px 0"></div>
    <div class="costo-row"><span>Variación producción</span><span style="font-weight:500;color:var(--${varProd>=0?'ok':'danger'})">${varProd>0?'+':''}${varProd}%</span></div>
    <div class="costo-row"><span>Variación merma</span><span style="font-weight:500;color:var(--${(merma-mermaAnt)<=0?'ok':'danger'})">${merma-mermaAnt>0?'+':''}${merma-mermaAnt} pts</span></div>`:''}`;

  // ─── 9. Indicadores de ventas ───
  $('stats-ventas-detalle').innerHTML=`
    <div class="costo-row"><span>Ventas registradas</span><span style="font-weight:500">${ventasPer.length}</span></div>
    <div class="costo-row"><span>Unidades vendidas</span><span style="font-weight:500">${uVend}</span></div>
    <div class="costo-row"><span>Ticket promedio</span><span style="font-weight:500">${fmt(ticket)}</span></div>
    <div class="costo-row"><span>Tasa conversión</span><span style="font-weight:500">${uProd>0?Math.round(uVend/uProd*100):0}%</span></div>
    ${ticketAnt>0?`<div style="height:1px;background:var(--border2);margin:8px 0"></div>
    <div class="costo-row"><span>Variación ticket</span><span style="font-weight:500;color:var(--${varPct(ticket,ticketAnt)>=0?'ok':'danger'})">${varPct(ticket,ticketAnt)>0?'+':''}${varPct(ticket,ticketAnt)}%</span></div>
    <div class="costo-row"><span>Variación unidades</span><span style="font-weight:500;color:var(--${varUnid>=0?'ok':'danger'})">${varUnid>0?'+':''}${varUnid}%</span></div>`:''}`;

  // ─── 9b. Gastos en compras ───
  const byIng={};comprasPer.forEach(c=>{byIng[c.ingId]=(byIng[c.ingId]||0)+c.qty*c.precio;});
  const topIng=Object.entries(byIng).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxIng=topIng.length>0?topIng[0][1]:1;
  $('stats-compras-detalle').innerHTML=`
    <div class="costo-row"><span>Compras período</span><span style="font-weight:500;color:var(--danger)">${fmt(gastosCom)}</span></div>
    <div class="costo-row"><span>Período anterior</span><span style="font-weight:500;color:var(--danger)">${fmt(gastosComAnt)}</span></div>
    ${gastosComAnt>0?`<div class="costo-row"><span>Variación gastos</span><span style="font-weight:500;color:var(--${gastosCom<=gastosComAnt?'ok':'danger'})">${Math.round((gastosCom-gastosComAnt)/gastosComAnt*100)>0?'+':''}${Math.round((gastosCom-gastosComAnt)/gastosComAnt*100)}%</span></div>`:''}
    <div style="margin-top:11px;font-size:.76rem;font-weight:500;color:var(--text2);margin-bottom:8px">Mayor gasto por ingrediente</div>
    ${topIng.length===0?'<p class="empty" style="font-size:.8rem">Sin compras en este período</p>':
      topIng.map(([id,v])=>{const i=ing(parseInt(id));const pct=Math.round(v/maxIng*100);return`<div class="chart-bar-row"><span class="chart-bar-label" title="${i?i.nombre:'?'}">${i?i.nombre:'?'}</span><div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:var(--danger)"></div></div><span class="chart-bar-val">${fmt(v)}</span></div>`;}).join('')}`;

  // ─── 10. Balance real ───
  $('stats-balance').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);font-weight:500;padding:0 0 7px;border-bottom:2px solid var(--border);margin-bottom:8px">
      <span></span><span style="text-align:right;min-width:90px">${periodo.label}</span><span style="text-align:right;min-width:90px">${periodoAnterior.label}</span>
    </div>
    <div class="costo-row"><span>Ingresos (ventas + anticipos)</span><span style="color:var(--caramel)">${fmt(ingresos)}</span><span style="color:var(--caramel);min-width:90px;text-align:right">${fmt(ingresosAnt)}</span></div>
    <div class="costo-row"><span>Gastos en compras</span><span style="color:var(--danger)">−${fmt(gastosCom)}</span><span style="color:var(--danger);min-width:90px;text-align:right">−${fmt(gastosComAnt)}</span></div>
    <div style="height:1px;background:var(--border2);margin:6px 0"></div>
    <div class="costo-row"><span style="font-weight:600">Balance real</span><span style="font-weight:600;color:var(--${balanceReal>=0?'ok':'danger'})">${fmt(balanceReal)}</span><span style="font-weight:600;color:var(--${balanceRealAnt>=0?'ok':'danger'});min-width:90px;text-align:right">${fmt(balanceRealAnt)}</span></div>
    <div class="costo-row"><span>Costo teórico producción</span><span style="color:var(--warn)">−${fmt(costos)}</span><span style="color:var(--warn);min-width:90px;text-align:right">−${fmt(costosAnt)}</span></div>
    <div class="costo-row"><span style="font-weight:600">Ganancia neta (teórica)</span><span style="font-weight:600;color:var(--${ganancia>=0?'ok':'danger'})">${fmt(ganancia)}</span><span style="font-weight:600;color:var(--${gananciaAnt>=0?'ok':'danger'});min-width:90px;text-align:right">${fmt(gananciaAnt)}</span></div>
    <div style="margin-top:10px;padding:10px;background:var(--cream);border-radius:var(--r);font-size:.77rem;color:var(--text2)">
      <strong>Balance real</strong> usa los gastos reales de compras. <strong>Ganancia neta</strong> usa el costo teórico de producción.
    </div>`;
}

// ── Gráfico de línea temporal ──
function _renderStatsLineChart(periodo, ingresosTotal, gastosTotal){
  const canvas = $('stats-linea-chart');
  const emptyEl = $('stats-linea-empty');
  const labelEl = $('stats-chart-label');
  if(!canvas) {
    console.error('❌ Canvas stats-linea-chart no encontrado');
    return;
  }
  
  console.log('📊 Renderizando gráfico:', {periodo: periodo.label, ingresosTotal, gastosTotal});

  const hoy = getStartOfDay();
  const diasPer = Math.ceil((periodo.fin - periodo.inicio) / 864e5) + 1;

  // Agrupación: diaria si ≤60 días, semanal si >60
  const agrupar = diasPer > 60 ? 'semana' : 'dia';
  const puntos = [];

  if(agrupar === 'dia'){
    for(let i=0; i<diasPer; i++){
      const d = createDate(periodo.inicio.getTime() + i*864e5);
      const s = _tzDateStr(d);
      const ing2 = (ventas||[]).filter(v=>v.fecha===s).reduce((a,v)=>a+v.unidades*v.precio,0);
      const gas  = (historialCompras||[]).filter(c=>c.fecha===s).reduce((a,c)=>a+c.qty*c.precio,0);
      const [,m,dd] = s.split('-');
      puntos.push({ label: `${dd}/${m}`, ingresos: ing2, gastos: gas });
    }
  } else {
    // Agrupar por semana
    let cur = createDate(periodo.inicio);
    while(cur <= periodo.fin){
      const fin = new Date(Math.min(cur.getTime()+6*864e5, periodo.fin.getTime()));
      const s0 = _tzDateStr(cur);
      const s1 = _tzDateStr(fin);
      const ing2 = (ventas||[]).filter(v=>v.fecha>=s0&&v.fecha<=s1).reduce((a,v)=>a+v.unidades*v.precio,0);
      const gas  = (historialCompras||[]).filter(c=>c.fecha>=s0&&c.fecha<=s1).reduce((a,c)=>a+c.qty*c.precio,0);
      const [,m,dd] = s0.split('-');
      puntos.push({ label:`${dd}/${m}`, ingresos:ing2, gastos:gas });
      cur = new Date(fin.getTime()+864e5);
    }
  }

  console.log('📈 Puntos calculados:', puntos);

  const hayDatos = puntos.some(p=>p.ingresos>0||p.gastos>0);
  if(!hayDatos){
    console.log('⚠ No hay datos para mostrar');
    canvas.style.display='none';
    if(emptyEl) emptyEl.style.display='';
    if(labelEl) labelEl.textContent='';
    return;
  }
  
  console.log('✓ Hay datos, renderizando Chart.js');
  canvas.style.display='';
  if(emptyEl) emptyEl.style.display='none';
  if(labelEl) labelEl.textContent=agrupar==='semana'?'agrupado por semana':'día a día';

  if(_statsLineChart){ _statsLineChart.destroy(); _statsLineChart=null; }
  
  if(typeof Chart === 'undefined'){
    console.error('❌ Chart.js no está cargado');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  const gradIng = ctx.createLinearGradient(0,0,0,200);
  gradIng.addColorStop(0,'rgba(196,124,43,.25)');
  gradIng.addColorStop(1,'rgba(196,124,43,.02)');
  const gradGas = ctx.createLinearGradient(0,0,0,200);
  gradGas.addColorStop(0,'rgba(184,84,80,.2)');
  gradGas.addColorStop(1,'rgba(184,84,80,.02)');

  // Mostrar solo N etiquetas para no saturar el eje X
  const maxLabels = 15;
  const step = Math.ceil(puntos.length/maxLabels);
  const labels = puntos.map((p,i)=>i%step===0||i===puntos.length-1?p.label:'');

  _statsLineChart = new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Ingresos', data:puntos.map(p=>p.ingresos), borderColor:'#C47C2B', borderWidth:2.5, backgroundColor:gradIng, fill:true, tension:.35, pointRadius:puntos.map(p=>p.ingresos>0?3:0), pointBackgroundColor:'#C47C2B' },
        { label:'Gastos',   data:puntos.map(p=>p.gastos),   borderColor:'#B85450', borderWidth:2,   backgroundColor:gradGas, fill:true, tension:.35, pointRadius:puntos.map(p=>p.gastos>0?3:0),   pointBackgroundColor:'#B85450' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:true, position:'top', align:'end', labels:{ boxWidth:10, boxHeight:10, font:{size:11}, color:'#6B5A44', padding:16 }},
        tooltip:{ backgroundColor:'#4A3218', titleColor:'#E8A84A', bodyColor:'#F9F4EC', padding:10, cornerRadius:8,
          callbacks:{ label: ctx=>' '+ctx.dataset.label+': $'+ctx.raw.toFixed(2) }}
      },
      scales:{
        x:{ grid:{display:false}, ticks:{ color:'#9C8A74', font:{size:11}, maxRotation:0 }},
        y:{ grid:{ color:'rgba(216,204,188,.5)', drawTicks:false }, border:{display:false},
            ticks:{ color:'#9C8A74', font:{size:11}, callback:v=>'$'+v }}
      }
    }
  });
}


