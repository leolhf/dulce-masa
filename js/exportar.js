// ══════════════ EXPORTAR CSV ══════════════
function exportCSV(){
  let rows=[],fn='export.csv';
  if(curSection==='inventario'){fn='inventario.csv';rows=[['Nombre','Categoría','Stock','Mínimo','Unidad','Precio/u','Estado','Proveedor']];ingredientes.forEach(i=>rows.push([i.nombre,i.cat,i.stock,i.min,i.unidad,i.precio,stockLabel(i),prv(i.provId)?.nombre||'']));}
  else if(curSection==='recetas'){fn='recetas.csv';rows=[['Nombre','Categoría','Rinde','Tiempo','Costo total','Costo/unidad']];recetas.forEach(r=>{const c=calcCosto(r);rows.push([r.nombre,r.cat,r.rinde,r.tiempo,c.toFixed(2),(r.rinde>0?c/r.rinde:0).toFixed(2)]);});}
  else if(curSection==='historial'){fn='compras.csv';rows=[['Fecha','Ingrediente','Cantidad','Precio/u','Total','Proveedor','Notas']];historialCompras.forEach(c=>{const i=ing(c.ingId);rows.push([c.fecha,i?.nombre||'',c.qty,c.precio,(c.qty*c.precio).toFixed(2),prv(c.provId)?.nombre||'',c.notas||'']);});}
  else if(curSection==='produccion'){fn='producciones.csv';rows=[['Fecha','Receta','Tandas','Planificado','Real','Merma','Costo','Nota']];producciones.forEach(p=>{const r=rec(p.recetaId);const planificado=r?r.rinde*p.tandas:0;const real=p.unidadesReales||planificado;rows.push([p.fecha,r?.nombre||'',p.tandas,planificado,real,planificado-real,r?calcCosto(r,p.tandas).toFixed(2):'',p.nota]);});}
  else if(curSection==='ventas'){fn='ventas.csv';rows=[['Fecha','Producto','Unidades','Precio/u','Total','Propina','Ganancia','Nota']];if(ventas){ventas.forEach(v=>{const r=rec(v.recetaId);const total=v.unidades*v.precio;const costo=r?calcCosto(r,v.unidades/(r.rinde||1)):0;rows.push([v.fecha,r?.nombre||'',v.unidades,v.precio,total.toFixed(2),(v.propina||0).toFixed(2),(total-costo).toFixed(2),v.nota||'']);});}}
  else if(curSection==='proveedores'){fn='proveedores.csv';rows=[['Nombre','Contacto','Teléfono','Email','Productos']];proveedores.forEach(p=>rows.push([p.nombre,p.contacto||'',p.tel||'',p.email||'',p.productos||'']));}
  if(rows.length<2){toast('Sin datos para exportar');return;}
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download=fn;a.click();
  toast('CSV descargado ✓');
}

// ══════════════ IMPORTAR JSON ══════════════
async function importarDesdeJSON(){
  if(!('showOpenFilePicker' in window)){
    // Fallback para navegadores sin File System Access API
    const input=document.createElement('input');
    input.type='file';input.accept='.json';
    input.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        try{
          _cargarDatosJSON(ev.target.result);
          toast('📂 Datos importados desde '+f.name+' ✓');
        }catch(err){ toast('⚠ Error al leer el archivo: '+err.message); }
      };
      reader.readAsText(f);
    };
    input.click();
    return;
  }
  try{
    const [h]=await window.showOpenFilePicker({
      types:[{description:'Archivo de datos JSON',accept:{'application/json':['.json']}}],
      multiple:false
    });
    const file=await h.getFile();
    const text=await file.text();
    _cargarDatosJSON(text);
    toast('📂 Datos importados desde '+h.name+' ✓');
    // Ofrecer vincularlo automáticamente
    if(confirm('¿Querés también vincular este archivo para guardado automático?')){
      // Crear handle de escritura para el mismo archivo
      try{
        const wh=await window.showSaveFilePicker({
          suggestedName:h.name,
          types:[{description:'Archivo de datos JSON',accept:{'application/json':['.json']}}]
        });
        _fileHandle=wh;
        const db=await abrirDB();
        await dbSet(db,'fileHandle',wh);
        await _escribirArchivo(false);
        actualizarUIArchivo(wh.name,true);
        toast('📁 Archivo vinculado ✓');
      }catch(e){}
    }
  }catch(e){
    if(e.name!=='AbortError') toast('No se pudo abrir el archivo');
  }
}

function _cargarDatosJSON(text){
  const data=JSON.parse(text);
  if(!data.ingredientes&&!data.recetas) throw new Error('Formato no reconocido');
  if(data.ingredientes) ingredientes=data.ingredientes;
  if(data.recetas) recetas=data.recetas;
  if(data.producciones) producciones=data.producciones;
  if(data.ventas) ventas=data.ventas;
  if(data.pedidos) pedidos=data.pedidos;
  if(data.stockProductos) stockProductos=data.stockProductos;
  if(data.proveedores) proveedores=data.proveedores;
  if(data.historialCompras) historialCompras=data.historialCompras;
  if(data.nextId) nextId=data.nextId;
  if(data.catRecetas && Array.isArray(data.catRecetas) && data.catRecetas.length>0) catRecetas=data.catRecetas;
  if(data.gastosFijos && Array.isArray(data.gastosFijos)) gastosFijos=data.gastosFijos;
  if(data.extracciones && Array.isArray(data.extracciones)) extracciones=data.extracciones;
  if(data.prestamos && Array.isArray(data.prestamos)) prestamos=data.prestamos;

  // Sanear nextId — mismo fix que data-init.js
  if(!nextId) nextId={};
  nextId.ing=nextId.ing||1; nextId.rec=nextId.rec||1; nextId.prod=nextId.prod||1;
  nextId.venta=nextId.venta||1; nextId.comp=nextId.comp||nextId.compra||1;
  nextId.prov=nextId.prov||1; nextId.pedido=nextId.pedido||1;
  nextId.ext=nextId.ext||1; nextId.prestamo=nextId.prestamo||1;

  // Sanear ids inválidos en historialCompras
  let _maxC=0;
  (historialCompras||[]).forEach(c=>{const n=Number(c.id);if(!isNaN(n)&&n>0)_maxC=Math.max(_maxC,n);});
  (historialCompras||[]).forEach(c=>{const n=Number(c.id);if(c.id===undefined||c.id===null||isNaN(n)||n<=0){c.id=++_maxC;}else{c.id=n;}});
  nextId.comp=Math.max(nextId.comp,_maxC+1);

  saveData();
  initApp();
}

// initializeData() definida en data-init.js

