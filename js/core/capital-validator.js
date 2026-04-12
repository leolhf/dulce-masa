// ==================== VALIDACIONES DE COHERENCIA DE CAPITAL ====================
// Sistema de validación automática para detectar inconsistencias en el capital

class CapitalValidator {
  
  // Validación completa del capital
  static validarCapitalCompleto(metricas, periodo = 'mes_actual') {
    const validaciones = {
      coherenciaGeneral: this._validarCoherenciaGeneral(metricas),
      coherenciaPrestamos: this._validarCoherenciaPrestamos(metricas),
      coherenciaFlujo: this._validarCoherenciaFlujo(metricas),
      coherenciaEfectivo: this._validarCoherenciaEfectivo(metricas),
      rangosLogicos: this._validarRangosLogicos(metricas),
      tendencias: this._validarTendencias(metricas, periodo),
      alertas: []
    };
    
    // Generar alertas basadas en validaciones
    validaciones.alertas = this._generarAlertas(validaciones, metricas);
    
    return validaciones;
  }
  
  // Validar coherencia general de los cálculos
  static _validarCoherenciaGeneral(metricas) {
    const { capitalTotal, efectivoOperativo, prestamosSinDevolucion, prestamosConDevolucion } = metricas;
    
    const errores = [];
    const advertencias = [];
    
    // Verificar que capital total = efectivo operativo + préstamos sin devolución + préstamos con devolución
    const capitalCalculado = efectivoOperativo + prestamosSinDevolucion + prestamosConDevolucion;
    const diferencia = Math.abs(capitalTotal - capitalCalculado);
    
    if (diferencia > 0.01) { // Permitir pequeñas diferencias por redondeo
      errores.push({
        tipo: 'inconsistencia_calculo',
        descripcion: `El capital total no coincide con la suma de componentes`,
        esperado: capitalCalculado,
        actual: capitalTotal,
        diferencia: diferencia
      });
    }
    
    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
  
  // Validar coherencia de préstamos
  static _validarCoherenciaPrestamos(metricas) {
    const { prestamosConDevolucion, prestamosSinDevolucion, deudaPrestamos, capitalPrestamos } = metricas;
    
    const errores = [];
    const advertencias = [];
    
    // Verificar que deuda no sea mayor que préstamos con devolución
    if (deudaPrestamos > prestamosConDevolucion) {
      errores.push({
        tipo: 'deuda_excesiva',
        descripcion: 'La deuda es mayor que el monto de préstamos con devolución',
        deuda: deudaPrestamos,
        prestamos: prestamosConDevolucion
      });
    }
    
    // Verificar que capital de préstamos sea consistente
    const capitalPrestamosCalculado = prestamosConDevolucion + prestamosSinDevolucion;
    if (Math.abs(capitalPrestamos - capitalPrestamosCalculado) > 0.01) {
      advertencias.push({
        tipo: 'inconsistencia_prestamos',
        descripcion: 'Inconsistencia en el cálculo de capital de préstamos',
        registrado: capitalPrestamos,
        calculado: capitalPrestamosCalculado
      });
    }
    
    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
  
  // Validar coherencia del flujo de caja
  static _validarCoherenciaFlujo(metricas) {
    const { flujoBruto, ingresosTotal, gastosTotales } = metricas;
    
    const errores = [];
    const advertencias = [];
    
    // Verificar que flujo = ingresos - gastos
    const flujoCalculado = ingresosTotal - gastosTotales;
    const diferencia = Math.abs(flujoBruto - flujoCalculado);
    
    if (diferencia > 0.01) {
      errores.push({
        tipo: 'inconsistencia_flujo',
        descripcion: 'El flujo bruto no coincide con ingresos - gastos',
        esperado: flujoCalculado,
        actual: flujoBruto,
        diferencia: diferencia
      });
    }
    
    // Advertencia si el flujo es muy negativo
    if (flujoBruto < -ingresosTotal * 0.5) {
      advertencias.push({
        tipo: 'flujo_muy_negativo',
        descripcion: 'El flujo es muy negativo en relación a los ingresos',
        flujo: flujoBruto,
        ingresos: ingresosTotal,
        porcentaje: (flujoBruto / ingresosTotal * 100).toFixed(1)
      });
    }
    
    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
  
  // Validar coherencia del efectivo operativo
  static _validarCoherenciaEfectivo(metricas) {
    const { efectivoOperativo, ingresosTotal, gastosTotales, totalExtraido } = metricas;
    
    const errores = [];
    const advertencias = [];
    
    // Verificar que efectivo operativo = ingresos - gastos - extracciones
    const efectivoCalculado = ingresosTotal - gastosTotales - totalExtraido;
    const diferencia = Math.abs(efectivoOperativo - efectivoCalculado);
    
    if (diferencia > 0.01) {
      errores.push({
        tipo: 'inconsistencia_efectivo',
        descripcion: 'El efectivo operativo no coincide con la fórmula',
        esperado: efectivoCalculado,
        actual: efectivoOperativo,
        diferencia: diferencia
      });
    }
    
    // Advertencia si el efectivo operativo es negativo pero hay ingresos
    if (efectivoOperativo < 0 && ingresosTotal > 0) {
      advertencias.push({
        tipo: 'efectivo_negativo_con_ingresos',
        descripcion: 'Efectivo operativo negativo a pesar de tener ingresos',
        efectivo: efectivoOperativo,
        ingresos: ingresosTotal
      });
    }
    
    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
  
  // Validar rangos lógicos
  static _validarRangosLogicos(metricas) {
    const { capitalTotal, efectivoOperativo, ingresosTotal, gastosTotales, flujoBruto } = metricas;
    
    const errores = [];
    const advertencias = [];
    
    // Validar que los ingresos no sean negativos
    if (ingresosTotal < 0) {
      errores.push({
        tipo: 'ingresos_negativos',
        descripcion: 'Los ingresos no pueden ser negativos',
        valor: ingresosTotal
      });
    }
    
    // Validar que los gastos no sean negativos
    if (gastosTotales < 0) {
      errores.push({
        tipo: 'gastos_negativos',
        descripcion: 'Los gastos no pueden ser negativos',
        valor: gastosTotales
      });
    }
    
    // Advertencia si el capital es extremadamente alto o bajo
    if (capitalTotal > 1000000) {
      advertencias.push({
        tipo: 'capital_extremadamente_alto',
        descripcion: 'El capital total es extremadamente alto',
        valor: capitalTotal
      });
    }
    
    if (capitalTotal < -100000) {
      advertencias.push({
        tipo: 'capital_extremadamente_bajo',
        descripcion: 'El capital total es extremadamente bajo',
        valor: capitalTotal
      });
    }
    
    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
  
  // Validar tendencias (si hay datos históricos)
  static _validarTendencias(metricas, periodo) {
    const advertencias = [];
    
    // Aquí se podrían validar tendencias comparando con períodos anteriores
    // Por ahora, validaciones básicas
    
    // Advertencia si hay cambios drásticos
    if (metricas.flujoBruto < -metricas.ingresosTotal) {
      advertencias.push({
        tipo: 'cambio_drastico_flujo',
        descripcion: 'El flujo es menor que el 100% de los ingresos',
        flujo: metricas.flujoBruto,
        ingresos: metricas.ingresosTotal
      });
    }
    
    return {
      valido: true,
      errores: [],
      advertencias
    };
  }
  
  // Generar alertas basadas en validaciones
  static _generarAlertas(validaciones, metricas) {
    const alertas = [];
    
    // Alertas críticas (errores)
    Object.values(validaciones).forEach(validacion => {
      if (validacion.errores && validacion.errores.length > 0) {
        validacion.errores.forEach(error => {
          alertas.push({
            tipo: 'critica',
            titulo: 'Error de Cálculo',
            mensaje: error.descripcion,
            detalles: error,
            accion: 'revisar_calculos'
          });
        });
      }
    });
    
    // Alertas de advertencia
    Object.values(validaciones).forEach(validacion => {
      if (validacion.advertencias && validacion.advertencias.length > 0) {
        validacion.advertencias.forEach(advertencia => {
          alertas.push({
            tipo: 'advertencia',
            titulo: 'Advertencia Financiera',
            mensaje: advertencia.descripcion,
            detalles: advertencia,
            accion: 'monitorear'
          });
        });
      }
    });
    
    // Alertas de salud financiera
    if (metricas.capitalTotal < 0) {
      alertas.push({
        tipo: 'critica',
        titulo: 'Capital Negativo',
        mensaje: 'El capital total es negativo. Requiere acción inmediata.',
        detalles: { capital: metricas.capitalTotal },
        accion: 'ajustar_capital'
      });
    }
    
    if (metricas.efectivoOperativo < 1000 && metricas.ingresosTotal > 0) {
      alertas.push({
        tipo: 'advertencia',
        titulo: 'Efectivo Bajo',
        mensaje: 'El efectivo operativo es bajo. Considere reducir gastos.',
        detalles: { efectivo: metricas.efectivoOperativo },
        accion: 'optimizar_gastos'
      });
    }
    
    return alertas;
  }
  
  // Mostrar alertas en la UI
  static mostrarAlertas(validaciones) {
    const contenedor = document.getElementById('capital-validation-alerts');
    if (!contenedor) return;
    
    const alertas = validaciones.alertas;
    
    if (alertas.length === 0) {
      contenedor.innerHTML = '<div class="alert alert-success">Todas las validaciones son correctas</div>';
      return;
    }
    
    let html = '';
    alertas.forEach(alerta => {
      const claseAlerta = alerta.tipo === 'critica' ? 'alert-danger' : 'alert-warning';
      const icono = alerta.tipo === 'critica' ? 'exclamation-triangle' : 'info-circle';
      
      html += `
        <div class="alert ${claseAlerta} alert-dismissible fade show" role="alert">
          <div class="d-flex align-items-center">
            <i class="fas fa-${icono} me-2"></i>
            <div class="flex-grow-1">
              <strong>${alerta.titulo}</strong>
              <div class="small">${alerta.mensaje}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
        </div>
      `;
    });
    
    contenedor.innerHTML = html;
  }
  
  // Ejecutar validación automática
  static validarAutomaticamente() {
    // Obtener métricas actuales
    const metricas = window._finMetricas ? window._finMetricas('mes_actual') : null;
    
    if (!metricas) {
      console.warn('No se pudieron obtener las métricas para validación');
      return;
    }
    
    // Ejecutar validación
    const validaciones = this.validarCapitalCompleto(metricas);
    
    // Mostrar alertas
    this.mostrarAlertas(validaciones);
    
    // Registrar en consola para debugging
    console.log('Validación de capital:', validaciones);
    
    return validaciones;
  }
  
  // Programar validación periódica
  static programarValidacionPeriodica(intervaloMinutos = 5) {
    setInterval(() => {
      this.validarAutomaticamente();
    }, intervaloMinutos * 60 * 1000);
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.CapitalValidator = CapitalValidator;
  window.validarCapitalAutomaticamente = () => CapitalValidator.validarAutomaticamente();
}
