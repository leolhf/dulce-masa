// ══════════════ PWA — Service Worker + Instalación ══════════════
let _pwaPrompt=null;
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller){
            if(confirm('Hay una actualización disponible. ¿Recargar?')){nw.postMessage('skipWaiting');location.reload();}
          }
        });
      });
    }).catch(e=>console.warn('SW error:',e));
  });
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();_pwaPrompt=e;
  const b=document.getElementById('btn-pwa-install');if(b)b.style.display='inline-flex';
});
window.addEventListener('appinstalled',()=>{
  _pwaPrompt=null;
  const b=document.getElementById('btn-pwa-install');if(b)b.style.display='none';
  toast('✅ App instalada correctamente');
});
async function pwaInstall(){
  if(!_pwaPrompt){toast('Usa el menú del navegador → "Instalar aplicación"',3500);return;}
  _pwaPrompt.prompt();
  const{outcome}=await _pwaPrompt.userChoice;
  if(outcome==='accepted')toast('✅ Instalando app…');
  _pwaPrompt=null;const b=document.getElementById('btn-pwa-install');if(b)b.style.display='none';
}

// ── Registro de funciones de render para el paginador ──
_pagRenderFns.ventas  = typeof renderVentasTable === 'function' ? renderVentasTable : null;
_pagRenderFns.hist    = typeof renderHistorial === 'function' ? renderHistorial : null;
_pagRenderFns.pedidos = typeof renderPedidosTable === 'function' ? renderPedidosTable : null;

