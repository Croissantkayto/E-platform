// Service Worker: الشبكة أولاً ثم الكاش (عشان التحديثات توصل فوراً)
const CACHE = 'oboor-v2';
const SHELL = ['./', 'index.html', 'style.css', 'animations.css', 'js/animations.js', 'js/firebase-config.js', 'js/auth.js', 'js/lessons.js', 'js/viewer.js', 'js/exam.js',
    'js/results.js', 'js/complaints.js', 'js/stats.js', 'js/notifications.js', 'js/leaderboard.js', 'js/app-init.js'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    e.respondWith(
        fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
            .catch(() => caches.match(req))
    );
});
