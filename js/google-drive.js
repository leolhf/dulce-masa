// ══════════════ GOOGLE DRIVE — Apps Script ══════════════
// Sin OAuth, sin Client ID. Solo la URL de tu Web App desplegada.
// La URL se guarda en localStorage para no pedirla cada vez.

let _gasUrl = localStorage.getItem('gas_url') || '';
let _gdrivePendingData = null;

// ── Obtener/guardar URL del script ──
function _gasGetUrl(){
  if(_gasUrl) return _gasUrl;
  const url = prompt(
    '☁ Pega la URL de tu Google Apps Script Web App:\n\n' +
    '(La obtuviste al desplegar el script en script.google.com\n' +
    ' → Implementar → Nueva implementación → Aplicación web)'
  );
  if(url && url.trim().startsWith('https://')){
    _gasUrl = url.trim();
    localStorage.setItem('gas_url', _gasUrl);
    _gdriveActualizarUI(true);
    return _gasUrl;
  }
  toast('❌ URL no válida');
  return null;
}

// ── Configurar / cambiar URL ──
function gdriveSettings(){
  const url = prompt('☁ URL de tu Google Apps Script Web App:', _gasUrl || '');
  if(url && url.trim().startsWith('https://')){
    _gasUrl = url.trim();
    localStorage.setItem('gas_url', _gasUrl);
    _gdriveActualizarUI(true);
    toast('✓ URL de Drive configurada');
  } else if(url !== null) {
    toast('❌ URL inválida. Debe comenzar con https://');
  }
}

function handleBotonGDrive(){
  if(_gasUrl){
    // Ya está configurado, mostrar opciones
    confirmar({
      titulo:'Configuración de Drive',
      mensaje:'URL ya configurada. ¿Deseas cambiarla o eliminar?',
      labelOk:'Cambiar URL',
      labelCancel:'Eliminar URL',
      tipo:'info',
      onOk:()=>gdriveSettings(),
      onCancel:()=>gdriveLogout()
    });
  } else {
    // No está configurado, solicitar URL
    gdriveSettings();
  }
}

function gdriveLogin(){
  const url = prompt('☁ URL de tu Google Apps Script Web App:', _gasUrl || '');
  if(url && url.trim().startsWith('https://')){
    _gasUrl = url.trim();
    localStorage.setItem('gas_url', _gasUrl);
    _gdriveActualizarUI(true);
    toast('✅ URL guardada correctamente');
  } else if(url !== null){
    toast('❌ URL no válida — debe comenzar con https://');
  }
}

function _doGdriveLogout(){
  _gasUrl=''; localStorage.removeItem('gas_url'); _gdriveActualizarUI(false); toast('URL eliminada');
}
function gdriveLogout(){
  confirmar({ titulo:'Quitar URL de Drive', labelOk:'Quitar', tipo:'warn',
    onOk:()=>{ _doGdriveLogout(); }
  });
}

// ── Guardar en Drive via Apps Script ──
async function gdriveSave(){
  const url = _gasGetUrl();
  if(!url) return;
  try{
    _gdriveActualizarUI(true, '⏳ Guardando…');
    const json = JSON.stringify(buildData(), null, 2);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: json
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const result = await resp.json();
    if(result.status !== 'ok') throw new Error(result.message || 'Error en el script');
    _gdriveActualizarUI(true, '✓ Guardado');
    toast('☁ Guardado en Google Drive ✓');
  }catch(e){
    console.error('gdriveSave error:', e);
    _gdriveActualizarUI(true, '⚠ Error al guardar');
    toast('❌ Error guardando en Drive: '+e.message);
  }
}

// ── Cargar de Drive y comparar ──
async function gdriveLoad(){
  const url = _gasGetUrl();
  if(!url) return;
  try{
    _gdriveActualizarUI(true, '⏳ Cargando…');
    const resp = await fetch(url + '?action=load', {method:'GET'});
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const result = await resp.json();
    if(result.status === 'empty'){
      _gdriveActualizarUI(true);
      toast('☁ No hay datos en Drive aún. Guardá primero.');
      return;
    }
    if(result.status !== 'ok') throw new Error(result.message || 'Error en el script');
    const driveData = JSON.parse(result.data);

    // Comparar con datos locales
    const localData = buildData();
    const diff = _gdriveDiff(localData, driveData);
    _gdriveActualizarUI(true);

    if(!diff.hasDiff){
      toast('✅ Los datos de Drive son idénticos a los locales.');
      return;
    }

    // Hay diferencias — mostrar modal
    _gdrivePendingData = driveData;
    _gdriveMostrarConflicto(diff);

  }catch(e){
    console.error('gdriveLoad error:', e);
    _gdriveActualizarUI(true, '⚠ Error al cargar');
    toast('❌ Error cargando de Drive: '+e.message);
  }
}

// ── Comparar dos snapshots de datos ──
function _gdriveDiff(local, drive){
  const secciones = [
    { key:'ingredientes',    label:'Ingredientes',      icon:'▦' },
    { key:'recetas',         label:'Recetas',           icon:'✎' },
    { key:'producciones',    label:'Producciones',      icon:'⚙' },
    { key:'pedidos',         label:'Pedidos',           icon:'📋' },
    { key:'ventas',          label:'Ventas',            icon:'📈' },
    { key:'historialCompras',label:'Compras',           icon:'◷' },
    { key:'proveedores',     label:'Proveedores',       icon:'🏪' },
    { key:'stockProductos',  label:'Stock productos',   icon:'📦' },
  ];
  const resumen = [];
  let hasDiff = false;

  const driveTs = drive._guardado ? new Date(drive._guardado) : null;
  const localTs = local._guardado ? new Date(local._guardado) : null;

  const filas = secciones.map(s => {
    const la = (local[s.key]||[]).length;
    const da = (drive[s.key]||[]).length;
    const diff = da - la;
    if(la !== da){ hasDiff = true; resumen.push(`${s.label}: local ${la} vs Drive ${da}`); }
    return { ...s, local: la, drive: da, diff };
  });

  if(!hasDiff){
    const ljson = JSON.stringify({...local, _guardado:undefined, _version:undefined});
    const djson = JSON.stringify({...drive, _guardado:undefined, _version:undefined});
    if(ljson !== djson){ hasDiff = true; resumen.push('Diferencias en contenido de registros'); }
  }

  return { hasDiff, resumen, driveTs, localTs, filas };
}

// ── Mostrar modal de conflicto ──
function _gdriveMostrarConflicto(diff){
  const fmt = d => d ? d.toLocaleString('es',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'desconocida';

  // Fechas
  const fechasEl = document.getElementById('gdrive-diff-fechas');
  fechasEl.innerHTML = `
    <div style="flex:1;min-width:180px;background:var(--cream2);border:1px solid var(--border);border-radius:var(--r);padding:9px 13px;font-size:.8rem">
      <div style="color:var(--text3);font-size:.7rem;margin-bottom:3px">📱 Guardado local</div>
      <div style="font-weight:600;color:var(--text)">${fmt(diff.localTs)}</div>
    </div>
    <div style="flex:1;min-width:180px;background:rgba(66,133,244,.08);border:1px solid rgba(66,133,244,.25);border-radius:var(--r);padding:9px 13px;font-size:.8rem">
      <div style="color:var(--text3);font-size:.7rem;margin-bottom:3px">☁ Guardado en Drive</div>
      <div style="font-weight:600;color:#2a5db0">${fmt(diff.driveTs)}</div>
    </div>`;

  // Tabla de secciones
  const tbody = document.getElementById('gdrive-diff-tabla');
  tbody.innerHTML = diff.filas.map(f => {
    const igual = f.diff === 0;
    const mas   = f.diff > 0;
    const badge = igual
      ? `<span style="background:var(--ok-bg);color:var(--ok);border:1px solid #BCCFBC;padding:2px 8px;border-radius:10px;font-size:.7rem">Igual</span>`
      : mas
        ? `<span style="background:rgba(66,133,244,.1);color:#2a5db0;border:1px solid rgba(66,133,244,.3);padding:2px 8px;border-radius:10px;font-size:.7rem">+${f.diff} en Drive</span>`
        : `<span style="background:var(--warn-bg);color:var(--warn);border:1px solid #E8CCAA;padding:2px 8px;border-radius:10px;font-size:.7rem">${f.diff} en Drive</span>`;
    const clickable = !igual;
    const rowStyle = clickable
      ? `cursor:pointer;transition:background .15s`
      : '';
    const hoverAttr = clickable
      ? `onmouseenter="this.style.background='var(--cream2)'" onmouseleave="this.style.background=''"  onclick="_gdriveMostrarDetalle('${f.key}')"`
      : '';
    const detailHint = clickable
      ? `<span style="font-size:.68rem;color:var(--text3);margin-left:6px;opacity:.7">Ver detalles →</span>`
      : '';
    return `<tr style="${rowStyle}" ${hoverAttr}>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border2)">
        <span style="margin-right:6px">${f.icon}</span>${f.label}${detailHint}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:center;font-weight:${igual?'400':'600'};color:${igual?'var(--text3)':'#2a5db0'}">${f.drive}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:center;color:var(--text3)">${f.local}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border2);text-align:center">${badge}</td>
    </tr>`;
  }).join('');

  openModal('modal-gdrive-conflicto');
}

// ── Detalle de diferencias por sección ──
function _gdriveMostrarDetalle(key){
  if(!_gdrivePendingData) return;
  const local  = buildData();
  const drive  = _gdrivePendingData;
  const lArr   = local[key]  || [];
  const dArr   = drive[key]  || [];

  // Indexar por id
  const lMap = Object.fromEntries(lArr.map(r=>[r.id, r]));
  const dMap = Object.fromEntries(dArr.map(r=>[r.id, r]));
  const todosIds = [...new Set([...lArr.map(r=>r.id), ...dArr.map(r=>r.id)])];

  const soloEnDrive  = [];
  const soloEnLocal  = [];
  const modificados  = [];
  const iguales      = [];

  todosIds.forEach(id => {
    const l = lMap[id], d = dMap[id];
    if(!l && d){ soloEnDrive.push(d); return; }
    if(l && !d){ soloEnLocal.push(l); return; }
    if(JSON.stringify(l) !== JSON.stringify(d)) modificados.push({local:l, drive:d});
    else iguales.push(l);
  });

  const secciones = {
    ingredientes:   {label:'Ingredientes',    icon:'▦'},
    recetas:        {label:'Recetas',          icon:'✎'},
    producciones:   {label:'Producciones',     icon:'⚙'},
    pedidos:        {label:'Pedidos',          icon:'📋'},
    ventas:         {label:'Ventas',           icon:'📈'},
    historialCompras:{label:'Compras',         icon:'◷'},
    proveedores:    {label:'Proveedores',      icon:'🏪'},
    stockProductos: {label:'Stock productos',  icon:'📦'},
  };
  const sec = secciones[key] || {label:key, icon:'·'};

  // Función para mostrar un registro como texto legible según su tipo
  function _labelReg(r, src){
    if(!r) return '—';
    switch(key){
      case 'ingredientes':   return `<strong>${r.nombre||'?'}</strong> · Stock: ${r.stock??'?'} ${r.unidad||''} · Precio: $${r.precio??'?'}`;
      case 'recetas':        return `<strong>${r.nombre||'?'}</strong> · Cat: ${r.cat||'?'} · Rinde: ${r.rinde??'?'}`;
      case 'producciones':   return `ID ${r.id} · ${r.fecha||'?'} · Receta: ${r.recetaId} · ${r.tandas??'?'} tandas`;
      case 'pedidos':        return `<strong>${r.cliente||'?'}</strong> · ${r.fechaEntrega||'?'} · ${r.estado||'?'} · ${(r.items||[]).length} prod.`;
      case 'ventas':         return `ID ${r.id} · ${r.fecha||'?'} · Receta: ${r.recetaId} · ${r.unidades??'?'} u · $${r.precio??'?'}`;
      case 'historialCompras': return `ID ${r.id} · ${r.fecha||'?'} · Ing: ${r.ingId} · ${r.qty??'?'} u · $${r.precio??'?'}`;
      case 'proveedores':    return `<strong>${r.nombre||'?'}</strong> · Tel: ${r.tel||'—'} · ${r.productos||'—'}`;
      case 'stockProductos': return `Receta: ${r.recetaId} · Stock: ${r.stock??'?'} · Total: ${r.total??'?'}`;
      default: return JSON.stringify(r).slice(0,80);
    }
  }

  // Mostrar campos que cambiaron entre dos versiones del mismo registro
  function _diffFields(l, d){
    const allKeys = [...new Set([...Object.keys(l), ...Object.keys(d)])].filter(k=>k!=='id');
    const changed = allKeys.filter(k=>JSON.stringify(l[k])!==JSON.stringify(d[k]));
    if(!changed.length) return '<span style="color:var(--text3);font-size:.79rem">Sin diferencias detectadas en campos</span>';
    return changed.map(k=>`
      <div style="display:grid;grid-template-columns:100px 1fr 1fr;gap:6px;align-items:start;padding:5px 0;border-bottom:1px solid var(--border2);font-size:.8rem">
        <span style="color:var(--text3);font-size:.72rem;padding-top:2px">${k}</span>
        <div style="background:rgba(184,84,80,.08);border-radius:5px;padding:3px 7px;color:var(--danger);word-break:break-all">
          <div style="font-size:.62rem;color:var(--text3);margin-bottom:1px">📱 Local</div>
          ${JSON.stringify(l[k])??'—'}
        </div>
        <div style="background:rgba(66,133,244,.08);border-radius:5px;padding:3px 7px;color:#2a5db0;word-break:break-all">
          <div style="font-size:.62rem;color:var(--text3);margin-bottom:1px">☁ Drive</div>
          ${JSON.stringify(d[k])??'—'}
        </div>
      </div>`).join('');
  }

  // Construir HTML
  let html = `<div style="font-size:.78rem;color:var(--text3);margin-bottom:14px">
    ${sec.icon} <strong style="color:var(--text2)">${sec.label}</strong> — 
    📱 Local: ${lArr.length} · ☁ Drive: ${dArr.length}
    ${soloEnDrive.length?` · <span style="color:#2a5db0">+${soloEnDrive.length} solo en Drive</span>`:''}
    ${soloEnLocal.length?` · <span style="color:var(--warn)">+${soloEnLocal.length} solo en local</span>`:''}
    ${modificados.length?` · <span style="color:var(--danger)">${modificados.length} modificados</span>`:''}
  </div>`;

  // Sección: Solo en Drive
  if(soloEnDrive.length){
    html += `<div style="margin-bottom:16px">
      <div style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#2a5db0;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="background:rgba(66,133,244,.15);border:1px solid rgba(66,133,244,.3);border-radius:5px;padding:2px 7px">☁ Solo en Drive (${soloEnDrive.length})</span>
        <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">— no están en local</span>
      </div>
      ${soloEnDrive.map(r=>`<div style="padding:8px 12px;background:rgba(66,133,244,.06);border:1px solid rgba(66,133,244,.2);border-radius:var(--r);margin-bottom:5px;font-size:.82rem">${_labelReg(r,'drive')}</div>`).join('')}
    </div>`;
  }

  // Sección: Solo en Local
  if(soloEnLocal.length){
    html += `<div style="margin-bottom:16px">
      <div style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--warn);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:5px;padding:2px 7px">📱 Solo en local (${soloEnLocal.length})</span>
        <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">— no están en Drive</span>
      </div>
      ${soloEnLocal.map(r=>`<div style="padding:8px 12px;background:var(--warn-bg);border:1px solid #E8CCAA;border-radius:var(--r);margin-bottom:5px;font-size:.82rem">${_labelReg(r,'local')}</div>`).join('')}
    </div>`;
  }

  // Sección: Modificados
  if(modificados.length){
    html += `<div style="margin-bottom:16px">
      <div style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--danger);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="background:var(--danger-bg);border:1px solid #E8BFBE;border-radius:5px;padding:2px 7px">⚡ Modificados (${modificados.length})</span>
        <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">— mismo ID, contenido diferente</span>
      </div>
      ${modificados.map(({local:l, drive:d})=>`
        <details style="margin-bottom:8px;background:var(--white);border:1px solid var(--border);border-radius:var(--r);overflow:hidden">
          <summary style="padding:9px 12px;cursor:pointer;font-size:.83rem;list-style:none;display:flex;justify-content:space-between;align-items:center;user-select:none">
            <span>${_labelReg(l,'local')}</span>
            <span style="font-size:.7rem;color:var(--text3);flex-shrink:0;margin-left:8px">Ver cambios ▾</span>
          </summary>
          <div style="padding:8px 12px 12px;border-top:1px solid var(--border2)">
            <div style="display:grid;grid-template-columns:100px 1fr 1fr;gap:6px;padding:4px 0;font-size:.68rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--border)">
              <span>Campo</span><span style="color:var(--danger)">📱 Local</span><span style="color:#2a5db0">☁ Drive</span>
            </div>
            ${_diffFields(l, d)}
          </div>
        </details>`).join('')}
    </div>`;
  }

  if(!soloEnDrive.length && !soloEnLocal.length && !modificados.length){
    html += `<div class="empty">Los registros son idénticos en contenido</div>`;
  }

  $('gdrive-detalle-title').innerHTML = `${sec.icon} ${sec.label} — detalle`;
  $('gdrive-detalle-body').innerHTML = html;
  closeModal('modal-gdrive-conflicto');
  openModal('modal-gdrive-detalle');
}

// ── Reemplazar datos locales con los de Drive ──
function gdriveReemplazarLocal(){
  if(!_gdrivePendingData){ closeModal('modal-gdrive-conflicto'); return; }
  confirmar({
    titulo: 'Reemplazar datos locales',
    mensaje: '¿Estás segura? Los datos locales serán reemplazados con los de Drive. Esta acción no se puede deshacer.',
    labelOk: 'Sí, reemplazar',
    tipo: 'warn',
    onOk: () => {
      _cargarDatosJSON(JSON.stringify(_gdrivePendingData));
      _gdrivePendingData = null;
      closeModal('modal-gdrive-conflicto');
      toast('✅ Datos reemplazados con la versión de Google Drive');
    }
  });
}

// ── Fusionar Drive + Local (combinar sin perder datos de ningún lado) ──
async function gdriveFusionar(){
  if(!_gdrivePendingData){ closeModal('modal-gdrive-conflicto'); return; }
  confirmar({
    titulo: 'Fusionar datos',
    mensaje: 'Se combinarán los datos de Drive y los locales. Si un registro existe en los dos lados, se conservará el de Drive. No se perderá ningún registro.',
    labelOk: 'Fusionar',
    tipo: 'info',
    onOk: async () => {
      const drive = _gdrivePendingData;
      const local = buildData();

      // Secciones con arrays de registros con IDs únicos
      const secciones = [
        'ingredientes','recetas','producciones','ventas','pedidos',
        'historialCompras','proveedores','stockProductos',
        'catRecetas','gastosFijos','extracciones','prestamos'
      ];

      const merged = Object.assign({}, local);

      secciones.forEach(key => {
        const localArr = local[key] || [];
        const driveArr = drive[key] || [];

        if(!driveArr.length && !localArr.length){ merged[key] = []; return; }

        // Indexar por id
        const localMap = {};
        localArr.forEach(r => { if(r.id != null) localMap[r.id] = r; });

        const driveMap = {};
        driveArr.forEach(r => { if(r.id != null) driveMap[r.id] = r; });

        // Todos los IDs únicos
        const allIds = new Set([
          ...localArr.map(r => r.id),
          ...driveArr.map(r => r.id)
        ]);

        // Drive tiene prioridad en caso de conflicto
        merged[key] = [...allIds].map(id => driveMap[id] || localMap[id]).filter(Boolean);
      });

      // nextId: tomar el máximo de cada contador
      const localNext = local.nextId || {};
      const driveNext = drive.nextId || {};
      merged.nextId = {};
      ['ing','rec','prod','venta','comp','prov','pedido','ext','prestamo'].forEach(k => {
        merged.nextId[k] = Math.max(localNext[k]||1, driveNext[k]||1);
      });

      merged._guardado = new Date().toISOString();
      merged._version  = 2;

      // Cargar datos fusionados localmente
      _cargarDatosJSON(JSON.stringify(merged));
      _gdrivePendingData = null;
      closeModal('modal-gdrive-conflicto');

      // Subir fusión a Drive
      toast('🔀 Fusionando y guardando en Drive…');
      await gdriveSave();
      toast('✅ Datos fusionados correctamente');
    }
  });
}

// ── Sobrescribir Drive con datos locales ──
async function gdriveSobrescribirDrive(){
  confirmar({
    titulo: 'Sobrescribir Drive',
    mensaje: '¿Estás segura? Los datos en Drive serán reemplazados con los datos locales. Los datos que estén solo en Drive se perderán.',
    labelOk: 'Sí, sobrescribir',
    tipo: 'warn',
    onOk: async () => {
      _gdrivePendingData = null;
      closeModal('modal-gdrive-conflicto');
      await gdriveSave();
    }
  });
}

// ── Actualizar UI de Drive en el sidebar ──
function _gdriveActualizarUI(conectado, msg){
  const dot    = $('gdrive-dot');
  const texto  = $('gdrive-texto');
  const nombre = $('gdrive-archivo-nombre');
  const syncStatus = $('gdrive-sync-status');
  const btnLogin  = $('btn-gdrive-login');
  const btnLogout = $('btn-gdrive-logout');
  const acciones  = $('sf-drive-acciones');
  if(!dot) return;

  if(conectado){
    dot.style.background = '#4285F4';
    texto.style.color    = 'rgba(150,200,255,.85)';
    texto.textContent    = 'Activo';
    btnLogin.textContent = '✎ URL';
    btnLogin.style.display  = 'inline-flex';
    btnLogout.style.display = 'inline-flex';
    if(acciones) acciones.style.display = 'flex';
    nombre.style.display = 'block';
    nombre.textContent   = msg ? '☁ ' + msg : '☁ Listo';
    
    // Mostrar estado de sincronización
    if(syncStatus){
      syncStatus.style.display = 'block';
      if(_syncStatus === 'synced'){
        syncStatus.style.color = 'var(--sage)';
        syncStatus.textContent = '✅ Sincronizado - Auto-sync activado (4s)';
      } else if(_syncStatus === 'conflict'){
        syncStatus.style.color = 'var(--warn)';
        syncStatus.textContent = '⚠ Conflicto - Solo guardado manual';
      } else {
        syncStatus.style.color = 'var(--text3)';
        syncStatus.textContent = '❓ Verificando estado...';
      }
    }
  } else {
    dot.style.background = 'rgba(255,255,255,.2)';
    texto.style.color    = 'rgba(255,255,255,.3)';
    texto.textContent    = 'Sin configurar';
    btnLogin.textContent = '🔑 Configurar';
    btnLogin.style.display  = 'inline-flex';
    btnLogout.style.display = 'none';
    if(acciones) acciones.style.display = 'none';
    nombre.style.display = 'none';
    if(syncStatus) syncStatus.style.display = 'none';
  }
}

// Inicializar UI según si ya hay URL guardada
_gdriveActualizarUI(!!_gasUrl);

// ── Comparar con Drive al arrancar ──
// Se llama desde cargarHandleGuardado y restaurarPermiso tras cargar datos locales
async function _gdriveCompararAlArrancar(){
  if(!_gasUrl) return;
  try{
    const resp = await fetch(_gasUrl+'?action=load', {method:'GET'});
    if(!resp.ok) return;
    const r = await resp.json();
    if(r.status !== 'ok') return;
    const driveData = JSON.parse(r.data);
    const localData = buildData();
    const diff = _gdriveDiff(localData, driveData);
    if(!diff.hasDiff){
      // Iguales — activar auto-guardado en Drive 4 segundos después de cada cambio local
      _driveAutoSyncActivo = true;
      _syncStatus = 'synced';
      _lastDriveSync = new Date();
      console.log('✅ Local y Drive están sincronizados - Auto-sync activado (4s)');
      _gdriveActualizarUI(true, 'Sincronizado');
      return;
    }
    // Hay diferencias — mostrar modal, desactivar auto-sync hasta próximo arranque
    _driveAutoSyncActivo = false;
    _syncStatus = 'conflict';
    console.log('⚠ Conflicto detectado - Auto-sync desactivado');
    _gdriveActualizarUI(true, 'Conflicto');
    setTimeout(()=>{
      _gdrivePendingData = driveData;
      _gdriveMostrarConflicto(diff);
    }, 800);
  }catch(e){
    console.warn('Error comparando con Drive:',e);
    _syncStatus = 'unknown';
  }
}

// Timer para el guardado en Drive 4 segundos después del último cambio local
let _driveAutoSyncTimer = null;

// Función para programar guardado en Drive
function _programarDriveSync(){
  if(!_driveAutoSyncActivo || !_gasUrl || _syncStatus !== 'synced') return;
  
  clearTimeout(_driveAutoSyncTimer);
  _driveAutoSyncTimer = setTimeout(async ()=>{
    try{
      await gdriveSave();
      _lastDriveSync = new Date();
      console.log('☁ Auto-guardado en Drive completado');
    }catch(e){
      console.error('Error en auto-guardado Drive:', e);
    }
  }, 4000); // 4 segundos como solicitaste
}

// ── Sidebar móvil ──
function toggleSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

