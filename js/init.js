// ══════════════ INIT ══════════════
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

// Inicializar stock de productos desde producciones existentes
function inicializarStockProductos(){
  if(!stockProductos) stockProductos=[];
  if(!recetas) recetas=[]; // Asegurar que recetas exista
  recetas.forEach(r=>{
    let sp=stockProd(r.id);
    if(!sp){
      const produccionesReceta=producciones.filter(p=>p.recetaId===r.id);
      const totalProducido=produccionesReceta.reduce((a,p)=>a+(p.unidadesReales||rec(p.recetaId)?.rinde*p.tandas||0),0);
      const ventasReceta=ventas?ventas.filter(v=>v.recetaId===r.id):[];
      const totalVendidas=ventasReceta.reduce((a,v)=>a+v.unidades,0);
      stockProductos.push({recetaId:r.id,stock:totalProducido-totalVendidas,total:totalProducido});
    }
  });
}
inicializarStockProductos();

// ══════════════ DATA PERSISTENCE ══════════════
// Cargar handle guardado (persiste con IndexedDB)
(async function cargarHandleGuardado(){
  try{
    if(!('indexedDB' in window)){
      await initializeData(); // Si no hay IndexedDB, inicializar desde localStorage
      return;
    }
    const db = await abrirDB();
    const h = await dbGet(db,'fileHandle');
    if(h){
      // Verificar que el permiso siga vigente
      const perm = await h.queryPermission({mode:'readwrite'});
      if(perm==='granted'){
        _fileHandle = h;
        actualizarUIArchivo(h.name, true);
        
        // Cargar datos desde el archivo vinculado
        try{
          const file = await h.getFile();
          const content = await file.text();
          _cargarDatosJSON(content);
          console.log('Datos cargados desde archivo vinculado:', h.name);
          // Comparar con Drive al arrancar
          if(_gasUrl) _gdriveCompararAlArrancar();
        }catch(e){
          console.error('Error cargando desde archivo vinculado:', e);
          toast('⚠ Error al cargar desde archivo vinculado');
          await initializeData(); // Cargar desde localStorage si hay error
        }
      } else {
        // Permiso caducado — requiere interacción del usuario
        // El handle se guarda para que "Restaurar" funcione con un clic
        console.log('Permisos expirados para:', h.name);
        _fileHandle = h;
        actualizarUIArchivo(h.name, false, 'Clic en Restaurar para reanudar guardado');
        await initializeData(); // Cargar desde localStorage mientras tanto
        // Mostrar aviso no intrusivo tras 1 segundo
        setTimeout(() => {
          const banner = document.getElementById('banner-permiso-exp');
          if (banner) {
            banner.style.display = 'flex';
            const nombreEl = document.getElementById('banner-nombre-archivo');
            if (nombreEl) nombreEl.textContent = h.name;
          }
        }, 1200);
      }
    } else {
      // No hay archivo vinculado, cargar desde localStorage
      await initializeData();
      // Comparar con Drive al arrancar
      if(_gasUrl) _gdriveCompararAlArrancar();
    }
  }catch(e){ 
    console.warn('No se pudo restaurar handle:',e);
    await initializeData(); // Cargar desde localStorage si hay error
  }
})();

// ── IndexedDB helpers ──
function abrirDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('reposteria_fs',1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('store');
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}
function dbSet(db,key,val){
  return new Promise((res,rej)=>{
    const tx=db.transaction('store','readwrite');
    tx.objectStore('store').put(val,key);
    tx.oncomplete=()=>res();
    tx.onerror=e=>rej(e.target.error);
  });
}
function dbGet(db,key){
  return new Promise((res,rej)=>{
    const tx=db.transaction('store','readonly');
    const req=tx.objectStore('store').get(key);
    req.onsuccess=e=>res(e.target.result);
    req.onerror=e=>rej(e.target.error);
  });
}
function dbDel(db,key){
  return new Promise((res,rej)=>{
    const tx=db.transaction('store','readwrite');
    tx.objectStore('store').delete(key);
    tx.oncomplete=()=>res();
    tx.onerror=e=>rej(e.target.error);
  });
}

// ── Construir el objeto de datos a guardar ──
function buildData(){
  return {
    _version: 2,
    _guardado: nowISOLocal(),  // timezone.js — ISO con offset local, no UTC
    ingredientes, recetas, producciones, ventas, pedidos,
    stockProductos, proveedores, historialCompras, catRecetas, gastosFijos, extracciones, prestamos, metas,
    nextId:{
      ing:nextId?.ing||1, rec:nextId?.rec||1, prod:nextId?.prod||1,
      venta:nextId?.venta||1, comp:nextId?.comp||1,
      prov:nextId?.prov||1, pedido:nextId?.pedido||pedidos?.length+1||1,
      ext:nextId?.ext||1, prestamo:nextId?.prestamo||1
    }
  };
}

// ── Guardar en localStorage (solo si no hay archivo vinculado) + archivo si está vinculado ──
// Variables para control de sincronización mejorada
let _syncStatus = 'unknown'; // 'synced', 'conflict', 'unknown'
let _lastDriveSync = null;

async function saveData(){
  const data = buildData();
  
  // SIEMPRE guardar en localStorage como respaldo (independiente del archivo)
  try {
    localStorage.setItem('reposteria_data', JSON.stringify(data));
  } catch(e) {
    console.warn('localStorage lleno o no disponible:', e);
  }

  // Guardado en archivo si está vinculado
  if(_fileHandle){
    await _escribirArchivo(false); // _escribirArchivo ya genera su propio JSON
  } else {
    try {
      const db = await abrirDB();
      await dbSet(db, 'reposteria_data', data);
    } catch(e) {
      console.error('[DulceMasa] Error al guardar en IndexedDB:', e);
      toast('⚠ No se pudo guardar localmente. Revisá la consola del navegador.');
    }
  }
  
  // Programar guardado en nube si está sincronizado
  if(_syncStatus === 'synced' && _driveAutoSyncActivo){
    _programarDriveSync();
  }
}

// ── Escribir al archivo vinculado ──
async function _escribirArchivo(mostrarToast=true){
  if(!_fileHandle || _guardandoArchivo) return;
  _guardandoArchivo = true;
  try{
    // Verificar/pedir permiso
    let perm = await _fileHandle.queryPermission({mode:'readwrite'});
    if(perm !== 'granted'){
      perm = await _fileHandle.requestPermission({mode:'readwrite'});
    }
    if(perm !== 'granted'){
      actualizarUIArchivo(_fileHandle.name, false, 'Sin permiso');
      _guardandoArchivo = false;
      return;
    }
    const data = buildData();
    const json = JSON.stringify(data, null, 2);
    const writable = await _fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    _ultimoGuardado = new Date();
    actualizarUIArchivo(_fileHandle.name, true);
    if(mostrarToast) toast('💾 Guardado en archivo ✓');
  }catch(e){
    console.error('Error escribiendo archivo:',e);
    if(mostrarToast) toast('⚠ No se pudo guardar el archivo');
    actualizarUIArchivo(_fileHandle.name, false, 'Error al escribir');
  }
  _guardandoArchivo = false;
}

// ── Elegir / crear archivo de guardado ──
async function elegirArchivoGuardado(){
  if(!('showSaveFilePicker' in window)){
    toast('Tu navegador no soporta File System Access API. Usa Chrome/Edge.');
    return;
  }
  try{
    const h = await window.showSaveFilePicker({
      suggestedName: 'dulce-y-masa.json',
      types:[{description:'Archivo de datos JSON', accept:{'application/json':['.json']}}]
    });
    _fileHandle = h;
    // Persistir en IndexedDB
    try{
      const db = await abrirDB();
      await dbSet(db,'fileHandle',h);
    }catch(e){ console.warn('No se pudo persistir handle en IndexedDB:',e); }
    // Guardar inmediatamente
    await _escribirArchivo(false);
    toast('📁 Archivo vinculado y guardado ✓');
    actualizarUIArchivo(h.name, true);
  }catch(e){
    if(e.name!=='AbortError') toast('No se pudo vincular el archivo');
  }
}

// ── Guardar ahora manualmente ──
async function guardarAhora(){
  if(!_fileHandle){ toast('Primero vinculá un archivo'); return; }
  await _escribirArchivo(true);
}

// ── Desvincular archivo ──
async function _doDesvincularArchivo(){
  _fileHandle = null;
  _ultimoGuardado = null;
  try{ const db=await abrirDB(); await dbDel(db,'fileHandle'); }catch(e){}
  actualizarUIArchivo(null, false);
  toast('Archivo desvinculado');
}
function desvincularArchivo(){
  confirmar({ titulo:'Desvincular archivo', mensaje:'Los datos seguirán guardados en el navegador.', labelOk:'Desvincular', labelCancel:'Cancelar', tipo:'warn',
    onOk:()=>{ _doDesvincularArchivo(); }
  });
}

// ── Actualizar UI del sidebar ──
function actualizarUIArchivo(nombre, activo, msg){
  const dot=$('sf-dot'), texto=$('sf-texto'), sfNombre=$('sf-nombre'), sfTs=$('sf-ts');
  const btnVincular=$('btn-vincular'), btnGuardar=$('btn-guardar-ahora'), btnDesv=$('btn-desvincular');
  const btnBorrarTodo=$('btn-borrar-todo');
  if(!dot) return;
  if(nombre && activo){
    dot.style.background='#8fc98c';
    texto.style.color='rgba(180,255,180,.7)';
    texto.textContent='Vinculado';
    sfNombre.style.display='block';
    sfNombre.textContent='📄 '+nombre;
    sfTs.style.display='block';
    sfTs.textContent=_ultimoGuardado?'Guardado '+_fmtTs(_ultimoGuardado):'Pendiente primer guardado';
    btnVincular.textContent='🔄 Cambiar';
    btnGuardar.style.display='block';
    btnDesv.style.display='block';
    if(btnBorrarTodo) btnBorrarTodo.style.display='block';
  } else if(nombre && !activo){
    dot.style.background='#C47C2B';
    texto.style.color='rgba(232,168,74,.8)';
    texto.textContent='Permiso expirado';
    sfNombre.style.display='block';
    sfNombre.textContent='📄 '+nombre;
    sfTs.style.display='none';
    btnVincular.textContent='🔑 Restaurar';
    btnGuardar.style.display='block';
    btnDesv.style.display='block';
    if(btnBorrarTodo) btnBorrarTodo.style.display='block';
  } else {
    dot.style.background='rgba(255,255,255,.2)';
    texto.style.color='rgba(255,255,255,.3)';
    texto.textContent='Sin archivo';
    sfNombre.style.display='none';
    sfTs.style.display='none';
    btnVincular.textContent='📁 Vincular';
    btnGuardar.style.display='none';
    btnDesv.style.display='none';
    if(btnBorrarTodo) btnBorrarTodo.style.display='none';
  }
}

// ── Manejar botón de vincular/restaurar ──
function handleBotonVincular(){
  const btn = $('btn-vincular');
  const texto = btn ? btn.textContent : '';
  if(texto.includes('Cambiar')){
    elegirArchivoGuardado();
  } else if(texto.includes('Restaurar')){
    restaurarPermiso();
  } else {
    elegirArchivoGuardado();
  }
}

// ── Manejar botón de vincular/restaurar ──


// ── Elegir archivo guardado ──
async function elegirArchivoGuardado(){
  try{
    const h = await window.showSaveFilePicker({
      suggestedName: 'dulce-y-masa.json',
      types:[{description:'Archivo de datos JSON', accept:{'application/json':['.json']}}]
    });
    _fileHandle = h;
    // Persistir en IndexedDB
    try{
      const db = await abrirDB();
      await dbSet(db,'fileHandle',h);
    }catch(e){ console.warn('No se pudo persistir handle en IndexedDB:',e); }
    // Guardar inmediatamente
    await _escribirArchivo(false);
    toast('📁 Archivo vinculado y guardado ✓');
    actualizarUIArchivo(h.name, true);
  }catch(e){
    if(e.name!=='AbortError') toast('No se pudo vincular el archivo');
  }
}

// ── Restaurar permiso manualmente ──
async function restaurarPermiso(){
  if(!_fileHandle){
    toast('No hay archivo vinculado para restaurar permisos');
    return;
  }
  
  console.log('Solicitando permisos para:', _fileHandle.name);
  
  try {
    const perm = await _fileHandle.requestPermission({mode:'readwrite'});
    if(perm === 'granted'){
      actualizarUIArchivo(_fileHandle.name, true);
      
      // Cargar datos desde el archivo vinculado
      try{
        const file = await _fileHandle.getFile();
        const content = await file.text();
        _cargarDatosJSON(content);
        console.log('✅ Permisos restaurados manualmente:', _fileHandle.name);
        toast('✅ Permisos restaurados y datos cargados');
        // Comparar con Drive al arrancar
        if(_gasUrl) _gdriveCompararAlArrancar();
      }catch(e){
        console.error('Error cargando desde archivo vinculado:', e);
        toast('⚠ Error al cargar desde archivo vinculado');
        await initializeData();
      }
    } else {
      actualizarUIArchivo(_fileHandle.name, false, 'Permiso denegado');
      toast('❌ Permiso denegado. No se puede acceder al archivo.');
    }
  } catch(e) {
    console.error('Error restaurando permiso:', e);
    if(e.message.includes('User activation is required')){
      toast('⚠ Se requiere hacer clic en el botón para restaurar permisos');
    } else {
      actualizarUIArchivo(_fileHandle.name, false, 'Error al restaurar permiso');
      toast('⚠ Error al intentar restaurar el permiso');
    }
  }
}

function _fmtTs(d){
  const ahora=new Date(), diff=Math.round((ahora-d)/1000);
  if(diff<5) return 'ahora mismo';
  if(diff<60) return `hace ${diff}s`;
  if(diff<3600) return `hace ${Math.round(diff/60)}min`;
  return d.toLocaleTimeString(TIMEZONE_CONFIG.locale, {timeZone: TIMEZONE_CONFIG.timezone, hour:'2-digit',minute:'2-digit'});
}

// Actualizar timestamp en la UI cada 15s
setInterval(()=>{
  if(_fileHandle && _ultimoGuardado){
    const sfTs=$('sf-ts');
    if(sfTs) sfTs.textContent='Guardado '+_fmtTs(_ultimoGuardado);
  }
},15000);

