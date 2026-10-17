/* =========================================================
   AKTUALITÄT
   FabrikTracker

   Zeigt über der Teileliste, wann zuletzt etwas gemeldet oder
   bestätigt wurde, damit man die Angaben einschätzen kann.
========================================================= */

(function () {

  function relative(time) {

    var minutes = Math.floor((Date.now() - time) / 60000);

    if (minutes < 1) return "gerade eben";
    if (minutes < 60) return "vor " + minutes + " Min.";

    var hours = Math.floor(minutes / 60);

    if (hours < 24) return "vor " + hours + (hours === 1 ? " Stunde" : " Stunden");

    var days = Math.floor(hours / 24);

    return days === 1 ? "vor 1 Tag" : "vor " + days + " Tagen";
  }

  function render() {

    var box = document.getElementById("freshness");

    if (!box) return;

    if (typeof parts === "undefined" || !Array.isArray(parts) || !parts.length) {
      box.textContent = "";
      return;
    }

    var latest = 0;
    var today = 0;
    var dayAgo = Date.now() - 86400000;

    parts.forEach(function (p) {

      var t = new Date(p.last_seen_at || p.created_at || 0).getTime();

      if (!Number.isFinite(t)) return;

      if (t > latest) latest = t;
      if (t >= dayAgo) today++;
    });

    if (!latest) {
      box.textContent = "";
      return;
    }

    box.innerHTML =
      "Letzte Meldung: <strong>" + relative(latest) + "</strong>" +
      (today
        ? " · " + today + (today === 1 ? " Teil" : " Teile") +
          " in den letzten 24 Stunden bestätigt"
        : "");
  }

  var before = window.displayParts;

  if (typeof before === "function") {

    window.displayParts = function (list) {

      before(list);

      try {
        render();
      } catch (error) {
        console.warn("Aktualität konnte nicht angezeigt werden:", error);
      }
    };
  }


  /* -------------------------------------------------------
     OFFLINE-HINWEIS
  ------------------------------------------------------- */

  var offlineAt = null;

  function showOffline() {

    var bar = document.getElementById("offlineBar");

    if (offlineAt === null) {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement("div");
      bar.id = "offlineBar";
      bar.className = "offline-bar";
      bar.setAttribute("role", "status");
      document.body.appendChild(bar);
    }

    var when = offlineAt
      ? " Stand: " + new Date(offlineAt).toLocaleString("de-DE", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
        })
      : "";

    bar.textContent =
      "📴 Kein stabiles Netz – zuletzt gespeicherte Liste." + when;
  }

  if ("serviceWorker" in navigator) {

    navigator.serviceWorker.addEventListener("message", function (event) {

      if (event.data && event.data.type === "from-cache") {
        offlineAt = event.data.at || 0;
        showOffline();
      }
    });

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* egal */ });
    });
  }

  /* Netz ist zurück: Daten neu laden */
  window.addEventListener("online", function () {

    if (offlineAt === null) return;

    offlineAt = null;
    showOffline();

    if (typeof window.loadParts === "function") {
      window.loadParts();
    }
  });

})();
