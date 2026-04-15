// ==================== INTERFAZ DE USUARIO PARA AJUSTE DE CAPITAL ====================
// Funciones para manejar la interfaz de ajuste manual de capital

// Variables globales para la UI
let capitalCalculadoActual = 0;

// El formulario de ajuste siempre permanece visible en el tab de Ajuste Capital
function toggleCapitalAdjustment() {
  // Cargar datos y actualizar historial cada vez que se hace clic
  cargarDatosCapital();
  actualizarHistorialAjustes();
  
  // Mostrar notificación de actualización
  const indicador = document.getElementById('capital-ajuste-indicador');
  if (indicador && indicador.parentNode) {
    indicador.textContent = 'Datos actualizados';
    indicador.style.background = '#10B981';
    
    setTimeout(() => {
      if (indicador.parentNode) {
        indicador.parentNode.removeChild(indicador);
      }
    }, 2000);
  }
}

// Cargar datos actuales del capital
function cargarDatosCapital() {
  // Usar capital histórico calculado por renderFinanzas() (todo el historial, sin filtro de período)
  // window._capitalHistoricoActual lo expone finanzas-kpi.js después de renderFinanzas()
  capitalCalculadoActual = 0;
  if (typeof window._capitalHistoricoActual === 'number' && !isNaN(window._capitalHistoricoActual)) {
    capitalCalculadoActual = window._capitalHistoricoActual;
  } else if (typeof _finMetricas === 'function') {
    // Fallback: calcular directamente solo si los datos globales están disponibles
    try {
      const mTodo = _finMetricas('todo');
      capitalCalculadoActual = mTodo ? mTodo.capitalTotal : 0;
    } catch (e) {
      console.warn('[Capital UI] Error al calcular métricas:', e);
      capitalCalculadoActual = 0;
    }
  } else {
    // Último recurso: leer del elemento capital total histórico
    const el = document.getElementById('resumen-capital-total');
    if (el) {
      capitalCalculadoActual = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
    }
  }
  
  // Actualizar campo de capital calculado
  const campoCalculado = document.getElementById('capital-calculado');
  if (campoCalculado) {
    campoCalculado.value = capitalCalculadoActual.toFixed(2);
  }
  
  // Limpiar otros campos
  const campoReal = document.getElementById('capital-real');
  const campoMotivo = document.getElementById('capital-motivo');
  if (campoReal) campoReal.value = '';
  if (campoMotivo) campoMotivo.value = '';
  
  // Actualizar diferencia
  actualizarDiferencia();
}

// Actualizar diferencia en tiempo real
function actualizarDiferencia() {
  const campoCalculado = document.getElementById('capital-calculado');
  const campoReal = document.getElementById('capital-real');
  const campoDiferencia = document.getElementById('capital-diferencia');
  
  if (!campoCalculado || !campoReal || !campoDiferencia) return;
  
  const calculado = parseFloat(campoCalculado.value) || 0;
  const real = parseFloat(campoReal.value) || 0;
  const diferencia = real - calculado;
  
  campoDiferencia.value = fmt(diferencia);
  
  // Cambiar color según diferencia
  if (Math.abs(diferencia) < 100) {
    campoDiferencia.style.background = 'var(--ok-bg)';
  } else if (Math.abs(diferencia) < 1000) {
    campoDiferencia.style.background = 'var(--warn-bg)';
  } else {
    campoDiferencia.style.background = 'var(--danger-bg)';
  }
}

// Procesar ajuste de capital
function procesarAjusteCapital() {
  const campoReal = document.getElementById('capital-real');
  const campoMotivo = document.getElementById('capital-motivo');
  const campoUsuario = document.getElementById('capital-usuario');
  
  const capitalReal = parseFloat(campoReal.value);
  const motivo = campoMotivo.value.trim();
  const usuario = campoUsuario.value.trim();
  
  // Validaciones
  if (!capitalReal && capitalReal !== 0) {
    toast('Ingrese el capital real');
    campoReal.focus();
    return;
  }
  
  if (!motivo || motivo.length < 5) {
    toast('El motivo debe tener al menos 5 caracteres');
    campoMotivo.focus();
    return;
  }
  
  // Confirmar si la diferencia es grande
  const diferencia = Math.abs(capitalReal - capitalCalculadoActual);
  if (diferencia > 5000) {
    if (!confirm(`La diferencia es muy grande: $${fmt(diferencia)}. ¿Está seguro de continuar?`)) {
      return;
    }
  }
  
  // Realizar ajuste
  const resultado = CapitalAdjustment.ajustarCapital(
    capitalCalculadoActual,
    capitalReal,
    motivo,
    usuario
  );
  
  if (resultado.exito) {
    toast(resultado.mensaje);
    
    // Limpiar formulario
    campoReal.value = '';
    campoMotivo.value = '';
    
    // Actualizar historial
    actualizarHistorialAjustes();
    
    // Recargar datos
    setTimeout(() => {
      cargarDatosCapital();
    }, 1000);
  } else {
    toast('Error al realizar ajuste: ' + resultado.error);
  }
}

// Actualizar historial de ajustes
function actualizarHistorialAjustes() {
  const historial = CapitalAdjustment.getHistorial(10);
  const contenedor = document.getElementById('ajustes-list');
  
  if (!contenedor) return;
  
  if (historial.length === 0) {
    contenedor.innerHTML = '<p class="empty">No hay ajustes registrados</p>';
    return;
  }
  
  let html = '<div class="table-responsive"><table class="table table-sm">';
  html += '<thead><tr><th>Fecha</th><th>Calculado</th><th>Real</th><th>Diferencia</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>';
  
  historial.forEach(ajuste => {
    const fecha = new Date(ajuste.fecha).toLocaleDateString();
    const estadoClase = ajuste.estado === 'activo' ? '' : 'text-muted';
    const diferenciaClase = ajuste.diferencia >= 0 ? 'text-success' : 'text-danger';
    
    html += `<tr class="${estadoClase}">`;
    html += `<td>${fecha}</td>`;
    html += `<td>$${fmt(ajuste.capitalCalculado)}</td>`;
    html += `<td>$${fmt(ajuste.capitalReal)}</td>`;
    html += `<td class="${diferenciaClase}">$${fmt(ajuste.diferencia)}</td>`;
    html += `<td title="${ajuste.motivo}">${ajuste.motivo.substring(0, 30)}${ajuste.motivo.length > 30 ? '...' : ''}</td>`;
    html += `<td>${ajuste.usuario}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

// Agregar listeners para actualización en tiempo real
document.addEventListener('DOMContentLoaded', function() {
  // Listener para el campo de capital real
  const campoReal = document.getElementById('capital-real');
  if (campoReal) {
    campoReal.addEventListener('input', actualizarDiferencia);
  }
  
  // Actualizar automáticamente cuando cambie el período
  const periodoSelector = document.getElementById('fin-periodo-analisis');
  if (periodoSelector) {
    periodoSelector.addEventListener('change', function() {
      setTimeout(() => {
        if (document.getElementById('capital-adjustment-form').style.display !== 'none') {
          cargarDatosCapital();
        }
      }, 500);
    });
  }
});

// Función para mostrar estadísticas de ajustes
function mostrarEstadisticasAjustes() {
  const stats = CapitalAdjustment.getEstadisticas();
  
  let mensaje = `Estadísticas de Ajustes:\n\n`;
  mensaje += `Total de ajustes: ${stats.totalAjustes}\n`;
  mensaje += `Ajustes activos: ${stats.ajustesActivos}\n`;
  mensaje += `Diferencia promedio: $${fmt(stats.promedioDiferencia)}\n`;
  mensaje += `Tendencia: ${stats.tendencia}\n`;
  
  if (stats.ultimoAjuste) {
    const fecha = new Date(stats.ultimoAjuste.fecha).toLocaleDateString();
    mensaje += `\nÚltimo ajuste: ${fecha} - $${fmt(stats.ultimoAjuste.diferencia)}`;
  }
  
  alert(mensaje);
}

// Función para limpiar el formulario
function limpiarFormularioCapital() {
  const campoReal = document.getElementById('capital-real');
  const campoMotivo = document.getElementById('capital-motivo');
  
  if (campoReal) campoReal.value = '';
  if (campoMotivo) campoMotivo.value = '';
  
  // Actualizar diferencia
  actualizarDiferencia();
  
  toast('Formulario limpiado');
}

// Función para revertir último ajuste
function revertirUltimoAjuste() {
  const resultado = CapitalAdjustment.revertirUltimoAjuste();
  if (resultado.exito) {
    toast('Último ajuste revertido');
    actualizarHistorialAjustes();
    setTimeout(() => {
      cargarDatosCapital();
    }, 1000);
  } else {
    toast('Error al revertir: ' + resultado.error);
  }
}

// Función para exportar ajustes a CSV
function exportarAjustesCSV() {
  const historial = CapitalAdjustment.getHistorial();
  if (historial.length === 0) {
    toast('No hay ajustes para exportar');
    return;
  }
  
  let csv = 'Fecha,Capital Calculado,Capital Real,Diferencia,Motivo,Usuario,Estado\n';
  historial.forEach(ajuste => {
    csv += `${ajuste.fecha},${ajuste.capitalCalculado},${ajuste.capitalReal},${ajuste.diferencia},"${ajuste.motivo}",${ajuste.usuario},${ajuste.estado}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ajustes-capital-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  toast('Ajustes exportados a CSV');
}

// Función para limpiar ajustes antiguos
function limpiarAjustesAntiguos() {
  if (!confirm('¿Eliminar ajustes anteriores a 90 días?')) return;
  
  const resultado = CapitalAdjustment.limpiarAjustesAntiguos(90);
  toast(`${resultado.eliminados} ajustes eliminados, ${resultado.restantes} restantes`);
  actualizarHistorialAjustes();
}

// Exportar funciones globales
window.toggleCapitalAdjustment = toggleCapitalAdjustment;
window.procesarAjusteCapital = procesarAjusteCapital;
window.actualizarDiferencia = actualizarDiferencia;
window.revertirUltimoAjuste = revertirUltimoAjuste;
window.exportarAjustesCSV = exportarAjustesCSV;
window.mostrarEstadisticasAjustes = mostrarEstadisticasAjustes;
window.limpiarAjustesAntiguos = limpiarAjustesAntiguos;
window.limpiarFormularioCapital = limpiarFormularioCapital;
