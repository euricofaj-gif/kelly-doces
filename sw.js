/**
 * Service Worker - Kelly Doces Gerenciador de Pedidos
 * Versão: 1.0.0
 */

const CACHE_NAME = 'kelly-doces-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto, adicionando arquivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Arquivos em cache');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro ao fazer cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições (Network First, fallback to Cache)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições de extensões do Chrome e requisições não-GET
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.includes('google.com/calendar')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clone e armazene em cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Se falhar (offline), tente buscar do cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Se não estiver em cache e for navegação, retorne index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline - Conteúdo não disponível', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Sincronização em background (para pedidos offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('[SW] Sincronizando pedidos...');
    // Implementação futura para sincronização de dados
  }
});

// Notificações Push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Novo pedido recebido!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        { action: 'explore', title: 'Ver Pedido' },
        { action: 'close', title: 'Fechar' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Kelly Doces', options)
    );
  }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker carregado');
