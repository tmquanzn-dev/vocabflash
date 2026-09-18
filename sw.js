/* Service worker – cho phép cài VocabFlash như ứng dụng và mở được khi mất mạng.
   Chiến lược:
   - index.html: mạng trước, mất mạng thì lấy bản đã lưu (để luôn nhận ?v= mới nhất của CSS/JS)
   - css / js / img cùng nguồn: lấy trong cache trước, đồng thời tải ngầm bản mới (stale-while-revalidate);
     file có ?v= mới sẽ là URL mới nên tự động được tải về
   - Mọi request khác nguồn (Supabase, từ điển, Gemini, CDN) không đụng tới
   Đổi CACHE khi muốn xoá sạch cache cũ trên máy người dùng. */
const CACHE = 'vocabflash-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './img/icon-192.png', './img/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Trang chính (điều hướng) → mạng trước
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Tài nguyên tĩnh → cache trước, cập nhật ngầm
  if (/\.(css|js|png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const fresh = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return cached || (await fresh) || Response.error();
    }));
  }
});
