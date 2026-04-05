# 🍰 Dulce & Masa - App Instalable (PWA)

## 📱 Instalación como Aplicación

Esta aplicación es una **PWA (Progressive Web App)** que puede instalarse en tu dispositivo:

### 🔧 Instalación en Chrome/Edge:
1. Abre la aplicación en el navegador
2. Haz clic en el botón **"⬇ Instalar app"** que aparece en la barra superior
3. Confirma la instalación en el diálogo
4. La app aparecerá en tu escritorio/menú de aplicaciones

### 📱 Instalación en Móvil:
1. Abre la aplicación en Chrome/Safari
2. Busca la opción **"Añadir a pantalla de inicio"** en el menú del navegador
3. Confirma y la app aparecerá en tu pantalla de inicio

## 🚀 Características PWA

- ✅ **Funciona offline** - Cache inteligente de archivos
- ✅ **Instalable** - Como una app nativa
- ✅ **Rápida** - Precarga de recursos críticos
- ✅ **Notificaciones** - Soporte para alertas futuras
- ✅ **Actualizaciones automáticas** - Detección de nuevas versiones

## 📦 Estructura de Archivos PWA

```
dulce-masa-app/
├── index.html           # Página principal
├── manifest.json        # Configuración PWA
├── sw.js               # Service Worker (offline)
├── styles.css          # Estilos
├── js/
│   ├── pwa.js          # Funciones PWA
│   ├── ...             # Módulos de la app
├── icon-192.png        # Ícono principal
├── icon-512.png        # Ícono grande
└── ...                 # Otros recursos
```

## 🔄 Sincronización y Actualizaciones

La app detecta automáticamente:
- **Nuevas versiones** y te avisa para recargar
- **Conexión offline** y muestra contenido cacheado
- **Datos guardados** en localStorage

## 🌐 Para GitHub Pages

Para publicar en GitHub Pages:

1. **Sube todos los archivos** a tu repositorio
2. **Activa GitHub Pages** en Settings → Pages
3. **Selecciona la rama main** y carpeta `/root`
4. **Accede** a `https://usuario.github.io/dulce-masa-app`

## 📱 Screenshots (Opcional)

Agrega estas imágenes para mejor visibilidad en stores:
- `screenshot-desktop.png` (1280x720)
- `screenshot-mobile.png` (390x844)

## 🔧 Desarrollo PWA

### Service Worker Features:
- **Cache estático** para archivos principales
- **Cache dinámico** para datos generados
- **Offline fallback** para errores de red
- **Background sync** para futuras sincronizaciones

### Manifest Features:
- **Atajos** a acciones comunes
- **Categorías** para descubrimiento
- **Tema y colores** consistentes
- **Íconos** múltiples tamaños

## 🎯 Optimizaciones

- **Precarga crítica** de CSS y JS
- **Lazy loading** de imágenes
- **Minificación** recomendada para producción
- **Headers** de cache configurados

## 📋 Checklist PWA

- [x] Manifest.json configurado
- [x] Service Worker implementado
- [x] Íconos en múltiples tamaños
- [x] HTTPS requerido para producción
- [x] Responsive design
- [x] Funcionalidad offline básica

## 🚀 Para producción

1. **Minifica** CSS y JS
2. **Optimiza** imágenes
3. **Configura** HTTPS (GitHub Pages lo incluye)
4. **Testea** en diferentes dispositivos
5. **Valida** con Lighthouse PWA

---

**¡Tu app de gestión de repostería lista para instalar!** 🍰✨
