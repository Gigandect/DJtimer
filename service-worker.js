// Service Worker

// キャッシュ名: 新しいバージョンで更新できるようバージョン番号を含む
const CACHE_NAME = 'DJ-timer-cache-v1.0.4';

// オフライン時に利用可能にするファイルのリスト
const urlsToCache = [
  '/DJtimer/',
  '/DJtimer/index.html',
  '/DJtimer/manifest.webmanifest',
  '/DJtimer/service-worker.js',
  '/DJtimer/icons/icon-192x192.png',
  '/DJtimer/icons/icon-512x512.png',
  '/DJtimer/icons/icon-maskable-192x192.png',
  '/DJtimer/icons/icon-maskable-512x512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap'
];


// --------------------
//  インストールフェーズ
// --------------------

// Service Workerが登録された時、必須ファイルをキャッシュに保存
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
  self.skipWaiting(); // インストール後すぐにアクティブ化
});


// --------------------
//  アクティベートフェーズ
// --------------------

// 新しいService Workerが有効になった時、古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在のキャッシュ名と異なる古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim(); // Service Workerがページを制御を開始
    })
  );
});


// --------------------
//  フェッチフェーズ（リクエストの横取りとキャッシュ戦略）
// --------------------

// ブラウザからのリクエストを横取りし、キャッシュ戦略を適用
self.addEventListener('fetch', (event) => {
  const isFontRelatedRequest = event.request.destination === 'font' || (/\.(woff|woff2|ttf|otf|eot|css)(\?.*)?$/.test(event.request.url) && event.request.url.includes('fonts.googleapis.com'));

  // ナビゲーションリクエスト（HTMLページのロード）:
  // ネットワーク優先、失敗したらキャッシュからindex.htmlを返す
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/DJtimer/index.html');
      })
    );
    return;
  }

  // フォント関連のリクエスト:
  // キャッシュ優先、キャッシュになければネットワークから取得してキャッシュに保存
  if (isFontRelatedRequest) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving font-related asset from cache:', event.request.url);
            return cachedResponse;
          }

          console.log('[Service Worker] Fetching font-related asset from network:', event.request.url);
          return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.ok) { // 200番台のステータスコードをチェック
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }).catch(error => {
            console.error("[Service Worker] Font-related asset fetch failed:", event.request.url, error);
            throw error;
          });
        })
    );
    return;
  }

  // その他のリクエスト（CSS, JS, 画像など）:
  // キャッシュ優先戦略。まずキャッシュを確認し、なければネットワークから取得してキャッシュに保存
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // 有効なレスポンス（ステータス200かつタイプ'basic'）のみキャッシュ
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          });
      })
      .catch((error) => {
        console.error('[Service Worker] Fetch failed and no cache match for:', event.request.url, error);
        // 必要に応じてオフライン時のフォールバックコンテンツを返す
      })
  );
});