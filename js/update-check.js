/* =========================================================
   AUTOMATISCHE AKTUALISIERUNG
   FabrikTracker

   Prüft beim Zurückkehren zur App (und alle 5 Minuten), ob
   eine neue Version veröffentlicht wurde, und lädt dann neu.
   Die Version steckt in den Script-Adressen (?v=...), die
   beim Veröffentlichen automatisch erneuert werden.

   Ist gerade das Melde-Formular in Benutzung, wird nicht
   neu geladen, sondern ein Hinweis angezeigt.
========================================================= */

(function () {

  var CHECK_EVERY_MS = 5 * 60 * 1000;
  var MIN_GAP_MS = 20 * 1000;

  var lastCheck = 0;
  var checking = false;

  function versionOf(html) {
    var match = /js\/app\.js\?v=([^"'&\s>]+)/.exec(html || "");
    return match ? match[1] : "";
  }

  function currentVersion() {
    var script = document.querySelector('script[src*="js/app.js"]');
    var src = script ? script.getAttribute("src") || "" : "";
    var match = /[?&]v=([^&]+)/.exec(src);
    return match ? match[1] : "";
  }

  function formInUse() {
    var content = document.getElementById("reportContent");
    var input = document.getElementById("partSearchInput");
    return !!(
      content && !content.hidden && input && input.value.trim()
    );
  }

  function showBanner() {

    if (document.getElementById("updateBanner")) return;

    var banner = document.createElement("button");

    banner.id = "updateBanner";
    banner.type = "button";
    banner.className = "update-banner";
    banner.textContent = "🔄 Neue Version verfügbar – tippen zum Aktualisieren";

    banner.addEventListener("click", function () {
      location.reload();
    });

    document.body.appendChild(banner);
  }

  async function check() {

    var now = Date.now();

    if (checking || now - lastCheck < MIN_GAP_MS) return;

    var mine = currentVersion();

    if (!mine) return;

    checking = true;
    lastCheck = now;

    try {

      var response = await fetch(
        location.pathname + "?_=" + now,
        { cache: "no-store" }
      );

      if (!response.ok) return;

      var latest = versionOf(await response.text());

      if (latest && latest !== mine) {

        if (formInUse()) {
          showBanner();
        } else {
          location.reload();
        }

      }

    } catch (error) {

      /* offline o.ä. – beim nächsten Mal wieder versuchen */

    } finally {

      checking = false;
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });

  window.addEventListener("pageshow", check);

  setInterval(function () {
    if (document.visibilityState === "visible") check();
  }, CHECK_EVERY_MS);

})();
