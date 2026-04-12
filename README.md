# 🍰 Dulce & Masa - Sistema de Gestión de Repostería

Aplicación web completa para la gestión de negocios de repostería, pastelería y panadería.

## ✨ Características Principales

### 📊 Gestión Completa
- **Panel Principal** con métricas en tiempo real
- **Inventario** de ingredientes con control de stock mínimo
- **Recetas** con cálculo de costos y rendimientos
- **Producción** diaria con control de insumos
- **Ventas** y pedidos con seguimiento
- **Compras** de insumos con historial
- **Proveedores** con estadísticas de compras
- **Finanzas** con extracciones y préstamos

### 🎯 Características Avanzadas
- **Dashboard interactivo** con gráficos Chart.js
- **Alertas automáticas** de stock bajo y pedidos pendientes
- **Exportación** de datos a CSV/Excel
- **Sincronización** con Google Drive
- **Cálculo automático** de costos y precios
- **Zona horaria** configurada (Argentina)
- **Modo offline** con Service Worker

### 📱 PWA - Aplicación Instalable
- **Instalable** en escritorio y móviles
- **Funciona sin internet** (modo offline)
- **Notificaciones** push (futuro)
- **Actualizaciones** automáticas
- **Acceso directo** desde pantalla de inicio

## 🚀 Instalación

### Como PWA (Recomendado)
1. Abre la app en Chrome/Edge
2. Click en **"⬇ Instalar app"**
3. Listo! 🎉

### En GitHub Pages
1. Fork este repositorio
2. Activa GitHub Pages en Settings
3. Accede a `https://usuario.github.io/dulce-masa-app`

### Local
```bash
# Clonar repositorio
git clone https://github.com/leolhf/dulce-masa-app.git
cd dulce-masa-app

# Iniciar servidor local (opcional)
python -m http.server 8000
# o
npx serve .
```

## 📁 Estructura del Proyecto

```
dulce-masa-app/
├── index.html              # Página principal
├── styles.css              # Estilos completos
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker
├── js/
│   ├── helpers.js          # Funciones globales
│   ├── init.js             # Inicialización
│   ├── dashboard.js        # Panel principal
│   ├── inventario.js       # Gestión de stock
│   ├── recetas.js          # Recetas y costos
│   ├── produccion.js       # Control de producción
│   ├── ventas.js           # Registro de ventas
│   ├── pedidos.js          # Gestión de pedidos
│   ├── historial.js        # Historial de compras
│   ├── proveedores.js      # Directorio de proveedores
│   ├── finanzas.js         # Control financiero
│   ├── prestamos.js        # Préstamos personales
│   ├── estadisticas.js     # Análisis y reportes
│   ├── costos.js           # Cálculo de costos
│   ├── gastos-fijos.js     # Gastos operativos
│   ├── exportar.js         # Exportación de datos
│   ├── google-drive.js     # Sincronización cloud
│   ├── autocomplete.js      # Autocompletado
│   ├── pwa.js              # Funciones PWA
│   └── nav-indicators.js   # Indicadores de navegación
├── README-PWA.md           # Guía PWA
└── README.md               # Este archivo
```

## 🎨 Tecnologías Utilizadas

- **HTML5** semántico y accesible
- **CSS3** con variables y grid/flexbox
- **JavaScript ES6+** vanilla
- **Chart.js** para gráficos
- **Service Worker** para offline
- **Google Drive API** para respaldo
- **PWA** para instalación nativa

## 📊 Módulos Detallados

### 🏪 Proveedores
- **Directorio completo** con contactos
- **Estadísticas** de compras por proveedor
- **Badge de proveedor principal** automáticamente
- **Exportación** de historial de compras
- **Filtros inteligentes** por actividad

### 💰 Finanzas
- **Dashboard financiero** con KPIs
- **Control de extracciones** y retiros
- **Gestión de préstamos** personales
- **Análisis por período** (mes, 3 meses, año)
- **Sugerencias** de retiros saludables

### 📦 Inventario
- **Control de stock** en tiempo real
- **Alertas automáticas** de stock bajo
- **Ajustes manuales** con motivos
- **Cálculo de costos** unitarios
- **Historial** de movimientos

### 🧾 Compras y Ventas
- **Registro rápido** con autocompletado
- **Historial completo** con filtros
- **Cálculo automático** de totales
- **Vinculación** con inventario
- **Exportación** de reportes

## 🔧 Configuración

### Zona Horaria
Configurada para **Argentina (GMT-3)**:
```javascript
const TIMEZONE_CONFIG = {
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR'
};
```

### Moneda
Pesos Argentinos ($) con formato local.

### Respaldo de Datos
- **LocalStorage** principal
- **Google Drive** opcional
- **Exportación** CSV manual

## 🌟 Mejoras Recientes

### v1.0.0 - Última Actualización
- ✨ **Interfaz de Proveedores** completamente rediseñada
- 🎯 **Tarjetas de resumen** con estadísticas clave
- 🔍 **Búsqueda y filtros** avanzados
- 📱 **Modo PWA** con instalación nativa
- 📊 **Exportación CSV** para todos los módulos
- 🎨 **UI moderna** con gradientes y animaciones
- 🔄 **Zona horaria** unificada Argentina
- 📈 **Dashboard financiero** mejorado

## 🚀 Despliegue

### GitHub Pages (Gratis)
1. Push a rama `main`
2. Settings → Pages → Source: Deploy from branch
3. Select `main` y `/root`
4. Listo en `https://usuario.github.io/dulce-masa-app`

### Netlify/Vercel
1. Importar desde GitHub
2. Configurar build command: `echo "No build needed"`
3. Deploy automático

### Hosting Propio
Subir archivos a servidor web con HTTPS requerido para PWA.

## 🤝 Contribuir

1. **Fork** el repositorio
2. Crear rama `feature/nueva-funcion`
3. **Commit** cambios descriptivos
4. **Push** a la rama
5. **Pull Request** con descripción

## 📄 Licencia

MIT License - Libre uso y modificación.

## 🎯 Roadmap Futuro

- 📱 **App móvil nativa** (React Native)
- 🔄 **Sincronización real-time** (WebSocket)
- 📊 **Reportes avanzados** (PDF)
- 🏪 **Múltiples sucursales**
- 💳 **Integración pagos** (Mercado Pago)
- 📈 **Pronósticos** de ventas
- 🤖 **Asistente IA** para gestión

---

**Desarrollado con ❤️ para reposterías argentinas**  
🍰 *Dulce & Masa - Tu negocio, organizado*
