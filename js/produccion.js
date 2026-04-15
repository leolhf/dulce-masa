// ══════════════ PRODUCCIÓN ══════════════
let editandoProdId=null;

function renderProduccion(){
  // Asegurar que el selector de recetas se llene correctamente
  if(recetas && recetas.length > 0){
    fillSelect('prod-rec',recetas.map(r=>[r.id,r.nombre]),'— Seleccionar —');
  } else {
    fillSelect('prod-rec',[],'— No hay recetas —');
  }
  // Solo resetear fecha si no hay una edición en curso
  if(editandoProdId===null) $('prod-fecha').value=today();
  calcProd();
  renderProdTable();
  renderProdDisp();
  renderProdSugerencias();
}

// ── Sugerencias basadas en pedidos pendientes ──
function renderProdSugerencias(){
  const el = $('prod-sugerencias'); if(!el) return;
  const hoy = getStartOfDay();
  const fin7 = createDate(rangoUltimosDias(8)[7]); // 7 días adelante en zona local

  // Agrupar pedidos pendientes por recetaId, filtrar los de esta semana
  const demanda = {};
  (pedidos||[]).filter(p => p.estado !== 'entregado').forEach(p => {
    const fechaEntrega = p.fechaEntrega ? createDate(p.fechaEntrega) : null;
    const urgente = fechaEntrega && fechaEntrega <= fin7;
    (p.items||[]).forEach(it => {
      if(!it.recetaId) return;
      if(!demanda[it.recetaId]) demanda[it.recetaId] = { total: 0, urgente: 0, pedidosIds: [] };
      demanda[it.recetaId].total += it.cantidad || 1;
      if(urgente) demanda[it.recetaId].urgente += it.cantidad || 1;
      demanda[it.recetaId].pedidosIds.push(p.id);
    });
  });

  const items = Object.entries(demanda).filter(([,v]) => v.total > 0);
  if(items.length === 0){ el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = `
    <div class="card" style="border-color:#E8CCAA;background:var(--warn-bg)">
      <div class="card-header" style="border-color:#E8CCAA">
        <span class="card-title" style="color:var(--warn)">📋 Producción sugerida por pedidos pendientes</span>
        <span style="font-size:.76rem;color:var(--text3)">${items.length} producto${items.length!==1?'s':''} requerido${items.length!==1?'s':''}</span>
      </div>
      <div class="card-body" style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:10px">
        ${items.map(([recetaId, v]) => {
          const r = rec(parseInt(recetaId));
          if(!r) return '';
          const sp = stockProd(r.id);
          const stockActual = sp ? sp.stock : 0;
          const faltante = Math.max(0, v.total - stockActual);
          const urgClass = v.urgente > 0 ? 'danger' : 'warn';
          const tandas = r.rinde > 0 ? Math.ceil(faltante / r.rinde) : 1;
          return `<div style="background:var(--white);border:1px solid ${v.urgente>0?'#E8BFBE':'#E8CCAA'};border-radius:var(--r);padding:10px 13px;min-width:200px;flex:1">
            <div style="font-weight:600;font-size:.87rem;margin-bottom:4px">${r.nombre}</div>
            <div style="font-size:.76rem;color:var(--text3);margin-bottom:6px">
              ${v.total} unid. pedidas · ${stockActual} en stock
              ${v.urgente > 0 ? `<span style="color:var(--danger);font-weight:600"> · ⚠ ${v.urgente} para esta semana</span>` : ''}
            </div>
            ${faltante > 0
              ? `<div style="font-size:.78rem;color:var(--${urgClass});margin-bottom:8px;font-weight:500">Faltan ${faltante} unidades (~${tandas} tanda${tandas!==1?'s':''})</div>`
              : `<div style="font-size:.78rem;color:var(--ok);margin-bottom:8px;font-weight:500">✓ Stock suficiente</div>`}
            ${faltante > 0 ? `<button class="btn btn-sm" style="background:var(--caramel);color:#fff;font-size:.75rem"
              onclick="$('prod-rec').value=${r.id};$('prod-tandas').value=${tandas};calcProd();document.querySelector('#s-produccion .card').scrollIntoView({behavior:'smooth'})">
              Registrar ${tandas} tanda${tandas!==1?'s':''}
            </button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderProdDisp(){
  const el=$('prod-disp');
  const disp=recetas.filter(r=>canProduce(r));
  if(disp.length===0){el.innerHTML='<p class="empty">Sin recetas disponibles.</p>';return;}
  el.innerHTML=disp.map(r=>{
    const sp=stockProd(r.id);
    const stockActual=sp?sp.stock:0;
    return`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border2);cursor:pointer" onclick="$('prod-rec').value=${r.id};calcProd()">
    <div style="flex:1"><div style="font-size:.86rem;font-weight:500">${r.nombre}</div><div style="font-size:.73rem;color:var(--text3)">${r.rinde} unid. · ${fmt(calcCosto(r))} · Stock: ${stockActual} unidades</div></div>
    <span class="badge badge-ok">Listo</span></div>`;
  }).join('');
}

function renderProdTable(){
  // Rebuild filtro de recetas
  const fs = $('prod-hist-rec');
  if(fs){
    const cv = fs.value;
    const recetasEnProd = [...new Map(producciones.map(p=>[p.recetaId, rec(p.recetaId)])).entries()]
      .filter(([,r])=>r).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre));
    fs.innerHTML = '<option value="">Todas las recetas</option>' +
      recetasEnProd.map(([id,r])=>`<option value="${id}"${String(id)===cv?' selected':''}>${r.nombre}</option>`).join('');
  }

  const filtroRec = fs ? parseInt(fs.value)||0 : 0;
  const lista = filtroRec
    ? [...producciones].filter(p => p.recetaId === filtroRec)
    : [...producciones];

  const tb=$('tbl-prod').querySelector('tbody');
  if(lista.length===0){
    tb.innerHTML=`<tr><td colspan="9" class="empty">${filtroRec?'Sin producciones para esta receta':'Sin registros'}</td></tr>`;
    $('prod-stats').textContent='';
    return;
  }

  // Stats del filtro actual
  const totalReales = lista.reduce((a,p)=>a+(p.unidadesReales||0),0);
  const totalPlan   = lista.reduce((a,p)=>{const r=rec(p.recetaId);return a+(r?r.rinde*p.tandas:0);},0);
  const mermaTotal  = totalPlan - totalReales;
  const mermaPct    = totalPlan>0 ? Math.round(mermaTotal/totalPlan*100) : 0;
  $('prod-stats').textContent = filtroRec
    ? `${lista.length} produccion${lista.length!==1?'es':''} · ${totalReales} unidades · merma ${mermaPct}%`
    : `${producciones.length} registros · ${totalReales} unidades reales`;

  tb.innerHTML=[...lista].sort((a,b)=>createDate(b.fecha)-createDate(a.fecha)||b.id-a.id).map(p=>{
    const r=rec(p.recetaId);
    
    // Calcular costo considerando variaciones si existen
    let recetaCalculo = r;
    let costoCalculo = 0;
    if(p.variaciones && p.variaciones.length > 0){
      // Aplicar temporalmente las variaciones para calcular el costo
      const variacionesTemp = variacionesProduccion;
      variacionesProduccion = p.variaciones;
      recetaCalculo = obtenerRecetaVariada(r, p.tandas);
      costoCalculo = calcCosto(recetaCalculo, p.tandas);
      variacionesProduccion = variacionesTemp;
    } else {
      costoCalculo = calcCosto(r, p.tandas);
    }
    
    const planificado=r?r.rinde*p.tandas:0;
    const real=p.unidadesReales||planificado;
    const merma=planificado-real;
    
    // Preparar texto de variaciones
    let variacionesHTML = '';
    if(p.variaciones && p.variaciones.length > 0){
      const count = p.variaciones.length;
      variacionesHTML = `<span style="background:var(--warn-bg);color:var(--warn);padding:2px 6px;border-radius:10px;font-size:.7rem;font-weight:600" title="${p.variaciones.map(v => v.motivo).join(', ')}">${count} variación${count>1?'es':''}</span>`;
    } else {
      variacionesHTML = '—';
    }
    
    // Resaltar si no tiene unidades reales registradas
    const sinReal = !p.unidadesReales || p.unidadesReales === 0;
    return`<tr>
      <td>${p.fecha}</td>
      <td style="font-weight:500">${r?r.nombre:'—'}</td>
      <td>${p.tandas}</td>
      <td>${planificado}</td>
      <td style="${sinReal?'color:var(--text3);font-style:italic':''}">${sinReal?'—':real}</td>
      <td style="color:var(--${merma>0?'danger':'ok'})">${merma>0?`-${merma}`:'—'}</td>
      <td>${fmt(costoCalculo)}</td>
      <td style="text-align:center">${variacionesHTML}</td>
      <td style="font-size:.79rem;color:var(--text3)">${p.nota||'—'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm btn-icon" data-id="${p.id}" onclick="editProd(+this.dataset.id)" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" data-id="${p.id}" onclick="delProd(+this.dataset.id)" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}
function calcProd(){
  const rId=parseInt($('prod-rec').value);const tandas=parseInt($('prod-tandas').value)||1;const reales=parseInt($('prod-reales').value)||0;
  const el=$('prod-preview');
  if(!rId){
    el.innerHTML='';
    // Ocultar panel de variaciones si no hay receta seleccionada
    $('prod-variaciones-box').style.display='none';
    return;
  }
  const r=rec(rId);if(!r){
    el.innerHTML='';
    $('prod-variaciones-box').style.display='none';
    return;
  }
  
  // Mostrar panel de variaciones cuando hay receta seleccionada
  $('prod-variaciones-box').style.display='block';
  
  // Obtener receta variada si hay variaciones
  const recetaCalculo = obtenerRecetaVariada(r, tandas);
  
  const planificado=r.rinde*tandas;const merma=reales>0?planificado-reales:0;
  const rows=recetaCalculo.ings.map(ri=>{const i=ing(ri.ingId);if(!i)return'';const needed=ri.qty*tandas;const ok=i.stock>=needed;
    return`<div class="prod-check ${ok?'ok':'nok'}"><span class="pc-label">${i.nombre}</span><span class="pc-status">${ok?'✓':'✗'} Necesita ${fmtN(needed,3)} ${i.unidad} · hay ${formatCantidad(i.stock, i.unidad)}</span></div>`;}).join('');
  const canP=canProduce(recetaCalculo,tandas);
  let mermaInfo='';
  if(reales>0){
    const mermaPct=planificado>0?Math.round(merma/planificado*100):0;
    mermaInfo=`<div style="margin-top:8px;font-size:.82rem;font-weight:500;color:var(--${merma>0?'danger':'ok'})">Merma: ${merma} unidades (${mermaPct}%)</div>`;
  }

  // Vinculación: pedidos pendientes que incluyen esta receta
  const ahora = getStartOfDay();
  const fin7 = new Date(ahora.getTime() + 7*24*60*60*1000);
  const pedidosRelacionados = (pedidos||[]).filter(p =>
    p.estado !== 'entregado' && (p.items||[]).some(it => it.recetaId === rId)
  ).sort((a,b) => createDate(a.fechaEntrega||'9999') - createDate(b.fechaEntrega||'9999'));

  let vinculacionHTML = '';
  if(pedidosRelacionados.length > 0){
    const totalPedido = pedidosRelacionados.reduce((a,p) =>
      a + (p.items||[]).filter(it=>it.recetaId===rId).reduce((s,it)=>s+it.cantidad,0), 0);
    const sp = stockProd(rId);
    const stockActual = sp ? sp.stock : 0;
    const unidadesProduciendo = reales > 0 ? reales : planificado;
    const stockTras = stockActual + unidadesProduciendo;
    const cubreTodo = stockTras >= totalPedido;

    vinculacionHTML = `<div style="margin-top:10px;background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);padding:10px 12px">
      <div style="font-size:.76rem;font-weight:600;color:var(--warn);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
        📋 ${pedidosRelacionados.length} pedido${pedidosRelacionados.length>1?'s':''} requieren esta receta
      </div>
      ${pedidosRelacionados.slice(0,3).map(p => {
        const cant = (p.items||[]).filter(it=>it.recetaId===rId).reduce((a,it)=>a+it.cantidad,0);
        const fe = p.fechaEntrega ? createDate(p.fechaEntrega) : null;
        const diff = fe ? Math.ceil((fe - ahora)/(1000*60*60*24)) : null;
        const urgente = diff !== null && diff <= 2;
        return `<div style="font-size:.78rem;display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(232,168,74,.2)">
          <span style="font-weight:500">${p.cliente}</span>
          <span>${cant} unid. · ${fe?formatDateWithTimezone(fe,{format:'date'}):'sin fecha'}${urgente?` <span style="color:var(--danger);font-weight:600">⚠</span>`:''}</span>
        </div>`;
      }).join('')}
      ${pedidosRelacionados.length > 3 ? `<div style="font-size:.72rem;color:var(--text3);margin-top:4px">+${pedidosRelacionados.length-3} pedidos más</div>` : ''}
      <div style="font-size:.78rem;margin-top:7px;color:var(--${cubreTodo?'ok':'danger'});font-weight:500">
        ${cubreTodo
          ? `✓ Esta producción (${unidadesProduciendo} u.) + stock (${stockActual} u.) cubre los ${totalPedido} pedidos`
          : `✗ Aún faltarán ${totalPedido - stockTras} unidades tras esta producción`}
      </div>
    </div>`;
  }

  el.innerHTML=`<div style="font-size:.78rem;font-weight:500;color:var(--text2);margin-bottom:7px">Planificado: ${planificado} unidades${reales>0?` · Real: ${reales} unidades`:''} · Costo: ${fmt(calcCosto(recetaCalculo,tandas))}</div>${rows}
    <div style="margin-top:8px;font-size:.82rem;font-weight:500;color:var(--${canP?'ok':'danger'})">${canP?'✓ Stock suficiente':'✗ Falta stock'}</div>${mermaInfo}${vinculacionHTML}`;
  
  // Actualizar vista de variaciones
  actualizarVistaVariaciones();
}
function registrarProd(){
  const rId=parseInt($('prod-rec').value);const tandas=parseInt($('prod-tandas').value)||1;const reales=parseInt($('prod-reales').value)||0;
  if(!rId){toast('Seleccioná una receta');return;}
  if(tandas <= 0){toast('La cantidad de tandas debe ser mayor a cero');return;}
  if(reales < 0){toast('Las unidades producidas no pueden ser negativas');return;}
  const r=rec(rId);if(!r)return;
  
  // Obtener receta variada si hay variaciones
  const recetaCalculo = obtenerRecetaVariada(r, tandas);
  
  let unidadesProducidas=reales||r.rinde*tandas;
  
  if(editandoProdId!==null){
    // EDITAR producción existente
    const p=prod(editandoProdId);
    if(!p){editandoProdId=null;return;}
    
    const nuevaCantidad=reales||r.rinde*tandas;
    const recetaAnterior=p.recetaId;
    
    // Solo procesar si realmente hay cambios
    if(p.tandas!==tandas || p.unidadesReales!==reales || p.recetaId!==rId || p.fecha!==($('prod-fecha').value||today()) || p.nota!==($('prod-nota').value.trim())){
      
      // Devolver ingredientes de la producción original al stock
      const rOriginal=rec(p.recetaId);
      if(rOriginal){
        rOriginal.ings.forEach(ri=>{
          const i=ing(ri.ingId);
          if(i)i.stock=+(i.stock + ri.qty*p.tandas).toFixed(4);
        });
      }
      
      // Verificar stock para la nueva configuración
      if(!canProduce(recetaCalculo,tandas)){
        // Revertir devolución de ingredientes si no hay stock suficiente
        if(rOriginal){
          rOriginal.ings.forEach(ri=>{
            const i=ing(ri.ingId);
            if(i)i.stock=Math.max(0,+(i.stock - ri.qty*p.tandas).toFixed(4));
          });
        }
        toast('Stock insuficiente para los nuevos valores');return;
      }
      
      // Actualizar datos de la producción
      p.fecha=$('prod-fecha').value||today();
      p.recetaId=rId;
      p.tandas=tandas;
      p.unidadesReales=nuevaCantidad;
      p.nota=$('prod-nota').value.trim();
      
      // Guardar variaciones si existen
      if(variacionesProduccion.length > 0){
        p.variaciones = [...variacionesProduccion];
      }
      
      // Descontar ingredientes nuevos (usando receta variada)
      recetaCalculo.ings.forEach(ri=>{const i=ing(ri.ingId);if(i)i.stock=Math.max(0,+(i.stock-ri.qty*tandas).toFixed(4));});
      
      // Recalcular stock de productos terminados desde cero (evita desfases por ventas)
      recalcStockProducto(rId);
      if(recetaAnterior!==rId) recalcStockProducto(recetaAnterior);
      
      toast(`✓ Producción de "${r.nombre}" actualizada`);
    }else{
      toast('No hay cambios para guardar');
    }
    
    editandoProdId=null;
    
    // Restaurar botón
    const btn=document.querySelector('#s-produccion .form-actions .btn-primary');
    if(btn)btn.textContent='✓ Registrar producción';
    
    // Ocultar botón cancelar
    const btnCancelar=$('btn-cancelar-prod');
    if(btnCancelar)btnCancelar.style.display='none';
    
  }else{
    // NUEVA producción
    if(!canProduce(recetaCalculo,tandas)){toast('Stock insuficiente');return;}
    recetaCalculo.ings.forEach(ri=>{const i=ing(ri.ingId);if(i)i.stock=Math.max(0,+(i.stock-ri.qty*tandas).toFixed(4));});
    
    // Guardar producción con variaciones si existen
    const nuevaProduccion = {
      id:nextId.prod++,
      fecha:$('prod-fecha').value||today(),
      recetaId:rId,
      tandas,
      unidadesReales:unidadesProducidas,
      nota:$('prod-nota').value.trim()
    };
    
    if(variacionesProduccion.length > 0){
      nuevaProduccion.variaciones = [...variacionesProduccion];
    }
    
    // Estado anterior para deshacer
    const _estadoAntesProduccion = {
      ingredientesUsados: nuevaProduccion.ingredientesUsados ? JSON.parse(JSON.stringify(nuevaProduccion.ingredientesUsados)) : []
    };
    producciones.push(nuevaProduccion);
    if(typeof guardarAccionParaDeshacer === 'function'){
      guardarAccionParaDeshacer('produccion', nuevaProduccion, _estadoAntesProduccion);
    }
    
    // Recalcular stock desde cero para mantener consistencia con ventas y pedidos
    recalcStockProducto(rId);
    
    toast(`✓ ${unidadesProducidas} unidades de "${r.nombre}" registradas`);
  }
  
  // Limpiar formulario
  $('prod-rec').value='';$('prod-tandas').value=1;$('prod-reales').value='';$('prod-nota').value='';
  
  // Limpiar variaciones
  variacionesProduccion = [];
  actualizarVistaVariaciones();
  
  calcProd();renderProdTable();refreshAllStockViews();
}
function cancelarEdicionProd(){
  editandoProdId=null;
  $('prod-rec').value='';$('prod-tandas').value=1;$('prod-reales').value='';$('prod-nota').value='';
  calcProd();
  
  // Restaurar botón
  const btn=document.querySelector('#s-produccion .form-actions .btn-primary');
  if(btn)btn.textContent='✓ Registrar producción';
  
  // Ocultar botón cancelar
  const btnCancelar=$('btn-cancelar-prod');
  if(btnCancelar)btnCancelar.style.display='none';
  
  toast('Edición cancelada');
}
function delProd(id){
  const p=prod(id); if(!p)return;
  const r=rec(p.recetaId); if(!r)return;
  const unidadesProduccion=p.unidadesReales||r.rinde*p.tandas;
  const sp=stockProd(p.recetaId);
  const stockActual=sp?sp.stock:0;
  const ventasProducto=(ventas||[]).filter(v=>v.recetaId===p.recetaId);
  // Solo hay conflicto real si el stock quedaría negativo tras eliminar esta producción
  const stockTrasElim = stockActual - unidadesProduccion;
  const tieneVentasConflicto = stockTrasElim < 0 && ventasProducto.length > 0;

  const _ejecutarElim = () => {
    const recetaId=p.recetaId;
    // Devolver ingredientes al stock
    r.ings.forEach(ri=>{ const i=ing(ri.ingId); if(i)i.stock=+(i.stock+ri.qty*p.tandas).toFixed(4); });
    producciones=producciones.filter(x=>x.id!==id);
    // Recalcular stock del producto terminado desde cero
    recalcStockProducto(recetaId);
    renderProdTable(); refreshAllStockViews();
    saveData(); toast('Producción eliminada — ingredientes devueltos al inventario');
  };

  const mensajeConfirm = tieneVentasConflicto
    ? `Se devolverán los ingredientes al inventario.<br><br><strong style="color:var(--danger)">⚠ Advertencia:</strong> El stock del producto quedará negativo (${stockTrasElim} unidades) porque hay ventas que superan el stock restante. Revisá las ventas de <em>${r.nombre}</em> después.`
    : 'Se devolverán los ingredientes al inventario.';

  confirmar({
    titulo: 'Eliminar producción',
    mensaje: mensajeConfirm,
    labelOk: 'Eliminar',
    tipo: 'danger',
    onOk: _ejecutarElim
  });
}
function editProd(id){
  const p=prod(id);
  if(!p)return;
  const r=rec(p.recetaId);
  if(!r)return;
  
  // Establecer que estamos editando
  editandoProdId=id;
  
  // Cargar datos en el formulario
  $('prod-rec').value=p.recetaId;
  $('prod-tandas').value=p.tandas;
  $('prod-reales').value=p.unidadesReales||'';
  $('prod-fecha').value=p.fecha;
  $('prod-nota').value=p.nota||'';
  
  // Cargar variaciones guardadas en el editor de variaciones
  variacionesProduccion = p.variaciones ? [...p.variaciones] : [];
  
  // Calcular y mostrar vista previa
  calcProd();
  
  // Cambiar título del formulario para indicar edición
  const formTitle=$('prod-form-title');
  if(formTitle){
    const originalText=formTitle.textContent;
    formTitle.textContent=`Editar producción — ${r.nombre}`;
    setTimeout(()=>formTitle.textContent=originalText, 3000);
  }
  
  // Cambiar texto del botón
  const btn=document.querySelector('#s-produccion .form-actions .btn-primary');
  if(btn)btn.textContent='✓ Actualizar producción';
  
  // Mostrar botón cancelar
  const btnCancelar=$('btn-cancelar-prod');
  if(btnCancelar)btnCancelar.style.display='inline-flex';
  
  // Hacer scroll al formulario
  document.querySelector('#s-produccion .card').scrollIntoView({behavior:'smooth'});
  
  toast('Editando producción. Modificá los datos y hacé clic en "Actualizar producción".');
}

