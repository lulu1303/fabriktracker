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

  /* { "3010|5": { name: "Brick 1 x 4", color: "Red" }, ... }
     Farb-ID 0 bedeutet "jede Farbe". */
  var watches = {};

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      Object.keys(saved).forEach(function (k) {

        /* Alte Einträge ohne Farbe gelten für jede Farbe */
        var key = k.indexOf("|") === -1 ? k + "|0" : k;
        var v = saved[k];

        watches[key] =
          v && typeof v === "object"
            ? { name: v.name || "", color: v.color || "" }
            : { name: String(v || ""), color: "" };
      });
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function saveWatches() {
    try {
      localStorage.setItem(KEY, JSON.stringify(watches));
    } catch (error) { /* egal */ }
  }

  function watchKey(partNumber, colorId) {
    return String(partNumber) + "|" + (Number(colorId) || 0);
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

  window.isWatched = function (partNumber, colorId) {
    return Object.prototype.hasOwnProperty.call(
      watches,
      watchKey(partNumber, colorId)
    );
  };

  function refreshBells() {

    document.querySelectorAll(".watch-bell[data-watch]").forEach(function (bell) {

      var on = Object.prototype.hasOwnProperty.call(watches, bell.dataset.watch);

      bell.classList.toggle("active", on);
      bell.setAttribute(
        "aria-label",
        on
          ? "Benachrichtigung ausschalten"
          : "Benachrichtigen, wenn wieder gemeldet"
      );
    });
  }

  window.refreshWatchBells = refreshBells;

  function describe(partNumber, colorName) {
    return "LEGO " + partNumber + (colorName ? " in " + colorName : "");
  }

  async function setWatch(partNumber, colorId, name, colorName, on) {

    var key = watchKey(partNumber, colorId);
    var before = JSON.stringify(watches);

    if (on) {

      if (Object.keys(watches).length >= MAX_WATCHES && !watches[key]) {
        toast("Du kannst höchstens " + MAX_WATCHES + " Beobachtungen anlegen.");
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

      /* Eine bestimmte Farbe ersetzt "Alle Farben" desselben Teils,
         und "Alle Farben" ersetzt einzelne Farben (sonst doppelt). */
      var numPart = String(partNumber);

      Object.keys(watches).forEach(function (k) {

        var pair = k.split("|");

        if (pair[0] !== numPart || k === key) return;

        if (Number(colorId) ? pair[1] === "0" : true) {
          delete watches[k];
        }
      });

      watches[key] = { name: name || "", color: colorName || "" };

    } else {

      delete watches[key];
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
      renderWatchHits();

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

  async function toggleWatch(partNumber, colorId, name, colorName) {

    var key = watchKey(partNumber, colorId);

    if (watches[key]) {

      if (await setWatch(partNumber, colorId, name, colorName, false)) {
        toast("🔕 Benachrichtigung für " + describe(partNumber, colorName) + " aus.");
      }

    } else if (await setWatch(partNumber, colorId, name, colorName, true)) {

      toast(
        "🔔 Ich sage Bescheid, sobald " +
        describe(partNumber, colorName) + " gemeldet wird."
      );
    }
  }


  /* -------------------------------------------------------
     BEREICH "BENACHRICHTIGUNGEN"
  ------------------------------------------------------- */

  function renderWatchList() {

    var list = document.getElementById("watchList");
    if (!list) return;

    var keys = Object.keys(watches).sort(function (x, y) {
      var px = x.split("|"), py = y.split("|");
      return px[0] === py[0]
        ? Number(px[1]) - Number(py[1])
        : px[0] < py[0] ? -1 : 1;
    });

    list.textContent = "";

    if (!keys.length) {

      var empty = document.createElement("div");
      empty.className = "watch-empty";
      empty.textContent = "Noch nichts beobachtet.";
      list.appendChild(empty);
      return;
    }

    keys.forEach(function (key) {

      var pair = key.split("|");
      var num = pair[0];
      var colorId = Number(pair[1]) || 0;
      var info = watches[key] || {};

      var row = document.createElement("div");
      row.className = "watch-row";

      var text = document.createElement("div");
      text.className = "watch-text";

      var title = document.createElement("div");
      title.className = "watch-num";
      title.textContent =
        "🔔 LEGO " + num + " · " +
        (colorId ? info.color || "Farbe " + colorId : "Alle Farben");
      text.appendChild(title);

      if (info.name) {
        var sub = document.createElement("div");
        sub.className = "watch-name";
        sub.textContent = info.name;
        text.appendChild(sub);
      }

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary watch-remove";
      remove.textContent = "Entfernen";
      remove.addEventListener("click", function () {
        setWatch(num, colorId, info.name, info.color, false);
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

      var choose = function () {
        showColorStep(row);
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

  /* Schritt 2: Farbe wählen (oder "Alle Farben") */
  async function showColorStep(row) {

    var step = document.getElementById("watchColorStep");
    var box = document.getElementById("watchSuggestions");

    if (!step) return;

    if (box) box.textContent = "";

    step.hidden = false;
    step.textContent = "";

    var heading = document.createElement("div");
    heading.className = "watch-step-title";
    heading.textContent =
      "LEGO " + row.part_num + (row.name ? " · " + row.name : "");
    step.appendChild(heading);

    var select = document.createElement("select");
    select.id = "watchColorSelect";
    select.disabled = true;

    var loading = document.createElement("option");
    loading.textContent = "Farben werden geladen...";
    select.appendChild(loading);
    step.appendChild(select);

    var actions = document.createElement("div");
    actions.className = "watch-step-actions";

    var confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary";
    confirm.textContent = "🔔 Beobachten";
    confirm.disabled = true;

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary";
    cancel.textContent = "Abbrechen";
    cancel.addEventListener("click", function () {
      step.hidden = true;
      step.textContent = "";
    });

    actions.appendChild(confirm);
    actions.appendChild(cancel);
    step.appendChild(actions);

    var colors = [];

    try {

      var pc = await supabaseRequest(
        SUPABASE_URL + "/rest/v1/lego_part_colors" +
        "?select=color_id&part_num=eq." + encodeURIComponent(row.part_num) +
        "&limit=1000"
      ) || [];

      var ids = Array.from(new Set(
        pc.map(function (x) { return x.color_id; })
          .filter(function (x) { return x != null; })
      ));

      if (ids.length) {
        colors = await supabaseRequest(
          SUPABASE_URL + "/rest/v1/lego_colors" +
          "?id=in.(" + ids.join(",") + ")&select=id,name&order=name.asc"
        ) || [];
      }

    } catch (error) {
      colors = [];
    }

    select.textContent = "";

    var all = document.createElement("option");
    all.value = "0";
    all.textContent = "Alle Farben";
    select.appendChild(all);

    colors.forEach(function (c) {
      var o = document.createElement("option");
      o.value = String(c.id);
      o.textContent = c.name;
      select.appendChild(o);
    });

    select.disabled = false;
    confirm.disabled = false;

    confirm.addEventListener("click", async function () {

      var colorId = Number(select.value) || 0;
      var colorName = colorId
        ? select.options[select.selectedIndex].textContent
        : "";

      confirm.disabled = true;

      if (await setWatch(row.part_num, colorId, row.name, colorName, true)) {

        step.hidden = true;
        step.textContent = "";

        var input = document.getElementById("watchSearchInput");
        if (input) input.value = "";

        toast(
          "🔔 Ich sage Bescheid, sobald " +
          describe(row.part_num, colorName) + " gemeldet wird."
        );

      } else {

        confirm.disabled = false;
      }
    });
  }

  function onWatchInput() {

    var input = document.getElementById("watchSearchInput");
    var box = document.getElementById("watchSuggestions");

    if (!input || !box) return;

    clearTimeout(searchTimer);

    var stepBox = document.getElementById("watchColorStep");
    if (stepBox && !stepBox.hidden) {
      stepBox.hidden = true;
      stepBox.textContent = "";
    }

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

    if (form && !document.getElementById("watchColorStep")) {
      var step = document.createElement("div");
      step.id = "watchColorStep";
      step.className = "watch-step";
      step.hidden = true;
      form.appendChild(step);
    }

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
     BEOBACHTETE TEILE, DIE JETZT VERFÜGBAR SIND
     Stehen ganz oben auf der Seite. Sobald sie angezeigt
     werden, gilt die Benachrichtigung als gesehen und ist
     für das nächste Mal wieder scharf.
  ------------------------------------------------------- */

  var ackedKeys = {};

  function findWatchHits() {

    var items = [];
    var keys = {};

    if (typeof parts === "undefined" || !Array.isArray(parts)) {
      return { items: items, keys: keys };
    }

    parts.forEach(function (p) {

      if (p.is_available === false) return;

      var exact = watchKey(p.part_number, p.color_id);
      var any = watchKey(p.part_number, 0);

      if (watches[exact]) keys[exact] = true;
      else if (watches[any]) keys[any] = true;
      else return;

      items.push(p);
    });

    return { items: items.slice(0, 30), keys: keys };
  }

  function renderWatchHits() {

    var box = document.getElementById("watchHits");
    if (!box) return;

    var hits = findWatchHits();

    if (!hits.items.length || typeof renderPart !== "function") {
      box.textContent = "";
      return;
    }

    box.innerHTML =
      '<section class="watch-hits">' +
        '<h2 class="watch-hits-title">🔔 Deine beobachteten Teile – jetzt verfügbar</h2>' +
        '<div class="watch-hits-list">' +
          hits.items.map(renderPart).join("") +
        "</div>" +
      "</section>";

    acknowledge(Object.keys(hits.keys));
  }

  async function acknowledge(keys) {

    var fresh = keys.filter(function (k) { return !ackedKeys[k]; });

    if (
      !fresh.length ||
      !pushSupported() ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    fresh.forEach(function (k) { ackedKeys[k] = true; });

    try {

      var sub = await getSubscription(false);
      if (!sub) return;

      await supabaseRequest(
        SUPABASE_URL + "/rest/v1/rpc/push_ack",
        {
          method: "POST",
          body: JSON.stringify({
            p_endpoint: sub.endpoint,
            p_parts: fresh
          })
        }
      );

    } catch (error) {

      fresh.forEach(function (k) { delete ackedKeys[k]; });
      console.warn("Bestätigung fehlgeschlagen:", error);
    }
  }

  var displayPartsBefore = window.displayParts;

  if (typeof displayPartsBefore === "function") {

    window.displayParts = function (list) {

      displayPartsBefore(list);

      try {
        renderWatchHits();
      } catch (error) {
        console.warn("Beobachtete Teile konnten nicht angezeigt werden:", error);
      }
    };
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

      var pair = String(bell.dataset.watch).split("|");
      var card = bell.closest(".part-card");

      var nameEl = card ? card.querySelector(".part-name") : null;
      var colorEl = card ? card.querySelector(".part-color") : null;

      toggleWatch(
        pair[0],
        pair[1],
        nameEl ? nameEl.textContent.trim() : "",
        colorEl ? colorEl.textContent.trim() : ""
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

    /* Aufräumen: "Alle Farben" neben einzelnen Farben desselben Teils
       stammt aus der alten Version (Teil ohne Farbe) und ist doppelt. */
    var cleaned = false;

    Object.keys(watches).forEach(function (k) {

      var pair = k.split("|");

      if (pair[1] !== "0") return;

      var hasSpecific = Object.keys(watches).some(function (other) {
        var o = other.split("|");
        return o[0] === pair[0] && o[1] !== "0";
      });

      if (hasSpecific) {
        delete watches[k];
        cleaned = true;
      }
    });

    if (cleaned) {
      saveWatches();
      refreshBells();
      renderWatchList();
      renderWatchHits();
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
