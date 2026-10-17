/* =========================================================
   FabrikTracker – Service Worker
   Nur für Benachrichtigungen (kein Offline-Cache).
========================================================= */

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

/* Server schickt: { title, body, url, tag } */
self.addEventListener("push", function (event) {

  var data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  var title = data.title || "FabrikTracker";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Ein beobachtetes Teil wurde gemeldet.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "fabriktracker",
      data: { url: data.url || "/" }
    })
  );
});

/* Tipp auf die Benachrichtigung: App öffnen und Teil suchen */
self.addEventListener("notificationclick", function (event) {

  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (list) {

        for (var i = 0; i < list.length; i++) {

          var client = list[i];

          if ("focus" in client) {
            client.postMessage({ type: "open-url", url: url });
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
