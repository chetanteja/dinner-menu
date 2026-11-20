// Minimal service worker: receives push notifications and focuses the app when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Dinner Menu", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Dinner Menu", {
      body: data.body || "",
      icon: data.icon || "/pwa-icon/192",
      badge: data.icon || "/pwa-icon/192",
      tag: data.tag || "dinner",
      renotify: true,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // The right page (dinner "/" or garbage "/garbage") is already open: bring it forward.
      const same = list.find((c) => new URL(c.url).pathname === target.pathname);
      if (same && "focus" in same) return same.focus();
      // Otherwise open it. Don't navigate some other app's window (e.g. dinner) to the garbage page.
      if (self.clients.openWindow) return self.clients.openWindow(target.href);
    })(),
  );
});
