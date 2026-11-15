// PWA: service worker, atualização e instalação
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── PWA — Registro do Service Worker + Detecção de nova versão ──
let swRegistration = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        swRegistration = reg;

        // Se já há versão nova esperando → aplica imediatamente ao abrir
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Quando uma nova versão terminar de instalar → aplica na hora
        reg.addEventListener('updatefound', () => {
          const novaSW = reg.installing;
          if (!novaSW) return;
          novaSW.addEventListener('statechange', () => {
            if (novaSW.state === 'installed' && navigator.serviceWorker.controller) {
              novaSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Verificar atualização silenciosa logo ao abrir o app
        verificarAtualizacaoSilenciosa(reg);
      })
      .catch(() => {});

    // Quando o SW troca (nova versão ativada) → recarrega a página
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Confirmação do SW que o cache foi limpo e renovado
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'CACHE_REFRESHED') {
        console.log('[PWA] Cache do app renovado com sucesso');
      }
    });
  });
}

// Verifica atualização sem mostrar nada para o usuário
async function verificarAtualizacaoSilenciosa(reg) {
  if (!isOnline) return;
  try {
    await reg.update();
  } catch(e) { /* sem conexão, ignora */ }
}

// Envia mensagem ao SW para limpar e regenerar cache do app
function limparCacheApp() {
  if (!swRegistration || !swRegistration.active) return;
  swRegistration.active.postMessage({ type: 'CLEAR_AND_REFRESH_CACHE' });
}

// Ouve confirmação do SW que o cache foi renovado
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'CACHE_REFRESHED') {
      console.log('[SW] Cache do app renovado com sucesso.');
    }
  });
}

// Quando o usuário voltar ao app (ex: alt+tab, retorna do celular)
// verifica se há nova versão disponível
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && swRegistration && isOnline) {
    verificarAtualizacaoSilenciosa(swRegistration);
  }
});

// Show install banner when browser fires beforeinstallprompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
  // Mostra botão no header (visível em desktop)
  const btnH = document.getElementById('btn-instalar-header');
  if (btnH) btnH.classList.add('visivel');
});

function showInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'flex';
}

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    deferredPrompt = null;
    document.getElementById('install-banner').style.display = 'none';
    const btnH = document.getElementById('btn-instalar-header');
    if (btnH) btnH.classList.remove('visivel');
    if (choice.outcome === 'accepted') showToast('✓ App instalado com sucesso!');
  });
}

function dismissBanner() {
  document.getElementById('install-banner').style.display = 'none';
}

// Hide banner once app is installed
window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').style.display = 'none';
  showToast('✓ App instalado!');
});
