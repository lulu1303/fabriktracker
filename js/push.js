/* =========================================================
   PUSH-BENACHRICHTIGUNGEN
   FabrikTracker

   - Glocke 🔔 bei jedem Teil: "Benachrichtige mich, sobald es
     gemeldet wird"
   - Eigener Bereich "Benachrichtigungen" zum Beobachten von
     Teilen, die noch nie gemeldet wurden
   - Kein Login: Das Gerät wird anonym über sein Push-Abo
     erkannt. Die Liste der beobachteten Teile liegt lokal
     und wird mit der Datenbank abgeglichen.
========================================================= */

(function () {

  var VAPID_PUBLIC_KEY =
    "BPBo74mp31ari3qp-QJRe6T0h4gUasrgcaMGj_tsISY6p1UYWRXEBtDGXuKjoOeGE1UMNzb07uDaDp2TOnaRK7s";

  var KEY = "fabriktracker_watches";
  var MAX_WATCHES = 100;

  /* { "3010": "Brick 1 x 4", ... } */
  var watches = {};

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      watches = saved;
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function saveWatches() {
    try {
      localStorage.setItem(KEY, JSON.stringify(watches));
    } catch (error) { /* egal */ }
  }

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function pushSupported() {
    return "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
  }

  function urlBase64ToUint8Array(base64) {
    var padding = "=".repeat((4 - (base64.length % 4)) % 4);
    var raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function unsupportedHint() {
    if (isIOS()) {
      toast(
        "Auf iPhone/iPad: Seite über Teilen → „Zum Home-Bildschirm“ " +
        "hinzufügen und von dort öffnen. Dann geht’s."
      );
    } else {
      toast("Dieser Browser unterstützt keine Benachrichtigungen.");
    }
  }


  /* -------------------------------------------------------
     PUSH-ABO
  ------------------------------------------------------- */

  async function getRegistration() {
    var reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  }

  /* create = true: Erlaubnis erfragen und Abo anlegen */
  async function getSubscription(create) {

    var reg = await getRegistration();
    var sub = await reg.pushManager.getSubscription();

    if (!sub && create) {

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    return sub;
  }

  /* Liste der beobachteten Teile an die Datenbank schicken */
  async function syncWatches(sub) {

    var json = sub.toJSON();

    await supabaseRequest(
      SUPABASE_URL + "/rest/v1/rpc/push_sync",
      {
        method: "POST",
        body: JSON.stringify({
          p_endpoint: json.endpoint,
          p_p256dh: json.keys && json.keys.p256dh,
          p_auth: json.keys && json.keys.auth,
          p_parts: Object.keys(watches)
        })
      }
    );
  }


  /* -------------------------------------------------------
     BEOBACHTEN / NICHT MEHR BEOBACHTEN
  ------------------------------------------------------- */

  window.isWatched = function (partNumber) {
    return Object.prototype.hasOwnProperty.call(watches, String(partNumber));
  };

  function refreshBells() {

    document.querySelectorAll(".watch-bell[data-watch]").forEach(function (bell) {

      var on = window.isWatched(bell.dataset.watch);

      bell.classList.toggle("active", on);
      bell.setAttribute(
        "aria-label",
        on ? "Benachrichtigung ausschalten" : "Benachrichtigen, sobald gemeldet"
      );
    });
  }

  window.refreshWatchBells = refreshBells;

  async function setWatch(partNumber, name, on) {

    var num = String(partNumber);
    var before = JSON.stringify(watches);

    if (on) {

      if (Object.keys(watches).length >= MAX_WATCHES && !watches[num]) {
        toast("Du kannst höchstens " + MAX_WATCHES + " Teile beobachten.");
        return false;
      }

      if (!pushSupported()) {
        unsupportedHint();
        return false;
      }

      /* Erlaubnis direkt im Tipp erfragen (iOS verlangt das) */
      if (Notification.permission === "default") {
        var answer = await Notification.requestPermission();
        if (answer !== "granted") {
          toast("Ohne Erlaubnis kann ich dich nicht benachrichtigen.");
          return false;
        }
      }

      if (Notification.permission === "denied") {
        toast(
          "Benachrichtigungen sind blockiert. Bitte in den " +
          "Geräte-Einstellungen für FabrikTracker erlauben."
        );
        return false;
      }

      watches[num] = name || "";

    } else {

      delete watches[num];
    }

    try {

      var sub = await getSubscription(on);

      if (sub) {
        await syncWatches(sub);
      } else if (on) {
        throw new Error("Kein Push-Abo");
      }

      saveWatches();
      refreshBells();
      renderWatchList();

      return true;

    } catch (error) {

      console.warn("Benachrichtigung speichern fehlgeschlagen:", error);

      watches = JSON.parse(before);
      refreshBells();
      renderWatchList();

      toast(
        typeof friendlyError === "function"
          ? friendlyError(error)
          : "Das hat leider nicht geklappt."
      );

      return false;
    }
  }

  async function toggleWatch(partNumber, name) {

    var num = String(partNumber);

    if (window.isWatched(num)) {

      if (await setWatch(num, name, false)) {
        toast("🔕 Benachrichtigung für LEGO " + num + " ausgeschaltet.");
      }

    } else if (await setWatch(num, name, true)) {

      toast(
        "🔔 Ich sage Bescheid, sobald LEGO " + num + " gemeldet wird."
      );
    }
  }


  /* -------------------------------------------------------
     BEREICH "BENACHRICHTIGUNGEN"
  ------------------------------------------------------- */

  function renderWatchList() {

    var list = document.getElementById("watchList");
    if (!list) return;

    var nums = Object.keys(watches);

    list.textContent = "";

    if (!nums.length) {

      var empty = document.createElement("div");
      empty.className = "watch-empty";
      empty.textContent = "Noch keine Teile beobachtet.";
      list.appendChild(empty);
      return;
    }

    nums.forEach(function (num) {

      var row = document.createElement("div");
      row.className = "watch-row";

      var text = document.createElement("div");
      text.className = "watch-text";

      var title = document.createElement("div");
      title.className = "watch-num";
      title.textContent = "🔔 LEGO " + num;
      text.appendChild(title);

      if (watches[num]) {
        var sub = document.createElement("div");
        sub.className = "watch-name";
        sub.textContent = watches[num];
        text.appendChild(sub);
      }

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary watch-remove";
      remove.textContent = "Entfernen";
      remove.addEventListener("click", function () {
        setWatch(num, "", false);
      });

      row.appendChild(text);
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  var searchTimer = null;
  var searchId = 0;

  function renderSuggestions(rows) {

    var box = document.getElementById("watchSuggestions");
    if (!box) return;

    box.textContent = "";

    if (!rows.length) {
      var none = document.createElement("div");
      none.className = "suggestion";
      none.textContent = "❌ Kein passendes LEGO Teil gefunden.";
      box.appendChild(none);
      return;
    }

    rows.forEach(function (row) {

      var item = document.createElement("div");
      item.className = "suggestion";
      item.setAttribute("role", "button");
      item.tabIndex = 0;

      var text = document.createElement("div");
      text.className = "suggestion-text";

      var num = document.createElement("div");
      num.className = "suggestion-number";
      num.textContent = "LEGO " + row.part_num;

      var name = document.createElement("div");
      name.className = "suggestion-name";
      name.textContent = row.name || "";

      text.appendChild(num);
      text.appendChild(name);
      item.appendChild(text);

      var choose = async function () {

        var input = document.getElementById("watchSearchInput");

        if (await setWatch(row.part_num, row.name, true)) {
          box.textContent = "";
          if (input) input.value = "";
          toast(
            "🔔 Ich sage Bescheid, sobald LEGO " + row.part_num +
            " gemeldet wird."
          );
        }
      };

      item.addEventListener("click", choose);
      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      });

      box.appendChild(item);
    });
  }

  function onWatchInput() {

    var input = document.getElementById("watchSearchInput");
    var box = document.getElementById("watchSuggestions");

    if (!input || !box) return;

    clearTimeout(searchTimer);

    var query = input.value.trim();

    if (query.length < 2) {
      searchId++;
      box.textContent = "";
      return;
    }

    searchTimer = setTimeout(async function () {

      var id = ++searchId;

      try {

        var rows = await supabaseRequest(
          SUPABASE_URL + "/rest/v1/rpc/search_lego_parts",
          {
            method: "POST",
            body: JSON.stringify({ q: query, max_results: 12 })
          }
        );

        if (id !== searchId) return;

        renderSuggestions(Array.isArray(rows) ? rows : []);

      } catch (error) {

        if (id !== searchId) return;

        box.textContent = "";
        toast("Suche fehlgeschlagen. Bitte noch einmal versuchen.");
      }

    }, 250);
  }

  function initWatchBox() {

    var openButton = document.getElementById("watchOpenButton");
    var form = document.getElementById("watchForm");
    var input = document.getElementById("watchSearchInput");

    renderWatchList();

    if (input) input.addEventListener("input", onWatchInput);

    if (openButton && form) {

      openButton.addEventListener("click", function () {

        if (!pushSupported()) {
          unsupportedHint();
          return;
        }

        form.hidden = !form.hidden;

        if (!form.hidden && input) input.focus();
      });
    }
  }


  /* -------------------------------------------------------
     KLICK AUF DIE GLOCKE (vor den Ordner-Knöpfen abfangen)
  ------------------------------------------------------- */

  document.addEventListener(
    "click",
    function (event) {

      var bell = event.target.closest && event.target.closest(".watch-bell");

      if (!bell) return;

      event.stopPropagation();
      event.preventDefault();

      var folder = bell.closest(".part-number-folder");
      var nameEl = folder
        ? folder.querySelector(".part-number-name")
        : null;

      toggleWatch(
        bell.dataset.watch,
        nameEl ? nameEl.textContent.trim() : ""
      );
    },
    true
  );


  /* -------------------------------------------------------
     TIPP AUF BENACHRICHTIGUNG: Teil in der Suche zeigen
  ------------------------------------------------------- */

  function showPartFromUrl(url) {

    var query = "";

    try {
      query = new URL(url, location.origin).searchParams.get("q") || "";
    } catch (error) { /* egal */ }

    if (!query) return;

    var tries = 0;

    (function attempt() {

      var ready =
        typeof parts !== "undefined" && Array.isArray(parts) && parts.length;

      if (!ready && tries++ < 40) {
        setTimeout(attempt, 250);
        return;
      }

      var input = document.getElementById("searchInput");

      if (input) {
        input.value = query;
        if (typeof window.searchParts === "function") window.searchParts();
        input.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    })();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (event) {
      if (event.data && event.data.type === "open-url") {
        showPartFromUrl(event.data.url);
      }
    });
  }


  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */

  function start() {

    initWatchBox();

    /* Geöffnet über eine Benachrichtigung (?q=3010) */
    if (location.search.indexOf("q=") !== -1) {
      showPartFromUrl(location.href);
    }

    /* Abo und Liste still abgleichen (z.B. nach erneuertem Abo) */
    if (
      pushSupported() &&
      Notification.permission === "granted" &&
      Object.keys(watches).length
    ) {
      getSubscription(true)
        .then(function (sub) { return sub && syncWatches(sub); })
        .catch(function (error) {
          console.warn("Abgleich der Benachrichtigungen fehlgeschlagen:", error);
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
