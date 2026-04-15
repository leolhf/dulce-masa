// ══════════════ CONFIGURACIÓN DE LA APP ══════════════
// Extraído de prestamos.js — funciones de reseteo y configuración global

function borrarTodoConfirm() {
  confirmar({
    titulo: '⚠️ Borrar todo el contenido',
    mensaje: 'Esta acción eliminará PERMANENTEMENTE todos los datos:<br><br>' +
             '• Ventas y pedidos<br>' +
             '• Compras y stock de ingredientes<br>' +
             '• Recetas y productos<br>' +
             '• Producción<br>' +
             '• Préstamos y retiros<br>' +
             '• Todo el historial<br><br>' +
             '<strong style="color: var(--danger)">Esta acción no se puede deshacer.</strong>',
    labelOk: '🗑️ Borrar todo',
    tipo: 'danger',
    onOk: borrarTodo
  });
}

function borrarTodo() {
  try {
    ventas        = [];
    pedidos       = [];
    historialCompras = [];
    ingredientes  = [];
    recetas       = [];
    producciones  = [];
    prestamos     = [];
    extracciones  = [];
    proveedores   = [];
    
    // Borrar ajustes manuales de capital
    if (typeof CapitalAdjustment !== 'undefined') {
      CapitalAdjustment.ajustes = [];
      console.log('[Borrar Todo] Ajustes de capital eliminados');
    }
    
    // Borrar historial de deshacer
    if (typeof _historial !== 'undefined') {
      _historial = [];
    }
    localStorage.removeItem('dulcemasa_historial_deshacer');
    localStorage.removeItem('capital_ajustes');

    saveData();

    renderVentas();
    renderPedidos();
    renderHistorial();
    renderInventario();
    renderRecetas();
    renderProduccion();
    renderPrestamos();
    renderFinanzas();
    renderDashboard();

    toast('🗑️ Todo el contenido ha sido eliminado');

    const btnBorrarTodo = document.getElementById('btn-borrar-todo');
    if (btnBorrarTodo) btnBorrarTodo.style.display = 'none';

  } catch (error) {
    console.error('Error al borrar todo:', error);
    toast('❌ Error al eliminar el contenido');
  }
}
