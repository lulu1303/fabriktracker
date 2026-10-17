/* =========================================================
   ANSICHT-OPTIONEN
   FabrikTracker

   Optionale Steuerung über der Teileliste:
   - "Nur verfügbare Teile" blendet als nicht mehr da
     markierte Teile aus.
   - Sortierung "Zuletzt gesehen" zeigt zuletzt bestätigte
     Teile zuerst (innerhalb ihrer Kategorie).

   Beides ist standardmäßig AUS. Die Auswahl wird im Browser
   gemerkt. Funktioniert mit der normalen Liste und der Suche,
   weil displayParts() umhüllt wird.
========================================================= */

(function () {

  var STORAGE_KEY = "fabriktracker_view_options";

  var options = { onlyAvailable: false, onlyFavorites: false, sort: "default" };
  var lastList = null;

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      options.onlyAvailable = saved.onlyAvailable === true;
      options.onlyFavorites = saved.onlyFavorites === true;
      options.sort = saved.sort === "recent" ? "recent" : "default";
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch (error) { /* egal */ }
  }

  function time(part) {
    var t = Date.parse(part.last_seen_at || part.created_at || "");
    return isFinite(t) ? t : 0;
  }

  /* Größe aus dem Namen lesen: "Brick 1 x 4" -> [1, 4, 0] */
  function sizeKey(name) {

    var m = /(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i.exec(String(name || ""));

    if (!m) return null;

    var a = Number(m[1]), b = Number(m[2]), c = m[3] ? Number(m[3]) : 0;

    return [Math.min(a, b), Math.max(a, b), c];
  }

  /* Standard: nach Größe (1x1, 1x2, 1x3 ... 2x2, 2x3 ...) statt
     nach Meldedatum. Teile ohne Größe kommen danach, nach Name. */
  function compareBySize(x, y) {

    var kx = sizeKey(x.name), ky = sizeKey(y.name);

    if (kx && !ky) return -1;
    if (!kx && ky) return 1;

    if (kx && ky) {
      for (var i = 0; i < 3; i++) {
        if (kx[i] !== ky[i]) return kx[i] - ky[i];
      }
    }

    var nx = String(x.name || ""), ny = String(y.name || "");

    if (nx.length !== ny.length) return nx.length - ny.length;

    if (nx !== ny) return nx < ny ? -1 : 1;

    var px = String(x.part_number || ""), py = String(y.part_number || "");

    if (px !== py) return px < py ? -1 : 1;

    return Number(x.color_id || 0) - Number(y.color_id || 0);
  }

  function apply(list) {

    if (!Array.isArray(list)) return list;

    var result = list;

    if (options.onlyAvailable) {
      result = result.filter(function (part) {
        return part.is_available !== false;
      });
    }

    /* Suchergebnisse behalten die Reihenfolge der Suche (Wichtigkeit);
       nur die ganze Liste wird nach Größe sortiert. */
    if (options.onlyFavorites && typeof isFavorite === "function") {
      result = result.filter(function (part) {
        return isFavorite(part.part_number);
      });
    }

    if (options.sort !== "recent" && typeof parts !== "undefined" && list === parts) {
      result = result.slice().sort(compareBySize);
    }

    if (options.sort === "recent") {
      /* Array.sort ist stabil: gleiche Zeiten behalten ihre Reihenfolge */
      result = result.slice().sort(function (a, b) {
        return time(b) - time(a);
      });
    }

    return result;
  }

  /* Offene Kategorien/Teile merken, damit sie nach einer Aktion
     (z.B. "Gerade gesehen") offen bleiben */
  var pendingOpenState = null;

  function captureOpenState() {
    return {
      cats: Array.prototype.map.call(
        document.querySelectorAll(".category-folder.open"),
        function (el) { return el.dataset.categoryId; }
      ),
      nums: Array.prototype.map.call(
        document.querySelectorAll(".part-number-folder.open"),
        function (el) { return el.dataset.partNumber; }
      )
    };
  }

  function restoreOpenState(state) {
    if (!state) return;
    document.querySelectorAll(".category-folder").forEach(function (el) {
      if (state.cats.indexOf(el.dataset.categoryId) !== -1) {
        el.classList.add("open");
      }
    });
    document.querySelectorAll(".part-number-folder").forEach(function (el) {
      if (state.nums.indexOf(el.dataset.partNumber) !== -1) {
        el.classList.add("open");
      }
    });
  }

  var originalDisplayParts = window.displayParts;

  if (typeof originalDisplayParts === "function") {

    window.displayParts = function (list) {

      lastList = list;

      var shown = apply(list);

      originalDisplayParts(shown);

      if (pendingOpenState) {
        restoreOpenState(pendingOpenState);
        pendingOpenState = null;
      }

      /* Hinweis, falls ein Filter alles ausblendet */
      if (
        (options.onlyAvailable || options.onlyFavorites) &&
        Array.isArray(list) && list.length &&
        Array.isArray(shown) && !shown.length
      ) {
        var results = document.getElementById("results");
        if (results) {
          results.innerHTML =
            '<div class="card"><div class="empty">' +
            (options.onlyFavorites
              ? "Keine Favoriten in dieser Ansicht. Tippe bei einem Teil auf den Stern ☆, um es zu merken, oder schalte „Nur Favoriten“ aus."
              : "Keine verfügbaren Teile gefunden. Schalte „Nur verfügbare“ aus, um alle zu sehen.") +
            "</div></div>";
        }
      }
    };

    /* displayParts() wird anderswo direkt aufgerufen (globale Funktion) */
    try { displayParts = window.displayParts; } catch (error) { /* egal */ }
  }

  /* Liste neu zeichnen, aktive Suche und offene Ordner beibehalten */
  window.refreshPartList = function () {

    pendingOpenState = captureOpenState();

    var input = document.getElementById("searchInput");

    if (
      input && input.value.trim() &&
      typeof window.searchParts === "function"
    ) {
      window.searchParts();
    } else {
      window.displayParts(parts);
    }
  };

  function refresh() {
    if (typeof window.displayParts === "function" && lastList) {
      window.displayParts(lastList);
    }
  }

  /* Stern angetippt: bei aktivem Favoriten-Filter Liste aktualisieren */
  window.onFavoritesChanged = function () {
    if (options.onlyFavorites && typeof window.refreshPartList === "function") {
      window.refreshPartList();
    }
  };

  function init() {

    var onlyBox = document.getElementById("optOnlyAvailable");
    var sortSelect = document.getElementById("optSort");
    var favBox = document.getElementById("optOnlyFavorites");

    if (favBox) {
      favBox.checked = options.onlyFavorites;
      favBox.addEventListener("change", function () {
        options.onlyFavorites = favBox.checked;
        save();
        refresh();
      });
    }

    if (onlyBox) {
      onlyBox.checked = options.onlyAvailable;
      onlyBox.addEventListener("change", function () {
        options.onlyAvailable = onlyBox.checked;
        save();
        refresh();
      });
    }

    if (sortSelect) {
      sortSelect.value = options.sort;
      sortSelect.addEventListener("change", function () {
        options.sort = sortSelect.value === "recent" ? "recent" : "default";
        save();
        refresh();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
