// ══════════════ GASTOS FIJOS ══════════════
let _gastoFijoEditId = null;

function _gastoMensualizado(g){
  if(g.periodo==='mensual') return g.monto;
  if(g.periodo==='semanal') return g.monto*4.33;
  if(g.periodo==='anual')   return g.monto/12;
  return g.monto;
}

function _renderGastosFijosLista(){
  const el = $('gastos-fijos-lista'); if(!el) return;
  const totalMes = _gastoFijoMensual();
  const lbl = $('gastos-fijos-total-label');
  if(lbl) lbl.textContent = totalMes>0 ? `Total mensualizado: ${fmt(totalMes)}/mes` : '';

  if((gastosFijos||[]).length===0){
    el.innerHTML=`<div style="padding:10px 0">
      <p class="empty" style="margin-bottom:8px">Sin gastos fijos cargados. Agregar gas, electricidad, embalaje, etc. distribuye esos costos entre las producciones.</p>
    </div>`;
    return;
  }
  const periodoLabel = {mensual:'mensual',semanal:'semanal',anual:'anual'};
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:.85rem">
    <thead><tr>
      <th style="padding:7px 10px;text-align:left;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500;border-bottom:2px solid var(--border)">Descripción</th>
      <th style="padding:7px 10px;text-align:right;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500;border-bottom:2px solid var(--border)">Monto</th>
      <th style="padding:7px 10px;text-align:center;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500;border-bottom:2px solid var(--border)">Frecuencia</th>
      <th style="padding:7px 10px;text-align:right;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);font-weight:500;border-bottom:2px solid var(--border)">Equiv./mes</th>
      <th style="border-bottom:2px solid var(--border)"></th>
    </tr></thead>
    <tbody>
      ${gastosFijos.map(g=>`<tr>
        <td style="padding:8px 10px;border-bottom:1px solid var(--border2);font-weight:500">${g.nombre}</td>
        <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:right">${fmt(g.monto)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:center"><span class="badge badge-warn" style="font-size:.68rem">${periodoLabel[g.periodo]}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:right;font-weight:500;color:var(--caramel)">${fmt(_gastoMensualizado(g))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid var(--border2)" class="td-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editarGastoFijo(${g.id})" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="eliminarGastoFijo(${g.id})" title="Eliminar">✕</button>
        </td>
      </tr>`).join('')}
      <tr style="background:var(--cream2)">
        <td colspan="3" style="padding:9px 10px;font-weight:600;font-size:.84rem">Total mensualizado</td>
        <td style="padding:9px 10px;text-align:right;font-weight:700;font-family:'Playfair Display',serif;font-size:1rem;color:var(--brown2)">${fmt(totalMes)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;
}

function abrirModalGastoFijo(){
  _gastoFijoEditId = null;
  $('gasto-fijo-title').textContent = 'Agregar gasto fijo';
  $('gasto-fijo-edit-id').value = '';
  $('gasto-fijo-nombre').value = '';
  $('gasto-fijo-monto').value = '';
  $('gasto-fijo-periodo').value = 'mensual';
  $('gasto-fijo-equiv').textContent = '';
  openModal('modal-gasto-fijo');
  // Actualizar equivalencia al cambiar
  $('gasto-fijo-monto').oninput = $('gasto-fijo-periodo').onchange = _actualizarEquivGastoFijo;
}

function _actualizarEquivGastoFijo(){
  const m = parseFloat($('gasto-fijo-monto').value)||0;
  const p = $('gasto-fijo-periodo').value;
  const equiv = _gastoMensualizado({monto:m,periodo:p});
  $('gasto-fijo-equiv').textContent = m>0 ? `Equivale a ${fmt(equiv)}/mes` : '';
}

function editarGastoFijo(id){
  const g = (gastosFijos||[]).find(x=>x.id===id); if(!g) return;
  _gastoFijoEditId = id;
  $('gasto-fijo-title').textContent = 'Editar gasto fijo';
  $('gasto-fijo-edit-id').value = id;
  $('gasto-fijo-nombre').value = g.nombre;
  $('gasto-fijo-monto').value = g.monto;
  $('gasto-fijo-periodo').value = g.periodo;
  $('gasto-fijo-monto').oninput = $('gasto-fijo-periodo').onchange = _actualizarEquivGastoFijo;
  _actualizarEquivGastoFijo();
  openModal('modal-gasto-fijo');
}

function guardarGastoFijo(){
  const nombre = $('gasto-fijo-nombre').value.trim();
  const monto  = parseFloat($('gasto-fijo-monto').value)||0;
  const periodo= $('gasto-fijo-periodo').value;
  if(!nombre){ toast('Ingresá una descripción'); return; }
  if(monto<=0){ toast('Ingresá un monto válido'); return; }

  if(_gastoFijoEditId){
    const g = gastosFijos.find(x=>x.id===_gastoFijoEditId);
    if(g){ g.nombre=nombre; g.monto=monto; g.periodo=periodo; }
  } else {
    const maxId = gastosFijos.reduce((a,g)=>Math.max(a,g.id),0);
    gastosFijos.push({ id:maxId+1, nombre, monto, periodo });
  }
  _gastoFijoEditId = null;
  closeModal('modal-gasto-fijo');
  saveData(); renderCostos();
  toast(`Gasto fijo guardado ✓`);
}

function eliminarGastoFijo(id){
  confirmar({ titulo:'Eliminar gasto fijo', labelOk:'Eliminar', tipo:'danger',
    onOk:()=>{ gastosFijos=(gastosFijos||[]).filter(g=>g.id!==id); saveData();renderCostos();toast('Eliminado'); }
  }); return;
  gastosFijos = (gastosFijos||[]).filter(g=>g.id!==id);
  saveData(); renderCostos(); toast('Eliminado');
}

