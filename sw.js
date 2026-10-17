/* =========================================================
   FabrikTracker – Service Worker
   Benachrichtigungen (Push) und Offline-Zwischenspeicher.
========================================================= */

var CACHE = "fabriktracker-v1";
var NETWORK_TIMEOUT_MS = 4000;
var MAX_CACHED_BYTES = 2 * 1024 * 1024;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(
          names
            .filter(function (name) { return name !== CACHE; })
            .map(function (name) { return caches.delete(name); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});


/* -------------------------------------------------------
   OFFLINE / SCHLECHTER EMPFANG
   Seite und Teiledaten: zuerst das Netz (maximal 4 Sekunden),
   sonst die zuletzt gespeicherte Fassung.
------------------------------------------------------- */

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("timeout")); }, ms);
    promise.then(
      function (value) { clearTimeout(timer); resolve(value); },
      function (error) { clearTimeout(timer); reject(error); }
    );
  });
}

function stamp(response) {

  return response.clone().arrayBuffer().then(function (buffer) {

    if (buffer.byteLength > MAX_CACHED_BYTES) return null;

    var headers = new Headers(response.headers);
    headers.set("x-cached-at", String(Date.now()));

    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  });
}

function networkFirst(event) {

  var request = event.request;

  return withTimeout(fetch(request), NETWORK_TIMEOUT_MS)
    .then(function (response) {

      if (response && response.ok) {
        event.waitUntil(
          stamp(response)
            .then(function (copy) {
              if (!copy) return;
              return caches.open(CACHE).then(function (cache) {
                return cache.put(request, copy);
              });
            })
            .catch(function () { /* egal */ })
        );
      }

      return response;
    })
    .catch(function (error) {

      return caches.match(request, { ignoreSearch: false }).then(function (cached) {

        if (!cached) {
          /* Seite selbst: wenigstens die Startseite zeigen */
          if (request.mode === "navigate") {
            return caches.match("/").then(function (home) {
              if (home) return home;
              throw error;
            });
          }
          throw error;
        }

        /* Der Seite sagen, dass es gespeicherte Daten sind */
        event.waitUntil(
          self.clients.matchAll({ type: "window" }).then(function (list) {
            list.forEach(function (client) {
              client.postMessage({
                type: "from-cache",
                at: Number(cached.headers.get("x-cached-at")) || 0
              });
            });
          })
        );

        return cached;
      });
    });
}

self.addEventListener("fetch", function (event) {

  var request = event.request;

  if (request.method !== "GET") return;

  var url = new URL(request.url);

  var sameOrigin = url.origin === self.location.origin;
  var supabaseData =
    /\.supabase\.co$/.test(url.hostname) &&
    url.pathname.indexOf("/rest/v1/") === 0 &&
    url.pathname.indexOf("/rest/v1/rpc/") !== 0;

  if (!sameOrigin && !supabaseData) return;

  /* Service Worker selbst nie aus dem Zwischenspeicher */
  if (sameOrigin && url.pathname === "/sw.js") return;

  event.respondWith(networkFirst(event));
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
