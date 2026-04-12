// ══════════════ VARIACIONES DE RECETA ══════════════
function abrirModalVariaciones(){
  const rId = parseInt($('prod-rec').value);
  if(!rId){
    toast('Seleccioná una receta primero');
    return;
  }
  
  const r = rec(rId);
  if(!r) return;
  
  recetaBaseActual = r;
  
  // Mostrar información de la receta base
  $('var-receta-info').innerHTML = `
    <strong>Receta:</strong> ${r.nombre}<br>
    <strong>Rinde:</strong> ${r.rinde} unidades<br>
    <strong>Ingredientes:</strong> ${r.ings.length}
  `;
  
  // Limpiar formulario
  $('var-tipo').value = '';
  $('var-motivo').value = '';
  $('var-campos-dinamicos').innerHTML = '';
  
  // Abrir modal usando la función correcta
  openModal('modal-variaciones');
}

function actualizarCamposVariacion(){
  const tipo = $('var-tipo').value;
  const camposDiv = $('var-campos-dinamicos');
  
  if(!tipo){
    camposDiv.innerHTML = '';
    return;
  }
  
  let html = '';
  
  switch(tipo){
    case 'incremento':
    case 'decremento':
      html = `
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Ingrediente a modificar</label>
          <select id="var-ingrediente" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
            <option value="">Seleccionar ingrediente</option>
            ${recetaBaseActual.ings.map(ri => {
              const i = ing(ri.ingId);
              return i ? `<option value="${ri.ingId}">${i.nombre} (${ri.qty} ${i.unidad})</option>` : '';
            }).join('')}
          </select>
        </div>
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">
            ${tipo === 'incremento' ? 'Cantidad adicional' : 'Cantidad a reducir'} (por tanda)
          </label>
          <input type="number" id="var-cantidad" step="0.001" min="0" 
                 placeholder="Ej: 0.5 para ${tipo === 'incremento' ? 'agregar' : 'reducir'} 0.5 ${ing(recetaBaseActual.ings[0]?.ingId)?.unidad || 'unidades'}"
                 style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
        </div>
      `;
      break;
      
    case 'agregar':
      html = `
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Ingrediente a agregar</label>
          <div style="position:relative">
            <input type="text" id="var-ingrediente-nuevo-text" 
                   placeholder="Escribí el nombre del ingrediente..." 
                   oninput="mostrarSugerenciasIngredientesVariacion(this.value)"
                   onfocus="mostrarSugerenciasIngredientesVariacion(this.value)"
                   onblur="setTimeout(() => ocultarSugerenciasIngredientesVariacion(), 200)"
                   style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
            <div id="var-sugerencias-ingredientes" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:var(--r);max-height:200px;overflow-y:auto;z-index:1000"></div>
          </div>
        </div>
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Cantidad por tanda</label>
          <input type="number" id="var-cantidad-nueva" step="0.001" min="0"
                 placeholder="Ej: 0.5"
                 style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
        </div>
      `;
      break;
      
    case 'reemplazar':
      html = `
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Ingrediente original</label>
          <select id="var-ing-original" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
            <option value="">Seleccionar ingrediente</option>
            ${recetaBaseActual.ings.map(ri => {
              const i = ing(ri.ingId);
              return i ? `<option value="${ri.ingId}">${i.nombre} (${ri.qty} ${i.unidad})</option>` : '';
            }).join('')}
          </select>
        </div>
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Ingrediente nuevo</label>
          <div style="position:relative">
            <input type="text" id="var-ing-nuevo-text" 
                   placeholder="Escribí el nombre del ingrediente..." 
                   oninput="mostrarSugerenciasIngredientesReemplazo(this.value)"
                   onfocus="mostrarSugerenciasIngredientesReemplazo(this.value)"
                   onblur="setTimeout(() => ocultarSugerenciasIngredientesReemplazo(), 200)"
                   style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
            <div id="var-sugerencias-reemplazo" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:var(--r);max-height:200px;overflow-y:auto;z-index:1000"></div>
          </div>
        </div>
      `;
      break;
      
    case 'eliminar':
      html = `
        <div style="margin-bottom:15px">
          <label style="font-weight:500;margin-bottom:8px;display:block">Ingrediente a eliminar</label>
          <select id="var-ing-eliminar" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--r)">
            <option value="">Seleccionar ingrediente</option>
            ${recetaBaseActual.ings.map(ri => {
              const i = ing(ri.ingId);
              return i ? `<option value="${ri.ingId}">${i.nombre} (${ri.qty} ${i.unidad})</option>` : '';
            }).join('')}
          </select>
        </div>
      `;
      break;
  }
  
  camposDiv.innerHTML = html;
}

function agregarVariacion(){
  const tipo = $('var-tipo').value;
  const motivo = $('var-motivo').value.trim();
  
  if(!tipo){
    toast('Seleccioná el tipo de variación');
    return;
  }
  
  let variacion = {
    tipo,
    motivo: motivo || 'Sin motivo especificado',
    timestamp: nowISOLocal()
  };
  
  switch(tipo){
    case 'incremento':
    case 'decremento':
      const ingId = parseInt($('var-ingrediente').value);
      const cantidad = parseFloat($('var-cantidad').value);
      if(!ingId || !cantidad || cantidad <= 0){
        toast('Completá todos los campos correctamente');
        return;
      }
      variacion.ingId = ingId;
      variacion.cantidad = cantidad;
      break;
      
    case 'agregar':
      const nuevoIngId = parseInt($('var-ingrediente-nuevo-hidden')?.value || 0);
      const cantidadNueva = parseFloat($('var-cantidad-nueva').value);
      if(!nuevoIngId || !cantidadNueva || cantidadNueva <= 0){
        toast('Seleccioná un ingrediente y especificá la cantidad');
        return;
      }
      variacion.nuevoIngId = nuevoIngId;
      variacion.cantidad = cantidadNueva;
      break;
      
    case 'reemplazar':
      const originalId = parseInt($('var-ing-original').value);
      const nuevoId = parseInt($('var-ing-nuevo-hidden')?.value || 0);
      if(!originalId || !nuevoId){
        toast('Seleccioná ambos ingredientes');
        return;
      }
      variacion.originalId = originalId;
      variacion.nuevoId = nuevoId;
      break;
      
    case 'eliminar':
      const eliminarId = parseInt($('var-ing-eliminar').value);
      if(!eliminarId){
        toast('Completá todos los campos');
        return;
      }
      variacion.eliminarId = eliminarId;
      break;
  }
  
  variacionesProduccion.push(variacion);
  actualizarVistaVariaciones();
  closeModal('modal-variaciones');
  calcProd(); // Recalcular con las variaciones
  toast('Variación agregada correctamente');
}

function limpiarVariaciones(){
  variacionesProduccion = [];
  actualizarVistaVariaciones();
  calcProd();
}

function actualizarVistaVariaciones(){
  const box = $('prod-variaciones-box');
  const lista = $('prod-variaciones-lista');
  const btnAgregar = $('btn-agregar-variacion');
  
  if(!box || !lista || !btnAgregar) return;
  
  const rId = parseInt($('prod-rec').value);
  const tieneReceta = rId && rec(rId);
  
  if(!tieneReceta){
    lista.innerHTML = 'Seleccioná una receta para agregar variaciones';
    btnAgregar.disabled = true;
    return;
  }
  
  btnAgregar.disabled = false;
  
  if(variacionesProduccion.length === 0){
    lista.innerHTML = 'Sin variaciones';
  } else {
    const html = variacionesProduccion.map((v, idx) => {
      let texto = '';
      switch(v.tipo){
        case 'incremento':
          const ingInc = ing(v.ingId);
          texto = `➕ Incrementar ${ingInc?.nombre || '?'} +${v.cantidad} ${ingInc?.unidad || 'unidades'}`;
          break;
        case 'decremento':
          const ingDec = ing(v.ingId);
          texto = `➖ Reducir ${ingDec?.nombre || '?'} -${v.cantidad} ${ingDec?.unidad || 'unidades'}`;
          break;
        case 'agregar':
          const ingNuevo = ing(v.nuevoIngId);
          texto = `➕ Agregar ${ingNuevo?.nombre || '?'} (${v.cantidad} ${ingNuevo?.unidad || 'unidades'})`;
          break;
        case 'reemplazar':
          texto = `🔄 Reemplazar ${ing(v.originalId)?.nombre || '?'} por ${ing(v.nuevoId)?.nombre || '?'}`;
          break;
        case 'eliminar':
          texto = `❌ Eliminar ${ing(v.eliminarId)?.nombre || '?'}`;
          break;
      }
      return `<div style="padding:4px 0;font-size:.75rem">${texto} <span style="color:var(--text3)">- ${v.motivo}</span></div>`;
    }).join('');
    
    lista.innerHTML = html;
  }
}

function obtenerRecetaVariada(r, tandas = 1){
  if(!r || variacionesProduccion.length === 0){
    return r;
  }
  
  // Crear una copia profunda de la receta
  let recetaVariada = JSON.parse(JSON.stringify(r));
  
  // Aplicar cada variación
  variacionesProduccion.forEach(v => {
    switch(v.tipo){
      case 'incremento':
        const ingInc = recetaVariada.ings.find(ri => ri.ingId === v.ingId);
        if(ingInc){
          ingInc.qty = ingInc.qty + v.cantidad;
        }
        break;
        
      case 'decremento':
        const ingDec = recetaVariada.ings.find(ri => ri.ingId === v.ingId);
        if(ingDec){
          ingDec.qty = Math.max(0, ingDec.qty - v.cantidad);
        }
        break;
        
      case 'agregar':
        if(!recetaVariada.ings.find(ri => ri.ingId === v.nuevoIngId)){
          recetaVariada.ings.push({ingId: v.nuevoIngId, qty: v.cantidad});
        }
        break;
        
      case 'reemplazar':
        const idxOriginal = recetaVariada.ings.findIndex(ri => ri.ingId === v.originalId);
        if(idxOriginal !== -1){
          const cantidadOriginal = recetaVariada.ings[idxOriginal].qty;
          recetaVariada.ings.splice(idxOriginal, 1);
          if(!recetaVariada.ings.find(ri => ri.ingId === v.nuevoId)){
            recetaVariada.ings.push({ingId: v.nuevoId, qty: cantidadOriginal});
          }
        }
        break;
        
      case 'eliminar':
        recetaVariada.ings = recetaVariada.ings.filter(ri => ri.ingId !== v.eliminarId);
        break;
    }
  });
  
  return recetaVariada;
}

