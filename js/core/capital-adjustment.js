// ==================== SISTEMA DE AJUSTE MANUAL DE CAPITAL ====================
// Permite ajustar manualmente el capital total con validación y auditoría

class CapitalAdjustment {
  
  // Almacenamiento de ajustes
  static get ajustes() {
    return JSON.parse(localStorage.getItem('capital_ajustes') || '[]');
  }
  
  static set ajustes(data) {
    localStorage.setItem('capital_ajustes', JSON.stringify(data));
  }
  
  // Obtener capital ajustado actual
  static getCapitalAjustado() {
    const ajustes = this.ajustes;
    if (ajustes.length === 0) return null;
    
    const ultimoAjuste = ajustes[ajustes.length - 1];
    return ultimoAjuste.capitalFinal;
  }
  
  // Realizar ajuste de capital
  static ajustarCapital(capitalCalculado, capitalReal, motivo, usuario = 'sistema') {
    // Validaciones básicas
    if (!this._validarAjuste(capitalCalculado, capitalReal, motivo)) {
      return { exito: false, error: 'Validación fallida' };
    }
    
    // Crear registro de ajuste
    const ajuste = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      capitalCalculado,
      capitalReal,
      diferencia: capitalReal - capitalCalculado,
      motivo: motivo.trim(),
      usuario,
      estado: 'activo',
      timestamp: Date.now()
    };
    
    // Guardar ajuste
    const ajustes = this.ajustes;
    ajustes.push(ajuste);
    this.ajustes = ajustes;
    
    // Actualizar capital en tiempo real
    this._actualizarCapitalEnUI(capitalReal);
    
    // Registrar en log
    console.log('Capital ajustado:', ajuste);
    
    return { 
      exito: true, 
      ajuste,
      mensaje: `Capital ajustado: ${fmt(capitalCalculado)} -> ${fmt(capitalReal)}`
    };
  }
  
  // Validar ajuste
  static _validarAjuste(capitalCalculado, capitalReal, motivo) {
    // Validación de montos
    if (isNaN(capitalCalculado) || isNaN(capitalReal)) {
      toast('Los montos deben ser números válidos');
      return false;
    }
    
    if (capitalReal < -100000) { // Permitir hasta -100k
      toast('El capital real no puede ser menor a -$100,000');
      return false;
    }
    
    // Validación de diferencia
    const diferencia = Math.abs(capitalReal - capitalCalculado);
    if (diferencia > 50000) { // Alerta si la diferencia es muy grande
      if (!confirm(`La diferencia es muy grande: $${fmt(diferencia)}. ¿Está seguro de continuar?`)) {
        return false;
      }
    }
    
    // Validación de motivo
    if (!motivo || motivo.trim().length < 5) {
      toast('Debe proporcionar un motivo detallado (mínimo 5 caracteres)');
      return false;
    }
    
    return true;
  }
  
  // Actualizar capital en la UI
  static _actualizarCapitalEnUI(capitalReal) {
    // Actualizar KPIs principales
    updateElement('kpi-capital-total', fmt(capitalReal));
    
    // Actualizar resumen ejecutivo
    updateElement('resumen-capital', fmt(capitalReal));
    
    // Actualizar tarjeta de estadísticas
    const statsCard = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (statsCard) statsCard.textContent = fmt(capitalReal);
    
    // Agregar indicador de ajuste
    this._mostrarIndicadorAjuste();
  }
  
  // Mostrar indicador visual de ajuste
  static _mostrarIndicadorAjuste() {
    // Crear o actualizar indicador
    let indicador = document.getElementById('capital-ajuste-indicador');
    if (!indicador) {
      indicador = document.createElement('div');
      indicador.id = 'capital-ajuste-indicador';
      indicador.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #F59E0B;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(indador);
    }
    
    indicador.textContent = 'Capital ajustado manualmente';
    indicador.style.background = '#10B981';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
      if (indicador.parentNode) {
        indicador.parentNode.removeChild(indicador);
      }
    }, 5000);
  }
  
  // Obtener historial de ajustes
  static getHistorial(limit = 10) {
    return this.ajustes
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  // Revertir último ajuste
  static revertirUltimoAjuste() {
    const ajustes = this.ajustes;
    if (ajustes.length === 0) {
      toast('No hay ajustes para revertir');
      return { exito: false };
    }
    
    const ultimoAjuste = ajustes[ajustes.length - 1];
    
    // Marcar como revertido
    ultimoAjuste.estado = 'revertido';
    ultimoAjuste.fechaReversion = new Date().toISOString();
    
    this.ajustes = ajustes;
    
    // Recalcular capital sin ajuste
    this._recalcularCapitalAutomatico();
    
    toast('Último ajuste revertido');
    return { exito: true, ajusteRevertido: ultimoAjuste };
  }
  
  // Recalcular capital automáticamente (sin ajustes)
  static _recalcularCapitalAutomatico() {
    // Forzar recálculo del dashboard
    if (typeof renderFinanzas === 'function') {
      renderFinanzas();
    }
    
    if (typeof FinanzasDashboard !== 'undefined' && typeof FinanzasDashboard.renderDashboardIntegrado === 'function') {
      FinanzasDashboard.renderDashboardIntegrado();
    }
  }
  
  // Obtener estadísticas de ajustes
  static getEstadisticas() {
    const ajustes = this.ajustes;
    if (ajustes.length === 0) {
      return {
        totalAjustes: 0,
        promedioDiferencia: 0,
        ultimoAjuste: null,
        tendencia: 'sin_datos'
      };
    }
    
    const ajustesActivos = ajustes.filter(a => a.estado === 'activo');
    const diferencias = ajustesActivos.map(a => Math.abs(a.diferencia));
    const promedioDiferencia = diferencias.reduce((a, b) => a + b, 0) / diferencias.length;
    
    // Calcular tendencia
    const ultimos3 = ajustesActivos.slice(-3);
    let tendencia = 'estable';
    if (ultimos3.length >= 2) {
      const ultimo = ultimos3[ultimos3.length - 1].diferencia;
      const penultimo = ultimos3[ultimos3.length - 2].diferencia;
      if (Math.abs(ultimo) > Math.abs(penultimo) * 1.5) {
        tendencia = 'aumentando';
      } else if (Math.abs(ultimo) < Math.abs(penultimo) * 0.5) {
        tendencia = 'disminuyendo';
      }
    }
    
    return {
      totalAjustes: ajustes.length,
      ajustesActivos: ajustesActivos.length,
      promedioDiferencia: Math.round(promedioDiferencia),
      ultimoAjuste: ajustes[ajustes.length - 1],
      tendencia,
      totalDiferencia: diferencias.reduce((a, b) => a + b, 0)
    };
  }
  
  // Exportar ajustes a CSV
  static exportarCSV() {
    const ajustes = this.ajustes;
    if (ajustes.length === 0) {
      toast('No hay ajustes para exportar');
      return;
    }
    
    let csv = 'ID,Fecha,Capital Calculado,Capital Real,Diferencia,Motivo,Usuario,Estado\n';
    
    ajustes.forEach(ajuste => {
      csv += `${ajuste.id},"${new Date(ajuste.fecha).toLocaleString()}","${ajuste.capitalCalculado}","${ajuste.capitalReal}","${ajuste.diferencia}","${ajuste.motivo}","${ajuste.usuario}","${ajuste.estado}"\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ajustes_capital_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast('Ajustes exportados correctamente');
  }
  
  // Limpiar ajustes antiguos
  static limpiarAjustesAntiguos(dias = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dias);
    
    const ajustes = this.ajustes;
    const ajustesFiltrados = ajustes.filter(a => 
      new Date(a.fecha) >= cutoff || a.estado === 'activo'
    );
    
    const eliminados = ajustes.length - ajustesFiltrados.length;
    this.ajustes = ajustesFiltrados;
    
    if (eliminados > 0) {
      toast(`${eliminados} ajustes antiguos eliminados`);
    } else {
      toast('No hay ajustes antiguos para eliminar');
    }
    
    return { eliminados, restantes: ajustesFiltrados.length };
  }
}

// Funciones globales para uso en HTML
window.ajustarCapital = (capitalCalculado, capitalReal, motivo) => {
  return CapitalAdjustment.ajustarCapital(capitalCalculado, capitalReal, motivo);
};

window.revertirUltimoAjuste = () => {
  return CapitalAdjustment.revertirUltimoAjuste();
};

window.exportarAjustesCSV = () => {
  CapitalAdjustment.exportarCSV();
};

// Agregar estilos para animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
