// service-worker.js

// キャッシュの名前を定義（新しいバージョンで更新できるようバージョン番号を含む）
const CACHE_NAME = 'DJ-timer-cache-v1.0.3';

// オフライン動作に必要なファイルのリスト
// これらはService Workerがインストールされたときにキャッシュされるよ
const urlsToCache = [
  '/DJtimer/',                     // アプリのトップページ（index.html）
  '/DJtimer/index.html',           // index.html自体を明示
  '/DJtimer/manifest.webmanifest', // Web App Manifest
  '/DJtimer/service-worker.js',    // Service Worker自身
  '/DJtimer/icons/icon-192x192.png', // アプリのアイコン
  '/DJtimer/icons/icon-512x512.png',
  '/DJtimer/icons/icon-maskable-192x192.png',
  '/DJtimer/icons/icon-maskable-512x512.png',
  // 必要に応じて、追加の画像やフォントなどもここに追加する
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap'
];

// --- 1. Service Workerのインストール ---
// Service Workerがブラウザに登録されたときに、必須ファイルをキャッシュに保存する
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME) // 新しいキャッシュを開く
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache); // 定義されたファイルを全てキャッシュ
      })
      .catch((error) => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
  self.skipWaiting(); // インストール後すぐにアクティブ化
});

// --- 2. Service Workerのアクティベート ---
// 新しいService Workerが有効になったときに、古いキャッシュをクリーンアップする
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在のキャッシュ名と異なる（古い）キャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Service Workerがページを制御を開始
    })
  );
});

// --- 3. フェッチイベント（リクエストの横取りとキャッシュ戦略） ---
// ブラウザからの全てのリクエストをここで横取りし、キャッシュ戦略を適用する
self.addEventListener('fetch', (event) => {

  // リクエストがフォント（またはフォントのCSS）かどうかを判定する
  const isFontRelatedRequest = event.request.destination === 'font' || (/\.(woff|woff2|ttf|otf|eot|css)(\?.*)?$/.test(event.request.url) && event.request.url.includes('fonts.googleapis.com'));

  // ナビゲーションリクエスト（HTMLページのロード）の場合の処理
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // ネットワークから最新のHTMLを取得しようと試みる
      fetch(event.request).catch(() => {
        // ネットワークエラー時（オフライン時など）はキャッシュからindex.htmlを返す
        return caches.match('/DJtimer/index.html');
      })
    );
    return; // ナビゲーションリクエストの処理はここで終了
  }

  // フォント関連のリクエスト（フォントファイルやGoogle FontsのCSS）の場合の処理
  if (isFontRelatedRequest) {
    event.respondWith(
      caches.match(event.request) // まずキャッシュにリクエストがあるか確認
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving font-related asset from cache:', event.request.url);
            return cachedResponse; // キャッシュにあればそれを返す
          }

          // キャッシュになければネットワークから取得
          console.log('[Service Worker] Fetching font-related asset from network:', event.request.url);
          return fetch(event.request).then(networkResponse => {
            // 有効なレスポンス（200番台のステータスコード）であればキャッシュする
            // Google Fontsなどクロスオリジンリソースはtypeが'cors'になるため、
            // 'basic'のチェックを外し、networkResponse.ok（status 200-299）で判断する
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone(); // レスポンスは一度しか読めないので複製
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse; // ネットワークレスポンスを返す
          }).catch(error => {
            console.error("[Service Worker] Font-related asset fetch failed:", event.request.url, error);
            // フォントの取得に失敗した場合の処理（フォールバックなど、必要であれば実装）
            throw error;
          });
        })
    );
    return; // フォント関連リクエストの処理はここで終了
  }

  // それ以外のリクエスト（CSS, JS, 画像など）は「キャッシュ優先」戦略
  event.respondWith(
    caches.match(event.request) // まずキャッシュにリクエストがあるか確認
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        // キャッシュになければネットワークから取得
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // ネットワークから取得した有効なレスポンスをキャッシュに追加
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone(); // レスポンスは一度しか読めないのでクローン
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse; // ネットワークレスポンスを返す
          });
      })
      .catch((error) => {
        console.error('[Service Worker] Fetch failed and no cache match for:', event.request.url, error);
        // 必要に応じて、オフライン時のフォールバックコンテンツをここで返す
        // 例: return caches.match('/offline.html');
      })
  );
});