  const CACHE = 'subcheck-v7';
const PRECACHE = [
  '/subcheck-/',
  '/subcheck-/index.html',
  '/subcheck-/manifest.json',
  '/subcheck-/icon-192.png',
  '/subcheck-/icon-512.png',
];

/* ─ 설치: 핵심 파일 미리 캐시 ─ */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

/* ─ 활성화: 구버전 캐시 정리 ─ */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ─ 요청 처리: 네트워크 우선, 실패 시 캐시 ─ */
self.addEventListener('fetch', e => {
  // POST 등 비-GET 요청은 그냥 통과
  if (e.request.method !== 'GET') return;

  // Google favicon API: 캐시 우선 (자주 안 바뀜)
  if (e.request.url.includes('google.com/s2/favicons')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Pretendard 폰트: 캐시 우선
  if (e.request.url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // 나머지: 네트워크 우선, 오프라인 시 캐시 반환
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
  );
});

/* ─ 푸시 알림 (향후 서버 알림용) ─ */
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'SUBCHECK', body: '구독 알림이 있어요' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'SUBCHECK', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'subcheck-alert',
      renotify: true,
      data: data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
