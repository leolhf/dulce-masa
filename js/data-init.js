// ══════════════ DATA INITIALIZATION ══════════════
function formatCantidad(stock, unidad){
  // Para unidades, mostrar como número entero sin decimales
  if(unidad === 'unidad' || unidad === 'unidades' || unidad === 'u' || unidad === 'Und'){
    return `${Math.round(stock)} ${unidad}`;
  }
  // Para litros menores a 1, mostrar en mililitros
  if(unidad === 'l' && stock < 1){
    return `${Math.round(stock * 1000)} ml`;
  }
  // Para kilogramos menores a 1, mostrar en gramos
  if(unidad === 'kg' && stock < 1){
    return `${Math.round(stock * 1000)} g`;
  }
  // Para el resto, mostrar con 3 decimales
  return `${fmtN(stock, 3)} ${unidad}`;
}

function initializeData(){
  const DEF={
    ingredientes:[],
    recetas:[],
    producciones:[],
    ventas:[],
    pedidos:[],
    stockProductos:[],
    proveedores:[],
    historialCompras:[],
    extracciones:[],
    nextId:{ing:1,rec:1,prod:1,venta:1,prov:1,comp:1,pedido:1,ext:1}
  };
  
  // Si hay archivo vinculado, no cargar desde localStorage (los datos ya se cargaron desde el archivo)
  if(_fileHandle){
    console.log('Usando datos desde archivo vinculado, omitiendo localStorage');
    return;
  }
  
  try{
    // Primero intentar cargar datos del sistema nuevo
    let saved=localStorage.getItem('reposteria_data');
    if(!saved){
      // Si no hay datos nuevos, intentar recuperar del sistema viejo
      const oldData=localStorage.getItem('dulcemasa_v3');
      if(oldData){
        console.log('Recuperando datos del sistema anterior...');
        const data=JSON.parse(oldData);
        ingredientes=data.ingredientes||DEF.ingredientes;
        recetas=data.recetas||DEF.recetas;
        producciones=data.producciones||DEF.producciones;
        ventas=data.ventas||DEF.ventas;
        pedidos=[]; // Los pedidos son nuevos, no existen en el sistema viejo
        stockProductos=data.stockProductos||DEF.stockProductos;
        proveedores=data.proveedores||DEF.proveedores;
        historialCompras=data.historialCompras||DEF.historialCompras;
        nextId=data.nextId||DEF.nextId;
        
        // Guardar automáticamente en el nuevo sistema
        const newData={
          ingredientes,recetas,producciones,ventas,pedidos,stockProductos,proveedores,historialCompras,nextId
        };
        localStorage.setItem('reposteria_data',JSON.stringify(newData));
        console.log('Datos migrados al nuevo sistema');
        return;
      }
    }
    
    if(saved){
      const data=JSON.parse(saved);
      ingredientes=data.ingredientes||DEF.ingredientes;
      recetas=data.recetas||DEF.recetas;
      producciones=data.producciones||DEF.producciones;
      ventas=data.ventas||DEF.ventas;
      pedidos=data.pedidos||DEF.pedidos;
      stockProductos=data.stockProductos||DEF.stockProductos;
      proveedores=data.proveedores||DEF.proveedores;
      historialCompras=data.historialCompras||DEF.historialCompras;
      nextId=data.nextId||DEF.nextId;
      if(data.catRecetas && Array.isArray(data.catRecetas) && data.catRecetas.length > 0)
        catRecetas = data.catRecetas;
      if(data.gastosFijos && Array.isArray(data.gastosFijos))
        gastosFijos = data.gastosFijos;
      if(data.extracciones && Array.isArray(data.extracciones))
        extracciones = data.extracciones;
      if(data.prestamos && Array.isArray(data.prestamos))
        prestamos = data.prestamos;
    }else{
      ingredientes=DEF.ingredientes;
      recetas=DEF.recetas;
      producciones=DEF.producciones;
      ventas=DEF.ventas;
      pedidos=DEF.pedidos;
      stockProductos=DEF.stockProductos;
      proveedores=DEF.proveedores;
      historialCompras=DEF.historialCompras;
      nextId=DEF.nextId;
    }
  }catch(e){
    // Si hay error, usar valores por defecto
    console.error('Error cargando datos desde localStorage:', e);
    ingredientes=DEF.ingredientes;
    recetas=DEF.recetas;
    producciones=DEF.producciones;
    ventas=DEF.ventas;
    pedidos=DEF.pedidos;
    stockProductos=DEF.stockProductos;
    proveedores=DEF.proveedores;
    historialCompras=DEF.historialCompras;
    nextId=DEF.nextId;
  }
  
  // Asegurar que nextId tenga todas las propiedades necesarias
  if(!nextId)nextId={};
  nextId.ing=nextId.ing||1;
  nextId.rec=nextId.rec||1;
  nextId.prod=nextId.prod||1;
  nextId.venta=nextId.venta||1;
  nextId.comp=nextId.comp||nextId.compra||1;
  nextId.prov=nextId.prov||1;
  nextId.pedido=nextId.pedido||pedidos?.length+1||1;
  nextId.ext=nextId.ext||1;
  nextId.prestamo=nextId.prestamo||1;

  // Sanear ids inválidos en historialCompras (null/NaN causados por bug nextId.comp vs nextId.compra)
  let _maxCompId = 0;
  let _idsSaneados = 0;
  (historialCompras||[]).forEach(c => {
    const idNum = Number(c.id);
    if(!isNaN(idNum) && idNum > 0) _maxCompId = Math.max(_maxCompId, idNum);
  });
  (historialCompras||[]).forEach(c => {
    const idNum = Number(c.id);
    if(c.id === undefined || c.id === null || isNaN(idNum) || idNum <= 0) {
      c.id = ++_maxCompId;
      _idsSaneados++;
    } else {
      c.id = idNum; // normalizar a número
    }
  });
  nextId.comp = Math.max(nextId.comp, _maxCompId + 1);

  // Inicializar la UI después de cargar los datos
  initApp();
  // Si se sanearon ids, persistir de inmediato para que el fix sobreviva recargas
  if(_idsSaneados > 0){
    console.warn(`[DulceMasa] Se sanearon ${_idsSaneados} id(s) en historialCompras`);
    saveData();
  }
}
// initializeData() se llamará después de cargar el handle del archivo

function initApp(){
  updateAlertBadge();
  renderDashboard();
  inicializarStockProductos();
  // Inicializar fecha del formulario de retiros
  const ef = $('ext-fecha'); if(ef) ef.value = today();
}

function borrarTodosLosDatos(){
  confirmar({
    titulo: 'Borrar todos los datos',
    mensaje: 'Esto eliminará <strong>ingredientes, recetas, producciones, ventas, pedidos, proveedores e historial</strong>. Esta acción no se puede deshacer.',
    labelOk: 'Sí, borrar todo',
    tipo: 'danger',
    onOk: () => { localStorage.removeItem("reposteria_data"); localStorage.removeItem("dulcemasa_v3"); location.reload(); }
  });
}

function toast(msg,d=2800){
  const t=$('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),d);
}
function openModal(id){$(id).classList.add('open');}
function closeModal(id){$(id).classList.remove('open');}

// ── Modal de confirmación reutilizable ──
// confirmar({ titulo, mensaje, labelOk, tipo, onOk, onCancel })
// tipo: 'danger' | 'warn' | 'info'  (default: 'danger')
function confirmar({ titulo='¿Confirmar acción?', mensaje='', labelOk='Eliminar', labelCancel='Cancelar', tipo='danger', onOk, onCancel }={}){
  const iconos = { danger:'🗑', warn:'⚠', info:'ℹ' };
  const colores = { danger:'var(--danger)', warn:'var(--warn)', info:'var(--caramel)' };
  const btnClass = { danger:'btn-danger', warn:'btn btn-sm', info:'btn-primary' };

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.id = '_confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box" role="dialog" aria-modal="true">
      <div class="confirm-header">
        <span class="confirm-icon">${iconos[tipo]||iconos.danger}</span>
        <span class="confirm-title">${titulo}</span>
      </div>
      ${mensaje ? `<div class="confirm-body">${mensaje}</div>` : ''}
      <div class="confirm-actions">
        <button class="btn btn-secondary btn-sm" id="_confirm-cancel">${labelCancel}</button>
        <button class="btn ${btnClass[tipo]||'btn-danger'} btn-sm" id="_confirm-ok">${labelOk}</button>
      </div>
    </div>`;

  const cerrar = () => { overlay.remove(); };
  overlay.querySelector('#_confirm-cancel').onclick = () => { cerrar(); onCancel && onCancel(); };
  overlay.querySelector('#_confirm-ok').onclick    = () => { cerrar(); onOk && onOk(); };
  overlay.addEventListener('click', e => { if(e.target===overlay){ cerrar(); onCancel&&onCancel(); }});
  document.body.appendChild(overlay);
  // Focus en el botón de confirmar para poder usar Enter/Escape
  setTimeout(()=>{ const btn=overlay.querySelector('#_confirm-ok'); if(btn)btn.focus(); }, 50);
}

// ── Atajos de teclado globales ──
document.addEventListener('keydown', e => {
  // Escape — cerrar modal de confirmación o cualquier modal abierto
  if(e.key === 'Escape'){
    const conf = document.getElementById('_confirm-overlay');
    if(conf){ conf.remove(); return; }
    const abierto = document.querySelector('.modal-overlay.open');
    if(abierto){ abierto.classList.remove('open'); return; }
  }
  // Ctrl+S — guardar manualmente (archivo vinculado o localStorage)
  if((e.ctrlKey||e.metaKey) && e.key === 's'){
    e.preventDefault();
    guardarAhora ? guardarAhora() : saveData();
    toast('💾 Guardado ✓');
  }
});

function stockColor(i){
  if(i.stock<=0)return'danger';
  if(i.min>0&&i.stock<i.min)return'danger';
  if(i.min>0&&i.stock<i.min*1.5)return'warn';
  return'ok';
}
function stockLabel(i){
  if(i.stock<=0)return'Sin stock';
  if(i.min>0&&i.stock<i.min)return'Bajo';
  if(i.min>0&&i.stock<i.min*1.5)return'Por reponer';
  return'OK';
}
function calcCosto(r,tandas=1){
  // Calcular costo basado en precio promedio de ingredientes
  return r.ings.reduce((a,ri)=>{
    const i=ing(ri.ingId);
    if(!i) return a;
    
    // Obtener precio promedio del ingrediente desde historial de compras
    const precioPromedio = obtenerPrecioPromedioIngrediente(i.id);
    const precioUsar = precioPromedio > 0 ? precioPromedio : i.precio;
    
    return a + ri.qty * tandas * precioUsar;
  },0);
}

function obtenerPrecioPromedioIngrediente(ingId) {
  if (!historialCompras || historialCompras.length === 0) return 0;
  
  // Filtrar compras de este ingrediente
  // Comparación laxa para tolerar ingId como string o número (bug histórico)
  const comprasIngrediente = historialCompras.filter(c => c.ingId == ingId);
  
  if (comprasIngrediente.length === 0) return 0;
  
  // Calcular precio promedio ponderado
  const totalCantidad = comprasIngrediente.reduce((a, c) => a + c.qty, 0);
  const totalMonto = comprasIngrediente.reduce((a, c) => a + c.qty * c.precio, 0);
  
  return totalCantidad > 0 ? totalMonto / totalCantidad : 0;
}
function canProduce(r,tandas=1){
  return r.ings.every(ri=>{const i=ing(ri.ingId);return i&&i.stock>=ri.qty*tandas;});
}
function fillSelect(id,arr,empty='— Ninguno —'){
  const s=$(id);if(!s)return;
  const cur=s.value;
  s.innerHTML=`<option value="">${empty}</option>`;
  arr.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o);});
  if(cur)s.value=cur;
}
function refreshProvSelects(){
  const opts=proveedores.map(p=>[p.id,p.nombre]);
  fillSelect('compra-prov',opts);
}
function refreshIngSelects(){
  fillSelect('compra-ing',ingredientes.map(i=>[i.id,`${i.nombre} (${formatCantidad(i.stock, i.unidad)})`]),'— Seleccionar —');
}

