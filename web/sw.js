// sw.js — Service Worker（离线缓存）

var CACHE = 'poop-tracker-v4';
var FILES = [
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/app.js',
  './manifest.json'
];

// 安装：预缓存核心文件
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 请求：网络优先，缓存回退（确保每次更新立即可见）
self.addEventListener('fetch', function (e) {
  e.respondWith(
    fetch(e.request).then(function (res) {
      // 缓存成功响应
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(e.request, clone);
        });
      }
      return res;
    }).catch(function () {
      // 网络不可用时，使用缓存
      return caches.match(e.request).then(function (cached) {
        return cached || new Response('离线状态', { status: 503 });
      });
    })
  );
});
