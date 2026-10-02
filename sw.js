// Lưu sẵn game vào máy để chơi được khi không có mạng.
// Có mạng: luôn lấy bản mới nhất từ máy chủ (và cất lại vào máy).
// Mất mạng hoặc mạng quá chậm: dùng bản đã cất.
const CACHE = "line98-20261002-214139";
const FILES = ["./", "index.html", "icon.png", "manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // version.json chỉ dùng để hỏi bản mới — không cất, mất mạng thì thôi
  if (req.url.includes("version.json")) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = req.mode === "navigate";
    const key = isPage ? "index.html" : req;
    try {
      // Mạng chậm quá 4 giây thì dùng luôn bản trong máy cho mẹ khỏi chờ
      const res = await Promise.race([
        // trang chính phải hỏi bằng địa chỉ trơn: Request kiểu "navigate" không cho kèm tuỳ chọn cache
        fetch(isPage ? req.url : req, { cache: "no-store" }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("chậm")), 4000))
      ]);
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch {
      const hit = await cache.match(key, { ignoreSearch: true });
      return hit || Response.error();
    }
  })());
});
