// Service Worker for Monster Garden Train
const CACHE_NAME = 'garden-train-v1.0.0';
const RUNTIME_CACHE = 'garden-train-runtime';

// 캐시할 파일들
const urlsToCache = [
  '/monster-garden-train-mobile.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Righteous&family=Noto+Sans+KR:wght@400;700&display=swap'
];

// 설치 이벤트
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백
self.addEventListener('fetch', event => {
  // HTML 요청
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/monster-garden-train-mobile.html');
        })
    );
    return;
  }

  // 기타 리소스
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(response => {
          // 유효한 응답만 캐시
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // 런타임 캐시에 저장
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// 백그라운드 동기화
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncGameData());
  }
});

function syncGameData() {
  // 게임 데이터 동기화 로직
  return fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ action: 'sync' })
  }).catch(err => {
    console.log('[Service Worker] Sync failed:', err);
  });
}

// 푸시 알림
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : '새로운 보스가 등장했습니다!',
    icon: '/icon-192.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '게임 열기',
        icon: '/play-icon.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('몬스터 가든 트레인', options)
  );
});

// 알림 클릭
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/monster-garden-train-mobile.html')
    );
  }
});

// 주기적 백그라운드 동기화 (실험적 기능)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-bosses') {
    event.waitUntil(updateBossList());
  }
});

function updateBossList() {
  return fetch('/api/bosses')
    .then(response => response.json())
    .then(data => {
      // 보스 목록 업데이트
      return caches.open(RUNTIME_CACHE).then(cache => {
        cache.put('/api/bosses', new Response(JSON.stringify(data)));
      });
    })
    .catch(err => {
      console.log('[Service Worker] Update failed:', err);
    });
}

// 메시지 수신
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});
